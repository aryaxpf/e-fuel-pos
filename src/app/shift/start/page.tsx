'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { StorageService } from '../../../services/storage';
import { ArrowLeft, Wallet, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function StartShiftPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [initialCash, setInitialCash] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

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

    if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center p-8 page-fade-in" style={{ color: 'var(--text-muted)' }}>Memuat Data User...</div>;

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500" style={{ background: 'var(--bg-primary)' }}>
                <div className="w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300 rounded-3xl shadow-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Shift Dibuka!</h1>
                    <p className="mb-8 font-medium" style={{ color: 'var(--text-secondary)' }}>Selamat bertugas, {user.username}.</p>

                    <div className="p-6 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}>
                        <p className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Modal Awal Laci</p>
                        <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>Rp {Number(initialCash.replace(/\D/g, '')).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500" style={{ background: 'var(--bg-primary)' }}>
            <div className="w-full max-w-md page-fade-in">
                {/* Back Button */}
                <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold mb-6 transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={20} /> Kembali ke Dashboard
                </Link>

                <div className="rounded-3xl shadow-2xl overflow-hidden transition-all duration-300" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>

                    {/* Header Banner */}
                    <div className="p-8 pb-10 text-center relative overflow-hidden">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--accent) 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>

                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}>
                            <Wallet size={36} />
                        </div>
                        <h1 className="text-2xl font-bold relative z-10" style={{ color: 'var(--text-primary)' }}>Mulai Shift Baru</h1>
                        <p className="font-medium mt-1 relative z-10" style={{ color: 'var(--text-secondary)' }}>Kasir: <span style={{ color: 'var(--accent)' }}>{user.username}</span></p>
                    </div>

                    <div className="p-8 pt-0 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <form onSubmit={handleStartShift} className="mt-8">
                            <div className="mb-8">
                                <label className="block text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                                    Uang Modal Awal (Di Laci)
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg transition-colors duration-300" style={{ color: 'var(--text-muted)' }}>Rp</span>
                                    <input
                                        type="number"
                                        required
                                        value={initialCash}
                                        onChange={(e) => setInitialCash(e.target.value)}
                                        className="w-full pl-14 pr-4 py-4 rounded-2xl outline-none transition-all duration-300 font-black text-2xl"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '2px solid transparent',
                                            color: 'var(--text-primary)',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                        placeholder="0"
                                    />
                                    {/* Focus Border glow effect */}
                                    <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '2px solid var(--accent)' }}></div>
                                </div>
                                <p className="text-xs font-medium mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                    Masukkan jumlah fisik uang pecahan yang ada di laci kasir sebelum Anda menerima pembayaran pertama.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-press w-full font-bold text-lg text-white py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{
                                    background: 'var(--accent)',
                                    boxShadow: '0 8px 25px -5px var(--accent)',
                                    minHeight: 'var(--touch-min)',
                                }}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>Buka Shift Sekarang <CheckCircle size={20} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
