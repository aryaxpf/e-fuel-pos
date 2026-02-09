'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { StorageService } from '../../services/storage';
import { Plus, Trash2, Calendar, DollarSign, Tag, FileText, ArrowLeft, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

import Toast, { ToastType } from '../../components/Toast';

export default function ExpensesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    // Void Modal State
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [voidReason, setVoidReason] = useState('');
    const [isVoiding, setIsVoiding] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('OPERASIONAL');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else {
                // Allow both admin and cashier
                loadExpenses();
            }
        }
    }, [user, loading, router]);

    const loadExpenses = async () => {
        const data = await StorageService.getExpenses();
        setExpenses(data);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await StorageService.addExpense({
                title,
                amount: Number(amount),
                category,
                notes,
                user_id: user?.id
            });
            setShowAddModal(false);
            resetForm();
            loadExpenses();
            setToast({ message: 'Pengeluaran berhasil dicatat!', type: 'success' });
        } catch (error: any) {
            setToast({ message: 'Gagal mencatat: ' + error.message, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async (id: string, expenseData: any) => {
        if (!user) return;

        if (user.role === 'admin') {
            // Admin: Direct Delete
            if (confirm('Yakin ingin menghapus data pengeluaran ini?')) {
                try {
                    await StorageService.deleteExpense(id);
                    loadExpenses();
                    setToast({ message: 'Pengeluaran berhasil dihapus.', type: 'success' });
                } catch (error: any) {
                    setToast({ message: 'Gagal menghapus: ' + error.message, type: 'error' });
                }
            }
        } else {
            // Cashier: Open Void Modal
            setSelectedExpense(expenseData);
            setVoidReason('');
            setShowVoidModal(true);
        }
    };

    const handleRequestVoid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExpense || !user) return;

        setIsVoiding(true);
        try {
            await StorageService.addRequest('EXPENSE_VOID', {
                expenseId: selectedExpense.id,
                reason: voidReason,
                expenseTitle: selectedExpense.title,
                amount: selectedExpense.amount
            }, user.username);
            setToast({ message: 'Request penghapusan terkirim ke Admin.', type: 'success' });
            setShowVoidModal(false);
        } catch (error: any) {
            setToast({ message: 'Gagal mengirim request: ' + error.message, type: 'error' });
        } finally {
            setIsVoiding(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setCategory('OPERASIONAL');
        setNotes('');
    };

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    if (loading || !user) return <div className="p-8 text-center bg-slate-100 min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-100">
            <Navbar />

            <main className="container mx-auto p-4 md:p-6">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dashboard" className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengeluaran</h1>
                        <p className="text-slate-500 text-sm">Catat biaya operasional toko</p>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-orange-500 font-bold uppercase text-sm mb-1">Total Pengeluaran</p>
                        <p className="text-3xl font-bold text-orange-700">Rp {totalExpenses.toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-full text-orange-500">
                        <DollarSign size={32} />
                    </div>
                </div>

                {/* Actions & List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h2 className="font-bold text-slate-700">Riwayat Pengeluaran</h2>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition shadow-lg shadow-orange-200"
                        >
                            <Plus size={18} /> Catat Pengeluaran
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-slate-500 font-bold border-b border-slate-200">
                                <tr className="whitespace-nowrap">
                                    <th className="p-4">Tanggal</th>
                                    <th className="p-4">Judul</th>
                                    <th className="p-4">Kategori</th>
                                    <th className="p-4 text-right">Jumlah</th>
                                    <th className="p-4">Catatan</th>
                                    <th className="p-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {expenses.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada data pengeluaran</td></tr>
                                ) : (
                                    expenses.map(expense => (
                                        <tr key={expense.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4 text-slate-500 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    {new Date(expense.date).toLocaleDateString('id-ID')}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-slate-800">{expense.title}</td>
                                            <td className="p-4">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold border border-slate-200 whitespace-nowrap">
                                                    {expense.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-bold text-red-600 whitespace-nowrap">
                                                -Rp {expense.amount.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-slate-500 max-w-xs truncate">{expense.notes || '-'}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => confirmDelete(expense.id, expense)}
                                                    className="text-red-400 hover:text-red-600 transition p-2 hover:bg-red-50 rounded-full"
                                                    title={user.role === 'admin' ? "Hapus" : "Request Hapus"}
                                                >
                                                    {user.role === 'admin' ? <Trash2 size={16} /> : <AlertTriangle size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add Expense Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Plus size={20} /></div>
                                Tulis Pengeluaran
                            </h3>

                            <form onSubmit={handleAdd} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Judul Pengeluaran</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        placeholder="Contoh: Token Listrik"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-800"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah (Rp)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            placeholder="0"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono font-bold text-right text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                                        <select
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-800"
                                        >
                                            <option value="OPERASIONAL">Operasional</option>
                                            <option value="GAJI">Gaji Karyawan</option>
                                            <option value="MAKAN">Uang Makan</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="LAINNYA">Lainnya</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Catatan (Opsional)</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Keterangan tambahan..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none text-slate-800"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-orange-600 rounded-xl font-bold text-white hover:bg-orange-700 transition shadow-lg shadow-orange-200 disabled:opacity-70"
                                    >
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Void Request Modal */}
                {showVoidModal && selectedExpense && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <AlertTriangle className="text-orange-500" />
                                    Request Hapus
                                </h3>
                                <button onClick={() => setShowVoidModal(false)} className="text-slate-400 hover:text-red-500 transition">
                                    <X size={24} />
                                </button>
                            </div>

                            <p className="text-slate-600 mb-4">
                                Anda akan mengajukan penghapusan pengeluaran <strong>"{selectedExpense.title}"</strong> senilai <strong>Rp {selectedExpense.amount.toLocaleString()}</strong>.
                            </p>

                            <form onSubmit={handleRequestVoid} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Alasan Penghapusan</label>
                                    <textarea
                                        required
                                        autoFocus
                                        rows={3}
                                        placeholder="Contoh: Salah input nominal, double input, dll."
                                        value={voidReason}
                                        onChange={e => setVoidReason(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none text-slate-800"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowVoidModal(false)}
                                        className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isVoiding}
                                        className="flex-1 py-3 bg-orange-600 rounded-xl font-bold text-white hover:bg-orange-700 transition shadow-lg shadow-orange-200 disabled:opacity-70"
                                    >
                                        {isVoiding ? 'Mengirim...' : 'Kirim Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
