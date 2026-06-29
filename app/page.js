"use client";
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as XLSX from 'xlsx';

export default function Home() {
  const [activeTab, setActiveTab] = useState('strategy');
  const [generationState, setGenerationState] = useState('idle'); // idle, generating, completed
  const [aiResponse, setAiResponse] = useState('');
  const [aiError, setAiError] = useState(null);
  const [aiEngine, setAiEngine] = useState('ollama');
  const [parsedLevers, setParsedLevers] = useState([]);
  const [selectedLever, setSelectedLever] = useState('');

  // Strategy Compass States
  const [compExperience, setCompExperience] = useState('');
  const [compUrl, setCompUrl] = useState('');
  const [compMarket, setCompMarket] = useState('');
  const [compCompetitors, setCompCompetitors] = useState('');
  const [compObjective, setCompObjective] = useState('Market Expansion');

  // Persona Engine States
  const [personaExperience, setPersonaExperience] = useState('');
  const [personaTarget, setPersonaTarget] = useState('');
  const [personaCountry, setPersonaCountry] = useState('');
  const [personaDevices, setPersonaDevices] = useState('');
  const [personaCount, setPersonaCount] = useState('3');

  const [personaGenState, setPersonaGenState] = useState('idle');
  const [personaData, setPersonaData] = useState([]);
  const [personaError, setPersonaError] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(null);

  // Scenario Builder States
  const [scenarioGenState, setScenarioGenState] = useState('idle');
  const [scenarioData, setScenarioData] = useState(null);
  const [scenarioError, setScenarioError] = useState(null);
  const [sbExperience, setSbExperience] = useState('');
  const [sbCountry, setSbCountry] = useState('');
  const [sbPainPoints, setSbPainPoints] = useState('');
  const [sbDevices, setSbDevices] = useState('');
  const [sbCompetitors, setSbCompetitors] = useState('');
  const [sbCount, setSbCount] = useState('3');
  const [sbSelectedFiles, setSbSelectedFiles] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);

  // Validation Crucible (Phase 4) States
  const [validationGenState, setValidationGenState] = useState('idle');
  const [validationData, setValidationData] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [valLenses, setValLenses] = useState('Feasibility, Viability, Desirability');
  const [valMetrics, setValMetrics] = useState('');
  const [valProfiles, setValProfiles] = useState('');
  const [valCount, setValCount] = useState('3');
  const [valSelectedFiles, setValSelectedFiles] = useState([]);
  const [winningScenario, setWinningScenario] = useState(null);

  // Executive Summary (Phase 5) States
  const [summaryGenState, setSummaryGenState] = useState('idle');
  const [summaryData, setSummaryData] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [sumAction, setSumAction] = useState('Go');
  const [sumAudience, setSumAudience] = useState('Board of Directors');
  const [sumTone, setSumTone] = useState('Executive, Data-driven');

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [personaSelectedFiles, setPersonaSelectedFiles] = useState([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hello Director. I am your Chief Strategy AI. What would you like to drill down into regarding our current strategy map?" }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (activeTab === 'scenario') {
      if (!sbExperience) setSbExperience(personaExperience || compExperience);
      if (!sbCountry) setSbCountry(personaCountry);
      if (!sbDevices) setSbDevices(personaDevices);
      if (!sbCompetitors) setSbCompetitors(compCompetitors);
    }
  }, [activeTab]);

  const navItems = [
    { id: 'strategy', icon: '🧭', title: 'Strategy Compass', sub: 'Mission & Objectives' },
    { id: 'persona', icon: '👤', title: 'Persona Engine', sub: 'Segment and Target' },
    { id: 'scenario', icon: '🗺️', title: 'Scenario Build', sub: 'What-If Simulations' },
    { id: 'validation', icon: '🧪', title: 'Validate Scenario', sub: 'Predictive Scoring' },
    { id: 'summary', icon: '📊', title: 'Executive Summary', sub: 'Final 1-Pager' },
  ];

  const handleGenerate = async () => {
    setGenerationState('generating');
    setAiError(null);
    
    // Force React to paint the UI state before blocking
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
        const formData = new FormData();
        formData.append('modelId', aiEngine);
        formData.append('url', compUrl);
        formData.append('audience', compMarket);
        formData.append('competitors', compCompetitors);
        formData.append('experience', compExperience);
        formData.append('objective', compObjective);
        
        if (selectedFiles && selectedFiles.length > 0) {
            for (let i = 0; i < selectedFiles.length; i++) {
                formData.append('files', selectedFiles[i]);
            }
        }

        const res = await fetch('/api/generate-strategy', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            setAiResponse(data.data);
            if (data.data) {
                const sectionStart = data.data.indexOf('### SECTION B');
                const sectionEnd = data.data.indexOf('### SECTION C');
                
                if (sectionStart !== -1) {
                    const leverSectionText = data.data.substring(
                        sectionStart, 
                        sectionEnd !== -1 ? sectionEnd : data.data.length
                    );
                    
                    const chunks = leverSectionText.split('#### Lever');
                    const levers = [];
                    for (let i = 1; i < chunks.length; i++) {
                        if (chunks[i].trim().length > 0) {
                            levers.push("Lever " + chunks[i].trim());
                        }
                    }
                    
                    if (levers.length > 0) {
                        setParsedLevers(levers.slice(0, 3));
                    }
                }
            }
            setGenerationState('completed');
        } else {
            setAiError(data.message || data.error);
            setGenerationState('idle');
        }
    } catch (err) {
        setAiError(`Fetch Error: ${err.message || JSON.stringify(err)}`);
        setGenerationState('idle');
    }
  };

  const handleGeneratePersona = async () => {
    setPersonaGenState('generating');
    setPersonaError(null);
    try {
        const formData = new FormData();
        formData.append('modelId', aiEngine);
        formData.append('experience', personaExperience);
        formData.append('target', personaTarget);
        formData.append('country', personaCountry);
        formData.append('devices', personaDevices);
        formData.append('count', personaCount);
        if (selectedLever) {
            formData.append('strategyContext', `CRITICAL STRATEGIC DIRECTION: ${selectedLever}`);
        }

        if (personaSelectedFiles.length > 0) {
            for (let i = 0; i < personaSelectedFiles.length; i++) {
                formData.append('files', personaSelectedFiles[i]);
            }
        }

        const res = await fetch('/api/generate-persona', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            setPersonaData(data.data);
            setPersonaGenState('completed');
        } else {
            setPersonaError(data.error || "Generation failed.");
            setPersonaGenState('idle');
        }
    } catch (err) {
        console.error(err);
        setPersonaError(err.message);
        setPersonaGenState('idle');
    }
  };

  const handleGenerateScenario = async () => {
    if (!selectedPersona) {
        setScenarioError("You must select a Persona in Phase 2 before building a scenario.");
        return;
    }
    setScenarioGenState('generating');
    setScenarioError(null);
    setScenarioData(null);

    try {
        const formData = new FormData();
        formData.append('modelId', aiEngine);
        formData.append('sbExperience', sbExperience);
        formData.append('sbCountry', sbCountry);
        formData.append('sbPainPoints', sbPainPoints);
        formData.append('sbDevices', sbDevices);
        formData.append('sbCompetitors', sbCompetitors);
        formData.append('sbCount', sbCount);
        formData.append('personas', JSON.stringify([selectedPersona]));

        const res = await fetch('/api/generate-scenario', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            setScenarioData(data.data);
            setScenarioGenState('completed');
        } else {
            setScenarioError(data.error || "Generation failed.");
            setScenarioGenState('idle');
        }
    } catch (err) {
        console.error(err);
        setScenarioError(err.message);
        setScenarioGenState('idle');
    }
  };

  const handleValidateScenario = async () => {
    if (selectedScenarios.length === 0) {
        setValidationError("You must select at least one Scenario in Phase 3.");
        return;
    }
    setValidationGenState('generating');
    setValidationError(null);
    setValidationData(null);
    setWinningScenario(null);

    try {
        const formData = new FormData();
        formData.append('modelId', aiEngine);
        formData.append('selectedScenarios', JSON.stringify(selectedScenarios));
        formData.append('valLenses', valLenses);
        formData.append('valMetrics', valMetrics);
        formData.append('valProfiles', valProfiles);
        formData.append('valCount', valCount);

        const res = await fetch('/api/validate-scenario', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            setValidationData(data.data);
            setValidationGenState('completed');
        } else {
            setValidationError(data.error || "Generation failed.");
            setValidationGenState('idle');
        }
    } catch (err) {
        console.error(err);
        setValidationError(err.message);
        setValidationGenState('idle');
    }
  };

  const handleGenerateSummary = async () => {
    if (!winningScenario || !validationData) {
        setSummaryError("You must select a Winning Scenario in Phase 4.");
        return;
    }
    setSummaryGenState('generating');
    setSummaryError(null);
    setSummaryData(null);

    // Extract just the winning scenario's score data and title
    const winningScoreData = validationData.sectionF?.find(s => s.scenarioTitle === winningScenario) || {};
    
    // We pass the winning scenario, its scores, the consensus map (Section E), and the exec rec (Section C)
    const summaryContext = {
        winningScenario,
        scores: winningScoreData.scores,
        interviewerConsensus: validationData.sectionE,
        executiveRecommendation: validationData.sectionC
    };

    try {
        const formData = new FormData();
        formData.append('modelId', aiEngine);
        formData.append('summaryContext', JSON.stringify(summaryContext));
        formData.append('sumAction', sumAction);
        formData.append('sumAudience', sumAudience);
        formData.append('sumTone', sumTone);

        const res = await fetch('/api/generate-summary', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            setSummaryData(data.data);
            setSummaryGenState('completed');
        } else {
            setSummaryError(data.error || "Generation failed.");
            setSummaryGenState('idle');
        }
    } catch (err) {
        console.error(err);
        setSummaryError(err.message);
        setSummaryGenState('idle');
    }
  };

  const getBreadcrumb = () => {
    return navItems.find(item => item.id === activeTab)?.title || 'Platform';
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isChatTyping) return;
    
    const newUserMsg = { role: 'user', content: currentMessage };
    const updatedMessages = [...chatMessages, newUserMsg];
    
    setChatMessages(updatedMessages);
    setCurrentMessage('');
    setIsChatTyping(true);

    try {
        const res = await fetch('/api/chat-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelId: aiEngine,
                messages: updatedMessages,
                context: aiResponse // Hand over current dashboard context
            })
        });
        const data = await res.json();
        
        if (data.success) {
            setChatMessages([...updatedMessages, { role: 'assistant', content: data.data }]);
        } else {
            console.error("Chat API Error:", data.error);
            setChatMessages([...updatedMessages, { role: 'assistant', content: "System Notice: " + data.error }]);
        }
    } catch (err) {
        setChatMessages([...updatedMessages, { role: 'assistant', content: "Connection offline. Please check engine status." }]);
    }
    
    setIsChatTyping(false);
  };

  const handleExportPDF = async () => {
    // Dynamically target either the active Strategy output or Persona output
    let element = document.getElementById('ai-output-container');
    if (!element && activeTab === 'persona') {
        const grid = document.querySelector('.persona-grid');
        if (grid) element = grid.closest('.output-section');
    }
    
    if (!element) {
        alert("There is no completed data to export yet!");
        return;
    }

    try {
        // Toggle PDF styling class to rely on standard CSS rather than html2canvas cloning bugs
        element.classList.add('exporting-pdf');
        
        // 100% Reliable DOM-level Page Break
        // Since floated CSS page-breaks are ignored by html2pdf, we inject its native break element.
        // (This relies on the AI correctly outputting 4 blockquotes, which we enforced in the prompt).
        if (activeTab === 'compass') {
            const blockquotes = Array.from(element.querySelectorAll('blockquote'));
            if (blockquotes.length >= 3) {
                const pb = document.createElement('div');
                pb.className = 'html2pdf__page-break injected-pb';
                pb.style.clear = 'both';
                pb.style.width = '100%';
                blockquotes[2].parentNode.insertBefore(pb, blockquotes[2]);
            }
        }

        // Give the DOM a moment to recalculate layout and repaint
        await new Promise(resolve => setTimeout(resolve, 200));

        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin:       0.3,
          filename:     `${activeTab}_analysis_report.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: 1200
          },
          pagebreak:    { mode: ['css', 'legacy', 'avoid-all'] },
          jsPDF:        { unit: 'in', format: 'tabloid', orientation: 'landscape' }
        };
        
        // Render
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error("PDF Export Crash: ", err);
        alert("The PDF Exporter failed. Please check the browser console.");
    } finally {
        // Revert styling back to dark mode
        element.classList.remove('exporting-pdf');
        
        // Cleanup injected page breaks
        if (activeTab === 'compass' && element) {
            const pbs = element.querySelectorAll('.injected-pb');
            pbs.forEach(pb => pb.parentNode.removeChild(pb));
        }
    }
  };

  const handleExportExcel = () => {
    if (generationState !== 'completed' && personaGenState !== 'completed' && scenarioGenState !== 'completed') {
        alert("There is no completed data to export yet!");
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // 1. Sheet 1: Strategy Compass
        // Helper to parse sections
        const extractSection = (text, startMarker, endMarker) => {
            if (!text) return "";
            const start = text.indexOf(startMarker);
            if (start === -1) return "";
            const end = endMarker ? text.indexOf(endMarker, start) : text.length;
            if (end === -1) return text.substring(start).trim();
            return text.substring(start, end).trim();
        };

        const secA = extractSection(aiResponse, "### SECTION A", "### SECTION B");
        const secB = extractSection(aiResponse, "### SECTION B", "### SECTION C");
        const secC = extractSection(aiResponse, "### SECTION C", "### SECTION D");
        const secD = extractSection(aiResponse, "### SECTION D", null) || "Not Generated"; // Just in case a section D exists

        const strategyData = [
            ["Category", "Field Name", "Value"],
            ["Strategic Input Field", "Target Experience", document.getElementById('target-experience')?.value || ""],
            ["", "Target Company URL", document.getElementById('company-url')?.value || ""],
            ["", "Target Consumer / Demographics", document.getElementById('target-market')?.value || ""],
            ["", "Core Competitors URL", document.getElementById('competitors')?.value || ""],
            ["", "Primary Objective", document.getElementById('objective-focus')?.value || ""],
            ["", "Supporting Documents", selectedFiles.map(f => f.name).join(", ") || "None"],
            ["", "", ""],
            ["Strategic Results", "Section A: Advanced SWOT Analysis", secA],
            ["", "Section B: Actionable Strategic Levers", secB],
            ["", "Section C: Competitor Friction Points", secC],
            ["", "Section D", secD],
            ["", "Selected Strategic Lever (True North)", selectedLever || "None Selected"]
        ];
        const wsStrategy = XLSX.utils.aoa_to_sheet(strategyData);
        wsStrategy['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 100 }];
        XLSX.utils.book_append_sheet(wb, wsStrategy, "Strategy Compass");

        // 2. Sheet 2: Persona Engine
        if (personaData && personaData.length > 0) {
            const personaInputs = [
                ["Category", "Field Name", "Value"],
                ["Persona Input Field", "Experience Area", document.getElementById('persona-experience')?.value || ""],
                ["", "Target Customer", document.getElementById('persona-target')?.value || ""],
                ["", "Target Country", document.getElementById('persona-country')?.value || ""],
                ["", "Key Devices", document.getElementById('persona-devices')?.value || ""],
                ["", "Persona Count", document.getElementById('persona-count')?.value || ""],
                ["", "Supporting Documents", personaSelectedFiles.map(f => f.name).join(", ") || "None"],
                ["", "Fundamental Direction (True North)", selectedLever || "None Selected"],
                ["", "", ""],
                ["Persona Results", "", ""]
            ];

            const personaHeaders = [
                "Name", "Title", "Age", "Location", "Quote", "Income", "Housing", 
                "Household Size", "Segment Size", "Segment Confidence", 
                "Motivation", "Characteristics", "Goals", "Pain Points", 
                "Tech Stack", "Connected Devices"
            ];
            const personaRows = personaData.map(p => [
                p.name, p.title, p.age, p.location, p.quote,
                p.demographics?.income || "", p.demographics?.housing || "",
                p.demographics?.householdSize || "", p.demographics?.segmentSize || "",
                p.demographics?.segmentConfidence || "",
                p.psychographics?.motivation || "",
                p.psychographics?.characteristics || "",
                p.psychographics?.goals || "",
                (p.psychographics?.painPoints || []).join(" | "),
                (p.techAndDevices?.techStack || []).join(" | "),
                (p.techAndDevices?.connectedDevices || []).join(" | ")
            ]);
            
            const personaOutput = [...personaInputs, personaHeaders, ...personaRows];
            personaOutput.push(["", "", ""]);
            personaOutput.push(["Selection for next step", "Select Your target persona", selectedPersona?.name || "None Selected"]);

            const wsPersona = XLSX.utils.aoa_to_sheet(personaOutput);
            wsPersona['!cols'] = Array(16).fill({ wch: 25 });
            XLSX.utils.book_append_sheet(wb, wsPersona, "Persona Engine");
        }

        // 3. Sheet 3: Scenario Builder (Phase 3)
        if (scenarioData && scenarioData.sectionA) {
            const scenarioInputs = [
                ["Category", "Field Name", "Value"],
                ["Scenario Input Field", "Selected Persona (True North)", selectedPersona?.name || ""],
                ["", "Target Experience Area", sbExperience || ""],
                ["", "Target Country", sbCountry || ""],
                ["", "Pain points or needs", sbPainPoints || ""],
                ["", "Key Devices", sbDevices || ""],
                ["", "Core Competitors Service", sbCompetitors || ""],
                ["", "Number of Scenarios", sbCount || ""],
                ["", "", ""],
                ["Scenario Results", "", ""]
            ];

            const scenarioRows = [];
            
            // Section A
            scenarioRows.push(["Section A: Scenario Cards", "", "", "", "", "", ""]);
            scenarioRows.push(["Scenario Title", "Target Customer", "Environmental Context", "Devices Involved", "Situation Description", "Expected Actions", "Projected Outcome"]);
            scenarioData.sectionA.forEach(s => {
                scenarioRows.push([
                    s.scenarioTitle || "", 
                    s.targetCustomer || "", 
                    s.environmentalContext || "", 
                    s.devicesInvolved || "", 
                    s.situationDescription || "", 
                    (s.expectedActions || []).join(" | "), 
                    s.projectedOutcome || ""
                ]);
            });
            scenarioRows.push(["", "", "", "", "", "", ""]);

            // Section B
            scenarioRows.push(["Section B: Cross-Scenario Comparison", "", "", ""]);
            scenarioRows.push(["Comparison Summary", scenarioData.sectionB?.comparisonSummary || "", "", ""]);
            scenarioRows.push(["Key Differences", (scenarioData.sectionB?.keyDifferences || []).join(" | "), "", ""]);
            scenarioRows.push(["", "", "", ""]);

            // Section C
            scenarioRows.push(["Section C: Competitor Friction Points", "", "", ""]);
            scenarioRows.push(["Competitor Name", "Friction Point", "", ""]);
            (scenarioData.sectionC || []).forEach(c => {
                scenarioRows.push([c.competitorName, c.frictionPoint, "", ""]);
            });

            const wsScenario = XLSX.utils.aoa_to_sheet([...scenarioInputs, ...scenarioRows]);
            wsScenario['!cols'] = Array(4).fill({ wch: 35 });
            XLSX.utils.book_append_sheet(wb, wsScenario, "Scenario Builder");
        }

        // 4. Sheet 4: Validate Scenario (Phase 4)
        if (validationData) {
            const validationInputs = [
                ["Category", "Field Name", "Value"],
                ["Validation Input", "Selected Scenarios", selectedScenarios.map(s => s.scenarioTitle).join(', ')],
                ["", "Validation Lenses", valLenses || ""],
                ["", "Success Metrics", valMetrics || ""],
                ["", "Interviewer Profiles", valProfiles || ""],
                ["", "Number of Interviewers", valCount || ""],
                ["", "", ""],
                ["Validation Results", "", ""]
            ];

            const valRows = [];
            
            valRows.push(["Section A: Validation Report", validationData.sectionA || ""]);
            valRows.push(["", ""]);
            
            valRows.push(["Section B: Risk & Assumption Log", ""]);
            (validationData.sectionB || []).forEach(r => valRows.push(["Risk:", r]));
            valRows.push(["", ""]);

            valRows.push(["Section C: Recommendation", validationData.sectionC?.decision || ""]);
            valRows.push(["Reasoning", validationData.sectionC?.reasoning || ""]);
            valRows.push(["", ""]);

            valRows.push(["Section D: Interview Transcripts", "", "", ""]);
            valRows.push(["Interviewer", "Persona", "Stance", "Response"]);
            (validationData.sectionD || []).forEach(t => valRows.push([t.interviewer, t.persona, t.stance, t.response]));
            valRows.push(["", "", "", ""]);

            valRows.push(["Section E: Consensus Map", validationData.sectionE || ""]);
            valRows.push(["", ""]);

            valRows.push(["Section F: Score Matrix", "", "", ""]);
            (validationData.sectionF || []).forEach(scoreObj => {
                valRows.push([`Scenario: ${scoreObj.scenarioTitle}`, "Lens", "Score"]);
                Object.entries(scoreObj.scores || {}).forEach(([lens, score]) => {
                    valRows.push(["", lens, score]);
                });
            });

            const valOutput = [...validationInputs, ...valRows];
            valOutput.push(["", "", ""]);
            valOutput.push(["Selection for next step", "Winning Scenario", winningScenario || "None Selected"]);

            const wsValidation = XLSX.utils.aoa_to_sheet(valOutput);
            wsValidation['!cols'] = Array(4).fill({ wch: 40 });
            XLSX.utils.book_append_sheet(wb, wsValidation, "Validate Scenario");
        }

        // 5. Sheet 5: Executive Summary (Phase 5)
        if (summaryData) {
            const summaryInputs = [
                ["Category", "Field Name", "Value"],
                ["Summary Input", "Winning Scenario", winningScenario || ""],
                ["", "Recommended Action", sumAction || ""],
                ["", "Target Audience", sumAudience || ""],
                ["", "Tone / Style", sumTone || ""],
                ["", "", ""],
                ["Executive 1-Pager", "", ""]
            ];

            const sumRows = [];
            sumRows.push(["Context", summaryData.context || ""]);
            sumRows.push(["", ""]);
            sumRows.push(["Strategic Move", summaryData.move || ""]);
            sumRows.push(["", ""]);
            sumRows.push(["Projected Impact", summaryData.impact || ""]);
            sumRows.push(["", ""]);
            sumRows.push(["Required Resources", ""]);
            (summaryData.resources || []).forEach(r => sumRows.push(["-", r]));
            sumRows.push(["", ""]);
            sumRows.push(["First 90-Day Actions", ""]);
            (summaryData.actions90Days || []).forEach(a => sumRows.push(["-", a]));

            const wsSummary = XLSX.utils.aoa_to_sheet([...summaryInputs, ...sumRows]);
            wsSummary['!cols'] = [{ wch: 25 }, { wch: 80 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");
        }

        XLSX.writeFile(wb, "Strategic_Intelligence_Export.xlsx");

    } catch (err) {
        console.error("Excel Export Crash: ", err);
        alert("The Excel Exporter failed. Please check the browser console.");
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo"></div>
          <h2>Strategic Platform</h2>
        </div>
        
        <ul className="nav-links">
          {navItems.map((item) => (
            <li 
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-text">
                <h3>{item.title}</h3>
                <p>{item.sub}</p>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar"></div>
            <div className="user-info">
              <strong>Victor</strong>
              <span>Lead Strategist</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-bar">
          <div className="breadcrumb">Platform / <span className="highlight">{getBreadcrumb()}</span></div>
          <div className="actions">
            <select 
              className="glass-input" 
              value={aiEngine} 
              onChange={(e) => setAiEngine(e.target.value)}
              style={{ width: 'auto', padding: '10px 16px', background: 'rgba(0,0,0,0.5)', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
            >
              <option value="ollama">🔒 Local Ollama</option>
              <option value="groq">⚡️ Groq Cloud</option>
              <option value="gemini">🧠 Gemini Pro</option>
            </select>
            <button type="button" className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
            <button type="button" className="btn btn-secondary" onClick={handleExportExcel} style={{ marginLeft: '10px' }}>Export Excel</button>
            <button type="button" className="btn btn-primary" id="ai-assist-btn" onClick={() => setIsChatOpen(!isChatOpen)}>
              {isChatOpen ? '✕ Close Assist' : '✨ AI Analyst Assist'}
            </button>
          </div>
        </header>

        <div className="dashboard-area">
          {activeTab === 'strategy' && (
            <section className="module-view">
              <div className="hero-card glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                <div className="lens-flare-star">
                    <div className="lens-flare-diagonal"></div>
                </div>
                <h1 style={{ position: 'relative', zIndex: 1 }}>Define Your True North Star</h1>
                <p style={{ position: 'relative', zIndex: 1 }}>Initialize your strategic framework. Input current company data, and our AI will generate comprehensive SWOT analyses and market positioning.</p>
              </div>
              
              <div className="grid-layout">
                {/* Input Form */}
                <div className="glass-panel input-section">
                  <h3>Strategic Inputs</h3>
                  <div className="form-group">
                    <label htmlFor="target-experience">Target Experience</label>
                    <input type="text" id="target-experience" value={compExperience} onChange={e => setCompExperience(e.target.value)} placeholder="e.g., Pet care, Senior care, Energy saving, Bixby..." className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="company-url">Target Company URL</label>
                    <input type="url" id="company-url" value={compUrl} onChange={e => setCompUrl(e.target.value)} placeholder="e.g., https://example.com" className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label>Supporting Documents (PDF, DOCX, PPTX)</label>
                    <label htmlFor="strategy-docs" className="file-upload-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Select the file to upload
                    </label>
                    <input 
                      type="file" 
                      id="strategy-docs" 
                      multiple 
                      accept=".pdf,.docx,.pptx" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const incomingFiles = Array.from(e.target.files);
                        setSelectedFiles(prev => [...prev, ...incomingFiles]);
                        e.target.value = ''; // Reset input to allow adding the same file later if needed
                      }}
                    />
                    {selectedFiles.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedFiles.map((file, i) => (
                          <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(110, 227, 197, 0.15)', color: 'var(--teal)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(110, 227, 197, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            📄 {file.name}
                            <span 
                                onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} 
                                style={{ cursor: 'pointer', opacity: 0.6, fontSize: '10px' }}
                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                onMouseLeave={(e) => e.target.style.opacity = 0.6}
                                title="Remove File"
                            >
                              ✕
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="target-market">Target Consumer / Demographics</label>
                    <input type="text" id="target-market" value={compMarket} onChange={e => setCompMarket(e.target.value)} placeholder="e.g., Newlyweds, Gen-z, Millennial, Active senior..." className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="competitors">Core Competitors URL</label>
                    <input type="text" id="competitors" value={compCompetitors} onChange={e => setCompCompetitors(e.target.value)} placeholder="e.g., https://stripe.com, https://paypal.com" className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="objective-focus">Primary Objective</label>
                    <select id="objective-focus" className="glass-input">
                      <option>User Acquisition (number of RU)</option>
                      <option>User Engagement (Increase DAU,WAU,MAU)</option>
                      <option>Retention & Churn Reduction (Keep users returning)</option>
                      <option>Monetization (Increase LTV & subscription revenue)</option>
                      <option>Feature Expansion (Branding or Differentiation)</option>
                    </select>
                  </div>
                  
                  <button type="button" 
                    className="btn btn-primary full-width mt-1" 
                    onClick={handleGenerate}
                    disabled={generationState === 'generating'}
                    style={{ opacity: generationState === 'generating' ? 0.7 : 1 }}
                  >
                    {generationState === 'idle' && 'Generate Insights'}
                    {generationState === 'generating' && 'Analyzing Data...'}
                    {generationState === 'completed' && 'Insights Generated ✨'}
                  </button>
                </div>
                
                {/* AI Output Area */}
                <div className="glass-panel output-section">
                  <div className="status-header">
                    <h3>AI SWOT Analysis</h3>
                    {generationState === 'idle' && <span className="badge pending">Awaiting Inputs</span>}
                    {generationState === 'generating' && <span className="badge active">Generating</span>}
                    {generationState === 'completed' && <span className="badge completed">Completed</span>}
                  </div>
                  
                  {generationState === 'idle' && !aiError && (
                    <div className="placeholder-content">
                      <div className="pulse-ring"></div>
                      <p>Ready to Strategic Analyze market data to find the North Star</p>
                    </div>
                  )}

                  {generationState === 'generating' && (
                    <div className="placeholder-content">
                      <div className="pulse-ring"></div>
                      <p>Scanning competitors and processing...</p>
                    </div>
                  )}

                  {generationState === 'completed' && (
                    <div className="placeholder-content no-border" style={{ display: 'block' }}>
                        <div style={{ textAlign: 'left', width: '100%', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <div id="ai-output-container">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown>
                            </div>
                            
                            {parsedLevers.length > 0 && (
                                <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(88,101,242,0.1)', borderRadius: '12px', border: '1px solid var(--accent-blue)' }}>
                                    <h3 style={{ color: 'var(--accent-blue)', marginBottom: '12px' }}>Select Your Strategic Lever</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Select one of the AI-generated levers above to serve as the "True North" direction for synthesizing consumer personas.</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {parsedLevers.map((lever, idx) => (
                                            <button type="button" 
                                                key={idx} 
                                                onClick={() => setSelectedLever(lever)}
                                                style={{ 
                                                    padding: '16px', 
                                                    borderRadius: '8px', 
                                                    border: selectedLever === lever ? '2px solid #6ee3c5' : '1px solid rgba(255,255,255,0.1)', 
                                                    background: selectedLever === lever ? 'rgba(110,227,197,0.1)' : 'rgba(0,0,0,0.2)',
                                                    color: 'var(--text-main)',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    lineHeight: '1.5',
                                                    fontSize: '1.05rem'
                                                }}
                                            >
                                                <strong>Lever {idx + 1}:</strong> {lever}
                                            </button>
                                        ))}
                                    </div>
                                    <button type="button" 
                                      className="btn btn-secondary mt-1" 
                                      style={{ fontSize: '0.9rem', marginTop: '24px', width: '100%', opacity: selectedLever ? 1 : 0.5, pointerEvents: selectedLever ? 'auto' : 'none' }}
                                      onClick={() => setActiveTab('persona')}
                                    >
                                      Inject Selected Lever into Persona Engine →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {aiError && (
                      <div style={{ border: '1px solid #ff4757', background: 'rgba(255,71,87,0.1)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                          <p style={{ color: '#ff4757', margin: 0 }}><strong>Error:</strong> {aiError}</p>
                      </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'persona' && (
            <section className="module-view">
              <div className="hero-card glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                <img 
                    src="/3d-dart.png" 
                    alt="3D Glass Dart Target" 
                    style={{ 
                        position: 'absolute', 
                        top: '-30px', 
                        right: '-20px', 
                        width: '240px', 
                        height: '240px', 
                        objectFit: 'cover', 
                        opacity: 0.85, 
                        pointerEvents: 'none',
                        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)', 
                        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)'
                    }} 
                />
                <h1 style={{ position: 'relative', zIndex: 1 }}>Target Persona Engine</h1>
                <p style={{ position: 'relative', zIndex: 1 }}>Generate highly realistic persona cards based on an input data and specific market segmentation.</p>
              </div>

              <div className="grid-layout">
                {/* Input Form */}
                <div className="glass-panel input-section">
                  <h3>Persona Parameters</h3>
                  <div className="form-group">
                    <label htmlFor="persona-experience">Experience Area</label>
                    <input type="text" id="persona-experience" value={personaExperience} onChange={e => setPersonaExperience(e.target.value)} placeholder="e.g., Pet care, Senior care, Energy saving..." className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="persona-target">Target Customer (Age, Household, etc.)</label>
                    <input type="text" id="persona-target" value={personaTarget} onChange={e => setPersonaTarget(e.target.value)} placeholder="e.g., Millennial, Newlyweds, Active senior..." className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label>Supporting Persona Documents (PDF, DOCX, PPTX)</label>
                    <label htmlFor="persona-docs" className="file-upload-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Select the file to upload
                    </label>
                    <input 
                      type="file" 
                      id="persona-docs" 
                      multiple 
                      accept=".pdf,.docx,.pptx" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const incomingFiles = Array.from(e.target.files);
                        setPersonaSelectedFiles(prev => [...prev, ...incomingFiles]);
                        e.target.value = ''; // Reset input to allow adding the same file later if needed
                      }}
                    />
                    {personaSelectedFiles.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {personaSelectedFiles.map((file, i) => (
                          <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(110, 227, 197, 0.15)', color: 'var(--teal)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(110, 227, 197, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            📄 {file.name}
                            <span 
                                onClick={() => setPersonaSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} 
                                style={{ cursor: 'pointer', opacity: 0.6, fontSize: '10px' }}
                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                onMouseLeave={(e) => e.target.style.opacity = 0.6}
                                title="Remove File"
                            >
                              ✕
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="persona-country">Target Country</label>
                    <input type="text" id="persona-country" value={personaCountry} onChange={e => setPersonaCountry(e.target.value)} placeholder="e.g., USA, UK, Japan, Global..." className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="persona-devices">Key Devices</label>
                    <input type="text" id="persona-devices" value={personaDevices} onChange={e => setPersonaDevices(e.target.value)} placeholder="e.g., iPhone 15, Samsung TV, Desktop..." className="glass-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="persona-count">Persona Count</label>
                    <select id="persona-count" className="glass-input" defaultValue="3">
                      <option value="2">2 Personas</option>
                      <option value="3">3 Personas</option>
                      <option value="4">4 Personas</option>
                    </select>
                  </div>

                  {selectedLever && (
                    <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', background: 'rgba(110, 227, 197, 0.1)', borderRadius: '8px', border: '1px dashed #6ee3c5' }}>
                        <h4 style={{ color: '#6ee3c5', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Fundamental Direction</h4>
                        <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.4' }}>{selectedLever}</p>
                    </div>
                  )}
                  
                  <button type="button" 
                    className="btn btn-primary full-width mt-1" 
                    onClick={handleGeneratePersona}
                    disabled={personaGenState === 'generating'}
                    style={{ opacity: personaGenState === 'generating' ? 0.7 : 1 }}
                  >
                    {personaGenState === 'idle' && 'Synthesize Personas'}
                    {personaGenState === 'generating' && 'Computing Personas...'}
                    {personaGenState === 'completed' && 'Regenerate Personas'}
                  </button>

                  {personaError && (
                      <div style={{ border: '1px solid #ff4757', background: 'rgba(255,71,87,0.1)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                          <p style={{ color: '#ff4757', margin: 0 }}><strong>Error:</strong> {personaError}</p>
                      </div>
                  )}
                </div>

                {/* Outputs */}
                <div className="glass-panel output-section">
                  <div className="status-header">
                    <h3>Synthetic Profiles</h3>
                    {personaGenState === 'idle' && <span className="badge pending">Awaiting Inputs</span>}
                    {personaGenState === 'generating' && <span className="badge active">Generating</span>}
                    {personaGenState === 'completed' && <span className="badge completed">Completed</span>}
                  </div>
                  
                  {personaGenState === 'idle' && !personaError && (
                    <div className="placeholder-content">
                      <div className="pulse-ring"></div>
                      <p>Ready to synthesize demographic markers...</p>
                    </div>
                  )}

                  {personaGenState === 'generating' && (
                    <div className="placeholder-content">
                      <div className="pulse-ring"></div>
                      <p>Computing Personas...</p>
                    </div>
                  )}
                  
                  {personaData.length > 0 && personaGenState !== 'generating' && (
                      <div className="persona-grid wide-grid" style={{ padding: '0 10px', marginTop: '20px' }}>
                          {personaData.map((persona, index) => (
                              <div 
                                key={index} 
                                className={`persona-card wide-card ${selectedPersona?.name === persona.name ? 'selected-persona' : ''}`}
                                onClick={() => setSelectedPersona(persona)}
                                style={{
                                    cursor: 'pointer',
                                    border: selectedPersona?.name === persona.name ? '2px solid #6ee3c5' : '1px solid var(--glass-border)',
                                    boxShadow: selectedPersona?.name === persona.name ? '0 0 20px rgba(110, 227, 197, 0.4)' : 'none',
                                    transform: selectedPersona?.name === persona.name ? 'scale(1.02)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                              >
                                  <div className="persona-profile-col">
                                      <div className="persona-header" style={{ position: 'relative' }}>
                                          {selectedPersona?.name === persona.name && (
                                              <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#6ee3c5', color: '#000', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 10 }}>
                                                  ✅ Selected for UX Mapping
                                              </div>
                                          )}
                                          <img 
                                            src={`https://api.dicebear.com/7.x/avataaars/png?size=200&seed=${persona.name.replace(/\s+/g, '') + index}`} 
                                            alt="avatar" 
                                            className="persona-avatar" 
                                            crossOrigin="anonymous"
                                          />
                                          <div className="persona-info">
                                              <h4>{persona.name}</h4>
                                              <p>{persona.age} yrs • {persona.location}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="persona-badge-title">{persona.title}</div>
                                      <div className="persona-quote">&quot;{persona.quote}&quot;</div>
                                  </div>

                                  <div className="persona-data-col">
                                      <div className="persona-section-title">Psychographics</div>
                                      <ul className="persona-list detailed-list">
                                          <li><strong>Motivation:</strong> {persona.psychographics?.motivation || "Undisclosed"}</li>
                                          <li><strong>Characteristics:</strong> {persona.psychographics?.characteristics || "N/A"}</li>
                                          <li><strong>Goals:</strong> {persona.psychographics?.goals || "N/A"}</li>
                                      </ul>

                                      <div className="grid-2-col mt-2">
                                          <div>
                                              <div className="persona-section-title">Critical Pain Points</div>
                                              <ul className="persona-list">
                                                  {persona.psychographics?.painPoints?.map((pain, i) => <li key={i}>{pain}</li>)}
                                              </ul>
                                          </div>
                                          <div>
                                              <div className="persona-section-title">Tech & Devices</div>
                                              <div className="tag-cloud">
                                                {persona.techAndDevices?.techStack?.map((t, i) => <span key={`ts-${i}`} className="tech-tag">{t}</span>)}
                                                {persona.techAndDevices?.connectedDevices?.map((c, i) => <span key={`cd-${i}`} className="device-tag">{c}</span>)}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  {/* Full Bottom Row Demographics Dashboard */}
                                  <div className="persona-demographics-col" style={{ gridColumn: '1 / -1', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                                      <div className="persona-section-title" style={{ display: 'flex', alignItems: 'center' }}>
                                          Demographics Bounding Matrix
                                          {persona.isCensusVerified && (
                                              <span className="tooltip-container" style={{ fontSize: '10px', color: '#6ee3c5', marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(110, 227, 197, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                                  {persona.verificationSource === 'korea' ? "Real Data from KOSIS Govt" : persona.verificationSource === 'uk' ? "Real Data from UK ONS Govt" : "Real Data from US Census Govt"}
                                                  <span className="tooltip-text" style={{ bottom: '150%', marginLeft: '-85px' }}>
                                                      {persona.verificationSource === 'korea' 
                                                          ? "Real, verified data pulled from Statistics Korea (KOSIS) or World Bank." 
                                                          : persona.verificationSource === 'uk' 
                                                          ? "Real, verified data pulled from UK Office for National Statistics or World Bank."
                                                          : "Real, verified baseline sourced directly from live US Census Bureau API."}
                                                  </span>
                                              </span>
                                          )}
                                      </div>
                                      <div className="persona-housing-banner">
                                          <span className="housing-icon">🏠</span>
                                          <span className="housing-text"><strong>Housing:</strong> {persona.demographics?.housing || "N/A"}</span>
                                      </div>
                                      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                                          <div className="metric-box">
                                              <span className="metric-header">Income</span>
                                              {persona.demographics?.income || "N/A"}
                                          </div>
                                          <div className="metric-box">
                                              <span className="metric-header">Segment Size</span>
                                              {persona.demographics?.segmentSize || "N/A"}
                                          </div>
                                          <div className="metric-box">
                                              <span className="metric-header">Confidence</span>
                                              {persona.demographics?.segmentConfidence || "N/A"}
                                          </div>
                                          <div className="metric-box">
                                              <span className="metric-header">Living Cost</span>
                                              {persona.demographics?.baselineLivingCost || "N/A"}
                                          </div>
                                          <div className="metric-box">
                                              <span className="metric-header">Energy Cost</span>
                                              {persona.demographics?.baselineEnergyCost || "N/A"}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  {personaData.length > 0 && personaGenState !== 'generating' && (
                      <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(88,101,242,0.1)', borderRadius: '12px', border: '1px solid var(--accent-blue)' }}>
                          <h3 style={{ color: 'var(--accent-blue)', marginBottom: '12px' }}>Select Your Target Persona</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Select one of the generated Personas above to serve as the target for the UX Journey Mapper.</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {personaData.map((persona, idx) => (
                                  <button type="button" 
                                      key={idx} 
                                      onClick={() => setSelectedPersona(persona)}
                                      style={{ 
                                          padding: '16px', 
                                          borderRadius: '8px', 
                                          border: selectedPersona?.name === persona.name ? '2px solid #6ee3c5' : '1px solid rgba(255,255,255,0.1)', 
                                          background: selectedPersona?.name === persona.name ? 'rgba(110,227,197,0.1)' : 'rgba(0,0,0,0.2)',
                                          color: 'var(--text-main)',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                          lineHeight: '1.5',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '15px'
                                      }}
                                  >
                                      <img 
                                        src={`https://api.dicebear.com/7.x/avataaars/png?size=50&seed=${persona.name.replace(/\s+/g, '') + idx}`} 
                                        alt="avatar" 
                                        style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}
                                        crossOrigin="anonymous"
                                      />
                                      <div>
                                          <strong style={{ display: 'block', fontSize: '1.1rem' }}>{persona.name}</strong>
                                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{persona.title} • {persona.age} yrs</span>
                                      </div>
                                      {selectedPersona?.name === persona.name && (
                                          <span style={{ marginLeft: 'auto', background: '#6ee3c5', color: '#000', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                              ✅ Selected for UX Mapping
                                          </span>
                                      )}
                                  </button>
                              ))}
                          </div>
                          <button type="button" 
                            className="btn btn-secondary mt-1" 
                            style={{ fontSize: '0.9rem', marginTop: '24px', width: '100%', opacity: selectedPersona ? 1 : 0.5, pointerEvents: selectedPersona ? 'auto' : 'none' }}
                            onClick={() => setActiveTab('scenario')}
                          >
                            Inject Selected Persona into Scenario Build →
                          </button>
                      </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'scenario' && (
            <section className="module-view">
              <div className="status-header">
                  <div className="status-indicator">
                      <div className={`pulse-dot ${scenarioGenState === 'generating' ? 'active' : ''}`}></div>
                      <span>{scenarioGenState === 'idle' ? 'Awaiting Parameters' : scenarioGenState === 'generating' ? 'Mapping User Journeys...' : 'Journey Mapping Complete'}</span>
                  </div>
              </div>

              <div className="scenario-dashboard" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginTop: '20px' }}>
                <div className="glass-panel" style={{ padding: '30px' }}>
                  <h3 style={{ color: 'var(--accent-blue)', marginBottom: '20px' }}>UX Journey Mapper</h3>
                  
                  {!selectedPersona && (
                      <div style={{ padding: '16px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px', border: '1px dashed #ff4444', marginBottom: '20px' }}>
                          <p style={{ color: '#ff4444', fontSize: '0.9rem', margin: 0 }}>⚠️ No Persona selected. You must click a Persona card in Phase 2 first.</p>
                      </div>
                  )}

                  <div className="form-group">
                    <label>Target Experience Area</label>
                    <input type="text" className="glass-input" value={sbExperience} onChange={e => setSbExperience(e.target.value)} />
                  </div>
                  
                  <div className="form-group">
                    <label>Target Country</label>
                    <input type="text" className="glass-input" value={sbCountry} onChange={e => setSbCountry(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Pain points or needs</label>
                    <textarea className="glass-input" rows="2" value={sbPainPoints} onChange={e => setSbPainPoints(e.target.value)}></textarea>
                  </div>

                  <div className="form-group">
                    <label>Key Devices</label>
                    <input type="text" className="glass-input" value={sbDevices} onChange={e => setSbDevices(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Core Competitors Service</label>
                    <input type="text" className="glass-input" value={sbCompetitors} onChange={e => setSbCompetitors(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Number of Scenarios</label>
                    <select className="glass-input" value={sbCount} onChange={e => setSbCount(e.target.value)}>
                        <option value="1">1 Scenario</option>
                        <option value="2">2 Scenarios</option>
                        <option value="3">3 Scenarios</option>
                        <option value="4">4 Scenarios</option>
                    </select>
                  </div>

                  {scenarioError && <div className="error-box mt-1">{scenarioError}</div>}

                  {selectedPersona && (
                    <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', background: 'rgba(110, 227, 197, 0.1)', borderRadius: '8px', border: '1px dashed #6ee3c5' }}>
                        <h4 style={{ color: '#6ee3c5', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>Targetted Persona</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img 
                              src={`https://api.dicebear.com/7.x/avataaars/png?size=50&seed=${selectedPersona.name.replace(/\s+/g, '')}`} 
                              alt="avatar" 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}
                              crossOrigin="anonymous"
                            />
                            <div>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>{selectedPersona.name}</strong>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{selectedPersona.title}</span>
                            </div>
                        </div>
                    </div>
                  )}

                  <button type="button" 
                    className="btn btn-primary full-width mt-1" 
                    onClick={handleGenerateScenario}
                    disabled={scenarioGenState === 'generating' || !selectedPersona}
                    style={{ opacity: (scenarioGenState === 'generating' || !selectedPersona) ? 0.7 : 1 }}
                  >
                    {scenarioGenState === 'idle' && 'Generate Scenarios'}
                    {scenarioGenState === 'generating' && 'Simulating Scenarios...'}
                    {scenarioGenState === 'completed' && 'Regenerate Scenarios'}
                  </button>
                </div>

                <div className="scenario-telemetry">
                  {scenarioGenState === 'idle' && !scenarioData && (
                      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6, minHeight: '400px' }}>
                          <p>Ready to build scenarios. The Strategic Engine is offline.</p>
                      </div>
                  )}

                  {scenarioGenState === 'generating' && (
                      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
                          <div className="spinner" style={{ borderTopColor: '#6ee3c5', borderLeftColor: '#6ee3c5', marginBottom: '20px' }}></div>
                          <p style={{ color: '#6ee3c5' }}>Generating Scenario Builder Matrix...</p>
                      </div>
                  )}

                  {scenarioGenState === 'completed' && scenarioData && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                          {/* Section A: Scenario Cards */}
                          <div className="glass-panel" style={{ padding: '24px' }}>
                              <h3 style={{ color: 'var(--accent-blue)', marginBottom: '20px', borderBottom: '1px solid rgba(88,101,242,0.3)', paddingBottom: '10px' }}>Section A: Scenario Cards</h3>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                  {scenarioData.sectionA?.map((scenario, idx) => {
                                      const isSelected = selectedScenarios.some(s => s.scenarioTitle === scenario.scenarioTitle);
                                      return (
                                      <div 
                                          key={idx} 
                                          onClick={() => {
                                              setSelectedScenarios(prev => {
                                                  if (prev.some(s => s.scenarioTitle === scenario.scenarioTitle)) {
                                                      return prev.filter(s => s.scenarioTitle !== scenario.scenarioTitle);
                                                  } else {
                                                      return [...prev, scenario];
                                                  }
                                              });
                                          }}
                                          style={{ 
                                              background: isSelected ? 'rgba(110,227,197,0.1)' : 'rgba(0,0,0,0.2)', 
                                              padding: '20px', 
                                              borderRadius: '12px', 
                                              border: isSelected ? '2px solid #6ee3c5' : '1px solid rgba(255,255,255,0.05)',
                                              cursor: 'pointer',
                                              position: 'relative',
                                              boxShadow: isSelected ? '0 0 20px rgba(110, 227, 197, 0.3)' : 'none',
                                              transform: isSelected ? 'scale(1.02)' : 'none',
                                              transition: 'all 0.3s ease'
                                          }}
                                      >
                                          {isSelected && (
                                              <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#6ee3c5', color: '#000', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 10 }}>
                                                  ✅ Selected
                                              </div>
                                          )}
                                          <h4 style={{ color: '#6ee3c5', marginBottom: '10px', fontSize: '1.2rem' }}>{scenario.scenarioTitle}</h4>
                                          <div style={{ marginBottom: '15px' }}>
                                              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong style={{color: '#a0aec0'}}>Target:</strong> {scenario.targetCustomer}</p>
                                              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong style={{color: '#a0aec0'}}>Context:</strong> {scenario.environmentalContext}</p>
                                              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong style={{color: '#a0aec0'}}>Devices:</strong> {scenario.devicesInvolved}</p>
                                          </div>
                                          
                                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                                              <strong style={{ display: 'block', color: '#ffd93d', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>Situation</strong>
                                              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>{scenario.situationDescription}</p>
                                          </div>

                                          <div style={{ marginBottom: '15px' }}>
                                              <strong style={{ display: 'block', color: 'var(--accent-blue)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>Expected Actions</strong>
                                              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                                                  {scenario.expectedActions?.map((action, i) => (
                                                      <li key={i}>{action}</li>
                                                  ))}
                                              </ul>
                                          </div>

                                          <div style={{ background: 'rgba(110,227,197,0.1)', borderLeft: '3px solid #6ee3c5', padding: '10px 15px', borderRadius: '4px' }}>
                                              <strong style={{ display: 'block', color: '#6ee3c5', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Projected Outcome</strong>
                                              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{scenario.projectedOutcome}</span>
                                          </div>
                                      </div>
                                  )})}
                              </div>
                          </div>

                          {/* Section B: Cross-Scenario Comparison */}
                          {scenarioData.sectionB && (
                              <div className="glass-panel" style={{ padding: '24px' }}>
                                  <h3 style={{ color: 'var(--accent-blue)', marginBottom: '20px', borderBottom: '1px solid rgba(88,101,242,0.3)', paddingBottom: '10px' }}>Section B: Cross-Scenario Comparison</h3>
                                  <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>{scenarioData.sectionB.comparisonSummary}</p>
                                  <h4 style={{ color: '#6ee3c5', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '10px' }}>Key Differences</h4>
                                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                                      {scenarioData.sectionB.keyDifferences?.map((diff, idx) => (
                                          <li key={idx} style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{diff}</li>
                                      ))}
                                  </ul>
                              </div>
                          )}

                          {/* Section C: Competitor Friction Points */}
                          {scenarioData.sectionC && (
                              <div className="glass-panel" style={{ padding: '24px' }}>
                                  <h3 style={{ color: 'var(--accent-blue)', marginBottom: '20px', borderBottom: '1px solid rgba(88,101,242,0.3)', paddingBottom: '10px' }}>Section C: Competitor Friction Points</h3>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                      {scenarioData.sectionC.map((comp, idx) => (
                                          <div key={idx} style={{ display: 'flex', gap: '15px', background: 'rgba(255,68,68,0.05)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #ff4444' }}>
                                              <div style={{ minWidth: '150px', fontWeight: 'bold', color: '#ff4444' }}>{comp.competitorName}</div>
                                              <div style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{comp.frictionPoint}</div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                          {scenarioData.sectionA && (
                              <div style={{ marginTop: '30px', textAlign: 'center', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Select at least one scenario above to proceed to validation.</p>
                                  <button type="button" 
                                      className="btn btn-primary" 
                                      style={{ fontSize: '1rem', padding: '12px 30px', opacity: selectedScenarios.length > 0 ? 1 : 0.5, pointerEvents: selectedScenarios.length > 0 ? 'auto' : 'none' }}
                                      onClick={() => setActiveTab('validation')}
                                  >
                                      Inject Selected Scenarios into Validate Scenario →
                                  </button>
                              </div>
                          )}
                      </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'validation' && (
            <section className="module-view">
              <div className="module-layout">
                <div className="input-panel">
                  <div className="glass-panel">
                      <h2>Phase 4: Validate Scenario</h2>
                      <p className="subtitle">Stress test your scenarios using virtual interviewers.</p>

                      {selectedScenarios.length > 0 ? (
                        <div style={{ padding: '12px', background: 'rgba(110, 227, 197, 0.1)', borderRadius: '8px', border: '1px dashed #6ee3c5', marginBottom: '20px' }}>
                            <span style={{ color: '#6ee3c5', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Inherited from Phase 3</span>
                            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{selectedScenarios.length} Scenarios Selected</span>
                        </div>
                      ) : (
                        <div style={{ padding: '12px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px', border: '1px dashed #ff4444', marginBottom: '20px' }}>
                            <span style={{ color: '#ff4444', fontSize: '0.9rem' }}>No scenarios selected! Please go back to Phase 3.</span>
                        </div>
                      )}

                      <div className="form-group">
                        <label>Validation Lenses</label>
                        <input type="text" className="glass-input" value={valLenses} onChange={e => setValLenses(e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label>Success Metrics & Thresholds</label>
                        <textarea className="glass-input" rows="2" value={valMetrics} onChange={e => setValMetrics(e.target.value)} placeholder="e.g. 20% conversion rate minimum"></textarea>
                      </div>

                      <div className="form-group">
                        <label>Virtual Interviewer Profiles</label>
                        <input type="text" className="glass-input" value={valProfiles} onChange={e => setValProfiles(e.target.value)} placeholder="e.g. A skeptic engineer, A thrifty student" />
                      </div>

                      <div className="form-group">
                        <label>Number of Interviewers</label>
                        <select className="glass-input" value={valCount} onChange={e => setValCount(e.target.value)}>
                            <option value="1">1 Interviewer</option>
                            <option value="2">2 Interviewers</option>
                            <option value="3">3 Interviewers</option>
                            <option value="5">5 Interviewers</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Interview Question Template (Optional)</label>
                        <div className="file-drop-area glass-input">
                            <span className="file-icon">📄</span>
                            <span className="file-msg">{valSelectedFiles.length > 0 ? `${valSelectedFiles.length} file(s) selected` : 'Upload interview templates'}</span>
                            <input 
                              type="file" 
                              className="file-input" 
                              multiple 
                              onChange={(e) => {
                                const incomingFiles = Array.from(e.target.files);
                                setValSelectedFiles(prev => [...prev, ...incomingFiles]);
                                e.target.value = '';
                              }}
                            />
                        </div>
                        {valSelectedFiles.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {valSelectedFiles.map((file, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(110, 227, 197, 0.15)', color: 'var(--teal)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(110, 227, 197, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                📄 {file.name}
                                <span 
                                    onClick={() => setValSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} 
                                    style={{ cursor: 'pointer', opacity: 0.6, fontSize: '10px' }}
                                    onMouseEnter={(e) => e.target.style.opacity = 1}
                                    onMouseLeave={(e) => e.target.style.opacity = 0.6}
                                    title="Remove File"
                                >
                                  ✕
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {validationError && <div className="error-box mt-1">{validationError}</div>}

                      <button type="button" 
                        className="btn btn-primary full-width mt-1" 
                        onClick={handleValidateScenario}
                        disabled={validationGenState === 'generating' || selectedScenarios.length === 0}
                      >
                        {validationGenState === 'generating' ? 'Simulating Interviews...' : 'Run Validation Crucible'}
                      </button>
                  </div>
                </div>

                <div className="scenario-telemetry">
                  {validationGenState === 'idle' && !validationData && (
                      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6, minHeight: '400px' }}>
                          <p>Ready to validate. Awaiting simulation trigger.</p>
                      </div>
                  )}

                  {validationGenState === 'generating' && (
                      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
                          <div className="spinner" style={{ borderTopColor: '#ff9a9e', borderLeftColor: '#ff9a9e', marginBottom: '20px' }}></div>
                          <p style={{ color: '#ff9a9e' }}>Conducting deep Virtual Interviews and scoring metrics...</p>
                      </div>
                  )}

                  {validationGenState === 'completed' && validationData && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                          {/* Section A: Validation Report */}
                          <div className="glass-panel" style={{ padding: '24px' }}>
                              <h3 style={{ color: '#ff9a9e', marginBottom: '20px', borderBottom: '1px solid rgba(255,154,158,0.3)', paddingBottom: '10px' }}>Section A: Validation Report</h3>
                              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>{validationData.sectionA}</p>
                          </div>

                          {/* Section B: Risk & Assumption Log */}
                          <div className="glass-panel" style={{ padding: '24px' }}>
                              <h3 style={{ color: '#ff9a9e', marginBottom: '20px', borderBottom: '1px solid rgba(255,154,158,0.3)', paddingBottom: '10px' }}>Section B: Risk & Assumption Log</h3>
                              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                                  {validationData.sectionB?.map((risk, idx) => (
                                      <li key={idx} style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{risk}</li>
                                  ))}
                              </ul>
                          </div>

                          {/* Section C: Recommendation */}
                          <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255,154,158,0.05)', border: '1px solid #ff9a9e' }}>
                              <h3 style={{ color: '#ff9a9e', marginBottom: '10px' }}>Section C: Executive Recommendation</h3>
                              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '10px' }}>{validationData.sectionC?.decision}</div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{validationData.sectionC?.reasoning}</p>
                          </div>

                          {/* Section D: Transcripts */}
                          <div className="glass-panel" style={{ padding: '24px' }}>
                              <h3 style={{ color: '#ff9a9e', marginBottom: '20px', borderBottom: '1px solid rgba(255,154,158,0.3)', paddingBottom: '10px' }}>Section D: Virtual Interview Transcripts</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                  {validationData.sectionD?.map((transcript, idx) => (
                                      <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                                          <strong style={{ color: '#ffd93d', display: 'block', marginBottom: '10px' }}>{transcript.interviewer} ({transcript.persona})</strong>
                                          <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '10px' }}>" {transcript.response} "</p>
                                          <span style={{ color: '#6ee3c5', fontSize: '0.8rem', fontWeight: 'bold' }}>Stance: {transcript.stance}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* Section E: Consensus Map */}
                          <div className="glass-panel" style={{ padding: '24px' }}>
                              <h3 style={{ color: '#ff9a9e', marginBottom: '20px', borderBottom: '1px solid rgba(255,154,158,0.3)', paddingBottom: '10px' }}>Section E: Interviewer Consensus Map</h3>
                              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>{validationData.sectionE}</p>
                          </div>

                          {/* Section F: Score Matrix & Selection */}
                          <div className="glass-panel" style={{ padding: '24px' }}>
                              <h3 style={{ color: '#ff9a9e', marginBottom: '20px', borderBottom: '1px solid rgba(255,154,158,0.3)', paddingBottom: '10px' }}>Section F: Select Winning Scenario</h3>
                              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>Click on a scenario below to select it as the winner for the final Executive Summary.</p>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                  {validationData.sectionF?.map((scoreObj, idx) => {
                                      const isWinner = winningScenario === scoreObj.scenarioTitle;
                                      return (
                                      <div 
                                          key={idx} 
                                          onClick={() => setWinningScenario(scoreObj.scenarioTitle)}
                                          style={{ 
                                              background: isWinner ? 'rgba(110,227,197,0.1)' : 'rgba(0,0,0,0.2)', 
                                              padding: '20px', 
                                              borderRadius: '12px', 
                                              border: isWinner ? '2px solid #6ee3c5' : '1px solid rgba(255,255,255,0.05)',
                                              cursor: 'pointer',
                                              position: 'relative'
                                          }}
                                      >
                                          {isWinner && (
                                              <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#6ee3c5', color: '#000', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                  👑 Winner
                                              </div>
                                          )}
                                          <h4 style={{ color: '#6ee3c5', marginBottom: '15px' }}>{scoreObj.scenarioTitle}</h4>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              {Object.entries(scoreObj.scores).map(([lens, score], sIdx) => (
                                                  <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                      <span style={{ color: 'var(--text-muted)' }}>{lens}</span>
                                                      <strong style={{ color: score >= 7 ? '#6ee3c5' : score >= 5 ? '#ffd93d' : '#ff4444' }}>{score}/10</strong>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )})}
                              </div>

                              <div style={{ marginTop: '30px', textAlign: 'center', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                  <button type="button" 
                                      className="btn btn-primary" 
                                      style={{ fontSize: '1rem', padding: '12px 30px', opacity: winningScenario ? 1 : 0.5, pointerEvents: winningScenario ? 'auto' : 'none' }}
                                      onClick={() => setActiveTab('summary')}
                                  >
                                      Inject Winning Scenario into Executive Summary →
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'summary' && (
            <section className="module-view">
              <div className="module-layout">
                <div className="input-panel">
                  <div className="glass-panel">
                      <h2>Phase 5: Executive Summary</h2>
                      <p className="subtitle">Synthesize the winning scenario into a strategic 1-pager.</p>

                      {winningScenario ? (
                        <div style={{ padding: '12px', background: 'rgba(110, 227, 197, 0.1)', borderRadius: '8px', border: '1px dashed #6ee3c5', marginBottom: '20px' }}>
                            <span style={{ color: '#6ee3c5', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Winning Scenario Inherited</span>
                            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}>"{winningScenario}"</span>
                        </div>
                      ) : (
                        <div style={{ padding: '12px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px', border: '1px dashed #ff4444', marginBottom: '20px' }}>
                            <span style={{ color: '#ff4444', fontSize: '0.9rem' }}>No Winning Scenario selected! Please go back to Phase 4.</span>
                        </div>
                      )}

                      <div className="form-group">
                        <label>Recommended Action</label>
                        <select className="glass-input" value={sumAction} onChange={e => setSumAction(e.target.value)}>
                            <option value="Go">Go (Proceed with Implementation)</option>
                            <option value="Pivot">Pivot (Adjust Strategy)</option>
                            <option value="Kill">Kill (Abandon Scenario)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Target Audience</label>
                        <input type="text" className="glass-input" value={sumAudience} onChange={e => setSumAudience(e.target.value)} placeholder="e.g. Board of Directors, VCs" />
                      </div>

                      <div className="form-group">
                        <label>Tone / Communication Style</label>
                        <input type="text" className="glass-input" value={sumTone} onChange={e => setSumTone(e.target.value)} placeholder="e.g. Formal, Data-driven, Visionary" />
                      </div>

                      {summaryError && <div className="error-box mt-1">{summaryError}</div>}

                      <button type="button" 
                        className="btn btn-primary full-width mt-1" 
                        onClick={handleGenerateSummary}
                        disabled={summaryGenState === 'generating' || !winningScenario}
                      >
                        {summaryGenState === 'generating' ? 'Drafting 1-Pager...' : 'Generate Executive Summary'}
                      </button>
                  </div>
                </div>

                <div className="scenario-telemetry">
                  {summaryGenState === 'idle' && !summaryData && (
                      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6, minHeight: '400px' }}>
                          <p>Ready to synthesize. Awaiting final draft trigger.</p>
                      </div>
                  )}

                  {summaryGenState === 'generating' && (
                      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
                          <div className="spinner" style={{ borderTopColor: '#ffd93d', borderLeftColor: '#ffd93d', marginBottom: '20px' }}></div>
                          <p style={{ color: '#ffd93d' }}>Drafting the Executive 1-Pager...</p>
                      </div>
                  )}

                  {summaryGenState === 'completed' && summaryData && (
                      <div className="glass-panel" style={{ padding: '40px', background: 'linear-gradient(145deg, rgba(20,20,20,0.8) 0%, rgba(30,30,30,0.8) 100%)', borderTop: '4px solid #ffd93d' }}>
                          <h1 style={{ color: '#ffd93d', fontSize: '2rem', marginBottom: '30px', textAlign: 'center', letterSpacing: '1px' }}>Executive Summary</h1>
                          
                          <div style={{ marginBottom: '30px' }}>
                              <h3 style={{ color: 'var(--accent-blue)', fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '10px' }}>Context</h3>
                              <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.7' }}>{summaryData.context}</p>
                          </div>

                          <div style={{ marginBottom: '30px' }}>
                              <h3 style={{ color: 'var(--accent-blue)', fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '10px' }}>Strategic Move ({sumAction})</h3>
                              <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.7' }}>{summaryData.move}</p>
                          </div>

                          <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #6ee3c5' }}>
                              <h3 style={{ color: '#6ee3c5', fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '10px' }}>Projected Impact</h3>
                              <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.7' }}>{summaryData.impact}</p>
                          </div>

                          <div style={{ marginBottom: '30px' }}>
                              <h3 style={{ color: 'var(--accent-blue)', fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '10px' }}>Required Resources</h3>
                              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                                  {summaryData.resources?.map((res, idx) => (
                                      <li key={idx} style={{ color: 'var(--text-main)', fontSize: '1rem', marginBottom: '8px' }}>{res}</li>
                                  ))}
                              </ul>
                          </div>

                          <div style={{ background: 'rgba(255,217,61,0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,217,61,0.2)' }}>
                              <h3 style={{ color: '#ffd93d', fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '15px' }}>First 90-Day Actions</h3>
                              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                  {summaryData.actions90Days?.map((act, idx) => (
                                      <li key={idx} style={{ color: 'var(--text-main)', fontSize: '1rem', marginBottom: '10px', paddingLeft: '10px' }}>{act}</li>
                                  ))}
                              </ol>
                          </div>
                      </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Slide-out Chat Sidebar */}
      <aside className={`chat-sidebar ${isChatOpen ? 'open' : ''} glass-panel`}>
        <div className="chat-header">
          <h3>Strategy Copilot</h3>
          <button type="button" className="close-btn" onClick={() => setIsChatOpen(false)}>✕</button>
        </div>
        
        <div className="chat-history">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          ))}
          {isChatTyping && (
            <div className="chat-bubble message-ai typing-indicator">
              <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area">
          <textarea 
            className="glass-input chat-textarea" 
            placeholder="Ask AI to expand on Leverage 1..." 
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
          />
          <button type="button" className="btn btn-primary send-btn" onClick={handleSendMessage} disabled={isChatTyping || !currentMessage.trim()}>
            Send
          </button>
        </div>
      </aside>

    </div>
  );
}
