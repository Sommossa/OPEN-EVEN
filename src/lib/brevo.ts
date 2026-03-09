
const BREVO_API_KEY = import.meta.env.BREVO_API_KEY || (typeof process !== 'undefined' ? process.env.BREVO_API_KEY : undefined);
const API_URL = "https://api.brevo.com/v3";

export interface SendEmailParams {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
    sender?: { name: string; email: string };
    attachments?: { content: string; name: string }[];
}

export async function sendEmail({ to, subject, htmlContent, sender, attachments }: SendEmailParams) {
    if (!BREVO_API_KEY) {
        console.error("BREVO_API_KEY is not defined in environment variables.");
        throw new Error("Email configuration missing.");
    }

    const payload: any = {
        sender: sender || { name: "OPEN EVEN", email: "info@peakso.in" }, // Verified Brevo sender
        to,
        subject,
        htmlContent,
    };

    if (attachments && attachments.length > 0) {
        payload.attachment = attachments;
    }

    const response = await fetch(`${API_URL}/smtp/email`, {
        method: "POST",
        headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("Brevo API error details:", JSON.stringify(error, null, 2));
        throw new Error(error.message || error.code || "Failed to send email");
    }

    return await response.json();
}

/**
 * Creates an email campaign in Brevo.
 */
export async function createCampaign(params: {
    name: string;
    subject: string;
    sender: { name: string; email: string };
    htmlContent: string;
    recipients: { listIds: number[] };
    scheduledAt?: string;
}) {
    if (!BREVO_API_KEY) {
        throw new Error("Email configuration missing.");
    }

    const response = await fetch(`${API_URL}/emailCampaigns`, {
        method: "POST",
        headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            ...params,
            type: "classic",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create campaign");
    }

    return await response.json();
}
