import React from "react";
import VolunteerScanner from "./VolunteerScanner";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function VolunteerWrapper() {
    return (
        <AuthProvider>
            <VolunteerScanner />
        </AuthProvider>
    );
}
