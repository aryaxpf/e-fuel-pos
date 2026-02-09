import * as XLSX from 'xlsx';
import { TransactionRecord } from '../services/storage';

export const exportToExcel = (data: any[]) => {
    // 1. Format Data for Excel
    const rows = data.map((item) => ({
        Waktu: new Date(item.timestamp).toLocaleString('id-ID'),
        Aktivitas: item.type === 'SALE' ? 'Penjualan' : 'Restock',
        'Masuk (Debit)': item.type === 'SALE' ? item.nominal : 0,
        'Keluar (Kredit)': item.type === 'RESTOCK' ? Math.abs(item.nominal) : 0,
        'Volume (L)': item.liter,
        'Profit (Rp)': item.profit || 0,
        Detail: item.details,
    }));

    // 2. Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Adjust Column Widths
    const wscols = [
        { wch: 20 }, // Waktu
        { wch: 15 }, // Aktivitas
        { wch: 15 }, // Masuk
        { wch: 15 }, // Keluar
        { wch: 10 }, // Volume
        { wch: 15 }, // Profit
        { wch: 30 }, // Detail
    ];
    worksheet['!cols'] = wscols;

    // 3. Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Harian');

    // 4. Generate File Name
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Laporan_E-Fuel_${dateStr}.xlsx`;

    // 5. Download
    XLSX.writeFile(workbook, fileName);
};
