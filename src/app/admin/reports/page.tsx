'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';
import { ArrowLeft, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { StorageService, TransactionRecord } from '../../../services/storage';
import { exportToExcel } from '../../../lib/export';

export default function ReportsPage() {
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [summary, setSummary] = useState({ totalMoney: 0, totalLiter: 0, totalProfit: 0 });
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

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
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
