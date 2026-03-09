import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Download, Loader2, IndianRupee, CreditCard, Ticket as TicketIcon, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
    id: string;
    userName: string;
    userEmail: string;
    categoryName: string;
    amount: number;
    paymentStatus: string;
    purchasedAt: any;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
}

export function AdminSales() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSales = async () => {
        setLoading(true);
        try {
            if (!db) return;
            const ticketsRef = collection(db, 'tickets');
            // Fetch all tickets, we'll filter for paid ones in JS or keep all for "Sales" log
            const q = query(ticketsRef, orderBy('purchasedAt', 'desc'));
            const snap = await getDocs(q);

            const docs = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];

            setTransactions(docs);
        } catch (err) {
            console.error("Failed to fetch sales:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const filteredSales = transactions.filter(t =>
        t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalRevenue: transactions.reduce((acc, t) => acc + (t.amount || 0), 0),
        paidTickets: transactions.filter(t => t.paymentStatus === 'paid').length,
        freeTickets: transactions.filter(t => t.paymentStatus === 'free').length,
    };

    const handleExportCSV = () => {
        const headers = ['Transaction ID', 'Customer', 'Email', 'Category', 'Amount', 'Status', 'Date', 'Payment ID'];
        const rows = filteredSales.map(t => [
            t.id,
            t.userName,
            t.userEmail,
            t.categoryName,
            t.amount,
            t.paymentStatus,
            t.purchasedAt?.toDate ? format(t.purchasedAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A',
            t.razorpay_payment_id || '-'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-lg text-[#00C853]">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-800">₹{stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Paid Tickets</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.paidTickets}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                        <TicketIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Free Tickets</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.freeTickets}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800">Transactions Log</h2>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email or ID.."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-[#00C853] text-gray-800"
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 bg-[#00C853] text-white hover:bg-[#007B33] px-4 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#00C853]" />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="border-b border-gray-200 bg-[#f9fafb] text-xs font-semibold text-gray-500">
                                    <th className="py-3 px-6">Transaction ID</th>
                                    <th className="py-3 px-6">Customer</th>
                                    <th className="py-3 px-6">Category</th>
                                    <th className="py-3 px-6 text-center">Amount</th>
                                    <th className="py-3 px-6 text-center">Status</th>
                                    <th className="py-3 px-6">Date</th>
                                    <th className="py-3 px-6">Payment ID</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-500">No transactions found.</td>
                                    </tr>
                                ) : (
                                    filteredSales.map((t) => (
                                        <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 font-mono text-xs text-gray-500">{t.id}</td>
                                            <td className="py-4 px-6">
                                                <p className="font-medium text-gray-800">{t.userName}</p>
                                                <p className="text-xs text-gray-500">{t.userEmail}</p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-xs font-medium text-gray-700">{t.categoryName}</span>
                                            </td>
                                            <td className="py-4 px-6 text-center font-bold text-gray-800">
                                                ₹{t.amount?.toLocaleString() || 0}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${t.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {t.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-gray-600 text-xs">
                                                {t.purchasedAt?.toDate ? format(t.purchasedAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'Unknown'}
                                            </td>
                                            <td className="py-4 px-6 font-mono text-[10px] text-gray-400">
                                                {t.razorpay_payment_id || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
