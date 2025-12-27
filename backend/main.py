import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from interview_logic import analyze_presentation, generate_question, evaluate_answer, generate_feedback_report

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for local development if frontend is served separately
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves frontend files from ../frontend if you visit http://localhost:8000
# Ensure ../frontend exists.
if os.path.exists("../frontend"):
    app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Interviewer Backend Running"}

@app.websocket("/ws/interview")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Session State
    context = {
        "screen_text": "",
        "summary": "",
        "technologies": [],
        "missing_concepts": [],
        "current_topic": "Intro",
        "history": [], # List of {role: ..., content: ...}
        "question_count": 0,
        "max_questions": 5, # Limit for MVP
        "topics_covered": []
    }
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data['type'] == 'start':
                await websocket.send_json({"type": "status", "message": "Analyzing presentation..."})
                
                screen_content = data.get('screen_content', '')
                student_speech = data.get('student_speech', '')
                
                # 1. Analyze Presentation
                analysis = analyze_presentation(screen_content, student_speech)
                
                context.update({
                    "screen_text": screen_content,
                    "summary": analysis.get("summary", ""),
                    "technologies": analysis.get("technologies", []),
                    "missing_concepts": analysis.get("missing_concepts", []),
                    "next_topic_focus": analysis.get("missing_concepts", ["General"])[0]
                })
                
                # 2. Generate First Question
                q_data = generate_question(context)
                question_text = q_data.get("question")
                current_topic = q_data.get("topic")
                
                context["current_topic"] = current_topic
                context["history"].append({"role": "assistant", "content": question_text})
                context["question_count"] += 1
                
                await websocket.send_json({
                    "type": "question",
                    "text": question_text,
                    "topic": current_topic
                })
                
            elif data['type'] == 'answer':
                answer_text = data.get('content', '')
                context["history"].append({"role": "user", "content": answer_text})
                
                # 3. Evaluate Answer
                last_question = context["history"][-2]["content"] # Assistant's last msg
                eval_result = evaluate_answer(last_question, answer_text, context)
                
                logger.info(f"Evaluation: {eval_result}")
                
                # Logic: Decide next step
                # If we reached max questions, end it.
                if context["question_count"] >= context["max_questions"]:
                    await websocket.send_json({"type": "status", "message": "Generating feedback..."})
                    report = generate_feedback_report(context["history"])
                    await websocket.send_json({"type": "end", "report": report})
                    break 
                
                # Check understanding to decide follow-up or new topic
                understanding = eval_result.get("understanding", "medium")
                suggested_action = eval_result.get("suggested_action", "new_topic")
                
                if suggested_action == "deepen":
                     context["next_topic_focus"] = context["current_topic"] # Stay on topic
                else:
                    # Move to next missing concept or tech
                    covered = context.get("topics_covered", [])
                    covered.append(context["current_topic"])
                    context["topics_covered"] = covered
                    
                    # Pick next topic
                    available_techs = [t for t in context["technologies"] if t not in covered]
                    if available_techs:
                        context["next_topic_focus"] = available_techs[0]
                    else:
                        context["next_topic_focus"] = "Advanced Architecture"

                # 4. Generate Next Question
                q_data = generate_question(context)
                question_text = q_data.get("question")
                current_topic = q_data.get("topic")
                
                context["current_topic"] = current_topic
                context["history"].append({"role": "assistant", "content": question_text})
                context["question_count"] += 1
                
                await websocket.send_json({
                    "type": "question",
                    "text": question_text,
                    "topic": current_topic
                })

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Error: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})

