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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                    {/* User Management Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:border-purple-200 transition">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Users size={100} className="text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-purple-500 uppercase tracking-wider">Data Pengguna</p>
                            <h2 className="text-2xl font-bold text-slate-800 mt-2">Manajemen User</h2>
                            <p className="text-slate-400 mt-1 text-sm">Tambah/Hapus Kasir</p>
                        </div>
                        <div className="mt-8">
                            <Link
                                href="/admin/users"
                                className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-lg font-bold transition w-full justify-center"
                            >
                                <Users size={18} /> Kelola
                            </Link>
                        </div>
                    </div>



                    {/* Store Settings Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:border-blue-200 transition">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <RefreshCw size={100} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-500 uppercase tracking-wider">Konfigurasi</p>
                            <h2 className="text-2xl font-bold text-slate-800 mt-2">Pengaturan Toko</h2>
                            <p className="text-slate-400 mt-1 text-sm">Nama, Alamat, Struk</p>
                        </div>
                        <div className="mt-8">
                            <Link
                                href="/admin/settings"
                                className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-bold transition w-full justify-center"
                            >
                                <RefreshCw size={18} /> Atur
                            </Link>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
}
