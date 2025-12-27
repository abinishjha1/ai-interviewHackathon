'use client';

interface TranscriptViewProps {
    transcript: string;
    ocrContent: string;
}

export default function TranscriptView({ transcript, ocrContent }: TranscriptViewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Speech Transcript */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-700/50 px-4 py-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <h4 className="text-white text-sm font-medium">Speech Transcript</h4>
                </div>
                <div className="p-4 h-[150px] overflow-y-auto">
                    {transcript ? (
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
                    ) : (
                        <p className="text-gray-500 text-sm italic">Speech will appear here...</p>
                    )}
                </div>
            </div>

            {/* OCR Content */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-700/50 px-4 py-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h4 className="text-white text-sm font-medium">Visual Context (Vision)</h4>
                </div>
                <div className="p-4 h-[150px] overflow-y-auto">
                    {ocrContent ? (
                        <p className="text-gray-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">{ocrContent}</p>
                    ) : (
                        <p className="text-gray-500 text-sm italic">Screen text will appear here...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
