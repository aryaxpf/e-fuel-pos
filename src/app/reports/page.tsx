'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { ArrowLeft, Download, RefreshCw, FileSpreadsheet, Trash2, ShieldAlert, X, ArrowUpCircle, ArrowDownCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import { StorageService, TransactionRecord, InventoryLog } from '../../services/storage';
import { exportToExcel } from '../../lib/export';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import Toast, { ToastType } from '../../components/Toast';

// Unified Tape Type
type UnifiedRecord = {
    id: string;
    timestamp: string;
    type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
    nominal: number;
    liter: number;
    profit?: number;
    details: string;
    isSpecial?: boolean;
    originalData: any;
};

export default function ReportsPage() {
    const { user } = useAuth();
    const [unifiedData, setUnifiedData] = useState<UnifiedRecord[]>([]);
    const [summary, setSummary] = useState({
        totalMoney: 0,
        totalLiter: 0,
        totalProfit: 0,
        totalRestock: 0,
        totalOpEx: 0,
        netProfit: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
    const [hourlyHeatmap, setHourlyHeatmap] = useState<any[]>([]);

    // Phase 28: Advanced Analytics State
    const [timeRange, setTimeRange] = useState<'shift' | '7d' | '30d' | 'month'>('7d');
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [profitTrend, setProfitTrend] = useState<any[]>([]);
    const [paymentStats, setPaymentStats] = useState<any[]>([]);

    // Store RAW data for client-side filtering
    const [rawTransactions, setRawTransactions] = useState<TransactionRecord[]>([]);
    const [rawInventory, setRawInventory] = useState<InventoryLog[]>([]);
    const [rawExpenses, setRawExpenses] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<'daily' | 'analytics'>('daily');
    const [loading, setLoading] = useState(true);

    // Request Modal State
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<UnifiedRecord | null>(null);
    const [requestReason, setRequestReason] = useState('');

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [transactions, inventory, expenses, shift] = await Promise.all([
                StorageService.getTransactions(),
                StorageService.getInventoryLogs(),
                StorageService.getExpenses(),
                user?.id ? StorageService.getCurrentShift(user.id) : Promise.resolve(null)
            ]);

            setRawTransactions(transactions);
            setRawInventory(inventory);
            setRawExpenses(expenses);
            setCurrentShift(shift);

            // Default to 'shift' if active, otherwise '7d'
            // Only set this on initial load to avoid overriding user choice
            if (shift && timeRange === '7d') {
                setTimeRange('shift');
                processData(transactions, inventory, expenses, 'shift', shift);
            } else {
                processData(transactions, inventory, expenses, timeRange, shift);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const processData = (
        transactions: TransactionRecord[],
        inventory: InventoryLog[],
        expenses: any[],
        range: 'shift' | '7d' | '30d' | 'month',
        shift: any
    ) => {
        // 1. Determine Date Cutoff
        const now = new Date();
        let cutoff = new Date();
        let isShiftMode = false;

        if (range === 'shift' && shift) {
            cutoff = new Date(shift.start_time);
            isShiftMode = true;
        } else if (range === '7d') {
            cutoff.setDate(now.getDate() - 6); // Last 7 days including today
            cutoff.setHours(0, 0, 0, 0);
        } else if (range === '30d') {
            cutoff.setDate(now.getDate() - 29);
            cutoff.setHours(0, 0, 0, 0);
        } else if (range === 'month') {
            cutoff = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of this month
        } else if (range === 'shift' && !shift) {
            // Fallback if user selected 'shift' but no active shift (e.g. forced via UI)
            // Just show today or empty? Let's show Today
            cutoff = new Date();
            cutoff.setHours(0, 0, 0, 0);
        }

        // 2. Filter Data
        const filteredTx = transactions.filter(t => new Date(t.timestamp) >= cutoff);
        // For Inventory and Expenses, we also filter by time
        const filteredInv = inventory.filter(i => new Date(i.date) >= cutoff);
        const filteredExp = expenses.filter(e => new Date(e.date) >= cutoff);

        // 3. Transform to Unified Records (for Table)
        const txRecords: UnifiedRecord[] = filteredTx.map(t => ({
            id: t.id,
            timestamp: t.timestamp,
            type: 'SALE',
            nominal: t.nominal,
            liter: t.liter,
            profit: t.profit,
            details: t.isSpecialRule ? 'Paket Hemat' : 'Standard',
            isSpecial: t.isSpecialRule,
            originalData: t
        }));

        const stockRecords: UnifiedRecord[] = filteredInv
            .filter(i => i.type === 'IN')
            .map(i => ({
                id: i.id,
                timestamp: i.date,
                type: 'RESTOCK',
                nominal: -Math.abs(i.costPerLiter * i.volume),
                liter: i.volume,
                profit: 0,
                details: i.notes || 'Restock Modal',
                originalData: i
            }));

        const allData = [...txRecords, ...stockRecords].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setUnifiedData(allData);

        // 4. Calculate Summaries
        const totalMoney = filteredTx.reduce((acc, curr) => acc + curr.nominal, 0);
        const totalLiter = filteredTx.reduce((acc, curr) => acc + curr.liter, 0);
        const totalProfitSales = filteredTx.reduce((acc, curr) => acc + curr.profit, 0);
        const totalRestock = stockRecords.reduce((acc, curr) => acc + Math.abs(curr.nominal), 0);
        const totalOpEx = filteredExp.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const netProfit = totalProfitSales - totalOpEx;

        setSummary({
            totalMoney,
            totalLiter,
            totalProfit: totalProfitSales,
            totalRestock,
            totalOpEx,
            netProfit
        });

        // 5. Advanced Analytics

        // A. Weekly/Daily Trend (Bar Chart) - Group by Date
        const dateMap = new Map<string, number>();
        filteredTx.forEach(t => {
            const dateKey = new Date(t.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + t.nominal);
        });

        const trendData: any[] = [];
        // If shift mode, just show Today / Start Time bucket? Or simple hourly?
        // Let's stick to standard daily grouping for charts, or generic buckets
        if (isShiftMode) {
            // For shift, maybe just show single bar or hourly within shift?
            // Let's just map existing keys
            dateMap.forEach((val, key) => trendData.push({ date: key, amount: val }));
        } else {
            // Standard iteration
            const daysToIterate = range === '7d' ? 7 : range === '30d' ? 30 : new Date().getDate();
            for (let d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
                const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                trendData.push({
                    date: key,
                    amount: dateMap.get(key) || 0
                });
            }
        }
        setWeeklyTrend(trendData);

        // B. Hourly Heatmap (Bar Chart)
        const hourMap = new Array(24).fill(0);
        filteredTx.forEach(t => {
            const h = new Date(t.timestamp).getHours();
            hourMap[h] += t.nominal;
        });
        setHourlyHeatmap(hourMap.map((v, i) => ({ hour: `${i}:00`, amount: v })));

        // C. Profit Trend (Line Chart: Revenue vs Net Profit)
        const profitMap = new Map<string, { revenue: number, cost: number, opex: number }>();

        // Init map (skip for shift mode to avoid large empty range)
        if (!isShiftMode) {
            for (let d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
                const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                profitMap.set(key, { revenue: 0, cost: 0, opex: 0 });
            }
        }

        filteredTx.forEach(t => {
            const key = new Date(t.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            if (!profitMap.has(key) && isShiftMode) profitMap.set(key, { revenue: 0, cost: 0, opex: 0 });

            if (profitMap.has(key)) {
                const entry = profitMap.get(key)!;
                entry.revenue += t.nominal;
                entry.cost += (t.nominal - t.profit);
            }
        });

        filteredExp.forEach(e => {
            const key = new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            if (!profitMap.has(key) && isShiftMode) profitMap.set(key, { revenue: 0, cost: 0, opex: 0 });

            if (profitMap.has(key)) {
                profitMap.get(key)!.opex += e.amount;
            }
        });

        const profitData = Array.from(profitMap.entries()).map(([date, val]) => ({
            date,
            revenue: val.revenue,
            netProfit: val.revenue - val.cost - val.opex
        }));
        setProfitTrend(profitData);

        // D. Payment Stats (Pie Chart)
        const payMap = { Cash: 0, Debt: 0 };
        filteredTx.forEach(t => {
            if (t.paymentMethod === 'DEBT') payMap.Debt += 1;
            else payMap.Cash += 1;
        });
        setPaymentStats([
            { name: 'Tunai', value: payMap.Cash, color: '#22c55e' },
            { name: 'Kasbon', value: payMap.Debt, color: '#ef4444' }
        ]);

        // E. Hourly Chart (For Daily Tab) - IF Shift mode, use filteredTx, else use Today
        let chartSourceTx = transactions;
        if (isShiftMode) {
            chartSourceTx = filteredTx;
        } else {
            const todayStr = new Date().toDateString();
            chartSourceTx = transactions.filter(t => new Date(t.timestamp).toDateString() === todayStr);
        }

        const todayHourly = new Array(24).fill(0);
        chartSourceTx.forEach(t => todayHourly[new Date(t.timestamp).getHours()] += t.nominal);
        setChartData(todayHourly.map((v, i) => ({ date: `${i}:00`, sales: v })));
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Re-run processData when timeRange changes (using raw data)
    useEffect(() => {
        if (rawTransactions.length > 0 || rawInventory.length > 0) {
            processData(rawTransactions, rawInventory, rawExpenses, timeRange, currentShift);
        }
    }, [timeRange, rawTransactions, rawInventory, rawExpenses, currentShift]);

    const handleExportExcel = () => {
        exportToExcel(unifiedData);
    };

    const handleExportWA = () => {
        const title = timeRange === 'shift' && currentShift
            ? `*Laporan Shift (${user?.username})*`
            : `*Laporan Harian E-Fuel POS*`;

        const text = `${title}\n\n` +
            `📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n` +
            `💰 Total Omzet: Rp ${summary.totalMoney.toLocaleString()}\n` +
            `📦 Total Restock: Rp ${summary.totalRestock.toLocaleString()}\n` +
            `💸 Total Operasional: Rp ${summary.totalOpEx.toLocaleString()}\n` +
            `--------\n` +
            `📈 Gross Profit: Rp ${summary.totalProfit.toLocaleString()}\n` +
            `💵 Net Profit (Laba Bersih): Rp ${summary.netProfit.toLocaleString()}\n\n` +
            `_Digenerate otomatis oleh sistem_`;

        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleActionClick = (item: UnifiedRecord) => {
        if (user?.role === 'admin') {
            // Admin Direct Action
            if (item.type === 'SALE') {
                if (confirm(`ADMIN: Hapus Transaksi Rp ${item.nominal.toLocaleString()}?`)) {
                    performDeleteTransaction(item.id, item.liter, item.nominal);
                }
            } else if (item.type === 'RESTOCK') {
                if (confirm(`ADMIN: Hapus Restock ${item.liter} Liter?`)) {
                    performDeleteInventory(item.id);
                }
            }
        } else {
            // Cashier Request
            setSelectedItem(item);
            setRequestReason('');
            setShowRequestModal(true);
        }
    };

    const performDeleteTransaction = async (id: string, liter: number, nominal: number) => {
        try {
            await StorageService.deleteTransaction(id, liter, nominal);
            setToast({ message: 'Transaksi Berhasil Dihapus.', type: 'success' });
            fetchData();
        } catch (error: any) {
            console.error('Delete Transaction Error:', error);
            setToast({ message: `Gagal menghapus transaksi: ${error.message}`, type: 'error' });
        }
    };

    const performDeleteInventory = async (id: string) => {
        try {
            await StorageService.deleteInventoryLog(id);
            setToast({ message: 'Log Restock Berhasil Dihapus.', type: 'success' });
            fetchData();
        } catch (error: any) {
            console.error('Delete Inventory Error:', error);
            setToast({ message: `Gagal menghapus log restock: ${error.message}`, type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative print:bg-white">
            <div className="print:hidden"><Navbar /></div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* --- Request Void/Edit Modal --- */}
            {showRequestModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowRequestModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ShieldAlert className="text-orange-500" />
                            Request Void/Edit
                        </h3>

                        <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm">
                            <p><strong>Item:</strong> {selectedItem.type}</p>
                            <p><strong>Nominal:</strong> Rp {Math.abs(selectedItem.nominal).toLocaleString()}</p>
                            <p><strong>Detail:</strong> {selectedItem.details}</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Alasan Request</label>
                            <textarea
                                value={requestReason}
                                onChange={(e) => setRequestReason(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                rows={3}
                                placeholder="Contoh: Salah input nominal..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={async () => {
                                    if (!requestReason.trim()) {
                                        setToast({ message: 'Mohon isi alasan request.', type: 'error' });
                                        return;
                                    }
                                    const payload = {
                                        ...selectedItem.originalData,
                                        reason: requestReason, // Include the reason!
                                        // Ensure ID is passed explicitly if missing in originalData type overlap
                                        id: selectedItem.id
                                    };

                                    try {
                                        await StorageService.addRequest(
                                            selectedItem.type === 'SALE' ? 'VOID_TRANSACTION' : 'VOID_INVENTORY',
                                            payload,
                                            user?.username || 'Unknown'
                                        );
                                        setToast({ message: 'Request terkirim ke Admin.', type: 'success' });
                                        setShowRequestModal(false);
                                    } catch (e: any) {
                                        setToast({ message: 'Gagal kirim request: ' + e.message, type: 'error' });
                                    }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Kirim Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8 print:hidden">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
                        <ArrowLeft size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-bold text-slate-800">Laporan & Aktivitas</h1>
                            {currentShift && (
                                <span className={`text-xs font-bold uppercase mt-1 ${timeRange === 'shift' ? 'text-green-600' : 'text-slate-400'}`}>
                                    {timeRange === 'shift' ? '● Mode Shift Aktif' : '● Mode Riwayat'}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value as any)}
                                className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                            >
                                {currentShift && <option value="shift">Shift Saat Ini</option>}
                                <option value="7d">7 Hari Terakhir</option>
                                <option value="30d">30 Hari Terakhir</option>
                                <option value="month">Bulan Ini</option>
                            </select>
                            <button onClick={handleExportWA} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-bold shadow-sm">
                                <span className="text-lg">📱</span> WA
                            </button>
                            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold shadow-sm">
                                <FileSpreadsheet size={18} /> Excel
                            </button>
                            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition font-bold shadow-sm">
                                🖨️ PDF/Print
                            </button>
                            <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                        </div>
                    </div>
                </header>

                {/* Print Header */}
                <div className="hidden print:block mb-8 text-center">
                    <h1 className="text-2xl font-bold">Laporan Harian E-Fuel POS</h1>
                    <p className="text-slate-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* --- Summary Cards --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {/* Row 1: Money In/Out */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:border-black">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Omzet (Bruto)</p>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">Rp {summary.totalMoney.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:border-black">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Restock (Modal)</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">Rp {summary.totalRestock.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:border-black">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Biaya Operasional</p>
                        </div>
                        <p className="text-2xl font-bold text-red-500">Rp {summary.totalOpEx.toLocaleString()}</p>
                    </div>

                    {/* Row 2: Profits */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:border-black bg-gradient-to-br from-green-50 to-white">
                        <p className="text-xs font-bold text-green-600 uppercase mb-1">Gross Profit (Margin BBM)</p>
                        <p className="text-2xl font-bold text-green-700">+ Rp {summary.totalProfit.toLocaleString()}</p>
                        <p className="text-[10px] text-green-500">Omzet - HPP (Modal Bensin)</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:border-black bg-gradient-to-br from-blue-50 to-white sm:col-span-2 lg:col-span-2">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Net Profit (Laba Bersih)</p>
                        <p className={`text-3xl font-bold ${summary.netProfit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                            Rp {summary.netProfit.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-blue-500">Gross Profit - Biaya Operasional</p>
                    </div>
                </div>

                {/* --- Tab Navigation --- */}
                <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`px-4 py-2 font-bold rounded-t-lg transition ${activeTab === 'daily' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Laporan Harian
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 font-bold rounded-t-lg transition ${activeTab === 'analytics' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Analitik Bisnis
                    </button>
                </div>

                {activeTab === 'daily' ? (
                    <>
                        {/* --- Sales Chart (Hourly for Today) --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 h-80 print:hidden">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Grafik Penjualan Hari Ini</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${val / 1000}k`} />
                                    <Tooltip formatter={(value: any) => [`Rp ${Number(value).toLocaleString()}`, 'Omzet']} />
                                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" name="Omzet" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* --- Unified Table --- */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-4 font-semibold text-slate-600 text-sm">Waktu</th>
                                            <th className="p-4 font-semibold text-slate-600 text-sm">Aktivitas</th>
                                            <th className="p-4 font-semibold text-slate-600 text-sm">Nominal/Nilai</th>
                                            <th className="p-4 font-semibold text-slate-600 text-sm">Volume</th>
                                            <th className="p-4 font-semibold text-slate-600 text-sm">Detail</th>
                                            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {unifiedData.length === 0 ? (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada data.</td></tr>
                                        ) : (
                                            unifiedData.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                                    <td className="p-4 text-slate-600 text-sm">
                                                        {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="p-4">
                                                        {item.type === 'SALE' ? (
                                                            <span className="inline-flex items-center gap-1 text-green-600 font-bold text-sm"><ArrowUpCircle size={16} /> Penjualan</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-purple-600 font-bold text-sm"><ArrowDownCircle size={16} /> Restock</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 font-medium text-slate-800">
                                                        {item.type === 'SALE' ? `Rp ${item.nominal.toLocaleString()}` : `-`}
                                                    </td>
                                                    <td className="p-4 text-blue-600 font-medium">{item.liter} L</td>
                                                    <td className="p-4 text-sm text-slate-500">{item.details}</td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            {item.type === 'SALE' && (
                                                                <button
                                                                    onClick={() => window.open(`/receipt/${item.id}`, '_blank', 'width=400,height=600')}
                                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition"
                                                                    title="Cetak Struk"
                                                                >
                                                                    <Printer size={18} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleActionClick(item)}
                                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                                                title={user?.role === 'admin' ? "Hapus" : "Request Void"}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    /* --- ANALYTICS TAB --- */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Weekly Trend Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Tren Omzet 7 Hari Terakhir</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" fontSize={12} />
                                        <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString()}`} />
                                        <Bar dataKey="amount" fill="#3b82f6" name="Omzet" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Hourly Heatmap Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Jam Tersibuk (Total Omzet)</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyHeatmap}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="hour" fontSize={12} />
                                        <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString()}`} />
                                        <Bar dataKey="amount" fill="#f59e0b" name="Omzet" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Profit Trend (Line Chart) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Tren Profitabilitas (Gross vs Net)</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={profitTrend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" fontSize={12} />
                                        <YAxis fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString()}`} />
                                        <Legend />
                                        <Line type="monotone" dataKey="revenue" stroke="#94a3b8" name="Revenue" dot={false} strokeWidth={1} />
                                        <Line type="monotone" dataKey="netProfit" stroke="#3b82f6" name="Net Profit" strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Payment Stats (Pie Chart) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Metode Pembayaran (Cash vs Kasbon)</h3>
                            <div className="h-80 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paymentStats}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {paymentStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
