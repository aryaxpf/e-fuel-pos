'use client';

import { CheckCircle, Printer } from 'lucide-react';

interface TransactionSuccessModalProps {
    show: boolean;
    onClose: () => void;
    data: {
        nominal: number;
        liter: number;
        profit: number;
    }
}

export default function TransactionSuccessModal({ show, onClose, data }: TransactionSuccessModalProps) {
    if (!show) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* --- MODAL UI (Hidden during Print) --- */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-green-500 p-6 flex justify-center">
                        <CheckCircle className="text-white w-16 h-16" />
                    </div>

                    <div className="p-6 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">Transaksi Berhasil!</h2>
                        <p className="text-gray-500 text-sm mb-6">Data telah tersimpan di sistem.</p>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Nominal</span>
                                <span className="font-bold text-lg">Rp {data.nominal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Volume</span>
                                <span className="font-bold text-lg">{data.liter} Liter</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2 bg-green-50 px-2 -mx-2 rounded">
                                <span className="text-green-600 font-medium">Profit</span>
                                <span className="font-bold text-lg text-green-700">+ Rp {data.profit.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handlePrint}
                                className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                            >
                                <Printer size={20} />
                                Cetak Struk
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition shadow-lg hover:shadow-xl active:scale-95"
                            >
                                Transaksi Baru
                            </button>
                        </div>
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
                        <span className="font-bold">Rp {data.nominal.toLocaleString()}</span>
                    </div>

                    <hr className="border-black mb-2 border-dashed" />
                    <p className="text-center">TERIMA KASIH</p>
                </div>
            </div>
        </>
    );
}
