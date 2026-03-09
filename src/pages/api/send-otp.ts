import type { APIRoute } from 'astro';
import { sendEmail } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { email } = await request.json();

        if (!email) {
            return new Response(JSON.stringify({ error: "Email is required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID || "OPEN EVEN26-6e70e";

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/otps/${email}`;

        const storeResponse = await fetch(firestoreUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fields: {
                    otp: { stringValue: otp },
                    expiresAt: { integerValue: expiresAt.toString() }
                }
            })
        });

        if (!storeResponse.ok) {
            const errorData = await storeResponse.json();
            console.error("Firestore error:", errorData);
            throw new Error("Failed to store OTP");
        }

        const appUrl = import.meta.env.APP_URL || 'main.OPEN EVEN-45k.pages.dev';
        const logoPngUrl = `https://main.OPEN EVEN-45k.pages.dev/icons/OPEN_EVEN_LOGO.png`;

        // Split OTP into individual digits for styled boxes
        const otpDigits = otp.split('').map(d =>
            `<td style="padding:0 4px;">
                <div style="width:44px;height:56px;background:#0d2137;border:1.5px solid rgba(0,200,83,0.4);border-radius:10px;text-align:center;line-height:56px;font-size:28px;font-weight:800;color:#00c853;font-family:monospace;box-shadow:0 4px 16px rgba(0,200,83,0.15);">
                    ${d}
                </div>
            </td>`
        ).join('');

        await sendEmail({
            to: [{ email }],
            subject: "🔐 Your OPEN EVEN Verification Code",
            htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OPEN EVEN Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#050f1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050f1a;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;border-radius:20px;overflow:hidden;box-shadow:0 0 60px rgba(0,200,83,0.15);">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#00c853 0%,#00e676 40%,#1de9b6 100%);padding:36px 36px 28px;text-align:center;">
              <img src="${logoPngUrl}"
                   alt="OPEN EVEN"
                   width="60" height="60"
                   style="display:block;margin:0 auto 16px;border-radius:12px;border:2px solid rgba(0,0,0,0.12);"
                   onerror="this.style.display='none'" />
              <div style="font-size:11px;font-weight:700;color:rgba(0,0,0,0.5);letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">OPEN EVEN</div>
              <div style="font-size:32px;font-weight:900;color:#050f1a;letter-spacing:-1px;line-height:1;">2026</div>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background-color:#0a1a2e;padding:36px;">

              <!-- Lock icon circle -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="width:64px;height:64px;background:linear-gradient(135deg,#0d2137,#071525);border:1.5px solid rgba(0,200,83,0.35);border-radius:50%;text-align:center;line-height:64px;font-size:28px;margin:0 auto;">
                      🔐
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;text-align:center;">
                Verify your email
              </p>
              <p style="margin:0 0 30px;font-size:14px;color:#8faac8;text-align:center;line-height:1.6;">
                Use the code below to complete your sign-in to OPEN EVEN. It expires in <strong style="color:#00c853;">5 minutes</strong>.
              </p>

              <!-- ── OTP BOX ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:linear-gradient(145deg,#0d2137,#071525);border:1px solid rgba(0,200,83,0.25);border-radius:16px;margin-bottom:28px;overflow:hidden;">

                <!-- Green top stripe -->
                <tr>
                  <td style="background:linear-gradient(90deg,#00c853,#1de9b6);height:3px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <tr>
                  <td style="padding:28px 24px;" align="center">
                    <div style="font-size:10px;font-weight:700;color:#4a7c9e;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">
                      Your Verification Code
                    </div>
                    <!-- OTP digit boxes -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        ${otpDigits}
                      </tr>
                    </table>
                    <div style="margin-top:18px;font-size:11px;color:#3a6a8a;letter-spacing:0.5px;">
                      Valid for 5 minutes from when this email was sent
                    </div>
                  </td>
                </tr>

                <!-- Green bottom stripe -->
                <tr>
                  <td style="background:linear-gradient(90deg,#1de9b6,#00c853);height:2px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Security notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#071525;border:1px solid rgba(255,180,0,0.15);border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:16px;padding-right:10px;vertical-align:top;">⚠️</td>
                        <td style="font-size:12px;color:#8faac8;line-height:1.5;">
                          <strong style="color:#e0eeff;">Never share this code.</strong>
                          OPEN EVEN team will never ask for your verification code. If you didn't request this, you can safely ignore this email.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;text-align:center;color:#4a7c9e;">
                Need help? Contact us at
                <a href="mailto:info@peakso.in" style="color:#00c853;text-decoration:none;font-weight:600;">info@peakso.in</a>
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:linear-gradient(90deg,#00c853,#1de9b6);padding:18px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:13px;font-weight:800;color:#050f1a;">OPEN EVEN</div>
                    <div style="font-size:11px;color:rgba(0,0,0,0.5);margin-top:2px;">OPEN EVEN — Ahmedabad, India</div>
                  </td>
                  <td align="right">
                    <div style="font-size:11px;color:rgba(0,0,0,0.5);">© 2026 OPEN EVEN Community</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`,
        });

        return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Error in send-otp:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to send OTP" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};