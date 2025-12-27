const state = {
    socket: null,
    isConnected: false
};

const elements = {
    setupSection: document.getElementById('setup-section'),
    interviewSection: document.getElementById('interview-section'),
    reportSection: document.getElementById('report-section'),
    screenInput: document.getElementById('screen-input'),
    speechInput: document.getElementById('speech-input'),
    startBtn: document.getElementById('start-btn'),
    chatHistory: document.getElementById('chat-history'),
    answerInput: document.getElementById('answer-input'),
    sendBtn: document.getElementById('send-btn'),
    statusIndicator: document.getElementById('status-indicator'),
    scoreGrid: document.getElementById('score-grid'),
    feedbackText: document.getElementById('feedback-text')
};

function init() {
    elements.startBtn.addEventListener('click', startInterview);
    elements.sendBtn.addEventListener('click', sendAnswer);
    elements.answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAnswer();
    });
}

function startInterview() {
    const screenText = elements.screenInput.value.trim();
    const speechText = elements.speechInput.value.trim();

    if (!screenText && !speechText) {
        alert("Please provide some project details.");
        return;
    }

    // Connect to WebSocket
    // Assumes backend is running on port 8000
    state.socket = new WebSocket('ws://localhost:8000/ws/interview');

    state.socket.onopen = () => {
        state.isConnected = true;

        // Transition UI
        elements.setupSection.classList.add('hidden');
        elements.interviewSection.classList.remove('hidden');

        // Send status
        state.socket.send(JSON.stringify({
            type: 'start',
            screen_content: screenText,
            student_speech: speechText
        }));
    };

    state.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    state.socket.onclose = () => {
        console.log("Disconnected");
        state.isConnected = false;
    };

    state.socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        alert("Connection error. Is the backend running?");
    };
}

function handleMessage(data) {
    if (data.type === 'status') {
        elements.statusIndicator.textContent = data.message;
        elements.statusIndicator.classList.remove('hidden');
    } else if (data.type === 'question') {
        addMessage('ai', data.text);
        elements.statusIndicator.classList.add('hidden');
        elements.answerInput.focus();
    } else if (data.type === 'end') {
        elements.statusIndicator.classList.add('hidden');
        showReport(data.report);
    } else if (data.type === 'error') {
        alert("Error: " + data.message);
    }
}

function sendAnswer() {
    const text = elements.answerInput.value.trim();
    if (!text || !state.isConnected) return;

    addMessage('user', text);
    elements.answerInput.value = '';
    elements.statusIndicator.textContent = 'Evaluating answer...';
    elements.statusIndicator.classList.remove('hidden');

    state.socket.send(JSON.stringify({
        type: 'answer',
        content: text
    }));
}

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = text;
    elements.chatHistory.appendChild(div);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

function showReport(report) {
    elements.interviewSection.classList.add('hidden');
    elements.reportSection.classList.remove('hidden');

    // Populate scores
    const scores = report.scores || {};
    elements.scoreGrid.innerHTML = `
        <div class="score-item"><span class="score-value">${scores.technical_depth || 0}</span><span class="score-label">Technical Depth</span></div>
        <div class="score-item"><span class="score-value">${scores.clarity || 0}</span><span class="score-label">Clarity</span></div>
        <div class="score-item"><span class="score-value">${scores.originality || 0}</span><span class="score-label">Originality</span></div>
        <div class="score-item"><span class="score-value">${scores.implementation || 0}</span><span class="score-label">Implementation</span></div>
    `;

    elements.feedbackText.textContent = report.feedback_summary || "No feedback generated.";
}

init();
