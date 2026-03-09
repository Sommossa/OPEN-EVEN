import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { Loader2, Trash2, Plus, Copy, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAllTicketCategories } from "@/lib/firestore/tickets";
import type { TicketCategory } from "@/lib/firestore/tickets";

const codeSchema = z.object({
    code: z.string().min(3, "Code must be at least 3 characters").toUpperCase(),
    type: z.string().min(1, "Pass type is required"),
    maxUses: z.number().min(1, "Must allow at least 1 use"),
});

type CodeFormValues = z.infer<typeof codeSchema>;

interface TicketCode {
    id: string; // The code itself
    type: string; // The TicketCategory ID
    maxUses: number;
    usedCount: number;
    active: boolean;
    createdAt?: any;
    createdBy?: string;
}

export function AdminAccessCodes() {
    const { user } = useAuth();
    const [codes, setCodes] = useState<TicketCode[]>([]);
    const [categories, setCategories] = useState<TicketCategory[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CodeFormValues>({
        resolver: zodResolver(codeSchema),
        defaultValues: { maxUses: 1 }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsFetching(true);
        try {
            // Load ticket categories for the dropdown and display
            const cats = await getAllTicketCategories();
            setCategories(cats);

            // Load generated codes
            if (db) {
                const snap = await getDocs(collection(db, "ticketCodes"));
                const loaded: TicketCode[] = [];
                snap.forEach(docSnap => {
                    loaded.push({ id: docSnap.id, ...docSnap.data() } as TicketCode);
                });

                // Sort by creation date (newest first) if possible
                loaded.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return b.createdAt.toMillis() - a.createdAt.toMillis();
                    }
                    return 0;
                });

                setCodes(loaded);
            }
        } catch (err) {
            console.error("Error loading access codes data:", err);
        } finally {
            setIsFetching(false);
        }
    };

    const onSubmit = async (data: CodeFormValues) => {
        if (!db) return;
        setIsSubmitting(true);
        try {
            const codeRef = doc(db, "ticketCodes", data.code);
            await setDoc(codeRef, {
                type: data.type, // Maps to the specific TicketCategory ID
                maxUses: data.maxUses,
                usedCount: 0,
                active: true,
                createdBy: user?.uid,
                createdAt: new Date()
            });
            reset();
            await loadData();
        } catch (err) {
            console.error("Error generating code:", err);
            alert("Failed to generate access code.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (code: string) => {
        if (!db || !confirm(`Delete access code ${code}?`)) return;
        try {
            await deleteDoc(doc(db, "ticketCodes", code));
            await loadData();
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete code.");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getCategoryName = (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat ? cat.name : "Unknown Pass";
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#00C853]" />
            </div>
        );
    }

    // Filter categories that should probably have access codes (usually ones that are hidden)
    // But allow all just in case.
    const assignableCategories = categories;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Access Codes Generator</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Generate limited-use access codes that unlock specific Ticket Categories.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1">
                    <div className="sticky top-24 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-800 border-b pb-4">
                            <Plus className="w-5 h-5 text-[#00C853]" />
                            Generate New Code
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Access Code String</label>
                                <input
                                    {...register("code")}
                                    type="text"
                                    placeholder="e.g. VIP2026 or SPEAKERX"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 uppercase focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                />
                                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Unlocks Pass Type</label>
                                <select
                                    {...register("type")}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                >
                                    <option value="">-- Select Pass Type --</option>
                                    {assignableCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name} {cat.isVisible ? "(Public)" : "(Hidden)"}
                                        </option>
                                    ))}
                                </select>
                                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Max Redemptions Allowed</label>
                                <input
                                    {...register("maxUses", { valueAsNumber: true })}
                                    type="number"
                                    min="1"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                />
                                {errors.maxUses && <p className="text-red-500 text-xs mt-1">{errors.maxUses.message}</p>}
                                <p className="text-xs text-gray-400 mt-1">How many users can claim a ticket using this code.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 mt-4 rounded-lg bg-[#00C853] text-white font-bold hover:bg-[#007B33] transition-colors flex justify-center items-center gap-2 shadow-sm"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Access Code"}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-2 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-0 overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b border-gray-200 bg-white">
                            <h2 className="text-lg font-bold text-gray-800">Active Codes</h2>
                        </div>

                        {codes.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                No ticket access codes generated yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-[#f9fafb] text-gray-500 text-xs uppercase tracking-wider font-semibold">
                                            <th className="py-4 px-6">Access Code</th>
                                            <th className="py-4 px-6">Unlocks Pass</th>
                                            <th className="py-4 px-6">Redemptions</th>
                                            <th className="py-4 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codes.map((code) => {
                                            const isExhausted = code.usedCount >= code.maxUses;
                                            return (
                                                <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-mono font-bold px-2 py-1 rounded bg-gray-100 border border-gray-200 text-gray-800 ${isExhausted ? 'opacity-50 line-through' : ''}`}>
                                                                {code.id}
                                                            </span>
                                                            <button
                                                                onClick={() => copyToClipboard(code.id)}
                                                                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                                                                title="Copy code"
                                                            >
                                                                {copiedCode === code.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="font-medium text-gray-800">
                                                            {getCategoryName(code.type)}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm ${isExhausted ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'}`}>
                                                                {code.usedCount} / {code.maxUses}
                                                            </span>
                                                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${isExhausted ? 'bg-red-500' : 'bg-[#00C853]'}`}
                                                                    style={{ width: `${Math.min(100, (code.usedCount / code.maxUses) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button
                                                            onClick={() => handleDelete(code.id)}
                                                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            title="Delete Code"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
