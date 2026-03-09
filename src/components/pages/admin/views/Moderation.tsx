import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShieldCheck, Plus, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { getAllTicketCategories } from '@/lib/firestore/tickets';
import type { TicketCategory } from '@/lib/firestore/tickets';

export function AdminModeration() {
    const [categories, setCategories] = useState<TicketCategory[]>([]);
    const [pendingTickets, setPendingTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Manual issuance form state
    const [issuing, setIssuing] = useState(false);
    const [form, setForm] = useState({
        email: '',
        name: '',
        categoryId: '',
        status: 'active'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            if (!db) return;
            const cats = await getAllTicketCategories();
            setCategories(cats);

            const pendingQ = query(collection(db, 'tickets'), where('status', '==', 'pending_approval'));
            const snap = await getDocs(pendingQ);
            setPendingTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleIssueTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.categoryId || !db) return;

        setIssuing(true);
        try {
            const ticketId = `MAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const category = categories.find(c => c.id === form.categoryId);

            // Search for user UID by email if possible, or use a placeholder
            // For now, simplicity: we just write to /tickets. The scanner will look here.

            const ticketData = {
                ticketId,
                categoryId: category?.id,
                categoryName: category?.name,
                userName: form.name || 'Manual Attendee',
                userEmail: form.email,
                purchasedAt: serverTimestamp(),
                paymentStatus: 'free',
                amount: 0,
                status: form.status,
                active: form.status === 'active',
                isManual: true,
                issuedBy: 'admin'
            };

            await setDoc(doc(db, 'tickets', ticketId), ticketData);
            alert(`Ticket ${ticketId} issued successfully!`);
            setForm({ email: '', name: '', categoryId: '', status: 'active' });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to issue ticket");
        } finally {
            setIssuing(false);
        }
    };

    const handleAction = async (ticketId: string, status: string) => {
        if (!db) return;
        try {
            const ref = doc(db, 'tickets', ticketId);
            await updateDoc(ref, {
                status,
                active: status === 'active',
                updatedAt: serverTimestamp()
            });
            setPendingTickets(prev => prev.filter(t => t.id !== ticketId));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending Approvals */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-bold text-gray-800">Pending Approvals</h2>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#00C853]" /></div>
                    ) : pendingTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No tickets awaiting approval.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {pendingTickets.map(ticket => (
                                <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-800">{ticket.userName}</p>
                                        <p className="text-xs text-gray-500">{ticket.userEmail}</p>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                                            {ticket.categoryName}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAction(ticket.id, 'active')}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Approve"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleAction(ticket.id, 'rejected')}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Reject"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Issuance */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Plus className="w-5 h-5 text-[#00C853]" />
                    <h2 className="text-xl font-bold text-gray-800">Issue Manual Ticket</h2>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <form onSubmit={handleIssueTicket} className="space-y-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-xs mb-4">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>Manual tickets bypass payment and are marked as "free". They will be sent directly to the provided email.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Attendee Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Enter full name"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Attendee Email *</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="email@example.com"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Ticket Category *</label>
                            <select
                                required
                                value={form.categoryId}
                                onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} (Available: {c.availableQuantity === -1 ? '∞' : c.availableQuantity})</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={issuing}
                            className="w-full bg-[#00C853] text-white py-2.5 rounded font-bold hover:bg-[#007B33] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Issue Ticket Now
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
