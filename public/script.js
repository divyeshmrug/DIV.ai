// DOM Elements
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// Auth Elements
const authOverlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotForm = document.getElementById('forgot-form');
const resetForm = document.getElementById('reset-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const pronounceToolBtn = document.getElementById('pronounce-tool-btn');
const pronounceSidebar = document.getElementById('pronounce-sidebar');
const sidebarPronounceInput = document.getElementById('sidebar-pronounce-input');
const sidebarPlayBtn = document.getElementById('sidebar-play-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const popoutBtn = document.getElementById('popout-btn');
const voiceSelect = document.getElementById('voice-select');
const rateSlider = document.getElementById('rate-slider');
const newChatBtn = document.getElementById('new-chat-btn');
const linkForgot = document.getElementById('link-forgot');
const linksBackLogin = document.querySelectorAll('.link-back-login');

// Base URL for Backend
const API_URL = '/api';

// Auth State
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let resetEmail = ''; // To store email during reset flow

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Splash Screen Timing
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        if (splash) splash.classList.add('fade-out');
    }, 2500);

    if (token) {
        showApp();
    } else {
        showAuth();
    }
});

// Pronounce Tool Logic
let voices = [];

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
    if (voiceSelect) {
        voiceSelect.innerHTML = voices
            .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
            .join('');
    }
}

// Initial load
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

pronounceToolBtn.onclick = () => {
    pronounceSidebar.classList.toggle('active');
    if (pronounceSidebar.classList.contains('active')) {
        sidebarPronounceInput.focus();
    }
};

closeSidebarBtn.onclick = () => {
    pronounceSidebar.classList.remove('active');
    window.speechSynthesis.cancel();
};

sidebarPlayBtn.onclick = () => {
    const text = sidebarPronounceInput.value.trim();
    if (text) {
        const rate = rateSlider ? rateSlider.value : 1;
        const voice = voices[voiceSelect.value];
        speak(text, rate, voice);
    }
};

popoutBtn.onclick = () => {
    const w = 600;
    const h = 700;
    const left = (screen.width / 2) - (w / 2);
    const top = (screen.height / 2) - (h / 2);
    window.open('pronounce.html', 'PronounceTool', `width=${w},height=${h},top=${top},left=${left}`);
};

// --- Auth Functions ---

function showApp() {
    authOverlay.style.display = 'none';
    logoutBtn.innerText = `Logout (${username})`;
    newChatBtn.style.display = 'block';
    logoutBtn.style.display = 'block';
    loadHistory();
}

function showAuth() {
    authOverlay.style.display = 'flex';
    logoutBtn.style.display = 'none';
    chatHistory.innerHTML = '<div class="message ai-message">Please login to start chatting.</div>';
}

function hideAllForms() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    resetForm.style.display = 'none';
    authError.style.display = 'none';
}

function handleError(err) {
    authError.innerText = err;
    authError.style.display = 'block';
    setTimeout(() => { authError.style.display = 'none'; }, 5000);
}

// Tab Switching
tabLogin.onclick = () => {
    hideAllForms();
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'flex';
};

tabRegister.onclick = () => {
    hideAllForms();
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'flex';
};

linkForgot.onclick = (e) => {
    e.preventDefault();
    hideAllForms();
    forgotForm.style.display = 'flex';
};

linksBackLogin.forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        tabLogin.onclick();
    };
});

// Login
loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        token = data.token;
        username = data.username;
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        showApp();
    } catch (err) {
        handleError(err.message);
    }
};

// Register
registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const u = document.getElementById('register-username').value;
    const em = document.getElementById('register-email').value;
    const p = document.getElementById('register-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, email: em, password: p })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert('Registration successful! Please login.');
        tabLogin.onclick();
    } catch (err) {
        handleError(err.message);
    }
};

// Forgot Password
forgotForm.onsubmit = async (e) => {
    e.preventDefault();
    const em = document.getElementById('forgot-email').value;
    resetEmail = em;

    try {
        forgotForm.querySelector('button').innerText = 'Sending...';
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: em })
        });
        const data = await res.json();
        forgotForm.querySelector('button').innerText = 'Send OTP';

        if (!res.ok) throw new Error(data.error);

        alert('OTP sent! Please check your email.');
        hideAllForms();
        resetForm.style.display = 'flex';
    } catch (err) {
        handleError(err.message);
        forgotForm.querySelector('button').innerText = 'Send OTP';
    }
};

// Reset Password
resetForm.onsubmit = async (e) => {
    e.preventDefault();
    const otp = document.getElementById('reset-otp').value;
    const newPass = document.getElementById('reset-new-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetEmail, otp: otp, newPassword: newPass })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert('Password reset successful! Please login.');
        tabLogin.onclick();
    } catch (err) {
        handleError(err.message);
    }
};

// Logout
logoutBtn.onclick = () => {
    localStorage.clear();
    location.reload();
};

// New Chat
newChatBtn.onclick = async () => {
    if (!confirm("Are you sure you want to clear your chat history?")) return;

    try {
        const res = await fetch(`${API_URL}/history`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to clear history");

        chatHistory.innerHTML = '';
        chatHistory.appendChild(typingIndicator);
        addMessage(`Welcome back ${username}! Let's start a fresh conversation.`, 'ai-message');
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

// --- Chat Functions ---

// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.value === '') this.style.height = 'auto';
});

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 400) {
            logoutBtn.onclick();
            return;
        }

        const messages = await response.json();

        chatHistory.innerHTML = '';
        chatHistory.appendChild(typingIndicator);

        if (messages.length === 0) {
            addMessage(`Welcome ${username}! I am Div.ai. How can I help you today?`, 'ai-message');
        } else {
            messages.forEach(msg => {
                addMessage(msg.text, msg.role === 'user' ? 'user-message' : 'ai-message');
            });
        }
    } catch (error) {
        console.error("Failed to load history:", error);
    }
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || !token) return;

    userInput.value = '';
    userInput.style.height = 'auto';

    addMessage(text, 'user-message');
    showTyping(true);
    scrollToBottom();

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Server Error');
        }

        const data = await response.json();
        showTyping(false);
        addMessage(data.text, 'ai-message');

        // Update remaining count locally
        const currentCount = parseInt(chatCountEl.innerText);
        chatCountEl.innerText = Math.max(0, currentCount - 1);

    } catch (error) {
        showTyping(false);
        const errorMsg = error.message.includes('Rate limit')
            ? "⚠️ AI Limit Reached. Please wait 30-60 seconds and try again."
            : `Error: ${error.message}`;
        addMessage(errorMsg, 'ai-message');
    }
}

function addMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', className);

    const textSpan = document.createElement('span');
    let formattedText = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:4px;">$1</code>')
        .replace(/\n/g, '<br>');
    textSpan.innerHTML = formattedText;
    msgDiv.appendChild(textSpan);

    // Speak button for ALL messages
    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.innerHTML = '🔊';
    speakBtn.title = 'Listen';
    speakBtn.onclick = () => speak(text);
    msgDiv.appendChild(speakBtn);

    chatHistory.insertBefore(msgDiv, typingIndicator);
    scrollToBottom();
}

function speak(text, rate = 1, voice = null) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Sorry, your browser doesn't support text-to-speech.");
    }
}

function showTyping(show) {
    typingIndicator.style.display = show ? 'flex' : 'none';
    if (show) chatHistory.appendChild(typingIndicator);
}

function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return "";
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}
