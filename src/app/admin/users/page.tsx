'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import { ArrowLeft, Trash2, UserPlus, Shield, User, KeyRound, X, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { StorageService } from '../../../services/storage';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../../components/Toast';

export default function UsersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Change Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [newPassword, setNewPassword] = useState('');

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'admin') {
                router.push('/dashboard');
                return;
            }
            fetchdata();
        }
    }, [user, authLoading, router]);

    const fetchdata = async () => {
        setLoading(true);
        try {
            const data = await StorageService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await StorageService.addUser({ username, password, role });
            setToast({ message: 'User berhasil ditambahkan!', type: 'success' });
            setUsername('');
            setPassword('');
            fetchdata();
        } catch (error: any) {
            setToast({ message: error.message || 'Gagal menambah user', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (name === 'admin' || name === user?.username) {
            setToast({ message: 'Tidak bisa menghapus akun Admin Utama atau akun sendiri.', type: 'error' });
            return;
        }
        setUserToDelete({ id, username: name });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        try {
            await StorageService.deleteUser(userToDelete.id);
            setToast({ message: 'User berhasil dihapus', type: 'success' });
            fetchdata();
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error: any) {
            console.error(error);
            setToast({ message: 'Gagal menghapus user: ' + error.message, type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const openPasswordModal = (u: any) => {
        setSelectedUser(u);
        setNewPassword('');
        setShowPasswordModal(true);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            await StorageService.updateUser(selectedUser.id, { password: newPassword });
            setToast({ message: `Password untuk ${selectedUser.username} berhasil diubah!`, type: 'success' });
            setShowPasswordModal(false);
            fetchdata();
        } catch (error) {
            console.error(error);
            setToast({ message: 'Gagal mengubah password', type: 'error' });
        }
    };

    if (authLoading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50 relative">
            <Navbar />

            {/* --- Change Password Modal --- */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <KeyRound className="text-blue-600" />
                                Ganti Password
                            </h3>
                            <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-red-500 transition">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Password Baru</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                    placeholder="Password baru"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-200"
                            >
                                Simpan Password
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Delete Confirmation Modal --- */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={36} />
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus User?</h3>
                        <p className="text-slate-500 mb-6">
                            Apakah Anda yakin ingin menghapus user <strong>{userToDelete.username}</strong>?
                            <br />Tindakan ini tidak dapat dibatalkan.
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition shadow-lg shadow-red-200 disabled:opacity-70"
                            >
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="container mx-auto p-4 md:p-8 max-w-5xl">
                <header className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
                        <ArrowLeft size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Users size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Manajemen User</h1>
                            <p className="text-slate-500">Tambah, edit, dan kelola akses pengguna</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Add User Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit md:col-span-1">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <UserPlus className="text-blue-500" size={20} /> Tambah User
                        </h2>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                    placeholder="Username"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                    placeholder="******"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                >
                                    <option value="cashier">Cashier / Staff</option>
                                    <option value="admin">Admin (Full Access)</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-200 disabled:opacity-70 mt-4"
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Tambah User'}
                            </button>
                        </form>
                    </div>

                    {/* User List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden md:col-span-2">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Daftar Pengguna</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-600 font-bold text-sm">
                                    <tr>
                                        <th className="p-4">Username</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-slate-400">Belum ada user</td></tr>
                                    ) : (
                                        users.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50 transition">
                                                <td className="p-4 font-bold text-slate-800">{u.username}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                        <Shield size={12} /> {u.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-4 flex justify-center gap-2">
                                                    <button
                                                        onClick={() => openPasswordModal(u)}
                                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition"
                                                        title="Ganti Password"
                                                    >
                                                        <KeyRound size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(u.id, u.username)}
                                                        disabled={u.username === 'admin' || u.username === user?.username}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Hapus User"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
