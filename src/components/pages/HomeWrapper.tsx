import React from "react";
import Home from "./Home";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function HomeWrapper() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
        <main>
          <Home />
        </main>
      </div>
    </AuthProvider>
  );
}
