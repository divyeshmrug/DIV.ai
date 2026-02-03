// DOM Elements
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// Base URL for Backend
// Base URL for Backend (Relative for deployment)
const API_URL = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', loadHistory);

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
        const response = await fetch(`${API_URL}/history`);
        const messages = await response.json();

        // Remove existing (except indicator)
        chatHistory.innerHTML = '';
        chatHistory.appendChild(typingIndicator);

        messages.forEach(msg => {
            addMessage(msg.text, msg.role === 'user' ? 'user-message' : 'ai-message');
        });
    } catch (error) {
        console.error("Failed to load history:", error);
        addMessage("Could not connect to server. Ensure 'node server.js' is running.", 'ai-message');
    }
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Add User Message Optimistically
    addMessage(text, 'user-message');
    showTyping(true);
    scrollToBottom();

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            if (response.status === 429) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
            throw new Error('Server Error');
        }

        const data = await response.json();
        showTyping(false);
        addMessage(data.text, 'ai-message');

    } catch (error) {
        showTyping(false);
        addMessage(`Error: ${error.message}`, 'ai-message');
        console.error(error);
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
    if (show) {
        chatHistory.appendChild(typingIndicator);
    }
}

function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return "";
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}
