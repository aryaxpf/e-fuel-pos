'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import { ProductService, Product, ProductCartItem } from '../../../services/productService';
import { StorageService } from '../../../services/storage';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard, BanknoteIcon as Banknotes, QrCode, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../../components/Toast';

interface ProductWithStock extends Product {
    current_stock: number;
}

export default function SparepartPOSPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [products, setProducts] = useState<ProductWithStock[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Cart State
    const [cart, setCart] = useState<ProductCartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBT' | 'QRIS'>('CASH');

    // Debt State
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');

    // Checkout State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [receiptId, setReceiptId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else {
                fetchInitialData();
            }
        }
    }, [user, loading, router]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            // Check shift first
            const currentShift = await StorageService.getCurrentShift(user?.id || '');
            if (!currentShift) {
                showToast('PERINGATAN: Tidak ada shift aktif!', 'error');
            }

            // Load Products & Stock
            const rawProducts = await ProductService.getProducts();
            const enriched = await Promise.all(
                rawProducts.map(async (p) => {
                    const stock = await ProductService.getProductStock(p.id);
                    return { ...p, current_stock: stock };
                })
            );
            setProducts(enriched);

            // Load Customers for Debt
            const custs = await StorageService.getCustomers();
            setCustomers(custs);

        } catch (error) {
            console.error(error);
            showToast('Gagal memuat data kasir', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const playSuccessSound = () => {
        try {
            const audio = new Audio('/success.mp3'); // Same sound as Fuel POS
            audio.play();
        } catch (e) { }
    };

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const addToCart = (product: ProductWithStock) => {
        if (product.current_stock <= 0) {
            showToast('Stok habis!', 'error');
            return;
        }

        const existing = cart.find(c => c.product_id === product.id);
        if (existing) {
            if (existing.qty >= product.current_stock) {
                showToast(`Maksimal stok ${product.current_stock}`, 'error');
                return;
            }
            setCart(cart.map(c =>
                c.product_id === product.id
                    ? { ...c, qty: c.qty + 1, subtotal: (c.qty + 1) * c.sell_price }
                    : c
            ));
        } else {
            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                qty: 1,
                sell_price: product.sell_price,
                buy_price: product.buy_price,
                subtotal: product.sell_price
            }]);
        }
        setSearchTerm(''); // Clear search on add
    };

    const updateQuantity = (id: string, delta: number) => {
        const item = cart.find(c => c.product_id === id);
        if (!item) return;

        const product = products.find(p => p.id === id);
        if (!product) return;

        const newQty = item.qty + delta;
        if (newQty <= 0) {
            removeFromCart(id);
            return;
        }

        if (newQty > product.current_stock) {
            showToast(`Maksimal stok ${product.current_stock}`, 'error');
            return;
        }

        setCart(cart.map(c =>
            c.product_id === id
                ? { ...c, qty: newQty, subtotal: newQty * c.sell_price }
                : c
        ));
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(c => c.product_id !== id));
    };

    const totalAmount = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
    const totalItems = cart.reduce((acc, curr) => acc + curr.qty, 0);

    const handleCheckout = async () => {
        if (!user) return;
        if (cart.length === 0) return;

        // Validation Default POS
        const shiftStatus = await StorageService.getCurrentShift(user.id);
        if (!shiftStatus) {
            showToast("ANDA BELUM MEMULAI SHIFT! Silahkan ke dashboard.", "error");
            return;
        }

        if (paymentMethod === 'DEBT' && !selectedCustomer) {
            showToast("Pilih pelanggan untuk tagihan Kasbon!", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await ProductService.processProductSale(
                cart,
                paymentMethod,
                user as any,
                selectedCustomer || undefined
            );

            playSuccessSound();
            setReceiptId(result.transaction_id);
            setCart([]);
            setPaymentMethod('CASH');
            setSelectedCustomer('');

            // Reload stocks
            fetchInitialData();
        } catch (error: any) {
            showToast(error.message || 'Gagal memproses transaksi', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Success Modal */}
            {receiptId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center scale-in-center">
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                            <CheckCircle size={56} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">Berhasil!</h2>
                        <p className="text-slate-500 mb-8">Transaksi sparepart berhasil disimpan.</p>

                        <div className="bg-slate-50 p-4 rounded-2xl mb-8 flex text-left font-mono text-sm text-slate-600 border border-slate-100 overflow-hidden">
                            #{receiptId.split('-')[0].toUpperCase()}
                        </div>

                        <button
                            onClick={() => setReceiptId(null)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95"
                        >
                            Transaksi Baru
                        </button>
                    </div>
                </div>
            )}

            <main className="flex-1 container mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">

                {/* Left Panel: Catalog */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                            <ShoppingCart className="text-blue-600" />
                            Katalog Barang
                        </h1>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                        <input
                            type="text"
                            placeholder="Cari nama barang atau ketik SKU (Barcode)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 outline-none transition shadow-sm text-lg"
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="p-1 max-h-[calc(100vh-280px)] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-12 text-center text-slate-500">Memuat katalog...</div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">Barang tidak ditemukan.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
                                    {filteredProducts.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => addToCart(p)}
                                            disabled={p.current_stock <= 0}
                                            className={`p-4 rounded-xl border text-left transition relative overflow-hidden group 
                                                ${p.current_stock <= 0
                                                    ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                                                    : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer active:scale-95'}`}
                                        >
                                            <div className="text-xs font-mono text-slate-400 mb-1 line-clamp-1">{p.sku || 'NO-SKU'}</div>
                                            <div className="font-bold text-slate-800 text-base leading-tight mb-2 line-clamp-2">{p.name}</div>
                                            <div className="text-blue-600 font-bold text-lg mb-4">
                                                Rp {p.sell_price.toLocaleString('id-ID')}
                                            </div>

                                            <div className="absolute bottom-3 right-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${p.current_stock <= p.min_stock ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    Sisa: {p.current_stock}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Cart & Checkout */}
                <div className="w-full lg:w-[420px] bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col h-[calc(100vh-120px)] overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white shrink-0">
                        <h2 className="text-xl font-bold flex items-center justify-between">
                            <span>Pesanan Kasir</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{totalItems} Item</span>
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                                <ShoppingCart size={64} className="mb-4" />
                                <p>Keranjang masih kosong</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                                    <div className="flex-1 pr-3">
                                        <div className="font-bold text-slate-800 line-clamp-1">{item.name}</div>
                                        <div className="text-blue-600 font-medium text-sm">Rp {item.sell_price.toLocaleString('id-ID')}</div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                        <button
                                            onClick={() => updateQuantity(item.product_id, -1)}
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-red-500 transition"
                                        >
                                            {item.qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                                        </button>
                                        <span className="font-bold text-slate-800 w-6 text-center">{item.qty}</span>
                                        <button
                                            onClick={() => updateQuantity(item.product_id, 1)}
                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-blue-600 transition"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 bg-white shrink-0 border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">

                        {/* Summary */}
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-slate-500 font-medium">Total Tagihan</span>
                            <span className="text-3xl font-black text-slate-900">
                                Rp {totalAmount.toLocaleString('id-ID')}
                            </span>
                        </div>

                        {/* Payment Options */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <button
                                onClick={() => setPaymentMethod('CASH')}
                                className={`p-3 rounded-xl flex flex-col justify-center items-center gap-1 border-2 transition ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-100 bg-white text-slate-500 font-medium hover:bg-slate-50'}`}
                            >
                                <Banknotes size={20} />
                                <span className="text-xs">Tunai</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('DEBT')}
                                className={`p-3 rounded-xl flex flex-col justify-center items-center gap-1 border-2 transition ${paymentMethod === 'DEBT' ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold' : 'border-slate-100 bg-white text-slate-500 font-medium hover:bg-slate-50'}`}
                            >
                                <User size={20} />
                                <span className="text-xs">Kasbon</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('QRIS')}
                                className={`p-3 rounded-xl flex flex-col justify-center items-center gap-1 border-2 transition ${paymentMethod === 'QRIS' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-100 bg-white text-slate-500 font-medium hover:bg-slate-50'}`}
                            >
                                <QrCode size={20} />
                                <span className="text-xs">QRIS</span>
                            </button>
                        </div>

                        {/* Debt Customer Select */}
                        {paymentMethod === 'DEBT' && (
                            <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pelanggan Kasbon</label>
                                <select
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-rose-400 bg-slate-50"
                                >
                                    <option value="" disabled>-- Pilih Pelanggan --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Checkout Button */}
                        <button
                            onClick={handleCheckout}
                            disabled={isSubmitting || cart.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition active:scale-[0.98] flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isSubmitting ? (
                                'Memproses...'
                            ) : (
                                <>
                                    Simpan Transaksi
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
