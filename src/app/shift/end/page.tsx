'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { StorageService } from '../../../services/storage';
import { WhatsAppService } from '../../../services/whatsapp';
import { ArrowLeft, Wallet, Calculator, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function EndShiftPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [shift, setShift] = useState<any>(null);
    const [totalSales, setTotalSales] = useState(0);
    const [finalCash, setFinalCash] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successData, setSuccessData] = useState<any>(null); // Success State

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
                const salesSinceStart = transactions
                    .filter(t => new Date(t.timestamp) >= new Date(currentShift.start_time))
                    .reduce((acc, curr) => acc + curr.nominal, 0);

                setTotalSales(salesSinceStart);
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

            // Replace alert with Success UI
            setSuccessData({
                variance: cashValue - expected,
                actual: cashValue,
                expected: expected
            });

            // Optional: Auto redirect after few seconds, or let user click button
            // setTimeout(() => router.push('/dashboard'), 5000); 

        } catch (error: any) {
            alert('Gagal tutup shift: ' + error.message);
            setSubmitting(false); // Only stop submitting on error
        }
    };

    if (loading || !user) return <div className="p-8 text-center">Loading Shift Data...</div>;

    if (successData) {
        return (
            <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Shift Berhasil Ditutup!</h1>
                    <p className="text-slate-500 mb-6">Laporan telah dikirim ke Owner.</p>

                    <div className="space-y-3 mb-8">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-bold text-slate-500">Total Seharusnya</span>
                            <span className="font-bold text-slate-800">Rp {successData.expected.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-bold text-slate-500">Total Aktual (Laci)</span>
                            <span className="font-bold text-blue-600">Rp {successData.actual.toLocaleString()}</span>
                        </div>
                        <div className={`flex justify-between items-center p-3 rounded-lg ${successData.variance === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            <span className="text-sm font-bold uppercase">Selisih (Variance)</span>
                            <span className="font-bold">
                                {successData.variance > 0 ? '+' : ''} Rp {successData.variance.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition"
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
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="bg-slate-800 p-6 text-white text-center">
                    <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
                    <h1 className="text-2xl font-bold">Tutup Shift Kasir</h1>
                    <p className="opacity-70 mt-1">
                        Login: {new Date(shift.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase font-bold">Modal Awal</p>
                            <p className="text-lg font-bold text-slate-700">Rp {shift.initial_cash.toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-xs text-blue-500 uppercase font-bold">Penjualan Shift</p>
                            <p className="text-lg font-bold text-blue-700">+ Rp {totalSales.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600 uppercase">Total Seharusnya</span>
                        <span className="text-xl font-bold text-slate-800">Rp {expectedCash.toLocaleString()}</span>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Total Uang Tunai (Hitung Laci)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-500 font-bold">Rp</span>
                            <input
                                type="number"
                                required
                                value={finalCash}
                                onChange={(e) => setFinalCash(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-slate-800"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Variance Indicator */}
                    {currentInput > 0 && (
                        <div className={`p-3 rounded-lg flex items-center gap-3 mb-6 ${variance < 0 ? 'bg-red-100 text-red-800' :
                            variance > 0 ? 'bg-lime-100 text-lime-800' :
                                'bg-green-100 text-green-800'
                            }`}>
                            {variance === 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            <div>
                                <p className="text-xs font-bold uppercase">Selisih (Variance)</p>
                                <p className="font-bold">
                                    {variance > 0 ? '+' : ''} Rp {variance.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleCloseShift}
                        disabled={submitting || !finalCash}
                        className={`w-full py-4 rounded-xl font-bold text-lg text-white transition shadow-lg
                            ${submitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-red-200'}
                        `}
                    >
                        {submitting ? 'Menutup Shift...' : 'Tutup Shift & Simpan'}
                    </button>

                    <div className="mt-6 text-center">
                        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm inline-flex items-center gap-1">
                            <ArrowLeft size={14} /> Kembali ke Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
