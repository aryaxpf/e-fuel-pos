'use client';

import { useState, useEffect } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check session storage on mount
        const authList = sessionStorage.getItem('efuel_admin_auth');
        if (authList === 'true') {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // HARDCODED PIN FOR MVP
        if (pin === '123456') {
            sessionStorage.setItem('efuel_admin_auth', 'true');
            setIsAuthenticated(true);
            setError(false);
        } else {
            setError(true);
            setPin('');
        }
    };

    if (isLoading) return null; // Prevent flash

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                    <div className="text-center mb-8">
                        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="text-red-500" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Admin Access</h1>
                        <p className="text-slate-500 mt-2">Masukkan PIN untuk mengakses.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <input
                                type="password"
                                inputMode="numeric"
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value);
                                    setError(false);
                                }}
                                maxLength={6}
                                className={`w-full text-center text-3xl tracking-widest font-bold py-4 rounded-xl border-2 outline-none transition focus:ring-4 ${error
                                        ? 'border-red-300 bg-red-50 focus:ring-red-100 text-red-600'
                                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50 text-slate-800'
                                    }`}
                                placeholder="• • • • • •"
                                autoFocus
                            />
                            {error && (
                                <p className="text-red-500 text-sm text-center mt-2 font-medium animate-pulse">
                                    PIN Salah. Silakan coba lagi.
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>Masuk Dashboard</span>
                            <ArrowRight size={20} />
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm font-medium transition">
                            &larr; Kembali ke Kasir
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
