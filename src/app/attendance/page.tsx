'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { EmployeeService, Employee } from '../../services/employee';
import Image from 'next/image';

export default function AttendancePage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [status, setStatus] = useState<'IDLE' | 'CAMERA_READY' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');
    const [location, setLocation] = useState<{ lat: number, long: number } | null>(null);
    const [photoData, setPhotoData] = useState<string | null>(null);
    const [activity, setActivity] = useState<'IN' | 'OUT'>('IN');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Load Employees for Dropdown
        EmployeeService.getEmployees().then(setEmployees);

        // Request GPS Immediately
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, long: pos.coords.longitude }),
                (err) => setErrorMessage('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif.')
            );
        } else {
            setErrorMessage('Browser tidak mendukung Geolocation.');
        }
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setStatus('CAMERA_READY');
            }
        } catch (err) {
            setErrorMessage('Gagal akses kamera. Izinkan penggunaan kamera.');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, 320, 240);
                const data = canvasRef.current.toDataURL('image/jpeg');
                setPhotoData(data);

                // Stop Camera Stream
                const stream = videoRef.current.srcObject as MediaStream;
                stream?.getTracks().forEach(track => track.stop());
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedEmployee || !location || !photoData) {
            setErrorMessage('Mohon lengkapi data: Pilih Nama, Izinkan Lokasi, dan Ambil Foto.');
            return;
        }

        try {
            if (activity === 'IN') {
                await EmployeeService.clockIn(selectedEmployee, location, photoData);
            } else {
                await EmployeeService.clockOut(selectedEmployee, location, photoData);
            }
            setStatus('SUCCESS');
            setTimeout(() => {
                // Reset or Redirect
                setPhotoData(null);
                setStatus('IDLE');
                setSelectedEmployee('');
            }, 3000);
        } catch (error: any) {
            setErrorMessage(error.message || 'Gagal menyimpan presensi.');
        }
    };

    if (status === 'SUCCESS') {
        return (
            <div className="min-h-screen bg-green-50 flex items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <CheckCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Berhasil!</h1>
                    <p className="text-slate-600">Presensi {activity === 'IN' ? 'Masuk' : 'Pulang'} tercatat.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold">Absensi Digital</h1>
                    <p className="opacity-80 text-sm mt-1">Clock In & Out System</p>
                </div>

                <div className="p-6 space-y-6">
                    {errorMessage && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2 items-center">
                            <AlertTriangle size={16} /> {errorMessage}
                        </div>
                    )}

                    {/* 1. Select User */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nama Karyawan</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={20} />
                            <select
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                            >
                                <option value="">-- Pilih Nama Anda --</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.full_name} - {e.role}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 2. Type Selector */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setActivity('IN')}
                            className={`py-3 rounded-xl font-bold border-2 transition ${activity === 'IN' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-400'}`}
                        >
                            MASUK (IN)
                        </button>
                        <button
                            onClick={() => setActivity('OUT')}
                            className={`py-3 rounded-xl font-bold border-2 transition ${activity === 'OUT' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-400'}`}
                        >
                            PULANG (OUT)
                        </button>
                    </div>

                    {/* 3. Camera / Location Status */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                        {!photoData ? (
                            <>
                                {status === 'CAMERA_READY' ? (
                                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video mb-4">
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                                        <button
                                            onClick={capturePhoto}
                                            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-slate-800 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition"
                                        >
                                            Ambil Foto 📸
                                        </button>
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-slate-200 rounded-lg flex flex-col items-center justify-center mb-4 text-slate-400">
                                        <Camera size={48} className="mb-2" />
                                        <p className="text-sm">Kamera belum aktif</p>
                                        <button onClick={startCamera} className="mt-4 text-blue-600 font-bold hover:underline">
                                            Aktifkan Kamera
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden aspect-video mb-4">
                                <img src={photoData} alt="Selfie" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => { setPhotoData(null); startCamera(); }}
                                    className="absolute bottom-2 right-2 bg-slate-800 text-white text-xs px-3 py-1 rounded-full"
                                >
                                    Ulangi
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                            <MapPin size={16} className={location ? "text-green-500" : "text-slate-300"} />
                            {location ? "Lokasi Terkunci" : "Mencari Lokasi..."}
                        </div>
                    </div>

                    {/* Hidden Canvas for Capture */}
                    <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>

                    <button
                        onClick={handleSubmit}
                        disabled={!photoData || !location || !selectedEmployee}
                        className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition
                            ${(!photoData || !location || !selectedEmployee)
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
                            }
                        `}
                    >
                        {activity === 'IN' ? 'CLOCK IN SEKARANG' : 'CLOCK OUT SEKARANG'}
                    </button>
                </div>
            </div>
        </div>
    );
}
