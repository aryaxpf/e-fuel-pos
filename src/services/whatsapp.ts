import { StorageService, TransactionRecord } from './storage';

export const WhatsAppService = {
    // Helper to format currency
    formatCurrency: (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    },

    // Generate Receipt Message
    generateReceiptMessage: async (transaction: TransactionRecord) => {
        const settings = await StorageService.getStoreSettings();
        const storeName = settings?.storeName || 'E-Fuel POS';
        const date = new Date(transaction.timestamp).toLocaleString('id-ID');

        let message = `*${storeName}*\n`;
        message += `--------------------------------\n`;
        message += `Tgl: ${date}\n`;
        message += `No: ${transaction.id.slice(0, 8)}\n`;
        message += `--------------------------------\n`;
        message += `Rp ${WhatsAppService.formatCurrency(transaction.nominal)}\n`;
        message += `${transaction.liter} Liter\n`;
        message += `--------------------------------\n`;
        message += `Terima Kasih!`;

        return encodeURIComponent(message);
    },

    // Open WhatsApp Link
    sendReceipt: async (phone: string, transaction: TransactionRecord) => {
        const message = await WhatsAppService.generateReceiptMessage(transaction);

        // Normalize phone number (start with 62)
        let target = phone.replace(/\D/g, '');
        if (target.startsWith('0')) {
            target = '62' + target.slice(1);
        }

        const url = `https://wa.me/${target}?text=${message}`;
        window.open(url, '_blank');
    },

    // Generate Shift Report Message
    generateShiftReport: (shiftData: any, storeName: string) => {
        const date = new Date().toLocaleString('id-ID');
        const variance = shiftData.final_cash - shiftData.expected_cash;

        let message = `*Laporan Shift - ${storeName}*\n`;
        message += `User: ${shiftData.requester_name}\n`;
        message += `Waktu: ${date}\n`;
        message += `--------------------------------\n`;
        message += `Kas Awal: ${WhatsAppService.formatCurrency(shiftData.initial_cash)}\n`;
        message += `Sistem: ${WhatsAppService.formatCurrency(shiftData.expected_cash)}\n`;
        message += `Aktual: ${WhatsAppService.formatCurrency(shiftData.final_cash)}\n`;
        message += `Selisih: ${WhatsAppService.formatCurrency(variance)}\n`;
        message += `--------------------------------\n`;

        return encodeURIComponent(message);
    },

    // Send Shift Report to Owner
    sendShiftReportToOwner: async (shiftData: any) => {
        const settings = await StorageService.getStoreSettings();
        if (!settings?.ownerPhone) {
            console.warn("Owner phone not configured");
            return;
        }

        const message = WhatsAppService.generateShiftReport(shiftData, settings.storeName || 'E-Fuel POS');

        let target = settings.ownerPhone.replace(/\D/g, '');
        if (target.startsWith('0')) {
            target = '62' + target.slice(1);
        }

        // Since this is automated, we can't reliably open a window without popup blocker issues 
        // if not triggered by user click. 
        // BUT for MVP/PWA, we often just open it.
        // If we had an API Key (e.g. Fonnte), we would POST here.

        if (settings.waApiKey) {
            // Implementation for Fonnte API or similar if Key exists
            try {
                const formData = new FormData();
                formData.append('target', target);
                formData.append('message', decodeURIComponent(message));

                await fetch('https://api.fonnte.com/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': settings.waApiKey
                    },
                    body: formData
                });
                console.log("Sent via WA API");
            } catch (e) {
                console.error("WA API Failed", e);
                // Fallback?
                const url = `https://wa.me/${target}?text=${message}`;
                window.open(url, '_blank');
            }
        } else {
            const url = `https://wa.me/${target}?text=${message}`;
            window.open(url, '_blank');
        }
    }
};
