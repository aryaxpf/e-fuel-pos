'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { StorageService } from '../../services/storage';
import { ArrowLeft, Search, Wallet, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { playSuccessSound } from '../../utils/sound';
import Toast, { ToastType } from '../../components/Toast';

export default function DebtsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [debts, setDebts] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<any>(null);
    const [payAmount, setPayAmount] = useState('');

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else {
                loadDebts();
            }
        }
    }, [user, loading, router]);

    const loadDebts = async () => {
        const data = await StorageService.getDebts();
        setDebts(data);
    };

    const handlePay = async () => {
        if (!selectedDebt || !payAmount) return;

        try {
            const amount = Number(payAmount.replace(/\D/g, ''));
            if (amount <= 0) return;

            await StorageService.payDebt(selectedDebt.id, amount);

            // Play Sound
            playSuccessSound();

            setToast({ message: 'Pembayaran berhasil dicatat!', type: 'success' });
            setShowPayModal(false);
            setPayAmount('');
            setSelectedDebt(null);
            loadDebts();
        } catch (error: any) {
            setToast({ message: 'Gagal bayar: ' + error.message, type: 'error' });
        }
    };

    const filteredDebts = debts.filter(d =>
        d.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalUnpaid = debts.reduce((acc, curr) =>
        curr.status !== 'PAID' ? acc + (curr.amount - curr.amount_paid) : acc, 0
    );

    if (loading || !user) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-100">
            <Navbar />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="container mx-auto p-4 md:p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dashboard" className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Manajemen Hutang (Kasbon)</h1>
                        <p className="text-slate-500 text-sm">Monitor dan catat pembayaran hutang pelanggan</p>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-red-500 font-bold uppercase text-sm mb-1">Total Piutang (Belum Lunas)</p>
                        <p className="text-3xl font-bold text-red-700">Rp {totalUnpaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-full text-red-500">
                        <Wallet size={32} />
                    </div>
                </div>

                {/* Search & Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-64">
                            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari Pelanggan..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-4">Pelanggan</th>
                                    <th className="p-4">Tanggal</th>
                                    <th className="p-4 text-right">Total Hutang</th>
                                    <th className="p-4 text-right">Sudah Bayar</th>
                                    <th className="p-4 text-right">Sisa</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredDebts.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada data hutang</td></tr>
                                ) : (
                                    filteredDebts.map(debt => {
                                        const remaining = debt.amount - debt.amount_paid;
                                        return (
                                            <tr key={debt.id} className="hover:bg-slate-50 transition">
                                                <td className="p-4 font-bold text-slate-800">
                                                    {debt.customers?.name || 'Unknown'}
                                                    {debt.notes && <div className="text-xs text-slate-400 font-normal">{debt.notes}</div>}
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    {new Date(debt.created_at).toLocaleDateString('id-ID')}
                                                </td>
                                                <td className="p-4 text-right text-slate-800">Rp {debt.amount.toLocaleString()}</td>
                                                <td className="p-4 text-right text-green-600">Rp {debt.amount_paid.toLocaleString()}</td>
                                                <td className="p-4 text-right font-bold text-red-600">Rp {remaining.toLocaleString()}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${debt.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                        debt.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {debt.status === 'PAID' ? <CheckCircle size={12} /> :
                                                            debt.status === 'PARTIAL' ? <Clock size={12} /> :
                                                                <AlertCircle size={12} />}
                                                        {debt.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {debt.status !== 'PAID' && (
                                                        <button
                                                            onClick={() => { setSelectedDebt(debt); setShowPayModal(true); }}
                                                            className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                                                        >
                                                            Bayar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pay Modal */}
                {showPayModal && selectedDebt && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
                            <h3 className="text-lg font-bold mb-1">Catat Pembayaran</h3>
                            <p className="text-sm text-slate-500 mb-4">Pelanggan: <span className="font-bold text-slate-800">{selectedDebt.customers?.name}</span></p>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-500">Total Hutang:</span>
                                    <span className="font-bold">Rp {selectedDebt.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-500">Sisa Tagihan:</span>
                                    <span className="font-bold text-red-600">Rp {(selectedDebt.amount - selectedDebt.amount_paid).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Bayar</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-500 font-bold">Rp</span>
                                    <input
                                        type="number"
                                        required
                                        autoFocus
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-slate-800"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowPayModal(false); setSelectedDebt(null); setPayAmount(''); }}
                                    className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handlePay}
                                    className="flex-1 py-3 bg-green-600 rounded-xl font-bold text-white hover:bg-green-700 transition shadow-lg shadow-green-200"
                                >
                                    Bayar Lunas / Cicil
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
