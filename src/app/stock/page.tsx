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

    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            }
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

    if (loading || !user) return <div className="min-h-screen p-8 text-center" style={{ color: 'var(--text-muted)' }}>Memuat...</div>;

    return (
        <div className="page-container page-fade-in">
            <Navbar />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                <header className="mb-8 pl-2">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold mb-4 transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                        <ArrowLeft size={20} /> Kembali ke Dashboard
                    </Link>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Manajemen Stok</h1>
                    <p className="font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>Tambah sediaan tangki BBM baru ke dalam sistem.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Input Form */}
                    <div className="data-card p-6 lg:p-8 h-fit">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                <Fuel size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Input Stok Baru</h2>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Penerimaan DO Pertamina</p>
                            </div>
                        </div>

                        <form onSubmit={handleRestock} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Volume (Liter)</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="Contoh: 8000"
                                        value={volume}
                                        onChange={(e) => setVolume(e.target.value)}
                                        className="w-full p-4 rounded-xl outline-none transition-all duration-300 font-bold text-lg"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '2px solid var(--accent)' }}></div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Harga Tebus (Per Liter)</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold" style={{ color: 'var(--text-muted)' }}>Rp</span>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="Contoh: 8500"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full pl-14 pr-4 py-4 rounded-xl outline-none transition-all duration-300 font-bold text-lg"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '2px solid var(--accent)' }}></div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Keterangan / Nomor DO</label>
                                <div className="relative group">
                                    <textarea
                                        placeholder="Nomor Delivery Order atau catatan tambahan..."
                                        value={details}
                                        onChange={(e) => setDetails(e.target.value)}
                                        rows={3}
                                        className="w-full p-4 rounded-xl outline-none transition-all duration-300 resize-none font-medium"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '2px solid var(--accent)' }}></div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-press w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 text-white mt-4"
                                style={{
                                    background: 'var(--accent)',
                                    boxShadow: '0 8px 25px -5px var(--accent)',
                                }}
                            >
                                <Save size={20} />
                                Konfirmasi Restock
                            </button>
                        </form>
                    </div>

                    {/* Quick Info / History Link */}
                    <div className="data-card p-8 flex flex-col justify-center items-center text-center relative overflow-hidden" style={{ background: 'var(--accent-light)', borderColor: 'transparent' }}>
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--accent) 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

                        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative z-10" style={{ background: 'var(--card-bg)', color: 'var(--accent)', boxShadow: '0 10px 30px -10px var(--accent)' }}>
                            <History size={40} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 relative z-10" style={{ color: 'var(--text-primary)' }}>Riwayat Penerimaan</h3>
                        <p className="font-medium mb-8 max-w-sm relative z-10" style={{ color: 'var(--text-secondary)' }}>
                            Seluruh penambahan stok otomatis dicatat di Audit Log sebagai riwayat penerimaan tangki.
                        </p>
                        <Link href="/reports" className="btn-press px-8 py-4 font-bold rounded-xl transition-all duration-300 relative z-10" style={{
                            background: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                        }}>
                            Buka Laporan Gudang
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
