import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const modelId = formData.get('modelId') || 'ollama';
    const summaryContextRaw = formData.get('summaryContext') || '{}';
    const sumAction = formData.get('sumAction') || 'Go';
    const sumAudience = formData.get('sumAudience') || 'Board of Directors';
    const sumTone = formData.get('sumTone') || 'Executive';

    let summaryContext = {};
    try {
        summaryContext = JSON.parse(summaryContextRaw);
    } catch (e) {
        console.error("Failed to parse summaryContext", e);
    }

    const systemPrompt = `You are a Chief Strategy Officer writing an Executive 1-Pager.
Your task is to synthesize the winning scenario and its validation data into a high-impact final brief.

EVALUATION PARAMETERS:
- Target Audience: ${sumAudience}
- Tone / Communication Style: ${sumTone}
- Recommended Action: ${sumAction} (Go / Pivot / Kill)

CONTEXT TO SYNTHESIZE:
Winning Scenario Title: ${summaryContext.winningScenario || 'Unknown'}
Scores: ${JSON.stringify(summaryContext.scores || {})}
Executive Recommendation from Validation: ${JSON.stringify(summaryContext.executiveRecommendation || {})}
Interviewer Consensus: ${summaryContext.interviewerConsensus || 'None'}

You must output your response ENTIRELY as a valid JSON object. DO NOT include any markdown formatting wrappers or conversational text!

Use this EXACT JSON schema:
{
  "context": "A 2-paragraph synthesis of the scenario context, why it won the validation, and what the consensus was.",
  "move": "A 1-paragraph description of the Strategic Move, strongly aligned with the Recommended Action (${sumAction}).",
  "impact": "A 1-paragraph projection of the business impact if this move is executed.",
  "resources": [
    "Capital requirement...",
    "Team requirement...",
    "Tech requirement..."
  ],
  "actions90Days": [
    "Action 1 for Month 1...",
    "Action 2 for Month 2...",
    "Action 3 for Month 3..."
  ]
}

Write exactly ${sumTone}. Target exactly the ${sumAudience}. Make it sound incredibly professional and data-driven.`;

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
            max_tokens: 2500
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
    console.error("Summary API Error:", errorMsg);
    return NextResponse.json({ success: false, error: "Backend Processing Error: " + errorMsg }, { status: 500 });
  }
}
