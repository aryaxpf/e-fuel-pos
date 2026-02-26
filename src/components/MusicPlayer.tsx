'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Minimize2, Maximize2 } from 'lucide-react';

const PLAYLIST = [
    { title: 'Kaikai Kitan - Eve', url: 'https://www.youtube.com/watch?v=1tk1pqwrOys' },
    { title: 'Yoake to Hotaru - n-buna', url: 'https://www.youtube.com/watch?v=Ep6S_k3r1sA' },
    { title: 'Lofi Girl Live Stream', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }
];

export default function MusicPlayer() {
    const [isClient, setIsClient] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isMinimized, setIsMinimized] = useState(true);
    const [isInteractable, setIsInteractable] = useState(false);

    const Player: any = ReactPlayer;

    useEffect(() => {
        setIsClient(true);
    }, []);

    const currentTrack = PLAYLIST[currentTrackIndex];

    const handlePlayPause = () => {
        setIsInteractable(true);
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        setIsInteractable(true);
        setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
        setIsPlaying(true);
    };

    const handlePrev = () => {
        setIsInteractable(true);
        setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
        setIsPlaying(true);
    };

    const handleVolume = (e: any) => {
        setIsInteractable(true);
        setVolume(parseFloat(e.target.value));
        if (parseFloat(e.target.value) > 0) setIsMuted(false);
    };

    const toggleMute = () => {
        setIsInteractable(true);
        setIsMuted(!isMuted);
    };

    const handleEnded = () => {
        handleNext();
    };

    if (!isClient) return null;

    return (
        <div
            className={`fixed z-[9999] bottom-6 right-6 transition-all duration-500 ease-out shadow-2xl rounded-2xl overflow-hidden border border-slate-200/20`}
            style={{
                background: 'rgba(30,30,40,0.85)',
                backdropFilter: 'blur(16px)',
                width: isMinimized ? 'auto' : '300px'
            }}
        >
            {/* Visually Hidden Player */}
            <div className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none overflow-hidden -z-10">
                <Player
                    url={currentTrack.url}
                    playing={isPlaying && isInteractable}
                    volume={volume}
                    muted={isMuted}
                    onEnded={handleEnded}
                    width="100%"
                    height="100%"
                />
            </div>

            {/* Minimized View */}
            {isMinimized ? (
                <button
                    onClick={() => setIsMinimized(false)}
                    className="flex items-center gap-3 p-3 lg:p-4 text-white hover:bg-white/10 transition-colors"
                >
                    <div className="relative">
                        <Music size={20} className={isPlaying ? "animate-bounce text-emerald-400" : "text-slate-300"} />
                        {isPlaying && <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>}
                    </div>
                </button>
            ) : (
                /* Maximized View */
                <div className="flex flex-col text-white">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Music size={16} className="text-emerald-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">BGM Player</span>
                        </div>
                        <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-white">
                            <Minimize2 size={16} />
                        </button>
                    </div>

                    {/* Meta */}
                    <div className="p-4 px-5 text-center">
                        <h4 className="font-bold text-sm truncate" title={currentTrack.title}>{currentTrack.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">Smart POS Soundtrack</p>
                    </div>

                    {/* Controls */}
                    <div className="px-5 pb-5 flex flex-col gap-4">
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300">
                                <SkipBack size={20} />
                            </button>
                            <button onClick={handlePlayPause} className="w-12 h-12 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105">
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                            </button>
                            <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300">
                                <SkipForward size={20} />
                            </button>
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-2">
                            <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
                                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolume}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
