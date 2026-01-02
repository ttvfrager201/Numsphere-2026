// app/api/recording/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

export async function GET(req: NextRequest) {
  try {
    // Get all recordings
    const recordings = await client.recordings.list({ limit: 50 });

    return NextResponse.json({ recordings });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 },
    );
  }
}
