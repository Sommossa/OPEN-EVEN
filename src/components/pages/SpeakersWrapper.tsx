import React from "react";
import SpeakersPage from "./SpeakersPage";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function SpeakersWrapper() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
                <main>
                    <SpeakersPage />
                </main>
            </div>
        </AuthProvider>
    );
}
