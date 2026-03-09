import React, { useState, useEffect } from 'react';
import { Users, Ticket, CheckSquare, IndianRupee, Loader2, Clock } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DashboardStats {
    totalRegistered: number;
    ticketsSold: number;
    checkedIn: number;
    revenue: number;
}

interface RecentUser {
    id: string;
    displayName: string;
    email: string;
    role: string;
    registeredAt: any;
}

export function AdminOverview() {
    const [stats, setStats] = useState<DashboardStats>({ totalRegistered: 0, ticketsSold: 0, checkedIn: 0, revenue: 0 });
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        if (!db) { setLoading(false); return; }
        try {
            // Fetch users
            const usersSnap = await getDocs(collection(db, 'users'));
            const users: RecentUser[] = [];
            let checkedInCount = 0;
            usersSnap.forEach(doc => {
                const data = doc.data();
                users.push({
                    id: doc.id,
                    displayName: data.displayName || 'Unnamed',
                    email: data.email || '',
                    role: data.role || 'attendee',
                    registeredAt: data.registeredAt || data.createdAt,
                });
                if (data.checkedIn) checkedInCount++;
            });

            // Sort by registration date (most recent first) and take 5
            const sorted = users.sort((a, b) => {
                const aTime = a.registeredAt?.seconds || 0;
                const bTime = b.registeredAt?.seconds || 0;
                return bTime - aTime;
            });

            // Fetch tickets from global tickets collection
            let ticketCount = 0;
            let totalRevenue = 0;
            try {
                const ticketsSnap = await getDocs(collection(db, 'tickets'));
                ticketsSnap.forEach(doc => {
                    const data = doc.data();
                    ticketCount++;
                    if (data.amount && data.amount > 0) {
                        totalRevenue += data.amount;
                    }
                });
            } catch (err) {
                console.error("Tickets fetch error:", err);
            }

            setStats({
                totalRegistered: users.length,
                ticketsSold: ticketCount,
                checkedIn: checkedInCount,
                revenue: totalRevenue,
            });
            setRecentUsers(sorted.slice(0, 6));
        } catch (err) {
            console.error("Failed to fetch dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#00C853]" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Registered', value: stats.totalRegistered.toLocaleString(), icon: Users, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        { label: 'Tickets Issued', value: stats.ticketsSold.toLocaleString(), icon: Ticket, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        { label: 'Checked In', value: stats.checkedIn.toLocaleString(), icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        { label: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    ];

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            admin: 'bg-red-50 text-red-700 border-red-200',
            manager: 'bg-amber-50 text-amber-700 border-amber-200',
            volunteer: 'bg-blue-50 text-blue-700 border-blue-200',
            attendee: 'bg-gray-50 text-gray-600 border-gray-200',
        };
        return styles[role] || styles.attendee;
    };

    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp?.seconds) return 'Recently';
        const diff = Date.now() - timestamp.seconds * 1000;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                <p className="text-gray-500 text-sm">Real-time event statistics from your database.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <div key={i} className={`p-5 flex items-center gap-4 bg-white border ${stat.border} rounded-xl shadow-sm hover:shadow-md transition-shadow`}>
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Registrations */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#00C853]" />
                            Recent Registrations
                        </h3>
                        <span className="text-xs text-gray-400">{stats.totalRegistered} total</span>
                    </div>
                    {recentUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No users registered yet.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {recentUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-[#00C853] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                        {user.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{user.displayName}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
                                        {user.role}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {formatTimeAgo(user.registeredAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Stats Summary */}
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                        <h3 className="font-semibold text-gray-800 mb-4">Registration Breakdown</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">Total Users</span>
                                <span className="text-sm font-bold text-gray-800">{stats.totalRegistered}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">Tickets Issued</span>
                                <span className="text-sm font-bold text-gray-800">{stats.ticketsSold}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">Checked In</span>
                                <span className="text-sm font-bold text-green-600">{stats.checkedIn}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-500">Check-in Rate</span>
                                <span className="text-sm font-bold text-[#00C853]">
                                    {stats.totalRegistered > 0 ? `${Math.round((stats.checkedIn / stats.totalRegistered) * 100)}%` : '0%'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#00C853] to-[#007B33] rounded-xl shadow-sm p-5 text-white">
                        <h3 className="font-semibold mb-2">Event Status</h3>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-sm text-green-100">Active & Accepting Registrations</span>
                        </div>
                        <a href="/" className="inline-block mt-2 text-sm text-green-100 hover:text-white underline underline-offset-2 transition-colors">
                            View Public Site →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
