import os
import json
from openai import OpenAI
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client
# Assumes OPENAI_API_KEY is in environment variables (e.g. from .env.local loaded via python-dotenv)
# We might need to handle the path to .env explicitly if it's in the root.
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Prompts & Logic ---

def analyze_presentation(screen_text: str, student_speech: str) -> Dict[str, Any]:
    """
    Analyzes the initial presentation to understand the project.
    """
    system_prompt = """
    You are a technical interviewer. Analyze the candidate's project based on the provided screen text (OCR) and their spoken introduction.
    Identify:
    1. The core project concept.
    2. Key technologies used or implied.
    3. Missing or weak explanations that need probing.
    
    Output JSON:
    {
      "summary": "Brief summary of the project",
      "technologies": ["tech1", "tech2"],
      "missing_concepts": ["concept1", "concept2"],
      "initial_difficulty": "medium"
    }
    """
    
    user_content = f"Screen Content:\n{screen_text}\n\nStudent Speech:\n{student_speech}"
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

def generate_question(context: Dict[str, Any]) -> str:
    """
    Generates the next interview question based on logic.
    """
    system_prompt = """
    You are a technical interviewer. Generate ONE clear, specific technical question.
    
    Rules:
    - Focus on the current topic or a missing concept.
    - Adapt difficulty based on the candidate's level (low/medium/high detected).
    - Do not repeat questions.
    - Be professional but conversational.
    
    Output JSON:
    {
      "topic": "The topic being asked about",
      "question": "The actual question string"
    }
    """
    
    # Construct a minimal context string for the LLM
    context_str = json.dumps({
        "project_summary": context.get("summary"),
        "technologies": context.get("technologies"),
        "recent_history": context.get("history", [])[-3:], # Last 3 turns
        "topics_covered": context.get("topics_covered"),
        "target_topic": context.get("next_topic_focus", "general architecture")
    })

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context: {context_str}"}
        ],
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    return result

def evaluate_answer(question: str, answer: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates the student's answer.
    """
    system_prompt = """
    You are a technical interviewer. Evaluate the candidate's answer to your question.
    
    Determine:
    1. Understanding Level: low, medium, or high.
    2. Suggest Follow-up: If low/medium, suggest a deeper probe. If high, suggest moving on.
    
    Output JSON:
    {
      "understanding": "low" | "medium" | "high",
      "feedback_internal": "Short critique for logic flow",
      "suggested_action": "deepen" | "new_topic"
    }
    """
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Question: {question}\nAnswer: {answer}"}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

def generate_feedback_report(history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generates the final scorecard.
    """
    system_prompt = """
    You are a senior hiring manager. Review the interview transcript and generate a final report.
    
    Score (0-10) on:
    - Technical Depth
    - Clarity
    - Originality
    - Implementation Understanding
    
    Provide a professional summary feedback paragraph.
    
    Output JSON:
    {
      "scores": {
        "technical_depth": 0,
        "clarity": 0,
        "originality": 0,
        "implementation": 0
      },
      "feedback_summary": "Paragraph text..."
    }
    """
    
    # Serialize history appropriately
    transcript = json.dumps(history, indent=2)
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Interview Transcript:\n{transcript}"}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)
