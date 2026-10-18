#!/usr/bin/env node
/**
 * Smart launcher for the AI Engineering Tutor Voice Agent.
 * Automatically locates the Python interpreter that has uvicorn and dependencies installed.
 */
import { spawn, execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const voiceAgentDir = path.resolve(process.cwd(), 'voice-agent')
const runScript = path.join(voiceAgentDir, 'run.py')
const venvPython = path.join(voiceAgentDir, '.venv', 'bin', 'python')

const candidates = [
  venvPython,
  process.env.CONDA_PREFIX ? path.join(process.env.CONDA_PREFIX, 'bin', 'python') : null,
  '/opt/anaconda3/bin/python',
  '/opt/anaconda3/bin/python3',
  'python',
  'python3',
].filter(Boolean)

let selectedPython = null

for (const candidate of candidates) {
  try {
    const test = execSync(`"${candidate}" -c "import uvicorn, fastapi; print('OK')"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    })
    if (test.includes('OK')) {
      selectedPython = candidate
      break
    }
  } catch {
    // Try next candidate
  }
}

if (!selectedPython) {
  console.error('\n❌ Could not find a Python interpreter with `uvicorn` and `fastapi` installed.')
  console.log('Attempting to install dependencies using pip...\n')
  try {
    const pipCmd = process.env.CONDA_PREFIX
      ? path.join(process.env.CONDA_PREFIX, 'bin', 'pip')
      : 'pip'
    execSync(`${pipCmd} install -r "${path.join(voiceAgentDir, 'requirements.txt')}"`, {
      stdio: 'inherit',
    })
    selectedPython = 'python'
  } catch (err) {
    console.error('Failed to install requirements automatically:', err)
    console.error('Please run in your terminal: pip install uvicorn fastapi')
    process.exit(1)
  }
}

console.log(`[VoiceAgent] Using Python interpreter: ${selectedPython}`)

const child = spawn(selectedPython, [runScript], {
  cwd: voiceAgentDir,
  stdio: 'inherit',
})

child.on('exit', (code) => {
  process.exit(code || 0)
})

process.on('SIGINT', () => {
  child.kill('SIGINT')
})
process.on('SIGTERM', () => {
  child.kill('SIGTERM')
})
