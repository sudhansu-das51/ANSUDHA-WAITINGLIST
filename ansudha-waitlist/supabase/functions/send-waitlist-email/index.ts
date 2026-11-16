// @ts-nocheck
/* eslint-disable */
// ==============================================================================
// ANSUDHA — Heritage Waiting List
// Supabase Edge Function: Transactional Waitlist Emails & SMS (Resend, Fast2SMS, Twilio)
// ==============================================================================

// Declare Deno for editors running standard TypeScript without Deno extension
declare const Deno: any;

// CORS Headers for browser invocations
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationPayload {
  type: "registration_confirmation" | "website_launch" | "otp_verification";
  email?: string;
  fullName: string;
  countryCode?: string;
  phone?: string;
  otp?: string;
  channel?: "email" | "sms";
}

// Brand Colors
const BRAND_MAROON = "#5D1317";
const BRAND_GOLD = "#B66A0A";
const BRAND_COPPER = "#C68646";
const BRAND_CREAM = "#F5F2B3";

/**
 * Generate 4-Digit OTP Verification Email Template
 */
function getOtpTemplate(name: string, otp: string): { subject: string; html: string; text: string } {
  const subject = `${otp} is your ANSUDHA verification code`;
  
  const text = `ANSUDHA Verification Code: ${otp}

Dear ${name},

Your 4-digit verification code to join the ANSUDHA waiting list is:

${otp}

This code is valid for 10 minutes. Please enter this code on the website to confirm your spot.

Warm regards,
The ANSUDHA Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #230507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #FAF7DC; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #230507; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #380A0E; border: 1px solid rgba(198, 134, 70, 0.35); border-radius: 8px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);">
          
          <!-- Top Heritage Gold Accent Border -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #B66A0A, #F5F2B3, #C68646); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding: 36px 32px 20px 32px; border-bottom: 1px solid rgba(198, 134, 70, 0.2);">
              <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 26px; letter-spacing: 5px; color: ${BRAND_CREAM}; text-transform: uppercase; font-weight: 600;">
                ANSUDHA
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <p style="margin: 0 0 8px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${BRAND_GOLD}; font-weight: 600;">
                SECURITY VERIFICATION
              </p>
              
              <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: ${BRAND_CREAM}; line-height: 1.35;">
                Welcome, ${name}. Confirm Your Waiting List Spot.
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: rgba(250, 247, 220, 0.9);">
                Please use the following 4-digit code to verify your details and join the exclusive pre-launch waiting list:
              </p>

              <!-- OTP Code Display Box -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 24px auto; width: 100%; max-width: 280px;">
                <tr>
                  <td align="center" style="background: rgba(27, 4, 6, 0.75); border: 2px dashed ${BRAND_GOLD}; border-radius: 8px; padding: 18px 24px;">
                    <span style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: 700; letter-spacing: 12px; color: ${BRAND_CREAM}; display: inline-block;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; text-align: center; color: rgba(250, 247, 220, 0.7); line-height: 1.5;">
                This code is valid for <strong>10 minutes</strong>.<br>If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; background-color: #2A0609; border-top: 1px solid rgba(198, 134, 70, 0.2); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: rgba(250, 247, 220, 0.6); line-height: 1.6;">
                ANSUDHA<br>
                Celebrating Odisha's crafts & master artisans.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Dispatch SMS via Fast2SMS, 2Factor, or Twilio
 */
async function sendSmsNotification(phone: string, countryCode: string, otp: string) {
  const cleanPhone = (phone || "").replace(/[\s-]/g, "");
  const fullPhone = `${countryCode || "+91"}${cleanPhone}`;
  
  // 1. Fast2SMS (India Quick OTP Route - No DLT needed)
  const FAST2SMS_API_KEY = Deno.env.get("FAST2SMS_API_KEY");
  if (FAST2SMS_API_KEY) {
    try {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": FAST2SMS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: cleanPhone
        })
      });
      const data = await res.json();
      console.log("Fast2SMS OTP status:", data);
      return { success: true, provider: "fast2sms", data };
    } catch (e: any) {
      console.error("Fast2SMS dispatch error:", e);
    }
  }

  // 2. 2Factor.in (India Transactional SMS)
  const TWOFACTOR_API_KEY = Deno.env.get("TWOFACTOR_API_KEY");
  if (TWOFACTOR_API_KEY) {
    try {
      const res = await fetch(`https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/${cleanPhone}/${otp}/`);
      const data = await res.json();
      console.log("2Factor OTP status:", data);
      return { success: true, provider: "2factor", data };
    } catch (e: any) {
      console.error("2Factor dispatch error:", e);
    }
  }

  // 3. Twilio (Global SMS Gateway)
  const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER");
  if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${TWILIO_SID}:${TWILIO_AUTH}`),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          From: TWILIO_FROM,
          To: fullPhone,
          Body: `Your ANSUDHA verification code is: ${otp}. Valid for 10 minutes.`
        }).toString()
      });
      const data = await res.json();
      console.log("Twilio OTP status:", data);
      return { success: true, provider: "twilio", data };
    } catch (e: any) {
      console.error("Twilio dispatch error:", e);
    }
  }

  // Dev Mode fallback when no SMS key is configured yet
  console.log(`[ANSUDHA DEV] SMS OTP ${otp} logged for ${fullPhone}`);
  return { success: true, provider: "dev_log", note: "SMS provider key pending. Code logged." };
}

