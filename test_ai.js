require('dotenv').config();

const SYSTEM_PROMPT = "You are a helpful assistant.";

async function testGemini() {
    console.log("Testing Gemini...");
    const url = `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello, are you working?' }] }],
                generationConfig: { temperature: 0.7 }
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error("Gemini Error:", JSON.stringify(data, null, 2));
        } else {
            console.log("Gemini Success:", data.candidates[0].content.parts[0].text);
        }
    } catch (error) {
        console.error("Gemini Usage Error:", error);
    }
}

async function testGroq() {
    console.log("\nTesting Groq (Llama)...");
    if (!process.env.GROQ_API_KEY) {
        console.log("Skipping Groq (No API Key)");
        return;
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello, are you working?' }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error("Groq Error:", JSON.stringify(data, null, 2));
        } else {
            console.log("Groq Success:", data.choices[0].message.content);
        }
    } catch (error) {
        console.error("Groq Usage Error:", error);
    }
}

async function run() {
    await testGemini();
    await testGroq();
}

run();
