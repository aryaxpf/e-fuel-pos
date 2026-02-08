'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { calculateTransaction, TransactionResult } from '../../lib/fuel-logic';
import { StorageService } from '../../services/storage';
import { Fuel, Delete, ChevronRight, Zap } from 'lucide-react';
import TransactionSuccessModal from '../../components/TransactionSuccessModal';
import { playSuccessSound } from '../../utils/sound';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function POSPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [amountStr, setAmountStr] = useState('0');
    const [result, setResult] = useState<TransactionResult | null>(null);
    const [currentStock, setCurrentStock] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [lastTransaction, setLastTransaction] = useState({ nominal: 0, liter: 0, profit: 0 });

    // Protect Route
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Load stock on mount
    useEffect(() => {
        if (user) {
            updateStock();
        }
    }, [user]);

    const updateStock = async () => {
        const stock = await StorageService.getCurrentStock();
        setCurrentStock(stock);
    };

    // Recalculate whenever input changes
    useEffect(() => {
        const val = parseInt(amountStr.replace(/\./g, '')) || 0;
        const res = calculateTransaction(val);
        setResult(res);
    }, [amountStr]);

    // Handle Numpad / Preset Input
    const handleInput = (val: number | string) => {
        let newVal = amountStr === '0' ? '' : amountStr;

        if (typeof val === 'number') {
            // Preset button clicked (replace current value)
            setAmountStr(val.toString());
        } else {
            // Manual numpad
            if (val === 'DEL') {
                newVal = newVal.slice(0, -1);
                setAmountStr(newVal.length === 0 ? '0' : newVal);
            } else {
                // Limit length to avoid overflow
                if (newVal.length < 7) {
                    setAmountStr(newVal + val);
                }
            }
        }
    };

    const handleProcess = async () => {
        if (!result || result.nominal === 0) return;

        if (result.liter > currentStock) {
            alert(`Stok tidak cukup! Sisa: ${currentStock} Liter.`);
            return;
        }

        try {
            // 1. Save to Storage
            await StorageService.addTransaction(result);
            await StorageService.addInventoryLog({
                type: 'OUT',
                volume: result.liter,
                costPerLiter: 0, // Not needed for OUT
                notes: 'Sales Transaction'
            });

            // 2. Play Sound & Show Modal
            playSuccessSound();
            setLastTransaction({ nominal: result.nominal, liter: result.liter, profit: result.profit });
            setShowModal(true);

            // 3. Update stock locally
            await updateStock();
        } catch (error) {
            console.error("Transaction failed", error);
            alert("Gagal memproses transaksi");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setAmountStr('0');
    };

    const presets = [10000, 15000, 20000, 50000, 6000];

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <Navbar />

            <TransactionSuccessModal
                show={showModal}
                onClose={closeModal}
                data={lastTransaction}
            />

            <main className="flex-1 container mx-auto p-2 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* --- LEFT PANEL: DISPLAY & INPUTS --- */}
                <section className="lg:col-span-7 flex flex-col gap-4">

                    {/* Status Bar */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Fuel size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase">Sisa Stok</p>
                                <p className="text-xl font-bold">{currentStock} <span className="text-sm font-normal">Liter</span></p>
                            </div>
                        </div>
                        {result?.isSpecialRule && (
                            <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/50">
                                <Zap size={12} />
                                SPECIAL PRICE
                            </div>
                        )}
                    </div>

                    {/* Main Display */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 text-right space-y-2 relative overflow-hidden">
                        <p className="text-slate-500 font-medium tracking-wide uppercase text-sm">Total Bayar</p>
                        <div className="text-5xl md:text-7xl font-bold text-slate-800 tracking-tighter">
                            <span className="text-2xl md:text-4xl text-slate-400 mr-2">Rp</span>
                            {parseInt(amountStr).toLocaleString()}
                        </div>

                        <div className="border-t border-slate-100 my-4 pt-4 flex justify-end items-end gap-2">
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Volume Keluar</p>
                                <p className="text-4xl font-bold text-blue-600">{result?.liter} <span className="text-lg text-slate-400">Liter</span></p>
                            </div>
                        </div>

                        {/* Profit Indicator (Subtle) */}
                        <div className="absolute top-6 left-6 opacity-30">
                            <p className="text-xs font-mono">EST. PROFIT</p>
                            <p className="font-mono font-bold text-green-600">+{result?.profit}</p>
                        </div>
                    </div>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                        {presets.map((val) => (
                            <button
                                key={val}
                                onClick={() => handleInput(val)}
                                className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 py-6 rounded-2xl shadow-sm transition active:scale-95 flex flex-col items-center justify-center gap-1 group"
                            >
                                <span className="text-slate-500 text-xs font-medium group-hover:text-blue-500">Bensin</span>
                                <span className="text-xl md:text-2xl font-bold text-slate-700 group-hover:text-blue-700">
                                    {val / 1000}k
                                </span>
                            </button>
                        ))}
                    </div>

                </section>

                {/* --- RIGHT PANEL: MANUAL NUMPAD --- */}
                <section className="lg:col-span-5 flex flex-col">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col">
                        <div className="grid grid-cols-3 gap-4 flex-1 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleInput(num.toString())}
                                    className="text-3xl font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition active:scale-90"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => setAmountStr('0')}
                                className="text-lg font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition active:scale-90"
                            >
                                C
                            </button>
                            <button
                                onClick={() => handleInput('0')}
                                className="text-3xl font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition active:scale-90"
                            >
                                0
                            </button>
                            <button
                                onClick={() => handleInput('DEL')}
                                className="text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition active:scale-90 flex items-center justify-center"
                            >
                                <Delete size={24} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-2 text-slate-500 text-sm">
                                <span>Summary</span>
                                <span>{result?.isSpecialRule ? 'Special Rate Applied' : 'Standard Rate'}</span>
                            </div>
                            <button
                                onClick={handleProcess}
                                disabled={!result || result.nominal === 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-bold py-5 rounded-2xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition transform active:scale-95 flex items-center justify-center gap-3"
                            >
                                <span>BAYAR</span>
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}
