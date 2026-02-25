'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { Fuel, RefreshCw, Users, ArrowLeft, Settings } from 'lucide-react';
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
        <div className="page-container page-fade-in">
            <Navbar />

            <main className="container mx-auto p-4 md:p-6">
                <div className="page-header mb-6">
                    <Link href="/dashboard" className="back-btn" title="Kembali">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="flex-1 flex justify-between items-center">
                        <div>
                            <h1 className="page-title">Admin Panel</h1>
                            <p className="page-subtitle">Kelola Stok dan Akun Pengguna</p>
                        </div>
                        <button
                            onClick={fetchData}
                            className="back-btn"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Stock Info */}
                <div className="summary-card mb-6 flex items-center justify-between" style={{ '--summary-accent': '#3b82f6' } as any}>
                    <div>
                        <p className="summary-card-label">Stok Pertalite Saat Ini</p>
                        <p className="summary-card-value">{stock.toFixed(1)} L</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <Fuel size={24} />
                    </div>
                </div>

                {/* --- Admin Actions --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* User Management Card */}
                    <Link href="/admin/users" className="menu-card group">
                        <div className="menu-card-icon bg-purple-50 text-purple-600">
                            <Users size={26} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Manajemen User</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Tambah/Hapus Kasir</p>
                        </div>
                    </Link>

                    {/* Store Settings Card */}
                    <Link href="/admin/settings" className="menu-card group">
                        <div className="menu-card-icon bg-blue-50 text-blue-600">
                            <Settings size={26} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Pengaturan Toko</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Nama, Alamat, Struk</p>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
