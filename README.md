# 🤖 AI-Driven Automated Interviewer

An advanced **AI Technical Interviewer** that listens to your speech, watches your screen share, and conducts a real-time, adaptive technical interview—just like a human senior developer.

## 🚀 Key Features

- **🗣️ Natural Voice Mode**: Full-duplex conversation with "barge-in" support. Talk to Alex naturally—he listens, pauses when you interrupt, and responds instantly.
- **👀 Vision-Powered**: Uses **GPT-4o Vision** to see your screen. Share your code, architecture diagrams, or live app, and Alex will ask specific questions about what he sees.
- **🧠 Adaptive Questioning**: No scripted questions. The AI generates context-aware follow-ups based on your unique project and answers.
- **📊 Comprehensive Feedback**: Get a detailed **Score Report** at the end, evaluating your Technical Depth, Clarity, Originality, and Communication.

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, Framer Motion
- **AI Core**: OpenAI GPT-4o (Vision & Chat), OpenAI TTS (Voice)
- **Speech**: Web Speech API (Recognition) + Audio Visualizers
- **State**: React Context + Hooks

## ⚡️ Quick Start

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/abinishjha1/ai-interviewHackathon.git
    cd ai-interviewHackathon
    npm install
    ```

2.  **Configure API Key**:
    Create a `.env.local` file in the root:
    ```env
    OPENAI_API_KEY=sk-your-openai-api-key
    ```

3.  **Run the Interviewer**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in Chrome/Edge/Safari.

---

## 📁 Project Structure

```
├── src/                   # Next.js Full App Source
│   ├── app/               # App Router pages
│   ├── components/        # React components (InterviewPanel, OrbVisualizer)
│   └── lib/               # Utilities & AI Logic
├── public/                # Static assets
└── package.json           # Next.js dependencies
```

## 🔑 License

MIT License.
