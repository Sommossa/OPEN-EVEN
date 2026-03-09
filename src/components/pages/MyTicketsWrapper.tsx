import React from "react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import MyTickets from "./MyTickets";

export default function MyTicketsWrapper() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
                <MyTickets />
            </div>
        </AuthProvider>
    );
}
