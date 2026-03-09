import React, { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { getEventConfig, saveEventConfig } from '@/lib/firestore/eventConfig';
import type { EventConfig } from '@/lib/firestore/eventConfig';

export function AdminSettings() {
    const [config, setConfig] = useState<EventConfig>({
        eventName: 'OPEN EVEN 2026',
        startDate: '',
        endDate: '',
        supportEmail: 'support@OPEN EVEN.org',
        registrationOpen: true,
        location: 'Ahmedabad, Gujarat',
        mode: 'In-person',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => { loadConfig(); }, []);

    const loadConfig = async () => {
        try {
            const data = await getEventConfig();
            if (data) setConfig(data);
        } catch (err) {
            console.error('Failed to load config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await saveEventConfig(config);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-[#00C853]" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Event Settings</h2>
                    <p className="text-gray-500 text-sm">Configure your event details. Changes are saved to the database.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-[#00C853] text-white px-5 py-2 rounded-lg hover:bg-[#007B33] transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            {saved && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Settings saved successfully to database.
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">General Information</h3>

                <div className="space-y-5 max-w-2xl">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                        <input
                            type="text"
                            value={config.eventName}
                            onChange={e => setConfig(p => ({ ...p, eventName: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={config.startDate}
                                onChange={e => setConfig(p => ({ ...p, startDate: e.target.value }))}
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={config.endDate}
                                onChange={e => setConfig(p => ({ ...p, endDate: e.target.value }))}
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] shadow-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                            type="text"
                            value={config.location}
                            onChange={e => setConfig(p => ({ ...p, location: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] shadow-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Mode</label>
                        <select
                            value={config.mode}
                            onChange={e => setConfig(p => ({ ...p, mode: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] shadow-sm"
                        >
                            <option value="In-person">In-person</option>
                            <option value="Online">Online</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                        <input
                            type="email"
                            value={config.supportEmail}
                            onChange={e => setConfig(p => ({ ...p, supportEmail: e.target.value }))}
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] shadow-sm"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div
                                onClick={() => setConfig(p => ({ ...p, registrationOpen: !p.registrationOpen }))}
                                className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${config.registrationOpen ? 'bg-[#00C853]' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.registrationOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                            <div className="text-sm">
                                <p className="font-bold text-gray-800">Public Registration {config.registrationOpen ? 'Open' : 'Closed'}</p>
                                <p className="text-gray-500">Allow users to register and purchase tickets</p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
