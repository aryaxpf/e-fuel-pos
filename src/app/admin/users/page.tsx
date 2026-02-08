'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import { ArrowLeft, Trash2, UserPlus, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { StorageService } from '../../../services/storage';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'cashier'>('cashier');

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
        try {
            await StorageService.addUser({ username, password, role });
            alert('User berhasil ditambahkan!');
            setUsername('');
            setPassword('');
            fetchdata();
        } catch (error: any) {
            alert(error.message || 'Gagal menambah user');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (name === 'admin' || name === user?.username) {
            alert('Tidak bisa menghapus akun Admin Utama atau akun sendiri.');
            return;
        }

        if (confirm(`Yakin ingin menghapus user ${name}?`)) {
            try {
                await StorageService.deleteUser(id);
                fetchdata();
            } catch (error) {
                console.error(error);
                alert('Gagal menghapus user');
            }
        }
    };

    if (authLoading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition">
                        <ArrowLeft size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800">Manajemen Pengguna</h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Add User Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <UserPlus size={20} className="text-blue-600" />
                            Tambah User Baru
                        </h2>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input
                                    type="text"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="cashier">Cashier (Kasir)</option>
                                    <option value="admin">Admin (Full Access)</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                            >
                                Tambah Akun
                            </button>
                        </form>
                    </div>

                    {/* User List */}
                    <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Username</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm">Role</th>
                                    <th className="p-4 font-semibold text-slate-600 text-sm text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={3} className="p-4 text-center">Loading...</td></tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {u.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
                                                </div>
                                                {u.username}
                                                {u.username === user?.username && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">(You)</span>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(u.id, u.username)}
                                                    disabled={u.username === 'admin' || u.username === user?.username}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
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
            </main>
        </div>
    );
}
