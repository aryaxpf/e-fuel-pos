'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import {
    Fuel, ArrowRightLeft, ClipboardList, Package, BarChart3,
    Settings, ShieldCheck, Wallet, Users, AlertTriangle, Zap,
    TrendingUp, Activity
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, RadialBarChart, RadialBar, Cell
} from 'recharts';

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [currentStock, setCurrentStock] = useState(0);
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [alerts, setAlerts] = useState<{ message: string; type: 'warning' | 'danger' }[]>([]);

    // Analytics State
    const [hourlyData, setHourlyData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [operatorData, setOperatorData] = useState<any[]>([]);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

    const TANK_CAPACITY = 2000; // Assume 2000L tank capacity

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadDashboard();
            loadAnalytics();
        }
    }, [user]);

    const loadDashboard = async () => {
        try {
            const stock = await StorageService.getCurrentStock();
            setCurrentStock(stock);

            const shift = await StorageService.getCurrentShift(user!.id);
            setCurrentShift(shift);

            // Generate smart alerts
            const newAlerts: typeof alerts = [];
            if (stock <= 5) {
                newAlerts.push({ message: `Stok kritis! Tersisa ${stock.toFixed(1)} Liter`, type: 'danger' });
            } else if (stock <= 20) {
                newAlerts.push({ message: `Stok menipis: ${stock.toFixed(1)} Liter`, type: 'warning' });
            }
            if (!shift) {
                newAlerts.push({ message: 'Belum ada shift aktif. Mulai shift terlebih dahulu.', type: 'warning' });
            }
            setAlerts(newAlerts);

            // Pending requests count (admin only)
            if (user?.role === 'admin') {
                try {
                    const requests = await StorageService.getRequests();
                    const pending = requests.filter((r: any) => r.status === 'PENDING');
                    setPendingCount(pending.length);
                } catch { }
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    };

    const loadAnalytics = async () => {
        try {
            setIsAnalyticsLoading(true);
            const hourly = await StorageService.getTransactionsByHour(new Date());
            setHourlyData(hourly);

            const revenue = await StorageService.getRevenueAndProfitByDay(7);
            setRevenueData(revenue.reverse()); // Chronological order

            const ops = await StorageService.getOperatorPerformance(24);
            setOperatorData(ops);
        } catch (error) {
            console.error('Analytics load error:', error);
        } finally {
            setIsAnalyticsLoading(false);
        }
    };

    if (loading || !user) return null;

    // Helper for Custom Tooltip
    const CustomTooltip = ({ active, payload, label, prefix = '' }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {prefix}{entry.value.toLocaleString('id-ID')}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="page-container page-fade-in">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                {/* --- Header --- */}
                <div className="mb-6">
                    <div className="data-card p-5 relative overflow-hidden" style={{ borderTop: '3px solid var(--accent)' }}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                    Halo, <span style={{ color: 'var(--accent)' }}>{user.username}</span> ({user.role})
                                </p>
                                <h1 className="page-title mt-1">Dashboard Ops</h1>
                            </div>
                            <button
                                onClick={async () => { await logout(); router.push('/login'); }}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Smart Alerts --- */}
                {alerts.length > 0 && (
                    <div className="space-y-3 mb-6">
                        {alerts.map((alert, i) => (
                            <div key={i} className="alert-card animate-pulse" style={{
                                background: alert.type === 'danger' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                                borderColor: alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)',
                            }}>
                                <AlertTriangle size={18} style={{ color: alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
                                <span className="text-sm font-bold" style={{ color: alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)' }}>
                                    {alert.message}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- Quick Actions / Main Menu (Horizontal Scroll on Mobile) --- */}
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Zap size={20} style={{ color: 'var(--accent)' }} /> Quick Actions
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
                    <Link href="/pos" className="menu-card group !p-4">
                        <div className="menu-card-icon !w-12 !h-12 !rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <Zap size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>POS Kasir</h3>
                        </div>
                    </Link>
                    <Link href="/shift/start" className="menu-card group !p-4">
                        <div className="menu-card-icon !w-12 !h-12 !rounded-xl" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                            <ClipboardList size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Mulai Shift</h3>
                        </div>
                    </Link>
                    <Link href="/stock" className="menu-card group !p-4">
                        <div className="menu-card-icon !w-12 !h-12 !rounded-xl" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                            <Package size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Restock</h3>
                        </div>
                    </Link>
                    <Link href="/shift/end" className="menu-card group !p-4">
                        <div className="menu-card-icon !w-12 !h-12 !rounded-xl" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                            <ArrowRightLeft size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Tutup Shift</h3>
                        </div>
                    </Link>
                    <Link href="/expenses" className="menu-card group !p-4">
                        <div className="menu-card-icon !w-12 !h-12 !rounded-xl" style={{ background: '#FFF3E0', color: '#E65100' }}>
                            <Wallet size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Pengeluaran</h3>
                        </div>
                    </Link>
                    {user.role === 'admin' && (
                        <Link href="/admin" className="menu-card group !p-4">
                            <div className="menu-card-icon !w-12 !h-12 !rounded-xl" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                <Settings size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Admin</h3>
                            </div>
                        </Link>
                    )}
                </div>

                {/* =========================================
                    ANALYTICS DASHBOARD SECTION
                    ========================================= */}

                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Activity size={20} style={{ color: 'var(--accent)' }} /> Analisis Kinerja
                </h2>

                {isAnalyticsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="skeleton h-64 rounded-2xl"></div>
                        <div className="skeleton h-64 rounded-2xl"></div>
                        <div className="skeleton h-64 rounded-2xl"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">

                        {/* 1. Real-time Stock Monitor (Tank Visualization) */}
                        <div className="data-card p-5 flex flex-col items-center justify-center relative">
                            <h3 className="font-bold text-sm mb-4 w-full text-left" style={{ color: 'var(--text-secondary)' }}>Status Tangki Pendam</h3>
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart
                                        cx="50%" cy="50%"
                                        innerRadius="70%" outerRadius="100%"
                                        barSize={15}
                                        data={[{ name: 'Stok', value: (currentStock / TANK_CAPACITY) * 100, fill: currentStock > 500 ? 'var(--success)' : currentStock > 200 ? 'var(--warning)' : 'var(--danger)' }]}
                                        startAngle={210}
                                        endAngle={-30}
                                    >
                                        <RadialBar background dataKey="value" cornerRadius={10} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="absolute flex flex-col items-center justify-center mt-4">
                                    <Fuel size={24} style={{ color: currentStock > 500 ? 'var(--success)' : currentStock > 200 ? 'var(--warning)' : 'var(--danger)', marginBottom: '4px' }} />
                                    <span className="text-3xl font-bold font-mono-num" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>{currentStock.toFixed(0)}</span>
                                    <span className="text-xs font-bold uppercase mt-1" style={{ color: 'var(--text-muted)' }}>Liter</span>
                                </div>
                            </div>
                            <div className="w-full flex justify-between text-xs mt-4 px-4 font-mono-num" style={{ color: 'var(--text-muted)' }}>
                                <span>0L</span>
                                <span>Kapasitas: {TANK_CAPACITY}L</span>
                            </div>
                        </div>

                        {/* 2. Heatmap Penjualan Teramai (Bar Chart) */}
                        <div className="data-card p-5 lg:col-span-2 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Heatmap Penjualan Teramai (Hari Ini)</h3>
                                <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>Liter per Jam</span>
                            </div>
                            <div className="flex-1 w-full min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                        <Tooltip content={<CustomTooltip prefix="" />} cursor={{ fill: 'var(--bg-elevated)' }} />
                                        <Bar dataKey="volume" name="Volume (Liter)" radius={[4, 4, 0, 0]}>
                                            {hourlyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.volume > 50 ? 'var(--accent)' : 'var(--accent-soft)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Revenue vs Profit Margin (Area Chart) */}
                        <div className="data-card p-5 lg:col-span-2 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Omzet vs Profit (7 Hari Terakhir)</h3>
                                <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                            </div>
                            <div className="flex-1 w-full min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip content={<CustomTooltip prefix="Rp " />} />
                                        <Area type="monotone" dataKey="revenue" name="Omzet" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                        <Area type="monotone" dataKey="profit" name="Profit Bersih" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 4. Operator Performance (Table) */}
                        <div className="data-card overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Performa Operator (24 Jam)</h3>
                                <Users size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div className="overflow-x-auto flex-1 p-2">
                                <table className="data-table w-full">
                                    <thead>
                                        <tr>
                                            <th>Nama</th>
                                            <th className="text-right">Volume</th>
                                            <th className="text-right">Trans/Void</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {operatorData.length > 0 ? operatorData.map((op, i) => (
                                            <tr key={i}>
                                                <td className="font-bold flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                                                        {op.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    {op.username}
                                                </td>
                                                <td className="text-right font-mono-num font-bold text-slate-800 dark:text-slate-200">
                                                    {op.volume.toFixed(1)}L
                                                </td>
                                                <td className="text-right">
                                                    <span className="text-slate-600 dark:text-slate-400">{op.count}</span>
                                                    <span className="text-slate-300 mx-1">/</span>
                                                    <span className={op.voids > 0 ? "text-red-500 font-bold" : "text-green-500"}>{op.voids}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-slate-400">Belum ada data 24 jam terakhir</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
