import type { APIRoute } from 'astro';
import { sendEmail } from '@/lib/brevo';
import { jsPDF } from 'jspdf';
import * as ics from 'ics';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { tickets } = await request.json();

    if (!tickets || !Array.isArray(tickets)) {
      return new Response(JSON.stringify({ error: "Invalid tickets data" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const appUrl = import.meta.env.APP_URL || 'open-even.pages.dev';

    // ⚠️ SVG Note: Many email clients (Gmail, Outlook) block SVGs.
    // Using the PNG fallback for email. Use SVG only in PDF via fetch+base64 if needed.
    const logoPngUrl = `https://${appUrl}/icons/OPEN_EVEN_LOGO.png`;
    const logoSvgUrl = `https://${appUrl}/icons/OPEN_EVEN_LOGO.png`;

    // 1. Generate ICS content (static for all tickets)
    const event: ics.EventAttributes = {
      start: [2026, 4, 4, 9, 0],
      duration: { hours: 8 },
      title: 'OPEN EVEN - OPEN EVEN',
      description: 'The premier open source community event.',
      location: 'Ahmedabad, India',
      url: `https://${appUrl}`,
      categories: ['Technology', 'Open Source'],
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'OPEN EVEN Community', email: 'info@peakso.in' },
    };

    const { value: icsValue } = ics.createEvent(event);
    const icsBase64 = Buffer.from(icsValue || '').toString('base64');

    // Process each ticket and send email
    const results = await Promise.all(tickets.map(async (ticket) => {
      try {
        // ─── PDF GENERATION ────────────────────────────────────────
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a6'   // 105 × 148 mm
        });

        const W = 105;
        const H = 148;

        // ── Background: dark base
        doc.setFillColor(8, 20, 40); // Deep navy
        doc.rect(0, 0, W, H, 'F');

        // ── Green gradient header band (simulated with layered rects)
        // jsPDF doesn't support true gradients, so we layer alpha strips
        const headerH = 38;
        const greenStops = [
          [0, 200, 83],
          [0, 180, 75],
          [0, 160, 65],
          [0, 140, 55],
          [0, 120, 45],
          [0, 100, 35],
          [0, 80, 25],
          [8, 60, 20],
        ];
        greenStops.forEach(([r, g, b], i) => {
          doc.setFillColor(r, g, b);
          doc.rect(0, (i / greenStops.length) * headerH, W, headerH / greenStops.length + 0.5, 'F');
        });

        // ── Decorative circle accent (top-right)
        doc.setFillColor(0, 230, 95, 0.15);
        doc.circle(W - 5, 5, 22, 'F');
        doc.setFillColor(0, 200, 83, 0.08);
        doc.circle(W - 5, 5, 32, 'F');

        // ── Logo placeholder text (SVG can't be embedded directly without fetch)
        // If you fetch+base64 the SVG as PNG server-side, swap this block:
        doc.setTextColor(8, 20, 40);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('OPEN EVEN', 10, 16);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('OPEN SOURCE DAY', 10, 22);

        doc.setTextColor(8, 20, 40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('2026', W - 12, 16, { align: 'right' });

        // ── Green separator line
        doc.setDrawColor(0, 200, 83);
        doc.setLineWidth(0.4);
        doc.line(0, headerH, W, headerH);

        // ── Ticket badge pill
        doc.setFillColor(0, 200, 83);
        doc.roundedRect(8, headerH + 6, W - 16, 10, 3, 3, 'F');
        doc.setTextColor(8, 20, 40);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('✦  ADMISSION TICKET  ✦', W / 2, headerH + 12.5, { align: 'center' });

        // ── Attendee info section
        const infoY = headerH + 24;
        const labelColor: [number, number, number] = [0, 200, 83];
        const valueColor: [number, number, number] = [230, 240, 255];

        const fields = [
          { label: 'ATTENDEE', value: ticket.userName },
          { label: 'PASS TYPE', value: ticket.categoryName },
          { label: 'TICKET ID', value: ticket.ticketId },
          { label: 'DATE', value: 'April 4, 2026' },
          { label: 'VENUE', value: 'Ahmedabad, India' },
        ];

        fields.forEach(({ label, value }, i) => {
          const y = infoY + i * 13;
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...labelColor);
          doc.text(label, 10, y);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...valueColor);
          doc.text(value, 10, y + 5.5);

          // subtle divider
          if (i < fields.length - 1) {
            doc.setDrawColor(30, 60, 100);
            doc.setLineWidth(0.2);
            doc.line(10, y + 9, W - 10, y + 9);
          }
        });

        // ── Dashed perforation line
        const perfY = infoY + fields.length * 13 + 4;
        doc.setDrawColor(0, 200, 83);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(8, perfY, W - 8, perfY);
        doc.setLineDashPattern([], 0);

        // ── QR Code
        const QRCode = await import('qrcode');
        const qrDataUrl = await QRCode.toDataURL(ticket.ticketId, {
          margin: 1,
          width: 160,
          color: {
            dark: '#082814',
            light: '#f0fff4'
          }
        });

        const qrY = perfY + 5;
        const qrSize = 38;
        const qrX = (W - qrSize) / 2;

        // QR glow box
        doc.setFillColor(0, 40, 20);
        doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 3, 3, 'F');
        doc.setDrawColor(0, 200, 83);
        doc.setLineWidth(0.5);
        doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 3, 3, 'S');

        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // Ticket ID below QR
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 200, 83);
        doc.text(ticket.ticketId, W / 2, qrY + qrSize + 6, { align: 'center' });

        // ── Footer strip
        doc.setFillColor(0, 200, 83);
        doc.rect(0, H - 10, W, 10, 'F');
        doc.setTextColor(8, 20, 40);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`${appUrl}  •  info@peakso.in`, W / 2, H - 4, { align: 'center' });

        const pdfBase64 = doc.output('datauristring').split(',')[1];

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(ticket.ticketId)}&color=00c853&bgcolor=0a1f0f&margin=1`;

        // ─── EMAIL TEMPLATE ────────────────────────────────────────
        // ⚠️ SVG WARNING: Gmail & Outlook block SVGs. Using PNG for logo.
        // If you only have SVG, either:
        //   a) Export a PNG copy → /icons/OPEN_EVEN_LOGO.png (recommended)
        //   b) Convert SVG to base64 PNG server-side and inline it

        await sendEmail({
          to: [{ email: ticket.userEmail, name: ticket.userName }],
          subject: `🎟️ OPEN EVEN Ticket Confirmed — ${ticket.ticketId}`,
          attachments: [
            { content: pdfBase64, name: `OPEN EVEN26_Ticket_${ticket.ticketId}.pdf` },
            { content: icsBase64, name: `OPEN EVEN2026_Event.ics` }
          ],
          htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OPEN EVEN Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#050f1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050f1a;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;border-radius:20px;overflow:hidden;box-shadow:0 0 60px rgba(0,200,83,0.15);">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#00c853 0%,#00e676 40%,#1de9b6 100%);padding:40px 36px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Logo: PNG for email compatibility. SVG blocked by most clients. -->
                    <img src="${logoPngUrl}"
                         alt="OPEN EVEN"
                         width="64" height="64"
                         style="display:block;border-radius:12px;margin-bottom:20px;border:2px solid rgba(0,0,0,0.15);"
                         onerror="this.style.display='none'" />
                    <div style="font-size:13px;font-weight:700;color:rgba(0,0,0,0.55);letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">OPEN EVEN</div>
                    <div style="font-size:40px;font-weight:900;color:#050f1a;line-height:1;letter-spacing:-1px;">2026</div>
                  </td>
                  <td align="right" valign="top">
                    <div style="background:rgba(0,0,0,0.15);border-radius:50px;padding:8px 16px;display:inline-block;">
                      <span style="color:#050f1a;font-size:12px;font-weight:700;letter-spacing:1px;">CONFIRMED ✓</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background-color:#0a1a2e;padding:36px;">

              <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#ffffff;">
                Hey ${ticket.userName} 👋
              </p>
              <p style="margin:0 0 30px 0;font-size:15px;color:#8faac8;line-height:1.6;">
                Your ticket is confirmed. You're officially part of <strong style="color:#00c853;">OPEN EVEN</strong> — India's premier open source celebration. See you in Ahmedabad!
              </p>

              <!-- ── TICKET CARD ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:linear-gradient(145deg,#0d2137,#071525);border:1px solid rgba(0,200,83,0.3);border-radius:16px;overflow:hidden;margin-bottom:28px;">

                <!-- Green top stripe -->
                <tr>
                  <td colspan="2" style="background:linear-gradient(90deg,#00c853,#1de9b6);height:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <tr>
                  <td style="padding:24px 24px 16px;">

                    <!-- Pass type -->
                    <div style="font-size:10px;font-weight:700;color:#00c853;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">PASS TYPE</div>
                    <div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:20px;">${ticket.categoryName}</div>

                    <!-- Two-col info grid -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding-bottom:16px;vertical-align:top;">
                          <div style="font-size:10px;font-weight:700;color:#4a7c9e;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Attendee</div>
                          <div style="font-size:14px;font-weight:600;color:#e0eeff;">${ticket.userName}</div>
                        </td>
                        <td width="50%" style="padding-bottom:16px;vertical-align:top;">
                          <div style="font-size:10px;font-weight:700;color:#4a7c9e;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Date</div>
                          <div style="font-size:14px;font-weight:600;color:#e0eeff;">04 April, 2026</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="vertical-align:top;">
                          <div style="font-size:10px;font-weight:700;color:#4a7c9e;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Ticket ID</div>
                          <div style="font-size:13px;font-weight:700;color:#00c853;font-family:monospace;">${ticket.ticketId}</div>
                        </td>
                        <td width="50%" style="vertical-align:top;">
                          <div style="font-size:10px;font-weight:700;color:#4a7c9e;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Venue</div>
                          <div style="font-size:14px;font-weight:600;color:#e0eeff;">Ahmedabad, India</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Dashed divider -->
                    <div style="border-top:1.5px dashed rgba(0,200,83,0.25);margin:20px 0;"></div>

                    <!-- QR Code -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;background:#071525;border:1.5px solid rgba(0,200,83,0.35);border-radius:14px;padding:14px;">
                            <img src="${qrCodeUrl}"
                                 alt="QR Code"
                                 width="140" height="140"
                                 style="display:block;border-radius:6px;" />
                          </div>
                          <p style="margin:10px 0 0;font-size:11px;color:#3a6a8a;letter-spacing:0.5px;">Scan at the registration desk</p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Green bottom stripe -->
                <tr>
                  <td colspan="2" style="background:linear-gradient(90deg,#1de9b6,#00c853);height:3px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- ── INFO PILLS ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td width="33%" style="padding:4px;">
                    <div style="background:#0d2137;border:1px solid rgba(0,200,83,0.2);border-radius:10px;padding:12px;text-align:center;">
                      <div style="font-size:18px;margin-bottom:4px;">📅</div>
                      <div style="font-size:10px;color:#4a7c9e;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Date</div>
                      <div style="font-size:12px;color:#e0eeff;font-weight:600;margin-top:2px;">April 4, 2026</div>
                    </div>
                  </td>
                  <td width="33%" style="padding:4px;">
                    <div style="background:#0d2137;border:1px solid rgba(0,200,83,0.2);border-radius:10px;padding:12px;text-align:center;">
                      <div style="font-size:18px;margin-bottom:4px;">⏰</div>
                      <div style="font-size:10px;color:#4a7c9e;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Time</div>
                      <div style="font-size:12px;color:#e0eeff;font-weight:600;margin-top:2px;">9:00 AM</div>
                    </div>
                  </td>
                  <td width="33%" style="padding:4px;">
                    <div style="background:#0d2137;border:1px solid rgba(0,200,83,0.2);border-radius:10px;padding:12px;text-align:center;">
                      <div style="font-size:18px;margin-bottom:4px;">📍</div>
                      <div style="font-size:10px;color:#4a7c9e;font-weight:700;letter-spacing:1px;text-transform:uppercase;">City</div>
                      <div style="font-size:12px;color:#e0eeff;font-weight:600;margin-top:2px;">Ahmedabad</div>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#8faac8;margin:0 0 28px;line-height:1.6;">
                Your <strong style="color:#ffffff;">PDF ticket</strong> and a <strong style="color:#ffffff;">calendar invite (.ics)</strong> are attached to this email. Keep them handy for the event day!
              </p>

              <!-- ── CTA BUTTON ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="https://${appUrl}/profile"
                       style="display:inline-block;background:linear-gradient(135deg,#00c853,#1de9b6);color:#050f1a;font-weight:800;font-size:15px;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(0,200,83,0.35);">
                      View My Digital Ticket →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;text-align:center;color:#4a7c9e;">
                Questions? Reach us at
                <a href="mailto:info@peakso.in" style="color:#00c853;text-decoration:none;font-weight:600;">info@peakso.in</a>
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:linear-gradient(90deg,#00c853,#1de9b6);padding:20px 36px;">
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

        return { ticketId: ticket.ticketId, success: true };
      } catch (err: any) {
        console.error(`Failed to send email for ticket ${ticket.ticketId}:`, err);
        return { ticketId: ticket.ticketId, success: false, error: err.message };
      }
    }));

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Error in send-ticket-email:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to process ticket emails" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};