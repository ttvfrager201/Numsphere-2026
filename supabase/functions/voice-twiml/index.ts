import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// --------------------------
// Helper: TwiML Response
// --------------------------
function buildTwiML(content) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`,
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/xml",
        "Cache-Control": "no-store",
      },
    },
  );
}
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function renderSay(message) {
  return `<Say voice="alice">${escapeXml(message)}</Say>`;
}
function renderMenu(prompt, actionUrl) {
  return `
    <Gather input="dtmf" numDigits="1" action="${escapeXml(actionUrl)}" method="POST">
      <Say voice="alice">${escapeXml(prompt)}</Say>
    </Gather>
  `;
}
// --------------------------
// Supabase Setup
// --------------------------
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SERVICE_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);
// --------------------------
// Fetch flow by phone number
// --------------------------
async function getFlowByNumber(toNumber) {
  if (!toNumber) return null;
  const normalized = toNumber.trim().replace(/\s+/g, "");
  const { data, error } = await supabase
    .from("call_flows")
    .select("id, flow_json")
    .ilike("phone_number", `%${normalized}%`)
    .maybeSingle();
  if (error) {
    console.error("Error fetching flow:", error);
    return null;
  }
  return data;
}
// --------------------------
// Main Handler
// --------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    const formData = await req.formData();
    const to = formData.get("To")?.toString() || "";
    const digits = formData.get("Digits")?.toString() || null;
    const nodeId = formData.get("node")?.toString() || null;
    const attempt = parseInt(formData.get("attempt")?.toString() || "0");
    const flowData = await getFlowByNumber(to);
    if (!flowData) {
      return buildTwiML(
        `${renderSay("Thank you for calling. This number is not yet configured.")}<Hangup/>`,
      );
    }
    const flowArray = flowData.flow_json;
    if (!Array.isArray(flowArray) || flowArray.length === 0) {
      return buildTwiML(`${renderSay("Call flow is empty.")}<Hangup/>`);
    }
    // Index nodes
    const nodes = Object.fromEntries(flowArray.map((n) => [n.id, n]));
    let currentNode = nodeId ? nodes[nodeId] : flowArray[0];
    if (!currentNode) {
      return buildTwiML(`${renderSay("Node not found.")}<Hangup/>`);
    }
    let content = "";
    // ✅ MATCH WORKING LOG → return HTTP, not HTTPS
    const baseFunctionUrl = `${new URL(req.url).origin}/functions/v1/supabase-functions-voice-twiml`;
    switch (currentNode.type) {
      case "say":
        content += renderSay(currentNode.config?.text || "");
        if (currentNode.next?.length > 0) {
          const nextUrl = `${baseFunctionUrl}?node=${currentNode.next[0]}&To=${encodeURIComponent(to)}`;
          content += `<Redirect method="POST">${escapeXml(nextUrl)}</Redirect>`;
        } else {
          content += "<Hangup/>";
        }
        break;
      case "gather":
        const selected =
          digits &&
          currentNode.config?.options?.find((o) => o.digit === digits);
        if (selected) {
          if (selected.blockId) {
            const nextUrl = `${baseFunctionUrl}?node=${selected.blockId}&To=${encodeURIComponent(to)}`;
            content += `<Redirect method="POST">${escapeXml(nextUrl)}</Redirect>`;
          } else {
            content += renderSay(selected.text || "") + "<Hangup/>";
          }
        } else {
          if (attempt >= (currentNode.config?.maxRetries || 3)) {
            content +=
              renderSay(currentNode.config?.goodbyeMessage || "Goodbye!") +
              "<Hangup/>";
          } else {
            const retryUrl = `${baseFunctionUrl}?node=${currentNode.id}&To=${encodeURIComponent(to)}&attempt=${attempt + 1}`;
            content += renderMenu(
              currentNode.config?.prompt || "Please try again.",
              retryUrl,
            );
          }
        }
        break;
      default:
        content += renderSay("Invalid node type.") + "<Hangup/>";
    }
    return buildTwiML(content);
  } catch (err) {
    console.error("Fatal error:", err);
    return buildTwiML(
      renderSay("An internal error occurred. Please try again later."),
    );
  }
});
