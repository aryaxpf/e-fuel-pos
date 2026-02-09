'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Fuel, Users, BarChart3, ShoppingCart, LogOut, ShieldCheck, Settings, Wallet } from 'lucide-react';
import Link from 'next/link';
import { StorageService } from '../../services/storage';

export default function DashboardPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const [alertRestock, setAlertRestock] = useState(false);
    const [aiPrediction, setAiPrediction] = useState<string | null>(null);
    const [shiftRecommendation, setShiftRecommendation] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [currentShift, setCurrentShift] = useState<any>(null);

    // Protect Route & Check Shift
    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else {
                // Check Shift
                const checkShift = async () => {
                    const shift = await StorageService.getCurrentShift(user.id || 'unknown');
                    if (!shift) {
                        router.push('/shift/start');
                    } else {
                        setCurrentShift(shift);
                    }
                };
                checkShift();

                // Advanced Analytics & AI Logic
                const runAnalysis = async () => {
                    const transactions = await StorageService.getTransactions();
                    const today = new Date().toDateString();

                    // 1. Restock Alert (Sales >= 7 Liters Today)
                    const todaySalesLiters = transactions
                        .filter(t => new Date(t.timestamp).toDateString() === today)
                        .reduce((acc, t) => acc + (t.liter || 0), 0);

                    setAlertRestock(todaySalesLiters >= 7);

                    // 2. AI Stock Prediction
                    // Simple Moving Average Logic
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    const recentSales = transactions.filter(t => new Date(t.timestamp) >= sevenDaysAgo);
                    const totalRecentLiters = recentSales.reduce((acc, t) => acc + (t.liter || 0), 0);
                    const avgDailyLiters = totalRecentLiters / 7;

                    // Get Current Stock (Mocked or Real)
                    const logs = await StorageService.getInventoryLogs();
                    const currentStock = logs.reduce((acc, log) => acc + (log.type === 'IN' ? log.volume : -log.volume), 0);

                    if (avgDailyLiters > 0 && currentStock < (avgDailyLiters * 2)) {
                        setAiPrediction(`Stok Pertalite diprediksi habis dalam ${(currentStock / avgDailyLiters).toFixed(1)} hari.`);
                    } else {
                        setAiPrediction(null);
                    }

                    // 3. Shift Recommendation (Busy Hours)
                    const hourCounts = new Array(24).fill(0);
                    transactions.forEach(t => {
                        const hour = new Date(t.timestamp).getHours();
                        hourCounts[hour]++;
                    });
                    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
                    if (Math.max(...hourCounts) > 5) { // Threshold
                        setShiftRecommendation(`Jam tersibuk pukul ${maxHour}:00. Disarankan tambah kasir.`);
                    } else {
                        setShiftRecommendation(null);
                    }
                };
                runAnalysis();

                if (user.role === 'admin') {
                    // Fetch Pending Requests Count
                    StorageService.getRequests().then(reqs => {
                        const pending = reqs.filter((r: any) => r.status === 'PENDING').length;
                        setPendingCount(pending);
                    });
                }
            }
        }
    }, [user, loading, router]);

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-slate-100">Loading...</div>;


    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                            <Fuel size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 leading-tight">E-Fuel POS</h1>
                            <p className="text-xs text-slate-500">
                                Halo, <span className="font-bold text-blue-600">{user.username}</span> ({user.role})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentShift && (
                            <Link
                                href="/shift/end"
                                className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition"
                            >
                                Tutup Shift
                            </Link>
                        )}
                        <button onClick={logout} className="text-slate-400 hover:text-red-500 p-2 rounded-full transition" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-6">

                {currentShift && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-blue-500 font-bold uppercase">Shift Aktif</p>
                            <p className="text-blue-800 text-sm">
                                Mulai: <strong>{new Date(currentShift.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-blue-500 font-bold uppercase">Modal</p>
                            <p className="text-blue-800 font-bold">Rp {currentShift.initial_cash.toLocaleString()}</p>
                        </div>
                    </div>
                )}

                <h2 className="text-2xl font-bold text-slate-800 mb-6">Menu Utama</h2>

                {/* Smart Alerts Section */}
                <div className="space-y-4 mb-6">
                    {alertRestock && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                                <LogOut className="text-red-500" />
                                <div>
                                    <h3 className="font-bold text-red-700">Peringatan Restock!</h3>
                                    <p className="text-sm text-red-600">Penjualan hari ini sudah melebihi 7 Liter.</p>
                                </div>
                            </div>
                            <Link href="/stock" className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-red-50">
                                Restock Sekarang
                            </Link>
                        </div>
                    )}

                    {aiPrediction && (
                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-full">
                                <BarChart3 size={20} className="text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-700">AI Prediction 🤖</h3>
                                <p className="text-sm text-indigo-600">{aiPrediction}</p>
                            </div>
                        </div>
                    )}

                    {shiftRecommendation && (
                        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg flex items-center gap-3">
                            <div className="bg-teal-100 p-2 rounded-full">
                                <Users size={20} className="text-teal-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-teal-700">Saran Shift 💡</h3>
                                <p className="text-sm text-teal-600">{shiftRecommendation}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                    {/* Common Menu: POS */}
                    <Link href="/pos" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                        <div className="bg-blue-50 text-blue-600 p-4 rounded-full group-hover:scale-110 transition">
                            <ShoppingCart size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Kasir (POS)</h3>
                            <p className="text-xs text-slate-400">Transaksi Penjualan</p>
                        </div>
                    </Link>

                    {/* Common Menu: Stock (Available to All) */}
                    <Link href="/stock" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                        <div className="bg-purple-50 text-purple-600 p-4 rounded-full group-hover:scale-110 transition">
                            <Fuel size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Stok Bensin</h3>
                            <p className="text-xs text-slate-400">Restock / Tambah Stok</p>
                        </div>
                    </Link>

                    {/* Common Menu: Admin Panel (Now available to all for Settings/Users if Admin, but maybe just rename?) 
                        Wait, User asked to move Expenses and Debts OUT of Admin Panel to Dashboard.
                        Admin Panel itself stays for Admin-only things (Users, Settings).
                    */}

                    {/* Expenses (Now for Everyone) */}
                    <Link href="/expenses" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                        <div className="bg-orange-50 text-orange-600 p-4 rounded-full group-hover:scale-110 transition">
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Pengeluaran</h3>
                            <p className="text-xs text-slate-400">Catat Biaya Operasional</p>
                        </div>
                    </Link>

                    {/* Debts (Now for Everyone) */}
                    <Link href="/debts" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                        <div className="bg-red-50 text-red-600 p-4 rounded-full group-hover:scale-110 transition">
                            <Users size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Manajemen Hutang</h3>
                            <p className="text-xs text-slate-400">Kasbon & Tagihan</p>
                        </div>
                    </Link>


                    {/* Admin Only Menus */}
                    {user.role === 'admin' && (
                        <>
                            <Link href="/admin" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                                <div className="bg-slate-50 text-slate-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <Settings size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Admin Panel</h3>
                                    <p className="text-xs text-slate-400">Harga & User & Settings</p>
                                </div>
                            </Link>

                            <Link href="/reports" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                                <div className="bg-green-50 text-green-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <BarChart3 size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Laporan</h3>
                                    <p className="text-xs text-slate-400">Lihat Keuangan</p>
                                </div>
                            </Link>

                            <Link href="/requests" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center relative">
                                {pendingCount > 0 && (
                                    <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md animate-bounce">
                                        {pendingCount}
                                    </div>
                                )}
                                <div className="bg-slate-50 text-slate-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <ShieldCheck size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Request Box</h3>
                                    <p className="text-xs text-slate-400">Approval / Void</p>
                                </div>
                            </Link>

                            {/* Moved Audit Icon Here */}
                            <Link href="/admin/audit" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                                <div className="bg-amber-50 text-amber-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <ShieldCheck size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Audit Logs</h3>
                                    <p className="text-xs text-slate-400">Riwayat Aktivitas</p>
                                </div>
                            </Link>



                            <Link href="/admin/employees" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                                <div className="bg-pink-50 text-pink-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <Users size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Karyawan</h3>
                                    <p className="text-xs text-slate-400">Data Staff & Gaji</p>
                                </div>
                            </Link>

                            <Link href="/admin/payroll" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <Wallet size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Payroll</h3>
                                    <p className="text-xs text-slate-400">Slip Gaji</p>
                                </div>
                            </Link>

                            <Link href="/admin/users" className="hidden">
                            </Link>
                        </>
                    )}

                    {/* Cashier Specific: Reports View Only */}
                    {user.role === 'cashier' && (
                        <Link href="/reports" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                            <div className="bg-green-50 text-green-600 p-4 rounded-full group-hover:scale-110 transition">
                                <BarChart3 size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Laporan</h3>
                                <p className="text-xs text-slate-400">Lihat Keuangan</p>
                            </div>
                        </Link>
                    )}

                </div>
            </main>
        </div>
    );
}
