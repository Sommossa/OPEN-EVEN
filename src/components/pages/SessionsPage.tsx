import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, Clock, MapPin, User, Calendar, Plus, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getAllSessions } from "@/lib/firestore/sessions";
import type { SessionsSession } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function SessionsPage() {
    const [sessions, setSessions] = useState<SessionsSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDay, setActiveDay] = useState<number>(1);
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const { user } = useAuth();
    const [userAgenda, setUserAgenda] = useState<string[]>([]);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        const fetchAgenda = async () => {
            try {
                const localAgenda = localStorage.getItem('OPEN EVEN_agenda');
                if (localAgenda) {
                    setUserAgenda(JSON.parse(localAgenda));
                }
            } catch (err) {
                console.error("Failed to fetch agenda", err);
            }
        };
        fetchAgenda();
    }, []);

    useEffect(() => {
        async function fetchSessions() {
            try {
                const data = await getAllSessions();
                setSessions(data);
                const days = Array.from(new Set(data.map(s => s.day))).sort();
                if (days.length > 0) setActiveDay(days[0]);
            } catch (err) {
                console.error("Failed to fetch sessions", err);
            } finally {
                setLoading(false);
            }
        }
        fetchSessions();
    }, []);

    const typeColors: Record<string, string> = {
        keynote: 'bg-purple-100 text-purple-700 border-purple-200',
        talk: 'bg-blue-100 text-blue-700 border-blue-200',
        workshop: 'bg-green-100 text-green-700 border-green-200',
        break: 'bg-amber-100 text-amber-700 border-amber-200',
        general: 'bg-gray-100 text-gray-600 border-gray-200',
    };

    const days = Array.from(new Set(sessions.map(s => s.day))).sort();
    const filters = ["all", "keynote", "talk", "workshop", "break"];

    const filteredSessions = sessions.filter(s =>
        s.day === activeDay && (activeFilter === "all" || s.type === activeFilter)
    );

    const toggleAgenda = async (sessionId: string) => {
        setToggling(sessionId);
        const isAdded = userAgenda.includes(sessionId);
        const newAgenda = isAdded ? userAgenda.filter(id => id !== sessionId) : [...userAgenda, sessionId];
        setUserAgenda(newAgenda);

        try {
            localStorage.setItem('OPEN EVEN_agenda', JSON.stringify(newAgenda));
        } catch (err) {
            console.error("Failed to update agenda", err);
            setUserAgenda(userAgenda); // Revert
            alert("Failed to update agenda. Please try again.");
        } finally {
            setToggling(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 px-4 max-w-7xl mx-auto pb-24">
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">Event Sessions</h1>
                <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
                    Explore the lineup of keynotes, workshops, and talks at OPEN EVEN 2026.
                </p>
            </div>

            {sessions.length === 0 ? (
                <GlassCard className="text-center p-12">
                    <h3 className="text-xl font-bold mb-2">Schedule Coming Soon</h3>
                    <p className="text-[var(--text-secondary)]">We are still finalizing the session lineup.</p>
                </GlassCard>
            ) : (
                <>
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                        <div className="flex bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-1 shadow-sm backdrop-blur-md">
                            {days.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setActiveDay(day)}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeDay === day ? "bg-primary text-black shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                                >
                                    Day {day}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {filters.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${activeFilter === filter
                                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                                        : "bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* E-Commerce Style Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        <AnimatePresence mode="popLayout">
                            {filteredSessions.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="col-span-full text-center p-12 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl text-[var(--text-secondary)]"
                                >
                                    No sessions found for this filter.
                                </motion.div>
                            ) : (
                                filteredSessions.map((session, i) => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="w-full flex"
                                    >
                                        {/* Product Card */}
                                        <div className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-primary/50 transition-colors shadow-lg rounded-2xl overflow-hidden flex flex-col group relative">
                                            {session.bannerImage ? (
                                                <div className="w-full h-48 bg-gray-100 overflow-hidden shrink-0 relative">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                                    <img src={session.bannerImage} alt={session.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                                                    <span className={`absolute top-4 right-4 z-20 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border shadow-sm ${typeColors[session.type] || typeColors.general}`}>
                                                        {session.type}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-4 bg-gradient-to-r from-primary/20 to-primary/5 shrink-0 relative">
                                                    <span className={`absolute top-6 right-4 z-20 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border shadow-sm ${typeColors[session.type] || typeColors.general}`}>
                                                        {session.type}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`p-6 flex flex-col flex-1 ${!session.bannerImage ? 'pt-12' : ''}`}>
                                                <h3 className="text-xl font-bold text-[var(--text-primary)] leading-tight mb-4 group-hover:text-primary transition-colors">{session.title}</h3>

                                                {session.type !== 'break' && session.type !== 'general' && session.speaker && (
                                                    <div className="mb-4">
                                                        <div className="inline-flex items-center gap-2 text-[var(--text-secondary)] bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                                <User className="w-3.5 h-3.5 text-primary" />
                                                            </div>
                                                            <span className="text-sm font-medium">{session.speaker}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {session.description && (
                                                    <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-3 leading-relaxed flex-1">
                                                        {session.description}
                                                    </p>
                                                )}

                                                {session.tags && session.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                                                        {session.tags.slice(0, 3).map(tag => (
                                                            <span key={tag} className="text-[10px] font-medium text-[var(--text-secondary)] bg-black/20 px-2 py-1 rounded border border-white/5">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {session.tags.length > 3 && (
                                                            <span className="text-[10px] font-medium text-[var(--text-secondary)] px-1 py-1">
                                                                +{session.tags.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex flex-col gap-2 text-xs font-medium text-[var(--text-secondary)] py-4 border-t border-[var(--glass-border)] mt-auto">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                                                        <span>Day {session.day} • {session.time} ({session.duration}m)</span>
                                                    </div>
                                                    {session.location && (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-primary shrink-0" />
                                                            <span className="truncate">{session.location}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {session.type !== 'break' && (
                                                    <div className="mt-2 pt-2">
                                                        <button
                                                            onClick={() => toggleAgenda(session.id)}
                                                            disabled={toggling === session.id}
                                                            className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold transition-all ${userAgenda.includes(session.id)
                                                                ? 'bg-primary border border-primary text-black shadow-[0_0_15px_rgba(0,200,83,0.3)] hover:bg-red-500 hover:border-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] group/btn'
                                                                : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:border-primary hover:text-primary hover:bg-primary/5'
                                                                }`}
                                                        >
                                                            {toggling === session.id ? (
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                            ) : userAgenda.includes(session.id) ? (
                                                                <>
                                                                    <Check className="w-4 h-4 group-hover/btn:hidden" />
                                                                    <X className="w-4 h-4 hidden group-hover/btn:block" />
                                                                    <span className="group-hover/btn:hidden">Added to Agenda</span>
                                                                    <span className="hidden group-hover/btn:inline">Remove</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus className="w-4 h-4" />
                                                                    <span>Add to Agenda</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}
        </div>
    );
}
