'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SpeechRecognitionProps {
    onTranscript: (transcript: string, isFinal: boolean) => void;
    isActive: boolean;
}

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: Event & { error: string }) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

export default function SpeechRecognitionComponent({ onTranscript, isActive }: SpeechRecognitionProps) {
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const isStartingRef = useRef(false); // Prevent double-start

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isStartingRef.current || isListening) return;

        isStartingRef.current = true;
        try {
            recognitionRef.current.start();
            setIsListening(true);
            setError(null);
        } catch (err) {
            // If already started, that's fine - just ignore
            if (err instanceof Error && err.name === 'InvalidStateError') {
                setIsListening(true);
            } else {
                console.error('Error starting speech recognition:', err);
                setError('Failed to start speech recognition');
            }
        } finally {
            // Reset after a short delay to allow for state settling
            setTimeout(() => {
                isStartingRef.current = false;
            }, 100);
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;

        try {
            recognitionRef.current.stop();
            setIsListening(false);
            isStartingRef.current = false;
        } catch (err) {
            console.error('Error stopping speech recognition:', err);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript + ' ';
                    onTranscript(transcript, true);
                } else {
                    interim += transcript;
                }
            }

            setInterimTranscript(interim);
            if (final) {
                setInterimTranscript('');
            }
        };

        recognition.onerror = (event: Event & { error: string }) => {
            // Silently handle common non-critical errors
            const silentErrors = ['no-speech', 'aborted', 'network'];
            if (silentErrors.includes(event.error)) {
                // These are normal during operation, don't show to user
                return;
            }

            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                setError('Microphone access denied. Please allow microphone access.');
                setIsListening(false);
            } else {
                setError(`Speech recognition error: ${event.error}`);
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // Auto-restart if still active
            if (isActive && !isStartingRef.current) {
                isStartingRef.current = true;
                setTimeout(() => {
                    try {
                        recognition.start();
                        setIsListening(true);
                    } catch {
                        // Ignore if already started
                    }
                    isStartingRef.current = false;
                }, 100);
            } else if (!isActive) {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // Ignore abort errors
                }
            }
        };
    }, [onTranscript, isActive]);

    // Start/stop based on isActive
    useEffect(() => {
        if (isActive && !isListening && isSupported && !isStartingRef.current) {
            startListening();
        }
        if (!isActive && isListening) {
            stopListening();
        }
    }, [isActive, isListening, isSupported, startListening, stopListening]);

    if (!isSupported) {
        return (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="text-yellow-500 font-medium">Speech Recognition Not Supported</p>
                        <p className="text-yellow-400/70 text-sm">Please use Chrome, Edge, or Safari for speech recognition.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`relative w-4 h-4`}>
                        <div className={`absolute inset-0 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        {isListening && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50" />}
                    </div>
                    <div>
                        <span className="text-white font-semibold">Voice Recognition</span>
                        <p className={`text-xs ${isListening ? 'text-green-400' : 'text-gray-500'}`}>
                            {isListening ? 'Listening to you...' : 'Waiting to start'}
                        </p>
                    </div>
                </div>
                {isListening && (
                    <div className="flex items-end gap-[3px] h-6">
                        {[...Array(7)].map((_, i) => (
                            <div
                                key={i}
                                className="w-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full animate-pulse"
                                style={{
                                    height: `${12 + Math.random() * 12}px`,
                                    animationDelay: `${i * 100}ms`,
                                    animationDuration: `${300 + Math.random() * 200}ms`
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {interimTranscript && (
                <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl p-4 border border-gray-700/30">
                    <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mt-2 flex-shrink-0" />
                        <p className="text-gray-300 text-sm italic leading-relaxed">&ldquo;{interimTranscript}&rdquo;</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