/**
 * Generate Registration Confirmation Email Template
 */
function getConfirmationTemplate(name: string): { subject: string; html: string; text: string } {
  const subject = "Welcome to ANSUDHA — You are on the Waiting List";
  
  const text = `ANSUDHA

Dear ${name},

Thank you for joining the ANSUDHA waiting list.

We are preparing a meaningful new chapter celebrating Odisha's rich heritage, timeless craftsmanship, and the revered hands behind every creation.

Something beautiful is on its way. We will send you an exclusive email the moment our website goes live so you can be among the very first to experience it.

Until then, follow our journey on Instagram: https://www.instagram.com/theansudha/

Warm regards,
The ANSUDHA Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #230507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #FAF7DC; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #230507; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #380A0E; border: 1px solid rgba(198, 134, 70, 0.35); border-radius: 8px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);">
          
          <!-- Top Heritage Gold Accent Border -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #B66A0A, #F5F2B3, #C68646); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding: 42px 32px 24px 32px; border-bottom: 1px solid rgba(198, 134, 70, 0.2);">
              <h1 style="margin: 0; font-family: 'Cinzel', Georgia, 'Times New Roman', serif; font-size: 28px; letter-spacing: 5px; color: ${BRAND_CREAM}; text-transform: uppercase; font-weight: 600;">
                ANSUDHA
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <p style="margin: 0 0 10px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${BRAND_GOLD}; font-weight: 600;">
                REGISTRATION CONFIRMED
              </p>
              
              <h2 style="margin: 0 0 20px 0; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: ${BRAND_CREAM}; line-height: 1.4;">
                You're on the list, ${name}.
              </h2>

              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.7; color: rgba(250, 247, 220, 0.9);">
                Thank you for being part of ANSUDHA. A new way to discover Odisha’s traditional crafts, explore their stories, and celebrate the master artisans behind them is taking shape.
              </p>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.7; color: rgba(250, 247, 220, 0.85);">
                We will notify you with exclusive early access the moment our doors open.
              </p>

              <!-- Highlight Callout Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(93, 19, 23, 0.6); border: 1px solid rgba(182, 106, 10, 0.35); border-radius: 6px; margin: 0 0 30px 0;">
                <tr>
                  <td style="padding: 18px 22px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: ${BRAND_CREAM}; font-weight: 600;">
                      ✨ Something Meaningful Is Coming
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: rgba(250, 247, 220, 0.75);">
                      Honouring the timeless craft traditions of Odisha.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: ${BRAND_GOLD};">
                    <a href="https://www.instagram.com/theansudha/" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; color: #230507; text-decoration: none; text-transform: uppercase; border-radius: 4px;">
                      Follow Our Journey on Instagram
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #2A0609; border-top: 1px solid rgba(198, 134, 70, 0.2); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: rgba(250, 247, 220, 0.6); line-height: 1.6;">
                ANSUDHA<br>
                Celebrating the crafts. Honouring the hands behind them.
              </p>
              <p style="margin: 14px 0 0 0; font-size: 11px; color: rgba(250, 247, 220, 0.4);">
                You received this email because you signed up for early access at ansudha.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Generate Website Launch Announcement Email Template
 */
function getLaunchTemplate(name: string): { subject: string; html: string; text: string } {
  const subject = "ANSUDHA Is Now Live — Explore Odisha's Living Heritage";
  
  const text = `ANSUDHA

Dear ${name},

The moment has arrived.

ANSUDHA is officially live. We invite you to step into our world of Odisha's timeless crafts, immerse yourself in the stories of our master artisans, and explore our inaugural collections.

Visit our official website now: https://ansudha.com

Warm regards,
The ANSUDHA Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #230507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #FAF7DC; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #230507; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #380A0E; border: 1px solid rgba(198, 134, 70, 0.35); border-radius: 8px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);">
          
          <!-- Top Accent Border -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #B66A0A, #F5F2B3, #C68646); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding: 42px 32px 24px 32px; border-bottom: 1px solid rgba(198, 134, 70, 0.2);">
              <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 5px; color: ${BRAND_CREAM}; text-transform: uppercase; font-weight: 600;">
                ANSUDHA
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <p style="margin: 0 0 10px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${BRAND_GOLD}; font-weight: 600;">
                OFFICIAL LAUNCH
              </p>
              
              <h2 style="margin: 0 0 20px 0; font-family: Georgia, serif; font-size: 24px; font-weight: normal; color: ${BRAND_CREAM}; line-height: 1.35;">
                Welcome to ANSUDHA, ${name}. Our Website Is Now Live.
              </h2>

              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.7; color: rgba(250, 247, 220, 0.9);">
                As a valued member of our pre-launch waiting list, you receive early access to explore Odisha’s living crafts, patronize artisan communities, and experience our inaugural works.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: ${BRAND_GOLD};">
                    <a href="https://ansudha.com" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 15px 34px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 2px; color: #230507; text-decoration: none; text-transform: uppercase; border-radius: 4px;">
                      Enter ANSUDHA
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #2A0609; border-top: 1px solid rgba(198, 134, 70, 0.2); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: rgba(250, 247, 220, 0.6); line-height: 1.6;">
                ANSUDHA<br>
                Celebrating the crafts. Honouring the hands behind them.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

Deno.serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "ANSUDHA <welcome@ansudha.com>";

    const payload: NotificationPayload = await req.json();
    const { type, email, fullName, countryCode, phone, otp, channel } = payload;

    if (!fullName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fullName." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // 1. OTP VERIFICATION DISPATCH (Email or SMS)
    // ==========================================
    if (type === "otp_verification") {
      if (!otp) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required otp code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if dispatching via SMS
      if (channel === "sms" || (phone && !email)) {
        const smsResult = await sendSmsNotification(phone!, countryCode || "+91", otp);
        return new Response(
          JSON.stringify({
            success: true,
            channel: "sms",
            provider: smsResult.provider,
            message: "OTP dispatched via SMS"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Otherwise dispatch via Email (Resend)
      if (!email || !email.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: "No email address provided for Email OTP." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not configured. Falling back to dev log.");
        return new Response(
          JSON.stringify({
            success: true,
            channel: "email",
            devMode: true,
            message: "Resend API key pending. OTP logged in dev mode."
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otpEmail = getOtpTemplate(fullName, otp);
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: otpEmail.subject,
          html: otpEmail.html,
          text: otpEmail.text,
        }),
      });

      const resendData = await resendResponse.json();
      if (!resendResponse.ok) {
        console.error("Resend API error:", resendData);
        return new Response(
          JSON.stringify({ success: false, error: resendData.message || "Failed to send OTP email." }),
          { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, channel: "email", messageId: resendData.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // 2. REGISTRATION CONFIRMATION OR LAUNCH
    // ==========================================
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured in Supabase environment secrets.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email provider configuration missing (RESEND_API_KEY).",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If subscriber registered with mobile number only, skip sending email gracefully
    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "No email address provided (subscriber registered via mobile). Email delivery skipped.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Select email template
    const template =
      type === "website_launch"
        ? getLaunchTemplate(fullName)
        : getConfirmationTemplate(fullName);

    // Call Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData.message || "Failed to send email." }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Edge function unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

