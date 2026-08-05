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
    webgpuModel: localStorage.getItem('webgpu_model') || 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    webllmEngine: null,
    webllmLoading: false,
    
    getCache(key) {
        try {
            return localStorage.getItem(`resumake_ai_cache_${key}`);
        } catch (e) {
            return null;
        }
    },
    
    setCache(key, value) {
        try {
            localStorage.setItem(`resumake_ai_cache_${key}`, value);
        } catch (e) {
            // ignore
        }
    },
    
    // Core database of keywords and templates for high-quality mock/offline generation
    knowledgeBase: {
        skills: {
            "software": ["React.js", "Node.js", "Python", "Docker", "Git/GitHub", "REST APIs", "PostgreSQL", "System Architecture", "Agile Methodologies", "Unit Testing", "AWS", "CI/CD Pipelines", "Problem Solving", "Collaboration"],
            "web": ["HTML5/CSS3", "JavaScript (ES6+)", "TypeScript", "React", "Next.js", "Tailwind CSS", "Vite", "Responsive Design", "Web Performance Optimization", "SEO Best Practices", "Git", "UX/UI Design Principles"],
            "data": ["Python", "SQL", "Pandas & NumPy", "Machine Learning", "Tableau/PowerBI", "R", "Data Visualization", "Statistical Analysis", "Data Warehousing", "Feature Engineering", "Scikit-Learn", "Analytical Thinking"],
            "design": ["Figma", "Adobe Creative Suite", "UI/UX Design", "Wireframing", "Prototyping", "User Research", "Information Architecture", "Design Systems", "HTML/CSS Basics", "Interaction Design", "Creative Thinking", "Communication"],
            "product": ["Product Roadmap", "User Personas", "Agile/Scrum", "Market Research", "Jira/Confluence", "Data Analytics", "A/B Testing", "Stakeholder Management", "Product Lifecycle", "Strategic Planning", "Leadership"],
            "marketing": ["SEO/SEM", "Google Analytics", "Content Strategy", "Copywriting", "Social Media Marketing", "Email Campaigns", "A/B Testing", "Brand Management", "Market Analysis", "CRM Tools (HubSpot)", "Creativity"],
            "science": ["Laboratory Techniques", "Data Analysis", "Quality Control", "Research & Development", "Scientific Writing", "Regulatory Compliance", "Safety Standards", "Critical Thinking", "Troubleshooting", "Equipment Calibration", "Detail Oriented", "Experimental Design"],
            "generic": ["Project Management", "Team Leadership", "Strategic Planning", "Communication", "Problem Solving", "Time Management", "Critical Thinking", "Adaptability", "Collaboration", "Customer Relations"]
        },
        
        verbs: [
            "Spearheaded", "Engineered", "Optimized", "Architected", "Pioneered", 
            "Accelerated", "Orchestrated", "Revamped", "Synthesized", "Formulated",
            "Cultivated", "Maximize", "Decreased", "Standardized", "Transformed"
        ],
        
        metrics: {
            "software": [
                "boosting application load times by 35%",
                "saving 8 hours of manual deployment work per week",
                "resulting in a 42% reduction in production crash rates",
                "improving test coverage from 45% to 88%",
                "reducing server infrastructure costs by 22%"
            ],
            "web": [
                "boosting application load times by 35%",
                "increasing customer conversion rate by 18% in the first quarter",
                "reducing page weight by 45% for faster responsive scaling",
                "enhancing web accessibility index score to 98%"
            ],
            "data": [
                "improving query search optimization speed by 40%",
                "increasing predictive model accuracy to 94%",
                "accelerating data pipeline ingestion rates by 50%",
                "delivering automated dashboards that saved 5 hours of manual analysis daily"
            ],
            "design": [
                "improving user onboarding conversion rate by 28%",
                "reducing user task completion times by 22%",
                "enhancing design system consistency across 12 product panels",
                "boosting customer satisfaction (CSAT) score by 15%"
            ],
            "product": [
                "delivering the product roadmap milestone 2 weeks ahead of schedule",
                "increasing active monthly user engagement by 18%",
                "improving product onboarding metrics by 30%",
                "reducing feature delivery cycle times by 14%"
            ],
            "marketing": [
                "increasing customer conversion rate by 18% in the first quarter",
                "boosting organic search engine traffic by 45%",
                "maximizing campaign click-through rates (CTR) by 2.4x",
                "improving lead acquisition cost efficiency by 30%"
            ],
            "science": [
                "improving culture testing and analysis accuracy by 25%",
                "reducing sample processing turnaround times by 30%",
                "enhancing laboratory safety compliance index score to 100%",
                "accelerating critical diagnosis validation speed by 15%",
                "identifying and documenting 150+ complex microbial culture strings"
            ],
            "generic": [
                "increasing team productivity by 15% through workflow automation",
                "delivering the target milestone 2 weeks ahead of schedule",
                "saving 8 hours of manual tracking work per week",
                "improving cross-department collaboration times by 20%"
            ]
        },
        
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
        if (title.includes("bio") || title.includes("micro") || title.includes("chem") || title.includes("medical") || title.includes("clinical") || title.includes("science") || title.includes("lab")) return "science";
        if (title.includes("data") || title.includes("analyst") || title.includes("science") || title.includes("ml") || title.includes("ai")) return "data";
        if (title.includes("design") || title.includes("ux") || title.includes("ui") || title.includes("product designer")) return "design";
        if (title.includes("product") || title.includes("manager") || title.includes("owner")) return "product";
        if (title.includes("market") || title.includes("growth") || title.includes("seo")) return "marketing";
        return "generic";
    },

    // Helper to generate offline experience rewrites without recursion
    getOfflineRewriteMock(text, jobTitle = "Software Engineer") {
        const category = this.detectCategory(jobTitle);
        const categorySkills = this.knowledgeBase.skills[category] || this.knowledgeBase.skills["generic"];
        
        if (!text || text.trim().length < 10) {
            const skill1 = categorySkills[0] || "core features";
            const skill2 = categorySkills[1] || "scalable systems";
            const skill3 = categorySkills[2] || "performance modules";
            return `- Spearheaded design and integration of ${skill1} modules, boosting application load times by 35%.\n- Collaborated with engineering leads to deploy ${skill2} architectures.\n- Optimized codebase configurations and ${skill3} pipelines, reducing system latency by 25%.`;
        }

        let lines = text.split(/[.\n]+/).map(l => l.trim()).filter(l => l.length > 5);
        let rewrittenLines = [];
        let usedVerbs = new Set();
        let usedMetrics = new Set();

        const categoryMetrics = this.knowledgeBase.metrics[category] || this.knowledgeBase.metrics["generic"];

        for (let i = 0; i < Math.min(3, Math.max(3, lines.length)); i++) {
            let line = lines[i] || `maintaining and developing modern ${categorySkills[i % categorySkills.length] || "software"} applications`;
            let verb = this.knowledgeBase.verbs.find(v => !usedVerbs.has(v)) || this.knowledgeBase.verbs[Math.floor(Math.random() * this.knowledgeBase.verbs.length)];
            usedVerbs.add(verb);
            
            let metric = categoryMetrics.find(m => !usedMetrics.has(m)) || categoryMetrics[Math.floor(Math.random() * categoryMetrics.length)];
            usedMetrics.add(metric);

            let cleanLine = line
                .replace(/^(\d+\s+(months?|years?|weeks?|days?)\s+(of\s+)?(experience\s+)?(worked\s+)?(as\s+a?)?)\s*/i, '')
                .replace(/^(worked\s+as\s+a?|working\s+as\s+a?|role\s+as\s+a?|position\s+as\s+a?|employed\s+as\s+a?|acted\s+as\s+a?)\s*/i, '')
                .replace(/^(I was|responsible for|helped to|worked on|developed|designed|managed|made|created|did)\s+/i, '')
                .replace(/^(maintaining|developing|building|coding|creating|managing|leading|writing|implementing|designing|testing|deploying|supporting|tuning|integrating|engineering)\s+(and\s+(maintaining|developing|building|coding|creating|managing|leading|writing|implementing|designing|testing|deploying|supporting|tuning|integrating|engineering)\s+)?/i, '')
                .replace(/^\-/, '')
                .trim();
            
            cleanLine = cleanLine.replace(/^(microbiologist|developer|engineer|analyst|designer|manager|owner|consultant|assistant|doctor|specialist|officer|administrator|scientist)\s+(in|at)\s+/i, (match, title, prep) => {
                let noun = "operations";
                if (title.endsWith("developer") || title.endsWith("engineer")) noun = "development";
                if (title.endsWith("designer")) noun = "design";
                if (title.endsWith("analyst")) noun = "analysis";
                if (title.endsWith("manager") || title.endsWith("owner")) noun = "management";
                return `${noun} ${prep} `;
            });
            
            if (cleanLine.length < 3) {
                cleanLine = `${categorySkills[i % categorySkills.length] || "system"} assets`;
            }
            
            cleanLine = cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1);

            let bullet = `- ${verb} ${cleanLine.charAt(0).toLowerCase() + cleanLine.slice(1).replace(/[\.]+$/, '')}, ${metric}.`;
            rewrittenLines.push(bullet);
        }
        return rewrittenLines.join('\n');
    },

    // Helper to generate offline skill suggestions without recursion
    getOfflineSkillsMock(jobTitle, existingSkills = []) {
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
        return suggestions.slice(0, 10).join(', ');
    },

    // Helper to generate offline cover letters without recursion
    getOfflineCoverLetterMock(resumeData) {
        let name = resumeData.name || "John Doe";
        let role = resumeData.targetJob || "Software Developer";
        let skills = resumeData.skills && resumeData.skills.length > 0 ? resumeData.skills.slice(0, 3).join(', ') : "Software Engineering";
        
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
        return `${dateStr}\n\n${greeting}\n\n${opening}\n\n${body}\n\n${experienceDetail}\n\n${closing}\n\nSincerely,\n\n${name}`;
    },

    /**
     * AI Work Experience Rewriter
     */
    async rewriteExperience(text, jobTitle, keywords = "", onChunk = null) {
        let weaveKeywords = "";
        let chunkCallback = onChunk;
        if (typeof keywords === "function") {
            chunkCallback = keywords;
            weaveKeywords = "";
        } else {
            weaveKeywords = keywords;
        }

        const cacheKey = `rewrite_${btoa(unescape(encodeURIComponent(jobTitle + "_" + weaveKeywords + "_" + text))).slice(0, 100)}`;
        const cached = this.getCache(cacheKey);
        if (cached) return await this.simulateStreaming(cached, chunkCallback);

        let prompt = `You are a professional ATS resume writer. Rewrite this job description for a "${jobTitle}" role using strong, active industry-specific action verbs (e.g. "Spearheaded", "Architected", "Engineered", "Optimized"), quantify business achievements (like conversion rates, speed improvements, cost savings) where possible, and format it to easily clear ATS parsers.`;
        if (weaveKeywords && weaveKeywords.trim()) {
            prompt += ` Make sure to explicitly weave in the following key tools/skills naturally: ${weaveKeywords.trim()}.`;
        }
        prompt += ` Output ONLY the rewritten paragraphs as clean, professional bullet points starting with a bullet character (•) and ending with a terminal period. Do not output introduction, concluding texts, markdown codeblocks, or extra symbols:\n\n${text}`;
        
        let result;
        if (this.activeProvider === "webgpu") {
            result = await this.callWebGPULLM(prompt, chunkCallback);
        } else if (this.activeProvider === "gemini") {
            result = await this.callGeminiAPI(prompt, chunkCallback, text, jobTitle);
        } else {
            const mock = this.getOfflineRewriteMock(text, jobTitle);
            result = await this.simulateStreaming(mock, chunkCallback);
        }
        
        this.setCache(cacheKey, result);
        return result;
    },

    /**
     * AI Skill Suggester
     */
    async suggestSkills(existingSkills, jobTitle, onChunk) {
        const cacheKey = `skills_${btoa(unescape(encodeURIComponent(jobTitle + "_" + existingSkills.join(',')))).slice(0, 100)}`;
        const cached = this.getCache(cacheKey);
        if (cached) return await this.simulateStreaming(cached, onChunk);

        const prompt = `Based on this target job "${jobTitle}" and existing skills [${existingSkills.join(', ')}], recommend exactly 10 relevant technical and soft skills as a comma-separated list. Output ONLY the comma-separated skills:`;
        
        let result;
        if (this.activeProvider === "webgpu") {
            result = await this.callWebGPULLM(prompt, onChunk);
        } else if (this.activeProvider === "gemini") {
            result = await this.callGeminiAPI(prompt, onChunk, "", jobTitle);
        } else {
            const mock = this.getOfflineSkillsMock(jobTitle, existingSkills);
            result = await this.simulateStreaming(mock, onChunk);
        }

        this.setCache(cacheKey, result);
        return result;
    },

    /**
     * AI Cover Letter Generator
     */
    async generateCoverLetter(resumeData, onChunk) {
        let name = resumeData.name || "John Doe";
        let role = resumeData.targetJob || "Software Developer";
        
        const summary = `${name}_${role}_${(resumeData.skills || []).join(',')}_${(resumeData.experience || []).map(e => e.date + e.company).join(',')}`;
        const cacheKey = `cover_${btoa(unescape(encodeURIComponent(summary))).slice(0, 100)}`;
        const cached = this.getCache(cacheKey);
        if (cached && !cached.includes("WebGPU Error") && !cached.includes("API Proxy Error") && !cached.includes("React.js, Node.js")) {
            return await this.simulateStreaming(cached, onChunk);
        }

        let skills = resumeData.skills && resumeData.skills.length > 0 ? resumeData.skills.slice(0, 5).join(', ') : "Software Engineering";
        const prompt = `You are an expert executive recruiter. Write a highly compelling, professional, and personalized cover letter.
Candidate Name: ${name}.
Target Role: ${role}.
Key Candidate Skills: ${skills}.
Experience History: ${JSON.stringify(resumeData.experience || [])}.

Structure requirements:
1. Start with the date and a professional hiring manager greeting.
2. In the opening, express enthusiasm for the role and candidate's matching background.
3. In the body paragraphs, highlight 2-3 specific accomplishments from their experience history that demonstrate leadership and problem-solving, aligning them with the target role and key skills.
4. Conclude with a strong call to action and a professional sign-off ("Sincerely, ${name}").
5. Output ONLY the plain text letter contents. Do not include markdown headers, blockquotes, brackets, or code block markers.`;
        
        let result;
        if (this.activeProvider === "webgpu") {
            result = await this.callWebGPULLM(prompt, onChunk);
        } else if (this.activeProvider === "gemini") {
            result = await this.callGeminiAPI(prompt, onChunk, "", role);
        } else {
            const mock = this.getOfflineCoverLetterMock(resumeData);
            result = await this.simulateStreaming(mock, onChunk);
        }

        this.setCache(cacheKey, result);
        return result;
    },

    /**
     * Gemini API Client Call
     */
    async callGeminiAPI(promptText, onChunk, originalText = "", jobTitle = "") {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            if (this.apiKey) {
                headers['x-api-key'] = this.apiKey;
            }
            
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ prompt: promptText })
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || response.statusText);
            }
            
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text.trim();
            return await this.simulateStreaming(text, onChunk);
        } catch (error) {
            console.error("Gemini Proxy API call failed: ", error);
            const fallback = await this.offlineFallback(promptText, onChunk, originalText, jobTitle);
            return await this.simulateStreaming(fallback, onChunk);
        }
    },

    /**
     * Helper to simulate a snappy typing stream effect for non-WebGPU calls
     */
    async simulateStreaming(text, onChunk) {
        if (!onChunk) return text;
        const words = text.split(" ");
        let current = "";
        for (let i = 0; i < words.length; i++) {
            current += (i === 0 ? "" : " ") + words[i];
            onChunk(current);
            await new Promise(r => setTimeout(r, 10)); // snappy 10ms per word
        }
        return text;
    },

    /**
     * WebGPU Local LLM Client Call with true real-time token streaming
     */
    async callWebGPULLM(promptText, onChunk) {
        try {
            if (!this.webllmEngine) {
                await this.initWebGPUEngine();
            }
            
            showToast("Generating with local WebGPU model...");
            if (onChunk) {
                const completion = await this.webllmEngine.chat.completions.create({
                    messages: [{ role: "user", content: promptText }],
                    stream: true
                });
                let accumulatedText = "";
                for await (const chunk of completion) {
                    accumulatedText += chunk.choices[0].delta.content || "";
                    onChunk(accumulatedText);
                }
                return accumulatedText.trim();
            } else {
                const reply = await this.webllmEngine.chat.completions.create({
                    messages: [{ role: "user", content: promptText }]
                });
                return reply.choices[0].message.content.trim();
            }
        } catch (error) {
            console.error("WebGPU call failed: ", error);
            showToast("Local WebGPU error. Check WebGPU browser support.");
            const fallback = await this.offlineFallback(promptText);
            return await this.simulateStreaming(fallback, onChunk);
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
     * Basic prompt parser for offline fallback with simulation support
     */
    async offlineFallback(prompt, onChunk, originalText = "", jobTitle = "") {
        const p = (prompt || "").toLowerCase();
        let res = "";
        
        const activeState = window.state || (typeof state !== "undefined" ? state : null);
        const activeJob = jobTitle || (activeState ? activeState.targetJob : "") || "Software Developer";
        
        if (p.includes("rewrite")) {
            const textToRewrite = originalText || "Sample description";
            res = this.getOfflineRewriteMock(textToRewrite, activeJob);
        } else if (p.includes("cover letter")) {
            if (activeState) {
                res = this.getOfflineCoverLetterMock(activeState);
            } else {
                res = "Dear Hiring Manager,\n\nI am writing to apply for the position...";
            }
        } else if (p.includes("recommend") || p.includes("suggest") || p.includes("skill")) {
            const currentSkills = activeState ? (activeState.skills || []) : [];
            res = this.getOfflineSkillsMock(activeJob, currentSkills);
        } else {
            res = "Sincerely,\nJohn Doe";
        }
        return await this.simulateStreaming(res, onChunk);
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

window.AIService = AIService;
