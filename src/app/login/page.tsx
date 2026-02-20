'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Fuel, Lock, User } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const err = await login(username, password);
        if (err) {
            setError(err);
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0c0f1a 0%, #141829 50%, #1a1f35 100%)' }}>
            {/* Decorative blur orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(80px)' }} />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', filter: 'blur(60px)' }} />

            <div className="w-full max-w-md relative">
                {/* Glass Card */}
                <div className="relative overflow-hidden" style={{
                    background: 'rgba(20, 24, 41, 0.7)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}>
                    {/* Header */}
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 glow-blue" style={{
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            boxShadow: '0 8px 30px rgba(59,130,246,0.35)',
                        }}>
                            <Fuel size={28} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">E-Fuel POS</h1>
                        <p className="text-slate-400 mt-2 text-sm">Masuk untuk memulai shift</p>
                    </div>

                    {/* Form */}
                    <div className="px-8 pb-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="toast-enter p-3 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition text-white placeholder-slate-500"
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                        }}
                                        placeholder="admin"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition text-white placeholder-slate-500"
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                        }}
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-press w-full text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                                style={{
                                    background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    boxShadow: loading ? 'none' : '0 6px 25px rgba(59,130,246,0.3)',
                                    minHeight: 'var(--touch-min)',
                                }}
                            >
                                {loading ? 'Memproses...' : 'MASUK'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer Branding */}
                <p className="text-center text-slate-600 text-xs mt-6">
                    E-Fuel POS &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
