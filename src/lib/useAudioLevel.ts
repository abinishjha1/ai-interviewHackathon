'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export function useAudioLevel(stream: MediaStream | null) {
    const [level, setLevel] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const startAnalysis = useCallback(() => {
        if (!stream) return;

        try {
            // Initialize AudioContext
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            analyzerRef.current = analyzer;

            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const analyze = () => {
                if (!analyzerRef.current) return;

                analyzerRef.current.getByteFrequencyData(dataArray);

                // Calculate average volume level
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // Normalize to 0-1 range and add smoothing
                const normalized = Math.min(1, average / 128);
                setLevel(prev => prev * 0.7 + normalized * 0.3); // Smooth transition

                animationFrameRef.current = requestAnimationFrame(analyze);
            };

            analyze();
        } catch (error) {
            console.error('Error initializing audio analysis:', error);
        }
    }, [stream]);

    const stopAnalysis = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        setLevel(0);
    }, []);

    useEffect(() => {
        if (stream) {
            startAnalysis();
        } else {
            stopAnalysis();
        }

        return () => stopAnalysis();
    }, [stream, startAnalysis, stopAnalysis]);

    return level;
}
