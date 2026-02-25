'use client';

import { useState, useEffect } from 'react';
import { StorageService } from '../../../services/storage';
import AdminGuard from '../../../components/AdminGuard';
import { ArrowLeft, Search, Shield, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await StorageService.getAuditLogs();
            setLogs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        (log.username || '').toLowerCase().includes(filter.toLowerCase()) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <AdminGuard>
            <div className="page-container page-fade-in p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="page-header mb-6">
                        <Link href="/dashboard" className="back-btn" title="Kembali">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="page-title flex items-center gap-2">
                                <Shield size={22} className="text-blue-600" /> Audit Logs
                            </h1>
                            <p className="page-subtitle">Jejak aktivitas sensitif sistem</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="data-card p-4 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari aksi, user, atau detail..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                            />
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="data-card">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Loading audit logs...</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                <AlertCircle size={44} className="mb-2 opacity-20" />
                                <p>Tidak ada data audit log ditemukan.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Waktu</th>
                                            <th>User</th>
                                            <th>Aksi</th>
                                            <th>Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                                                        <Clock size={13} />
                                                        {new Date(log.created_at).toLocaleString('id-ID')}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="font-bold text-slate-800">{log.username || 'Unknown'}</span>
                                                    <p className="text-xs text-slate-400 font-mono">{log.user_id}</p>
                                                </td>
                                                <td>
                                                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${log.action.includes('DELETE') ? 'bg-red-50 text-red-700' :
                                                        log.action.includes('UPDATE') ? 'bg-blue-50 text-blue-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="text-sm text-slate-500 font-mono max-w-xs truncate">
                                                    {JSON.stringify(log.details)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
