'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { StorageService } from '../../services/storage';
import { Fuel, Save, ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../components/Toast';

export default function StockPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [volume, setVolume] = useState('');
    const [price, setPrice] = useState('');
    const [details, setDetails] = useState('');

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            }
            // Cashiers are allowed to access Stock page for Restock Input
            // so we remove the admin check here.
        }
    }, [user, loading, router]);

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await StorageService.addInventoryLog({
                type: 'IN',
                volume: Number(volume),
                costPerLiter: Number(price),
                notes: details || 'Restock Manual'
            });
            setToast({ message: 'Stok berhasil ditambahkan!', type: 'success' });
            setVolume('');
            setPrice('');
            setDetails('');
        } catch (error: any) {
            setToast({ message: 'Gagal menambah stok: ' + error.message, type: 'error' });
        }
    };

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
                        <ArrowLeft size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800">Manajemen Stok</h1>
                    <p className="text-slate-500 mt-2">Tambah stok bensin baru ke tangki.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Input Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Fuel className="text-blue-600" /> Input Stok Baru
                        </h2>

                        <form onSubmit={handleRestock} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Volume (Liter)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="Contoh: 1000"
                                    value={volume}
                                    onChange={(e) => setVolume(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Harga Beli per Liter (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="Contoh: 10000"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Keterangan (Opsional)</label>
                                <textarea
                                    placeholder="Contoh: Kiriman dari Supplier A"
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition resize-none text-slate-800"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg shadow-blue-200"
                            >
                                <Save size={20} />
                                Simpan Stok
                            </button>
                        </form>
                    </div>

                    {/* Quick Info / History Link */}
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-center items-center text-center">
                        <History size={48} className="text-blue-300 mb-4" />
                        <h3 className="text-xl font-bold text-blue-800 mb-2">Riwayat Restock</h3>
                        <p className="text-blue-600 mb-6">Lihat semua riwayat penambahan stok dan audit log di halaman Laporan.</p>
                        <Link href="/reports" className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition shadow-sm">
                            Buka Laporan
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
