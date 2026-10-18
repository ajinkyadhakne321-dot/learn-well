/**
 * AI Engineering Tutor - Client Application Logic
 * Integrates Chat, Six Learning Modes, Local Voice Input/Output,
 * Syllabus Document Ingestion, and Hardware Health Diagnostics.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentMode: 'Academic Learning',
    conversationId: null,
    isRecording: false,
    isSpeaking: false,
    activeAudio: null,
    speechRecognition: null,
    mediaRecorder: null,
    audioChunks: [],
    sourcesMap: {} // messageId -> sources list
  };

  // DOM Elements
  const messagesScroll = document.getElementById('messagesScroll');
  const welcomeCard = document.getElementById('welcomeCard');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const currentModeLabel = document.getElementById('currentModeLabel');
  const branchSelect = document.getElementById('branchSelect');
  const semesterSelect = document.getElementById('semesterSelect');
  const subjectInput = document.getElementById('subjectInput');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const docsCountBadge = document.getElementById('docsCountBadge');
  const healthBadge = document.getElementById('healthBadge');
  const healthText = document.getElementById('healthText');

  // Voice Preview & Audio Controls
  const speechPreviewBar = document.getElementById('speechPreviewBar');
  const speechStatusText = document.getElementById('speechStatusText');
  const useSpeechBtn = document.getElementById('useSpeechBtn');
  const cancelSpeechBtn = document.getElementById('cancelSpeechBtn');
  const nowSpeakingIndicator = document.getElementById('nowSpeakingIndicator');
  const stopAudioBtn = document.getElementById('stopAudioBtn');

  // Sources Drawer
  const sourcesDrawer = document.getElementById('sourcesDrawer');
  const sourcesDrawerContent = document.getElementById('sourcesDrawerContent');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  // Modals
  const docsModal = document.getElementById('docsModal');
  const docsModalBtn = document.getElementById('docsModalBtn');
  const uploadDocForm = document.getElementById('uploadDocForm');
  const docsTableBody = document.getElementById('docsTableBody');

  const settingsModal = document.getElementById('settingsModal');
  const settingsModalBtn = document.getElementById('settingsModalBtn');
  const activeModelInput = document.getElementById('activeModelInput');
  const saveModelBtn = document.getElementById('saveModelBtn');

  // Initialize
  initLearningModes();
  initModals();
  initSpeechEngines();
  fetchHealthStatus();
  fetchDocumentsList();

  // -------------------------------------------------------------
  // 1. LEARNING MODES SELECTION
  // -------------------------------------------------------------
  function initLearningModes() {
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.currentMode = card.getAttribute('data-mode');
        currentModeLabel.textContent = state.currentMode;
      });
    });

    // Quick prompt chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        messageInput.value = prompt;
        sendMessage();
      });
    });

    // Mobile sidebar toggle
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const modesSidebar = document.getElementById('modesSidebar');
    if (sidebarToggleBtn && modesSidebar) {
      sidebarToggleBtn.addEventListener('click', () => {
        modesSidebar.classList.toggle('mobile-open');
      });
    }
  }

  // -------------------------------------------------------------
  // 2. CHAT & MESSAGE SENDING
  // -------------------------------------------------------------
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    if (welcomeCard) {
      welcomeCard.style.display = 'none';
    }

    // Append User Message
    appendMessage('user', text);
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Disable input while processing
    sendBtn.disabled = true;

    // Append Loading Indicator
    const loadingId = 'loading-' + Date.now();
    appendLoadingIndicator(loadingId);

    try {
      const payload = {
        message: text,
        mode: state.currentMode,
        branch: branchSelect.value || null,
        semester: semesterSelect.value || null,
        subject: subjectInput.value.trim() || null,
        conversation_id: state.conversationId,
        use_retrieval: true
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      removeLoadingIndicator(loadingId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        appendMessage('assistant', `**Error (${response.status}):** ${errData.detail || 'Could not communicate with tutor API.'}`);
        return;
      }

      const data = await response.json();
      state.conversationId = data.conversation_id;

      // Append Assistant Response
      const msgId = 'msg-' + Date.now();
      appendAssistantMessage(msgId, data);

    } catch (err) {
      removeLoadingIndicator(loadingId);
      appendMessage('assistant', `**Network Error:** Could not connect to local server: ${err.message}`);
    } finally {
      sendBtn.disabled = false;
      messageInput.focus();
    }
  }

  function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    row.appendChild(bubble);
    messagesScroll.appendChild(row);
    scrollToBottom();
  }

  function appendAssistantMessage(msgId, data) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = msgId;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // Header
    const header = document.createElement('div');
    header.className = 'message-header';
    header.innerHTML = `
      <div class="sender-tag">
        <span>⚡ AI Tutor</span>
        <span class="mode-badge">${data.mode}</span>
      </div>
      <div class="message-actions">
        <button class="mini-action-btn speak-btn" title="Read Aloud (Voice)" data-msg-id="${msgId}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
      </div>
    `;
    bubble.appendChild(header);

    // Math Proof Card (if verified by SymPy)
    if (data.math_verification && data.math_verification.verified) {
      const proofBox = document.createElement('div');
      proofBox.className = 'math-proof-box';
      const stepsHtml = (data.math_verification.steps || []).map(s => `<li>&bull; ${escapeHtml(s)}</li>`).join('');
      proofBox.innerHTML = `
        <div class="math-proof-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>Symbolic Mathematics Formally Verified (SymPy)</span>
        </div>
        <ul class="math-proof-steps">${stepsHtml}</ul>
      `;
      bubble.appendChild(proofBox);
    }

    // Markdown / Content Formatting
    const contentDiv = document.createElement('div');
    contentDiv.className = 'formatted-content';
    contentDiv.innerHTML = formatMarkdown(data.response);
    bubble.appendChild(contentDiv);

    // Attributed Sources
    if (data.sources && data.sources.length > 0) {
      state.sourcesMap[msgId] = data.sources;
      const sourcesBar = document.createElement('div');
      sourcesBar.className = 'sources-pills-bar';

      data.sources.forEach((s, idx) => {
        const pill = document.createElement('button');
        pill.className = 'source-pill';
        const pageText = s.page_number ? ` (p.${s.page_number})` : '';
        pill.innerHTML = `📄 <span>[${idx + 1}] ${escapeHtml(s.title)}${pageText}</span>`;
        pill.addEventListener('click', () => {
          openSourcesDrawer(s.title, data.sources);
        });
        sourcesBar.appendChild(pill);
      });
      bubble.appendChild(sourcesBar);
    }

    row.appendChild(bubble);
    messagesScroll.appendChild(row);

    // Bind speak button
    const speakBtn = bubble.querySelector('.speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        speakResponse(data.response);
      });
    }

    scrollToBottom();
  }

  function appendLoadingIndicator(id) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = id;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.6rem; color: var(--text-muted); font-size: 0.85rem;">
        <span class="status-dot dot-yellow"></span>
        <span>Searching syllabus materials & generating with local model...</span>
      </div>
    `;
    row.appendChild(bubble);
    messagesScroll.appendChild(row);
    scrollToBottom();
  }

  function removeLoadingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollToBottom() {
    messagesScroll.scrollTop = messagesScroll.scrollHeight;
  }

  // Clear conversation button
  clearChatBtn.addEventListener('click', async () => {
    if (confirm('Clear current conversation history?')) {
      try {
        await fetch('/api/chat/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: state.conversationId })
        });
      } catch (_) {}
      state.conversationId = null;
      messagesScroll.innerHTML = '';
      if (welcomeCard) {
        messagesScroll.appendChild(welcomeCard);
        welcomeCard.style.display = 'block';
      }
    }
  });

  // -------------------------------------------------------------
  // 3. VOICE INPUT (SPEECH-TO-TEXT)
  // -------------------------------------------------------------
  function initSpeechEngines() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      state.speechRecognition = new SpeechRecognition();
      state.speechRecognition.continuous = false;
      state.speechRecognition.interimResults = true;
      state.speechRecognition.lang = 'en-US';

      state.speechRecognition.onstart = () => {
        state.isRecording = true;
        micBtn.classList.add('recording');
        speechPreviewBar.classList.remove('hidden');
        speechStatusText.textContent = 'Listening... Speak your question';
      };

      state.speechRecognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        messageInput.value = transcript;
        speechStatusText.textContent = `Recognized: "${transcript}"`;
      };

      state.speechRecognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        stopRecording();
        speechStatusText.textContent = `Microphone error: ${event.error}`;
      };

      state.speechRecognition.onend = () => {
        stopRecording();
      };
    }
  }

  micBtn.addEventListener('click', () => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  function startRecording() {
    if (state.speechRecognition) {
      try {
        state.speechRecognition.start();
      } catch (e) {
        console.error('Speech recognition start failed:', e);
      }
    } else {
      // Fallback: Record audio via MediaRecorder and upload to backend
      startMediaRecorder();
    }
  }

  function stopRecording() {
    state.isRecording = false;
    micBtn.classList.remove('recording');
    if (state.speechRecognition) {
      try { state.speechRecognition.stop(); } catch (_) {}
    }
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
    }
  }

  async function startMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.mediaRecorder = new MediaRecorder(stream);
      state.audioChunks = [];

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.audioChunks.push(e.data);
      };

      state.mediaRecorder.onstart = () => {
        state.isRecording = true;
        micBtn.classList.add('recording');
        speechPreviewBar.classList.remove('hidden');
        speechStatusText.textContent = 'Recording microphone audio...';
      };

      state.mediaRecorder.onstop = async () => {
        state.isRecording = false;
        micBtn.classList.remove('recording');
        speechStatusText.textContent = 'Transcribing with local model...';

        const audioBlob = new Blob(state.audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'mic_recording.wav');

        try {
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.text) {
            messageInput.value = data.text;
            speechStatusText.textContent = `Transcribed: "${data.text}"`;
          } else if (data.error) {
            alert(`Voice Notice: ${data.error}`);
            speechPreviewBar.classList.add('hidden');
          }
        } catch (err) {
          alert('Could not transcribe audio: ' + err.message);
          speechPreviewBar.classList.add('hidden');
        }
      };

      state.mediaRecorder.start();
    } catch (err) {
      alert('Microphone access denied or unsupported: ' + err.message);
    }
  }

  useSpeechBtn.addEventListener('click', () => {
    speechPreviewBar.classList.add('hidden');
    sendMessage();
  });

  cancelSpeechBtn.addEventListener('click', () => {
    speechPreviewBar.classList.add('hidden');
    stopRecording();
    messageInput.value = '';
  });

  // -------------------------------------------------------------
  // 4. VOICE OUTPUT (TEXT-TO-SPEECH)
  // -------------------------------------------------------------
  async function speakResponse(fullText) {
    stopPlayback();

    nowSpeakingIndicator.classList.remove('hidden');
    state.isSpeaking = true;

    try {
      // 1. Try server-side local speech synthesis
      const res = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText })
      });

      if (res.ok) {
        const data = await res.json();
        const audio = new Audio(data.audio_url);
        state.activeAudio = audio;
        audio.onended = () => stopPlayback();
        audio.onerror = () => fallbackBrowserSpeech(fullText);
        await audio.play();
        return;
      }
    } catch (_) {
      // Fallback
    }

    fallbackBrowserSpeech(fullText);
  }

  function fallbackBrowserSpeech(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Clean speech text
      const clean = text.replace(/```[\s\S]*?```/g, '').replace(/[*_#`$]/g, '').slice(0, 1000);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.onend = () => stopPlayback();
      utterance.onerror = () => stopPlayback();
      window.speechSynthesis.speak(utterance);
    } else {
      stopPlayback();
    }
  }

  function stopPlayback() {
    state.isSpeaking = false;
    nowSpeakingIndicator.classList.add('hidden');
    if (state.activeAudio) {
      state.activeAudio.pause();
      state.activeAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  stopAudioBtn.addEventListener('click', stopPlayback);

  // -------------------------------------------------------------
  // 5. SOURCES & RETRIEVAL INSPECTOR DRAWER
  // -------------------------------------------------------------
  function openSourcesDrawer(title, sources) {
    sourcesDrawer.classList.add('open');
    sourcesDrawerContent.innerHTML = '';

    sources.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = 'source-item';
      const pageInfo = s.page_number ? ` &bull; Page ${s.page_number}` : '';
      const scorePct = Math.round(s.score * 100);

      item.innerHTML = `
        <div class="source-item-title">[${idx + 1}] ${escapeHtml(s.title)}</div>
        <div class="source-item-meta">${escapeHtml(s.category)}${pageInfo} &bull; Match: ${scorePct}%</div>
        <div class="source-item-snippet">${escapeHtml(s.snippet)}</div>
      `;
      sourcesDrawerContent.appendChild(item);
    });
  }

  closeDrawerBtn.addEventListener('click', () => {
    sourcesDrawer.classList.remove('open');
  });

  // -------------------------------------------------------------
  // 6. DOCUMENT MANAGEMENT & MODALS
  // -------------------------------------------------------------
  function initModals() {
    docsModalBtn.addEventListener('click', () => {
      docsModal.classList.remove('hidden');
      fetchDocumentsList();
    });

    settingsModalBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
      fetchHealthStatus();
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-close');
        const modal = document.getElementById(targetId);
        if (modal) modal.classList.add('hidden');
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });
  }

  // Upload Form
  uploadDocForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('docFileInput');
    if (!fileInput.files.length) return;

    const submitBtn = document.getElementById('uploadSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing & Indexing...';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('category', document.getElementById('docCategorySelect').value);
    formData.append('title', document.getElementById('docTitleInput').value.trim() || '');
    formData.append('branch', document.getElementById('docBranchInput').value.trim() || '');
    formData.append('subject', document.getElementById('docSubjectInput').value.trim() || '');
    formData.append('university', document.getElementById('docUniversityInput').value.trim() || '');
    formData.append('semester', document.getElementById('docSemesterInput').value.trim() || '');

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Upload failed: ' + (err.detail || 'Unknown error'));
      } else {
        uploadDocForm.reset();
        await fetchDocumentsList();
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload & Index Document';
    }
  });

  async function fetchDocumentsList() {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      docsCountBadge.textContent = data.total_count || 0;

      if (!docsTableBody) return;
      docsTableBody.innerHTML = '';

      if (!data.documents || data.documents.length === 0) {
        docsTableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">No documents uploaded yet. Upload a syllabus or textbook PDF above.</td></tr>';
        return;
      }

      data.documents.forEach(doc => {
        const tr = document.createElement('tr');
        const sizeMb = (doc.file_size_bytes / (1024 * 1024)).toFixed(2);
        tr.innerHTML = `
          <td><strong>${escapeHtml(doc.title)}</strong></td>
          <td>${escapeHtml(doc.category)}</td>
          <td>${escapeHtml(doc.subject || 'All')}</td>
          <td>${doc.page_count}</td>
          <td>${doc.chunk_count}</td>
          <td>${sizeMb} MB</td>
          <td>
            <button class="table-delete-btn" data-id="${doc.document_id}">Delete</button>
          </td>
        `;

        tr.querySelector('.table-delete-btn').addEventListener('click', async () => {
          if (confirm(`Delete "${doc.title}" from the knowledge base?`)) {
            await fetch(`/api/documents/${doc.document_id}`, { method: 'DELETE' });
            fetchDocumentsList();
          }
        });

        docsTableBody.appendChild(tr);
      });
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // 7. HEALTH DIAGNOSTICS & MODEL CONFIGURATION
  // -------------------------------------------------------------
  async function fetchHealthStatus() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();

      // Top badge
      const dot = healthBadge.querySelector('.status-dot');
      if (data.status === 'healthy') {
        dot.className = 'status-dot dot-green';
        healthText.textContent = `Ollama: ${data.selected_model}`;
      } else if (data.ollama_status === 'connected') {
        dot.className = 'status-dot dot-yellow';
        healthText.textContent = `Model ${data.selected_model} missing`;
      } else {
        dot.className = 'status-dot dot-red';
        healthText.textContent = 'Ollama Offline';
      }

      // Settings modal
      document.getElementById('diagOllamaStatus').textContent = data.ollama_status;
      document.getElementById('diagOllamaUrl').textContent = data.ollama_url;
      activeModelInput.value = data.selected_model;
      document.getElementById('diagInstalledModels').textContent = 
        (data.available_ollama_models && data.available_ollama_models.length) 
          ? data.available_ollama_models.join(', ') 
          : 'None installed yet';
      document.getElementById('diagHwRec').textContent = data.hardware_recommendation;
      document.getElementById('diagIndexStatus').textContent = `${data.index_status} (${data.indexed_chunks_count} chunks)`;
      document.getElementById('diagSttStatus').textContent = data.voice_stt_status;
      document.getElementById('diagTtsStatus').textContent = data.voice_tts_status;

    } catch (err) {
      const dot = healthBadge.querySelector('.status-dot');
      dot.className = 'status-dot dot-red';
      healthText.textContent = 'Server Disconnected';
    }
  }

  saveModelBtn.addEventListener('click', async () => {
    const newModel = activeModelInput.value.trim();
    if (!newModel) return;

    try {
      const res = await fetch('/api/settings/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: newModel })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchHealthStatus();
      }
    } catch (err) {
      alert('Failed to update model: ' + err.message);
    }
  });

  // -------------------------------------------------------------
  // 8. HELPERS & MARKDOWN FORMATTING
  // -------------------------------------------------------------
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let t = escapeHtml(text);

    // Code blocks with syntax highlighting container
    t = t.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><div style="color: var(--accent-cyan); font-size: 0.72rem; margin-bottom: 0.3rem;">// ${lang || 'code'}</div><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Line breaks
    t = t.replace(/\n\n/g, '<br><br>');
    t = t.replace(/\n/g, '<br>');

    return t;
  }
});
