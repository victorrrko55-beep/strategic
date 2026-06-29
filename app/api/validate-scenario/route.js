import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const modelId = formData.get('modelId') || 'ollama';
    const scenariosRaw = formData.get('selectedScenarios') || '[]';
    const valLenses = formData.get('valLenses') || 'Feasibility, Viability, Desirability';
    const valMetrics = formData.get('valMetrics') || 'Not provided';
    const valProfiles = formData.get('valProfiles') || 'Not provided';
    const valCount = formData.get('valCount') || '3';

    let scenarios = [];
    try {
        scenarios = JSON.parse(scenariosRaw);
    } catch (e) {
        console.error("Failed to parse scenarios", e);
    }

    const systemPrompt = `You are an elite Strategy Validator AI.
Your task is to take the provided Strategic Scenarios and subject them to extreme stress testing by simulating interviews with ${valCount} Virtual Interviewers matching these profiles: ${valProfiles}.

EVALUATION PARAMETERS:
- Validation Lenses: ${valLenses}
- Success Metrics & Thresholds: ${valMetrics}
- Scenarios to Evaluate:
${JSON.stringify(scenarios, null, 2)}

You must perform a deep, lengthy, rigorous analysis. Do not hold back.
You must output your response ENTIRELY as a valid JSON object. DO NOT include any markdown formatting wrappers or conversational text!

Use this EXACT JSON schema:
{
  "sectionA": "Evidence-backed Validation Report. A detailed 3-paragraph synthesis of how the scenarios hold up against the Success Metrics.",
  "sectionB": [
    "A major risk or critical assumption identified during validation...",
    "Another major risk..."
  ],
  "sectionC": {
    "decision": "Go / Pivot / Kill",
    "reasoning": "A 2-sentence executive reasoning for this recommendation based on the data."
  },
  "sectionD": [
    {
      "interviewer": "Name/Title of the virtual interviewer",
      "persona": "Their profile archetype (e.g. Skeptic Engineer)",
      "response": "A detailed 3-4 sentence transcript of their harshest critique or biggest praise regarding the scenarios.",
      "stance": "Supportive / Hesitant / Opposed"
    }
  ],
  "sectionE": "Interviewer Consensus Map. A detailed paragraph summarizing where the interviewers agreed and where they clashed fundamentally.",
  "sectionF": [
    {
      "scenarioTitle": "Exact title of the scenario being scored",
      "scores": {
        "Feasibility": 8,
        "Viability": 4,
        "Desirability": 9
      }
    }
  ]
}

Ensure Section D has exactly ${valCount} items.
Ensure Section F has an object for every scenario provided in the input, and the keys in the 'scores' object exactly match the Validation Lenses provided (${valLenses}). Scores must be integers from 1 to 10.`;

    let generatedText = "";

    if (modelId === 'gemini') {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing.");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: systemPrompt,
            config: { responseMimeType: "application/json" }
        });
        generatedText = response.text;
        
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
            max_tokens: 4000
        });
        generatedText = response.choices[0].message.content;
    } else {
        throw new Error("Invalid AI Engine.");
    }
    
    generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData = JSON.parse(generatedText);

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error) {
    let errorMsg = error.message;
    if (errorMsg === 'Connection error.' || (error.code && error.code === 'ECONNREFUSED' && errorMsg.includes('11434'))) {
        errorMsg = "Local AI Engine is unreachable. Please boot Ollama.";
    }
    console.error("Validation API Error:", errorMsg);
    return NextResponse.json({ success: false, error: "Backend Processing Error: " + errorMsg }, { status: 500 });
  }
}
