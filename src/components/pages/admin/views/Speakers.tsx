import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Save, Mic, Image as ImageIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

export interface Speaker {
    id?: string;
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

export function AdminSpeakers() {
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Speaker>({
        name: '', role: '', company: '', bio: '', image: '',
        socialX: '', socialLinkedin: '', socialGithub: '', order: 1,
    });

    useEffect(() => { loadSpeakers(); }, []);

    const loadSpeakers = async () => {
        setLoading(true);
        try {
            if (!db) return;
            const q = query(collection(db, 'speakers'), orderBy('order', 'asc'));
            const snap = await getDocs(q);
            const data: Speaker[] = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Speaker));
            setSpeakers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', role: '', company: '', bio: '', image: '',
            socialX: '', socialLinkedin: '', socialGithub: '', order: speakers.length + 1
        });
        setEditingSpeaker(null);
        setShowForm(false);
    };

    const handleEdit = (speaker: Speaker) => {
        setEditingSpeaker(speaker);
        setFormData({ ...speaker });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this speaker?')) return;
        try {
            await deleteDoc(doc(db, 'speakers', id));
            await loadSpeakers();
        } catch (err) {
            console.error('Failed to delete speaker', err);
            alert('Failed to delete speaker');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingSpeaker?.id) {
                await updateDoc(doc(db, 'speakers', editingSpeaker.id), { ...formData });
            } else {
                await addDoc(collection(db, 'speakers'), { ...formData });
            }
            await loadSpeakers();
            resetForm();
        } catch (err) {
            console.error('Failed to save speaker', err);
            alert('Failed to save speaker');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#00C853]" />
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-0 min-h-[500px]">
            <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-t-xl">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#00C853]" />
                    Speakers
                </h2>
                {!showForm && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-[#00C853] hover:bg-[#007B33] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Speaker
                    </button>
                )}
            </div>

            <div className="p-4 md:p-6">
                {showForm ? (
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingSpeaker ? 'Edit Speaker' : 'New Speaker'}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title</label>
                                    <input required type="text" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" placeholder="e.g. Software Engineer" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" placeholder="e.g. Google" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Index</label>
                                    <input required type="number" value={formData.order} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">X (Twitter) URL</label>
                                    <input type="url" value={formData.socialX} onChange={e => setFormData({ ...formData, socialX: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" placeholder="https://x.com/username" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                    <input type="url" value={formData.socialLinkedin} onChange={e => setFormData({ ...formData, socialLinkedin: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" placeholder="https://linkedin.com/in/username" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                                    <input type="url" value={formData.socialGithub} onChange={e => setFormData({ ...formData, socialGithub: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" placeholder="https://github.com/username" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                <div className="flex gap-4 items-center">
                                    <input required type="url" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none" placeholder="https://..." />
                                    {formData.image ? (
                                        <img src={formData.image} alt="Preview" className="w-10 h-10 object-cover rounded-full border border-gray-200" />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-400" /></div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <textarea required rows={4} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] outline-none resize-y" placeholder="Brief biography..." />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors mr-3">Cancel</button>
                                <button type="submit" disabled={saving} className="bg-[#00C853] hover:bg-[#007B33] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Speaker
                                </button>
                            </div>
                        </form>
                    </div>
                ) : speakers.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        No speakers added yet. Click "Add Speaker" to build the lineup.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {speakers.map((speaker) => (
                            <div key={speaker.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group relative">
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={() => handleEdit(speaker)} className="p-1.5 bg-white shadow-sm rounded-md text-blue-600 hover:bg-blue-50">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => speaker.id && handleDelete(speaker.id)} className="p-1.5 bg-white shadow-sm rounded-md text-red-600 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="aspect-square w-full relative bg-gray-100">
                                    <img src={speaker.image} alt={speaker.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400?text=No+Image')} />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-3">
                                        <h3 className="text-white font-bold text-lg leading-tight">{speaker.name}</h3>
                                        <p className="text-gray-200 text-sm">{speaker.role} {speaker.company ? `@ ${speaker.company}` : ''}</p>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">{speaker.bio}</p>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                        <div className="flex gap-3">
                                            {speaker.socialX && <a href={speaker.socialX} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#1DA1F2] transition-colors"><span className="text-xs font-bold font-mono">X</span></a>}
                                            {speaker.socialLinkedin && <a href={speaker.socialLinkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#0A66C2] transition-colors"><span className="text-xs font-bold font-mono">IN</span></a>}
                                            {speaker.socialGithub && <a href={speaker.socialGithub} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#333] transition-colors"><span className="text-xs font-bold font-mono">GH</span></a>}
                                        </div>
                                        <span className="text-xs font-mono text-gray-400">Ord: {speaker.order}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
