'use client';

import { useState } from 'react';
import Navbar from '../../../components/Navbar';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StorageService } from '../../../services/storage';

export default function RestockPage() {
    const router = useRouter();
    const [volume, setVolume] = useState('');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await StorageService.addInventoryLog({
                type: 'IN',
                volume: Number(volume),
                costPerLiter: Number(price),
                notes: 'Restock manual via Admin',
            });
            router.push('/admin');
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan data');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="container mx-auto p-4 md:p-8 max-w-2xl">
                <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition">
                    <ArrowLeft size={20} />
                    Kembali ke Dashboard
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Input Modal / Restock</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Volume Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Jumlah Volume (Liter)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={volume}
                                    onChange={(e) => setVolume(e.target.value)}
                                    placeholder="Contoh: 100"
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none text-lg"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                    Liter
                                </span>
                            </div>
                        </div>

                        {/* Price Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Harga Beli per Liter (Modal)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                    Rp
                                </span>
                                <input
                                    type="number"
                                    required
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="Contoh: 10000"
                                    className="w-full p-4 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none text-lg"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                *Harga beli dari POM Bensin (Standard: Rp 10.000)
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? (
                                'Menyimpan...'
                            ) : (
                                <>
                                    <Save size={20} />
                                    Simpan Stok
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </main>
        </div>
    );
}
