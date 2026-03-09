import React from "react";
import Register from "./Register";

import { AuthProvider } from "@/lib/auth/AuthContext";

export default function RegisterWrapper() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
      <AuthProvider>
      <main>
        <Register />
      </main>
    </AuthProvider>
    </div>
  );
}
