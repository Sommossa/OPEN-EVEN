import React, { useState, useEffect } from 'react';
import { Plus, Clock, MapPin, Edit2, Trash2, X, Loader2, Save } from 'lucide-react';
import { getAllSessions, createSession, updateSession, deleteSession } from '@/lib/firestore/schedule';
import type { ScheduleSession } from '@/lib/firestore/schedule';

export function AdminSchedule() {
    const [sessions, setSessions] = useState<ScheduleSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDay, setActiveDay] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editingSession, setEditingSession] = useState<ScheduleSession | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '', speaker: '', time: '09:00', location: '', day: 1,
        type: 'talk' as ScheduleSession['type'], duration: 45, order: 1,
        description: '', tags: '', bannerImage: ''
    });

    useEffect(() => { loadSessions(); }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const data = await getAllSessions();
            setSessions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', speaker: '', time: '09:00', location: '', day: activeDay, type: 'talk', duration: 45, order: sessions.length + 1, description: '', tags: '', bannerImage: '' });
        setEditingSession(null);
        setShowForm(false);
    };

    const handleEdit = (session: ScheduleSession) => {
        setEditingSession(session);
        setFormData({
            title: session.title, speaker: session.speaker, time: session.time,
            location: session.location, day: session.day, type: session.type,
            duration: session.duration, order: session.order,
            description: session.description || '',
            tags: session.tags ? session.tags.join(', ') : '',
            bannerImage: session.bannerImage || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this session?')) return;
        try {
            await deleteSession(id);
            await loadSessions();
        } catch (err) {
            console.error(err);
            alert('Failed to delete');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return alert('Title is required');
        setSaving(true);
        const { tags, ...rest } = formData;
        const submitData = {
            ...rest,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean)
        };
        try {
            if (editingSession) {
                await updateSession(editingSession.id, submitData);
            } else {
                await createSession(submitData);
            }
            await loadSessions();
            resetForm();
        } catch (err) {
            console.error(err);
            alert('Failed to save session');
        } finally {
            setSaving(false);
        }
    };

    const daySessions = sessions.filter(s => s.day === activeDay);

    // Get unique days from sessions, or default to [1, 2]
    const days = Array.from(new Set(sessions.map(s => s.day))).sort();
    if (days.length === 0) days.push(1, 2);
    if (!days.includes(activeDay) && days.length > 0) setActiveDay(days[0]);

    const typeColors: Record<string, string> = {
        keynote: 'bg-purple-100 text-purple-700',
        talk: 'bg-blue-100 text-blue-700',
        workshop: 'bg-green-100 text-green-700',
        break: 'bg-amber-100 text-amber-700',
        general: 'bg-gray-100 text-gray-600',
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-[#00C853]" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Event Schedule</h2>
                    <p className="text-gray-500 text-sm">Manage sessions, speakers, and timing. ({sessions.length} sessions total)</p>
                </div>
                <button
                    onClick={() => { resetForm(); setFormData(prev => ({ ...prev, day: activeDay })); setShowForm(true); }}
                    className="flex items-center gap-2 bg-[#00C853] text-white px-4 py-2 rounded-lg hover:bg-[#007B33] transition-colors font-medium text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Session
                </button>
            </div>

            {/* Session Form Modal */}
            {showForm && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">
                            {editingSession ? 'Edit Session' : 'Add New Session'}
                        </h3>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
                            <input
                                value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                placeholder="e.g. Keynote: Future of Open Source"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Speaker</label>
                            <input
                                value={formData.speaker} onChange={e => setFormData(p => ({ ...p, speaker: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                placeholder="Speaker name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                placeholder="e.g. Main Hall, Room A"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input
                                value={formData.time} onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                placeholder="e.g. 09:00 AM"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value as any }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853]"
                            >
                                <option value="keynote">Keynote</option>
                                <option value="talk">Talk</option>
                                <option value="workshop">Workshop</option>
                                <option value="break">Break</option>
                                <option value="general">General</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                            <input
                                type="number" min="1" value={formData.day}
                                onChange={e => setFormData(p => ({ ...p, day: parseInt(e.target.value) || 1 }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                            <input
                                type="number" min="5" value={formData.duration}
                                onChange={e => setFormData(p => ({ ...p, duration: parseInt(e.target.value) || 45 }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                            <input
                                type="number" min="1" value={formData.order}
                                onChange={e => setFormData(p => ({ ...p, order: parseInt(e.target.value) || 1 }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853]"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL</label>
                            <input
                                type="url" value={formData.bannerImage}
                                onChange={e => setFormData(p => ({ ...p, bannerImage: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853]"
                                placeholder="https://"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                            <input
                                type="text" value={formData.tags}
                                onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853]"
                                placeholder="AI, Frontend, Open Source"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] resize-y"
                                rows={3}
                                placeholder="Details about the session..."
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#00C853] text-white px-6 py-2 rounded-lg hover:bg-[#007B33] font-medium text-sm disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editingSession ? 'Update Session' : 'Create Session'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Day Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50 px-4">
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => setActiveDay(day)}
                            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeDay === day
                                ? 'border-[#00C853] text-[#00C853]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            Day {day}
                        </button>
                    ))}
                </div>

                {/* Session List */}
                <div className="p-0">
                    {daySessions.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <p className="font-medium">No sessions for Day {activeDay}</p>
                            <p className="text-sm mt-1">Click "Add Session" to create one.</p>
                        </div>
                    ) : (
                        daySessions.map((session, i) => (
                            <div key={session.id} className={`flex items-start gap-4 p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors group ${i === daySessions.length - 1 ? 'border-b-0' : ''}`}>
                                <div className="w-24 shrink-0 text-right">
                                    <p className="text-sm font-bold text-gray-800">{session.time}</p>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${typeColors[session.type] || typeColors.general}`}>
                                        {session.type}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-bold text-gray-900">{session.title}</h4>
                                    {session.speaker && (
                                        <p className="text-sm text-gray-600 mt-0.5">by <span className="font-medium text-gray-800">{session.speaker}</span></p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {session.duration} mins
                                        </div>
                                        {session.location && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {session.location}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(session)} className="p-2 text-gray-400 hover:text-[#00C853] hover:bg-green-50 rounded" title="Edit">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(session.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
