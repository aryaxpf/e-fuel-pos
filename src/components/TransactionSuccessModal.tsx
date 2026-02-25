'use client';

import { CheckCircle, Printer, X } from 'lucide-react';
import { useEffect } from 'react';

interface TransactionSuccessModalProps {
    show: boolean;
    onClose: () => void;
    data: {
        nominal: number;
        liter: number;
        profit: number;
    };
}

const formatRupiah = (n: number) => n.toLocaleString('id-ID');

export default function TransactionSuccessModal({ show, onClose, data }: TransactionSuccessModalProps) {
    // Auto-dismiss after 5 seconds
    useEffect(() => {
        if (!show) return;
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [show, onClose]);

    // Close on Escape
    useEffect(() => {
        if (!show) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Enter') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [show, onClose]);

    if (!show) return null;

    const handlePrint = () => window.print();

    return (
        <>
            {/* --- MODAL UI (Hidden during Print) --- */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
                <div className="w-full max-w-sm overflow-hidden success-pop" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}>

                    {/* Success Header */}
                    <div className="p-6 flex flex-col items-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                            <CheckCircle className="text-white w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Transaksi Berhasil!</h2>
                        <p className="text-emerald-100 text-sm mt-1">Data tersimpan di sistem</p>
                    </div>

                    {/* Data */}
                    <div className="p-6">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Nominal</span>
                                <span className="font-mono-num text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    Rp {formatRupiah(data.nominal)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Volume</span>
                                <span className="font-mono-num text-xl font-bold" style={{ color: 'var(--accent)' }}>
                                    {data.liter} Liter
                                </span>
                            </div>
                            <div className="flex justify-between items-center px-3 py-2 rounded-xl" style={{ background: 'var(--success-soft)' }}>
                                <span className="font-medium" style={{ color: 'var(--success)' }}>Profit</span>
                                <span className="font-mono-num text-xl font-bold" style={{ color: 'var(--success)' }}>
                                    +Rp {formatRupiah(data.profit)}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <button
                                onClick={handlePrint}
                                className="btn-press w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            >
                                <Printer size={18} />
                                Cetak Struk
                            </button>
                            <button
                                onClick={onClose}
                                className="btn-press w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-lg"
                                style={{ background: 'var(--accent)', color: 'var(--text-inverse)', boxShadow: 'var(--shadow-glow-blue)' }}
                            >
                                Transaksi Baru
                            </button>
                        </div>

                        {/* Auto-dismiss hint */}
                        <p className="text-center text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
                            Otomatis tutup dalam 5 detik • Tekan <kbd className="px-1 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>Enter</kbd>
                        </p>
                    </div>
                </div>
            </div>

            {/* --- PRINTABLE RECEIPT (Visible ONLY during Print) --- */}
            <div className="hidden print:block print:w-[58mm] print:overflow-hidden print:text-black print:p-0">
                <div className="text-center font-mono text-[10px] leading-tight">
                    <p className="font-bold text-sm mb-1 uppercase">E-FUEL STATION</p>
                    <p className="mb-2">{new Date().toLocaleString('id-ID')}</p>
                    <hr className="border-black mb-2 border-dashed" />
                    <div className="flex justify-between mb-1">
                        <span>Bensin</span>
                        <span>{data.liter} L</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span>Total</span>
                        <span className="font-bold">Rp {formatRupiah(data.nominal)}</span>
                    </div>
                    <hr className="border-black mb-2 border-dashed" />
                    <p className="text-center">TERIMA KASIH</p>
                </div>
            </div>
        </>
    );
}
