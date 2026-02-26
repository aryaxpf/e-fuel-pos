'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { ProductService, Product } from '../../services/productService';
import { Settings, Plus, Search, Edit2, Trash2, ArrowLeft, ArrowRightLeft, DollarSign, Package, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../components/Toast';

interface ProductWithStock extends Product {
    current_stock: number;
}

export default function ProductsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [products, setProducts] = useState<ProductWithStock[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

    // Restock Modal state
    const [restockProduct, setRestockProduct] = useState<ProductWithStock | null>(null);
    const [restockQty, setRestockQty] = useState('');
    const [restockTotalCost, setRestockTotalCost] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: 'SPAREPART',
        buy_price: '',
        sell_price: '',
        unit: 'PCS',
        min_stock: '2',
    });

    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== 'admin') {
                router.push('/dashboard');
            } else {
                loadProducts();
            }
        }
    }, [user, loading, router]);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const rawProducts = await ProductService.getProducts();

            // Fetch stock for each product
            const enriched = await Promise.all(
                rawProducts.map(async (p) => {
                    const stock = await ProductService.getProductStock(p.id);
                    return { ...p, current_stock: stock };
                })
            );

            setProducts(enriched);
        } catch (error) {
            console.error(error);
            showToast('Gagal memuat barang', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleOpenModal = (product?: ProductWithStock) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                sku: product.sku || '',
                category: product.category,
                buy_price: product.buy_price.toString(),
                sell_price: product.sell_price.toString(),
                unit: product.unit,
                min_stock: product.min_stock.toString(),
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                sku: '',
                category: 'SPAREPART',
                buy_price: '',
                sell_price: '',
                unit: 'PCS',
                min_stock: '2',
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const payload = {
                name: formData.name,
                sku: formData.sku,
                category: formData.category,
                buy_price: Number(formData.buy_price),
                sell_price: Number(formData.sell_price),
                unit: formData.unit,
                min_stock: Number(formData.min_stock)
            };

            if (editingProduct) {
                await ProductService.updateProduct(editingProduct.id, payload, user as any);
                showToast('Barang berhasil diperbarui', 'success');
            } else {
                await ProductService.addProduct(payload, user as any);
                showToast('Barang baru berhasil ditambahkan', 'success');
            }
            setShowModal(false);
            loadProducts();
        } catch (error: any) {
            showToast(error.message || 'Terjadi kesalahan', 'error');
        }
    };

    const handleRestockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !restockProduct) return;

        const qty = Number(restockQty);
        const cost = Number(restockTotalCost);

        if (qty <= 0) {
            showToast('Jumlah restock harus lebih dari 0', 'error');
            return;
        }

        try {
            await ProductService.restockProduct(
                restockProduct.id,
                qty,
                cost,
                `Restock via Katalog`,
                user as any
            );
            showToast(`Berhasil menambah ${qty} ${restockProduct.unit} ${restockProduct.name}`, 'success');
            setRestockProduct(null);
            setRestockQty('');
            setRestockTotalCost('');
            loadProducts();
        } catch (error: any) {
            showToast(error.message || 'Gagal melakukan restock', 'error');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!user) return;
        if (!window.confirm(`Yakin ingin menonaktifkan barang "${name}"? Barang yang sudah ada transaksinya tidak bisa dihapus permanen, hanya disembunyikan.`)) {
            return;
        }

        try {
            await ProductService.deleteProduct(id, user as any);
            showToast('Barang berhasil dihapus', 'success');
            loadProducts();
        } catch (error: any) {
            showToast(error.message || 'Gagal menghapus barang', 'error');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="container mx-auto p-4 md:p-8 max-w-6xl pb-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-2 transition">
                            <ArrowLeft size={20} />
                            Kembali ke Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <Package className="text-blue-600" />
                            Katalog Barang
                        </h1>
                        <p className="text-slate-500 mt-1">Kelola katalog sparepart, aksesoris, dan produk lainnya.</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link
                            href="/product/restock"
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-5 py-3 rounded-xl font-medium transition flex items-center gap-2"
                        >
                            <Package size={20} />
                            Restock Barang
                        </Link>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-slate-900 text-white hover:bg-slate-800 px-5 py-3 rounded-xl font-medium shadow-md transition flex items-center gap-2 flex-1 md:flex-none justify-center"
                        >
                            <Plus size={20} />
                            Tambah Barang
                        </button>
                    </div>
                </div>

                {/* Search & Stats */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cari nama barang atau SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    <div className="flex items-center gap-6 text-sm text-slate-600">
                        <div>Total: <span className="font-bold text-slate-900">{products.length} Barang</span></div>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" />
                            <span className="font-bold text-amber-600">
                                {products.filter(p => p.current_stock <= p.min_stock).length} Stok Menipis
                            </span>
                        </div>
                    </div>
                </div>

                {/* Product List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                    <th className="p-4 font-medium pl-6">Nama Barang / SKU</th>
                                    <th className="p-4 font-medium">Kategori</th>
                                    <th className="p-4 font-medium">Harga Beli</th>
                                    <th className="p-4 font-medium">Harga Jual</th>
                                    <th className="p-4 font-medium">Margin</th>
                                    <th className="p-4 font-medium">Stok</th>
                                    <th className="p-4 font-medium text-right pr-6">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">Memuat katalog barang...</td>
                                    </tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada barang yang ditemukan.</td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition group">
                                            <td className="p-4 pl-6">
                                                <div className="font-bold text-slate-800">{p.name}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{p.sku || 'NO-SKU'}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                                    {p.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500">
                                                Rp {p.buy_price.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 font-medium text-slate-900">
                                                Rp {p.sell_price.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-emerald-600">
                                                    Rp {(p.sell_price - p.buy_price).toLocaleString('id-ID')}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {p.buy_price > 0 ? Math.round(((p.sell_price - p.buy_price) / p.buy_price) * 100) : 100}%
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {p.current_stock <= p.min_stock ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-sm rounded-lg font-bold border border-red-100">
                                                        <AlertTriangle size={14} />
                                                        {p.current_stock}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 text-sm rounded-lg font-bold border border-green-100">
                                                        {p.current_stock}
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400 ml-1">{p.unit}</span>
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                    <button
                                                        onClick={() => setRestockProduct(p)}
                                                        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition flex items-center gap-1 mr-2"
                                                        title="Restock Item Ini"
                                                    >
                                                        <Plus size={14} />
                                                        Restock
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(p)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="Edit Barang"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id, p.name)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Hapus Barang"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Package className="text-blue-600" />
                                {editingProduct ? 'Edit Barang' : 'Tambah Barang Baru'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Barang *</label>
                                <input
                                    type="text" required
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="cth: Kampas Rem Vario"
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kode SKU</label>
                                    <input
                                        type="text"
                                        value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="cth: KR-VR-01"
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                                    <select
                                        value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="SPAREPART">Sparepart</option>
                                        <option value="AKSESORIS">Aksesoris</option>
                                        <option value="OLI">Oli / Pelumas</option>
                                        <option value="LAINNYA">Lainnya</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Harga Beli (Modal) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                                        <input
                                            type="number" required min="0" step="100"
                                            value={formData.buy_price} onChange={e => setFormData({ ...formData, buy_price: e.target.value })}
                                            className="w-full pl-9 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Harga Jual *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                                        <input
                                            type="number" required min="0" step="100"
                                            value={formData.sell_price} onChange={e => setFormData({ ...formData, sell_price: e.target.value })}
                                            className="w-full pl-9 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        />
                                    </div>
                                    <p className="text-xs text-green-600 mt-1">
                                        Margin: Rp {Math.max(0, Number(formData.sell_price) - Number(formData.buy_price)).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Satuan</label>
                                    <select
                                        value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="PCS">PCS</option>
                                        <option value="SET">SET</option>
                                        <option value="LITER">LITER</option>
                                        <option value="BOX">BOX</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Batas Minimal Stok</label>
                                    <input
                                        type="number" required min="0"
                                        value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Peringatan jika sisa {formData.min_stock}</p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">
                                    Batal
                                </button>
                                <button type="submit" className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition">
                                    Simpan Barang
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Restock Inline Modal */}
            {restockProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50 text-emerald-800">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Package size={20} />
                                Restock Cepat
                            </h2>
                            <button onClick={() => { setRestockProduct(null); setRestockQty(''); setRestockTotalCost(''); }} className="text-emerald-600 hover:text-emerald-800 p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800">{restockProduct.name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Stok saat ini: {restockProduct.current_stock} {restockProduct.unit}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Restock ({restockProduct.unit}) *</label>
                                <input
                                    type="number" required min="1"
                                    value={restockQty} onChange={e => setRestockQty(e.target.value)}
                                    placeholder="cth: 50"
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Total Modal Restock (Rp) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                                    <input
                                        type="number" required min="0" step="100"
                                        value={restockTotalCost} onChange={e => setRestockTotalCost(e.target.value)}
                                        placeholder="cth: 2000000"
                                        className="w-full pl-9 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                    />
                                </div>
                                {Number(restockQty) > 0 && Number(restockTotalCost) > 0 && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Modal per {restockProduct.unit}: Rp {Math.round(Number(restockTotalCost) / Number(restockQty)).toLocaleString('id-ID')}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => { setRestockProduct(null); setRestockQty(''); setRestockTotalCost(''); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">
                                    Batal
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition">
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// X icon for modal
function X(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    )
}
