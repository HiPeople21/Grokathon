# Briefly - AI News Briefing Agent

Briefly is a real-time, AI-powered news briefing application that generates personalized video and audio reports on any topic.

## 🚀 Features

*   **Real-time Intelligence**: Aggregates and analyzes the latest news using **Grok 4**.
*   **AI Podcast**: Generates a professional audio news briefing with **Grok Voice**.
*   **AI Video Reports**: Creates a visual news segment using **Grok Imagine Video**.
*   **Streaming**: Real-time streaming of analysis and generation progress.
*   **Interactive Player**: Built-in video player with seek controls and overlay.

## 🛠️ Tech Stack

### Frontend
*   **React** (Vite)
*   **TypeScript**
*   **Tailwind CSS** (Styling & Animations)
*   **Lucide React** (Icons)

### Backend
*   **FastAPI** (Python)
*   **xAI SDK** (Grok-4, Voice, Video)
*   **FFmpeg** (Video processing)

## 📋 Prerequisites

*   Node.js (v18+)
*   Python (v3.10+)
*   **FFmpeg** must be installed and available in your system PATH (for video combination).
*   **xAI API Key** (for Grok models).

## ⚡ Quick Start

### 1. Backend Setup

```bash
cd backend
# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:
```env
XAI_API_KEY=your_api_key_here
```

Run the server:
```bash
python main.py
# or
uvicorn main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 🏗️ Project Structure

*   `frontend/`: React application source code.
    *   `src/components/`: UI components (`BrieflyView`, `Controls`, etc).
    *   `src/services/`: API integration.
*   `backend/`: FastAPI application.
    *   `main.py`: API endpoints and WebSocket handler.
    *   `script_gen.py`: Logic for converting briefings into timed scripts.
    *   `audio_gen.py`: Text-to-Speech integration.
    *   `video_gen.py`: Video generation and combining logic.

## 📝 Usage

1.  Enter a topic (e.g., "SpaceX", "Artificial Intelligence").
2.  Click **"Get Update"**.
3.  Watch the AI "Thinking Process" as it researches.
4.  Listen to the generated **Podcast**.
5.  Watch the generated **Video Report**.
