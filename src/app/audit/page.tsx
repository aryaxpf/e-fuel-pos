'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Search, Filter, RefreshCw, Key, Database, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoggerService, ActivityLog } from '../../services/logger';
import { useRouter } from 'next/navigation';

export default function AuditLogPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'admin') {
                router.push('/dashboard'); // Restrict to admin only
            } else {
                fetchLogs();
            }
        }
    }, [user, loading, router]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await LoggerService.getLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatActionType = (action: string) => {
        return action.replace(/_/g, ' ');
    };

    const getActionColor = (action: string) => {
        if (action.includes('VOID') || action.includes('DELETE')) return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
        if (action.includes('LOGIN') || action.includes('START')) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30';
        if (action.includes('UPDATE') || action.includes('SETTINGS')) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30';
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30';
    };

    const filteredLogs = logs.filter(log => {
        if (filterType !== 'ALL' && !log.action_type.includes(filterType)) return false;
        if (searchTerm) {
            const searchObj = JSON.stringify(log).toLowerCase();
            return searchObj.includes(searchTerm.toLowerCase());
        }
        return true;
    });

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

    return (
        <div className="min-h-screen pb-20 transition-colors duration-500 page-fade-in" style={{ background: 'var(--bg-primary)' }}>
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold mb-4 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={16} /> Kembali
                        </Link>
                        <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                            <ShieldCheck size={32} className="text-emerald-600" />
                            Immutable Audit Trail
                        </h1>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Merekam seluruh aktivitas sensitif dalam sistem secara permanen. Hanya dapat diakses oleh Admin.</p>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Cari ID/User/Data..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 rounded-xl text-sm font-bold outline-none border transition-colors"
                                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2 rounded-xl text-sm font-bold outline-none border cursor-pointer"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                        >
                            <option value="ALL">Semua Aktivitas</option>
                            <option value="LOGIN">Auth/Login</option>
                            <option value="VOID">Pembatalan (Void)</option>
                            <option value="PRODUCT">Manajemen Barang</option>
                            <option value="RESTOCK">Restock Inventory</option>
                        </select>
                        <button onClick={fetchLogs} className="p-2 rounded-xl border hover:opacity-80 transition-opacity" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Audit Table */}
                <div className="border rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b text-xs uppercase tracking-wider font-extrabold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                                    <th className="p-4">Timestamp (UTC)</th>
                                    <th className="p-4">Actor ID</th>
                                    <th className="p-4">Action</th>
                                    <th className="p-4">Device Reference</th>
                                    <th className="p-4">State Data (JSON)</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Menarik data audit...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Tidak ada rekaman keamanan ditemukan.</td></tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                                            <td className="p-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                                {new Date(log.timestamp).toLocaleString('id-ID', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'medium',
                                                    hour12: false
                                                })}
                                            </td>
                                            <td className="p-4 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                                                <div className="flex items-center gap-1.5">
                                                    <Key size={12} className="text-slate-400" />
                                                    {log.actor_id.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${getActionColor(log.action_type)}`}>
                                                    {formatActionType(log.action_type)}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {log.device_id}
                                            </td>
                                            <td className="p-4">
                                                <div className="max-w-xs overflow-hidden text-[10px] font-mono p-2 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                                    {(log.after_state || log.before_state) ? (
                                                        <details className="cursor-pointer">
                                                            <summary className="font-bold text-blue-500">Lihat Payload</summary>
                                                            <pre className="mt-2 whitespace-pre-wrap word-break">
                                                                {JSON.stringify(log.after_state || log.before_state, null, 2)}
                                                            </pre>
                                                        </details>
                                                    ) : (
                                                        <span>No Payload</span>
                                                    )}
                                                </div>
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
