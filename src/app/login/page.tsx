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
            router.push('/shift/start'); // User cannot enter dashboard without shift
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500" style={{ background: 'var(--bg-primary)' }}>

            {/* Decorative ambient orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 dark:opacity-10 mix-blend-multiply dark:mix-blend-screen animate-pulse pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', filter: 'blur(100px)' }} />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 dark:opacity-10 mix-blend-multiply dark:mix-blend-screen animate-pulse pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--success) 0%, transparent 70%)', filter: 'blur(80px)', animationDelay: '2s' }} />

            <div className="w-full max-w-md relative z-10 page-fade-in">
                {/* Glass Card */}
                <div className="relative overflow-hidden shadow-2xl transition-all duration-300" style={{
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xl)',
                }}>
                    {/* Header */}
                    <div className="p-10 pb-6 text-center">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-105 duration-300" style={{
                            background: 'var(--accent)',
                            boxShadow: '0 10px 30px -10px var(--accent)',
                        }}>
                            <Fuel size={36} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Smart POS</h1>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sign in</p>
                    </div>

                    {/* Form */}
                    <div className="px-10 pb-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="toast-enter p-4 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
                                    <Lock size={16} /> {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Username</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" size={20} style={{ color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-xl outline-none transition-all duration-300 font-medium"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                        placeholder="admin"
                                    />
                                    {/* Focus Border glow effect */}
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '2px solid var(--accent)' }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300" size={20} style={{ color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-xl outline-none transition-all duration-300 font-medium"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                        placeholder="••••••"
                                    />
                                    {/* Focus Border glow effect */}
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '2px solid var(--accent)' }}></div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-press w-full text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{
                                    background: 'var(--accent)',
                                    boxShadow: '0 8px 25px -5px var(--accent)',
                                    minHeight: 'var(--touch-min)',
                                    marginTop: '8px'
                                }}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>MASUK <Lock size={18} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="text-center mt-8">
                    <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        SECURE STATION TERMINAL
                    </p>
                    <p className="text-xs mt-1 opacity-70" style={{ color: 'var(--text-muted)' }}>
                        Smart POS &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
