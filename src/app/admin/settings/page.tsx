'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import { StorageService, StoreSettings } from '../../../services/storage';
import { Save, ArrowLeft, Settings, Database, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../../components/Toast';

export default function StoreSettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const [settings, setSettings] = useState<StoreSettings>({
        storeName: 'E-Fuel POS',
        storeAddress: 'Alamat Toko',
        storePhone: '08123456789',
        receiptFooter: 'Terima Kasih',
        printerWidth: '58mm',
        enableTax: false,
        taxRate: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'admin') {
                router.push('/dashboard');
            } else {
                loadSettings();
            }
        }
    }, [user, loading, router]);

    const loadSettings = async () => {
        const data = await StorageService.getStoreSettings();
        if (data) {
            setSettings(data);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await StorageService.updateStoreSettings(settings);
            setToast({ message: 'Pengaturan berhasil disimpan!', type: 'success' });
        } catch (error: any) {
            console.error(error);
            setToast({ message: 'Gagal menyimpan pengaturan: ' + error.message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackup = async () => {
        try {
            const data = await StorageService.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `efuel-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setToast({ message: 'Backup berhasil diunduh!', type: 'success' });
        } catch (error: any) {
            console.error(error);
            setToast({ message: 'Gagal membuat backup: ' + error.message, type: 'error' });
        }
    };

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="container mx-auto p-4 md:p-8 max-w-4xl">
                <header className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
                        <ArrowLeft size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Settings size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Pengaturan Toko</h1>
                            <p className="text-slate-500">Sesuaikan informasi toko dan printer struk</p>
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Database className="text-blue-500" size={20} /> Informasi Umum
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Toko</label>
                                <input
                                    type="text"
                                    required
                                    value={settings.storeName}
                                    onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Alamat</label>
                                <textarea
                                    rows={3}
                                    value={settings.storeAddress}
                                    onChange={e => setSettings({ ...settings, storeAddress: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nomor Telepon</label>
                                <input
                                    type="text"
                                    value={settings.storePhone}
                                    onChange={e => setSettings({ ...settings, storePhone: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                />
                            </div>
                        </div>
                    </div>


                    {/* WhatsApp Settings */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <MessageCircle className="text-green-500" size={20} /> Pengaturan WhatsApp
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nomor WA Pemilik</label>
                                <input
                                    type="text"
                                    placeholder="08xxxxxxxxxx"
                                    value={settings.ownerPhone || ''}
                                    onChange={e => setSettings({ ...settings, ownerPhone: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-800"
                                />
                                <p className="text-xs text-slate-400 mt-1">Untuk notifikasi otomatis (Laporan Shift)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Fonnte API Key (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Token API Fonnte"
                                    value={settings.waApiKey || ''}
                                    onChange={e => setSettings({ ...settings, waApiKey: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-800"
                                />
                                <p className="text-xs text-slate-400 mt-1">Isi jika ingin kirim pesan otomatis tanpa klik link.</p>
                            </div>
                        </div>
                    </div>

                    {/* Data Management (Backup) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Database className="text-purple-500" size={20} /> Manajemen Data
                        </h2>
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">
                                Unduh semua data transaksi, stok, dan pengaturan sebagai file JSON untuk cadangan.
                            </p>
                            <button
                                type="button"
                                onClick={handleBackup}
                                className="w-full py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                            >
                                <Database size={18} /> Download Backup Data
                            </button>
                        </div>
                    </div>

                    {/* Receipt Settings */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Settings className="text-orange-500" size={20} /> Pengaturan Struk
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Footer Struk (Pesan Bawah)</label>
                                <input
                                    type="text"
                                    value={settings.receiptFooter}
                                    onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Lebar Printer Thermal</label>
                                <select
                                    value={settings.printerWidth}
                                    onChange={e => setSettings({ ...settings, printerWidth: e.target.value as '58mm' | '80mm' })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-800"
                                >
                                    <option value="58mm">58mm (Kecil)</option>
                                    <option value="80mm">80mm (Besar)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg shadow-blue-200 disabled:opacity-70"
                            >
                                {isSaving ? 'Menyimpan...' : <><Save size={20} /> Simpan Perubahan</>}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div >
    );
}
