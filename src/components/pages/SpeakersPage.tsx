import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, Github, Twitter, Linkedin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

interface Speaker {
    id: string;
    name: string;
    role: string;
    company: string;
    bio: string;
    image: string;
    socialX?: string;
    socialLinkedin?: string;
    socialGithub?: string;
    order: number;
}

export default function SpeakersPage() {
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSpeakers() {
            try {
                if (!db) return;
                const q = query(collection(db, 'speakers'), orderBy('order', 'asc'));
                const snap = await getDocs(q);
                const data: Speaker[] = [];
                snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Speaker));
                setSpeakers(data);
            } catch (err) {
                console.error("Failed to fetch speakers", err);
            } finally {
                setLoading(false);
            }
        }
        fetchSpeakers();
    }, []);

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
                <span className="text-primary font-bold tracking-wider uppercase text-sm mb-4 block">The Lineup</span>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 font-display">Featured Speakers</h1>
                <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
                    Learn from industry leaders, open source maintainers, and community experts shaping the future of technology.
                </p>
            </div>

            {speakers.length === 0 ? (
                <GlassCard className="text-center p-12 max-w-2xl mx-auto">
                    <h3 className="text-2xl font-bold mb-3">Speakers Coming Soon</h3>
                    <p className="text-[var(--text-secondary)]">We are currently curating an amazing lineup of speakers for OPEN EVEN. Check back later!</p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    <AnimatePresence>
                        {speakers.map((speaker, index) => (
                            <motion.div
                                key={speaker.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group h-full flex flex-col"
                            >
                                <div className="flex-1 flex flex-col p-5 border border-[var(--glass-border)] rounded-2xl hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-[var(--glass-bg)]">
                                    <div className="w-full aspect-[4/5] rounded-xl overflow-hidden mb-5 bg-[var(--glass-bg)] border-2 border-[var(--glass-border)] relative group-hover:shadow-[0_10px_30px_rgba(0,200,83,0.1)] transition-all duration-300">
                                        <img src={speaker.image} alt={speaker.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400?text=' + speaker.name.charAt(0) }} />
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>

                                        {/* LinkedIn Link Overlay at Bottom Right */}
                                        {speaker.socialLinkedin && (
                                            <div className="absolute bottom-4 right-4 z-20">
                                                <a href={speaker.socialLinkedin} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-primary hover:text-black transition-all shadow-lg border border-white/20">
                                                    <Linkedin className="w-4 h-4" />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-bold mb-1 text-[var(--text-primary)] transition-colors">{speaker.name}</h3>
                                    <p className="text-sm font-bold text-primary mb-3">{speaker.role} {speaker.company ? `@ ${speaker.company}` : ''}</p>
                                    <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
                                        {speaker.bio}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
