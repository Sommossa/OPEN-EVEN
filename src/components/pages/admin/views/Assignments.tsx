import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Save, Map, Trash2, Edit2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export function AdminAssignments() {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedTo: '',
        status: 'Active'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load users
            const uSnap = await getDocs(collection(db, 'users'));
            const uList: any[] = [];
            uSnap.forEach(d => uList.push({ id: d.id, ...d.data() }));
            // Only show staff
            setUsers(uList.filter(u => ['admin', 'manager', 'volunteer'].includes(u.role)));

            // Load assignments
            const aSnap = await getDocs(query(collection(db, 'assignments'), orderBy('createdAt', 'desc')));
            const aList: any[] = [];
            aSnap.forEach(d => aList.push({ id: d.id, ...d.data() }));
            setAssignments(aList);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.assignedTo) return;

        setSaving(true);
        try {
            const assignee = users.find(u => u.uid === formData.assignedTo);

            await addDoc(collection(db, 'assignments'), {
                ...formData,
                assigneeName: assignee?.name || assignee?.displayName || 'Unknown Staff',
                createdAt: serverTimestamp()
            });
            setShowForm(false);
            setFormData({ title: '', description: '', assignedTo: '', status: 'Active' });
            await loadData();
        } catch (err) {
            console.error(err);
            alert("Failed to create assignment");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this assignment?')) return;
        try {
            await deleteDoc(doc(db, 'assignments', id));
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#00C853]" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Volunteer Assignments</h2>
                    <p className="text-gray-500 text-sm">Assign tasks and stations to volunteers.</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#00C853] text-white px-4 py-2 rounded-lg hover:bg-[#007B33] flex items-center gap-2 font-medium"
                >
                    <Plus className="w-4 h-4" /> New Assignment
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">Create Assignment</h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Category / Station</label>
                            <select
                                value={formData.title}
                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                                required
                            >
                                <option value="">Select a task...</option>
                                <option value="Registration Desk">Registration Desk</option>
                                <option value="Tech Logistics">Tech Logistics</option>
                                <option value="Ushering & Seating">Ushering & Seating</option>
                                <option value="Speaker Handling">Speaker Handling</option>
                                <option value="Custom Task">Custom Task</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                            <select
                                value={formData.assignedTo}
                                onChange={e => setFormData(p => ({ ...p, assignedTo: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                                required
                            >
                                <option value="">Select staff member...</option>
                                {users.map(u => (
                                    <option key={u.uid} value={u.uid}>{u.name || u.displayName} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Instructions</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                                rows={3}
                                required
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={saving} className="bg-[#00C853] text-white px-6 py-2 rounded-lg hover:bg-[#007B33] flex items-center gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Assign
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map(asg => (
                    <div key={asg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                    <Map className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{asg.title}</h3>
                                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider">{asg.status}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(asg.id)} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 flex-1">{asg.description}</p>
                        <div className="pt-4 border-t border-gray-100 mt-auto flex justify-between items-center text-sm">
                            <span className="text-gray-500">Assigned to:</span>
                            <span className="font-bold text-gray-900">{asg.assigneeName}</span>
                        </div>
                    </div>
                ))}
            </div>

            {assignments.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                    No active assignments.
                </div>
            )}
        </div>
    );
}
