'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (loading) return;

        // Public Routes
        if (pathname === '/login' || pathname === '/') {
            if (user) {
                router.replace('/dashboard');
            } else {
                setAuthorized(true);
            }
            return;
        }

        // Private Routes
        if (!user) {
            router.push('/login');
            return;
        }

        // RBAC logic
        // Operator/Cashier cannot access these paths
        const restrictedPaths = ['/admin', '/reports', '/stock', '/debts', '/expenses'];
        const isRestricted = restrictedPaths.some(p => pathname.startsWith(p));

        if (isRestricted && user.role !== 'admin') {
            alert('Akses Ditolak: Anda tidak memiliki izin untuk melihat halaman ini.');
            router.replace('/dashboard');
            return;
        }

        setAuthorized(true);
    }, [user, loading, pathname, router]);

    // Show blank/loader while evaluating auth
    if (loading || !authorized) {
        return <div className="min-h-screen flex items-center justify-center p-8 page-fade-in" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>Memverifikasi Akses...</div>;
    }

    return <>{children}</>;
}
