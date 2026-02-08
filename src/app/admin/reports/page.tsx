'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';
import { ArrowLeft, Download, RefreshCw, FileSpreadsheet, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { StorageService, TransactionRecord } from '../../../services/storage';
import { exportToExcel } from '../../../lib/export';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [summary, setSummary] = useState({ totalMoney: 0, totalLiter: 0, totalProfit: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await StorageService.getTransactions();
            setTransactions(data);

            // Calculate Summary
            const sum = data.reduce(
                (acc, curr) => ({
                    totalMoney: acc.totalMoney + curr.nominal,
                    totalLiter: acc.totalLiter + curr.liter,
                    totalProfit: acc.totalProfit + curr.profit,
                }),
                { totalMoney: 0, totalLiter: 0, totalProfit: 0 }
            );
            setSummary(sum);

            // Prepare Chart Data (Group by Date)
            const grouped = data.reduce((acc: any, curr) => {
                const date = new Date(curr.timestamp).toLocaleDateString('id-ID'); // DD/MM/YYYY
                if (!acc[date]) {
                    acc[date] = { date, sales: 0, profit: 0 };
                }
                acc[date].sales += curr.nominal;
                acc[date].profit += curr.profit;
                return acc;
            }, {});

            // Convert to array and reverse (oldest first) for chart
            const chart = Object.values(grouped).reverse();
            setChartData(chart);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExport = () => {
        exportToExcel(transactions);
    };

    const handleDelete = async (id: string, liter: number, nominal: number) => {
        if (confirm(`Yakin ingin MENGHAPUS transaksi Rp ${nominal.toLocaleString()}?\n\nStok akan dikembalikan sebanyak ${liter} Liter.`)) {
            try {
                await StorageService.deleteTransaction(id, liter, nominal);
                alert('Transaksi Dihapus & Stok Dikembalikan.');
                fetchData(); // Refresh data
            } catch (error) {
                console.error(error);
                alert('Gagal menghapus transaksi.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
                        <ArrowLeft size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-slate-800">Laporan Penjualan</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchData}
                                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm active:scale-95"
                            >
                                <FileSpreadsheet size={20} />
                                Download Excel
                            </button>
                        </div>

                    </div>
                </header>

                {/* --- Summary Cards --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">Total Omzet</p>
                        <p className="text-2xl font-bold text-slate-800">Rp {summary.totalMoney.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">Total Volume Keluar</p>
                        <p className="text-2xl font-bold text-blue-600">{summary.totalLiter.toFixed(2)} Liter</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">Total Profit Bersih</p>
                        <p className="text-2xl font-bold text-green-600">+ Rp {summary.totalProfit.toLocaleString()}</p>
                    </div>
                </div>

                {/* --- Sales Chart --- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 h-80">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Grafik Penjualan</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: 'none' }}
                                itemStyle={{ color: '#1e293b' }}
                                formatter={(val: number) => `Rp ${val.toLocaleString()}`}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" name="Omzet" strokeWidth={2} />
                            <Area type="monotone" dataKey="profit" stroke="#22c55e" fillOpacity={1} fill="url(#colorProfit)" name="Profit" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* --- Transaction Table --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Waktu</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Nominal</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Volume</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Profit</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Tipe</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            Belum ada transaksi hari ini.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4 text-slate-600 text-sm">
                                                {new Date(t.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">Rp {t.nominal.toLocaleString()}</td>
                                            <td className="p-4 text-blue-600 font-medium">{t.liter} L</td>
                                            <td className="p-4 text-green-600">+ {t.profit.toLocaleString()}</td>
                                            <td className="p-4">
                                                {t.isSpecialRule ? (
                                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                                                        Paket
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs">
                                                        Standard
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(t.id, t.liter, t.nominal)}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                                    title="Hapus / Void Transaksi"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
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
