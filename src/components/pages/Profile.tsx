import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, LogOut, User as UserIcon, ShieldAlert, QrCode, X, CalendarCheck, MoveRight, Download, Link, Github, Linkedin, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { generateTicketPDF } from "@/lib/pdf-generator";
import * as ics from "ics";

export default function Profile() {
  const { user, profile, loading, signOut } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [approvedTickets, setApprovedTickets] = useState<any[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);
  const [fetchingTickets, setFetchingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showCheckInAnim, setShowCheckInAnim] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      window.location.replace("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!db || !user) return;
      try {
        const snap = await getDocs(collection(db, "users", user.uid, "tickets"));
        const userTickets: any[] = [];
        const appTix: any[] = [];
        const pendTix: any[] = [];

        snap.forEach(docSnap => {
          const tData: any = { id: docSnap.id, ...docSnap.data() };
          userTickets.push(tData);
          if (tData.status === "pending_approval") {
            pendTix.push(tData);
          } else {
            appTix.push(tData);
          }
        });

        setTickets(userTickets);
        setApprovedTickets(appTix);
        setPendingTickets(pendTix);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setFetchingTickets(false);
      }
    };

    if (user) {
      fetchTickets();
    }
  }, [user]);

  // Real-time listener for check-in status when a ticket is selected
  useEffect(() => {
    if (!selectedTicket || !db) return;

    // The ticket ID in the subcollection is selectedTicket.id
    // But it's also linked exactly to the user UID subcollection
    const unsub = onSnapshot(doc(db, "users", selectedTicket.userId, "tickets", selectedTicket.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.checkedIn && !isCheckedIn) {
          setIsCheckedIn(true);
          setShowCheckInAnim(true);
          setTimeout(() => setShowCheckInAnim(false), 3000); // Hide animation after 3s
        }
      }
    });

    return () => unsub();
  }, [selectedTicket, isCheckedIn]);

  const handleAcceptPass = async (ticket: any) => {
    if (!user || !db) return;
    setProcessingApproval(ticket.id);
    try {
      const updates = { status: "active", active: true };
      await updateDoc(doc(db, "users", user.uid, "tickets", ticket.id), updates);
      await updateDoc(doc(db, "tickets", ticket.id), updates);

      setPendingTickets(prev => prev.filter(t => t.id !== ticket.id));
      setApprovedTickets(prev => [...prev, { ...ticket, status: "active", active: true }]);
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "active", active: true } : t));
    } catch (err) {
      console.error("Failed to accept pass", err);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleDeclinePass = async (ticket: any) => {
    if (!user || !db || !ticket.purchasedBy) return;
    setProcessingApproval(ticket.id);
    try {
      // 1. Delete from current user
      await deleteDoc(doc(db, "users", user.uid, "tickets", ticket.id));

      // 2. Add back to buyer as guest
      const newTicketData = { ...ticket, userId: ticket.purchasedBy, status: "assigned_guest" };
      await setDoc(doc(db, "users", ticket.purchasedBy, "tickets", ticket.id), newTicketData);

      // 3. Update global ticket
      await updateDoc(doc(db, "tickets", ticket.id), { userId: ticket.purchasedBy, status: "assigned_guest" });

      setPendingTickets(prev => prev.filter(t => t.id !== ticket.id));
      setTickets(prev => prev.filter(t => t.id !== ticket.id));
    } catch (err) {
      console.error("Failed to decline pass", err);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleDownloadTicket = async () => {
    setDownloading(true);
    try {
      await generateTicketPDF(selectedTicket, profile?.displayName || user?.displayName || "Attendee");
    } catch (err) {
      console.error("Failed to generate ticket", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCalendar = () => {
    const event = {
      title: 'OPEN EVEN 2026',
      description: 'Join the most vibrant open source community gathering of the year.',
      location: 'Main Conference Center, Tech Park',
      // Dates: April 4, 2026 09:00 AM - 06:00 PM
      start: [2026, 4, 4, 9, 0] as ics.DateArray,
      duration: { hours: 9 },
      url: 'https://OPEN EVEN26.example.com'
    };

    ics.createEvent(event, (error, value) => {
      if (error) {
        console.error(error);
        alert('Failed to generate calendar event');
        return;
      }
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'OPEN EVEN2026_event.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">You are not logged in</h2>
        <p className="text-[var(--text-secondary)] mb-6">Redirecting you to the login page...</p>
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  const primaryTicket = approvedTickets.length > 0 ? approvedTickets[0] : null;

  return (
    <div className="min-h-screen pt-24 px-4 max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {/* 1. User Info Header */}
        <div className="space-y-6">
          <GlassCard>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-[var(--glass-border)] border-2 border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-[var(--text-secondary)]" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile?.displayName || primaryTicket?.userName || user.displayName || "Attendee"}</h2>
                <p className="text-[var(--text-secondary)] text-sm">{user.email || primaryTicket?.userEmail || "Anonymous User"}</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 uppercase tracking-wider">
                  {profile?.role || "Attendee"}
                </span>
              </div>
            </div>

            {primaryTicket && (
              <div className="pt-4 border-t border-[var(--glass-border)] flex justify-between items-center">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pass Type</p>
                  <p className="font-bold text-primary">{primaryTicket.categoryName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--text-secondary)]">Pass ID</p>
                  <p className="font-mono text-sm">{primaryTicket.ticketId?.split('-')[1] || primaryTicket.id}</p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* 2. Tickets Section (Moved Above About) */}
        <div className="space-y-6">
          <h3 className="font-bold text-xl px-2">My Passes</h3>
          {fetchingTickets ? (
            <GlassCard className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </GlassCard>
          ) : approvedTickets.length === 0 && pendingTickets.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              <div className="w-20 h-20 rounded-full bg-[var(--glass-border)] flex items-center justify-center mb-6">
                <span className="text-3xl">🎟️</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">No Pass Yet</h3>
              <p className="text-[var(--text-secondary)] mb-8 max-w-sm">You haven't purchased a pass for OPEN EVEN 2026. Secure your spot now!</p>
              <a
                href="/tickets"
                className="px-8 py-4 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
              >
                Grab Your Pass
              </a>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {pendingTickets.map(ticket => (
                <GlassCard key={ticket.id} className="p-5 border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Pass Assigned to You!</h4>
                        <p className="text-sm text-[var(--text-secondary)]">You've been assigned a <strong className="text-primary">{ticket.categoryName}</strong> pass. Please accept it to add it to your profile.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleAcceptPass(ticket)}
                        disabled={processingApproval === ticket.id}
                        className="flex-1 sm:flex-none px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-light disabled:opacity-50"
                      >
                        {processingApproval === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleDeclinePass(ticket)}
                        disabled={processingApproval === ticket.id}
                        className="flex-1 sm:flex-none px-6 py-2 bg-red-500/20 text-red-500 font-bold rounded-lg hover:bg-red-500/30 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}

              {primaryTicket && (
                <GlassCard className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 space-y-8" greenBorder>
                  <div className="w-full">
                    <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
                    <p className="text-[var(--text-secondary)]">Your pass is secured for OPEN EVEN.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center mt-6">
                    <div className="relative group cursor-pointer shrink-0" onClick={() => setSelectedTicket(primaryTicket)}>
                      {/* Stub Preview */}
                      <div className="w-64 h-32 bg-primary/10 border border-primary/30 rounded-xl relative overflow-hidden flex items-center justify-center transform transition-transform group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(0,200,83,0.3)]">
                        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <QrCode className="w-12 h-12 text-primary opacity-50 absolute right-4 bottom-4" />
                        <div className="text-left w-full p-6">
                          <p className="text-xs uppercase tracking-widest text-[var(--text-primary)] mb-1">OPEN EVEN</p>
                          <p className="font-bold text-xl text-primary">{primaryTicket.categoryName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                      {approvedTickets.length > 1 ? (
                        <a
                          href="/my-tickets"
                          className="w-full px-8 py-4 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0 h-14"
                        >
                          View All My Passes ({approvedTickets.length}) <MoveRight className="w-5 h-5" />
                        </a>
                      ) : (
                        <button
                          onClick={() => setSelectedTicket(primaryTicket)}
                          className="w-full px-8 py-4 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0 h-14"
                        >
                          View My Pass <MoveRight className="w-5 h-5" />
                        </button>
                      )}
                      <a
                        href="/tickets"
                        className="w-full px-8 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-primary/30 text-[var(--text-primary)] font-bold hover:bg-white/5 transition-colors flex items-center justify-center text-sm shadow-inner"
                      >
                        Need More Passes? Click here
                      </a>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </div>

        {/* 3. About App */}
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <h3 className="font-bold border-b border-[var(--glass-border)] pb-2 mb-4">About OPEN EVEN App</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              OPEN EVEN 2026 is an initiative to bring communities together. This progressive web app acts as your companion guide.
            </p>

            <div className="pt-2">
              <h4 className="text-sm font-bold mb-3 text-[var(--text-primary)]">Follow & Connect</h4>
              <div className="grid grid-cols-2 gap-3">
                <a href="#" className="flex items-center gap-2 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm hover:text-primary transition-colors hover:border-primary/30">
                  <Github className="w-4 h-4" /> GitHub
                </a>
                <a href="#" className="flex items-center gap-2 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm hover:text-primary transition-colors hover:border-primary/30">
                  <X className="w-4 h-4" /> Twitter / X
                </a>
                <a href="#" className="flex items-center gap-2 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm hover:text-primary transition-colors hover:border-primary/30">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
                <a href="#" className="flex items-center gap-2 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm hover:text-primary transition-colors hover:border-primary/30">
                  <MessageSquare className="w-4 h-4" /> Blog
                </a>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* 4. Action Buttons & Sign Out (At Bottom) */}
        <div className="pt-8 border-t border-[var(--glass-border)] flex flex-col gap-4">
          {(profile?.role === "admin" || profile?.role === "manager" || profile?.role === "volunteer") && (
            <a
              href="/volunteer"
              className="flex items-center justify-center w-full gap-2 px-4 py-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-primary font-bold hover:bg-[var(--glass-border)] transition-colors shadow-sm"
            >
              <CalendarCheck className="w-5 h-5" />
              Open Scanner Dash
            </a>
          )}
          {(profile?.role === "admin" || profile?.role === "manager") && (
            <a
              href="/admin"
              className="flex items-center justify-center w-full gap-2 px-4 py-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-primary font-bold hover:bg-[var(--glass-border)] transition-colors shadow-sm"
            >
              <ShieldAlert className="w-5 h-5" />
              {profile?.role === "admin" ? "Open Admin Dash" : "Open Manager Dash"}
            </a>
          )}

          {!user.isAnonymous && (
            <button
              onClick={() => {
                signOut();
                window.location.href = "/";
              }}
              className="flex items-center justify-center w-full mt-4 gap-2 px-4 py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Portrait Ticket QR Modal with Grain/Gradient */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !downloading && setSelectedTicket(null)} />

            <div className="relative w-full max-w-[380px] z-10 flex flex-col items-center gap-4">

              <AnimatePresence>
                {showCheckInAnim && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0, opacity: 0, y: -50 }}
                    className="absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#00C853] text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 backdrop-blur-md"
                  >
                    <CheckCircle2 className="w-16 h-16" />
                    <span className="text-2xl font-bold">Checked In!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                ref={ticketRef}
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="w-full bg-[#0m2b5e] rounded-[2rem] shadow-2xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(135deg, #001f44 0%, #00C853 150%)',
                }}
              >
                <div className="absolute top-4 right-4 z-20" id="ticket-close-btn">
                  <button onClick={() => setSelectedTicket(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white backdrop-blur-md">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Noise overlay */}
                <div id="ticket-noise-bg" className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                {/* Top Section */}
                <div className="p-8 pb-10 flex flex-col items-center text-center relative z-10 border-b border-white/10">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6 p-2 relative">
                    <img src="/icons/OPEN_EVEN_LOGO.png" alt="OPEN EVEN Logo" className="w-full h-full object-contain" />
                    <div className="absolute -inset-2 bg-[#00C853] opacity-20 blur-xl rounded-full"></div>
                  </div>

                  <h3 className="text-white text-3xl font-bold font-display uppercase tracking-widest relative">OPEN EVEN</h3>
                  <div className="mt-3 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                    <p className="text-[#00C853] font-bold tracking-wide uppercase text-sm">{selectedTicket.categoryName} Pass</p>
                  </div>
                </div>

                {/* Bottom Section (QR Code) - White Ticket Stub */}
                <div className="bg-white p-8 pt-10 text-center flex flex-col items-center relative rounded-t-3xl -mt-6">
                  {/* Floating check mark if actively checked in globally */}
                  {isCheckedIn && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-black rounded-full flex items-center justify-center border-4 border-[#00C853] shadow-[0_0_20px_rgba(0,200,83,0.5)] z-30">
                      <CheckCircle2 className="w-6 h-6 text-[#00C853]" />
                    </div>
                  )}

                  <div className="p-4 bg-white rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-gray-100">
                    {/* QR Code contains the exact Ticket ID for easy volunteer scanning */}
                    <QRCodeSVG
                      value={selectedTicket.id}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="Q"
                      includeMargin={false}
                    />
                  </div>

                  <div className="mt-6 w-full text-center">
                    <p className="text-gray-900 font-bold text-xl mb-1">{selectedTicket.userName || profile?.displayName}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-6">{selectedTicket.userEmail}</p>

                    <div className="grid grid-cols-2 gap-4 text-left bg-gray-50 p-4 rounded-xl">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Date</p>
                        <p className="text-gray-900 font-bold text-sm">Valid Oct 26</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Pass ID</p>
                        <p className="text-gray-900 font-mono text-sm truncate uppercase">{selectedTicket.ticketId?.split('-')[1] || '...'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[380px] mt-4">
                <button
                  onClick={handleDownloadTicket}
                  disabled={downloading}
                  className="flex-1 py-4 rounded-xl bg-white text-black font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-xl"
                >
                  {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  Save PDF
                </button>
                <button
                  onClick={handleDownloadCalendar}
                  className="flex-1 py-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 shadow-xl backdrop-blur-md"
                >
                  <CalendarCheck className="w-5 h-5" />
                  Add to Calendar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}
