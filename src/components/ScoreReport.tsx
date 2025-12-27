'use client';

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

interface ScoreReportProps {
    evaluation: EvaluationResult | null;
    isEvaluating: boolean;
    onClose: () => void;
    onDownload?: () => void;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
    return (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-gray-300 text-sm">{label}</span>
                <span className="text-white font-bold">{score}/10</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${color}`}
                    style={{ width: `${score * 10}%` }}
                />
            </div>
        </div>
    );
}

export default function ScoreReport({ evaluation, isEvaluating, onClose, onDownload }: ScoreReportProps) {
    if (!evaluation && !isEvaluating) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
                {isEvaluating ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                        <h3 className="text-white text-xl font-semibold mb-2">Evaluating Interview</h3>
                        <p className="text-gray-400">Analyzing your presentation and responses...</p>
                    </div>
                ) : evaluation && (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Interview Evaluation</h2>
                                <p className="text-gray-400">Your performance summary</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Overall Score */}
                        <div className="p-6 border-b border-gray-700">
                            <div className="flex items-center justify-center gap-6">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="none"
                                            className="text-gray-700"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="none"
                                            strokeDasharray={`${evaluation.overallScore * 35.2} 352`}
                                            className="text-purple-500 transition-all duration-1000"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-4xl font-bold text-white">{evaluation.overallScore}</span>
                                        <span className="text-gray-400 text-sm">/10</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-1">Overall Score</h3>
                                    <p className="text-gray-400">
                                        {evaluation.overallScore >= 8 ? 'Excellent!' :
                                            evaluation.overallScore >= 6 ? 'Good job!' :
                                                evaluation.overallScore >= 4 ? 'Room for improvement' : 'Needs work'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Scores */}
                        <div className="p-6 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4">Detailed Scores</h3>
                            <ScoreBar label="Technical Depth" score={evaluation.technicalDepth} color="bg-blue-500" />
                            <ScoreBar label="Clarity of Explanation" score={evaluation.clarity} color="bg-green-500" />
                            <ScoreBar label="Originality" score={evaluation.originality} color="bg-yellow-500" />
                            <ScoreBar label="Understanding" score={evaluation.understanding} color="bg-purple-500" />
                            <ScoreBar label="Problem Solving" score={evaluation.problemSolving || 5} color="bg-orange-500" />
                            <ScoreBar label="Communication" score={evaluation.communication || 5} color="bg-pink-500" />
                        </div>

                        {/* Feedback */}
                        <div className="p-6 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-3">Feedback</h3>
                            <p className="text-gray-300 leading-relaxed">{evaluation.feedback}</p>
                        </div>

                        {/* Detailed Breakdown */}
                        {evaluation.detailedBreakdown && (
                            <div className="p-6 border-b border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Detailed Assessment</h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-blue-400 font-medium mb-2 text-sm">Technical Concepts</h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">{evaluation.detailedBreakdown.technicalConcepts}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-purple-400 font-medium mb-2 text-sm">Architecture Understanding</h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">{evaluation.detailedBreakdown.architectureUnderstanding}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-green-400 font-medium mb-2 text-sm">Code Quality</h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">{evaluation.detailedBreakdown.codeQuality}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-yellow-400 font-medium mb-2 text-sm">Presentation Skills</h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">{evaluation.detailedBreakdown.presentationSkills}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Strengths & Improvements */}
                        <div className="p-6 grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Strengths
                                </h4>
                                <ul className="space-y-2">
                                    {evaluation.strengths.length > 0 ? (
                                        evaluation.strengths.map((strength, i) => (
                                            <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                                <span className="text-green-400 mt-1">•</span>
                                                {strength}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-500 text-sm italic">No specific strengths noted</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    Areas for Improvement
                                </h4>
                                <ul className="space-y-2">
                                    {evaluation.areasForImprovement.length > 0 ? (
                                        evaluation.areasForImprovement.map((area, i) => (
                                            <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                                <span className="text-orange-400 mt-1">•</span>
                                                {area}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-500 text-sm italic">No specific improvements noted</li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-6 border-t border-gray-700 flex gap-3">
                            {onDownload && (
                                <button
                                    onClick={onDownload}
                                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download Report
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
                            >
                                Close Report
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
