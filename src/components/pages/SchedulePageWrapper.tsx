import React from "react";
import SchedulePage from "./SchedulePage";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function SchedulePageWrapper() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-body selection:bg-primary/30">
        <main>
          <SchedulePage />
        </main>
      </div>
    </AuthProvider>
  );
}
