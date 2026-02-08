'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { Fuel, RefreshCw, Plus, Users, ArrowLeft } from 'lucide-react';
import { StorageService } from '../../services/storage';

export default function AdminDashboard() {
    const [stock, setStock] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const currentStock = await StorageService.getCurrentStock();
            setStock(currentStock);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <div className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-2 transition">
                        <ArrowLeft size={20} />
                        <Link href="/dashboard">Kembali ke Menu Utama</Link>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Admin Panel</h1>
                            <p className="text-slate-500">Kelola Stok dan Akun Pengguna</p>
                        </div>
                        <button
                            onClick={fetchData}
                            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin text-blue-600" : "text-slate-600"} />
                        </button>
                    </div>
                </header>

                {/* --- Admin Actions --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Stock Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Fuel size={100} className="text-blue-500" />
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Sisa Stok Fisik</p>
                            <h2 className="text-4xl font-extrabold text-slate-800 mt-2">
                                {stock} <span className="text-lg font-medium text-slate-400">Liter</span>
                            </h2>
                        </div>

                        <div className="mt-8">
                            <Link
                                href="/admin/restock"
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md hover:shadow-lg transform active:scale-95 w-full justify-center"
                            >
                                <Plus size={20} />
                                <span>Restock Bensin</span>
                            </Link>
                        </div>
                    </div>

                    {/* User Management Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Users size={100} className="text-purple-500" />
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Data Pengguna</p>
                            <h2 className="text-3xl font-bold text-slate-800 mt-2">Manajemen User</h2>
                            <p className="text-slate-400 mt-1">Tambah atau Hapus Akun Kasir</p>
                        </div>

                        <div className="mt-8">
                            <Link
                                href="/admin/users"
                                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md hover:shadow-lg transform active:scale-95 w-full justify-center"
                            >
                                <Users size={20} />
                                <span>Kelola Users</span>
                            </Link>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
