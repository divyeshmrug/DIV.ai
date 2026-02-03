// DOM Elements
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// Auth Elements
const authOverlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');

// Base URL for Backend
const API_URL = '/api';

// Auth State
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showApp();
    } else {
        showAuth();
    }
});

// --- Auth Functions ---

function showApp() {
    authOverlay.style.display = 'none';
    logoutBtn.innerText = `Logout (${username})`;
    logoutBtn.style.display = 'block';
    loadHistory();
}

function showAuth() {
    authOverlay.style.display = 'flex';
    logoutBtn.style.display = 'none';
    chatHistory.innerHTML = '<div class="message ai-message">Please login to start chatting.</div>';
}

function handleError(err) {
    authError.innerText = err;
    authError.style.display = 'block';
    setTimeout(() => { authError.style.display = 'none'; }, 5000);
}

// Tab Switching
tabLogin.onclick = () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
};

tabRegister.onclick = () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
};

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
    const p = document.getElementById('register-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert('Registration successful! Please login.');
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

    } catch (error) {
        showTyping(false);
        addMessage(`Error: ${error.message}`, 'ai-message');
    }
}

function addMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', className);

    let formattedText = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:4px;">$1</code>')
        .replace(/\n/g, '<br>');

    msgDiv.innerHTML = formattedText;
    chatHistory.insertBefore(msgDiv, typingIndicator);
    scrollToBottom();
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
