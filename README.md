# AI-Driven Automated Interviewer

An advanced AI system that listens to a student presenting a project (via screen share or text) and conducts an adaptive technical interview.

## 🚀 Two Versions Available

This repository contains two implementations of the AI Interviewer:

1.  **Full Application (Next.js)**: A feature-rich, modern web application with screen sharing, voice mode, and real-time vision analysis.
2.  **MVP (Python + FastAPI)**: A lightweight, logic-focused implementation using Python for the backend and vanilla JS for the frontend.

---

## 1. Full Application (Next.js)

Located in the `src/` directory (root).

### Features
- **Real-time Screen Analysis**: Uses GPT-4o Vision to understand shared screens.
- **Voice Mode**: Full-duplex voice conversation with "barge-in" support (interruptible AI).
- **Liquid Visualizer**: Interactive orbital animation reacting to speech levels.
- **Dynamic Scoring**: Technical depth, clarity, originality, and implementation scoring.

### Tech Stack
- **Frontend**: Next.js 16, Tailwind CSS, React
- **AI/LLM**: OpenAI GPT-4o Use `OPENAI_API_KEY`
- **Speech**: Web Speech API + OpenAI TTS
- **State**: In-memory / React Context

### Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Create a `.env.local` file in the root:
    ```env
    OPENAI_API_KEY=sk-your-openai-api-key
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

---

## 2. MVP (Python + FastAPI)

Located in `backend/` and `frontend/` directories. Use this for a lightweight, backend-centric version.

### Features
- **WebSocket Communication**: Real-time low-latency interaction.
- **Modular Logic**: Clear separation of analysis, questioning, and evaluation modules.
- **Simple Frontend**: No build tools required, just HTML/JS.

### Tech Stack
- **Backend**: Python 3.10+, FastAPI, Uvicorn, WebSockets
- **Frontend**: Vanilla HTML/JS
- **LLM**: OpenAI GPT-4o

### Quick Start

1.  **Navigate to Backend**:
    ```bash
    cd backend
    ```

2.  **Setup Python Environment**:
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Run Backend Server**:
    Ensure your `OPENAI_API_KEY` is set (system env var or .env file in backend).
    ```bash
    uvicorn main:app --reload
    ```

4.  **Access App**:
    Server runs on port 8000. Access the frontend at:
    [http://localhost:8000/static/index.html](http://localhost:8000/static/index.html)

---

## 📁 Project Structure

```
├── backend/               # Python MVP Backend
│   ├── main.py            # FastAPI entry point
│   ├── interview_logic.py # LLM interaction logic
│   └── requirements.txt   # Python dependencies
├── frontend/              # Python MVP Frontend
│   ├── index.html         # Simple UI
│   ├── app.js             # WebSocket logic
│   └── style.css          # Styling
├── src/                   # Next.js Full App Source
│   ├── app/               # App Router pages
│   ├── components/        # React components (InterviewPanel, OrbVisualizer)
│   └── ...
├── public/                # Static assets
└── package.json           # Next.js dependencies
```

## 🔑 License

MIT License.
