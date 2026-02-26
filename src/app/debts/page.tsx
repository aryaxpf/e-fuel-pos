'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { ArrowLeft, Wallet, Search, CreditCard, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../components/Toast';

export default function DebtsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [debts, setDebts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            loadData();
        }
    }, [user, loading, router]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await StorageService.getDebts();
            setDebts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayDebt = async () => {
        if (!selectedDebt || !paymentAmount) return;
        const amount = Number(paymentAmount);
        if (amount <= 0) return alert('Nominal harus lebih dari 0');

        const remaining = selectedDebt.amount - (selectedDebt.amount_paid || 0);
        if (amount > remaining) return alert(`Nominal melebihi sisa hutang (Maks. Rp ${remaining.toLocaleString('id-ID')})`);

        try {
            await StorageService.payDebt(selectedDebt.id, amount);
            setToast({ message: 'Pembayaran hutang berhasil dicatat!', type: 'success' });
            setPaymentModalOpen(false);
            setPaymentAmount('');
            loadData();
        } catch (err: any) {
            setToast({ message: 'Gagal membayar hutang: ' + err.message, type: 'error' });
        }
    };

    const filtered = debts.filter(d => {
        if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
        if (searchTerm) {
            const cName = (d.customers?.name || 'Pelanggan Tidak Diketahui').toLowerCase();
            return cName.includes(searchTerm.toLowerCase()) || (d.transaction_id || '').toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    const totalUnpaid = debts.reduce((sum, d) => d.status !== 'PAID' ? sum + (d.amount - (d.amount_paid || 0)) : sum, 0);

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

    return (
        <div className="min-h-screen pb-20 transition-colors duration-500 page-fade-in" style={{ background: 'var(--bg-primary)' }}>
            <Navbar />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold mb-4 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={16} /> Kembali
                        </Link>
                        <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                            <Wallet size={32} style={{ color: 'var(--accent)' }} />
                            Manajemen Kasbon / Piutang
                        </h1>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Kelola dan catat pembayaran hutang pelanggan.</p>
                    </div>

                    <div className="flex bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4 items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800/40 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-orange-600/80 dark:text-orange-400/80 uppercase tracking-wider mb-1">Total Piutang Aktif</p>
                            <h2 className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono-num">
                                Rp {totalUnpaid.toLocaleString('id-ID')}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Cari Nama Pelanggan / ID Transaksi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold outline-none border transition-colors focus:ring-2 focus:ring-[var(--accent)]"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full md:w-auto px-4 py-3 rounded-xl text-sm font-bold outline-none border cursor-pointer focus:ring-2 focus:ring-[var(--accent)]"
                        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="UNPAID">Belum Dibayar (UNPAID)</option>
                        <option value="PARTIAL">Cicilan (PARTIAL)</option>
                        <option value="PAID">Lunas (PAID)</option>
                    </select>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b text-xs uppercase tracking-wider font-extrabold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                                    <th className="p-4">Tanggal</th>
                                    <th className="p-4">Pelanggan</th>
                                    <th className="p-4">Total Hutang</th>
                                    <th className="p-4">Sudah Dibayar</th>
                                    <th className="p-4">Sisa Tagihan</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">Memuat data kasbon...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                        <div className="flex flex-col items-center gap-3">
                                            <CheckCircle2 size={32} className="text-emerald-500 opacity-50" />
                                            <span>Tidak ada catatan kasbon ditemukan.</span>
                                        </div>
                                    </td></tr>
                                ) : (
                                    filtered.map((d) => {
                                        const remaining = d.amount - (d.amount_paid || 0);
                                        return (
                                            <tr key={d.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                                                <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                                                    {new Date(d.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        <User size={16} style={{ color: 'var(--text-muted)' }} />
                                                        {d.customers?.name || 'Pelanggan Tidak Diketahui'}
                                                    </div>
                                                    <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>Trx ID: {(d.transaction_id || '').split('-')[0]}</div>
                                                </td>
                                                <td className="p-4 font-bold text-base font-mono-num" style={{ color: 'var(--text-primary)' }}>
                                                    Rp {d.amount.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono-num">
                                                    Rp {(d.amount_paid || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-4 font-bold text-orange-600 dark:text-orange-400 font-mono-num">
                                                    Rp {remaining.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {d.status === 'PAID' ? (
                                                        <span className="text-xs font-bold px-2 py-1 rounded text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30">LUNAS</span>
                                                    ) : d.status === 'PARTIAL' ? (
                                                        <span className="text-xs font-bold px-2 py-1 rounded text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30">CICILAN</span>
                                                    ) : (
                                                        <span className="text-xs font-bold px-2 py-1 rounded text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30">BELUM BAYAR</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {d.status !== 'PAID' ? (
                                                        <button
                                                            onClick={() => { setSelectedDebt(d); setPaymentModalOpen(true); }}
                                                            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
                                                        >
                                                            <Wallet size={14} /> Bayar
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-400">Selesai</span>
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
            </main>

            {/* Payment Modal */}
            {paymentModalOpen && selectedDebt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPaymentModalOpen(false)}>
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Bayar Kasbon</h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Pelanggan: {selectedDebt.customers?.name || 'Anonim'}</p>
                        </div>

                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50">
                                <span className="text-sm font-bold text-orange-700 dark:text-orange-400">Sisa Tagihan</span>
                                <span className="font-black text-xl text-orange-600 dark:text-orange-400 font-mono-num">
                                    Rp {(selectedDebt.amount - (selectedDebt.amount_paid || 0)).toLocaleString('id-ID')}
                                </span>
                            </div>

                            <label className="block mb-2 text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Nominal Pembayaran (Rp)</label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Masukkan nominal..."
                                className="w-full p-4 rounded-xl font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 mb-6 font-mono-num text-lg transition-all shadow-inner"
                                style={{ color: 'var(--text-primary)' }}
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handlePayDebt}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} /> Konfirmasi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
