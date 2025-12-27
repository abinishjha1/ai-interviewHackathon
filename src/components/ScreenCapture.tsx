'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface ScreenCaptureProps {
    onCapture: (imageData: string) => void;
    isActive: boolean;
}

export default function ScreenCapture({ onCapture, isActive }: ScreenCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'window',
                },
                audio: false,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsSharing(true);
            setError(null);

            // Handle stream ending (user stops sharing)
            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };
        } catch (err) {
            console.error('Error starting screen share:', err);
            setError('Failed to start screen sharing. Please try again.');
        }
    }, []);

    const stopScreenShare = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsSharing(false);
    }, []);

    const captureFrame = useCallback(() => {
        if (!videoRef.current || !isSharing) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        onCapture(imageData);
    }, [isSharing, onCapture]);

    // Auto-capture frames when active
    useEffect(() => {
        if (!isActive || !isSharing) return;

        const interval = setInterval(() => {
            captureFrame();
        }, 5000); // Capture every 5 seconds

        return () => clearInterval(interval);
    }, [isActive, isSharing, captureFrame]);

    // Start sharing when interview becomes active
    useEffect(() => {
        if (isActive && !isSharing) {
            startScreenShare();
        }
        if (!isActive && isSharing) {
            stopScreenShare();
        }
    }, [isActive, isSharing, startScreenShare, stopScreenShare]);

    return (
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isSharing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-white text-sm font-medium">
                        {isSharing ? 'Screen Sharing Active' : 'Screen Share Inactive'}
                    </span>
                </div>
                {!isActive && (
                    <button
                        onClick={isSharing ? stopScreenShare : startScreenShare}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${isSharing
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        {isSharing ? 'Stop' : 'Start Preview'}
                    </button>
                )}
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                />
                {!isSharing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Screen share will start when interview begins</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-500/20 border-t border-red-500/30 px-4 py-2">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}
        </div>
    );
}
