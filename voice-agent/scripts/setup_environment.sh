#!/usr/bin/env bash
# ==============================================================
# AI ENGINEERING TUTOR - LOCAL SETUP SCRIPT
# ==============================================================
set -e

echo "=== Setting up AI Engineering Tutor Environment ==="

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed or not in PATH."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Detected Python version: $PYTHON_VERSION"

# Setup virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment in .venv..."
    python3 -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing requirements from requirements.txt..."
pip install -r requirements.txt

# Create runtime directories
mkdir -p data/uploads data/processed data/indexes data/database data/audio

# Check for Ollama
if command -v ollama &> /dev/null; then
    echo "✓ Ollama is installed in PATH."
else
    echo "! Notice: Ollama command not found in PATH."
    echo "  To run local language models, download Ollama from: https://ollama.com"
    echo "  Or on macOS with Homebrew: brew install ollama"
    echo "  Recommended models: ollama pull llama3.2:3b or ollama pull qwen2.5-coder:7b"
fi

echo "=== Setup complete! ==="
echo "To start the AI Tutor application, run:"
echo "    source .venv/bin/activate"
echo "    python run.py"
