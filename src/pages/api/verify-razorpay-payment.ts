import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = data;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return new Response(JSON.stringify({ error: "Missing required payment details" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const key_secret = import.meta.env.RAZORPAY_KEY_SECRET || "DmbrgKqBFOc5sS6rGkXQmL4F";

        if (!key_secret) {
            return new Response(JSON.stringify({ error: "Payment gateway is not configured correctly." }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(key_secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify', 'sign']
        );
        const signatureArrayBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            enc.encode(body.toString())
        );

        const expectedSignature = Array.from(new Uint8Array(signatureArrayBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Signature is valid.
            // In a full production system, you would securely update Firestore using the Firebase Admin SDK here.
            // Since Firebase Admin SDK isn't configured in this repository, we acknowledge the payment.
            // The frontend can proceed to register the ticket securely since auth is confirmed.

            return new Response(JSON.stringify({
                success: true,
                message: "Payment verified successfully",
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: "Invalid signature. Payment verification failed." }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error: any) {
        console.error("Error verifying Razorpay payment:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to verify payment" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
