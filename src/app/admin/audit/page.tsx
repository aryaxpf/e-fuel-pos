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
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Shield className="text-blue-600" /> Audit Logs
                            </h1>
                            <p className="text-slate-500 text-sm">Jejak aktivitas sensitif sistem</p>
                        </div>
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
                            <ArrowLeft size={18} /> Dashboard
                        </Link>
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Cari aksi, user, atau detail..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading audit logs...</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                <AlertCircle size={48} className="mb-2 opacity-20" />
                                <p>Tidak ada data audit log ditemukan.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Waktu</th>
                                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">User</th>
                                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Aksi</th>
                                            <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} />
                                                        {new Date(log.created_at).toLocaleString('id-ID')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-slate-800">{log.username || 'Unknown'}</span>
                                                    <p className="text-xs text-slate-400 font-mono">{log.user_id}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${log.action.includes('DELETE') ? 'bg-red-100 text-red-700' :
                                                            log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 font-mono">
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
