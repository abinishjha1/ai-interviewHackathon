import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}

export interface ConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<any>;
}

export interface InterviewContext {
    screenContent?: string; // Text from OCR (legacy)
    screenImage?: string; // Base64 image for Vision
    speechTranscript: string;
    previousQuestions: string[];
    previousAnswers: string[];
    interviewPhase?: InterviewPhase;
    interviewDuration?: number;
    conversationHistory?: ConversationMessage[];
}

export type InterviewPhase = 'greeting' | 'personal-intro' | 'project-overview' | 'deep-dive' | 'problem-solving' | 'closing';

export interface InterviewResponse {
    response: string;
    phase: InterviewPhase;
    responseType: 'greeting' | 'follow-up' | 'question' | 'acknowledgment' | 'closing';
    shouldAskQuestion: boolean;
}

export interface EvaluationResult {
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

const INTERVIEWER_SYSTEM_PROMPT = `You are Alex, a casual, friendly, and highly reactive technical interviewer. Think of yourself as a peer developer having a coffee chat about code.

CRITICAL PERSONA RULES:
1. **Be Reactive**: Use fillers like "Um," "Ah," "Oh cool," "Wait," to sound human. React to their specific words *immediately*.
2. **Visual Awareness**: You can SEE their screen. Say things like "I see you're using React there," or "That function looks complex."
3. **Casual Tone**: "Hey," "Gotcha," "Makes sense." Avoid formal implementation details unless asked.
4. **NO REPEATED INTROS**: Introduce yourself ONCE at the very start. Never say your name again.

INTERVIEW PHASES:
1. **Greeting**: "Hey! I'm Alex. Thanks for hopping on. Why don't you start by introducing yourself?" (ONLY ONCE)
2. **User Intro**: Listen, say "Nice to meet you," then ask: "So, what project are we looking at today? Tell me the high level."
3. **Project Ask**: "That sounds awesome. Can you share your screen and show me the code? I'd love to see how you built it."
4. **Visual Deep Dive**: Once they share, look at the code/UI. Pick a specific file or component you see and ask "What's happening in this part?"

NEVER be robotic. Be the cool senior dev everyone wants to pair with.`;

function determinePhase(questionCount: number, duration: number): InterviewPhase {
    if (questionCount === 0) return 'greeting';
    if (questionCount === 1) return 'personal-intro';
    if (questionCount <= 3) return 'project-overview';
    if (questionCount <= 6) return 'deep-dive';
    if (questionCount <= 9) return 'problem-solving';
    return 'closing';
}

export async function generateConversationalResponse(
    context: InterviewContext,
    userSpeech: string,
    isFirstMessage: boolean = false
): Promise<InterviewResponse> {
    const questionCount = context.previousQuestions.length;
    const phase = context.interviewPhase || determinePhase(questionCount, context.interviewDuration || 0);

    // Build conversation history
    const messages: ConversationMessage[] = [
        { role: 'system', content: INTERVIEWER_SYSTEM_PROMPT }
    ];

    // Add context about what's on screen (Vision or Text)
    if (context.screenImage) {
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: "Here is what I am currently sharing on my screen:" },
                {
                    type: 'image_url',
                    image_url: {
                        url: context.screenImage,
                        detail: 'low' // Low detail for faster token usage, usually sufficient for code/UI
                    }
                }
            ] as any // Type assertion for mixed content
        });
    } else if (context.screenContent && context.screenContent.length > 50) {
        messages.push({
            role: 'system',
            content: `[Screen Context (OCR Text): ${context.screenContent.slice(-500)}]`
        });
    }

    // Add previous Q&A pairs as conversation history
    for (let i = 0; i < context.previousQuestions.length; i++) {
        messages.push({ role: 'assistant', content: context.previousQuestions[i] });
        if (context.previousAnswers[i]) {
            messages.push({ role: 'user', content: context.previousAnswers[i] });
        }
    }

    // Determine what kind of response we need
    let userPrompt: string;

    if (isFirstMessage) {
        userPrompt = `[START OF INTERVIEW - Greet the candidate warmly and ask them to introduce themselves. Keep it natural and friendly. Say your name is Alex. This is the ONLY time you should introduce yourself.]`;
    } else if (userSpeech && userSpeech.trim().length > 0) {
        userPrompt = userSpeech;
        messages.push({ role: 'user', content: userSpeech });
    } else {
        userPrompt = `[The candidate has been silent for a while. Gently prompt them to continue or offer to move to another topic.]`;
    }

    // Add phase guidance
    const phaseGuidance = {
        'greeting': 'Warmly greet them and ask them to introduce themselves.',
        'personal-intro': 'They are introducing themselves. Listen, acknowledge, and when ready, ask about their project.',
        'project-overview': 'Learn about their project - what it does, why they built it, what problems it solves.',
        'deep-dive': 'Explore technical details - architecture, challenges, interesting solutions.',
        'problem-solving': 'Ask "what if" scenarios, edge cases, scaling questions.',
        'closing': 'Wrap up warmly, ask about learnings and future improvements.'
    };

    messages.push({
        role: 'system',
        content: `[Current Phase: ${phase} - ${phaseGuidance[phase]}. Question count: ${questionCount}. Duration: ${Math.floor((context.interviewDuration || 0) / 60)} min]`
    });

    if (!isFirstMessage) {
        messages.push({ role: 'user', content: userPrompt });
    }

    const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.8,
        max_tokens: 200, // Keep responses concise
    });

    const response = completion.choices[0]?.message?.content || "That's interesting! Tell me more about that.";

    // Determine if this response contains a question
    const hasQuestion = response.includes('?');

    // Determine response type
    let responseType: 'greeting' | 'follow-up' | 'question' | 'acknowledgment' | 'closing' = 'follow-up';
    if (isFirstMessage) responseType = 'greeting';
    else if (phase === 'closing') responseType = 'closing';
    else if (hasQuestion) responseType = 'question';
    else responseType = 'acknowledgment';

    return {
        response,
        phase,
        responseType,
        shouldAskQuestion: hasQuestion,
    };
}

