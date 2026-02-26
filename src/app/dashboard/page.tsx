'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import {
    Fuel, ArrowRightLeft, ClipboardList, Package, BarChart3,
    Settings, ShieldCheck, Wallet, Users, AlertTriangle, Zap,
    TrendingUp, Activity, RefreshCw, Clock, X, CreditCard, CalendarDays
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { SyncService } from '../../services/sync';
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

    const [isPosModalOpen, setIsPosModalOpen] = useState(false);
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);

    // Analytics State
    const [hourlyData, setHourlyData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [operatorData, setOperatorData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

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
                newAlerts.push({ message: 'Mengalihkan ke halaman Mulai Shift...', type: 'warning' });
                setAlerts(newAlerts);
                router.push('/shift/start');
                return;
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

            const topSales = await StorageService.getTopSellingProducts(30);
            setTopProducts(topSales);
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
                                <h1 className="page-title mt-1">Smart POS Dashboard</h1>
                            </div>
                            <button
                                onClick={() => router.push('/shift/end')}
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
                    <div onClick={() => setIsPosModalOpen(true)} className="group cursor-pointer menu-card !p-4 flex flex-col items-start justify-start transition-all hover:scale-105 active:scale-95">
                        <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <Zap size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Sistem POS</h3>
                        </div>
                    </div>

                    <div onClick={() => setIsMgmtModalOpen(true)} className="group cursor-pointer menu-card !p-4 flex flex-col items-start justify-start transition-all hover:scale-105 active:scale-95">
                        <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                            <Package size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Manajemen Barang</h3>
                        </div>
                    </div>

                    <Link href="/expenses" className="menu-card group !p-4 flex flex-col items-start justify-start">
                        <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FFF3E0', color: '#E65100' }}>
                            <Wallet size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Pengeluaran</h3>
                        </div>
                    </Link>

                    <Link href="/debts" className="menu-card group !p-4 flex flex-col items-start justify-start">
                        <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                            <CreditCard size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Kasbon</h3>
                        </div>
                    </Link>

                    <Link href="/history" className="menu-card group !p-4 flex flex-col items-start justify-start">
                        <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <Clock size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Riwayat Trx</h3>
                        </div>
                    </Link>

                    <Link href="/shift/history" className="menu-card group !p-4 flex flex-col items-start justify-start">
                        <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                            <CalendarDays size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Riwayat Shift</h3>
                        </div>
                    </Link>

                    {user.role === 'admin' && (
                        <>

                            <Link href="/admin" className="menu-card group !p-4 flex flex-col items-start justify-start">
                                <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                    <Settings size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Admin</h3>
                                </div>
                            </Link>

                            <Link href="/audit" className="menu-card group !p-4 flex flex-col items-start justify-start">
                                <div className="menu-card-icon w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Security Log</h3>
                                </div>
                            </Link>
                        </>
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

                        {/* 3. Revenue vs Profit (Split Bensin & Barang) */}
                        <div className="data-card p-5 lg:col-span-2 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Omzet vs Profit (7 Hari Terakhir)</h3>
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-blue-50 text-blue-600">Bensin</span>
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-purple-50 text-purple-600">Barang</span>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-[220px] grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Bensin Chart */}
                                <div className="h-full w-full">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-center gap-1"><Fuel size={12} /> Bahan Bakar</h4>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <AreaChart data={revenueData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorFuelRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorFuelProf" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                            <Tooltip content={<CustomTooltip prefix="Rp " />} />
                                            <Area type="monotone" dataKey="fuelRevenue" name="Omzet Bensin" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFuelRev)" />
                                            <Area type="monotone" dataKey="fuelProfit" name="Profit Bensin" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFuelProf)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Barang Chart */}
                                <div className="h-full w-full">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-center gap-1"><Package size={12} /> Katalog Barang</h4>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <AreaChart data={revenueData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorProdRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorProdProf" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                            <Tooltip content={<CustomTooltip prefix="Rp " />} />
                                            <Area type="monotone" dataKey="productRevenue" name="Omzet Barang" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorProdRev)" />
                                            <Area type="monotone" dataKey="productProfit" name="Profit Barang" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorProdProf)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
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
                                            <th className="text-right">Bensin (L)</th>
                                            <th className="text-right">Barang (Trx)</th>
                                            <th className="text-right">Trx Bensin</th>
                                            <th className="text-right">Batal (Void)</th>
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
                                                    {op.fuelVolume.toFixed(1)}L
                                                </td>
                                                <td className="text-right font-mono-num font-bold text-slate-800 dark:text-slate-200" style={{ color: 'var(--warning)' }}>
                                                    {op.productCount}x
                                                </td>
                                                <td className="text-right text-slate-600 dark:text-slate-400">
                                                    {op.fuelCount}
                                                </td>
                                                <td className="text-right">
                                                    <span className={(op.fuelVoids + op.productVoids) > 0 ? "text-red-500 font-bold" : "text-green-500"}>{op.fuelVoids + op.productVoids}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-slate-400">Belum ada data 24 jam terakhir</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 5. Top Selling Products (Bar/List) */}
                        <div className="data-card overflow-hidden flex flex-col lg:col-span-2">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/10">
                                <h3 className="font-bold text-sm" style={{ color: 'var(--emerald-700)' }}>Barang Terlaris (30 Hari)</h3>
                                <Package size={16} style={{ color: 'var(--emerald-600)' }} />
                            </div>
                            <div className="overflow-x-auto flex-1 p-2">
                                <table className="data-table w-full">
                                    <thead>
                                        <tr>
                                            <th>Nama Barang</th>
                                            <th className="text-right">Terjual</th>
                                            <th className="text-right">Total Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.length > 0 ? topProducts.map((p, i) => (
                                            <tr key={i}>
                                                <td className="font-bold text-slate-800 dark:text-slate-200">
                                                    {p.name}
                                                </td>
                                                <td className="text-right font-mono-num font-bold" style={{ color: 'var(--emerald-600)' }}>
                                                    {p.quantity} <span className="text-xs font-normal">PCS/SET</span>
                                                </td>
                                                <td className="text-right font-mono-num text-slate-600 dark:text-slate-400">
                                                    Rp {p.revenue.toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-slate-400">Belum ada penjualan barang.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
            </main>

            {/* Modals for Menus */}
            {isPosModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsPosModalOpen(false)}>
                    <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Pilih Sistem POS</h3>
                            <button onClick={() => setIsPosModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            <Link href="/pos" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-slate-200/50 dark:border-slate-700">
                                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400">
                                    <Fuel size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>POS Bensin</h4>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Mulai penjualan bahan bakar literan</p>
                                </div>
                            </Link>
                            <Link href="/pos/sparepart" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-slate-200/50 dark:border-slate-700">
                                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-900/30 dark:text-purple-400">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>POS Barang</h4>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Mulai penjualan sparepart & minuman</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {isMgmtModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsMgmtModalOpen(false)}>
                    <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Pilih Manajemen</h3>
                            <button onClick={() => setIsMgmtModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            {user?.role === 'admin' && (
                                <Link href="/product" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-slate-200/50 dark:border-slate-700">
                                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400">
                                        <ClipboardList size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>Katalog Barang</h4>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Kelola produk, edit harga, dan restock</p>
                                    </div>
                                </Link>
                            )}
                            <Link href="/stock" className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-slate-200/50 dark:border-slate-700">
                                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
                                    <ArrowRightLeft size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>Log Restock</h4>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Pantau sejarah masuk keluar barang</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
