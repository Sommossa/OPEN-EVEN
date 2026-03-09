import jsPDF from "jspdf";
import QRCode from "qrcode";

/** Convert an SVG URL to a PNG data-URL via an offscreen Canvas */
const svgUrlToPngDataUrl = async (
    svgUrl: string,
    targetW: number,
    targetH: number
): Promise<string | null> => {
    try {
        const res = await fetch(svgUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        return await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0, targetW, targetH);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    } catch {
        return null;
    }
};

export const generateTicketPDF = async (
    ticket: any,
    userDisplayName: string
) => {
    try {
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
        const pdfHeight = pdf.internal.pageSize.getHeight();  // 297mm

        // ─── Layout ───────────────────────────────────────────────────────────────
        const marginX = 20;
        const ticketW = pdfWidth - marginX * 2;  // 170mm
        const ticketH = 230;
        const ticketX = marginX;
        const ticketY = (pdfHeight - ticketH) / 2;

        const headerH = 62;   // green hero zone
        const stubH = 118;  // white stub
        const stubY = ticketY + ticketH - stubH;
        const bodyY = ticketY + headerH;
        const bodyH = ticketH - headerH - stubH; // ~50mm dark body band
        const cx = pdfWidth / 2;

        // ─── 1. Drop-shadow ───────────────────────────────────────────────────────
        pdf.setFillColor(0, 0, 0);
        pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
        pdf.roundedRect(ticketX + 2.5, ticketY + 3.5, ticketW, ticketH, 12, 12, "F");
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

        // ─── 2. Navy card ─────────────────────────────────────────────────────────
        pdf.setFillColor(5, 18, 45);
        pdf.roundedRect(ticketX, ticketY, ticketW, ticketH, 12, 12, "F");

        // ─── 3. Green header band ─────────────────────────────────────────────────
        pdf.setFillColor(0, 214, 89);
        pdf.roundedRect(ticketX, ticketY, ticketW, headerH, 12, 12, "F");
        pdf.rect(ticketX, ticketY + headerH - 12, ticketW, 12, "F"); // square off bottom

        // Diagonal stripe texture
        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(0.2);
        for (let i = -headerH; i < ticketW + headerH; i += 9) {
            const x1 = ticketX + i;
            const x2 = ticketX + i + headerH;
            const y2 = ticketY + headerH;
            pdf.line(
                Math.max(x1, ticketX), ticketY,
                Math.min(x2, ticketX + ticketW), Math.min(y2, ticketY + headerH)
            );
        }
        pdf.setLineWidth(1);

        // ─── 4. Logo (top-left corner of header) ──────────────────────────────────
        const logoPng = await svgUrlToPngDataUrl("/icons/OPEN_EVEN_LOGO.png", 300, 300);
        const logoSize = 18;
        const logoX = ticketX + 8;
        const logoY = ticketY + 6;
        if (logoPng) {
            // Dark circle backdrop so logo is readable on green
            pdf.setFillColor(5, 18, 45);
            pdf.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1.5, "F");
            pdf.addImage(logoPng, "PNG", logoX, logoY, logoSize, logoSize);
        }

        // ─── 5. Header title (centred) ────────────────────────────────────────────
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(5, 18, 45);
        pdf.setFontSize(34);
        pdf.text("OPEN EVEN", cx, ticketY + 26, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(5, 18, 45);
        pdf.text("OPEN EVEN", cx, ticketY + 34, { align: "center" });

        // ─── 6. Pass-type pill (straddles header / body boundary) ─────────────────
        const passType = (ticket.passType || ticket.categoryName || "General").toUpperCase();
        const pillW = 76;
        const pillH = 13;
        const pillX = cx - pillW / 2;
        const pillY = ticketY + headerH - pillH / 2;

        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, "F");
        pdf.setFillColor(0, 214, 89);
        pdf.roundedRect(pillX + 2, pillY + 2, pillW - 4, pillH - 4, (pillH - 4) / 2, (pillH - 4) / 2, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(5, 18, 45);
        pdf.text(`✦  ${passType} PASS  ✦`, cx, pillY + pillH / 2 + 3, { align: "center" });

        // ─── 7. Event-info grid — vertically centred in the dark body band ─────────
        // Dark band runs from bodyY → stubY
        const bandMidY = bodyY + bodyH / 2;

        const col1X = ticketX + ticketW * 0.18;
        const col2X = cx;
        const col3X = ticketX + ticketW * 0.82;

        const eventDate = ticket.eventDate || "April 4, 2026";
        const eventVenue = ticket.eventVenue || "Ahmedabad, India";
        const eventTime = ticket.eventTime || "09:00 AM";

        const drawInfoCol = (label: string, value: string, x: number) => {
            // label sits 5mm above centre, value 5mm below
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.setTextColor(100, 145, 210);
            pdf.text(label, x, bandMidY - 4, { align: "center" });

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(255, 255, 255);
            pdf.text(value, x, bandMidY + 5, { align: "center" });
        };

        drawInfoCol("DATE", eventDate, col1X);
        drawInfoCol("VENUE", eventVenue, col2X);
        drawInfoCol("TIME", eventTime, col3X);

        // Vertical dividers
        pdf.setDrawColor(60, 85, 130);
        pdf.setLineWidth(0.3);
        const divTop = bandMidY - 9;
        const divBot = bandMidY + 8;
        pdf.line(col1X + (col2X - col1X) / 2, divTop, col1X + (col2X - col1X) / 2, divBot);
        pdf.line(col2X + (col3X - col2X) / 2, divTop, col2X + (col3X - col2X) / 2, divBot);

        // ─── 8. Dashed tear-line ──────────────────────────────────────────────────
        pdf.setLineDashPattern([2, 2], 0);
        pdf.setDrawColor(70, 95, 150);
        pdf.setLineWidth(0.4);
        pdf.line(ticketX + 8, stubY, ticketX + ticketW - 8, stubY);
        pdf.setLineDashPattern([], 0);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(70, 95, 150);
        pdf.text("✂", ticketX + 3.5, stubY + 1.5);

        // ─── 9. White stub ────────────────────────────────────────────────────────
        pdf.setFillColor(248, 250, 255);
        pdf.roundedRect(ticketX, stubY, ticketW, stubH, 12, 12, "F");
        pdf.rect(ticketX, stubY, ticketW, 12, "F"); // square off top corners

        // ─── 10. QR code ──────────────────────────────────────────────────────────
        const qrDataUrl = await QRCode.toDataURL(
            ticket.ticketId || "OPEN EVEN2026",
            { width: 400, margin: 1, color: { dark: "#05122D", light: "#ffffff" } }
        );

        const qrSize = 56;
        const qrX = cx - qrSize / 2;
        const qrY = stubY + 12;

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 214, 89);
        pdf.setLineWidth(1.2);
        pdf.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 4, 4, "FD");
        pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.setTextColor(160, 170, 190);
        pdf.text("SCAN TO VERIFY", cx, qrY + qrSize + 7, { align: "center" });

        // ─── 11. Attendee name + email ────────────────────────────────────────────
        const nameToPrint = ticket.userName || userDisplayName || "Attendee";
        const nameY = qrY + qrSize + 16;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(5, 18, 45);
        pdf.text(nameToPrint, cx, nameY, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(110, 120, 145);
        pdf.text((ticket.userEmail || "").toUpperCase(), cx, nameY + 7, { align: "center" });

        // ─── 12. Pass ID + Pass Type badge row ────────────────────────────────────
        const detailsY = nameY + 18;
        const badgeW = ticketW - 20;
        const badgeH = 18;
        const badgeX = ticketX + 10;
        const badgeY = detailsY - 4;

        pdf.setFillColor(230, 240, 255);
        pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 5, 5, "F");

        // Left: PASS ID
        const passId =
            ticket.ticketId?.split("-")[1] ||
            ticket.id?.substring(0, 8).toUpperCase() ||
            "N/A";

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(100, 140, 200);
        pdf.text("PASS ID", badgeX + 14, detailsY + 1);
        pdf.setFontSize(11);
        pdf.setTextColor(5, 18, 45);
        pdf.text(`#${passId}`, badgeX + 14, detailsY + 8);

        // Centre divider
        pdf.setDrawColor(180, 200, 230);
        pdf.setLineWidth(0.4);
        pdf.line(cx, detailsY - 2, cx, detailsY + 10);

        // Right: PASS TYPE
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(100, 140, 200);
        pdf.text("PASS TYPE", cx + 10, detailsY + 1);
        pdf.setFontSize(11);
        pdf.setTextColor(5, 18, 45);
        pdf.text(passType, cx + 10, detailsY + 8);

        // ─── 13. Save ─────────────────────────────────────────────────────────────
        pdf.save(`OPEN_EVEN_Pass_${ticket.ticketId || ticket.id}.pdf`);
    } catch (error) {
        console.error("Error generating ticket PDF:", error);
        throw error;
    }
};