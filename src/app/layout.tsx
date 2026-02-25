import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import ProtectedRoute from '../components/ProtectedRoute';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#D4A574",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "E-Fuel POS",
  description: "Sistem Manajemen Stok & Penjualan Bensin Mini",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "E-Fuel POS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
