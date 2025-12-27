'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SavedInterview {
    id: string;
    date: string;
    duration: number;
    overallScore: number;
    questionCount: number;
    transcript: string;
    evaluation: {
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
        detailedBreakdown?: {
            technicalConcepts: string;
            architectureUnderstanding: string;
            codeQuality: string;
            presentationSkills: string;
        };
    };
    questions: { question: string; answer: string }[];
}

const STORAGE_KEY = 'ai-interviewer-history';

export function useInterviewStorage() {
    const [interviews, setInterviews] = useState<SavedInterview[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load interviews from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setInterviews(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading interviews:', error);
        }
        setIsLoaded(true);
    }, []);

    // Save interview
    const saveInterview = useCallback((interview: Omit<SavedInterview, 'id' | 'date'>) => {
        const newInterview: SavedInterview = {
            ...interview,
            id: `interview-${Date.now()}`,
            date: new Date().toISOString(),
        };

        setInterviews(prev => {
            const updated = [newInterview, ...prev].slice(0, 20); // Keep last 20
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });

        return newInterview.id;
    }, []);

    // Delete interview
    const deleteInterview = useCallback((id: string) => {
        setInterviews(prev => {
            const updated = prev.filter(i => i.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Get interview by ID
    const getInterview = useCallback((id: string) => {
        return interviews.find(i => i.id === id);
    }, [interviews]);

    // Clear all interviews
    const clearAll = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setInterviews([]);
    }, []);

    // Export to JSON
    const exportToJSON = useCallback((interview: SavedInterview) => {
        const dataStr = JSON.stringify(interview, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `interview-${new Date(interview.date).toLocaleDateString().replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    // Generate printable report
    const generateReport = useCallback((interview: SavedInterview) => {
        const reportWindow = window.open('', '_blank');
        if (!reportWindow) return;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Interview Report - ${new Date(interview.date).toLocaleDateString()}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
        h1 { color: #7c3aed; margin-bottom: 8px; }
        .meta { color: #666; margin-bottom: 32px; }
        .score-circle { width: 120px; height: 120px; border: 8px solid #7c3aed; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 20px auto; }
        .score-value { font-size: 36px; font-weight: bold; color: #7c3aed; }
        .score-label { font-size: 12px; color: #666; }
        .section { margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 12px; }
        .section h2 { color: #374151; margin-bottom: 12px; font-size: 18px; }
        .score-bar { margin: 12px 0; }
        .score-bar-label { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .score-bar-track { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .score-bar-fill { height: 100%; background: #7c3aed; border-radius: 4px; }
        .feedback { line-height: 1.7; color: #374151; }
        ul { margin-left: 20px; }
        li { margin: 8px 0; line-height: 1.5; }
        .strengths { color: #059669; }
        .improvements { color: #d97706; }
        .qa { border-left: 3px solid #7c3aed; padding-left: 16px; margin: 16px 0; }
        .qa-q { font-weight: 600; color: #7c3aed; margin-bottom: 8px; }
        .qa-a { color: #4b5563; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <h1>🎤 AI Interview Report</h1>
    <p class="meta">Date: ${new Date(interview.date).toLocaleDateString()} | Duration: ${Math.floor(interview.duration / 60)}m ${interview.duration % 60}s | Questions: ${interview.questionCount}</p>
    
    <div class="score-circle">
        <span class="score-value">${interview.overallScore}</span>
        <span class="score-label">/ 10</span>
    </div>

    <div class="section">
        <h2>📊 Detailed Scores</h2>
        ${[
                { key: 'technicalDepth', label: 'Technical Depth', value: interview.evaluation.technicalDepth },
                { key: 'clarity', label: 'Clarity', value: interview.evaluation.clarity },
                { key: 'originality', label: 'Originality', value: interview.evaluation.originality },
                { key: 'understanding', label: 'Understanding', value: interview.evaluation.understanding },
                { key: 'problemSolving', label: 'Problem Solving', value: interview.evaluation.problemSolving },
                { key: 'communication', label: 'Communication', value: interview.evaluation.communication },
            ].map(item => `
            <div class="score-bar">
                <div class="score-bar-label">
                    <span>${item.label}</span>
                    <strong>${item.value || 5}/10</strong>
                </div>
                <div class="score-bar-track">
                    <div class="score-bar-fill" style="width: ${(item.value || 5) * 10}%"></div>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>💬 Feedback</h2>
        <p class="feedback">${interview.evaluation.feedback}</p>
    </div>

    ${interview.evaluation.strengths.length > 0 ? `
    <div class="section">
        <h2 class="strengths">✅ Strengths</h2>
        <ul>${interview.evaluation.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
    </div>` : ''}

    ${interview.evaluation.areasForImprovement.length > 0 ? `
    <div class="section">
        <h2 class="improvements">📈 Areas for Improvement</h2>
        <ul>${interview.evaluation.areasForImprovement.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>` : ''}

    ${interview.questions.length > 0 ? `
    <div class="section">
        <h2>❓ Interview Q&A</h2>
        ${interview.questions.map((qa, i) => `
            <div class="qa">
                <p class="qa-q">Q${i + 1}: ${qa.question}</p>
                <p class="qa-a">${qa.answer || '(No response)'}</p>
            </div>
        `).join('')}
    </div>` : ''}

    <script>window.print();</script>
</body>
</html>`;

        reportWindow.document.write(html);
        reportWindow.document.close();
    }, []);

    return {
        interviews,
        isLoaded,
        saveInterview,
        deleteInterview,
        getInterview,
        clearAll,
        exportToJSON,
        generateReport,
    };
}
