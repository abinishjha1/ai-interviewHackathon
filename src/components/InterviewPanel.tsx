'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ScreenCapture from './ScreenCapture';
import SpeechRecognition from './SpeechRecognition';
import QuestionDisplay from './QuestionDisplay';
import TranscriptView from './TranscriptView';
import ScoreReport from './ScoreReport';
// Tesseract removed in favor of GPT-4 Vision
import { InterviewPhase } from '@/lib/openai';
import { useInterviewStorage } from '@/lib/useInterviewStorage';
// VoiceModeUI removed
import OrbVisualizer from './OrbVisualizer';
import { useAudioLevel } from '@/lib/useAudioLevel';

interface EvaluationResult {
    technicalDepth: number;
    clarity: number;
    originality: number;
    understanding: number;
    problemSolving: number;
    communication: number;
    overallScore: number;
    feedback: string;
    strengths: string[];
    areasForImprovement: string[];
    detailedBreakdown: {
        technicalConcepts: string;
        architectureUnderstanding: string;
        codeQuality: string;
        presentationSkills: string;
    };
}

export default function InterviewPanel() {
    const [isInterviewActive, setIsInterviewActive] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [screenImage, setScreenImage] = useState<string | null>(null); // Base64 image for Vision
    const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
    const [questionHistory, setQuestionHistory] = useState<{ question: string; answer: string; phase: InterviewPhase; difficulty: string }[]>([]);
    const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [interviewDuration, setInterviewDuration] = useState(0);
    const [showReport, setShowReport] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<InterviewPhase>('greeting');
    const [lastSpeechTime, setLastSpeechTime] = useState<number>(Date.now());
    const [silenceDuration, setSilenceDuration] = useState(0);
    const [savedInterviewId, setSavedInterviewId] = useState<string | null>(null);
    const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
    const [lastAIResponse, setLastAIResponse] = useState<string | null>(null);
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [userAudioStream, setUserAudioStream] = useState<MediaStream | null>(null);
    const userAudioLevel = useAudioLevel(userAudioStream);

    const lastUserSpeechRef = useRef<string>('');
    const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentAnswerRef = useRef<string>('');

    // Storage hook for saving and exporting interviews
    const { saveInterview, generateReport, getInterview } = useInterviewStorage();

    const transcriptRef = useRef(transcript);
    const screenImageRef = useRef(screenImage);
    const questionHistoryRef = useRef(questionHistory);
    const lastActivityRef = useRef<number>(Date.now());

    // Keep refs in sync
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        screenImageRef.current = screenImage;
    }, [screenImage]);

    useEffect(() => {
        questionHistoryRef.current = questionHistory;
    }, [questionHistory]);

    // Interview timer and phase tracking
    useEffect(() => {
        if (!isInterviewActive) return;

        const timer = setInterval(() => {
            setInterviewDuration(prev => prev + 1);

            // Update phase based on question count and duration
            const questionCount = questionHistoryRef.current.length;
            if (questionCount === 0 && !hasGreeted) setCurrentPhase('greeting');
            else if (questionCount <= 1) setCurrentPhase('personal-intro');
            else if (questionCount <= 3) setCurrentPhase('project-overview');
            else if (questionCount <= 6) setCurrentPhase('deep-dive');
            else if (questionCount <= 9) setCurrentPhase('problem-solving');
            else setCurrentPhase('closing');
        }, 1000);

        return () => clearInterval(timer);
    }, [isInterviewActive, hasGreeted]);

    // Silence detection
    useEffect(() => {
        if (!isInterviewActive) return;

        const silenceTimer = setInterval(() => {
            const timeSinceLastSpeech = Date.now() - lastActivityRef.current;
            setSilenceDuration(timeSinceLastSpeech);
        }, 1000);

        return () => clearInterval(silenceTimer);
    }, [isInterviewActive]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // OpenAI TTS - play audio from API
    const speakWithOpenAI = useCallback(async (text: string) => {
        if (isAISpeaking) return;

        setIsAISpeaking(true);

        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'tts', text }),
            });

            if (!response.ok) {
                throw new Error('TTS request failed');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.pause();
            }

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setIsAISpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                setIsAISpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error('OpenAI TTS error:', error);
            setIsAISpeaking(false);
            // Fallback to browser TTS
            speakWithBrowserTTS(text);
        }
    }, [isAISpeaking]);

    // Fallback browser TTS
    const speakWithBrowserTTS = useCallback((text: string) => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; // Slightly faster for realism
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.lang.startsWith('en'));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsAISpeaking(true);
        utterance.onend = () => setIsAISpeaking(false);
        utterance.onerror = () => setIsAISpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    // Stop AI from speaking (Barge-in)
    const stopAISpeaking = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsAISpeaking(false);
    }, []);

    // Generate AI response to user's speech
    const generateResponse = useCallback(async (userSpeech: string, isGreeting: boolean = false) => {
        console.log('generateResponse called', { userSpeech, isGreeting, isGeneratingResponse, isAISpeaking, lastSpeech: lastUserSpeechRef.current });

        if (isGeneratingResponse) {
            console.log('Skipping: generateResponse called while isGeneratingResponse is true');
            return;
        }

        // If AI is speaking, we should probably stop it and listen, but here we just return to avoid overlapping
        // The handleTranscript should have stopped it already.
        if (isAISpeaking) {
            console.log('Skipping: generateResponse called while isAISpeaking is true');
            return;
        }

        const normalizedSpeech = userSpeech.trim().toLowerCase();
        const normalizedLast = lastUserSpeechRef.current.trim().toLowerCase();

        // Don't respond to the same thing twice (unless greeting), but allow short confirmations like "Yes"
        if (!isGreeting && normalizedSpeech === normalizedLast && normalizedSpeech.length > 20) {
            console.log('Skipping: Long duplicate speech detected', normalizedSpeech);
            return;
        }

        // Don't respond to very short utterances (noise)
        if (!isGreeting && normalizedSpeech.length < 2) {
            console.log('Skipping: Speech too short');
            return;
        }

        console.log('Starting response generation for:', userSpeech);
        setIsGeneratingResponse(true);
        if (!isGreeting) lastUserSpeechRef.current = userSpeech;

        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'respond',
                    context: {
                        screenImage: screenImageRef.current || undefined, // Send image to Vision
                        speechTranscript: transcriptRef.current,
                        previousQuestions: questionHistoryRef.current.map(q => q.question),
                        previousAnswers: questionHistoryRef.current.map(q => q.answer),
                        interviewPhase: currentPhase,
                        interviewDuration: interviewDuration,
                        conversationHistory: [] // Handled in service
                    },
                    userSpeech: userSpeech,
                    isFirstMessage: isGreeting,
                }),
            });

            const data = await response.json();

            if (data.response) {
                // Store the AI's response as a "question" in history
                if (currentQuestion && currentAnswerRef.current) {
                    setQuestionHistory(prev => [
                        ...prev,
                        {
                            question: currentQuestion,
                            answer: currentAnswerRef.current,
                            phase: currentPhase,
                            difficulty: 'medium'
                        }
                    ]);
                    currentAnswerRef.current = '';
                }

                setCurrentQuestion(data.response);
                setLastAIResponse(data.response);

                if (data.phase) {
                    setCurrentPhase(data.phase);
                }

                if (isGreeting) {
                    setHasGreeted(true);
                }

                // Speak the response with OpenAI TTS
                await speakWithOpenAI(data.response);
            }
        } catch (error) {
            console.error('Error generating response:', error);
            // Ensure we don't get stuck in "thinking" state
            setIsGeneratingResponse(false);
        } finally {
            setIsGeneratingResponse(false);
        }
    }, [currentQuestion, isGeneratingResponse, isAISpeaking, currentPhase, interviewDuration, speakWithOpenAI]);

    const handleScreenCapture = useCallback((imageData: string) => {
        if (!isInterviewActive) return;
        // Directly store base64 image for GPT-4 Vision
        setScreenImage(imageData);
    }, [isInterviewActive]);

    const handleTranscript = useCallback((text: string, isFinal: boolean) => {
        if (text.trim().length > 0) {
            // Barge-in: If AI is speaking and user starts talking, stop the AI
            if (isAISpeaking) {
                console.log('Barge-in detected! Stopping AI.');
                stopAISpeaking();
            }

            if (isFinal) {
                setTranscript(prev => prev + ' ' + text);
                currentAnswerRef.current += ' ' + text;
                lastActivityRef.current = Date.now();
                setLastSpeechTime(Date.now());

                console.log(`User finished speaking chunk: "${text}". Queueing response...`);

                // Always respond if active and greeted
                if (isInterviewActive && hasGreeted) {
                    // Clear any existing timeout to debounce
                    if (responseTimeoutRef.current) {
                        clearTimeout(responseTimeoutRef.current);
                    }

                    // Wait 0.8s silence before responding to ensure user is truly done
                    responseTimeoutRef.current = setTimeout(() => {
                        const fullAnswer = currentAnswerRef.current.trim();
                        if (fullAnswer.length > 5) { // Minimum length check
                            console.log('Silence detected. Generating response for full answer:', fullAnswer);
                            generateResponse(fullAnswer);
                        }
                    }, 800);
                }
            }
        }
    }, [isInterviewActive, isAISpeaking, hasGreeted, generateResponse, stopAISpeaking]);

    const startInterview = useCallback(() => {
        setIsInterviewActive(true);
        setTranscript('');
        setScreenImage(null);
        setCurrentQuestion(null);
        setQuestionHistory([]);
        setInterviewDuration(0);
        setEvaluation(null);
        setCurrentPhase('greeting');
        setLastSpeechTime(Date.now());
        setSilenceDuration(0);
        setLastAIResponse(null);
        setHasGreeted(false);
        lastActivityRef.current = Date.now();
        lastUserSpeechRef.current = '';
        currentAnswerRef.current = '';

        // Generate greeting after a brief delay
        setTimeout(() => {
            generateResponse('', true); // true = greeting
        }, 1500);

        // Request microphone for visualizer
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => setUserAudioStream(stream))
            .catch(err => console.warn('Mic access for visualizer denied:', err));
    }, [generateResponse]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (responseTimeoutRef.current) {
                clearTimeout(responseTimeoutRef.current);
            }
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    const endInterview = useCallback(async () => {
        setIsInterviewActive(false);
        // setIsVoiceMode(false); // Removed
        setIsEvaluating(true);
        setShowReport(true);

        if (audioRef.current) {
            audioRef.current.pause();
        }

        try {
            // Create context object
            const context = {
                speechTranscript: transcript,
                screenImage: screenImage || undefined,
                previousQuestions: questionHistory.map(q => q.question),
                previousAnswers: questionHistory.map(q => q.answer),
                interviewPhase: currentPhase,
                interviewDuration: interviewDuration
            };

            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'evaluate',
                    context: context,
                }),
            });

            const data = await response.json();
            setEvaluation(data);

            // Save interview to localStorage
            const interviewId = saveInterview({
                duration: interviewDuration,
                overallScore: data.overallScore || 5,
                questionCount: questionHistory.length,
                transcript: transcript,
                evaluation: data,
                questions: questionHistory.map(q => ({ question: q.question, answer: q.answer })),
            });
            setSavedInterviewId(interviewId);
        } catch (error) {
            console.error('Evaluation error:', error);
            const fallbackEval = {
                technicalDepth: 5,
                clarity: 5,
                originality: 5,
                understanding: 5,
                problemSolving: 5,
                communication: 5,
                overallScore: 5,
                feedback: 'Unable to generate detailed evaluation.',
                strengths: [],
                areasForImprovement: [],
                detailedBreakdown: {
                    technicalConcepts: 'Assessment unavailable.',
                    architectureUnderstanding: 'Assessment unavailable.',
                    codeQuality: 'Assessment unavailable.',
                    presentationSkills: 'Assessment unavailable.',
                },
            };
            setEvaluation(fallbackEval);

            const interviewId = saveInterview({
                duration: interviewDuration,
                overallScore: 5,
                questionCount: questionHistory.length,
                transcript: transcript,
                evaluation: fallbackEval,
                questions: questionHistory.map(q => ({ question: q.question, answer: q.answer })),
            });
            setSavedInterviewId(interviewId);
        } finally {
            setIsEvaluating(false);
        }
    }, [screenImage, transcript, questionHistory, currentPhase, interviewDuration, saveInterview]);

    // Manual trigger for next response (when user wants to move forward)
    const triggerNextResponse = useCallback(() => {
        if (!isGeneratingResponse && !isAISpeaking && hasGreeted) {
            generateResponse(transcriptRef.current.slice(-300));
        }
    }, [isGeneratingResponse, isAISpeaking, hasGreeted, generateResponse]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
            {/* Header */}
            <header className="bg-black/40 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">AI Interviewer</h1>
                            <p className="text-gray-400 text-xs">Powered by OpenAI GPT-4o</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {isInterviewActive && (
                            <>
                                <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1.5 rounded-full border border-purple-500/30">
                                    <span className="text-purple-300 text-xs uppercase tracking-wider">
                                        {currentPhase === 'greeting' ? 'Greeting' :
                                            currentPhase === 'personal-intro' ? 'Introduction' :
                                                currentPhase === 'project-overview' ? 'Project Overview' :
                                                    currentPhase === 'deep-dive' ? 'Deep Dive' :
                                                        currentPhase === 'problem-solving' ? 'Problem Solving' : 'Closing'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-full">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-red-400 font-mono font-medium">{formatDuration(interviewDuration)}</span>
                                </div>
                            </>
                        )}

                        {!isInterviewActive ? (
                            <button
                                onClick={startInterview}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Start Interview
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                {/* "Voice Mode" button removed as it's now integrated */}
                                <button
                                    onClick={triggerNextResponse}
                                    disabled={isGeneratingResponse || isAISpeaking}
                                    className="px-4 py-2.5 bg-purple-600/80 hover:bg-purple-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Next Response
                                </button>
                                <button
                                    onClick={endInterview}
                                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                    </svg>
                                    End Interview
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <ScreenCapture onCapture={handleScreenCapture} isActive={isInterviewActive} />
                    <SpeechRecognition onTranscript={handleTranscript} isActive={isInterviewActive} />

                    {/* AI Status Indicator with Embedded Visualizer */}
                    {isInterviewActive && (
                        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                            {/* Visualizer Background */}
                            <div className="absolute inset-0 opacity-80">
                                <OrbVisualizer
                                    isActive={true}
                                    isAISpeaking={isAISpeaking}
                                    isGeneratingResponse={isGeneratingResponse}
                                    audioLevel={userAudioLevel}
                                />
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-3 mt-auto mb-4">
                                <div className={`px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 ${isAISpeaking ? 'bg-blue-500/20' :
                                    isGeneratingResponse ? 'bg-yellow-500/20' :
                                        'bg-green-500/20'
                                    }`}>
                                    <span className="text-white font-medium text-sm shadow-black drop-shadow-md">
                                        {isAISpeaking ? '🎙️ Alex is speaking' :
                                            isGeneratingResponse ? '🤔 Alex is thinking...' :
                                                '👂 Alex is listening'}
                                    </span>
                                </div>
                            </div>

                            {lastAIResponse && (
                                <div className="relative z-10 mt-2 max-w-sm text-center bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/5 mx-auto">
                                    <p className="text-blue-100 text-sm italic leading-relaxed">&ldquo;{lastAIResponse}&rdquo;</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <QuestionDisplay
                        currentQuestion={currentQuestion}
                        questionHistory={questionHistory}
                        isGenerating={isGeneratingResponse}
                        currentPhase={currentPhase}
                    />
                    {/* TranscriptView removed or updated as we don't show raw OCR anymore */}
                    <TranscriptView transcript={transcript} ocrContent={screenImage ? "(Screen sharing active - Vision enabled)" : "(No screen shared)"} />
                </div>
            </main>

            {/* Instructions (when not active) */}
            {!isInterviewActive && (
                <div className="max-w-7xl mx-auto px-4 pb-8">
                    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            How It Works
                        </h3>
                        <div className="grid md:grid-cols-4 gap-4">
                            {[
                                { icon: '🖥️', title: 'Share Screen', desc: 'Share your project or presentation' },
                                { icon: '🎤', title: 'Have a Conversation', desc: 'Talk naturally with Alex' },
                                { icon: '🤖', title: 'Two-Way Dialog', desc: 'Alex responds to what you say' },
                                { icon: '📊', title: 'Get Scored', desc: 'Receive detailed feedback' },
                            ].map((step, i) => (
                                <div key={i} className="bg-black/30 rounded-xl p-4 text-center">
                                    <div className="text-3xl mb-2">{step.icon}</div>
                                    <h4 className="text-white font-medium mb-1">{step.title}</h4>
                                    <p className="text-gray-400 text-sm">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
            }


            {/* Voice Mode Overlay Removed */}
            {/* <VoiceModeUI ... /> */}

            {/* Score Report Modal */}
            {/* Score Report Modal */}
            {showReport && (
                <ScoreReport
                    evaluation={evaluation}
                    isEvaluating={isEvaluating}
                    onClose={() => setShowReport(false)}
                    onDownload={() => {
                        if (savedInterviewId) {
                            const interview = getInterview(savedInterviewId);
                            if (interview) {
                                generateReport(interview);
                            }
                        }
                    }}
                />
            )}
        </div >
    );
}
