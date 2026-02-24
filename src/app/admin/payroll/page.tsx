'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { EmployeeService, PayrollSlip } from '../../../services/employee';
import { Banknote, Printer, ArrowLeft, CheckCircle, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

export default function PayrollPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [payrolls, setPayrolls] = useState<PayrollSlip[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [resultModal, setResultModal] = useState<{
        isOpen: boolean;
        success: boolean;
        message: string;
        skipped?: string[];
    }>({ isOpen: false, success: false, message: '' });

    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== 'admin') {
                router.push('/dashboard');
                return;
            }
            loadData();
        }
    }, [user, loading, router]);

    const loadData = async () => {
        try {
            const data = await EmployeeService.getPayrolls();
            setPayrolls(data);
        } catch (error) {
            console.error('Failed to load payrolls:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateClick = () => { setConfirmModal({ isOpen: true }); };

    const proceedGenerate = async () => {
        setConfirmModal({ isOpen: false });
        setIsLoading(true);
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        try {
            const result = await EmployeeService.generatePayroll(start, end);
            setResultModal({
                isOpen: true,
                success: result.success,
                message: result.message,
                skipped: result.skipped
            });
            if (result.success) loadData();
        } catch (error: any) {
            setResultModal({
                isOpen: true,
                success: false,
                message: 'Terjadi kesalahan sistem: ' + error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="page-container flex items-center justify-center"><p className="text-sm text-slate-400">Loading Data...</p></div>;

    return (
        <div className="page-container page-fade-in p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="page-header mb-6">
                    <Link href="/dashboard" className="back-btn" title="Kembali">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="flex-1 flex justify-between items-center">
                        <div>
                            <h1 className="page-title flex items-center gap-2">
                                <Banknote size={22} className="text-green-600" /> Payroll System
                            </h1>
                            <p className="page-subtitle">Kelola gaji karyawan</p>
                        </div>
                        <button
                            onClick={handleGenerateClick}
                            className="btn-press text-white px-4 py-2 rounded-xl font-bold text-sm transition"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: 'var(--shadow-glow-green)' }}
                        >
                            Generate Periode Ini
                        </button>
                    </div>
                </div>

                <div className="data-card">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Karyawan</th>
                                    <th>Periode</th>
                                    <th className="text-right">Gaji Pokok</th>
                                    <th className="text-right">Total Terima (Net)</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.map(slip => (
                                    <tr key={slip.id}>
                                        <td className="font-bold text-slate-800">
                                            {slip.employee_name || slip.employee_id}
                                        </td>
                                        <td className="text-sm text-slate-500">
                                            {new Date(slip.period_start).toLocaleDateString()} - {new Date(slip.period_end).toLocaleDateString()}
                                        </td>
                                        <td className="text-right font-mono-num text-slate-600">Rp {slip.base_salary.toLocaleString()}</td>
                                        <td className="text-right font-mono-num font-bold text-green-600">Rp {slip.net_salary.toLocaleString()}</td>
                                        <td className="text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${slip.status === 'PAID' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                                {slip.status}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition" title="Cetak Slip">
                                                <Printer size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {payrolls.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                            Belum ada data payroll. Klik "Generate" untuk membuat.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-card text-center">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Banknote size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Generate Payroll?</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Sistem akan menghitung gaji otomatis untuk semua karyawan aktif pada periode bulan ini.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal({ isOpen: false })}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition" style={{ background: 'var(--bg-elevated)' }}>
                                Batal
                            </button>
                            <button onClick={proceedGenerate}
                                className="btn-press flex-1 py-3 rounded-xl font-bold text-white transition"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: 'var(--shadow-glow-green)' }}>
                                Ya, Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {resultModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-card text-center">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${resultModal.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {resultModal.success ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {resultModal.success ? 'Berhasil' : 'Gagal'}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4">{resultModal.message}</p>

                        {resultModal.skipped && resultModal.skipped.length > 0 && (
                            <div className="p-3 rounded-xl w-full text-left text-sm text-slate-500 mb-4 max-h-32 overflow-y-auto" style={{ background: 'var(--bg-elevated)' }}>
                                <p className="font-bold mb-1">Dilewati (Tidak memenuhi syarat):</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {resultModal.skipped.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button onClick={() => setResultModal({ ...resultModal, isOpen: false })}
                            className="btn-press w-full py-3 rounded-xl font-bold text-white transition"
                            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
