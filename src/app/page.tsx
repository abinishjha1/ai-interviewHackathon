'use client';

import dynamic from 'next/dynamic';

const InterviewPanel = dynamic(() => import('@/components/InterviewPanel'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Loading AI Interviewer...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <InterviewPanel />;
}
