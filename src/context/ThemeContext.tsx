'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    toggleTheme: () => { },
    setTheme: () => { },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');

    // Initialize from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('efuel-theme') as Theme | null;
        if (stored === 'dark' || stored === 'light') {
            setThemeState(stored);
            applyTheme(stored);
        } else {
            // Respect system preference on first visit
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initial = prefersDark ? 'dark' : 'light';
            setThemeState(initial);
            applyTheme(initial);
        }
    }, []);

    const applyTheme = (t: Theme) => {
        const html = document.documentElement;
        if (t === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    };

    const setTheme = (t: Theme) => {
        setThemeState(t);
        localStorage.setItem('efuel-theme', t);
        applyTheme(t);
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

