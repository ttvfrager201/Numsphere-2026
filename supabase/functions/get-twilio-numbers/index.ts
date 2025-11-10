// supabase/functions/list-owned-numbers/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }
  try {
    // Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") ?? "",
          },
        },
      },
    );
    // Authenticate user
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
    // Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) {
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
    // Get owned numbers from DB
    const { data: ownedNumbers } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("user_id", user.id);
    // Fetch Twilio incoming phone numbers
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=50`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
      },
    );
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(
        JSON.stringify({
          error: "Twilio API failed",
          details: text,
        }),
        {
          status: resp.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    const data = await resp.json();
    // Format Twilio numbers and mark owned
    const formattedNumbers = (data.incoming_phone_numbers || []).map((n) => ({
      sid: n.sid,
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name,
      capabilities: n.capabilities,
      status: n.status,
      dateCreated: n.date_created,
      origin: "twilio",
      owned: ownedNumbers?.some((owned) => owned.twilio_sid === n.sid) || false,
    }));
    // Return response
    return new Response(
      JSON.stringify({
        numbers: formattedNumbers,
        ownedCount: ownedNumbers?.length || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
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
