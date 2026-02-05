require('dotenv').config();

const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-pro",
    "gemini-1.5-pro"
];

const API_KEY = process.env.GEMINI_API_KEY;

async function checkModel(model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ping' }] }]
            })
        });

        if (response.ok) {
            console.log(`✅ ${model} is VALID`);
            return true;
        } else {
            console.log(`❌ ${model} failed: ${response.status} ${response.statusText}`);
            // const err = await response.json();
            // console.log(JSON.stringify(err, null, 2));
            return false;
        }
    } catch (e) {
        console.error(`⚠️ ${model} error:`, e.message);
        return false;
    }
}

async function run() {
    console.log("Checking Gemini Models...");
    for (const m of models) {
        await checkModel(m);
    }
}

run();