export async function generateTextToSpeech(text: string): Promise<Buffer> {
    const mp3 = await getOpenAI().audio.speech.create({
        model: 'tts-1',
        voice: 'nova', // Natural, warm female voice - good for interviews
        input: text,
        speed: 0.95, // Slightly slower for clarity
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
}

export async function evaluateInterview(context: InterviewContext): Promise<EvaluationResult> {
    const systemPrompt = `You are a supportive mentor evaluating a candidate's project presentation. Be encouraging but honest. Lead with positives.

Scoring (1-10 each):
- technicalDepth: Understanding of core concepts
- clarity: How clearly they explained things
- originality: Creative solutions and unique approaches
- understanding: How well they know their own project
- problemSolving: Critical thinking demonstrated
- communication: Articulation and engagement

Overall: Weighted average (Technical 25%, Understanding 20%, Problem-Solving 20%, Clarity 15%, Communication 10%, Originality 10%)

Respond with JSON only.`;

    const userPrompt = `Evaluate this interview:

Screen Content: ${context.screenContent?.slice(-1000) || 'None captured'}

Conversation:
${context.previousQuestions.map((q, i) =>
        `Interviewer: ${q}\nCandidate: ${context.previousAnswers[i] || '(no response)'}`
    ).join('\n\n')}

Duration: ${Math.floor((context.interviewDuration || 0) / 60)} minutes
Questions Asked: ${context.previousQuestions.length}

Provide evaluation as JSON with: technicalDepth, clarity, originality, understanding, problemSolving, communication, overallScore, feedback, strengths[], areasForImprovement[], detailedBreakdown{technicalConcepts, architectureUnderstanding, codeQuality, presentationSkills}`;

    const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content || '{}';

    try {
        const parsed = JSON.parse(response);
        return {
            technicalDepth: parsed.technicalDepth || 5,
            clarity: parsed.clarity || 5,
            originality: parsed.originality || 5,
            understanding: parsed.understanding || 5,
            problemSolving: parsed.problemSolving || 5,
            communication: parsed.communication || 5,
            overallScore: parsed.overallScore || 5,
            feedback: parsed.feedback || 'Interview completed successfully.',
            strengths: parsed.strengths || [],
            areasForImprovement: parsed.areasForImprovement || [],
            detailedBreakdown: parsed.detailedBreakdown || {
                technicalConcepts: 'Assessment completed.',
                architectureUnderstanding: 'Assessment completed.',
                codeQuality: 'Assessment completed.',
                presentationSkills: 'Assessment completed.',
            },
        };
    } catch {
        return {
            technicalDepth: 5, clarity: 5, originality: 5, understanding: 5,
            problemSolving: 5, communication: 5, overallScore: 5,
            feedback: 'Unable to generate detailed feedback.',
            strengths: [], areasForImprovement: [],
            detailedBreakdown: {
                technicalConcepts: 'Unavailable',
                architectureUnderstanding: 'Unavailable',
                codeQuality: 'Unavailable',
                presentationSkills: 'Unavailable',
            },
        };
    }
}
