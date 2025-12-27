'use client';

import { InterviewPhase } from '@/lib/groq';

interface QuestionDisplayProps {
    currentQuestion: string | null;
    questionHistory: { question: string; answer: string; phase: InterviewPhase; difficulty: string }[];
    isGenerating: boolean;
    currentPhase: InterviewPhase;
}

export default function QuestionDisplay({
    currentQuestion,
    questionHistory,
    isGenerating,
    currentPhase,
}: QuestionDisplayProps) {
    const getPhaseColor = (phase: InterviewPhase) => {
        switch (phase) {
            case 'greeting': return 'text-blue-400 border-blue-500/50';
            case 'personal-intro': return 'text-cyan-400 border-cyan-500/50';
            case 'project-overview': return 'text-green-400 border-green-500/50';
            case 'deep-dive': return 'text-purple-400 border-purple-500/50';
            case 'problem-solving': return 'text-orange-400 border-orange-500/50';
            case 'closing': return 'text-yellow-400 border-yellow-500/50';
            default: return 'text-gray-400 border-gray-500/50';
        }
    };

    const getPhaseLabel = (phase: InterviewPhase) => {
        switch (phase) {
            case 'greeting': return 'Greeting';
            case 'personal-intro': return 'Personal Intro';
            case 'project-overview': return 'Project Overview';
            case 'deep-dive': return 'Deep Dive';
            case 'problem-solving': return 'Problem Solving';
            case 'closing': return 'Closing';
            default: return 'Interview';
        }
    };
    return (
        <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl shadow-purple-900/20">
            <div className="bg-gradient-to-r from-purple-800/40 to-blue-800/40 px-5 py-4 border-b border-purple-500/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">AI Interviewer</h3>
                        <p className="text-purple-300 text-xs">Your friendly technical interviewer</p>
                    </div>
                </div>
            </div>

            <div className="p-5">
                {/* Current Question */}
                <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-purple-200 text-sm font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                            Current Question
                        </p>
                        {currentQuestion && (
                            <div className={`text-xs px-3 py-1.5 rounded-full font-medium border backdrop-blur-sm ${getPhaseColor(currentPhase)}`}>
                                {getPhaseLabel(currentPhase)}
                            </div>
                        )}
                    </div>
                    <div className="bg-black/40 rounded-xl p-5 min-h-[100px] border border-white/5">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-4">
                                <div className="flex gap-1.5 mb-3">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            className="w-3 h-3 bg-gradient-to-t from-purple-500 to-purple-400 rounded-full animate-bounce shadow-lg shadow-purple-500/30"
                                            style={{ animationDelay: `${i * 150}ms` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-purple-300 text-sm">Thinking of a great question...</span>
                            </div>
                        ) : currentQuestion ? (
                            <p className="text-white text-lg leading-relaxed font-medium">{currentQuestion}</p>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm italic">Ready to start when you are!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Question History */}
                {questionHistory.length > 0 && (
                    <div>
                        <p className="text-purple-200 text-sm font-medium mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Previous Questions ({questionHistory.length})
                        </p>
                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {questionHistory.map((item, index) => (
                                <div key={index} className="bg-black/30 rounded-xl p-4 border-l-4 border-purple-500/70 hover:bg-black/40 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="text-purple-100 text-sm font-medium leading-relaxed">
                                            <span className="text-purple-400 font-bold">Q{index + 1}:</span> {item.question}
                                        </p>
                                        <span className={`text-[10px] px-2 py-1 rounded-full flex-shrink-0 border ${getPhaseColor(item.phase)}`}>
                                            {getPhaseLabel(item.phase)}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-400 text-xs font-bold flex-shrink-0">A:</span>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            {item.answer?.slice(0, 150) || '(No response captured)'}
                                            {item.answer && item.answer.length > 150 ? '...' : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
