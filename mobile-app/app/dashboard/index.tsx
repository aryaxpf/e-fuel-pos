import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        checkUser();
    }, []);

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.replace('/');
            return;
        }
        setUser(user);

        // Fetch profile/employee data
        // Assuming we have a way to link user to employee, otherwise just show user metadata
        // For now, let's just use user metadata or email
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace('/');
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="p-6 bg-white border-b border-slate-200">
                <Text className="text-slate-500 text-sm">Selamat Datang,</Text>
                <Text className="text-2xl font-bold text-slate-800">
                    {user?.email?.split('@')[0] || 'User'}
                </Text>
            </View>

            <ScrollView className="flex-1 p-6">
                {/* Menu Grid */}
                <View className="flex-row flex-wrap justify-between">

                    {/* Attendance Card */}
                    <TouchableOpacity
                        className="w-[48%] bg-blue-600 p-6 rounded-2xl mb-4 shadow-sm"
                        onPress={() => router.push('/attendance')}
                    >
                        <View className="bg-blue-500 w-10 h-10 rounded-full items-center justify-center mb-3">
                            <Text className="text-white text-xl">🕒</Text>
                        </View>
                        <Text className="text-white font-bold text-lg">Presensi</Text>
                        <Text className="text-blue-100 text-xs mt-1">Clock In/Out</Text>
                    </TouchableOpacity>

                    {/* Stock Card */}
                    <TouchableOpacity
                        className="w-[48%] bg-emerald-600 p-6 rounded-2xl mb-4 shadow-sm"
                        onPress={() => Alert.alert('Coming Soon', 'Fitur Stok akan segera hadir.')}
                    >
                        <View className="bg-emerald-500 w-10 h-10 rounded-full items-center justify-center mb-3">
                            <Text className="text-white text-xl">📦</Text>
                        </View>
                        <Text className="text-white font-bold text-lg">Stok</Text>
                        <Text className="text-emerald-100 text-xs mt-1">Cek Persediaan</Text>
                    </TouchableOpacity>

                    {/* Sales Card */}
                    <TouchableOpacity
                        className="w-[48%] bg-purple-600 p-6 rounded-2xl mb-4 shadow-sm"
                        onPress={() => Alert.alert('Coming Soon', 'Fitur Laporan akan segera hadir.')}
                    >
                        <View className="bg-purple-500 w-10 h-10 rounded-full items-center justify-center mb-3">
                            <Text className="text-white text-xl">📊</Text>
                        </View>
                        <Text className="text-white font-bold text-lg">Laporan</Text>
                        <Text className="text-purple-100 text-xs mt-1">Ringkasan Harian</Text>
                    </TouchableOpacity>

                    {/* Settings Card */}
                    <TouchableOpacity
                        className="w-[48%] bg-slate-600 p-6 rounded-2xl mb-4 shadow-sm"
                        onPress={handleLogout}
                    >
                        <View className="bg-slate-500 w-10 h-10 rounded-full items-center justify-center mb-3">
                            <Text className="text-white text-xl">🚪</Text>
                        </View>
                        <Text className="text-white font-bold text-lg">Keluar</Text>
                        <Text className="text-slate-200 text-xs mt-1">Logout Akun</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
