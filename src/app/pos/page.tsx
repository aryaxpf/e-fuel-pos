'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import { calculateTransaction, TransactionResult } from '../../lib/fuel-logic';
import { StorageService } from '../../services/storage';
import { TransactionService } from '../../services/transactionService';
import { Fuel, Delete, ChevronRight, Zap, AlertTriangle } from 'lucide-react';
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
    const [isProcessing, setIsProcessing] = useState(false);

    // Toast state for stock warnings
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' } | null>(null);

    // Debt State
    const [showDebtModal, setShowDebtModal] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [newCustomerName, setNewCustomerName] = useState('');

    const loadCustomers = async () => {
        const data = await StorageService.getCustomers();
        setCustomers(data);
    };

    const handleAddCustomer = async () => {
        if (!newCustomerName) return;
        try {
            const customer = await StorageService.addCustomer(newCustomerName);
            setCustomers([...customers, customer]);
            setSelectedCustomer(customer);
        } catch (error) {
            console.error(error);
            showToast('Gagal tambah pelanggan', 'error');
        }
    };

    const handleDebtProcess = async () => {
        if (!result || result.nominal === 0 || !selectedCustomer) return;
        if (result.liter > currentStock) {
            showToast(`Stok tidak cukup! Sisa: ${currentStock.toFixed(2)} Liter`, 'error');
            return;
        }
        try {
            const transaction = await StorageService.addTransaction({
                ...result,
                paymentMethod: 'DEBT',
            } as any);
            await StorageService.addDebt(
                selectedCustomer.id,
                transaction.id,
                result.nominal,
                'Kasbon Bensin'
            );
            await StorageService.addInventoryLog({
                type: 'OUT',
                volume: result.liter,
                costPerLiter: 0,
                notes: `Kasbon: ${selectedCustomer.name}`,
            });
            playSuccessSound();
            setLastTransaction({ nominal: result.nominal, liter: result.liter, profit: result.profit });
            setShowModal(true);
            setShowDebtModal(false);
            setNewCustomerName('');
            setSelectedCustomer(null);
            updateStock();
        } catch (error) {
            console.error(error);
            showToast('Gagal proses kasbon', 'error');
        }
    };

    // Protect Route
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Load stock on mount
    useEffect(() => {
        if (user) updateStock();
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

    // Show toast notification (non-blocking, auto-dismiss)
    const showToast = (message: string, type: 'error' | 'warning') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Handle Numpad / Preset Input
    const handleInput = useCallback((val: number | string) => {
        setAmountStr(prev => {
            let newVal = prev === '0' ? '' : prev;
            if (typeof val === 'number') {
                return val.toString();
            } else if (val === 'DEL') {
                newVal = newVal.slice(0, -1);
                return newVal.length === 0 ? '0' : newVal;
            } else if (val === 'C') {
                return '0';
            } else {
                if (newVal.length < 7) {
                    return newVal + val;
                }
                return prev;
            }
        });
    }, []);

    // ========================================
    // Keyboard Shortcuts
    // ========================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture if typing in an input/textarea
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            // Numpad 0-9
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleInput(e.key);
            }
            // Backspace = DEL
            else if (e.key === 'Backspace') {
                e.preventDefault();
                handleInput('DEL');
            }
            // Escape = Clear
            else if (e.key === 'Escape') {
                e.preventDefault();
                handleInput('C');
            }
            // Enter = Process
            else if (e.key === 'Enter') {
                e.preventDefault();
                handleProcess();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInput, result, user, isProcessing]);

    const handleProcess = async () => {
        if (!result || result.nominal === 0 || !user || isProcessing) return;
        setIsProcessing(true);

        try {
            const txResult = await TransactionService.processTransaction({
                amount: result.nominal,
                paymentMethod: 'CASH',
                actor: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                },
            });

            if (!txResult.success) {
                showToast(txResult.error || 'Gagal memproses transaksi', 'error');
                return;
            }

            playSuccessSound();
            setLastTransaction({
                nominal: txResult.record!.nominal,
                liter: txResult.record!.liter,
                profit: txResult.record!.profit,
            });
            setShowModal(true);
            await updateStock();
        } catch (error) {
            console.error('Transaction failed', error);
            showToast('Gagal memproses transaksi', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setAmountStr('0');
    };

    // Format number to Rupiah display
    const formatRupiah = (n: number) => n.toLocaleString('id-ID');

    // Stock level indicator
    const getStockLevel = () => {
        if (currentStock > 20) return 'stock-high';
        if (currentStock > 5) return 'stock-medium';
        return 'stock-low';
    };

    const presets = [
        { value: 6000, label: '6k', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-800' },
        { value: 10000, label: '10k', color: 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800' },
        { value: 15000, label: '15k', color: 'bg-violet-500/10 text-violet-700 border-violet-200 hover:bg-violet-500/20 dark:text-violet-400 dark:border-violet-800' },
        { value: 20000, label: '20k', color: 'bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-800' },
        { value: 50000, label: '50k', color: 'bg-rose-500/10 text-rose-700 border-rose-200 hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-800' },
    ];

    if (loading || !user) return null;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
            <Navbar />

            <TransactionSuccessModal
                show={showModal}
                onClose={closeModal}
                data={lastTransaction}
            />

            {/* ====== TOAST NOTIFICATION (Non-blocking) ====== */}
            {toast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] toast-enter">
                    <div
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg font-bold text-sm border ${toast.type === 'error'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                            }`}
                    >
                        <AlertTriangle size={18} />
                        {toast.message}
                    </div>
                </div>
            )}

            <main className="flex-1 container mx-auto p-2 md:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

                {/* ====== LEFT PANEL (70%) — Display + Presets ====== */}
                <section className="lg:col-span-7 flex flex-col gap-4">

                    {/* Stock Status Bar */}
                    <div className="card-elevated p-4 flex justify-between items-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl" style={{ background: 'var(--accent-soft)' }}>
                                <Fuel size={22} style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sisa Stok</p>
                                <p className={`text-xl font-bold font-mono-num ${getStockLevel()}`}>
                                    {currentStock.toFixed(1)} <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>Liter</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {result?.isSpecialRule && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                                    <Zap size={12} />
                                    SPECIAL
                                </div>
                            )}
                            {currentStock <= 5 && currentStock > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                                    <AlertTriangle size={12} />
                                    STOK RENDAH
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Price Display */}
                    <div className="card-elevated p-6 md:p-8 text-right relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Total Bayar</p>
                        <div className="font-mono-num text-5xl md:text-7xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                            <span className="text-2xl md:text-3xl mr-1" style={{ color: 'var(--text-muted)' }}>Rp</span>
                            {formatRupiah(parseInt(amountStr) || 0)}
                        </div>

                        <div className="mt-4 pt-4 flex justify-end items-end gap-6" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Volume</p>
                                <p className="font-mono-num text-3xl md:text-4xl font-bold" style={{ color: 'var(--accent)' }}>
                                    {result?.liter ?? 0} <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>L</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Profit</p>
                                <p className="font-mono-num text-lg font-bold" style={{ color: 'var(--success)' }}>
                                    +{formatRupiah(result?.profit ?? 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Preset Quick Buttons (Huge Touch Targets) */}
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {presets.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => handleInput(preset.value)}
                                className={`btn-press ripple touch-target flex-col gap-1 rounded-2xl border py-5 font-bold transition-all ${preset.color}`}
                            >
                                <span className="text-xs opacity-70">Bensin</span>
                                <span className="text-2xl md:text-3xl font-mono-num">{preset.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Keyboard Shortcuts Hint */}
                    <div className="hidden lg:flex items-center gap-4 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span><kbd className="px-1.5 py-0.5 rounded border text-[10px] font-bold" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>0-9</kbd> Numpad</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border text-[10px] font-bold" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>Enter</kbd> Bayar</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border text-[10px] font-bold" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>Esc</kbd> Hapus</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border text-[10px] font-bold" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>⌫</kbd> Delete</span>
                    </div>
                </section>

                {/* ====== RIGHT PANEL (30%) — Numpad + Actions ====== */}
                <section className="lg:col-span-5 flex flex-col">
                    <div className="card-elevated p-4 md:p-6 flex-1 flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        {/* Numpad Grid */}
                        <div className="grid grid-cols-3 gap-3 flex-1 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleInput(num.toString())}
                                    className="btn-press ripple touch-target text-3xl font-bold rounded-xl transition-colors"
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                                >
                                    {num}
                                </button>
                            ))}
                            {/* Clear */}
                            <button
                                onClick={() => handleInput('C')}
                                className="btn-press touch-target text-lg font-bold rounded-xl transition-colors"
                                style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                            >
                                C
                            </button>
                            {/* 0 */}
                            <button
                                onClick={() => handleInput('0')}
                                className="btn-press ripple touch-target text-3xl font-bold rounded-xl transition-colors"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                            >
                                0
                            </button>
                            {/* Delete */}
                            <button
                                onClick={() => handleInput('DEL')}
                                className="btn-press touch-target rounded-xl transition-colors flex items-center justify-center"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                            >
                                <Delete size={24} />
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {/* Summary line */}
                            <div className="flex justify-between items-center px-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                <span>Summary</span>
                                <span className="font-mono-num">{result?.isSpecialRule ? '⚡ Special Rate' : 'Standard Rate'}</span>
                            </div>

                            {/* BAYAR Button (Huge) */}
                            <button
                                onClick={handleProcess}
                                disabled={!result || result.nominal === 0 || isProcessing}
                                className="btn-press ripple w-full text-xl font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                                style={{
                                    background: !result || result.nominal === 0 || isProcessing ? 'var(--bg-elevated)' : 'var(--accent)',
                                    color: !result || result.nominal === 0 || isProcessing ? 'var(--text-muted)' : 'var(--text-inverse)',
                                    boxShadow: !result || result.nominal === 0 || isProcessing ? 'none' : 'var(--shadow-glow-blue)',
                                    minHeight: '64px',
                                }}
                            >
                                <span>{isProcessing ? 'MEMPROSES...' : 'BAYAR'}</span>
                                {!isProcessing && <ChevronRight size={24} />}
                            </button>

                            {/* KASBON Button */}
                            <button
                                onClick={() => {
                                    if (!result || result.nominal === 0) return;
                                    loadCustomers();
                                    setShowDebtModal(true);
                                }}
                                disabled={!result || result.nominal === 0}
                                className="btn-press w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                BAYAR NANTI (KASBON)
                            </button>
                        </div>
                    </div>
                </section>

                {/* ====== DEBT MODAL ====== */}
                {showDebtModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                        <div className="card-elevated w-full max-w-md p-6 success-pop" style={{ background: 'var(--bg-card)' }}>
                            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Pilih Pelanggan</h3>

                            <div className="mb-4">
                                <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Cari / Tambah Baru</label>
                                <input
                                    type="text"
                                    placeholder="Nama Pelanggan..."
                                    className="w-full p-3 rounded-xl mt-1 outline-none transition"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                />
                                {newCustomerName && !customers.find((c: any) => c.name.toLowerCase() === newCustomerName.toLowerCase()) && (
                                    <button
                                        onClick={handleAddCustomer}
                                        className="mt-2 text-sm font-bold flex items-center gap-1"
                                        style={{ color: 'var(--accent)' }}
                                    >
                                        + Tambah &quot;{newCustomerName}&quot;
                                    </button>
                                )}
                            </div>

                            <div className="max-h-60 overflow-y-auto rounded-xl mb-4" style={{ border: '1px solid var(--border)' }}>
                                {customers
                                    .filter((c: any) => c.name.toLowerCase().includes(newCustomerName.toLowerCase()))
                                    .map((c: any) => (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedCustomer(c)}
                                            className="p-3 cursor-pointer flex justify-between items-center transition-colors"
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                background: selectedCustomer?.id === c.id ? 'var(--accent-soft)' : 'transparent',
                                                color: selectedCustomer?.id === c.id ? 'var(--accent)' : 'var(--text-primary)',
                                                fontWeight: selectedCustomer?.id === c.id ? 700 : 400,
                                            }}
                                        >
                                            <span>{c.name}</span>
                                            {selectedCustomer?.id === c.id && <span>✓</span>}
                                        </div>
                                    ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowDebtModal(false); setSelectedCustomer(null); }}
                                    className="flex-1 py-3 rounded-xl font-bold transition-colors"
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDebtProcess}
                                    disabled={!selectedCustomer}
                                    className="flex-1 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                                    style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
                                >
                                    Simpan Hutang
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
