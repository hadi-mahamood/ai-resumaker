/**
 * ResuMake AI - AI Assistant Module
 * 
 * Implements:
 * 1. AI Work Experience Rewriter (ATS optimized with action verbs & quantified metrics)
 * 2. AI Skill Recommender (Domain-specific suggestions)
 * 3. AI Cover Letter Generator (Tailored multi-paragraph template)
 * 
 * Supports both an intelligent offline rule-based generator (instant) and 
 * provides a hook for direct Gemini API integration.
 */

const AIService = {
    // Optional API configuration if user wants to supply their own key
    apiKey: localStorage.getItem('gemini_api_key') || '',
    activeProvider: localStorage.getItem('ai_provider') || 'gemini',
    webgpuModel: localStorage.getItem('webgpu_model') || 'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC',
    webllmEngine: null,
    webllmLoading: false,
    
    // Core database of keywords and templates for high-quality mock/offline generation
    knowledgeBase: {
        skills: {
            "software": ["React.js", "Node.js", "Python", "Docker", "Git/GitHub", "REST APIs", "PostgreSQL", "System Architecture", "Agile Methodologies", "Unit Testing", "AWS", "CI/CD Pipelines", "Problem Solving", "Collaboration"],
            "web": ["HTML5/CSS3", "JavaScript (ES6+)", "TypeScript", "React", "Next.js", "Tailwind CSS", "Vite", "Responsive Design", "Web Performance Optimization", "SEO Best Practices", "Git", "UX/UI Design Principles"],
            "data": ["Python", "SQL", "Pandas & NumPy", "Machine Learning", "Tableau/PowerBI", "R", "Data Visualization", "Statistical Analysis", "Data Warehousing", "Feature Engineering", "Scikit-Learn", "Analytical Thinking"],
            "design": ["Figma", "Adobe Creative Suite", "UI/UX Design", "Wireframing", "Prototyping", "User Research", "Information Architecture", "Design Systems", "HTML/CSS Basics", "Interaction Design", "Creative Thinking", "Communication"],
            "product": ["Product Roadmap", "User Personas", "Agile/Scrum", "Market Research", "Jira/Confluence", "Data Analytics", "A/B Testing", "Stakeholder Management", "Product Lifecycle", "Strategic Planning", "Leadership"],
            "marketing": ["SEO/SEM", "Google Analytics", "Content Strategy", "Copywriting", "Social Media Marketing", "Email Campaigns", "A/B Testing", "Brand Management", "Market Analysis", "CRM Tools (HubSpot)", "Creativity"],
            "generic": ["Project Management", "Team Leadership", "Strategic Planning", "Communication", "Problem Solving", "Time Management", "Critical Thinking", "Adaptability", "Collaboration", "Customer Relations"]
        },
        
        verbs: [
            "Spearheaded", "Engineered", "Optimized", "Architected", "Pioneered", 
            "Accelerated", "Orchestrated", "Revamped", "Synthesized", "Formulated",
            "Cultivated", "Maximize", "Decreased", "Standardized", "Transformed"
        ],
        
        metrics: [
            "boosting application load times by 35%",
            "saving 8 hours of manual deployment work per week",
            "resulting in a 42% reduction in production crash rates",
            "increasing customer conversion rate by 18% in the first quarter",
            "reducing server infrastructure costs by 22%",
            "increasing team productivity by 15% through workflow automation",
            "delivering the project 2 weeks ahead of schedule",
            "improving test coverage from 45% to 88%"
        ],
        
        coverLetters: {
            opening: [
                "I am writing to express my strong interest in the [Role] position at your company. With a solid foundation in [Skill] and hands-on experience building efficient solutions, I am confident in my ability to make an immediate impact on your engineering initiatives.",
                "It is with great enthusiasm that I submit my application for the [Role] opportunity. As a dedicated professional specializing in [Skill], I have consistently driven technical excellence and successfully delivered user-centric solutions throughout my career."
            ],
            body: [
                "In my previous roles, I have focused on designing scalable architectures and writing clean, maintainable code. I have a proven track record of collaborating across cross-functional teams to translate complex business requirements into robust software. For instance, I successfully leveraged [Skill] and related frameworks to build systems that significantly optimized performance and streamlined key workflows.",
                "My technical expertise is complemented by my strong problem-solving skills and commitment to continuous learning. During my recent work, I spearheaded several feature developments, utilizing [Skill] to construct responsive, high-performance interfaces and backend APIs. I am passionate about engineering workflows and thrive in collaborative environments that push the boundaries of technology."
            ],
            closing: [
                "I welcome the opportunity to discuss how my technical skills and background align with your team's needs. Thank you for your time and consideration.",
                "I am excited about the prospect of contributing to your team's mission. I look forward to the possibility of discussing my application further. Thank you for evaluating my candidacy."
            ]
        }
    },

    /**
     * Determines the job category based on a job title string
     */
    detectCategory(title) {
        title = title.toLowerCase();
        if (title.includes("software") || title.includes("developer") || title.includes("engineer") || title.includes("backend") || title.includes("full stack")) {
            if (title.includes("web") || title.includes("frontend")) return "web";
            return "software";
        }
        if (title.includes("data") || title.includes("analyst") || title.includes("science") || title.includes("ml") || title.includes("ai")) return "data";
        if (title.includes("design") || title.includes("ux") || title.includes("ui") || title.includes("product designer")) return "design";
        if (title.includes("product") || title.includes("manager") || title.includes("owner")) return "product";
        if (title.includes("market") || title.includes("growth") || title.includes("seo")) return "marketing";
        return "generic";
    },

    /**
     * AI Work Experience Rewriter
     */
    async rewriteExperience(text, jobTitle) {
        const prompt = `Rewrite this job description for a "${jobTitle}" role using strong action verbs, quantify achievements where possible, and optimize it for ATS systems. Output ONLY the rewritten paragraphs as bullet points:\n\n${text}`;
        
        if (this.activeProvider === "webgpu") {
            return await this.callWebGPULLM(prompt);
        }
        if (this.apiKey) {
            return await this.callGeminiAPI(prompt);
        }
        
        // Offline / Mock engine
        return new Promise((resolve) => {
            setTimeout(() => {
                if (!text || text.trim().length < 10) {
                    resolve("- Spearheaded development of core product features, improving system performance and usability.\n- Collaborated with cross-functional teams to design and deploy scalable architectures.\n- Optimized data pipelines and code structures, reducing average load times by 25%.");
                    return;
                }

                let lines = text.split(/[.\n]+/).map(l => l.trim()).filter(l => l.length > 5);
                let rewrittenLines = [];
                let usedVerbs = new Set();
                let usedMetrics = new Set();

                for (let i = 0; i < Math.max(3, lines.length); i++) {
                    let line = lines[i] || "Responsible for maintaining and developing software applications.";
                    let verb = this.knowledgeBase.verbs.find(v => !usedVerbs.has(v)) || this.knowledgeBase.verbs[Math.floor(Math.random() * this.knowledgeBase.verbs.length)];
                    usedVerbs.add(verb);
                    
                    let metric = this.knowledgeBase.metrics.find(m => !usedMetrics.has(m)) || this.knowledgeBase.metrics[Math.floor(Math.random() * this.knowledgeBase.metrics.length)];
                    usedMetrics.add(metric);

                    let cleanLine = line
                        .replace(/^(I was|responsible for|helped to|worked on|developed|designed|managed|made|created|did)\s+/i, '')
                        .replace(/^\-/, '')
                        .trim();
                    
                    cleanLine = cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1);
                    if (!cleanLine.endsWith('.')) cleanLine += '';

                    let bullet = `- ${verb} ${cleanLine.toLowerCase().replace(/[\.]+$/, '')}, ${metric}.`;
                    rewrittenLines.push(bullet);
                }

                resolve(rewrittenLines.join('\n'));
            }, 1000);
        });
    },

    /**
     * AI Skill Suggester
     */
    async suggestSkills(existingSkills, jobTitle) {
        const prompt = `Based on this target job "${jobTitle}" and existing skills [${existingSkills.join(', ')}], recommend exactly 10 relevant technical and soft skills as a comma-separated list. Output ONLY the comma-separated skills:`;
        
        if (this.activeProvider === "webgpu") {
            return await this.callWebGPULLM(prompt);
        }
        if (this.apiKey) {
            return await this.callGeminiAPI(prompt);
        }

        // Offline / Mock engine
        return new Promise((resolve) => {
            setTimeout(() => {
                let category = this.detectCategory(jobTitle);
                let pool = this.knowledgeBase.skills[category] || this.knowledgeBase.skills["generic"];
                
                let existingLower = existingSkills.map(s => s.toLowerCase());
                let suggestions = pool.filter(s => !existingLower.includes(s.toLowerCase()));
                
                if (suggestions.length < 10) {
                    let genericPool = this.knowledgeBase.skills["generic"];
                    for (let g of genericPool) {
                        if (!existingLower.includes(g.toLowerCase()) && !suggestions.includes(g)) {
                            suggestions.push(g);
                        }
                    }
                }
                
                resolve(suggestions.slice(0, 10).join(', '));
            }, 800);
        });
    },

    /**
     * AI Cover Letter Generator
     */
    async generateCoverLetter(resumeData) {
        let name = resumeData.name || "John Doe";
        let role = resumeData.targetJob || "Software Developer";
        let skills = resumeData.skills && resumeData.skills.length > 0 ? resumeData.skills.slice(0, 3).join(', ') : "Software Engineering";
        
        const prompt = `Write a highly professional and compelling cover letter. Candidate Name: ${name}. Target Role: ${role}. Skills: ${resumeData.skills.join(', ')}. Experience Summary: ${JSON.stringify(resumeData.experience)}. Output ONLY the letter text with greetings and signature. No markdown comments or brackets:`;
        
        if (this.activeProvider === "webgpu") {
            return await this.callWebGPULLM(prompt);
        }
        if (this.apiKey) {
            return await this.callGeminiAPI(prompt);
        }

        // Offline / Mock engine
        return new Promise((resolve) => {
            setTimeout(() => {
                let dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                let greeting = `Dear Hiring Manager,`;
                
                let openingTpl = this.knowledgeBase.coverLetters.opening[Math.floor(Math.random() * this.knowledgeBase.coverLetters.opening.length)];
                let opening = openingTpl.replace('[Role]', role).replace('[Skill]', skills);
                
                let bodyTpl = this.knowledgeBase.coverLetters.body[Math.floor(Math.random() * this.knowledgeBase.coverLetters.body.length)];
                let body = bodyTpl.replace('[Role]', role).replace(/\[Skill\]/g, skills);
                
                let experienceDetail = "";
                if (resumeData.experience && resumeData.experience.length > 0) {
                    let latestExp = resumeData.experience[0];
                    experienceDetail = `In my recent role as ${latestExp.role} at ${latestExp.company}, I focused on implementing features, collaborating with engineering teams, and optimizing technical solutions to meet business milestones.`;
                } else {
                    experienceDetail = "I have developed strong competencies in modern software development methodologies and enjoy working on complex technical challenges.";
                }
                
                let closing = this.knowledgeBase.coverLetters.closing[Math.floor(Math.random() * this.knowledgeBase.coverLetters.closing.length)];
                let letter = `${dateStr}\n\n${greeting}\n\n${opening}\n\n${body}\n\n${experienceDetail}\n\n${closing}\n\nSincerely,\n\n${name}`;
                
                resolve(letter);
            }, 1200);
        });
    },

    /**
     * Gemini API Client Call
     */
    async callGeminiAPI(promptText) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: promptText
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.candidates[0].content.parts[0].text.trim();
        } catch (error) {
            console.error("Gemini API call failed: ", error);
            return "Gemini API Error. Falling back to local offline AI results:\n\n" + await this.offlineFallback(promptText);
        }
    },

    /**
     * WebGPU Local LLM Client Call
     */
    async callWebGPULLM(promptText) {
        try {
            if (!this.webllmEngine) {
                await this.initWebGPUEngine();
            }
            
            showToast("Generating with local WebGPU model...");
            const reply = await this.webllmEngine.chat.completions.create({
                messages: [{ role: "user", content: promptText }]
            });
            return reply.choices[0].message.content.trim();
        } catch (error) {
            console.error("WebGPU call failed: ", error);
            showToast("Local WebGPU error. Check WebGPU browser support.");
            return "WebGPU Error. Falling back to offline fallback:\n\n" + await this.offlineFallback(promptText);
        }
    },

    /**
     * WebGPU MLCEngine Setup
     */
    async initWebGPUEngine() {
        if (this.webllmLoading) return;
        this.webllmLoading = true;
        
        const progressContainer = document.getElementById("webgpu-loading-progress");
        const progressStatus = document.getElementById("webgpu-progress-status");
        const progressPercent = document.getElementById("webgpu-progress-percent");
        const progressBar = document.getElementById("webgpu-progress-bar");
        
        if (progressContainer) progressContainer.style.display = "block";
        if (progressStatus) progressStatus.innerText = "Loading Web-LLM...";
        
        try {
            const webllm = await import("https://esm.run/@mlc-ai/web-llm");
            
            if (progressStatus) progressStatus.innerText = "Spawning background worker...";
            
            // Create inline worker module to run LLM off the main thread
            const workerCode = `
                import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm";
                const handler = new WebWorkerMLCEngineHandler();
                self.onmessage = (msg) => {
                    handler.onmessage(msg);
                };
            `;
            const blob = new Blob([workerCode], { type: "application/javascript" });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl, { type: "module" });
            
            this.webllmEngine = await webllm.CreateWebWorkerMLCEngine(
                worker,
                this.webgpuModel,
                {
                    initProgressCallback: (report) => {
                        if (progressStatus) {
                            const statusText = report.text.split("]")[1] || report.text;
                            progressStatus.innerText = statusText.trim();
                        }
                        const percent = Math.round(report.progress * 100);
                        if (progressPercent) progressPercent.innerText = `${percent}%`;
                        if (progressBar) progressBar.style.width = `${percent}%`;
                    }
                }
            );
            
            showToast("Local GPU Model ready!");
            if (progressStatus) progressStatus.innerText = "Model Active & Ready";
            
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = "none";
            }, 2500);
        } catch (e) {
            console.error("Failed to load WebGPU model", e);
            if (progressStatus) progressStatus.innerText = "Failed to load. Check console/WebGPU support.";
            showToast("Failed to initialize WebGPU model.");
            throw e;
        } finally {
            this.webllmLoading = false;
        }
    },

    /**
     * Basic prompt parser for offline fallback
     */
    async offlineFallback(prompt) {
        if (prompt.includes("Rewrite")) {
            return await this.rewriteExperience("Sample developer description", "Software Developer");
        } else if (prompt.includes("recommend")) {
            return await this.suggestSkills([], "Software Developer");
        } else {
            return "Sincerely,\nJohn Doe";
        }
    }
};

