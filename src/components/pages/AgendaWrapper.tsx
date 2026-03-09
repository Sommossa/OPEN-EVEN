import React from "react";
import AgendaPage from "./AgendaPage";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function AgendaWrapper() {
    return (
        <AuthProvider>
            <AgendaPage />
        </AuthProvider>
    );
}
