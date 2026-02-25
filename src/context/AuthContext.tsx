'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { StorageService } from '../services/storage';
import { LoggerService } from '../services/logger';
import { encryptData, decryptData } from '../lib/encryption';

interface User {
    id: string;
    username: string;
    role: 'admin' | 'cashier';
}

interface AuthContextType {
    user: User | null;
    login: (username: string, pass: string) => Promise<string | null>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check session storage on mount
        const savedUserStr = sessionStorage.getItem('efuel_user');
        if (savedUserStr) {
            try {
                const savedUser = decryptData(savedUserStr);
                // Validate if user has ID (Migrate old sessions)
                if (savedUser && savedUser.id) {
                    setTimeout(() => setUser(savedUser), 0);
                } else {
                    // Invalid/Old session, clear it
                    sessionStorage.removeItem('efuel_user');
                    setTimeout(() => setUser(null), 0);
                }
            } catch (e) {
                sessionStorage.removeItem('efuel_user');
                setTimeout(() => setUser(null), 0);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username: string, pass: string) => {
        try {
            const result = await StorageService.login(username, pass);
            if (result.success && result.role && result.id) {
                const newUser: User = { id: result.id, username, role: result.role };
                setUser(newUser);
                sessionStorage.setItem('efuel_user', encryptData(newUser));

                // Track Login
                LoggerService.logAction(newUser.id, 'LOGIN', null, { role: newUser.role, username: newUser.username });

                return null; // No error
            } else {
                return result.error || 'Login gagal';
            }
        } catch (err) {
            console.error(err);
            return 'Terjadi kesalahan sistem';
        }
    };

    const logout = () => {
        if (user) {
            // Track Logout
            LoggerService.logAction(user.id, 'LOGOUT', { role: user.role, username: user.username }, null);
        }
        setUser(null);
        sessionStorage.removeItem('efuel_user');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
