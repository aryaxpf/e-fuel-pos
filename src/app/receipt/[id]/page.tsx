'use client';

import { useEffect, useState, use } from 'react';
import { StorageService, TransactionRecord } from '../../../services/storage';
import { WhatsAppService } from '../../../services/whatsapp';
import { useRouter } from 'next/navigation';

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        name: 'E-FUEL POS',
        address: 'Jl. Raya Pertamini No. 1',
        phone: '0812-3456-7890',
        receipt_footer: 'Terima Kasih & Selamat Jalan'
    });

    useEffect(() => {
        const fetchTransaction = async () => {
            if (!resolvedParams.id) return;
            try {
                const [txData, settingsData] = await Promise.all([
                    StorageService.getTransactionById(resolvedParams.id),
                    StorageService.getStoreSettings()
                ]);

                if (txData) {
                    setTransaction(txData);
                } else {
                    alert('Transaksi tidak ditemukan!');
                }

                if (settingsData) {
                    setSettings({
                        name: settingsData.name,
                        address: settingsData.address,
                        phone: settingsData.phone,
                        receipt_footer: settingsData.receipt_footer
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransaction();
    }, [resolvedParams.id]);

    useEffect(() => {
        if (!loading && transaction) {
            // Auto print when ready
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, transaction]);

    const handleShare = async () => {
        if (!transaction) return;
        await WhatsAppService.sendReceipt('', transaction);
    };

    if (loading) return <div className="p-4 text-center text-xs font-mono">Memuat Struk...</div>;
    if (!transaction) return <div className="p-4 text-center text-xs font-mono">Data Kosong</div>;

    return (
        <div className="min-h-screen bg-white text-black p-0 m-0 font-mono text-xs leading-tight max-w-[58mm] mx-auto print:max-w-none print:w-full relative group">
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                    body { margin: 0; padding: 0; }
                    header, footer, nav, .no-print { display: none !important; }
                }
            `}</style>

            {/* Floating Action Button for Share */}
            <div className="absolute top-2 right-2 no-print opacity-100 transition-opacity z-50">
                <button
                    onClick={handleShare}
                    className="p-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition flex items-center justify-center"
                    title="Kirim ke WhatsApp"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.05 12.05 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </button>
            </div>

            <div className="flex flex-col items-center pb-4 pt-2 px-1">
                <h1 className="font-bold text-sm mb-1 uppercase">{settings.name}</h1>
                <p className="text-[10px] text-center mb-2">
                    {settings.address}<br />
                    Telp: {settings.phone}
                </p>

                <div className="w-full border-t border-b border-black border-dashed py-1 mb-2 text-[10px]">
                    <div className="flex justify-between">
                        <span>Tgl: {new Date(transaction.timestamp).toLocaleDateString('id-ID')}</span>
                        <span>Jam: {new Date(transaction.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>No: {transaction.id.slice(0, 8)}</span>
                        <span>Ksr: Admin</span>
                    </div>
                </div>

                <div className="w-full mb-2">
                    <div className="flex justify-between font-bold mb-1">
                        <span>Item</span>
                        <span>Total</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Pertalite ({transaction.liter}L)</span>
                        <span>Rp {transaction.nominal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="text-[10px] text-right mt-1 italic">
                        (@ Rp {Math.round(transaction.nominal / transaction.liter).toLocaleString('id-ID')}/L)
                    </div>
                </div>

                <div className="w-full border-t border-black border-dashed pt-2 mb-4">
                    <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL</span>
                        <span>Rp {transaction.nominal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1">
                        <span>{transaction.paymentMethod === 'DEBT' ? 'KASBON' : 'TUNAI'}</span>
                        <span>Rp {transaction.nominal.toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <p className="text-center font-bold mb-1">*** TERIMA KASIH ***</p>
                <p className="text-center text-[10px]">{settings.receipt_footer}</p>
            </div>

            {/* Safe area for cutter */}
            <div className="h-8"></div>
        </div>
    );
}
