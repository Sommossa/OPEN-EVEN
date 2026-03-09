import React from "react";
import Login from "./Login";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function LoginWrapper() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
        <main>
          <Login />
        </main>
      </div>
    </AuthProvider>
  );
}
