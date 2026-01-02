import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true",
};
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_KEY") ?? Deno.env.get("SERVICE_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") ?? "",
          },
        },
      },
    );
    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          error: "Phone number is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!twilioAccountSid || !twilioAuthToken) {
      return new Response(
        JSON.stringify({
          error: "Twilio credentials not configured",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    // Get the webhook URL for TwiML - point to voice-twiml function for call flows
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/voice-twiml`;
    // Purchase the phone number from Twilio with webhook configuration
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        PhoneNumber: phoneNumber,
        FriendlyName: `Numsphere Number ${phoneNumber}`,
        VoiceUrl: webhookUrl,
        VoiceMethod: "POST",
        StatusCallback: webhookUrl,
        StatusCallbackMethod: "GET",
        VoiceFallbackUrl: webhookUrl,
        VoiceFallbackMethod: "POST",
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio API error:", errorText);
      let errorMessage = "Failed to purchase phone number";
      if (response.status === 400) {
        if (errorText.includes("not available")) {
          errorMessage = "This phone number is no longer available";
        } else if (errorText.includes("already owned")) {
          errorMessage = "This phone number is already owned";
        }
      }
      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: errorText,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    const purchasedNumber = await response.json();
    // Save the purchased number to our database
    const { data: savedNumber, error: dbError } = await supabase
      .from("phone_numbers")
      .insert({
        user_id: user.id,
        twilio_sid: purchasedNumber.sid,
        phone_number: purchasedNumber.phone_number,
        friendly_name: purchasedNumber.friendly_name,
        capabilities: purchasedNumber.capabilities,
        status: "active",
        country_code: purchasedNumber.phone_number.substring(0, 2),
        area_code: purchasedNumber.phone_number.substring(2, 5),
      })
      .select()
      .single();
    if (dbError) {
      console.error("Database error:", dbError);
      // Don't fail the request if DB save fails, but log it
    }
    return new Response(
      JSON.stringify({
        success: true,
        number: {
          sid: purchasedNumber.sid,
          phoneNumber: purchasedNumber.phone_number,
          friendlyName: purchasedNumber.friendly_name,
          capabilities: purchasedNumber.capabilities,
          status: "active",
          webhookUrl: webhookUrl,
        },
        message:
          "Phone number purchased successfully with TwiML webhook configured",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error purchasing phone number:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
