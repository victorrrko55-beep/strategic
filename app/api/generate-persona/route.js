import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const modelId = formData.get('modelId') || 'ollama';
    const experience = formData.get('experience') || 'Not provided';
    const target = formData.get('target') || 'Not provided';
    const country = formData.get('country') || 'Not provided';
    const devices = formData.get('devices') || 'Not provided';
    const count = formData.get('count') || '3';
    const strategyContext = formData.get('strategyContext') || '';
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
                        pdfText += `\n\n--- Document: ${file.name} [FAILED TO PARSE] ---\n`;
                    }
                }
            }
        }
    }
    
    if (pdfText.length > 20000) {
        pdfText = pdfText.substring(0, 20000) + '... [TRUNCATED]';
    }

    const countryFormatted = country.toLowerCase();
    
    // RAG Flag logic
    let censusContext = "";
    let dataVerificationSource = ""; // 'usa' or 'korea'

    try {
        const fipsMap = {
            "alabama": "01", "alaska": "02", "arizona": "04", "arkansas": "05", "california": "06",
            "colorado": "08", "connecticut": "09", "delaware": "10", "florida": "12", "georgia": "13",
            "hawaii": "15", "idaho": "16", "illinois": "17", "indiana": "18", "iowa": "19",
            "kansas": "20", "kentucky": "21", "louisiana": "22", "maine": "23", "maryland": "24",
            "massachusetts": "25", "michigan": "26", "minnesota": "27", "mississippi": "28", "missouri": "29",
            "montana": "30", "nebraska": "31", "nevada": "32", "new hampshire": "33", "new jersey": "34",
            "new mexico": "35", "new york": "36", "north carolina": "37", "north dakota": "38", "ohio": "39",
            "oklahoma": "40", "oregon": "41", "pennsylvania": "42", "rhode island": "44", "south carolina": "45",
            "south dakota": "46", "tennessee": "47", "texas": "48", "utah": "49", "vermont": "50",
            "virginia": "51", "washington": "53", "west binary": "54", "wisconsin": "55", "wyoming": "56"
        };
        
        let targetFips = null;
        for (const [state, fips] of Object.entries(fipsMap)) {
            if (countryFormatted.includes(state)) {
                targetFips = fips;
                break;
            }
        }

        if (countryFormatted.includes("korea") || countryFormatted.includes("kr") || countryFormatted.includes("seoul")) {
            // [South Korea RAG Pipeline]
            dataVerificationSource = "korea";
            const kosisKey = process.env.KOSIS_API_KEY;
            
            // KOSIS Payload (Requires specific tbl/org IDs which change frequently. We attempt KOSIS first).
            if (kosisKey) {
                try {
                    // Attempt KOSIS fetch (Example Table 101/DT_1B040A3 for population/income proxies)
                    const kosisResponse = await fetch(`https://kosis.kr/openapi/Param/DataBind.do?method=getList&apiKey=${kosisKey}&itmId=T20&format=json&jsonVD=Y&prdSe=Y&newEstPrdCnt=1&orgId=101&tblId=DT_1B040A3`);
                    if (kosisResponse.ok) {
                        const data = await kosisResponse.json();
                        if (data && data.length > 0) {
                            censusContext = `
[EXTERNAL KOSIS RAG INJECTION]
Ground-Truth South Korean Demographic Data (KOSIS):
- Integrate empirical absolute logic based on standard Korean statistical thresholds.
WARNING: Base your Persona demographic numbers around strictly South Korean Won (KRW) and Korean regional paradigms. 
CRITICAL LIMIT: The total population of South Korea is roughly 51.7 Million. Do not estimate a Segment Size larger than mathematically possible within this constraint.
`;                          
                            dataVerificationSource = "korea";
                        }
                    }
                } catch (e) {
                    // Silent catch to trigger World Bank Fallback
                }
            } 
            
            // Graceful Fallback if KOSIS fails or Key is missing
            if (censusContext === "") {
                const wbankObj = await fetch('https://api.worldbank.org/v2/country/KR/indicator/NY.GNP.PCAP.CD?format=json');
                const wbData = await wbankObj.json();
                if (wbData && wbData[1]) {
                    const latestGNI = wbData[1].find(d => d.value !== null)?.value || 35000;
                    censusContext = `
[EXTERNAL WORLD BANK RAG INJECTION - SOUTH KOREA]
Ground-Truth South Korean Demographic Data (Fallback):
- National Gross National Income (GNI) per Capita: $${Math.round(latestGNI)} USD (Translate to KRW internally).
WARNING: Format housing and income estimates strictly to South Korean standards.
CRITICAL LIMIT: The total population of South Korea is roughly 51.7 Million. Do not estimate a Segment Size larger than mathematically possible within this constraint.
`;
                }
            }
            
        } else if (countryFormatted.includes("uk") || countryFormatted.includes("united kingdom") || countryFormatted.includes("england") || countryFormatted.includes("london") || countryFormatted.includes("britain")) {
            // [United Kingdom RAG Pipeline]
            dataVerificationSource = "uk";
            try {
                // Reliable British World Bank / ONS Proxy for GNI per capita
                const response = await fetch('https://api.worldbank.org/v2/country/GB/indicator/NY.GNP.PCAP.CD?format=json');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data[1]) {
                        const latestGNI = data[1].find(d => d.value !== null)?.value || 45000;
                        censusContext = `
[EXTERNAL ONS/WORLD BANK RAG INJECTION - UNITED KINGDOM]
Ground-Truth British Demographic Data:
- National Gross National Income (GNI) per Capita: $${Math.round(latestGNI)} USD (Translate to British Pounds GBP £ internally).
WARNING: Base your Persona demographic numbers around strictly British Pounds (£) and UK regional paradigms.
CRITICAL LIMIT: The total population of the UK is roughly 67 Million. Do not estimate a Segment Size larger than mathematically possible within this constraint.
`;
                    }
                }
            } catch (e) {
                // Fallback silent
            }

        } else if (targetFips || countryFormatted.includes("us") || countryFormatted.includes("usa") || countryFormatted.includes("united states")) {
            // [United States RAG Pipeline]
            const url = targetFips 
                ? `https://api.census.gov/data/2021/acs/acs5/profile?get=NAME,DP03_0062E,DP04_0089E,DP02_0016E&for=state:${targetFips}`
                : `https://api.census.gov/data/2021/acs/acs5/profile?get=NAME,DP03_0062E,DP04_0089E,DP02_0016E&for=us:*`;
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 1) {
                    dataVerificationSource = "usa";
                    const row = data[1]; 
                    censusContext = `
[EXTERNAL CENSUS RAG INJECTION]
Ground-Truth US Demographic Data for ${row[0]}:
- Standard Median Household Income: $${row[1]}
- Standard Median Housing Unit Value: $${row[2]}
- Average Household Size baseline: ${row[3]} persons
WARNING: Do not invent or guess income/housing demographics randomly. Base your Persona numbers loosely around these absolute empirical Census figures for this region!
CRITICAL LIMIT: Calculate the Target Segment Size logically based on your internal knowledge of the exact total population size of ${row[0]}.
`;
                }
            }
        }
    } catch (e) {
        console.error("API RAG retrieval failed:", e);
    }

    const systemPrompt = `You are an elite Consumer Psychology Analyst. 
Experience Area: "${experience}"
Target Customer: "${target}"
Target Country: "${country}"
Key Devices: "${devices}"

Strategic Compass Context (CRITICAL INJECTION):
${strategyContext ? strategyContext : "No strategic context provided."}

Uploaded Reference Data:
${pdfText ? pdfText : "No reference documents provided."}

${censusContext}

Your goal is to synthesize EXACTLY ${count || 3} hyper-realistic synthetic consumer personas representing distinct segments that fit this data. You MUST return an array containing exactly ${count || 3} persona objects.

You must output your response ENTIRELY as a valid JSON object. DO NOT include any markdown formatting wrappers or conversational text!
Use this EXACT JSON schema:
{
  "personas": [
    {
      "name": "Full Name",
      "title": "Role & Descriptor (e.g., Eco-Tech Futurist & Grad Student)",
      "age": 23,
      "location": "City, Country",
      "quote": "A deeply narrative, emotional biography describing their lifestyle and worldview (4-5 sentences)",
      "demographics": {
          "income": "$X",
          "housing": "String",
          "householdSize": "String",
          "segmentSize": "String (e.g. Approx. 4.5M...)",
          "segmentConfidence": "Percentage",
          "baselineLivingCost": "Estimated Monthly $",
          "baselineEnergyCost": "Estimated Monthly $"
      },
      "psychographics": {
          "motivation": "String",
          "characteristics": "Comma separated string",
          "goals": "Comma separated string",
          "painPoints": ["Array of 3 deep pain points"]
      },
      "techAndDevices": {
          "techStack": ["Array of 4 key software platforms/apps"],
          "connectedDevices": ["Array of 5 key hardware devices"]
      }
    }
  ]
}`;

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
            max_tokens: 3000
        });
        generatedText = response.choices[0].message.content;
    } else {
        throw new Error("Invalid AI Engine.");
    }
    
    // Clean up potential markdown wrapper from local models that ignore format
    generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData = JSON.parse(generatedText);
    let personas = Array.isArray(parsedData.personas) ? parsedData.personas : Object.values(parsedData);

    // Strictly enforce requested count
    const requestedCount = parseInt(count, 10);
    if (!isNaN(requestedCount) && personas.length > requestedCount) {
        personas = personas.slice(0, requestedCount);
    }

    // Map the census verified tag to the resulting UI if RAG engine was hit
    if (censusContext !== "") {
        personas = personas.map(p => ({ 
            ...p, 
            isCensusVerified: true,
            verificationSource: dataVerificationSource
        }));
    }

    return NextResponse.json({ success: true, data: personas });

  } catch (error) {
    let errorMsg = error.message;
    if (errorMsg === 'Connection error.' || (error.code && error.code === 'ECONNREFUSED' && errorMsg.includes('11434'))) {
        errorMsg = "Local AI Engine is unreachable. Please boot Ollama.";
    }
    console.error("Persona API Error:", errorMsg);
    return NextResponse.json({ success: false, error: "Backend Processing Error: " + errorMsg }, { status: 500 });
  }
}
