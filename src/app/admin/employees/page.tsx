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

    // UI States
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form State
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

            // Show Success UI
            setSuccessMessage(editId ? 'Data karyawan berhasil diperbarui!' : 'Karyawan baru berhasil ditambahkan!');
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (error: any) {
            console.error(error);
            alert('Gagal menyimpan data: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

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
                            <Users className="text-blue-600" /> Manajemen Karyawan
                        </h1>
                        <p className="text-slate-500 text-sm">Kelola data staff dan gaji</p>
                    </div>
                    <button
                        onClick={() => { setEditId(null); setFormData({ full_name: '', phone: '', role: 'STAFF', base_salary: 0, commission_rate: 0, is_active: true }); setIsModalOpen(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                    >
                        <Plus size={18} /> Tambah Karyawan
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center gap-3 border border-slate-200">
                    <Search className="text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari nama atau role..."
                        className="flex-1 outline-none text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Employee List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition relative group">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => openEdit(emp)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteClick(emp.id)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {emp.full_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{emp.full_name}</h3>
                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-medium">
                                        {emp.role}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span>Gaji Pokok:</span>
                                    <span className="font-bold">Rp {emp.base_salary.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Komisi:</span>
                                    <span className="font-bold">{(emp.commission_rate * 100).toFixed(1)}%</span>
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
                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Belum ada data karyawan.</p>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editId ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                                <input
                                    type="text" required
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role / Jabatan</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg p-2 outline-none text-slate-800"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="STAFF">Staff Operator</option>
                                    <option value="CASHIER">Kasir</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="CLEANING">Cleaning Service</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Gaji Pokok (Rp)</label>
                                    <input
                                        type="number" required min="0"
                                        className="w-full border border-slate-300 rounded-lg p-2 outline-none text-slate-800"
                                        value={formData.base_salary}
                                        onChange={e => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Komisi (0-1)</label>
                                    <input
                                        type="number" required min="0" max="1" step="0.01"
                                        className="w-full border border-slate-300 rounded-lg p-2 outline-none text-slate-800"
                                        placeholder="0.05 = 5%"
                                        value={formData.commission_rate}
                                        onChange={e => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Ex: 0.05 untuk 5%</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="active" className="text-sm text-slate-700">Status Karyawan Aktif</label>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition mt-6 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Simpan Data
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {successMessage && (
                <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none">
                    <div className="bg-white rounded-xl shadow-2xl border border-green-100 p-6 flex flex-col items-center animate-in fade-in zoom-in duration-300 pointer-events-auto min-w-[300px]">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Berhasil!</h3>
                        <p className="text-slate-500 text-center">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Karyawan?</h3>
                            <p className="text-slate-500 text-sm">
                                Tindakan ini tidak dapat dibatalkan. Data karyawan dan riwayat presensi akan dihapus permanen.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
