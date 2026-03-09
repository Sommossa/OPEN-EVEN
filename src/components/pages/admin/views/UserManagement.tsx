import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Loader2, Shield, UserX, UserCheck, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface UserRecord {
    id: string;
    displayName: string;
    email: string;
    role: string;
    registeredAt: any;
    checkedIn?: boolean;
    permissions?: string[];
    profileComplete?: boolean;
}

export function AdminUserManagement() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);
    const { profile } = useAuth();

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            if (!db) return;
            const snap = await getDocs(collection(db, 'users'));
            const list: UserRecord[] = [];
            snap.forEach(doc => {
                const data = doc.data();
                list.push({
                    id: doc.id,
                    displayName: data.displayName || 'Unnamed User',
                    email: data.email || '',
                    role: data.role || 'attendee',
                    registeredAt: data.registeredAt || data.createdAt,
                    checkedIn: data.checkedIn || false,
                    permissions: data.permissions || [],
                    profileComplete: data.profileComplete ?? false,
                });
            });
            setUsers(list);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!db || profile?.role !== 'admin') return;
        setUpdatingRole(userId);
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
        } catch (err) {
            console.error("Failed to update role:", err);
            alert("Error updating role");
        } finally {
            setUpdatingRole(null);
        }
    };

    const handleToggleCheckIn = async (userId: string, currentValue: boolean) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'users', userId), { checkedIn: !currentValue });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, checkedIn: !currentValue } : u));
        } catch (err) {
            console.error("Failed to toggle check-in:", err);
        }
    };

    const filteredUsers = users.filter(u =>
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const roleColors: Record<string, string> = {
        admin: 'bg-red-50 text-red-700 border-red-200',
        manager: 'bg-amber-50 text-amber-700 border-amber-200',
        volunteer: 'bg-blue-50 text-blue-700 border-blue-200',
        attendee: 'bg-gray-50 text-gray-600 border-gray-200',
    };

    const roleCounts = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const formatDate = (ts: any) => {
        if (!ts?.seconds) return 'N/A';
        return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-[#00C853]" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <p className="text-gray-500 text-sm">Manage roles, permissions, and user accounts. ({users.length} users)</p>
            </div>

            {/* Role Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['admin', 'manager', 'volunteer', 'attendee'].map(role => (
                    <div key={role} className={`p-3 rounded-xl border ${roleColors[role]} text-center`}>
                        <p className="text-2xl font-bold">{roleCounts[role] || 0}</p>
                        <p className="text-xs font-medium uppercase tracking-wider capitalize">{role}s</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User List */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text" placeholder="Search users by name, email, or role..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] text-gray-800"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No users found.</div>
                        ) : (
                            filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-green-50 border-l-4 border-l-[#00C853]' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#00C853] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                        {user.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate text-sm">{user.displayName}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {user.checkedIn && <span className="w-2 h-2 rounded-full bg-green-500" title="Checked In" />}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${roleColors[user.role] || roleColors.attendee}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* User Detail Panel */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    {selectedUser ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-[#00C853] text-white flex items-center justify-center font-bold text-2xl mx-auto mb-3">
                                    {selectedUser.displayName.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">{selectedUser.displayName}</h3>
                                <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> {selectedUser.email}</p>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Registered</span>
                                    <span className="font-medium text-gray-800">{formatDate(selectedUser.registeredAt)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Check-in Status</span>
                                    <button
                                        onClick={() => handleToggleCheckIn(selectedUser.id, selectedUser.checkedIn || false)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${selectedUser.checkedIn
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            } transition-colors`}
                                    >
                                        {selectedUser.checkedIn ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                        {selectedUser.checkedIn ? 'Checked In' : 'Not Checked In'}
                                    </button>
                                </div>
                            </div>

                            {/* Role Change */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <Shield className="w-4 h-4 text-[#00C853]" />
                                    Assign Role
                                </label>
                                {updatingRole === selectedUser.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-[#00C853]" />
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {['attendee', 'volunteer', 'manager', 'admin'].map(role => (
                                            <button
                                                key={role}
                                                onClick={() => handleRoleChange(selectedUser.id, role)}
                                                disabled={selectedUser.email === 'admin@OPEN EVEN.org' && role !== 'admin'}
                                                className={`px-3 py-2 text-xs font-bold uppercase rounded-lg border transition-colors ${selectedUser.role === role
                                                    ? 'bg-[#00C853] text-white border-[#00C853]'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#00C853] hover:text-[#00C853]'
                                                    } disabled:opacity-50`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
                            <Shield className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-medium">Select a user</p>
                            <p className="text-sm">Click on a user to view details and manage their role</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
