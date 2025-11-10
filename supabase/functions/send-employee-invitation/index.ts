import { corsHeaders } from "@shared/cors.ts";
import { Resend } from "npm:resend";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }
  try {
    const { email, businessName, invitationToken, businessId } =
      await req.json();
    if (!email || !businessName || !invitationToken) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }
    const siteUrl =
      Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
      "https://a3e7eede-1fb4-49e2-a6c1-0471dd7dfb92.canvases.tempo.build";
    const invitationLink = `${siteUrl}/business-signup?token=${invitationToken}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .content { 
              padding: 40px 30px;
              background: white;
            }
            .content p {
              margin: 0 0 16px 0;
              font-size: 16px;
              color: #4a5568;
            }
            .button-container {
              text-align: center;
              margin: 32px 0;
            }
            .button { 
              display: inline-block; 
              padding: 16px 32px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
            }
            .link-box {
              background: #f7fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin: 24px 0;
            }
            .link-box p {
              margin: 0 0 8px 0;
              font-size: 14px;
              color: #718096;
            }
            .link-box code {
              display: block;
              word-break: break-all; 
              color: #667eea;
              font-size: 13px;
              font-family: 'Courier New', monospace;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              background: #f7fafc;
              color: #718096; 
              font-size: 13px;
              border-top: 1px solid #e2e8f0;
            }
            .business-name {
              color: #667eea;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>You've been invited to join <span class="business-name">${businessName}</span> as an employee on the Numsphere VoIP platform.</p>
              <p>As a team member, you'll have access to:</p>
              <ul style="color: #4a5568; margin: 16px 0; padding-left: 24px;">
                <li>Make and receive calls using business phone numbers</li>
                <li>Access call flows and automation tools</li>
                <li>View call logs and analytics</li>
                <li>Collaborate with your team</li>
              </ul>
              <div class="button-container">
                <a href="${invitationLink}" class="button">Accept Invitation</a>
              </div>
              <div class="link-box">
                <p>Or copy and paste this link into your browser:</p>
                <code>${invitationLink}</code>
              </div>
              <p style="font-size: 14px; color: #718096; margin-top: 24px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Numsphere VoIP Platform. All rights reserved.</p>
              <p style="margin-top: 8px;">Powered by Tempo</p>
            </div>
          </div>
        </body>
      </html>
    `;
    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: "Numsphere <no-reply@numsphere.online>",
      to: email,
      subject: `You're invited to join ${businessName} on Numsphere`,
      html: emailHtml,
    });
    if (error) throw error;
    console.log(`📧 Invitation email sent to ${email}`);
    console.log(`🔗 Invitation link: ${invitationLink}`);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
        email,
        invitationLink,
        resendId: data?.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error sending invitation:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});
