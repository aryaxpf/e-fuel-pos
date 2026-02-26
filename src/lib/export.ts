import * as XLSX from 'xlsx';

export const exportReportsToExcel = (data: any[]) => {
    // 1. Format Data for Excel (Reports Unified Data)
    const rows = data.map((item) => {
        let aktivitas = '';
        if (item.type === 'SALE') aktivitas = 'Penjualan Bensin';
        else if (item.type === 'SPAREPART_SALE') aktivitas = 'Penjualan Barang';
        else aktivitas = 'Restock';

        return {
            Waktu: new Date(item.timestamp).toLocaleString('id-ID'),
            Aktivitas: aktivitas,
            'Masuk (Debit)': (item.type === 'SALE' || item.type === 'SPAREPART_SALE') ? item.nominal : 0,
            'Keluar (Kredit)': item.type === 'RESTOCK' ? Math.abs(item.nominal) : 0,
            'Volume (L)': item.liter || 0,
            'Profit (Rp)': item.profit || 0,
            Detail: item.details,
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const wscols = [
        { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 40 },
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Keuangan');

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Laporan_SmartPOS_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
};

export const exportHistoryToExcel = (transactions: any[]) => {
    const rows = transactions.map((tx) => ({
        Waktu: tx.date.toLocaleString('id-ID'),
        Tipe: tx.type === 'FUEL' ? 'Bensin' : 'Barang',
        'ID Transaksi': tx.id,
        Detail: tx.details,
        'Total Nominal': tx.amount,
        Metode: tx.payment,
        Status: tx.status === 'SUCCESS' ? 'SUKSES' : 'BATAL (VOID)'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const wscols = [
        { wch: 20 }, { wch: 10 }, { wch: 40 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Transaksi');

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Riwayat_Transaksi_SmartPOS_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
};
