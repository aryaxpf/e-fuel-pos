'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { ArrowLeft, Clock, Search, Filter, Ban, RefreshCw, Package, Zap, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { ProductService } from '../../services/productService';
import { exportHistoryToExcel } from '../../lib/export';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'FUEL' | 'GOODS'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            loadHistory();
        }
    }, [user, loading, router]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const fuelTxs = await StorageService.getTransactions();
            const productTxs = await ProductService.getProductTransactionsForReports();

            const unified = [
                ...fuelTxs.map(t => ({
                    id: t.id,
                    date: new Date(t.timestamp),
                    type: 'FUEL',
                    amount: t.nominal,
                    payment: t.paymentMethod || 'CASH',
                    status: t.status || 'SUCCESS',
                    details: `${t.liter.toFixed(2)} Liter`,
                    raw: t
                })),
                ...productTxs.map((t: any) => ({
                    id: t.id,
                    date: new Date(t.timestamp),
                    type: 'GOODS',
                    amount: t.total_amount,
                    payment: t.payment_method || 'CASH',
                    status: t.status || 'SUCCESS',
                    details: `${t.items.length} Item(s)`,
                    raw: t
                }))
            ];

            // Sort by newest
            unified.sort((a, b) => b.date.getTime() - a.date.getTime());
            setTransactions(unified);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoid = async (id: string, type: 'FUEL' | 'GOODS') => {
        if (!user) return;
        if (!confirm(`Apakah Anda yakin ingin membatalkan transaksi ini? Stok akan dikembalikan otomatis.`)) return;

        try {
            if (type === 'FUEL') {
                await StorageService.voidTransaction(id, user);
            } else {
                await ProductService.voidProductTransaction(id, user as any);
            }
            alert('Transaksi berhasil dibatalkan (VOID).');
            loadHistory();
        } catch (error: any) {
            alert('Gagal membatalkan: ' + error.message);
        }
    };

    const filtered = transactions.filter(t => {
        if (filter !== 'ALL' && t.type !== filter) return false;
        if (searchTerm) {
            return t.id.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

    return (
        <div className="min-h-screen pb-20 transition-colors duration-500 page-fade-in" style={{ background: 'var(--bg-primary)' }}>
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold mb-4 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={16} /> Kembali
                        </Link>
                        <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                            <Clock size={32} style={{ color: 'var(--accent)' }} />
                            Riwayat Transaksi
                        </h1>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Pantau penjualan bensin dan barang, serta lakukan pembatalan (VOID) jika diperlukan.</p>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Cari ID Transaksi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 rounded-xl text-sm font-bold outline-none border transition-colors"
                                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <button onClick={() => exportHistoryToExcel(filtered)} className="p-2 px-4 rounded-xl border hover:opacity-80 transition-opacity flex items-center gap-2 font-bold" style={{ background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }}>
                            <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Unduh Excel</span>
                        </button>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="px-4 py-2 rounded-xl text-sm font-bold outline-none border cursor-pointer"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                        >
                            <option value="ALL">Semua Tipe</option>
                            <option value="FUEL">BensinSaja</option>
                            <option value="GOODS">Barang Saja</option>
                        </select>
                        <button onClick={loadHistory} className="p-2 rounded-xl border hover:opacity-80 transition-opacity" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b text-xs uppercase tracking-wider font-extrabold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                                    <th className="p-4">Tanggal & Waktu</th>
                                    <th className="p-4">Tipe</th>
                                    <th className="p-4">ID Transaksi</th>
                                    <th className="p-4">Detail</th>
                                    <th className="p-4 text-right">Total Nominal</th>
                                    <th className="p-4 text-center">Metode</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium">
                                {isLoading ? (
                                    <tr><td colSpan={8} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Memuat riwayat...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Tidak ada transaksi ditemukan.</td></tr>
                                ) : (
                                    filtered.map((tx) => (
                                        <tr key={tx.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                                            <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                                                {tx.date.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4">
                                                {tx.type === 'FUEL' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                        <Zap size={14} /> Bensin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                                        <Package size={14} /> Barang
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {tx.id.split('-')[0]}...
                                            </td>
                                            <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                                                {tx.details}
                                            </td>
                                            <td className="p-4 text-right font-bold text-base font-mono-num" style={{ color: 'var(--text-primary)' }}>
                                                Rp {tx.amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                                    {tx.payment}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {tx.status === 'SUCCESS' ? (
                                                    <span className="text-xs font-bold px-2 py-1 rounded text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30">SUKSES</span>
                                                ) : (
                                                    <span className="text-xs font-bold px-2 py-1 rounded text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30">BATAL (VOID)</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {tx.status === 'SUCCESS' ? (
                                                    <button
                                                        onClick={() => handleVoid(tx.id, tx.type)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                                                        style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                                                    >
                                                        <Ban size={14} /> Void
                                                    </button>
                                                ) : (
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>-</span>
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
