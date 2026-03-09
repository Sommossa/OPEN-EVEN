import type { APIRoute } from 'astro';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { ticketId, guestEmail, ownerUid } = await request.json();

        if (!ticketId || !guestEmail || !ownerUid) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        if (!db) {
            return new Response(JSON.stringify({ error: "Database not initialized" }), { status: 500 });
        }

        // 1. Verify Ticket Ownership and Type
        const ticketRef = doc(db, "tickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);

        if (!ticketSnap.exists()) {
            return new Response(JSON.stringify({ error: "Ticket not found" }), { status: 404 });
        }

        const ticketData = ticketSnap.data();
        if (ticketData.userId !== ownerUid) {
            return new Response(JSON.stringify({ error: "Unauthorized: You do not own this ticket" }), { status: 403 });
        }

        // 2. Ensure owner has at least one other active ticket
        const ownerTicketsRef = collection(db, "users", ownerUid, "tickets");
        const activeTicketsQuery = query(ownerTicketsRef, where("status", "==", "active"));
        const activeTicketsSnap = await getDocs(activeTicketsQuery);

        if (activeTicketsSnap.size <= 1) {
            return new Response(JSON.stringify({ error: "You must keep at least one active pass for yourself." }), { status: 400 });
        }

        // 3. Determine Guest UID (if user exists)
        let guestUid: string | null = null;
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", guestEmail.trim()));
        const userSnap = await getDocs(q);

        if (!userSnap.empty) {
            guestUid = userSnap.docs[0].id;
        }

        // 3. Update Ticket in top-level 'tickets' collection
        const updatedTicketData = {
            ...ticketData,
            userEmail: guestEmail,
            userName: "Guest", // Default to Guest, can be updated on first login/profile
            status: guestUid ? "pending_approval" : "assigned_guest",
            userId: guestUid || ownerUid, // Still owned by owner if guest doesn't exist, or transferred to guest
            active: guestUid ? false : true, // If guest exists, they need to approve/claim it
            splitFrom: ownerUid,
            updatedAt: new Date()
        };

        // If guest exists, transfer ownership immediately
        if (guestUid) {
            updatedTicketData.userId = guestUid;
        }

        await updateDoc(ticketRef, updatedTicketData);

        // 4. Update in User's collections
        // Remove from old owner's collection
        const oldOwnerTicketRef = doc(db, "users", ownerUid, "tickets", ticketId);
        const oldOwnerTicketSnap = await getDoc(oldOwnerTicketRef);
        if (oldOwnerTicketSnap.exists()) {
            // Delete from old owner (effectively transferring)
            // Or mark it as transferred? Let's just transfer it to keep collections clean.
            // Move to new owner if they exist
            if (guestUid) {
                await setDoc(doc(db, "users", guestUid, "tickets", ticketId), updatedTicketData);
            } else {
                // If guest doesn't exist, we keep it under owner but mark as assigned guest
                await setDoc(oldOwnerTicketRef, updatedTicketData);
            }
        }

        // 5. Trigger Email Notification (Placeholder - should ideally call sendEmail)
        // Note: For now we return success, and the frontend can call send-ticket-email if needed
        // Or we can integrate it here later.

        return new Response(JSON.stringify({ success: true, guestUid }), { status: 200 });

    } catch (error: any) {
        console.error("Error splitting ticket:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
