import React from "react";
import Profile from "./Profile";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function ProfileWrapper() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
                <main>
                    <Profile />
                </main>
            </div>
        </AuthProvider>
    );
}
