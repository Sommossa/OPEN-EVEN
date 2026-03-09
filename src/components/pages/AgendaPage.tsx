import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, Clock, MapPin, User, Calendar, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getAllSessions } from "@/lib/firestore/sessions";
import type { SessionsSession } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";

export default function AgendaPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [sessions, setSessions] = useState<SessionsSession[]>([]);
    const [userAgenda, setUserAgenda] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAgendaData() {
            try {
                // Fetch User Agenda IDs
                let agendaIds: string[] = [];
                const localAgenda = localStorage.getItem('OPEN EVEN_agenda');
                if (localAgenda) {
                    agendaIds = JSON.parse(localAgenda);
                }
                setUserAgenda(agendaIds);

                // Fetch All Sessions and filter
                const allSessions = await getAllSessions();
                setSessions(allSessions.filter(s => agendaIds.includes(s.id)));
            } catch (err) {
                console.error("Failed to fetch agenda", err);
            } finally {
                setLoading(false);
            }
        }

        fetchAgendaData();
    }, []);

    const removeFromAgenda = async (sessionId: string) => {
        setRemoving(sessionId);
        try {
            const newAgenda = userAgenda.filter(id => id !== sessionId);
            localStorage.setItem('OPEN EVEN_agenda', JSON.stringify(newAgenda));
            setUserAgenda(newAgenda);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (err) {
            console.error("Failed to remove from agenda", err);
            alert("Failed to remove session. Please try again.");
        } finally {
            setRemoving(null);
        }
    };

    const typeColors: Record<string, string> = {
        keynote: 'bg-purple-100 text-purple-700 border-purple-200',
        talk: 'bg-blue-100 text-blue-700 border-blue-200',
        workshop: 'bg-green-100 text-green-700 border-green-200',
        break: 'bg-amber-100 text-amber-700 border-amber-200',
        general: 'bg-gray-100 text-gray-600 border-gray-200',
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 px-4 max-w-4xl mx-auto pb-24">
            <div className="text-center mb-16">
                <span className="text-primary font-bold tracking-wider uppercase text-sm mb-4 block">Your Plan</span>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">My Agenda</h1>
                <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
                    Your personalized schedule for OPEN EVEN {new Date().getFullYear()}.
                </p>
            </div>

            {sessions.length === 0 ? (
                <GlassCard className="text-center p-12 max-w-xl mx-auto">
                    <div className="w-20 h-20 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-[var(--text-secondary)]" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Your agenda is empty</h3>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Browse the event schedule and add sessions you don't want to miss.
                    </p>
                    <a
                        href="/schedule"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-black font-bold hover:bg-primary-light transition-all shadow-[0_0_20px_rgba(0,200,83,0.2)]"
                    >
                        Explore Sessions <ArrowRight className="w-5 h-5" />
                    </a>
                </GlassCard>
            ) : (
                <div className="space-y-4 max-w-2xl mx-auto">
                    <AnimatePresence mode="popLayout">
                        {sessions.map((session, i) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group w-full"
                            >
                                {/* Content Card */}
                                <div className="w-full p-0 rounded-2xl glass-panel border border-[var(--glass-border)] hover:border-primary/50 transition-colors shadow-lg overflow-hidden flex flex-col md:flex-row">
                                    {session.bannerImage && (
                                        <div className="w-full md:w-48 h-40 md:h-auto bg-[var(--glass-bg)] overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-[var(--glass-border)]">
                                            <img src={session.bannerImage} alt={session.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        </div>
                                    )}
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex justify-between items-start gap-4 mb-2">
                                            <div>
                                                <h3 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{session.title}</h3>
                                                <div className="text-sm font-bold text-primary mt-1">Day {session.day}</div>
                                            </div>
                                            <span className={`shrink-0 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${typeColors[session.type] || typeColors.general}`}>
                                                {session.type}
                                            </span>
                                        </div>

                                        {session.type !== 'break' && session.type !== 'general' && session.speaker && (
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 text-[var(--text-secondary)] bg-[var(--glass-border)] inline-flex px-3 py-1.5 rounded-lg border border-[var(--glass-border)]">
                                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <User className="w-3 h-3 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium">{session.speaker}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-medium text-[var(--text-secondary)] pt-4 border-t border-[var(--glass-border)] mt-auto">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center gap-1.5 bg-[var(--glass-bg)] px-2 py-1 rounded-md">
                                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                                    {session.time} ({session.duration}m)
                                                </div>
                                                {session.location && (
                                                    <div className="flex items-center gap-1.5 bg-[var(--glass-bg)] px-2 py-1 rounded-md">
                                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                                        {session.location}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => removeFromAgenda(session.id)}
                                                disabled={removing === session.id}
                                                className="shrink-0 flex items-center justify-center gap-2 p-2 px-3 rounded-lg font-bold border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                                                title="Remove from agenda"
                                            >
                                                {removing === session.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Remove</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
