'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Link from 'next/link';
import { ArrowLeft, Clock, Search, CalendarDays, Wallet, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { StorageService } from '../../../services/storage';
import { useRouter } from 'next/navigation';

export default function ShiftHistoryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [shifts, setShifts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            const data = await StorageService.getShiftHistory();
            setShifts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = shifts.filter(s => {
        if (searchTerm) {
            const cName = (s.username || '').toLowerCase();
            return cName.includes(searchTerm.toLowerCase());
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
                            <ArrowLeft size={16} /> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                            <CalendarDays size={32} style={{ color: 'var(--accent)' }} />
                            Riwayat Shift Kasir
                        </h1>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Pantau riwayat sesi buka dan tutup shift.</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Cari Nama Kasir..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full md:w-64 rounded-xl text-sm font-bold outline-none border transition-colors"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        />
                    </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b text-xs uppercase tracking-wider font-extrabold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                                    <th className="p-4">Waktu Buka Shift</th>
                                    <th className="p-4">Waktu Tutup Shift</th>
                                    <th className="p-4">Kasir</th>
                                    <th className="p-4 text-right">Modal Awal</th>
                                    <th className="p-4 text-right">Total Seharusnya</th>
                                    <th className="p-4 text-right">Aktual Laci</th>
                                    <th className="p-4 text-right">Selisih</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium">
                                {isLoading ? (
                                    <tr><td colSpan={8} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Memuat riwayat shift...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Tidak ada riwayat shift ditemukan.</td></tr>
                                ) : (
                                    filtered.map((s) => (
                                        <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                                            <td className="p-4" style={{ color: 'var(--text-primary)' }}>
                                                {new Date(s.start_time).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                                                {s.end_time ? new Date(s.end_time).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="p-4 font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                                <User size={16} className="text-slate-400" /> {s.username || 'Kasir'}
                                            </td>
                                            <td className="p-4 text-right font-mono-num" style={{ color: 'var(--text-secondary)' }}>
                                                Rp {(s.initial_cash || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-right font-bold text-base font-mono-num" style={{ color: 'var(--text-primary)' }}>
                                                Rp {(s.expected_cash || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-right font-bold font-mono-num" style={{ color: 'var(--accent)' }}>
                                                Rp {(s.final_cash || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-right font-black font-mono-num">
                                                <span className={s.variance === 0 ? 'text-green-500' : 'text-red-500'}>
                                                    {s.variance > 0 ? '+' : ''} Rp {(s.variance || 0).toLocaleString('id-ID')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {s.status === 'CLOSED' ? (
                                                    <span className="text-xs font-bold px-2 py-1 rounded text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30">SELESAI</span>
                                                ) : (
                                                    <span className="text-xs font-bold px-2 py-1 rounded text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30">AKTIF</span>
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
