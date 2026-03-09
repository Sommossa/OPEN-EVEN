import React from "react";
import { Navbar } from "./Navbar";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function NavbarWrapper() {
    return (
        <AuthProvider>
            <Navbar />
        </AuthProvider>
    );
}
