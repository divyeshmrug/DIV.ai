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
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const historySidebar = document.getElementById('history-sidebar');
const historyList = document.getElementById('history-list');
const newChatSidebarBtn = document.getElementById('new-chat-sidebar-btn');
const closeHistoryBtn = document.getElementById('close-history-btn');
const modelSelector = document.getElementById('model-selector');

// Base URL for Backend
const API_URL = '/api';

// Auth State
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let resetEmail = ''; // To store email during reset flow
let currentConversationId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Current Page Check
    const isLoginPage = window.location.pathname.endsWith('login.html');

    // Redirect Logic
    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    if (token && isLoginPage) {
        if (username === 'div.ai') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/';
        }
        return;
    }

    // Splash Screen Timing (only on main app)
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('fade-out');
        }, 2000);
    }

    if (token && !isLoginPage) {
        showApp();
    }
});

// Pronounce Tool Logic (Only run if elements exist, e.g. on main page)
let voices = [];
if (pronounceToolBtn) {
    function loadVoices() {
        voices = window.speechSynthesis.getVoices();
        if (voiceSelect) {
            voiceSelect.innerHTML = voices
                .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
                .join('');
        }
    }

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
}

// --- Auth Functions ---

function showApp() {
    // Check if authOverlay exists before trying to access style
    if (authOverlay) authOverlay.style.display = 'none';

    if (logoutBtn) {
        logoutBtn.innerText = `Logout (${username})`;
        logoutBtn.style.display = 'block';
    }
    if (newChatBtn) newChatBtn.style.display = 'block';

    loadConversationList();
}

function handleError(err) {
    if (authError) {
        authError.innerText = err;
        authError.style.display = 'block';
        setTimeout(() => { authError.style.display = 'none'; }, 5000);
    } else {
        alert(err);
    }
}

function hideAllForms() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';
    if (authError) authError.style.display = 'none';
}

// Tab Switching
if (tabLogin) {
    tabLogin.onclick = () => {
        hideAllForms();
        tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (loginForm) loginForm.style.display = 'flex';
    };
}

if (tabRegister) {
    tabRegister.onclick = () => {
        hideAllForms();
        tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        if (registerForm) registerForm.style.display = 'flex';
    };
}

if (linkForgot) {
    linkForgot.onclick = (e) => {
        e.preventDefault();
        hideAllForms();
        if (forgotForm) forgotForm.style.display = 'flex';
    };
}

linksBackLogin.forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        tabLogin.onclick();
    };
});

// Login
if (loginForm) {
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

            if (username === 'div.ai') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            handleError(err.message);
        }
    };
}

// Register
if (registerForm) {
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
            if (tabLogin) tabLogin.click(); // Switch to login tab
        } catch (err) {
            handleError(err.message);
        }
    };
}

// Forgot Password
if (forgotForm) {
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
            if (resetForm) resetForm.style.display = 'flex';
        } catch (err) {
            handleError(err.message);
            forgotForm.querySelector('button').innerText = 'Send OTP';
        }
    };
}

// Reset Password
if (resetForm) {
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
            if (tabLogin) tabLogin.click();
        } catch (err) {
            handleError(err.message);
        }
    };
}

// Logout
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        location.reload();
    };
}

// --- Sidebar & Conversation Logic ---

if (toggleHistoryBtn) {
    toggleHistoryBtn.onclick = () => {
        historySidebar.classList.toggle('active');
    };
}

if (closeHistoryBtn) {
    closeHistoryBtn.onclick = () => {
        historySidebar.classList.remove('active');
    };
}

if (newChatSidebarBtn) {
    newChatSidebarBtn.onclick = () => {
        createNewChat();
    };
}

if (newChatBtn) {
    newChatBtn.onclick = () => {
        createNewChat();
    };
}

function createNewChat() {
    currentConversationId = null;
    chatHistory.innerHTML = '';
    chatHistory.appendChild(typingIndicator);
    addMessage(`Welcome back ${username}! Let's start a fresh conversation.`, 'ai-message');

    // Clear active state in sidebar
    document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));

    // Auto-focus input
    if (userInput) userInput.focus();
}

async function loadConversationList() {
    if (!historyList) return;

    try {
        const res = await fetch(`${API_URL}/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const conversations = await res.json();

        if (!res.ok) throw new Error("Failed to fetch conversations");

        historyList.innerHTML = '';
        if (conversations.length === 0) {
            historyList.innerHTML = '<div class="history-item">No recent chats</div>';
            loadConversationMessages(null); // Load empty/default
            return;
        }

        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'history-item';
            if (conv._id === currentConversationId) item.classList.add('active');

            item.innerHTML = `
                <div class="conv-info">
                    <div class="conv-title">${escapeHtml(conv.title)}</div>
                    <div class="conv-date" style="font-size:0.7rem; color:rgba(0,0,0,0.4)">${new Date(conv.updatedAt).toLocaleDateString()}</div>
                </div>
            `;

            item.onclick = () => {
                document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                loadConversationMessages(conv._id);
                if (window.innerWidth < 800) historySidebar.classList.remove('active');
            };

            historyList.appendChild(item);
        });

        // Load latest if none active
        if (!currentConversationId && conversations.length > 0) {
            loadConversationMessages(conversations[0]._id);
            historyList.firstChild.classList.add('active');
        } else if (conversations.length === 0) {
            addMessage(`Welcome ${username}! I am Div.ai. How can I help you today?`, 'ai-message');
        }

    } catch (err) {
        console.error(err);
    }
}

async function loadConversationMessages(id) {
    if (!id) return;
    currentConversationId = id;

    try {
        const res = await fetch(`${API_URL}/conversations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await res.json();

        chatHistory.innerHTML = '';
        chatHistory.appendChild(typingIndicator);

        if (history.length === 0) {
            addMessage(`This conversation is empty.`, 'ai-message');
        } else {
            history.forEach(msg => {
                addMessage(msg.text, msg.role === 'user' ? 'user-message' : 'ai-message');
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// --- Chat Functions ---

// Auto-resize textarea
if (userInput) {
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value === '') this.style.height = 'auto';
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Event Listeners
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

// Removed legacy loadHistory function

async function sendMessage() {
    if (!userInput) return;

    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user-message');
    userInput.value = '';
    userInput.style.height = 'auto'; // Reset height

    // Show Typing Indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    if (chatHistory) {
        chatHistory.appendChild(typingDiv);
        scrollToBottom();
    }

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: text,
                conversationId: currentConversationId,
                provider: modelSelector ? modelSelector.value : 'gemini'
            })
        });

        const data = await res.json();
        if (chatHistory && typingDiv.parentNode) chatHistory.removeChild(typingDiv); // Remove typing

        if (!res.ok) {
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            if (res.status === 429) {
                // Cooldown error
                const cooldownMsg = data.error || "Please wait before sending another message.";
                addMessage(`⏱️ ${cooldownMsg}`, 'ai-message');
                return;
            }
            throw new Error(data.error || "Failed to get response");
        }

        if (!currentConversationId) {
            currentConversationId = data.conversationId;
            loadConversationList(); // Refresh list to show new title
        }

        addMessage(data.text, 'ai-message');
    } catch (err) {
        if (chatHistory && typingDiv.parentNode) chatHistory.removeChild(typingDiv);
        addMessage(`Error: ${err.message}`, 'ai-message');
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
    if (chatHistory) chatHistory.scrollTop = chatHistory.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return "";
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}
