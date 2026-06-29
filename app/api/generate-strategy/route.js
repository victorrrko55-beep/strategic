import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const url = formData.get('url') || 'Not provided';
    const audience = formData.get('audience') || 'Not provided';
    const competitors = formData.get('competitors') || 'Not provided';
    const experience = formData.get('experience') || 'Not provided';
    const objective = formData.get('objective') || 'Not provided';
    const modelId = formData.get('modelId') || 'ollama'; // Default to free local
    const files = formData.getAll('files');

    let pdfText = '';
    const { PdfReader } = require('pdfreader');
    const officeParser = require('officeparser');

    if (files && files.length > 0) {
        for (const file of files) {
            if (typeof file !== 'string') {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileName = file.name.toLowerCase();

                if (fileName.endsWith('.pdf')) {
                    const text = await new Promise((resolve, reject) => {
                        let extractedText = '';
                        new PdfReader().parseBuffer(buffer, (err, item) => {
                            if (err) reject(err);
                            else if (!item) resolve(extractedText);
                            else if (item.text) extractedText += item.text + ' ';
                        });
                    });
                    pdfText += `\n\n--- Document: ${file.name} ---\n` + text;
                } else if (fileName.endsWith('.docx') || fileName.endsWith('.pptx')) {
                    try {
                        const text = await officeParser.parseOfficeAsync(buffer);
                        pdfText += `\n\n--- Document: ${file.name} ---\n` + text;
                    } catch (err) {
                        console.error('Office Parser Error:', err);
                        pdfText += `\n\n--- Document: ${file.name} [FAILED TO PARSE] ---\n`;
                    }
                }
            }
        }
    }
    
    // Hard cap for local model context windows
    if (pdfText.length > 20000) {
        pdfText = pdfText.substring(0, 20000) + '... [TRUNCATED]';
    }

    const systemPrompt = `You are a Fortune 500 Chief Strategy Officer. Generate a highly deep, actionable strategic analysis in strict Markdown format.
Focus on Objective: ${objective}.
Target Company Context: ${url}
Target Audience: ${audience}
Core Competitors: ${competitors}
Target Experience: ${experience}

Uploaded PDF Strategy Reference Text:
${pdfText ? pdfText.substring(0, 15000) : "No PDF uploaded."}

Structure your response with:
### SECTION A: Advanced SWOT Analysis
Provide deep, dense business logic. For every single point you make, you MUST append a plausible or inferred reference source in brackets (e.g., "[Source: Industry Analysis 2024]"). Format exactly as four SEPARATE Markdown blockquotes. 
CRITICAL RULES FOR SWOT:
1. You MUST prepend the "> " blockquote character to EVERY SINGLE LINE of the SWOT sections, including the titles AND the bullet points! Do not drop the "> " prefix!
2. You MUST separate each blockquote by an empty blank line so they do not merge together.
> **Strengths**
> - point [Source: ...]

> **Weaknesses**
> - point [Source: ...]

> **Opportunities**
> - point [Source: ...]

> **Threats**
> - point [Source: ...]

### SECTION B: Actionable Strategic Levers
Given the target experience of ${experience} and the objective of ${objective}, what are the 3 most effective levers? For each lever, provide the h4 title followed immediately by a detailed, highly specific strategic description paragraph.
#### Lever 1: [Name]
[Detailed strategic description...]
#### Lever 2: [Name]
[Detailed strategic description...]
#### Lever 3: [Name]
[Detailed strategic description...]

### SECTION C: Competitor Friction Points
How do we exploit the weaknesses of ${competitors}? For each friction point, provide the h4 title followed immediately by a detailed, actionable tactical description paragraph.
#### Friction 1: [Name]
[Detailed tactical description...]
#### Friction 2: [Name]
[Detailed tactical description...]
#### Friction 3: [Name]
[Detailed tactical description...]

### SECTION D: Strategy Compass Matrix of Target Company
Generate a strict Markdown table crossing 4 Dimensions with the SWOT analysis. You MUST use exactly these columns: "Dimension", "Strengths", "Weaknesses", "Opportunities", "Threats". 
You MUST use exactly these 4 rows for the Dimension column: "Market", "Customers", "Competitors", "Internal". Fill the intersecting cells with concise, comma-separated keywords or phrases.

Be specific and rigorous. Keep each point extremely concise (1-2 sentences max) so the document is highly scannable, but DO NOT skip any of the sections above.`;

    let generatedText = "";

    // -- MULTI-MODEL ROUTER --
    if (modelId === 'gemini') {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing from environment variables.");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${systemPrompt}\n\nTask: Generate the complete Strategic Analysis document (Sections A, B, C, and D) now based on the provided data.`
        });
        generatedText = response.text;
        
    } else if (modelId === 'groq') {
        if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing from environment variables.");
        const openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
        const response = await openai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Generate the complete Strategic Analysis document (Sections A, B, C, and D) now based on the provided data.' }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });
        generatedText = response.choices[0].message.content;

    } else if (modelId === 'ollama') {
        // Requires Ollama running locally at port 11434 with llama3!
        const openai = new OpenAI({ apiKey: 'ollama-local', baseURL: "http://127.0.0.1:11434/v1" });
        const response = await openai.chat.completions.create({
            model: 'llama3', // Assumes user has `ollama run llama3`
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Generate the complete Strategic Analysis document (Sections A, B, C, and D) now based on the provided data.' }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });
        generatedText = response.choices[0].message.content;
    } else {
        throw new Error("Invalid AI Engine selected.");
    }

    return NextResponse.json({ success: true, data: generatedText });

  } catch (error) {
    let errorMsg = error.message;
    if (errorMsg === 'Connection error.' || (error.code && error.code === 'ECONNREFUSED' && errorMsg.includes('11434'))) {
        errorMsg = "Local AI Engine is unreachable. Make sure you have the Ollama app running on your Mac (or run 'ollama run llama3' in a terminal), or simply switch the dropdown to Gemini/Groq!";
    }
    console.error("Strategy API Error:", errorMsg);
    return NextResponse.json({ success: false, error: "Backend Processing Error: " + errorMsg }, { status: 500 });
  }
}