// Global WebGPU UI Control Handlers
window.switchAIProvider = function(provider) {
    AIService.activeProvider = provider;
    localStorage.setItem('ai_provider', provider);
    
    document.querySelectorAll(".provider-radio-label").forEach(lbl => {
        lbl.classList.remove("active");
    });
    const activeLabel = document.getElementById(`prov-label-${provider}`);
    if (activeLabel) activeLabel.classList.add("active");
    
    const geminiSection = document.getElementById("settings-section-gemini");
    const webgpuSection = document.getElementById("settings-section-webgpu");
    
    if (provider === "gemini") {
        if (geminiSection) geminiSection.style.display = "block";
        if (webgpuSection) webgpuSection.style.display = "none";
    } else {
        if (geminiSection) geminiSection.style.display = "none";
        if (webgpuSection) webgpuSection.style.display = "block";
        
        const modelSelect = document.getElementById("webgpu-model-select");
        if (modelSelect) {
            modelSelect.value = AIService.webgpuModel;
        }
    }
};

window.preloadWebGPUModel = function() {
    showToast("Initializing local model download...");
    AIService.initWebGPUEngine();
};

window.checkWebGPUSupport = function() {
    const badge = document.getElementById("webgpu-support-badge");
    if (!badge) return;
    
    if ("gpu" in navigator) {
        badge.style.background = "rgba(16, 185, 129, 0.1)";
        badge.style.border = "1px solid rgba(16, 185, 129, 0.25)";
        badge.style.color = "#34d399";
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> WebGPU hardware acceleration detected';
    } else {
        badge.style.background = "rgba(239, 68, 68, 0.1)";
        badge.style.border = "1px solid rgba(239, 68, 68, 0.25)";
        badge.style.color = "#f87171";
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> WebGPU not supported in this browser';
        
        const btn = document.getElementById("btn-load-webgpu");
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            btn.title = "WebGPU is unsupported by this browser.";
        }
    }
};

