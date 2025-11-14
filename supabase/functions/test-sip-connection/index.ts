import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 1: Verify the phone number exists in Twilio
    const phoneNumberSid = phoneNumber.replace("+", "").replace(/\D/g, "");
    const verifyUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`;

    const verifyResp = await fetch(verifyUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
    });

    if (!verifyResp.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "verify",
          error: "Failed to verify phone number with Twilio",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const verifyData = await verifyResp.json();
    if (!verifyData.incoming_phone_numbers || verifyData.incoming_phone_numbers.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "verify",
          error: "Phone number not found in your Twilio account",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 2: Check SIP domain configuration
    const sipDomain = "numsphere.pstn.twilio.com";
    const sipUsername = phoneNumber.replace("+", "");

    // Step 3: Verify SIP domain exists
    const domainUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/Domains.json`;
    const domainResp = await fetch(domainUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
    });

    if (!domainResp.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "domain",
          error: "Failed to verify SIP domain",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 4: Test voice capabilities
    const capabilitiesUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${verifyData.incoming_phone_numbers[0].sid}.json`;
    const capResp = await fetch(capabilitiesUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
    });

    if (!capResp.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "capabilities",
          error: "Failed to verify voice capabilities",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const capData = await capResp.json();
    const hasVoice = capData.capabilities?.voice === true;

    if (!hasVoice) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "capabilities",
          error: "Phone number does not have voice capabilities enabled",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // All checks passed
    return new Response(
      JSON.stringify({
        success: true,
        message: "SIP connection verified successfully",
        config: {
          domain: sipDomain,
          username: sipUsername,
          phoneNumber: phoneNumber,
          voiceEnabled: true,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("SIP test error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
