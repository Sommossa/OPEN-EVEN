import React from "react";
import SessionsPage from "./SessionsPage";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function SessionsWrapper() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
                <main>
                    <SessionsPage />
                </main>
            </div>
        </AuthProvider>
    );
}
