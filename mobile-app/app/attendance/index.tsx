import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AttendanceService } from '../../services/attendance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function AttendancePage() {
    const router = useRouter();
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<CameraType>('front');
    const [permission, requestPermission] = useCameraPermissions();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [loading, setLoading] = useState(false);
    const [photo, setPhoto] = useState<string | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'CLOCKED_IN'>('IDLE');
    const [todayLog, setTodayLog] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        checkPermissions();
        checkUserAndLog();
    }, []);

    async function checkPermissions() {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Permission to access location was denied');
            return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
    }

    async function checkUserAndLog() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.replace('/');
            return;
        }
        setUser(user);

        // Check if employee exists for this user
        // For MVP, we assume user.id maps to employee.user_id or we use a separate mapping
        // Let's assume we find employee by user_id
        const { data: emp } = await supabase.from('employees').select('id').eq('user_id', user.id).single();

        if (emp) {
            const log = await AttendanceService.getTodayLog(emp.id);
            if (log) {
                setTodayLog(log);
                if (!log.clock_out) {
                    setStatus('CLOCKED_IN');
                } else {
                    setStatus('IDLE'); // Already clocked out
                }
            }
        }
    }

    async function takePicture() {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: true,
            });
            setPhoto(photo?.uri || null);
        }
    }

    async function handleClockIn() {
        if (!location || !photo || !user) {
            Alert.alert('Error', 'Mohon tunggu lokasi dan ambil foto.');
            return;
        }
        setLoading(true);
        try {
            // 1. Upload Photo
            // For MVP, we might skip upload if storage not set, but let's try
            // const publicUrl = await AttendanceService.uploadPhoto(photo, `in_${user.id}_${Date.now()}.jpg`);
            const publicUrl = "https://placeholder.com/photo.jpg"; // Placeholder if storage fails

            // 2. Clock In
            // Need employee ID. 
            const { data: emp } = await supabase.from('employees').select('id').eq('user_id', user.id).single();
            if (!emp) throw new Error("Employee not found");

            await AttendanceService.clockIn(emp.id, {
                lat: location.coords.latitude,
                long: location.coords.longitude
            }, publicUrl);

            Alert.alert('Sukses', 'Berhasil Clock In!');
            router.replace('/dashboard');
        } catch (error: any) {
            Alert.alert('Gagal', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleClockOut() {
        if (!location || !photo || !todayLog) return;
        setLoading(true);
        try {
            const publicUrl = "https://placeholder.com/photo_out.jpg";
            await AttendanceService.clockOut(todayLog.id, {
                lat: location.coords.latitude,
                long: location.coords.longitude
            }, publicUrl);

            Alert.alert('Sukses', 'Berhasil Clock Out!');
            router.replace('/dashboard');
        } catch (error: any) {
            Alert.alert('Gagal', error.message);
        } finally {
            setLoading(false);
        }
    }

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-center mb-4">We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} className="bg-blue-600 p-3 rounded-lg">
                    <Text className="text-white">Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar style="light" />

            {photo ? (
                <View className="flex-1 justify-center items-center">
                    <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                    <View className="absolute bottom-10 w-full flex-row justify-around px-10">
                        <TouchableOpacity
                            onPress={() => setPhoto(null)}
                            className="bg-red-500 p-4 rounded-full w-20 items-center"
                        >
                            <Text className="text-white font-bold">Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={status === 'IDLE' ? handleClockIn : handleClockOut}
                            disabled={loading}
                            className="bg-green-500 p-4 rounded-full w-20 items-center"
                        >
                            {loading ? <ActivityIndicator color="white" /> : (
                                <Text className="text-white font-bold">
                                    {status === 'IDLE' ? 'IN' : 'OUT'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <CameraView style={{ flex: 1 }} facing={facing} ref={cameraRef}>
                    <View className="flex-1 flex-col justify-end p-10">
                        <View className="flex-row justify-between items-center mb-10">
                            <TouchableOpacity onPress={() => router.back()} className="bg-gray-800/50 p-3 rounded-full">
                                <Text className="text-white">Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="w-20 h-20 bg-white rounded-full border-4 border-gray-300" onPress={takePicture} />
                            <TouchableOpacity
                                onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
                                className="bg-gray-800/50 p-3 rounded-full"
                            >
                                <Text className="text-white">Flip</Text>
                            </TouchableOpacity>
                        </View>
                        <Text className="text-white text-center mb-4">
                            {location ? `GPS: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Locating...'}
                        </Text>
                    </View>
                </CameraView>
            )}
        </SafeAreaView>
    );
}
