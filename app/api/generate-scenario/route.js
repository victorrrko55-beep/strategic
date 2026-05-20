import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const modelId = formData.get('modelId') || 'ollama';
    const personasRaw = formData.get('personas') || '[]';
    const sbExperience = formData.get('sbExperience') || 'Not provided';
    const sbCountry = formData.get('sbCountry') || 'Not provided';
    const sbPainPoints = formData.get('sbPainPoints') || 'Not provided';
    const sbDevices = formData.get('sbDevices') || 'Not provided';
    const sbCompetitors = formData.get('sbCompetitors') || 'Not provided';
    const sbCount = formData.get('sbCount') || '3';

    let personas = [];
    try {
        personas = JSON.parse(personasRaw);
    } catch (e) {
        console.error("Failed to parse personas", e);
    }

    const systemPrompt = `You are an elite UX Researcher and Strategic Scenario Builder.
You are tasked with generating high-level Strategic Scenarios for a specific target experience.

THE SCENARIO PARAMETERS:
Target Experience Area: ${sbExperience}
Target Country: ${sbCountry}
Pain Points or Needs: ${sbPainPoints}
Key Devices: ${sbDevices}
Core Competitors: ${sbCompetitors}
Number of Scenarios to Generate: ${sbCount}

THE TARGET USER (PERSONA):
${JSON.stringify(personas, null, 2)}

Your goal is to build ${sbCount} high-level strategic scenarios for this persona.
You must output your response ENTIRELY as a valid JSON object. DO NOT include any markdown formatting wrappers or conversational text!

Use this EXACT JSON schema:
{
  "sectionA": [
    {
      "scenarioTitle": "A catchy, descriptive title for the scenario",
      "scenarioDescription": "A detailed 2-3 sentence narrative describing the situation, context, and the user's ultimate goal.",
      "trigger": "What precisely prompts them to start this scenario?",
      "primaryActor": "The persona name and their primary motivation in this context"
    }
  ],
  "sectionB": {
    "comparisonSummary": "A 2-3 sentence summary comparing the generated scenarios, identifying the hardest vs easiest scenario.",
    "keyDifferences": ["Difference 1...", "Difference 2...", "Difference 3..."]
  },
  "sectionC": [
    {
      "competitorName": "Name of a core competitor from the parameters",
      "frictionPoint": "A specific friction point or failure this competitor would experience in these scenarios."
    }
  ]
}

Ensure Section A has exactly ${sbCount} items in the array.`;

    let generatedText = "";

    if (modelId === 'gemini') {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing.");
        const payload = {
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Gemini REST API Failed");
        generatedText = data.candidates[0].content.parts[0].text;
        
    } else if (modelId === 'groq' || modelId === 'ollama') {
        let openai;
        let selectedModel;
        
        if (modelId === 'groq') {
            if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing.");
            openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
            selectedModel = 'llama-3.1-8b-instant';
        } else {
            openai = new OpenAI({ apiKey: 'ollama-local', baseURL: "http://127.0.0.1:11434/v1" });
            selectedModel = 'llama3';
        }

        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: "json_object" }, 
            temperature: 0.7,
            max_tokens: 3000
        });
        generatedText = response.choices[0].message.content;
    } else {
        throw new Error("Invalid AI Engine.");
    }
    
    // Clean up potential markdown wrapper from local models that ignore format
    generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData = JSON.parse(generatedText);

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error) {
    let errorMsg = error.message;
    if (errorMsg === 'Connection error.' || (error.code && error.code === 'ECONNREFUSED' && errorMsg.includes('11434'))) {
        errorMsg = "Local AI Engine is unreachable. Please boot Ollama.";
    }
    console.error("Scenario API Error:", errorMsg);
    return NextResponse.json({ success: false, error: "Backend Processing Error: " + errorMsg }, { status: 500 });
  }
}
