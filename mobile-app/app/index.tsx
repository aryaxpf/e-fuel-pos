import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'expo-status-bar';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert('Login Gagal', error.message);
            setLoading(false);
        } else {
            setLoading(false);
            router.replace('/dashboard');
        }
    }

    return (
        <View className="flex-1 bg-slate-50 justify-center px-6">
            <StatusBar style="dark" />
            <View className="mb-10 items-center">
                <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
                    <Text className="text-white text-3xl font-bold">E</Text>
                </View>
                <Text className="text-3xl font-bold text-slate-800">E-Fuel POS</Text>
                <Text className="text-slate-500">Masuk untuk melanjutkan</Text>
            </View>

            <View className="space-y-4">
                <TextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    className="bg-white p-4 rounded-xl border border-slate-200 text-lg"
                />
                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="bg-white p-4 rounded-xl border border-slate-200 text-lg mb-4"
                />

                <TouchableOpacity
                    onPress={signInWithEmail}
                    disabled={loading}
                    className={`py-4 rounded-xl items-center ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Masuk</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
