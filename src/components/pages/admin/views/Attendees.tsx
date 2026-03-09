import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Download, Filter, Loader2, User as UserIcon, X, Mail, Phone, MapPin, Briefcase, Globe, Utensils, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface Attendee {
    id: string;
    displayName: string;
    email: string;
    role: string;
    createdAt: any;
    ticketStatus?: string;
    ticketCategory?: string;
    amount?: number;
    checkedIn?: boolean;
    // Registration details
    phone?: string;
    gender?: string;
    age?: string;
    location?: string;
    linkedin?: string;
    occupation?: string;
    designation?: string;
    organisation?: string;
    osExperience?: string;
    expectations?: string;
    foodPreference?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
    medicalCondition?: string;
    source?: string;
}

export function AdminAttendees() {
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const { profile } = useAuth();

    const [updatingRole, setUpdatingRole] = useState<string | null>(null);
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchAttendees = async () => {
        setLoading(true);
        try {
            if (!db) return;

            // Fetch users
            const usersSnap = await getDocs(collection(db, 'users'));
            const userMap = new Map<string, Attendee>();
            usersSnap.forEach(doc => {
                const data = doc.data();
                userMap.set(doc.id, {
                    id: doc.id,
                    displayName: data.displayName || 'Unnamed User',
                    email: data.email || 'No email',
                    role: data.role || 'attendee',
                    createdAt: data.registeredAt || data.createdAt,
                    checkedIn: data.checkedIn || false,
                    ticketStatus: 'No ticket',
                    ticketCategory: '-',
                    amount: 0,
                });
            });

            // Fetch global tickets to attach to users
            try {
                const ticketsSnap = await getDocs(collection(db, 'tickets'));
                ticketsSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.userId && userMap.has(data.userId)) {
                        const user = userMap.get(data.userId)!;
                        user.ticketStatus = data.active ? 'Active' : 'Inactive';
                        user.ticketStatus = data.status || user.ticketStatus;
                        user.ticketCategory = data.categoryName || 'General';
                        user.amount = data.amount || 0;

                        // Merge registration details if they exist
                        Object.assign(user, {
                            phone: data.phone,
                            gender: data.gender,
                            age: data.age,
                            location: data.location,
                            linkedin: data.linkedin,
                            occupation: data.occupation,
                            designation: data.designation,
                            organisation: data.organisation,
                            osExperience: data.osExperience,
                            expectations: data.expectations,
                            foodPreference: data.foodPreference,
                            emergencyContactName: data.emergencyContactName,
                            emergencyContactNumber: data.emergencyContactNumber,
                            medicalCondition: data.medicalCondition,
                            source: data.source
                        });
                    }
                });
            } catch {
                // tickets collection might not exist yet
            }

            setAttendees(Array.from(userMap.values()));
        } catch (err) {
            console.error("Failed to fetch attendees:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendees();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!db || (profile?.role !== 'admin' && profile?.role !== 'manager')) {
            alert("Unauthorized: Only Admins and Managers can change roles.");
            return;
        }

        if (profile.role === 'manager' && newRole !== 'attendee' && newRole !== 'volunteer') {
            alert("Unauthorized: Managers can only grant Attendee or Volunteer roles.");
            return;
        }

        setUpdatingRole(userId);
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            setAttendees(prev => prev.map(a => a.id === userId ? { ...a, role: newRole } : a));
        } catch (err) {
            console.error("Failed to update role:", err);
            alert("Error updating role");
        } finally {
            setUpdatingRole(null);
        }
    };

    const handleExportCSV = () => {
        const headers = ['Name', 'Email', 'Role', 'Ticket', 'Amount', 'Checked-In'];
        const rows = filteredAttendees.map(a => [
            a.displayName,
            a.email,
            a.role,
            a.ticketCategory || '-',
            a.amount ? `₹${a.amount.toFixed(2)}` : 'Free',
            a.checkedIn ? 'Yes' : 'No'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "OPEN EVEN2026_attendees.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredAttendees = attendees.filter(a => {
        const matchesSearch = a.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || a.role === roleFilter;
        if (roleFilter === 'checkedIn') return matchesSearch && a.checkedIn;
        if (roleFilter === 'hasTicket') return matchesSearch && a.ticketStatus === 'Active';
        return matchesSearch && matchesRole;
    });

    // Pagination
    const totalPages = Math.ceil(filteredAttendees.length / pageSize);
    const paginatedAttendees = filteredAttendees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset to page 1 when search/filter changes
    useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-0 flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-t-xl">
                <h2 className="text-xl font-bold text-gray-800">Registered Users ({filteredAttendees.length})</h2>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search.."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] text-gray-800 placeholder:text-gray-400"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-white border border-gray-300 rounded pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:border-[#00C853] text-gray-800 appearance-none cursor-pointer"
                        >
                            <option value="all">All</option>
                            <option value="attendee">Attendee</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                            <option value="checkedIn">Checked In</option>
                            <option value="hasTicket">Has Ticket</option>
                        </select>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-[#00C853] text-white hover:bg-[#007B33] px-4 py-1.5 rounded text-sm font-medium transition-colors border border-transparent"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00C853]" />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-gray-200 bg-[#f9fafb] text-xs font-semibold text-gray-500">
                                <th className="py-3 px-6 w-10 text-center"><input type="checkbox" className="rounded border-gray-300 text-[#00C853] focus:ring-[#00C853]" /></th>
                                <th className="py-3 px-6">Name</th>
                                <th className="py-3 px-6">Email</th>
                                <th className="py-3 px-6 text-center">Ticket</th>
                                <th className="py-3 px-6 text-center">Amount</th>
                                <th className="py-3 px-6 text-center">Role</th>
                                <th className="py-3 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {paginatedAttendees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500 border-b border-gray-100">
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedAttendees.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6 text-center">
                                            <input type="checkbox" className="rounded border-gray-300 text-[#00C853] focus:ring-[#00C853] cursor-pointer" />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="font-medium text-gray-800">{user.displayName}</p>
                                                    {user.checkedIn && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Checked In</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.ticketStatus === 'Active'
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                                                }`}>
                                                {user.ticketCategory || user.ticketStatus}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center text-gray-800 font-medium">
                                            {user.amount ? `₹${user.amount.toFixed(2)}` : 'Free'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Role Select ... */}
                                                <button
                                                    onClick={() => setSelectedAttendee(user)}
                                                    className="px-3 py-1 bg-gray-100 hover:bg-[#00C853] hover:text-white rounded text-xs font-semibold transition-colors"
                                                >
                                                    Details
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-white rounded-b-xl">
                <span>
                    Showing {filteredAttendees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredAttendees.length)} of {filteredAttendees.length} entries
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        ← Prev
                    </button>
                    <span className="px-3 py-1 font-medium text-[#00C853]">{currentPage} / {totalPages || 1}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedAttendee && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 rounded-full text-[#00C853]">
                                    <UserIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{selectedAttendee.displayName}</h3>
                                    <p className="text-sm text-gray-500">{selectedAttendee.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAttendee(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Basic Info</h4>
                                    <div className="space-y-3">
                                        <DetailItem icon={Mail} label="Email" value={selectedAttendee.email} />
                                        <DetailItem icon={Phone} label="Phone" value={selectedAttendee.phone || 'N/A'} />
                                        <DetailItem icon={UserIcon} label="Gender/Age" value={`${selectedAttendee.gender || '-'}/${selectedAttendee.age || '-'}`} />
                                        <DetailItem icon={MapPin} label="Location" value={selectedAttendee.location || 'N/A'} />
                                    </div>
                                </div>

                                {/* Professional Info */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Professional</h4>
                                    <div className="space-y-3">
                                        <DetailItem icon={Briefcase} label="Occupation" value={selectedAttendee.occupation || '-'} />
                                        <DetailItem icon={Briefcase} label="Designation" value={selectedAttendee.designation || '-'} />
                                        <DetailItem icon={Briefcase} label="Organisation" value={selectedAttendee.organisation || '-'} />
                                        <DetailItem icon={Globe} label="LinkedIn" value={selectedAttendee.linkedin || '-'} isLink />
                                    </div>
                                </div>

                                {/* Event Specifics */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Event Data</h4>
                                    <div className="space-y-3">
                                        <DetailItem icon={Utensils} label="Food Preference" value={selectedAttendee.foodPreference || '-'} />
                                        <DetailItem icon={AlertTriangle} label="Medical" value={selectedAttendee.medicalCondition || 'None'} />
                                        <DetailItem icon={Phone} label="Emergency" value={`${selectedAttendee.emergencyContactName || ''} (${selectedAttendee.emergencyContactNumber || '-'})`} />
                                        <DetailItem icon={Globe} label="Discovery Source" value={selectedAttendee.source || '-'} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-bold text-gray-800 mb-2">Open Source Experience</h4>
                                    <p className="text-sm text-gray-600 italic leading-relaxed">
                                        "{selectedAttendee.osExperience || 'No experience details provided.'}"
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-bold text-gray-800 mb-2">Expectations</h4>
                                    <p className="text-sm text-gray-600 italic leading-relaxed">
                                        "{selectedAttendee.expectations || 'No expectations provided.'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
                            <span className={`px-4 py-2 rounded-lg text-sm font-bold ${selectedAttendee.ticketStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                Status: {selectedAttendee.ticketStatus?.toUpperCase()}
                            </span>
                            <button
                                onClick={() => setSelectedAttendee(null)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition-colors"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ icon: Icon, label, value, isLink = false }: any) {
    return (
        <div className="flex items-start gap-3 group">
            <Icon className="w-4 h-4 text-gray-300 mt-1 shrink-0 group-hover:text-[#00C853] transition-colors" />
            <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{label}</p>
                {isLink && value !== '-' ? (
                    <a href={value} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                        {value}
                    </a>
                ) : (
                    <p className="text-sm text-gray-700 font-medium truncate">{value}</p>
                )}
            </div>
        </div>
    );
}
