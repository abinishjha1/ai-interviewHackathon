import { NextRequest, NextResponse } from 'next/server';
import {
    generateConversationalResponse,
    generateTextToSpeech,
    evaluateInterview,
    InterviewContext
} from '@/lib/openai';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, context, userSpeech, isFirstMessage } = body as {
            action: string;
            context: InterviewContext;
            userSpeech?: string;
            isFirstMessage?: boolean;
        };

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OPENAI_API_KEY not configured' },
                { status: 500 }
            );
        }

        // Generate conversational response (replaces both generate_question and acknowledge)
        if (action === 'respond') {
            const response = await generateConversationalResponse(
                context,
                userSpeech || '',
                isFirstMessage || false
            );
            return NextResponse.json(response);
        }

        // Generate greeting (first message)
        if (action === 'greet') {
            const response = await generateConversationalResponse(context, '', true);
            return NextResponse.json(response);
        }

        // Evaluate the interview
        if (action === 'evaluate') {
            const evaluation = await evaluateInterview(context);
            return NextResponse.json(evaluation);
        }

        // Generate TTS audio
        if (action === 'tts') {
            const text = (body as any).text || '';
            if (!text) {
                return NextResponse.json({ error: 'No text provided' }, { status: 400 });
            }

            const audioBuffer = await generateTextToSpeech(text);

            // Convert Buffer to Uint8Array for NextResponse compatibility
            const uint8Array = new Uint8Array(audioBuffer);

            return new NextResponse(uint8Array, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audioBuffer.length.toString(),
                },
            });
        }

        // Legacy support for old actions (redirect to new)
        if (action === 'generate_question') {
            const response = await generateConversationalResponse(
                context,
                context.speechTranscript?.slice(-200) || '',
                context.previousQuestions.length === 0
            );
            return NextResponse.json({
                question: response.response,
                phase: response.phase,
                category: 'understanding',
                difficulty: 'medium'
            });
        }

        if (action === 'acknowledge') {
            const response = await generateConversationalResponse(context, userSpeech || '', false);
            return NextResponse.json({
                response: response.response,
                type: 'acknowledgment'
            });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Interview API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
