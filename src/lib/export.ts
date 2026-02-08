import * as XLSX from 'xlsx';
import { TransactionRecord } from '../services/storage';

export const exportToExcel = (transactions: TransactionRecord[]) => {
    // 1. Format Data for Excel
    const rows = transactions.map((t) => ({
        ID: t.id,
        Waktu: new Date(t.timestamp).toLocaleString('id-ID'),
        'Nominal (Rp)': t.nominal,
        'Volume (Liter)': t.liter,
        'Profit (Rp)': t.profit,
        'Tipe Transaksi': t.isSpecialRule ? 'Paket Hemat' : 'Standard',
    }));

    // 2. Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Adjust Column Widths
    const wscols = [
        { wch: 10 }, // ID
        { wch: 25 }, // Waktu
        { wch: 15 }, // Nominal
        { wch: 15 }, // Volume
        { wch: 15 }, // Profit
        { wch: 15 }, // Tipe
    ];
    worksheet['!cols'] = wscols;

    // 3. Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

    // 4. Generate File Name
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Laporan_E-Fuel_${dateStr}.xlsx`;

    // 5. Download
    XLSX.writeFile(workbook, fileName);
};
