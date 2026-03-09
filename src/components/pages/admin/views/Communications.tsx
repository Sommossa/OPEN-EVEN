import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Loader2, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';

export function AdminCommunications() {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "communications"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const msgs: any[] = [];
            snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });
        return () => unsub();
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !profile) return;

        setSending(true);
        try {
            await addDoc(collection(db, 'communications'), {
                text: newMessage.trim(),
                senderId: profile.uid,
                senderName: profile.displayName || "Admin",
                senderRole: profile.role,
                timestamp: serverTimestamp()
            });
            setNewMessage("");
        } catch (err) {
            console.error(err);
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this broadcast?')) return;
        try {
            await deleteDoc(doc(db, 'communications', id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
            <div className="shrink-0">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <Megaphone className="w-6 h-6 text-[#00C853]" />
                    Staff Communications
                </h2>
                <p className="text-gray-500 text-sm mt-1">Broadcast announcements to all Managers and Volunteers.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse gap-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No announcements yet.</div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === profile?.uid;
                            const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'manager';

                            return (
                                <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-gray-500">{msg.senderName}</span>
                                        <span className={`text-[10px] px-1.5 rounded uppercase font-bold tracking-wider ${isAdmin ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {msg.senderRole}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                        {profile?.role === 'admin' && (
                                            <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-2 transition-opacity">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className={`px-5 py-3.5 rounded-2xl max-w-[80%] ${isMe ? 'bg-[#00C853] text-white rounded-br-sm shadow-md' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                                        <p className="text-base">{msg.text}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
                    <form onSubmit={handleSend} className="flex gap-3 relative max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type an announcement to broadcast..."
                            className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="bg-black hover:bg-gray-800 text-white px-6 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center shadow-md font-bold gap-2"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <Send className="w-5 h-5" />
                                    <span>Send</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
