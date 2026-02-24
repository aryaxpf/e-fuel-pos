'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Employee, EmployeeService } from '../../../services/employee';
import { Users, Plus, Trash2, Edit, Save, X, Search, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function EmployeesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Employee>>({
        full_name: '',
        phone: '',
        role: 'STAFF',
        base_salary: 0,
        commission_rate: 0,
        is_active: true
    });

    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== 'admin') {
                router.push('/dashboard');
                return;
            }
            loadEmployees();
        }
    }, [user, loading, router]);

    const loadEmployees = async () => {
        try {
            const data = await EmployeeService.getEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Failed to load employees:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                await EmployeeService.updateEmployee(editId, formData);
            } else {
                await EmployeeService.addEmployee({
                    ...formData as any,
                    join_date: new Date().toISOString().split('T')[0]
                });
            }
            setIsModalOpen(false);
            setEditId(null);
            setFormData({ full_name: '', phone: '', role: 'STAFF', base_salary: 0, commission_rate: 0, is_active: true });
            loadEmployees();
            setSuccessMessage(editId ? 'Data karyawan berhasil diperbarui!' : 'Karyawan baru berhasil ditambahkan!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error: any) {
            console.error(error);
            alert('Gagal menyimpan data: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDeleteClick = (id: string) => { setDeleteId(id); };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await EmployeeService.deleteEmployee(deleteId);
            setDeleteId(null);
            loadEmployees();
            setSuccessMessage('Data karyawan berhasil dihapus.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            alert('Gagal menghapus data');
        }
    };

    const openEdit = (emp: Employee) => {
        setEditId(emp.id);
        setFormData(emp);
        setIsModalOpen(true);
    };

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                                <Users size={22} className="text-blue-600" /> Manajemen Karyawan
                            </h1>
                            <p className="page-subtitle">Kelola data staff dan gaji</p>
                        </div>
                        <button
                            onClick={() => { setEditId(null); setFormData({ full_name: '', phone: '', role: 'STAFF', base_salary: 0, commission_rate: 0, is_active: true }); setIsModalOpen(true); }}
                            className="btn-press text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: 'var(--shadow-glow-blue)' }}
                        >
                            <Plus size={16} /> Tambah
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="data-card p-3 mb-6 flex items-center gap-3">
                    <Search className="text-slate-400 ml-1" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama atau role..."
                        className="flex-1 outline-none text-slate-700 text-sm bg-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Employee List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} className="data-card p-5 relative group">
                            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                                    <Edit size={15} />
                                </button>
                                <button onClick={() => handleDeleteClick(emp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition">
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {emp.full_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{emp.full_name}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                        {emp.role}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span>Gaji Pokok:</span>
                                    <span className="font-mono-num font-bold">Rp {emp.base_salary.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Komisi:</span>
                                    <span className="font-mono-num font-bold">{(emp.commission_rate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className={`${emp.is_active ? 'text-green-600' : 'text-red-600'} font-bold`}>
                                        {emp.is_active ? 'Aktif' : 'Non-Aktif'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredEmployees.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Users size={44} className="mx-auto mb-4 opacity-30" />
                        <p>Belum ada data karyawan.</p>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editId ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap</label>
                                <input type="text" required
                                    className="w-full p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                                    value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Role / Jabatan</label>
                                <select
                                    className="w-full p-3 rounded-xl outline-none text-slate-800"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                                    <option value="STAFF">Staff Operator</option>
                                    <option value="CASHIER">Kasir</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="CLEANING">Cleaning Service</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Gaji Pokok (Rp)</label>
                                    <input type="number" required min="0"
                                        className="w-full p-3 rounded-xl outline-none font-mono-num text-slate-800"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                                        value={formData.base_salary} onChange={e => setFormData({ ...formData, base_salary: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Komisi (0-1)</label>
                                    <input type="number" required min="0" max="1" step="0.01" placeholder="0.05 = 5%"
                                        className="w-full p-3 rounded-xl outline-none font-mono-num text-slate-800"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                                        value={formData.commission_rate} onChange={e => setFormData({ ...formData, commission_rate: Number(e.target.value) })} />
                                    <p className="text-xs text-slate-400 mt-1">Ex: 0.05 untuk 5%</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                                <label htmlFor="active" className="text-sm text-slate-700">Status Karyawan Aktif</label>
                            </div>

                            <button type="submit"
                                className="btn-press w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-4 transition"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: 'var(--shadow-glow-blue)' }}>
                                <Save size={16} /> Simpan Data
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {successMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none">
                    <div className="modal-card flex flex-col items-center pointer-events-auto min-w-[280px] text-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--success-soft)' }}>
                            <CheckCircle size={28} style={{ color: 'var(--success)' }} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Berhasil!</h3>
                        <p className="text-slate-500 text-sm">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="modal-overlay" style={{ zIndex: 60 }}>
                    <div className="modal-card text-center">
                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Karyawan?</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Tindakan ini tidak dapat dibatalkan. Data karyawan dan riwayat presensi akan dihapus permanen.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition" style={{ background: 'var(--bg-elevated)' }}>
                                Batal
                            </button>
                            <button onClick={confirmDelete}
                                className="btn-press flex-1 py-3 rounded-xl font-bold text-white transition"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
