import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface InterviewContext {
  screenContent: string;
  speechTranscript: string;
  previousQuestions: string[];
  previousAnswers: string[];
  interviewPhase?: InterviewPhase;
  interviewDuration?: number;
  lastActivityTime?: number;
}

export type InterviewPhase = 'greeting' | 'personal-intro' | 'project-overview' | 'deep-dive' | 'problem-solving' | 'closing';

export interface InterviewQuestion {
  question: string;
  category: 'technical' | 'clarification' | 'understanding' | 'followup' | 'problem-solving' | 'architecture';
  phase: InterviewPhase;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AcknowledgmentResponse {
  response: string;
  type: 'acknowledgment' | 'answer' | 'encouragement';
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

function determineInterviewPhase(questionCount: number, transcriptLength: number, duration: number): InterviewPhase {
  if (questionCount === 0) return 'greeting';
  if (questionCount === 1) return 'personal-intro';
  if (questionCount <= 3) return 'project-overview';
  if (questionCount <= 6) return 'deep-dive';
  if (questionCount <= 9) return 'problem-solving';
  return 'closing';
}

function assessDifficulty(previousAnswers: string[], transcript: string): 'easy' | 'medium' | 'hard' {
  const avgAnswerLength = previousAnswers.reduce((sum, ans) => sum + ans.length, 0) / Math.max(previousAnswers.length, 1);
  const transcriptLower = transcript.toLowerCase();
  const technicalTerms = ['function', 'algorithm', 'component', 'architecture', 'database', 'api', 'framework', 'library', 'optimization', 'scalability', 'async', 'promise', 'react', 'node', 'typescript', 'javascript'].filter(term =>
    transcriptLower.includes(term)
  ).length;

  if (avgAnswerLength > 200 && technicalTerms > 3) return 'hard';
  if (avgAnswerLength > 100 || technicalTerms > 1) return 'medium';
  return 'easy';
}

export async function generateQuestion(context: InterviewContext): Promise<InterviewQuestion> {
  const questionCount = context.previousQuestions.length;
  const phase = context.interviewPhase || determineInterviewPhase(
    questionCount,
    context.speechTranscript.length,
    context.interviewDuration || 0
  );
  const difficulty = assessDifficulty(context.previousAnswers, context.speechTranscript);

  const systemPrompt = `You are a real, friendly technical interviewer conducting a natural, conversational interview. You're a senior developer who genuinely wants to get to know the candidate and their work.

Your Speaking Style:
- Use natural speech patterns - include occasional "um", "uh", "you know" to sound human
- Use contractions: "I'm", "you're", "that's", "what's", "it's"
- Sound conversational, not scripted - like you're thinking out loud
- Vary your sentence structure - sometimes start with "So...", "Well...", "Hmm...", "Okay..."
- Show genuine reactions: "Oh that's cool!", "Interesting!", "Nice!", "Ah I see"

CRITICAL RULES:
1. ALWAYS acknowledge what they just said before asking the next question
2. Reference specific things from their screen or previous answers
3. Sound like a real person having a conversation, not a robot reading questions
4. Show you're listening and engaged

Interview Phase: ${phase}
- greeting: Introduce yourself warmly, set the tone, make them comfortable
- personal-intro: Ask about them personally - background, interests, why they're interested in this
- project-overview: Now ask about their project - what it is, why they built it, what it does
- deep-dive: Technical questions about implementation, architecture, interesting challenges
- problem-solving: Scenario-based questions, edge cases, "what if" situations
- closing: Wrap up warmly, ask about learnings, what they'd do differently

Question Style Guidelines:
1. ${questionCount === 0 ? 'FIRST QUESTION: Introduce yourself naturally! Say something like "Hi! Thanks for joining me today. Um, my name is Alex, and I\'m really excited to learn about your project. But first, tell me a little bit about yourself - what got you interested in software development?" Make it warm and personal, like a real person speaking.' : ''}
2. ${phase === 'personal-intro' ? 'Ask about them as a person - their background, interests, what drives them. Keep it light and friendly. After they answer, transition naturally to the project.' : ''}
3. ${phase === 'project-overview' ? 'Now ask about their project! Reference what they shared about themselves. "That\'s great! So, tell me about the project you\'ve been working on - what is it and what does it do?"' : ''}
4. ${phase === 'deep-dive' ? 'Dive into technical details but stay conversational. "That\'s really interesting! So how did you actually implement that?" or "Cool! What was the trickiest part of building that?"' : ''}
5. ${phase === 'problem-solving' ? 'Ask scenario questions naturally: "Okay, interesting... so what would happen if..." or "Hmm, that\'s a good approach. What if you had to scale this to..."' : ''}
6. ${phase === 'closing' ? 'Wrap up warmly: "This has been great! What was the most challenging part for you?" or "I really enjoyed learning about this. What would you do differently if you started over?"' : ''}
7. ${difficulty === 'hard' ? 'They\'re doing great! Challenge them with deeper technical questions.' : difficulty === 'medium' ? 'Ask thoughtful follow-ups that explore their understanding.' : 'Keep it encouraging and approachable.'}

Natural Speech Examples:
- "Hi! Um, thanks for joining me today. So, my name is Alex, and I'm really excited to chat with you about your project."
- "Oh that's really cool! So, um, tell me a little bit about yourself first - what got you into [tech/field]?"
- "That's awesome! Okay, so now I'd love to hear about your project. What is it that you've built?"
- "Hmm, interesting! So how did you actually go about building that?"
- "Oh nice! That makes sense. What was the trickiest part of that?"
- "Got it, got it. So what would happen if..."

Remember: Sound like a real person having a friendly conversation, not a formal interviewer or a robot!

Respond with JSON:
{
  "question": "Your natural, conversational question with acknowledgments (include natural speech patterns like 'um', 'uh', 'so', etc.)",
  "category": "One of: technical, clarification, understanding, followup, problem-solving, architecture",
  "phase": "${phase}",
  "difficulty": "${difficulty}"
}`;

  // Analyze screen content for technical context
  const screenAnalysis = context.screenContent ? `
Screen Content Analysis:
${context.screenContent.slice(-1000)}

Detected elements:
${context.screenContent.includes('function') || context.screenContent.includes('const') || context.screenContent.includes('class') ? '- Code snippets visible' : ''}
${context.screenContent.includes('import') || context.screenContent.includes('require') ? '- Dependencies/frameworks visible' : ''}
${context.screenContent.includes('http') || context.screenContent.includes('api') ? '- API/network related content' : ''}
${context.screenContent.includes('database') || context.screenContent.includes('db') || context.screenContent.includes('sql') ? '- Database related content' : ''}
` : 'No screen content captured yet.';

  const userPrompt = `${screenAnalysis}

What they've been telling you (recent context - last 500 characters):
${context.speechTranscript.slice(-500) || 'They haven\'t started speaking yet - this is the very beginning!'}

Your conversation so far:
${context.previousQuestions.length > 0
      ? context.previousQuestions.map((q, i) =>
        `You: "${q}"\nThem: "${context.previousAnswers[i]?.slice(-300) || '(they just answered or are still speaking)'}"`
      ).join('\n\n---\n\n')
      : 'This is the very first interaction - introduce yourself warmly and ask about them personally first!'}

Current situation:
- Question number: ${questionCount + 1}
- Phase: ${phase}
- Duration: ${Math.floor((context.interviewDuration || 0) / 60)} minutes
- ${context.screenContent.length > 0 ? 'They have shared their screen - you can see code/content' : 'No screen shared yet'}

IMPORTANT INSTRUCTIONS:
${questionCount === 0 ? 'FIRST QUESTION: Introduce yourself naturally! Say "Hi! Thanks for joining me today. My name is Alex, and I\'m really excited to learn about your project. But first, tell me a little bit about yourself - what got you interested in software development?" Make it warm and personal, like a real person would speak.' : ''}
${questionCount === 1 ? 'SECOND QUESTION: They just told you about themselves. Acknowledge what they said, then transition to their project. "That\'s great! So, tell me about the project you\'ve been working on - what is it and what does it do?"' : ''}
${questionCount > 1 ? 'FOLLOW-UP: Acknowledge their last response naturally (like "Oh that\'s cool!" or "Interesting!" or "Got it!") before asking your next question. Reference something specific they said or something you see on their screen.' : ''}

Remember:
- Sound natural and conversational - use "um", "uh", "so", "well", "okay" like real people do
- Show you're listening by acknowledging what they just said
- ${phase === 'personal-intro' ? 'Focus on them as a person - their background, interests, motivation' : phase === 'project-overview' ? 'Ask about their project - what it is, why they built it, what it does' : 'Continue the natural flow based on what they\'ve shared'}
- Be warm, friendly, and genuinely curious`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.85, // Higher temperature for more natural, varied responses
    max_tokens: 600,
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(response);
    return {
      question: parsed.question || (questionCount === 0 
        ? "Hi! Thanks for joining me today. My name is Alex, and I'm really excited to learn about your project. But first, tell me a little bit about yourself - what got you interested in software development?"
        : "That's really interesting! Tell me more about that?"),
      category: parsed.category || 'understanding',
      phase: parsed.phase || phase,
      difficulty: parsed.difficulty || difficulty,
    };
  } catch {
    return {
      question: questionCount === 0
        ? "Hi! Thanks for joining me today. My name is Alex, and I'm really excited to learn about your project. But first, tell me a little bit about yourself - what got you interested in software development?"
        : questionCount === 1
        ? "That's great! So, tell me about the project you've been working on - what is it and what does it do?"
        : "That's interesting! Tell me more about how that works?",
      category: 'understanding',
      phase: phase,
      difficulty: difficulty,
    };
  }
}

export async function generateAcknowledgment(
  context: InterviewContext,
  userSpeech: string
): Promise<AcknowledgmentResponse> {
  // Check if user is asking a question or checking if AI is listening
  const userSpeechLower = userSpeech.toLowerCase();
  const isQuestion = userSpeech.includes('?') || 
    userSpeechLower.includes('are you') ||
    userSpeechLower.includes('can you') ||
    userSpeechLower.includes('do you') ||
    userSpeechLower.includes('is there') ||
    userSpeechLower.includes('are you there') ||
    userSpeechLower.includes('are you listening') ||
    userSpeechLower.includes('can you hear me');

  const systemPrompt = `You are a friendly, engaged interviewer having a natural conversation. When the candidate speaks, you should acknowledge them to show you're listening and engaged.

Your personality:
- Warm and responsive - show you're actively listening
- Natural and conversational - use "um", "uh", "yeah", "okay"
- Brief acknowledgments - keep them short (1-2 sentences max)
- Show genuine interest - react to what they're saying

Types of responses:
1. If they ask "are you there?" or "are you listening?" → Respond warmly: "Yes, I'm here! I'm listening, go ahead!"
2. If they ask a question → Answer it briefly and naturally
3. If they're explaining something → Acknowledge with: "Oh that's interesting!", "Got it!", "I see!", "Nice!", "That makes sense!"
4. If they pause → Encourage: "Take your time!", "I'm listening!", "Go ahead!"

Keep responses SHORT (1-2 sentences max) and natural. Sound like a real person, not a robot.`;

  const userPrompt = `The candidate just said: "${userSpeech}"

${isQuestion ? 'They asked a question or are checking if you\'re listening. Respond appropriately.' : 'They\'re explaining or talking. Give a brief, warm acknowledgment to show you\'re listening.'}

${userSpeechLower.includes('are you there') || userSpeechLower.includes('are you listening') 
  ? 'They\'re checking if you\'re there. Respond warmly: "Yes, I\'m here! I\'m listening, go ahead!"' 
  : ''}

Respond with JSON:
{
  "response": "Your brief, natural acknowledgment or answer (1-2 sentences max)",
  "type": "${isQuestion ? 'answer' : 'acknowledgment'}"
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.9, // High temperature for natural, varied responses
    max_tokens: 150,
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(response);
    return {
      response: parsed.response || (isQuestion ? "Yes, I'm here! I'm listening, go ahead!" : "Got it! I'm listening."),
      type: parsed.type || (isQuestion ? 'answer' : 'acknowledgment'),
    };
  } catch {
    return {
      response: isQuestion 
        ? "Yes, I'm here! I'm listening, go ahead!"
        : userSpeech.length > 50 
        ? "That's interesting! I'm listening."
        : "Got it!",
      type: isQuestion ? 'answer' : 'acknowledgment',
    };
  }
}

export async function evaluateInterview(context: InterviewContext): Promise<EvaluationResult> {
  const systemPrompt = `You are a supportive mentor providing encouraging but honest feedback after someone has presented their project. Your goal is to help them grow while celebrating what they did well!

Your Feedback Style:
- Lead with positives - always start by acknowledging what they did well
- Be specific - reference actual examples from their presentation
- Frame improvements as opportunities, not criticisms
- Be encouraging - they should feel motivated, not defeated
- Provide actionable suggestions they can actually implement

Evaluation Criteria (Score 1-10 for each):

1. Technical Depth (1-10):
   - Understanding of core concepts
   - Ability to explain technical decisions
   - Knowledge of underlying technologies

2. Clarity (1-10):
   - How clearly they explained concepts
   - Organization of presentation
   - Making complex topics understandable

3. Originality (1-10):
   - Creative solutions or approaches
   - Unique features or implementations
   - Innovation in problem-solving

4. Understanding (1-10):
   - How well they understand their own project
   - Ability to explain architecture and design
   - Understanding of trade-offs and decisions

5. Problem-Solving (1-10):
   - How they handled questions
   - Ability to think through scenarios
   - Critical thinking demonstrated

6. Communication (1-10):
   - Articulation of ideas
   - Response quality and completeness
   - Engagement with questions

Overall Score: Weighted average (Technical Depth 25%, Understanding 20%, Problem-Solving 20%, Clarity 15%, Communication 10%, Originality 10%)

IMPORTANT: Your feedback paragraph should start with something encouraging! Something like "Great job presenting your project!" or "It's clear you put a lot of thought into this!" followed by balanced feedback.

For strengths, be specific and enthusiastic. For improvements, phrase them positively like "One area to explore further..." or "Next time, you might consider..."

Respond with JSON:
{
  "technicalDepth": number,
  "clarity": number,
  "originality": number,
  "understanding": number,
  "problemSolving": number,
  "communication": number,
  "overallScore": number,
  "feedback": "Start with encouragement, then give balanced assessment",
  "strengths": ["specific, enthusiastic strength 1", "specific strength 2", ...],
  "areasForImprovement": ["positively-framed suggestion 1", "opportunity for growth 2", ...],
  "detailedBreakdown": {
    "technicalConcepts": "Encouraging assessment of technical knowledge",
    "architectureUnderstanding": "Supportive assessment of system design understanding",
    "codeQuality": "Constructive assessment of code quality (if applicable)",
    "presentationSkills": "Positive assessment of communication effectiveness"
  }
}`;

  const userPrompt = `Complete Interview Evaluation:

Screen Content Captured:
${context.screenContent || 'No screen content was captured'}

Speech Transcript:
${context.speechTranscript || 'No speech was captured'}

Full Interview Conversation:
${context.previousQuestions.length > 0
      ? context.previousQuestions.map((q, i) =>
        `Interviewer: ${q}\nStudent: ${context.previousAnswers[i] || '(no response recorded)'}`
      ).join('\n\n---\n\n')
      : 'No questions were asked'}

Interview Duration: ${Math.floor((context.interviewDuration || 0) / 60)} minutes
Total Questions: ${context.previousQuestions.length}

Please provide a comprehensive, professional evaluation. Be specific about what they did well and where they can improve. Reference actual examples from their presentation.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.4,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(response);

    // Calculate weighted overall score if not provided
    const calculatedOverall = parsed.overallScore || (
      (parsed.technicalDepth || 5) * 0.25 +
      (parsed.understanding || 5) * 0.20 +
      (parsed.problemSolving || 5) * 0.20 +
      (parsed.clarity || 5) * 0.15 +
      (parsed.communication || 5) * 0.10 +
      (parsed.originality || 5) * 0.10
    );

    return {
      technicalDepth: parsed.technicalDepth || parsed.technical_depth || 5,
      clarity: parsed.clarity || 5,
      originality: parsed.originality || 5,
      understanding: parsed.understanding || 5,
      problemSolving: parsed.problemSolving || parsed.problem_solving || 5,
      communication: parsed.communication || 5,
      overallScore: Math.round(calculatedOverall * 10) / 10,
      feedback: parsed.feedback || 'Interview completed. Thank you for your presentation.',
      strengths: parsed.strengths || [],
      areasForImprovement: parsed.areasForImprovement || parsed.areas_for_improvement || [],
      detailedBreakdown: parsed.detailedBreakdown || parsed.detailed_breakdown || {
        technicalConcepts: 'Technical concepts assessment not available.',
        architectureUnderstanding: 'Architecture understanding assessment not available.',
        codeQuality: 'Code quality assessment not available.',
        presentationSkills: 'Presentation skills assessment not available.',
      },
    };
  } catch {
    return {
      technicalDepth: 5,
      clarity: 5,
      originality: 5,
      understanding: 5,
      problemSolving: 5,
      communication: 5,
      overallScore: 5,
      feedback: 'Unable to generate detailed feedback. Interview completed.',
      strengths: [],
      areasForImprovement: [],
      detailedBreakdown: {
        technicalConcepts: 'Assessment unavailable.',
        architectureUnderstanding: 'Assessment unavailable.',
        codeQuality: 'Assessment unavailable.',
        presentationSkills: 'Assessment unavailable.',
      },
    };
  }
}
