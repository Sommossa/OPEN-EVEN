import React from "react";
import Tickets from "./Tickets";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function TicketsWrapper() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
        <main>
          <Tickets />
        </main>
      </div>
    </AuthProvider>
  );
}
