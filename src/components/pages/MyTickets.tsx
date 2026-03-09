import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, Search, ArrowLeft, QrCode, SlidersHorizontal, Download, Share2, Mail } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QRCodeSVG } from "qrcode.react";
import { generateTicketPDF } from "@/lib/pdf-generator";

interface Ticket {
    id: string;
    categoryId: string;
    categoryName: string;
    ticketId: string;
    userId: string;
    userEmail: string;
    userName: string;
    status: string;
    [key: string]: any;
}

export default function MyTickets() {
    const { user, loading } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [fetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    // For the QR code modal
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [splitting, setSplitting] = useState(false);
    const [guestEmail, setGuestEmail] = useState("");
    const [showSplitInput, setShowSplitInput] = useState(false);
    const [splitMessage, setSplitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            window.location.replace("/login");
        }
    }, [user, loading]);

    useEffect(() => {
        const fetchMyTickets = async () => {
            if (!user || !db) return;
            try {
                const q = query(
                    collection(db, "users", user.uid, "tickets"),
                    where("status", "!=", "pending_approval") // don't show pending tickets here
                );
                const snap = await getDocs(q);
                const tix: Ticket[] = [];
                snap.forEach(doc => {
                    tix.push({ id: doc.id, ...doc.data() } as Ticket);
                });
                setTickets(tix);
            } catch (err) {
                console.error("Failed to fetch tickets:", err);
            } finally {
                setFetching(false);
            }
        };

        if (user) {
            fetchMyTickets();
        }
    }, [user]);

    const handleDownloadTicket = async () => {
        if (!selectedTicket) return;
        setDownloading(true);
        try {
            await generateTicketPDF(selectedTicket, user?.displayName || "Attendee");
        } catch (err) {
            console.error("Failed to generate PDF", err);
        } finally {
            setDownloading(false);
        }
    };

    const handleSplitTicket = async () => {
        if (!selectedTicket || !guestEmail || !user) return;
        setSplitting(true);
        setSplitMessage(null);
        try {
            const resp = await fetch("/api/split-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticketId: selectedTicket.ticketId,
                    guestEmail: guestEmail,
                    ownerUid: user.uid
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Failed to split ticket");

            setSplitMessage({ type: "success", text: "Ticket sent to guest! They can log in with this email to see it." });
            setGuestEmail("");
            setShowSplitInput(false);

            // Refresh tickets
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            setSplitMessage({ type: "error", text: err.message });
        } finally {
            setSplitting(false);
        }
    };

    const categories = ["All", ...Array.from(new Set(tickets.map(t => t.categoryName)))];

    const filteredTickets = tickets.filter(t => {
        const matchesSearch =
            t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.ticketId.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === "All" || t.categoryName === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    if (loading || fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="pt-24 px-4 max-w-6xl mx-auto pb-24 md:pb-8">
            <div className="flex items-center gap-4 mb-8">
                <a href="/profile" className="p-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </a>
                <h1 className="text-3xl font-bold">My Passes ({tickets.length})</h1>
            </div>

            {tickets.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-[var(--glass-border)] flex items-center justify-center mb-6">
                        <span className="text-3xl">🎟️</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">No Passes Found</h3>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-sm">You haven't purchased or been assigned any active passes yet.</p>
                    <a
                        href="/tickets"
                        className="px-8 py-4 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
                    >
                        Get A Pass
                    </a>
                </GlassCard>
            ) : (
                <div className="space-y-6">
                    <GlassCard className="p-4 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or pass ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <SlidersHorizontal className="w-5 h-5 text-[var(--text-secondary)]" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 text-sm appearance-none cursor-pointer pr-10"
                            >
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </GlassCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTickets.map(ticket => (
                            <GlassCard
                                key={ticket.id}
                                className="p-0 overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => setSelectedTicket(ticket)}
                            >
                                <div className="p-6 pb-0 relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                                            {ticket.categoryName}
                                        </span>
                                        <span className="text-[var(--text-secondary)] text-xs font-mono">
                                            {ticket.ticketId.split('-')[1]}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-1 truncate">{ticket.userName}</h3>
                                    <p className="text-sm text-[var(--text-secondary)] mb-6 truncate">{ticket.userEmail}</p>
                                </div>

                                <div className="px-6 py-4 bg-black/20 border-t border-[var(--glass-border)] flex items-center justify-between mt-auto">
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        Status: <span className={ticket.status === 'active' ? "text-primary font-bold" : "text-yellow-500 font-bold"}>
                                            {ticket.status === 'active' ? 'Active' : 'Guest Pass'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm group-hover:translate-x-1 transition-transform">
                                        View QR <QrCode className="w-4 h-4" />
                                    </div>
                                </div>
                            </GlassCard>
                        ))}

                        {filteredTickets.length === 0 && (
                            <div className="col-span-full py-12 text-center text-[var(--text-secondary)]">
                                No passes match your search criteria.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Basic QR Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-black mb-1">{selectedTicket.categoryName}</h3>
                        <p className="text-gray-500 text-sm mb-6">{selectedTicket.userName}</p>

                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex justify-center mb-6">
                            <QRCodeSVG
                                value={selectedTicket.ticketId}
                                size={200}
                                bgColor="#f9fafb"
                                fgColor="#000000"
                                level="Q"
                                includeMargin={false}
                            />
                        </div>

                        <p className="font-mono text-gray-400 text-sm">{selectedTicket.ticketId}</p>

                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
                            <button
                                onClick={handleDownloadTicket}
                                disabled={downloading}
                                className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary-light transition-colors flex justify-center items-center gap-2"
                            >
                                {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                Save PDF
                            </button>

                            {selectedTicket.status === 'active' &&
                                tickets.filter(t => t.status === 'active').length > 1 &&
                                !showSplitInput && (
                                    <button
                                        onClick={() => setShowSplitInput(true)}
                                        className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors flex justify-center items-center gap-2"
                                    >
                                        <Share2 className="w-5 h-5" />
                                        Split Pass
                                    </button>
                                )}

                            {showSplitInput && (
                                <div className="flex-1 w-full space-y-3">
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            placeholder="Guest Email"
                                            value={guestEmail}
                                            onChange={(e) => setGuestEmail(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary text-gray-900"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSplitTicket}
                                            disabled={splitting || !guestEmail}
                                            className="flex-1 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-light transition-colors flex justify-center items-center gap-2 text-xs"
                                        >
                                            {splitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Ticket"}
                                        </button>
                                        <button
                                            onClick={() => setShowSplitInput(false)}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg transition-colors text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {splitMessage && (
                                <div className={`w-full p-3 rounded-lg text-xs mt-2 ${splitMessage.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                    {splitMessage.text}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setSelectedTicket(null);
                                    setShowSplitInput(false);
                                    setSplitMessage(null);
                                }}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-black font-bold rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
