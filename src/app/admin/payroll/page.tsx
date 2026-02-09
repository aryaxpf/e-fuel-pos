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

    // UI States
    const [resultModal, setResultModal] = useState<{
        isOpen: boolean;
        success: boolean;
        message: string;
        skipped?: string[];
    }>({ isOpen: false, success: false, message: '' });

    // Confirm Modal State
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

    const handleGenerateClick = () => {
        setConfirmModal({ isOpen: true });
    };

    const proceedGenerate = async () => {
        setConfirmModal({ isOpen: false }); // Close confirm modal
        setIsLoading(true); // Show loading state

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

    if (isLoading) return <div className="p-8 text-center">Loading Data...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link href="/dashboard" className="text-slate-400 hover:text-blue-600 flex items-center gap-1 mb-2 text-sm transition">
                            <ArrowLeft size={16} /> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Banknote className="text-green-600" /> Payroll System
                        </h1>
                        <p className="text-slate-500 text-sm">Kelola gaji karyawan</p>
                    </div>
                    <button
                        onClick={handleGenerateClick}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-sm"
                    >
                        Generate Periode Ini
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm uppercase border-b border-slate-200">
                            <tr>
                                <th className="p-4">Karyawan</th>
                                <th className="p-4">Periode</th>
                                <th className="p-4 text-right">Gaji Pokok</th>
                                <th className="p-4 text-right">Total Terima (Net)</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payrolls.map(slip => (
                                <tr key={slip.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-700">
                                        {slip.employee_name || slip.employee_id}
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {new Date(slip.period_start).toLocaleDateString()} - {new Date(slip.period_end).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right text-slate-600">Rp {slip.base_salary.toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-green-600">Rp {slip.net_salary.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${slip.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                            {slip.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="text-blue-600 hover:text-blue-800 p-2" title="Cetak Slip">
                                            <Printer size={18} />
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



            {/* Confirmation Modal */}
            {
                confirmModal.isOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                    <Banknote size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Generate Payroll?</h3>
                                <p className="text-slate-500 text-sm">
                                    Sistem akan menghitung gaji otomatis untuk semua karyawan aktif pada periode bulan ini.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal({ isOpen: false })}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={proceedGenerate}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition"
                                >
                                    Ya, Generate
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Result Modal */}
            {
                resultModal.isOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${resultModal.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {resultModal.success ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">
                                    {resultModal.success ? 'Berhasil' : 'Gagal'}
                                </h3>
                                <p className="text-slate-600 mb-4">{resultModal.message}</p>

                                {resultModal.skipped && resultModal.skipped.length > 0 && (
                                    <div className="bg-slate-50 p-3 rounded-lg w-full text-left text-sm text-slate-500 mb-4 max-h-32 overflow-y-auto">
                                        <p className="font-bold mb-1">Dilewati (Tidak memenuhi syarat):</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {resultModal.skipped.map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setResultModal({ ...resultModal, isOpen: false })}
                                className="w-full py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
