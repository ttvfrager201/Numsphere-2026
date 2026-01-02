import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const recordingSid = params.id;
  if (!recordingSid) {
    return new Response("Missing recording SID", { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
  const authToken = process.env.TWILIO_AUTH_TOKEN as string;

  if (!accountSid || !authToken) {
    return new Response("Twilio credentials not configured", { status: 500 });
  }

  const fmt = (new URL(req.url).searchParams.get("fmt") || "mp3").toLowerCase();
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${encodeURIComponent(recordingSid)}.${fmt}`;

  const basic = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const twilioRes = await fetch(twilioUrl, {
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  if (!twilioRes.ok) {
    const text = await twilioRes.text().catch(() => "");
    return new Response(text || "Failed to fetch recording", { status: twilioRes.status });
  }

    const contentType = twilioRes.headers.get("content-type") || (fmt === "mp3" ? "audio/mpeg" : "audio/wav");
    const contentLength = twilioRes.headers.get("content-length") || undefined;

    return new Response(twilioRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    console.error("Error fetching recording:", err);
    return new Response("Failed to fetch recording", { status: 500 });
  }
}
