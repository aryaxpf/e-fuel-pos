'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../../components/Navbar';
import { ProductService, Product } from '../../../../services/productService';
import { PackageX, PackagePlus, ArrowLeft, Save, Search } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../../../components/Toast';

export default function RestockProductPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [quantity, setQuantity] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [notes, setNotes] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

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
        try {
            const data = await ProductService.getProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
            showToast('Gagal memuat katalog barang', 'error');
        }
    };

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setCostPrice(product.buy_price.toString());
        setSearchTerm('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedProduct) return;

        const qty = Number(quantity);
        const cost = Number(costPrice);

        if (qty <= 0 || cost < 0) {
            showToast("Jumlah dan harga modal harus valid!", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await ProductService.restockProduct(
                selectedProduct.id,
                qty,
                cost,
                notes || 'Restock manual via Admin',
                user as any
            );

            showToast(`Berhasil menambah ${qty} ${selectedProduct.unit} ke stok ${selectedProduct.name}`, 'success');

            // Reset form
            setSelectedProduct(null);
            setQuantity('');
            setCostPrice('');
            setNotes('');
        } catch (error: any) {
            showToast(error.message || 'Gagal menyimpan stok', 'error');
        } finally {
            setIsSubmitting(false);
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

            <main className="container mx-auto p-4 md:p-8 max-w-2xl">
                <Link href="/admin/products" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition">
                    <ArrowLeft size={20} />
                    Kembali ke Master Barang
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                            <PackagePlus size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Restock / Belanja Barang</h1>
                            <p className="text-slate-500 text-sm mt-1">Tambah stok masuk ke dalam gudang.</p>
                        </div>
                    </div>

                    {!selectedProduct ? (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">Pilih Barang yang dibeli</label>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Cari nama barang atau SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                    autoFocus
                                />
                            </div>

                            {searchTerm && (
                                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 shadow-lg mt-2 absolute w-full bg-white z-10" style={{ position: 'relative' }}>
                                    {filteredProducts.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500 text-sm">Tidak ada barang yang cocok.</div>
                                    ) : (
                                        filteredProducts.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleSelectProduct(p)}
                                                className="w-full text-left p-4 hover:bg-slate-50 transition flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-800">{p.name}</div>
                                                    <div className="text-xs text-slate-500 mt-1">{p.sku || 'NO-SKU'} • Harga Beli: Rp {p.buy_price.toLocaleString('id-ID')}</div>
                                                </div>
                                                <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-sm font-medium">Pilih</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-slate-500 mb-1">Barang Terpilih</div>
                                    <div className="font-bold text-slate-800 text-lg">{selectedProduct.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">{selectedProduct.sku || 'NO-SKU'}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProduct(null)}
                                    className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                                >
                                    Ganti Barang
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Jumlah Pembelian
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="Contoh: 10"
                                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition outline-none text-lg"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                            {selectedProduct.unit}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Harga Beli Saat Ini / Modal
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                            Rp
                                        </span>
                                        <input
                                            type="number"
                                            required min="0" step="100"
                                            value={costPrice}
                                            onChange={(e) => setCostPrice(e.target.value)}
                                            placeholder="Contoh: 50000"
                                            className="w-full p-4 pl-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition outline-none text-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Catatan / Keterangan (Opsional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Contoh: Belanja di Toko Maju Jaya"
                                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition outline-none resize-none"
                                    rows={3}
                                ></textarea>
                            </div>

                            {/* Summary Box */}
                            {quantity && costPrice && (
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center text-blue-900">
                                    <span className="font-medium">Total Tagihan (Estimasi)</span>
                                    <span className="text-xl font-bold">
                                        Rp {(Number(quantity) * Number(costPrice)).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-emerald-600/20 hover:shadow-xl transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                            >
                                {isSubmitting ? 'Menyimpan...' : (
                                    <>
                                        <Save size={20} />
                                        Simpan Stok ke Gudang
                                    </>
                                )}
                            </button>

                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
