require('dotenv').config();

const KEY = process.env.GEMINI_API_KEY;
const MODELS = [
    'gemini-flash-lite-latest',
    'gemma-3-12b-it',
    'gemma-3-4b-it',
    'gemini-2.0-flash-lite-001',
    'gemini-1.5-flash-8b'
];

async function testModel(model) {
    console.log(`\n--- Testing ${model} ---`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;

    const body = {
        contents: [{ parts: [{ text: "Hello, are you working?" }] }]
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            console.log(`✅ ${model} SUCCESS: ${data.candidates[0].content.parts[0].text.substring(0, 50).replace(/\n/g, ' ')}...`);
            return true;
        } else {
            console.log(`❌ ${model} ERROR: ${data.error?.message}`);
            return false;
        }
    } catch (e) {
        console.log(`❌ ${model} FAILED: ${e.message}`);
        return false;
    }
}

async function run() {
    for (const model of MODELS) {
        await testModel(model);
    }
}

run();
