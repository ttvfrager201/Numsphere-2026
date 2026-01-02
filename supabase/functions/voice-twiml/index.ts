import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// -------------------------------------------------------
// XML / TwiML Helpers
// -------------------------------------------------------
function buildTwiML(content: string) {
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

function escapeXml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Render Say with optional custom audio URL - ALWAYS prefer audio over text-to-speech
function renderSay(message: string, audioUrl?: string) {
  // If audio URL is provided, use it instead of text-to-speech
  if (audioUrl && audioUrl.trim() !== "") {
    return `<Play>${escapeXml(audioUrl)}</Play>`;
  }
  // Only use text-to-speech if no audio URL is provided AND message exists
  if (message && message.trim() !== "") {
    return `<Say voice="alice">${escapeXml(message)}</Say>`;
  }
  // If neither audio nor text, return empty (shouldn't happen, but handle gracefully)
  return "";
}

// FIXED — Parameters now in action URL, not as child elements
function renderMenu(
  prompt: string,
  actionUrl: string,
  nodeId: string,
  to: string,
  attempt: number,
  audioUrl?: string,
) {
  // Build action URL with all parameters
  const fullActionUrl = `${actionUrl}?node=${encodeURIComponent(nodeId)}&To=${encodeURIComponent(to)}&attempt=${attempt}`;

  // Use custom audio if provided, otherwise use text-to-speech
  const promptContent = audioUrl 
    ? `<Play>${escapeXml(audioUrl)}</Play>`
    : `<Say voice="alice">${escapeXml(prompt)}</Say>`;

  return `
    <Gather input="dtmf speech" numDigits="1" timeout="5" action="${escapeXml(fullActionUrl)}" method="POST">
      ${promptContent}
    </Gather>
  `;
}

// -------------------------------------------------------
// Supabase Setup
// -------------------------------------------------------
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") ?? Deno.env.get("SERVICE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

// -------------------------------------------------------
// Fetch Flow By Phone Number
// -------------------------------------------------------
async function getFlowByNumber(toNumber: string) {
  if (!toNumber) return null;

  // Normalize phone number - remove all non-digit characters except +
  const normalized = toNumber.trim().replace(/\s+/g, "");
  
  // Try multiple formats for matching
  const formats = [
    normalized, // Original format
    normalized.replace(/^\+/, ""), // Without +
    normalized.replace(/^\+1/, ""), // Without +1 (US)
    normalized.replace(/^\+1/, "1"), // With 1 but no +
  ];

  // Try exact match first
  for (const format of formats) {
    const { data, error } = await supabase
      .from("call_flows")
      .select("id, flow_json, phone_number")
      .eq("phone_number", format)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Error fetching flow:", error);
      continue;
    }

    if (data) {
      console.log(`Found flow for ${toNumber} (matched format: ${format})`);
      return data;
    }
  }

  // Try partial match as fallback
  const { data, error } = await supabase
    .from("call_flows")
    .select("id, flow_json, phone_number")
    .ilike("phone_number", `%${normalized.replace(/^\+/, "")}%`)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Error fetching flow:", error);
    return null;
  }

  if (data) {
    console.log(`Found flow for ${toNumber} (partial match)`);
    return data;
  }

  console.log(`No flow found for ${toNumber}`);
  return null;
}

