import React from "react";
import AdminPage from "./Admin";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function AdminWrapper() {
    return (
        <AuthProvider>
            <AdminPage />
        </AuthProvider>
    );
}
