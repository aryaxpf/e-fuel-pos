import Link from 'next/link';
import { LayoutDashboard, Wifi, WifiOff, RefreshCw, Fuel } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/sync';

export default function Navbar() {
    const [storeName, setStoreName] = useState('E-Fuel POS');
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [currentStock, setCurrentStock] = useState<number | null>(null);

    useEffect(() => {
        SyncService.init();

        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => {
            setIsOnline(true);
            SyncService.processQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const loadSettings = async () => {
            const settings = await StorageService.getStoreSettings();
            if (settings?.name) {
                setStoreName(settings.name);
            }
        };
        loadSettings();

        // Load stock for badge
        const loadStock = async () => {
            const stock = await StorageService.getCurrentStock();
            setCurrentStock(stock);
        };
        loadStock();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleManualSync = async () => {
        if (!isOnline) return;
        setIsSyncing(true);
        await SyncService.processQueue();
        setTimeout(() => setIsSyncing(false), 1000);
    };

    const getStockColor = () => {
        if (currentStock === null) return 'var(--text-muted)';
        if (currentStock > 20) return 'var(--success)';
        if (currentStock > 5) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="container mx-auto flex justify-between items-center h-12 px-4">
                {/* Brand */}
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                        <Fuel size={14} className="text-white" />
                    </div>
                    <h1 className="text-sm font-bold text-white tracking-tight">
                        <span style={{ color: 'var(--accent)' }}>{storeName.split(' ')[0]}</span>{' '}
                        <span className="text-slate-300">{storeName.split(' ').slice(1).join(' ')}</span>
                    </h1>
                </Link>

                {/* Right: Stock + Sync + Nav */}
                <div className="flex gap-4 items-center">
                    {/* Stock Badge */}
                    {currentStock !== null && (
                        <div className="flex items-center gap-1.5 text-xs font-bold font-mono-num" style={{ color: getStockColor() }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: getStockColor() }} />
                            {currentStock.toFixed(1)}L
                        </div>
                    )}

                    {/* Sync Status */}
                    <button
                        onClick={handleManualSync}
                        className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                        style={{ color: isOnline ? 'var(--success)' : 'var(--danger)' }}
                        title={isOnline ? 'Online (Click to Sync)' : 'Offline'}
                    >
                        {isSyncing ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : isOnline ? (
                            <Wifi size={14} />
                        ) : (
                            <WifiOff size={14} />
                        )}
                        <span className="hidden sm:inline font-bold">{isOnline ? 'ON' : 'OFF'}</span>
                    </button>

                    <div className="h-4 w-px bg-slate-700" />

                    <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs">
                        <LayoutDashboard size={16} />
                        <span className="hidden sm:inline font-medium">Menu</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
