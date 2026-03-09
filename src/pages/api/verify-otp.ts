
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return new Response(JSON.stringify({ error: "Email and OTP are required" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID || "OPEN EVEN26-6e70e";
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/otps/${email}`;

        const response = await fetch(firestoreUrl);

        if (!response.ok) {
            if (response.status === 404) {
                return new Response(JSON.stringify({ error: "OTP not found or expired. Please resend." }), { status: 404 });
            }
            throw new Error("Failed to fetch OTP");
        }

        const data = await response.json();
        const storedOtp = data.fields.otp.stringValue;
        const expiresAt = parseInt(data.fields.expiresAt.integerValue);

        if (Date.now() > expiresAt) {
            return new Response(JSON.stringify({ error: "OTP has expired. Please resend." }), { status: 400 });
        }

        if (storedOtp !== otp) {
            return new Response(JSON.stringify({ error: "Invalid OTP. Please try again." }), { status: 400 });
        }

        // Success! We can delete the OTP now that it's verified
        await fetch(firestoreUrl, { method: "DELETE" });

        return new Response(JSON.stringify({ success: true, message: "Email verified successfully" }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Error in verify-otp:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to verify OTP" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
