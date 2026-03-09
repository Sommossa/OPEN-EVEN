import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { categoryId, discountCode, quantity = 1, currency = "INR", receipt } = data;

        if (!categoryId) {
            return new Response(JSON.stringify({ error: "categoryId is required for secure pricing" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const key_id = import.meta.env.PUBLIC_RAZORPAY_KEY_ID || "rzp_live_SNuw6JVmpkOI5f";
        const key_secret = import.meta.env.RAZORPAY_KEY_SECRET || "DmbrgKqBFOc5sS6rGkXQmL4F";
        const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID || "OPEN EVEN26-6e70e";

        if (!key_id || !key_secret || !projectId) {
            console.error("Razorpay keys are missing from environment variables.");
            return new Response(JSON.stringify({ error: "Payment gateway is not configured correctly." }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 1. Fetch the exact Ticket Category price from Firestore via REST strictly on the server
        const ticketResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/ticketCategories/${categoryId}`);
        if (!ticketResponse.ok) {
            return new Response(JSON.stringify({ error: "Invalid ticket category requested" }), { status: 404 });
        }
        const ticketResult = await ticketResponse.json();
        const basePrice = ticketResult.fields.price.doubleValue !== undefined ? Number(ticketResult.fields.price.doubleValue) : Number(ticketResult.fields.price.integerValue || 0);

        let finalPricePerTicket = basePrice;

        // 2. Process Discount Code if provided
        if (discountCode) {
            const discountResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/discounts/${discountCode.toUpperCase()}`);
            if (discountResponse.ok) {
                const discountResult = await discountResponse.json();
                const active = discountResult.fields.active.booleanValue;
                const percent = discountResult.fields.discount_percentage.integerValue;

                if (active) {
                    finalPricePerTicket = basePrice - (basePrice * (Number(percent) / 100));
                }
            }
        }

        // 3. Final calculation multiplied by quantity
        const totalAmount = finalPricePerTicket * quantity;

        if (totalAmount <= 0) {
            return new Response(JSON.stringify({ error: "Final price calculated to zero, no payment required" }), { status: 400 });
        }

        const auth = btoa(`${key_id}:${key_secret}`);

        const payload = {
            amount: Math.round(totalAmount * 100), // amount in the smallest currency unit (paise for INR)
            currency,
            receipt: receipt || `rcptid_${Math.random().toString(36).substr(2, 9)}`,
        };

        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.description || "Failed to create order");
        }

        const order = await response.json();

        return new Response(JSON.stringify(order), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error: any) {
        console.error("Error creating Razorpay order:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to create order" }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
