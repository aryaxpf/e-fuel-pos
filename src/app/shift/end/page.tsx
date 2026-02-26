'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { StorageService } from '../../../services/storage';
import { ProductService } from '../../../services/productService';
import { WhatsAppService } from '../../../services/whatsapp';
import { ArrowLeft, Wallet, Calculator, CheckCircle, AlertTriangle, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function EndShiftPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [shift, setShift] = useState<any>(null);
    const [totalSales, setTotalSales] = useState(0);
    const [fuelSales, setFuelSales] = useState(0);
    const [prodSales, setProdSales] = useState(0);
    const [finalCash, setFinalCash] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);

    useEffect(() => {
        const loadShiftData = async () => {
            if (!user) return;
            try {
                const currentShift = await StorageService.getCurrentShift(user.id || 'unknown');
                if (!currentShift) {
                    alert('Tidak ada shift aktif!');
                    router.push('/dashboard');
                    return;
                }
                setShift(currentShift);

                // Calculate Sales since Start
                const transactions = await StorageService.getTransactions();
                const fuelSalesSinceStart = transactions
                    .filter((t: any) => new Date(t.timestamp) >= new Date(currentShift.start_time))
                    .reduce((acc: number, curr: any) => acc + curr.nominal, 0);

                const prodTxs = await ProductService.getProductTransactionsForReports();
                const prodSalesSinceStart = prodTxs
                    .filter((t: any) => new Date(t.timestamp) >= new Date(currentShift.start_time))
                    .reduce((acc: number, curr: any) => acc + curr.total_amount, 0);

                setFuelSales(fuelSalesSinceStart);
                setProdSales(prodSalesSinceStart);
                setTotalSales(fuelSalesSinceStart + prodSalesSinceStart);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadShiftData();
    }, [user, router]);

    const handleCloseShift = async () => {
        if (!shift) return;
        setSubmitting(true);
        const cashValue = Number(finalCash.replace(/\D/g, ''));
        const expected = shift.initial_cash + totalSales;

        try {
            await StorageService.closeShift(shift.id, cashValue, expected);

            // Send WhatsApp Report (Fire & Forget)
            const reportData = {
                ...shift,
                final_cash: cashValue,
                expected_cash: expected
            };
            WhatsAppService.sendShiftReportToOwner(reportData).catch(err => console.error("WA Error:", err));

            setSuccessData({
                variance: cashValue - expected,
                actual: cashValue,
                expected: expected
            });

        } catch (error: any) {
            alert('Gagal tutup shift: ' + error.message);
            setSubmitting(false); // Only stop submitting on error
        }
    };

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center p-8 page-fade-in" style={{ color: 'var(--text-muted)' }}>Menganalisis Transaksi...</div>;

    if (successData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500" style={{ background: 'var(--bg-primary)' }}>
                <div className="w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300 rounded-3xl shadow-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Shift Selesai!</h1>
                    <p className="mb-8 font-medium" style={{ color: 'var(--text-secondary)' }}>Laporan rekap telah sinkron & terkirim.</p>

                    <div className="space-y-3 mb-8">
                        <div className="flex justify-between items-center p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total Seharusnya</span>
                            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Rp {successData.expected.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-light)' }}>
                            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Total Aktual (Laci)</span>
                            <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>Rp {successData.actual.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-2xl" style={{
                            background: successData.variance === 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
                            color: successData.variance === 0 ? 'var(--success)' : 'var(--danger)',
                        }}>
                            <span className="text-sm font-bold uppercase tracking-wider">Selisih (Variance)</span>
                            <span className="font-bold text-lg">
                                {successData.variance > 0 ? '+' : ''} Rp {successData.variance.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const date = new Date().toLocaleString('id-ID');
                            const text = `*Laporan Shift - Smart POS*\nKasir: ${user.username}\nWaktu: ${date}\n--------------------------------\nKas Awal: Rp ${(shift?.initial_cash || 0).toLocaleString('id-ID')}\nSistem: Rp ${successData.expected.toLocaleString('id-ID')}\nAktual: Rp ${successData.actual.toLocaleString('id-ID')}\nSelisih: ${successData.variance > 0 ? '+' : ''} Rp ${successData.variance.toLocaleString('id-ID')}\n--------------------------------`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="btn-press w-full font-bold text-white py-4 rounded-2xl transition-all duration-300 mb-3 flex items-center justify-center gap-2"
                        style={{ background: '#25D366' }}
                    >
                        <MessageCircle size={20} /> Kirim ke WhatsApp Owner
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="btn-press w-full font-bold text-white py-4 rounded-2xl transition-all duration-300"
                        style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const expectedCash = (shift?.initial_cash || 0) + totalSales;
    const currentInput = Number(finalCash.replace(/\D/g, '')) || 0;
    const variance = currentInput - expectedCash;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500" style={{ background: 'var(--bg-primary)' }}>
            <div className="w-full max-w-lg page-fade-in">
                {/* Back Button */}
                <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold mb-6 transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={20} /> Kembali ke Dashboard
                </Link>

                <div className="rounded-3xl shadow-2xl overflow-hidden transition-all duration-300" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>

                    {/* Header Banner */}
                    <div className="p-8 pb-10 text-center relative overflow-hidden">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--danger) 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>

                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10" style={{ background: 'var(--bg-secondary)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
                            <CheckCircle size={36} />
                        </div>
                        <h1 className="text-2xl font-bold relative z-10" style={{ color: 'var(--text-primary)' }}>Tutup Shift Kasir</h1>
                        <p className="font-medium mt-1 relative z-10" style={{ color: 'var(--text-secondary)' }}>
                            Sesi dimulai: <span style={{ color: 'var(--text-primary)' }}>{shift?.start_time ? new Date(shift.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                        </p>
                    </div>

                    <div className="p-8 pt-0 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="grid grid-cols-2 gap-4 mt-8 mb-6">
                            <div className="p-5 rounded-2xl transition-colors duration-300" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Modal Awal</p>
                                <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Rp {(shift?.initial_cash || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-5 rounded-2xl transition-colors duration-300" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>Penjualan Shift</p>
                                <p className="text-xl font-black" style={{ color: 'var(--accent)' }}>+ Rp {totalSales.toLocaleString()}</p>
                                <div className="mt-2 pt-2 border-t text-[11px] font-bold flex flex-col justify-between" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', opacity: 0.8 }}>
                                    <span>Bensin: Rp {fuelSales.toLocaleString()}</span>
                                    <span>Barang: Rp {prodSales.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl mb-8 flex justify-between items-center transition-colors duration-300" style={{ background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
                            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total Seharusnya</span>
                            <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Rp {expectedCash.toLocaleString()}</span>
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                                Uang Tunai di Laci Kasir (Aktual)
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg transition-colors duration-300" style={{ color: 'var(--text-muted)' }}>Rp</span>
                                <input
                                    type="number"
                                    required
                                    value={finalCash}
                                    onChange={(e) => setFinalCash(e.target.value)}
                                    className="w-full pl-14 pr-4 py-4 rounded-2xl outline-none transition-all duration-300 font-black text-2xl"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '2px solid transparent',
                                        color: 'var(--text-primary)',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    placeholder="0"
                                />
                                {/* Focus Border glow effect */}
                                <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '2px solid var(--accent)' }}></div>
                            </div>
                        </div>

                        {/* Variance Indicator */}
                        {currentInput > 0 && (
                            <div className={`p-4 rounded-2xl flex items-center gap-4 mb-8 transition-colors duration-300`} style={{
                                background: variance === 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
                                color: variance === 0 ? 'var(--success)' : 'var(--danger)',
                            }}>
                                {variance === 0 ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider">Selisih (Variance)</p>
                                    <p className="text-lg font-black mt-1">
                                        {variance > 0 ? '+' : ''} Rp {variance.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleCloseShift}
                            disabled={submitting || !finalCash}
                            className="btn-press w-full font-bold text-lg text-white py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{
                                background: 'var(--danger)',
                                boxShadow: '0 8px 25px -5px var(--danger)',
                                minHeight: 'var(--touch-min)',
                            }}
                        >
                            {submitting ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>Tutup Shift & Mulai Rekap <CheckCircle size={20} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
