'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { StorageService } from '../../../services/storage';
import { ArrowLeft, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function StartShiftPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [initialCash, setInitialCash] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false); // Success State

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            // Check if shift is already open
            StorageService.getCurrentShift(user.id).then(shift => {
                if (shift) {
                    router.push('/dashboard');
                }
            });
        }
    }, [user, authLoading, router]);

    const handleStartShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await StorageService.startShift(
                user.id || 'unknown',
                Number(initialCash.replace(/\D/g, '')),
                user.username
            );
            // Replace alert with Success UI
            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch (error: any) {
            console.error(error);
            alert('Gagal membuka shift: ' + error.message);
            setLoading(false);
        }
    };

    if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center p-8 text-slate-500">Memuat Data User...</div>;

    if (success) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Shift Berhasil Dibuka!</h1>
                    <p className="text-slate-500 mb-6">Selamat bekerja, {user.username}.</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-400 font-bold uppercase">Modal Awal</p>
                        <p className="text-xl font-bold text-slate-800">Rp {Number(initialCash.replace(/\D/g, '')).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-6 text-white text-center">
                    <Wallet size={48} className="mx-auto mb-4 opacity-80" />
                    <h1 className="text-2xl font-bold">Mulai Shift Baru</h1>
                    <p className="opacity-90 mt-1">Halo, {user.username}!</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleStartShift}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Uang Modal Awal (Di Laci)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-500 font-bold">Rp</span>
                                <input
                                    type="number"
                                    required
                                    value={initialCash}
                                    onChange={(e) => setInitialCash(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-slate-800"
                                    placeholder="0"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Masukkan jumlah uang tunai yang ada di laci kasir sebelum memulai transaksi.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white transition shadow-lg
                                ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'}
                            `}
                        >
                            {loading ? 'Memproses...' : 'Buka Shift Sekarang'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm inline-flex items-center gap-1">
                            <ArrowLeft size={14} /> Batalkan / Kembali ke Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
