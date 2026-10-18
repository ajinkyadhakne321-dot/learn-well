# Engineering AI Tutor — Local Voice-Enabled Assistant

> **A 100% local, privacy-first, voice-enabled AI tutor designed for engineering students.**
> Powered by open-weights local language models (Ollama), local vector embeddings, SymPy symbolic mathematics verification, syllabus-specific document retrieval, and offline voice input/output.
> **Zero paid AI API keys required.**

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Capabilities & The Six Learning Modes](#the-six-learning-modes)
3. [Architecture & System Flow](#architecture--system-flow)
4. [Hardware Requirements & Model Recommendations](#hardware-requirements--model-recommendations)
5. [Prerequisites & Installation](#prerequisites--installation)
   - [1. Python Environment Setup](#1-python-environment-setup)
   - [2. Install Dependencies](#2-install-dependencies)
   - [3. Install Local Ollama Runtime](#3-install-local-ollama-runtime)
   - [4. Download an Open-Weights Model](#4-download-an-open-weights-model)
6. [Voice Assistant Setup](#voice-assistant-setup)
7. [Running the Application](#running-the-application)
8. [API Documentation](#api-documentation)
9. [Educational Document Ingestion & RAG](#educational-document-ingestion--rag)
10. [Automated Testing & Benchmark Evaluation](#automated-testing--benchmark-evaluation)
11. [Troubleshooting & Common Errors](#troubleshooting--common-errors)
12. [Privacy & Licensing](#privacy--licensing)

---

## Project Overview

Engineering curricula demand rigorous, multi-faceted learning: understanding dense theoretical mechanics, writing and debugging complex software, solving multi-step calculus and differential equations, preparing for viva-voce lab exams, and architecting capstone projects.

The **Engineering AI Tutor** is built specifically for this purpose:
- **Zero API Fees**: Connects to locally running open-weight models via Ollama. No credit cards or OpenAI/Anthropic keys required.
- **Strict Grounding**: Incorporates your university's specific syllabus, past examination papers, lab manuals, and reference textbooks. If a document does not support an answer, the assistant clearly distinguishes general concepts from syllabus-verified information.
- **Symbolic Mathematical Precision**: Uses **SymPy** to solve equations, compute derivatives and integrals, and verify answers algebraically before reporting.
- **Voice-Enabled Interface**: Supports hands-free study sessions through direct speech-to-text input and natural text-to-speech narration.
- **Complete Privacy**: Student questions, uploaded notes, and voice recordings remain on the local machine and are never transmitted to third-party cloud servers.

---

## The Six Learning Modes

The tutor features six distinct pedagogical modes accessible from the sidebar:

| Mode | Pedagogical Focus | Core Features |
| :--- | :--- | :--- |
| **1. Academic Learning** | Conceptual depth & analogies | Technical terminology breakdown, comparison of related concepts, syllabus course outcomes. |
| **2. Programming & Coding** | Algorithmic implementation | Problem breakdown, clean commented code, line-by-line explanation, Big-O complexity, test cases. |
| **3. Engineering Mathematics** | Rigorous step-by-step math | Given information, formula derivation, step calculations, units, and SymPy symbolic verification. |
| **4. Exam Preparation** | High-yield revision | Topic summaries, 2/5/10 mark question archetypes, model answers, practice MCQs with explanations. |
| **5. Practical & Viva** | Laboratory mastery | Objectives, apparatus ratings, circuit schematics, procedural steps, common errors, and viva Q&A. |
| **6. Project Guidance** | Capstone & prototyping | Problem formulation, system architecture, component selection, safety, cost, and implementation roadmap. |

---

## Architecture & System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Student Web Interface (Browser)             │
│  - 6 Learning Modes Sidebar      - Microphone / Voice Input │
│  - Academic Filter Bar           - Audio Narration Playback │
│  - Syllabus Inspector Drawer     - Document Upload Manager  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON / Audio Stream
┌──────────────────────────────▼──────────────────────────────┐
│                   FastAPI Backend Server                    │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   LLM Service         │       │  Document Service     │  │
│  │   (Ollama Client)     │       │  (PyMuPDF Extractor)  │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
│              │                               │              │
│  ┌───────────▼───────────┐       ┌───────────▼───────────┐  │
│  │  Mathematics Service  │       │  Retrieval Service    │  │
│  │  (SymPy Verification) │       │  (FAISS / Embeddings) │  │
│  └───────────────────────┘       └───────────────────────┘  │
│              │                               │              │
│  ┌───────────▼───────────┐       ┌───────────▼───────────┐  │
│  │  Voice Service (STT)  │       │  Voice Service (TTS)  │  │
│  │  (Whisper / Web STT)  │       │  (Native Say / Piper) │  │
│  └───────────────────────┘       └───────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Local IPC / HTTP (Port 11434)
┌──────────────────────────────▼──────────────────────────────┐
│                    Local Ollama Engine                      │
│      Llama 3.2 (3B) / Qwen 2.5 Coder (7B) / Phi-3 (3.8B)    │
└─────────────────────────────────────────────────────────────┘
```

---

## Hardware Requirements & Model Recommendations

The tutor automatically inspects your hardware at startup and recommends models:

| Available RAM | Recommended Model | Pull Command | Best For |
| :--- | :--- | :--- | :--- |
| **8 GB RAM** | `llama3.2:3b` or `phi3:mini` | `ollama pull llama3.2:3b` | General engineering theory, quick explanations |
| **16 GB RAM (e.g. Apple M-Series)** | `qwen2.5-coder:7b` | `ollama pull qwen2.5-coder:7b` | Exceptional coding, math derivations & algorithms |
| **24 GB+ RAM / Dedicated GPU** | `qwen2.5-coder:14b` or `mistral-nemo` | `ollama pull qwen2.5-coder:14b` | Research-grade analysis & complex system design |

---

## Prerequisites & Installation

### 1. Python Environment Setup
Requires **Python 3.10, 3.11, 3.12, or 3.13**.

Clone and navigate into the project directory:
```bash
git clone <repo_url>
cd voice-agent-api
```

Create and activate a dedicated virtual environment:

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Install Local Ollama Runtime
Ollama runs open-weights language models locally on your GPU/CPU with zero setup.

- **macOS (Homebrew)**:
  ```bash
  brew install ollama
  ```
- **macOS / Windows / Linux (Direct Download)**:
  Download installer from [https://ollama.com/download](https://ollama.com/download).

### 4. Download an Open-Weights Model
Start the Ollama daemon:
```bash
ollama serve
```

In a separate terminal, pull the recommended model (requires active internet during download, ~2.0 GB):
```bash
ollama pull llama3.2:3b
```
*(Or pull `qwen2.5-coder:7b` for advanced programming and mathematics).*

---

## Voice Assistant Setup

The voice system is designed to work completely offline:
- **Speech-to-Text (Input)**:
  - **Browser Web Speech API** (Zero-install, instant local microphone recognition).
  - **Whisper Local Backend**: Optional server-side speech recognition via `pip install openai-whisper`.
- **Text-to-Speech (Output)**:
  - **macOS Native `say`**: Pre-installed on all Macs. Generates clean spoken audio offline with no internet access.
  - **Cross-Platform Fallback**: Integrated browser `speechSynthesis` or Piper TTS.

---

## Running the Application

Start the application with the pre-flight verification script:
```bash
python run.py
```

Or using Uvicorn directly:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser at:
```
http://localhost:8000
```

---

## API Documentation

Interactive OpenAPI / Swagger documentation is available at `http://localhost:8000/docs`.

### Core Endpoints:
- `GET /api/health`: Diagnostic health check returning Ollama status, selected model availability, document index chunk counts, and hardware recommendations.
- `POST /api/chat`: Process student question with active learning mode, academic filters, and multi-turn session ID.
- `POST /api/chat/clear`: Clear conversation memory for session privacy.
- `POST /api/documents/upload`: Upload PDF, TXT, or MD educational documents with metadata (category, subject, branch, semester).
- `GET /api/documents`: List indexed educational documents and chunk statistics.
- `DELETE /api/documents/{document_id}`: Remove a document and purge its chunks from the vector search index.
- `POST /api/voice/transcribe`: Transcribe uploaded audio using local Whisper model.
- `POST /api/voice/synthesize`: Synthesize text into local audio and receive playable stream URL.
- `POST /api/settings/model`: Switch the active local Ollama model dynamically.

---

## Educational Document Ingestion & RAG

1. Click **"Syllabus Docs"** in the top navigation bar.
2. Select a PDF, TXT, or Markdown document (e.g. `Data_Structures_Syllabus_2026.pdf`).
3. Choose the category (e.g., *University Syllabus*, *Lecture Notes*, *Previous Examination Papers*).
4. Enter optional metadata (Engineering Branch, Subject, University, Semester).
5. Click **"Upload & Index Document"**.
6. When asking questions, the tutor automatically searches matching chunks, incorporates them into context, and cites Document Title and Page Numbers in the source inspector drawer.

---

## Automated Testing & Benchmark Evaluation

### Running Unit Tests
Run the automated pytest suite:
```bash
source .venv/bin/activate
pytest -v
```

The test suite covers:
- Backend health endpoints and hardware detection (`tests/test_health.py`)
- SymPy equation solving, calculus, and verification (`tests/test_math.py`)
- Document extraction, PDF page preservation, and chunking (`tests/test_documents.py`)
- Vector indexing, semantic search, and academic filtering (`tests/test_retrieval.py`)
- Chat validation, all six learning modes, and session clearing (`tests/test_chat.py`)
- Audio synthesis and path traversal protection (`tests/test_voice.py`)

### Running the Multi-Branch Evaluation Benchmark
Run the manual evaluation benchmark covering all 9 engineering disciplines:
```bash
python scripts/run_evaluations.py
```

---

## Troubleshooting & Common Errors

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Ollama server is not running at http://localhost:11434"** | Ollama daemon is offline | Open a terminal and run `ollama serve`. |
| **"Model 'llama3.2:3b' is not downloaded yet"** | Selected model weights missing | Run `ollama pull llama3.2:3b` in your terminal. |
| **Microphone not transcribing** | Browser permission blocked | Allow microphone permissions in browser settings, or click the mic button to grant access. |
| **PDF text extraction failed** | Scanned / Image-only PDF | PyMuPDF extracts text from vector PDFs. Use a text-based PDF or plain text / markdown file. |

---

## Privacy & Licensing

- **Data Privacy**: All student questions, conversation histories, audio recordings, and uploaded educational documents are stored exclusively on your local machine under `data/`. No telemetry or external API calls are made.
- **Licenses**:
  - Code: MIT License
  - Ollama & Llama 3.2: Permissive Open-Weights License
  - PyMuPDF, SymPy, FastAPI, FAISS: Open-Source Permissive Licenses
