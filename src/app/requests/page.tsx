'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { StorageService } from '../../services/storage';
import { Check, X, ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../components/Toast';

export default function RequestsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'admin') {
                router.push('/dashboard');
            } else {
                fetchRequests();
            }
        }
    }, [user, authLoading, router]);

    const fetchRequests = async () => {
        try {
            const data = await StorageService.getRequests();
            // Sort by newest
            setRequests(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error(error);
            setToast({ message: 'Gagal memuat permintaan.', type: 'error' });
        }
    };

    const handleAction = async (req: any, action: 'APPROVED' | 'REJECTED') => {
        try {
            // If Approved, Execute the Action
            if (action === 'APPROVED') {
                if (req.type === 'VOID_TRANSACTION') {
                    // Fix: Payload is the transaction object, so ID is 'id', not 'transactionId'
                    const { id, liter, nominal } = req.payload;
                    // Fallback if payload was created differently in previous versions
                    const txId = id || req.payload.transactionId;
                    await StorageService.deleteTransaction(txId, liter, nominal);
                } else if (req.type === 'VOID_INVENTORY') {
                    // Fix: Payload is the inventory object, so ID is 'id', not 'inventoryId'
                    const { id } = req.payload;
                    // Fallback
                    const invId = id || req.payload.inventoryId;
                    await StorageService.deleteInventoryLog(invId);
                } else if (req.type === 'EXPENSE_VOID') {
                    const { expenseId } = req.payload;
                    // Expense payload was manually constructed with expenseId, so might be correct, 
                    // but let's check how it's created in ExpensesPage. 
                    // In ExpensesPage it is: { expenseId: id, amount: amount, expenseTitle: title }
                    // So expenseId is correct there.
                    await StorageService.deleteExpense(expenseId);
                }
            }

            // Update Status
            await StorageService.updateRequestStatus(req.id, action);

            setToast({ message: `Permintaan berhasil ${action === 'APPROVED' ? 'disetujui' : 'ditolak'}.`, type: 'success' });
            fetchRequests();
        } catch (error: any) {
            console.error(error);
            setToast({ message: 'Gagal memproses permintaan: ' + error.message, type: 'error' });
        }
    };

    if (authLoading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
                        <ArrowLeft size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800">Inbox Permintaan</h1>
                </header>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Waktu</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Requester</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Tipe</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Detail / Alasan</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400">
                                            Tidak ada permintaan baru.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4 text-slate-600 text-sm">
                                                {r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                        {(r.requester_name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    {r.requester_name || 'Unknown'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                                                    {r.type === 'VOID_TRANSACTION' ? 'VOID TRANSAKSI' :
                                                        r.type === 'VOID_INVENTORY' ? 'VOID RESTOCK' :
                                                            r.type === 'EXPENSE_VOID' ? 'VOID PENGELUARAN' : r.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                <div className="font-bold text-slate-800">
                                                    {r.payload?.nominal ? `Rp ${Number(r.payload.nominal).toLocaleString()}` :
                                                        r.payload?.amount ? `Rp ${Number(r.payload.amount).toLocaleString()} (${r.payload?.expenseTitle || ''})` :
                                                            r.payload?.liter ? `${r.payload.liter} Liter` :
                                                                r.payload?.volume ? `${r.payload.volume} Liter` : '-'}
                                                </div>
                                                <div className="italic text-slate-500">
                                                    "{r.payload?.reason || r.payload?.details || '-'}"
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {r.status === 'PENDING' && (
                                                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                                                        <Clock size={12} /> Pending
                                                    </span>
                                                )}
                                                {r.status === 'APPROVED' && (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                                                        <CheckCircle size={12} /> Approved
                                                    </span>
                                                )}
                                                {r.status === 'REJECTED' && (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                                                        <XCircle size={12} /> Rejected
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {r.status === 'PENDING' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleAction(r, 'APPROVED')}
                                                            className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition"
                                                            title="Setujui"
                                                        >
                                                            <CheckCircle size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(r, 'REJECTED')}
                                                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                                                            title="Tolak"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
