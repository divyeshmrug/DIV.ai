require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log("Fetching available models...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log("✅ Models available:");
            if (data.models) {
                data.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`- ${m.name}`);
                    }
                });
            } else {
                console.log("No models found in response.");
            }
        } else {
            console.error("❌ ListModels failed:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}

listModels();
