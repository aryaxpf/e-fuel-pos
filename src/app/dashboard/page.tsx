'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Fuel, Users, BarChart3, ShoppingCart, LogOut, ShieldCheck, Settings } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    // Protect Route
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
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
                            <p className="text-xs text-slate-500">Halo, <span className="font-bold text-blue-600">{user.username}</span> ({user.role})</p>
                        </div>
                    </div>
                    <button onClick={logout} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Logout">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="container mx-auto p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Menu Utama</h2>

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

                    {/* Admin Only Menus */}
                    {user.role === 'admin' && (
                        <>
                            <Link href="/admin" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                                <div className="bg-orange-50 text-orange-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <Settings size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Admin Panel</h3>
                                    <p className="text-xs text-slate-400">Stok & Harga</p>
                                </div>
                            </Link>

                            <Link href="/admin/reports" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center">
                                <div className="bg-green-50 text-green-600 p-4 rounded-full group-hover:scale-110 transition">
                                    <BarChart3 size={32} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Laporan</h3>
                                    <p className="text-xs text-slate-400">Lihat Keuangan</p>
                                </div>
                            </Link>

                            <Link href="/admin/users" className="hidden">
                            </Link>
                        </>
                    )}

                    {/* Cashier Specific (If needed, currently POS covers it) */}
                    {user.role === 'cashier' && (
                        <Link href="/admin/reports" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition group flex flex-col items-center gap-4 text-center opacity-75">
                            <div className="bg-slate-50 text-slate-600 p-4 rounded-full">
                                <BarChart3 size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Cek Laporan</h3>
                                <p className="text-xs text-slate-400">View Only</p>
                            </div>
                        </Link>
                    )}

                </div>
            </main>
        </div>
    );
}
