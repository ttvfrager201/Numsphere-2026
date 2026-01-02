import { NextResponse } from "next/server";
import twilio from "twilio";

interface ConfigureBody {
  phoneNumberSid: string;
  twimlAppSid?: string;
}

export async function POST(req: Request) {
  try {
    const { phoneNumberSid, twimlAppSid } = (await req.json()) as ConfigureBody;

    if (!phoneNumberSid) {
      return NextResponse.json(
        { error: "Missing phoneNumberSid" },
        { status: 400 },
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const envAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Twilio credentials are not configured in env" },
        { status: 500 },
      );
    }

    const appSidToUse = twimlAppSid || envAppSid;

    if (!appSidToUse) {
      return NextResponse.json(
        { error: "TwiML App SID not provided and not set in env" },
        { status: 400 },
      );
    }

    const client = twilio(accountSid, authToken);
    // Point Twilio to the Supabase Edge Function instead of Next.js route
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const voiceUrl = `${supabaseUrl}/functions/v1/voice-twiml`;

    // Update TwiML App
    await client.applications(appSidToUse).update({
      voiceUrl,
      voiceMethod: "POST",
    });

    // Update Incoming Phone Number
    const number = await client
      .incomingPhoneNumbers(phoneNumberSid)
      .update({ voiceUrl, voiceMethod: "POST" });

    return NextResponse.json(
      {
        voiceUrl,
        configured: true,
        applicationSid: appSidToUse,
        phoneNumberSid: number.sid,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to configure Twilio webhooks",
      },
      { status: 500 },
    );
  }
}
