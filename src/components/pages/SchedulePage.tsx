import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Clock, MapPin, Loader2, User, CalendarDays } from 'lucide-react';
import { motion } from 'motion/react';
import { getAllSessions } from '@/lib/firestore/schedule';
import type { ScheduleSession } from '@/lib/firestore/schedule';

export default function SchedulePage() {
    const [sessions, setSessions] = useState<ScheduleSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDay, setActiveDay] = useState(1);

    useEffect(() => {
        async function loadSchedule() {
            try {
                const data = await getAllSessions();
                setSessions(data);
                if (data.length > 0) {
                    const days = [...new Set(data.map(s => s.day))].sort();
                    setActiveDay(days[0]);
                }
            } catch (err) {
                console.error('Failed to load schedule:', err);
            } finally {
                setLoading(false);
            }
        }
        loadSchedule();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const days = [...new Set(sessions.map(s => s.day))].sort();
    const daySessions = sessions.filter(s => s.day === activeDay);

    const typeColors: Record<string, { bg: string; text: string; border: string }> = {
        keynote: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
        talk: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
        workshop: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/20' },
        break: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
        general: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/20' },
    };

    return (
        <div className="min-h-screen pt-24 px-4 max-w-5xl mx-auto pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
            >
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Event Schedule</h1>
                <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
                    Explore talks, workshops, and keynotes across all days of OPEN EVEN.
                </p>
            </motion.div>

            {sessions.length === 0 ? (
                <GlassCard className="max-w-md mx-auto p-12 text-center">
                    <CalendarDays className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">Schedule Coming Soon</h3>
                    <p className="text-[var(--text-secondary)]">The event schedule is being finalized. Check back soon!</p>
                </GlassCard>
            ) : (
                <>
                    {/* Day Tabs */}
                    <div className="flex justify-center gap-3 mb-10">
                        {days.map(day => (
                            <button
                                key={day}
                                onClick={() => setActiveDay(day)}
                                className={`px-6 py-3 rounded-full font-bold text-sm transition-all ${activeDay === day
                                    ? 'bg-primary text-black shadow-[0_0_20px_rgba(0,200,83,0.3)]'
                                    : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-primary/30'
                                    }`}
                            >
                                Day {day}
                            </button>
                        ))}
                    </div>

                    {/* Timeline */}
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-6 md:left-[120px] top-0 bottom-0 w-px bg-[var(--glass-border)]" />

                        <div className="space-y-6">
                            {daySessions.map((session, i) => {
                                const colors = typeColors[session.type] || typeColors.general;
                                return (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05, duration: 0.4 }}
                                        className="flex gap-4 md:gap-6 relative"
                                    >
                                        {/* Time Column */}
                                        <div className="w-20 md:w-[100px] text-right shrink-0 pt-4">
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{session.time}</p>
                                        </div>

                                        {/* Dot */}
                                        <div className="relative shrink-0 pt-5">
                                            <div className={`w-3 h-3 rounded-full border-2 ${colors.border} ${colors.bg} z-10 relative`} />
                                        </div>

                                        {/* Card */}
                                        <GlassCard className="flex-1 hover:scale-[1.01] transition-transform" hoverEffect>
                                            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                                                            {session.type}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{session.title}</h3>
                                                    {session.speaker && (
                                                        <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mb-2">
                                                            <User className="w-3.5 h-3.5" />
                                                            {session.speaker}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {session.duration} mins
                                                        </span>
                                                        {session.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {session.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
