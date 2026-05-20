import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { modelId, messages, context } = await req.json();

    const systemPrompt = `You are an elite Fortune 500 Chief Strategy Officer assisting the user dynamically.
The user is currently viewing the following Strategy Compass dashboard which you generated:
--- START STRATEGY CONTEXT ---
${context ? context : "No strategy generated yet."}
--- END STRATEGY CONTEXT ---

Answer the user's questions strictly based on this context and your strategic expertise.
Keep your responses highly concise, professional, and directly actionable.
You may use standard Markdown formatting.`;

    let generatedText = "";

    // -- MULTI-MODEL ROUTER --
    if (modelId === 'gemini') {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing from environment variables.");
        
        const formattedHistory = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: { text: systemPrompt } },
                contents: formattedHistory
            })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error?.message || "Gemini REST API Failed");
        generatedText = data.candidates[0].content.parts[0].text;
        
    } else if (modelId === 'groq' || modelId === 'ollama') {
        let openai;
        let selectedModel;
        
        if (modelId === 'groq') {
            if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing from environment variables.");
            openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
            selectedModel = 'llama-3.1-8b-instant';
        } else {
            openai = new OpenAI({ apiKey: 'ollama-local', baseURL: "http://127.0.0.1:11434/v1" });
            selectedModel = 'llama3';
        }

        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 800
        });
        generatedText = response.choices[0].message.content;
    } else {
        throw new Error("Invalid AI Engine selected.");
    }

    return NextResponse.json({ success: true, data: generatedText });

  } catch (error) {
    let errorMsg = error.message;
    if (errorMsg === 'Connection error.' || (error.code && error.code === 'ECONNREFUSED' && errorMsg.includes('11434'))) {
        errorMsg = "Local AI Engine is unreachable. Please boot Ollama.";
    }
    console.error("Chat API Error:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
