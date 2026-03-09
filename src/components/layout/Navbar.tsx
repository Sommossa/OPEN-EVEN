import React, { useEffect, useState } from "react";
import { User, TicketIcon, Calendar, Home, Users, Mic, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

export function Navbar() {
  const { user, profile } = useAuth();
  const [hasTicket, setHasTicket] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
      const updatePath = () => setCurrentPath(window.location.pathname);
      document.addEventListener('astro:page-load', updatePath);
      return () => document.removeEventListener('astro:page-load', updatePath);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkTicket = async () => {
      if (!user || !db) {
        if (isMounted) setHasTicket(false);
        return;
      }
      try {
        const q = query(collection(db, "users", user.uid, "tickets"), where("active", "==", true), limit(1));
        const snap = await getDocs(q);
        if (isMounted) setHasTicket(!snap.empty);
      } catch (err) {
        console.error("Error checking ticket status in Navbar:", err);
      }
    };
    checkTicket();
    return () => { isMounted = false; };
  }, [user]);

  // Base links everybody sees
  const navLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Sessions", href: "/sessions", icon: Mic },
    { label: "Agenda", href: "/agenda", icon: Layers },
    { label: "Speakers", href: "/speakers", icon: Users },
  ];

  if (!hasTicket) {
    navLinks.push({ label: "Tickets", href: "/tickets", icon: TicketIcon });
  } else {
    navLinks.push({ label: "Profile", href: "/profile", icon: User });
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center space-x-3">
              <img src="/icons/OPEN_EVEN_LOGO.png" alt="OPEN EVEN Logo" className="w-8 h-8" />
              <span className="font-display font-bold text-xl tracking-tight text-[var(--text-primary)]">
                OPEN EVEN <span className="text-primary">2026</span>
              </span>
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => {
                const isActive = currentPath === link.href;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className={`relative text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? "text-primary font-bold" : "text-[var(--text-secondary)] hover:text-primary"}`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="desktop-nav-active"
                        className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </a>
                );
              })}

              <AnimatePresence>
                {!hasTicket && (
                  <motion.a
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    href="/tickets"
                    className="px-4 py-2 rounded-full bg-primary text-black font-semibold text-sm hover:bg-primary-light transition-colors shadow-[0_0_20px_rgba(0,200,83,0.4)]"
                  >
                    Get Tickets
                  </motion.a>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Dock */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-sm">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className="glass-panel rounded-full border border-[var(--glass-border)] shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-around p-2 overflow-x-auto hide-scrollbar"
        >
          {navLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <motion.a
                key={link.label}
                href={link.href}
                whileTap={{ scale: 0.85 }}
                className={`relative p-3 rounded-full flex flex-col items-center justify-center gap-1 transition-colors min-w-[60px] ${isActive ? "text-primary" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-dock-active"
                    className="absolute inset-0 bg-primary/10 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <link.icon className={`w-5 h-5 relative z-10 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,200,83,0.8)]' : ''}`} />
                <span className={`text-[10px] relative z-10 ${isActive ? 'font-bold' : 'font-medium'}`}>{link.label}</span>
              </motion.a>
            );
          })}
        </motion.div>
      </div>
    </>
  );
}
