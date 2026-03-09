import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowRight, Calendar, MapPin, Users, Mic, Loader2, Clock, User, Ticket, CalendarDays, Key } from "lucide-react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getEventConfig } from "@/lib/firestore/eventConfig";

export default function Home() {
  const [stats, setStats] = useState({
    attendees: "0",
    speakers: "0",
    sessions: "0",
    location: "TBA",
  });
  const [eventInfo, setEventInfo] = useState({
    name: "OPEN EVEN",
    dates: "Coming Soon",
    location: "TBA",
  });
  const [featuredSpeakers, setFeaturedSpeakers] = useState<any[]>([]);
  const [featuredSessions, setFeaturedSessions] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch event config
        const config = await getEventConfig();
        if (config) {
          const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          };
          setEventInfo({
            name: config.eventName || 'OPEN EVEN',
            dates: config.startDate && config.endDate
              ? `${formatDate(config.startDate)} - ${formatDate(config.endDate)}, ${new Date(config.endDate).getFullYear()}`
              : 'Coming Soon',
            location: config.location || 'TBA',
          });
        }

        // Fetch real counts
        if (db) {
          const usersSnap = await getDocs(collection(db, 'users'));
          const userCount = usersSnap.size;

          let sessionCount = 0;
          let speakerCount = 0;
          try {
            const scheduleSnap = await getDocs(collection(db, 'schedule'));
            sessionCount = scheduleSnap.size;

            const sessionsQ = query(collection(db, 'schedule'), limit(3));
            const sessSnap = await getDocs(sessionsQ);
            const topSessions: any[] = [];
            sessSnap.forEach(doc => topSessions.push({ id: doc.id, ...doc.data() }));
            setFeaturedSessions(topSessions);
          } catch { }

          try {
            const speakerSnap = await getDocs(collection(db, 'speakers'));
            speakerCount = speakerSnap.size;

            const featuredQ = query(collection(db, 'speakers'), orderBy('order', 'asc'), limit(3));
            const featuredSnap = await getDocs(featuredQ);
            const topSpeakers: any[] = [];
            featuredSnap.forEach(doc => topSpeakers.push({ id: doc.id, ...doc.data() }));
            setFeaturedSpeakers(topSpeakers);
          } catch { }

          setStats({
            attendees: userCount > 0 ? `${userCount}+` : '0',
            speakers: speakerCount > 0 ? `${speakerCount}+` : '0',
            sessions: sessionCount > 0 ? `${sessionCount}+` : '0',
            location: eventInfo.location,
          });
        }
      } catch (err) {
        console.error("Failed to load home data:", err);
      } finally {
        setLoaded(true);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen pt-16 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50 blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6 backdrop-blur-md">
              📅 {eventInfo.dates} • {eventInfo.location}
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight mb-6">
              {eventInfo.name.split(' ').slice(0, -1).join(' ')} <br />
              <span className="text-gradient">{eventInfo.name.split(' ').slice(-1)[0] || '2026'}</span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 font-light">
              Where Community Meets Code. Join developers for the biggest open source celebration.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/tickets"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-black font-bold text-lg hover:bg-primary-light transition-all shadow-[0_0_30px_rgba(0,200,83,0.3)] hover:shadow-[0_0_50px_rgba(0,200,83,0.5)] flex items-center justify-center gap-2"
              >
                Get Your Ticket <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/schedule"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] font-medium text-lg hover:bg-[var(--glass-border)] transition-all backdrop-blur-md"
              >
                View Schedule
              </a>
            </div>
          </motion.div>

          {/* Mobile-Friendly Quick Shortcuts */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 max-w-4xl mx-auto"
          >
            {[
              { label: "Tickets", icon: <Ticket className="w-6 h-6" />, href: "/tickets", bg: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20" },
              { label: "Schedule", icon: <CalendarDays className="w-6 h-6" />, href: "/schedule", bg: "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20" },
              { label: "Speakers", icon: <Mic className="w-6 h-6" />, href: "/speakers", bg: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20" },
              { label: "Venue", icon: <MapPin className="w-6 h-6" />, href: "#", bg: "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" },
            ].map((link, index) => (
              <a key={index} href={link.href} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${link.bg}`}>
                <span className="mb-2 flex items-center justify-center">{link.icon}</span>
                <span className="font-bold text-sm">{link.label}</span>
              </a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Event Details Widgets */}
      <section className="py-12 px-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Date Widget */}
          <GlassCard className="relative overflow-hidden group p-0 border-0 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="p-8 md:p-12 relative z-10 flex flex-col h-full justify-between mix-blend-normal">
              <div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold tracking-wider uppercase mb-6 inline-block">Save The Date</span>
                <h3 className="text-4xl md:text-5xl font-display font-bold mb-4">{eventInfo.dates === 'Coming Soon' ? 'April 4th, 2026' : eventInfo.dates}</h3>
                <p className="text-[var(--text-secondary)] text-lg">Mark your calendars for the biggest open source gathering in India. A full day of talks, networking, and building.</p>
              </div>
              <div className="mt-12 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-xl">09:00 AM - 06:00 PM</p>
                  <p className="text-[var(--text-secondary)] font-mono text-sm">IST (Indian Standard Time)</p>
                </div>
              </div>
            </div>
            {/* Background decorative elements */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700"></div>
          </GlassCard>

          {/* Venue Widget */}
          <GlassCard className="relative overflow-hidden group p-0 border-0 shadow-2xl">
            <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-primary/10 group-hover:to-primary/20 transition-colors duration-700"></div>
            <div className="p-8 md:p-12 relative z-10 flex flex-col h-full justify-between">
              <div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold tracking-wider uppercase mb-6 inline-block">The Venue</span>
                <h3 className="text-4xl md:text-5xl font-display font-bold mb-4">Ahmedabad, India</h3>
                <p className="text-[var(--text-secondary)] text-lg">Join us in the vibrant city of Ahmedabad, known for its rich culture, amazing food, and booming tech community.</p>
              </div>
              <div className="mt-12 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center transform group-hover:-rotate-6 transition-transform">
                    <MapPin className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-xl">{eventInfo.location === 'TBA' ? 'Ahmedabad, India' : eventInfo.location}</p>
                    <p className="text-[var(--text-secondary)] font-mono text-sm">Gujarat, India</p>
                  </div>
                </div>
                <a href="https://maps.google.com/?q=Ahmedabad" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center hover:scale-110 shadow-lg shadow-primary/30 transition-transform">
                  <ArrowRight className="w-5 h-5 -rotate-45" />
                </a>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* Featured Speakers Preview */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Featured Speakers</h2>
          <a href="/speakers" className="text-primary hover:text-primary-light flex items-center gap-2">
            View All <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSpeakers.length > 0 ? (
            featuredSpeakers.map((speaker, i) => (
              <GlassCard key={speaker.id} hoverEffect className="group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--glass-border)] border-2 border-primary/30 overflow-hidden">
                    <img
                      src={speaker.image}
                      alt={speaker.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=' + speaker.name.charAt(0) }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{speaker.name}</h3>
                    <p className="text-primary text-sm line-clamp-1">{speaker.role} {speaker.company ? `@ ${speaker.company}` : ''}</p>
                  </div>
                </div>
                <p className="mt-4 text-[var(--text-secondary)] text-sm line-clamp-3 min-h-[60px]">
                  {speaker.bio}
                </p>
              </GlassCard>
            ))
          ) : (
            [1, 2, 3].map((i) => (
              <GlassCard key={i} hoverEffect className="group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--glass-border)] border-2 border-primary/30 overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/speaker${i}/200`}
                      alt="Speaker"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="w-24 h-5 bg-[var(--glass-border)] rounded animate-pulse mb-2"></div>
                    <div className="w-32 h-4 bg-primary/20 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="w-full h-4 bg-[var(--glass-border)] rounded animate-pulse"></div>
                  <div className="w-4/5 h-4 bg-[var(--glass-border)] rounded animate-pulse"></div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </section>

      {/* Highlighted Sessions */}
      <section className="py-20 px-4 max-w-7xl mx-auto bg-gradient-to-b from-transparent to-primary/5 rounded-3xl mb-20">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Highlighted Sessions</h2>
          <a href="/schedule" className="text-primary hover:text-primary-light flex items-center gap-2">
            View Schedule <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSessions.length > 0 ? (
            featuredSessions.map((session, i) => (
              <GlassCard key={session.id} hoverEffect className="group cursor-pointer flex flex-col h-full border border-[var(--glass-border)] hover:border-primary/50 transition-colors p-6">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{session.title}</h3>
                </div>
                {session.speaker && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] bg-[var(--glass-border)] inline-flex px-3 py-1.5 rounded-lg border border-[var(--glass-border)]">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{session.speaker}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)] mt-auto pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {session.time} ({session.duration}m)
                  </div>
                  {session.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {session.location}
                    </div>
                  )}
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="col-span-full text-center text-[var(--text-secondary)] py-8">
              Sessions schedule coming soon.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
