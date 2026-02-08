import Link from 'next/link';
import { LayoutDashboard, Store } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-xl font-bold tracking-tight">
                    <span className="text-blue-400">E-Fuel</span> POS
                </h1>
                <div className="flex gap-6">
                    <Link href="/" className="flex items-center gap-2 hover:text-blue-300 transition-colors">
                        <Store size={20} />
                        <span className="hidden sm:inline">Kasir</span>
                    </Link>
                    <Link href="/admin" className="flex items-center gap-2 hover:text-blue-300 transition-colors">
                        <LayoutDashboard size={20} />
                        <span className="hidden sm:inline">Admin</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