window.toggleWebGPUAutoLoad = function(checked) {
    localStorage.setItem('webgpu_auto_load', checked ? 'true' : 'false');
};

document.addEventListener("DOMContentLoaded", () => {
    const prov = localStorage.getItem('ai_provider') || 'gemini';
    window.switchAIProvider(prov);
    window.checkWebGPUSupport();
    
    // Sync model select configuration
    const modelSelect = document.getElementById("webgpu-model-select");
    if (modelSelect) {
        modelSelect.value = AIService.webgpuModel;
        modelSelect.addEventListener("change", (e) => {
            AIService.webgpuModel = e.target.value;
            localStorage.setItem('webgpu_model', e.target.value);
            AIService.webllmEngine = null;
        });
    }
    
    // Sync Auto-load checkbox state
    const autoLoad = localStorage.getItem('webgpu_auto_load') === 'true';
    const autoLoadChk = document.getElementById("webgpu-auto-load-chk");
    if (autoLoadChk) {
        autoLoadChk.checked = autoLoad;
    }
    
    // Auto-load model weights on startup if enabled
    if (prov === 'webgpu' && autoLoad && ("gpu" in navigator)) {
        console.log("WebGPU Auto-load is active: preloading model weights in the background.");
        AIService.initWebGPUEngine();
    }
});
