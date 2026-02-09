import Link from 'next/link';
import { LayoutDashboard, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/sync';

export default function Navbar() {
    const [storeName, setStoreName] = useState('E-Fuel POS');
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // Init Sync Service
        SyncService.init();

        // Check initial status
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

    return (
        <nav className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-xl font-bold tracking-tight">
                    <span className="text-blue-400">{storeName.split(' ')[0]}</span> {storeName.split(' ').slice(1).join(' ')}
                </h1>
                <div className="flex gap-6 items-center">
                    <button
                        onClick={handleManualSync}
                        className={`flex items-center gap-2 text-sm ${isOnline ? 'text-green-400' : 'text-red-400'} hover:opacity-80 transition-opacity`}
                        title={isOnline ? "Online (Click to Sync)" : "Offline"}
                    >
                        {isSyncing ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : isOnline ? (
                            <Wifi size={18} />
                        ) : (
                            <WifiOff size={18} />
                        )}
                        <span className="hidden sm:inline text-xs font-medium">
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </button>

                    <div className="h-6 w-px bg-slate-700 mx-2"></div>

                    <Link href="/dashboard" className="flex items-center gap-2 hover:text-blue-300 transition-colors">
                        <LayoutDashboard size={20} />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                    <Link href="/attendance" className="flex items-center gap-2 hover:text-blue-300 transition-colors">
                        <span className="hidden sm:inline">Absen</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