// -------------------------------------------------------
// MAIN HANDLER
// -------------------------------------------------------
Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse Twilio body
    let formData: any;
    const contentType = req.headers.get("content-type") || "";

    if (
      req.method === "POST" &&
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const bodyText = await req.text();
      formData = new URLSearchParams(bodyText);
    } else if (
      req.method === "POST" &&
      contentType.includes("multipart/form-data")
    ) {
      formData = await req.formData();
    } else {
      formData = new URLSearchParams();
    }

    // Extract values from BOTH form data AND URL params
    const url = new URL(req.url);

    // Helper to get value from either formData or URL params
    const getParam = (key: string) => {
      const formValue = formData.get(key)?.toString();
      const urlValue = url.searchParams.get(key);
      return formValue || urlValue || null;
    };

    const to = getParam("To") || "";
    const digits = getParam("Digits");
    const speechResult = getParam("SpeechResult"); // For voice input
    const nodeId = getParam("node");
    const attempt = parseInt(getParam("attempt") || "0");

    console.log("Request params:", { to, digits, speechResult, nodeId, attempt });
    console.log("All form data keys:", Array.from(formData.keys()));
    console.log("All URL params:", Array.from(url.searchParams.keys()));

    // Fetch flow JSON
    const flowData = await getFlowByNumber(to);
    if (!flowData) {
      return buildTwiML(
        `${renderSay("This number is not configured.")}<Hangup/>`,
      );
    }

    const flowArray = flowData.flow_json;
    if (!Array.isArray(flowArray) || flowArray.length === 0) {
      return buildTwiML(`${renderSay("Call flow is empty.")}<Hangup/>`);
    }

    const nodes: any = Object.fromEntries(flowArray.map((n: any) => [n.id, n]));

    // Find the starting node if no nodeId is provided
    let currentNode;
    if (nodeId) {
      currentNode = nodes[nodeId];
    } else {
      // Find the entry point: a node that is not referenced in any other node's 'next' array or blockId
      const allReferencedNodeIds = new Set<string>();
      flowArray.forEach((node: any) => {
        // Check next array connections
        if (node.next && Array.isArray(node.next)) {
          node.next.forEach((nextId: string) => allReferencedNodeIds.add(nextId));
        }
        // Check gather/menu options for blockId references
        if ((node.type === "gather" || node.type === "menu") && node.config?.options) {
          node.config.options.forEach((opt: any) => {
            if (opt.blockId) {
              allReferencedNodeIds.add(opt.blockId);
            }
          });
        }
      });

      // Find nodes that are not referenced (potential entry points)
      const entryPoints = flowArray.filter((node: any) => !allReferencedNodeIds.has(node.id));
      
      // If we have multiple entry points, find the one that has outgoing connections
      // This ensures we start with Say → Menu order
      const entryWithOutgoing = entryPoints.find((node: any) => 
        (node.next && node.next.length > 0) && (node.type === "say" || node.type === "play")
      );
      
      if (entryWithOutgoing) {
        currentNode = entryWithOutgoing;
      } else {
        // Prefer say/play nodes as entry points (they usually come first), then gather/menu
        currentNode = entryPoints.find((node: any) => node.type === "say" || node.type === "play")
          || entryPoints.find((node: any) => node.type === "gather" || node.type === "menu")
          || entryPoints[0] 
          || flowArray[0];
      }
    }

    if (!currentNode) {
      return buildTwiML(`${renderSay("Node not found.")}<Hangup/>`);
    }

    let content = "";

    // Base URL (no query params!)
    const baseFunctionUrl = `${new URL(req.url).origin}/functions/v1/voice-twiml`;

    // -------------------------------------------------------
    // NODE TYPE HANDLING
    // -------------------------------------------------------
    switch (currentNode.type) {
      // ---------------- SAY ----------------
      case "say": {
        // Support custom audio URL - check multiple possible field names
        const audioUrl = currentNode.config?.audioUrl 
          || currentNode.config?.audio_url 
          || currentNode.config?.recordingUrl
          || currentNode.config?.recording_url;
        const text = currentNode.config?.text || "";
        const sayContent = renderSay(text, audioUrl);
        
        // Only add content if we have either audio or text
        if (sayContent) {
          content += sayContent;
        } else {
          // If no content, skip this node and go to next
          if (currentNode.next?.length > 0) {
            content += `
              <Redirect method="POST">
                ${escapeXml(
                  `${baseFunctionUrl}?node=${currentNode.next[0]}&To=${encodeURIComponent(to)}`,
                )}
              </Redirect>
            `;
            return buildTwiML(content);
          } else {
            content += "<Hangup/>";
            return buildTwiML(content);
          }
        }

        if (currentNode.next?.length > 0) {
          const nextNode = nodes[currentNode.next[0]];

          // If the next node is a gather node we've already visited, hang up instead
          if (nextNode?.type === "gather" && nodeId) {
            content += "<Hangup/>";
          } else {
            content += `
              <Redirect method="POST">
                ${escapeXml(
                  `${baseFunctionUrl}?node=${currentNode.next[0]}&To=${encodeURIComponent(to)}`,
                )}
              </Redirect>
            `;
          }
        } else {
          content += "<Hangup/>";
        }
        break;
      }

      // ---------------- PLAY (Custom Audio) ----------------
      case "play": {
        const audioUrl = currentNode.config?.audioUrl || currentNode.config?.url;
        if (audioUrl) {
          content += `<Play>${escapeXml(audioUrl)}</Play>`;
        }

        if (currentNode.next?.length > 0) {
          content += `
            <Redirect method="POST">
              ${escapeXml(
                `${baseFunctionUrl}?node=${currentNode.next[0]}&To=${encodeURIComponent(to)}`,
              )}
            </Redirect>
          `;
        } else {
          content += "<Hangup/>";
        }
        break;
      }

      // ---------------- GATHER (Menu with DTMF or Speech) ----------------
      case "gather":
      case "menu": {
        console.log("GATHER/MENU node - digits received:", digits);
        console.log("GATHER/MENU node - speech received:", speechResult);
        console.log("Available options:", currentNode.config?.options);

        // Try to match input - support both DTMF digits and speech
        const userInput = digits || speechResult;
        
        let selected = null;
        if (userInput) {
          // First try exact digit match
          selected = currentNode.config?.options?.find((o: any) => {
            const digitMatch = String(o.digit) === String(userInput);
            // Also try speech matching (e.g., "one" matches digit "1")
            const speechMatch = o.speechKeywords?.some((kw: string) => 
              userInput.toLowerCase().includes(kw.toLowerCase())
            );
            console.log(`Comparing option digit ${o.digit} with input ${userInput}: digit=${digitMatch}, speech=${speechMatch}`);
            return digitMatch || speechMatch;
          });

          // If no match found and we have speech, try fuzzy matching
          if (!selected && speechResult) {
            const speechLower = speechResult.toLowerCase();
            // Map common speech to digits
            const speechToDigit: Record<string, string> = {
              "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
              "six": "6", "seven": "7", "eight": "8", "nine": "9", "zero": "0",
              "1": "1", "2": "2", "3": "3", "4": "4", "5": "5",
              "6": "6", "7": "7", "8": "8", "9": "9", "0": "0",
            };
            
            for (const [word, digit] of Object.entries(speechToDigit)) {
              if (speechLower.includes(word)) {
                selected = currentNode.config?.options?.find((o: any) => 
                  String(o.digit) === digit
                );
                if (selected) break;
              }
            }
          }
        }

        console.log("Selected option:", selected);

        if (selected) {
          // Valid input -> redirect to that block or play response
          if (selected.blockId) {
            // Redirect to the block specified in blockId
            content += `
              <Redirect method="POST">
                ${escapeXml(
                  `${baseFunctionUrl}?node=${selected.blockId}&To=${encodeURIComponent(to)}`,
                )}
              </Redirect>
            `;
          } else if (selected.action === "say" && selected.text) {
            // If action is "say", play the text and then continue to next node if available
            const responseAudio = selected.audioUrl 
              || selected.audio_url
              || selected.recordingUrl
              || selected.recording_url;
            content += renderSay(selected.text, responseAudio);
            // Check if there's a next node to continue to
            if (currentNode.next?.length > 0) {
              content += `
                <Redirect method="POST">
                  ${escapeXml(
                    `${baseFunctionUrl}?node=${currentNode.next[0]}&To=${encodeURIComponent(to)}`,
                  )}
                </Redirect>
              `;
            } else {
              content += "<Hangup/>";
            }
          } else {
            // Play custom audio or text response and hangup
            const responseAudio = selected.audioUrl 
              || selected.audio_url
              || selected.recordingUrl
              || selected.recording_url;
            content += renderSay(selected.text || "Thank you.", responseAudio) + "<Hangup/>";
          }
        } else {
          // INVALID or NO INPUT
          const maxRetries = currentNode.config?.maxRetries || 3;
          if (attempt >= maxRetries) {
            const goodbyeAudio = currentNode.config?.goodbyeAudioUrl
              || currentNode.config?.goodbye_audio_url
              || currentNode.config?.messageAudioUrl;
            content +=
              renderSay(
                currentNode.config?.goodbyeMessage ||
                  "Maximum attempts reached. Goodbye!",
                goodbyeAudio
              ) + "<Hangup/>";
          } else {
            const retryPrompt =
              attempt > 0
                ? `Invalid option. ${
                    currentNode.config?.retryMessage ||
                    currentNode.config?.prompt || "Please try again."
                  }`
                : currentNode.config?.prompt || "Please make a selection.";

            // Support custom audio for menu prompt - check multiple possible field names
            const promptAudio = currentNode.config?.promptAudioUrl
              || currentNode.config?.prompt_audio_url
              || currentNode.config?.audioUrl
              || currentNode.config?.audio_url;
            
            // Support custom audio for retry message
            const retryAudio = attempt > 0 
              ? (currentNode.config?.retryAudioUrl 
                || currentNode.config?.retry_audio_url
                || currentNode.config?.retryMessageAudioUrl)
              : null;
            
            // Use retry audio if available, otherwise use prompt audio
            const audioToUse = retryAudio || promptAudio;

            // FIXED: Parameters now in action URL
            content += renderMenu(
              retryPrompt,
              baseFunctionUrl,
              currentNode.id,
              to,
              attempt + 1,
              audioToUse,
            );
          }
        }
        break;
      }

      // ---------------- FORWARD ----------------
      case "forward": {
        const forwardNumber = currentNode.config?.number;
        if (forwardNumber) {
          content += `<Dial>${escapeXml(forwardNumber)}</Dial>`;
        }
        content += "<Hangup/>";
        break;
      }

      // ---------------- HANGUP ----------------
      case "hangup": {
        const goodbyeAudio = currentNode.config?.audioUrl
          || currentNode.config?.audio_url
          || currentNode.config?.recordingUrl
          || currentNode.config?.recording_url
          || currentNode.config?.messageAudioUrl;
        const message = currentNode.config?.message || "";
        if (message || goodbyeAudio) {
          content += renderSay(message, goodbyeAudio);
        }
        content += "<Hangup/>";
        break;
      }

      // ---------------- PAUSE ----------------
      case "pause": {
        const duration = currentNode.config?.duration || 1;
        content += `<Pause length="${duration}"/>`;
        
        if (currentNode.next?.length > 0) {
          content += `
            <Redirect method="POST">
              ${escapeXml(
                `${baseFunctionUrl}?node=${currentNode.next[0]}&To=${encodeURIComponent(to)}`,
              )}
            </Redirect>
          `;
        } else {
          content += "<Hangup/>";
        }
        break;
      }

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
