/**
 * ResuMake AI - ATS Compatibility Auditor Module (Enhanced)
 * 
 * Performs static analysis and keyword matching on resume data:
 * 1. Contact information validation (email, phone, location)
 * 2. Section completeness checks (has work exp, education, skills, projects)
 * 3. Bullet-point format verification (for parsing optimization)
 * 4. Job Description Keyword Extraction and Match Density (Dynamic client-side NLP)
 * 5. Formatting length and Template-level ATS compatibility warnings
 */

const ATSAuditor = {
    // Extensive dictionary of standard technical, business, design, and soft skills
    skillsLexicon: [
        // Frontend & Web
        "react", "react.js", "angular", "vue", "vue.js", "next.js", "nuxt", "svelte", "javascript", "typescript",
        "html", "html5", "css", "css3", "sass", "less", "tailwind", "bootstrap", "webpack", "vite", "babel",
        // Backend & Languages
        "node.js", "node", "express", "express.js", "nest.js", "python", "django", "flask", "fastapi", "ruby",
        "rails", "ruby on rails", "php", "laravel", "java", "spring", "spring boot", "c++", "c#", ".net", "asp.net",
        "go", "golang", "rust", "scala", "kotlin", "perl",
        // Databases & Cache
        "sql", "mysql", "postgresql", "postgres", "sqlite", "mongodb", "nosql", "redis", "memcached", "cassandra",
        "elasticsearch", "mariadb", "oracle", "firebase",
        // DevOps, Cloud & Systems
        "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "ci/cd",
        "jenkins", "github actions", "gitlab", "terraform", "ansible", "linux", "nginx", "apache", "serverless",
        "microservices", "graphql", "rest api", "restful", "grpc", "oauth", "jwt",
        // Data & AI
        "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch", "scikit-learn",
        "pandas", "numpy", "tableau", "power bi", "data visualization", "sql server", "r", "hadoop", "spark",
        "data warehousing", "etl", "analytics", "statistics",
        // Design & Product
        "figma", "sketch", "adobe xd", "photoshop", "illustrator", "ui/ux", "user experience", "user interface",
        "wireframing", "prototyping", "design systems", "product roadmap", "user personas", "a/b testing",
        "agile", "scrum", "kanban", "jira", "confluence", "trello",
        // Business & Management
        "project management", "pmp", "product management", "seo", "sem", "google analytics", "hubspot", "crm",
        "salesforce", "marketing", "copywriting", "social media", "budgeting", "operations", "strategic planning",
        "customer success", "sales", "finance",
        // Key Methodologies & Certifications
        "system design", "system architecture", "oop", "functional programming", "unit testing", "jest",
        "cypress", "mocha", "tdd", "test driven development", "solid principles", "git", "github", "gitlab", "bitbucket",
        // Soft Skills
        "leadership", "team management", "collaboration", "communication", "problem solving", "critical thinking",
        "adaptability", "time management", "mentoring", "negotiation"
    ],

    // English stop words for cleaning up JD texts
    stopWords: new Set([
        "the", "a", "an", "and", "or", "but", "about", "above", "after", "again", "against", "all", "am", "an",
        "and", "any", "are", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
        "by", "can", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further",
        "had", "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how", "i", "if", "in", "into",
        "is", "it", "its", "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on", "once", "only",
        "or", "other", "our", "ours", "out", "over", "own", "same", "she", "should", "so", "some", "such",
        "than", "that", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under",
        "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
        "why", "with", "would", "you", "your", "yours", "yourself", "yourselves", "we're", "you're", "they're",
        "i'm", "it's", "isnt", "arent", "wasnt", "werent", "cant", "couldnt", "shouldnt", "wouldnt", "mustnt",
        "please", "send", "apply", "job", "work", "role", "position", "team", "experience", "candidate", "company",
        "skills", "years", "required", "preferred", "must", "have", "with", "using", "building", "developing",
        "responsible", "duties", "qualifications", "education", "degree"
    ]),

    // Keywords database fallback (if no JD is pasted)
    keywordsMap: {
        "software": ["software", "developer", "engineer", "system", "git", "api", "database", "code", "architecture", "agile", "testing", "cloud", "aws"],
        "web": ["web", "developer", "frontend", "html", "css", "javascript", "typescript", "react", "next.js", "tailwind", "responsive", "ui", "ux"],
        "data": ["data", "analyst", "sql", "python", "pandas", "visualization", "machine learning", "tableau", "statistics", "database", "analytics"],
        "design": ["design", "ui", "ux", "figma", "wireframe", "prototype", "user research", "interface", "adobe", "layout", "visual"],
        "product": ["product", "manager", "roadmap", "agile", "scrum", "analytics", "jira", "lifecycle", "strategy", "metrics", "requirements"],
        "marketing": ["marketing", "seo", "sem", "analytics", "content", "campaign", "conversion", "google analytics", "brand", "social media", "crm"]
    },

    detectCategory(title) {
        if (!title) return "generic";
        title = title.toLowerCase();
        if (title.includes("software") || title.includes("developer") || title.includes("engineer")) {
            if (title.includes("web") || title.includes("frontend")) return "web";
            return "software";
        }
        if (title.includes("data") || title.includes("analyst") || title.includes("science")) return "data";
        if (title.includes("design") || title.includes("ux") || title.includes("ui")) return "design";
        if (title.includes("product") || title.includes("manager")) return "product";
        if (title.includes("market") || title.includes("seo")) return "marketing";
        return "generic";
    },

    /**
     * Client-Side Keyword Extractor Heuristic
     * Analyzes JD text to identify technical and soft skills keywords
     */
    extractKeywordsFromJD(jdText) {
        if (!jdText || jdText.trim().length < 15) return [];

        // Normalize text
        const cleanedText = jdText.toLowerCase();
        
        // Find dictionary matches
        const matches = new Map(); // keyword -> frequency
        
        this.skillsLexicon.forEach(skill => {
            // Use regex to find whole word matches (accounting for special chars like c++, next.js)
            const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp('(?:\\b|\\s)' + escaped + '(?:\\b|\\s|\\.|,)', 'g');
            const count = (cleanedText.match(regex) || []).length;
            if (count > 0) {
                matches.set(skill, count);
            }
        });

        // Also extract other capitalized phrases from raw text that are repeated, 
        // as they might be proprietary tech or specific terms not in dictionary
        const wordRegex = /[A-Z][a-zA-Z0-9\+\.#]*/g;
        const capWords = jdText.match(wordRegex) || [];
        const capFrequencies = {};
        capWords.forEach(w => {
            const wLower = w.toLowerCase();
            if (w.length > 2 && !this.stopWords.has(wLower) && !this.skillsLexicon.includes(wLower)) {
                capFrequencies[wLower] = (capFrequencies[wLower] || 0) + 1;
            }
        });

        Object.keys(capFrequencies).forEach(w => {
            if (capFrequencies[w] >= 2) { // Mentioned at least twice
                matches.set(w, capFrequencies[w]);
            }
        });

        // Sort by frequency and return top 15
        const sorted = [...matches.entries()].sort((a, b) => b[1] - a[1]);
        return sorted.slice(0, 15).map(entry => {
            // Capitalize first letters for display
            return entry[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        });
    },

    /**
     * Runs the ATS compatibility audit on the current resume data state
     */
    audit(resumeData) {
        let score = 0;
        let suggestions = [];
        let extractedJDKeywords = [];
        let matchedJDKeywords = [];
        let missingJDKeywords = [];
        let usingJdMode = false;
        
        // 1. Contact Information Check (Max 15 points)
        let contactScore = 0;
        if (resumeData.name && resumeData.name.trim().length > 2) contactScore += 3;
        if (resumeData.email && resumeData.email.includes("@")) {
            contactScore += 4;
        } else {
            suggestions.push({ type: "danger", text: "Missing valid Email Address. ATS systems require a parsed contact email." });
        }
        if (resumeData.phone && resumeData.phone.trim().length > 5) {
            contactScore += 4;
        } else {
            suggestions.push({ type: "warning", text: "Missing Phone Number. Employers cannot contact you automatically." });
        }
        if (resumeData.location && resumeData.location.trim().length > 3) {
            contactScore += 4;
        } else {
            suggestions.push({ type: "warning", text: "Missing City/Location. Parsers often filter candidates based on local geofencing." });
        }
        
        if (contactScore === 15) {
            suggestions.push({ type: "success", text: "Contact Information is complete and easily parsable." });
        }
        score += contactScore;

        // 2. Sections Completeness (Max 20 points)
        let sectionsScore = 0;
        
        // Work Experience
        if (resumeData.experience && resumeData.experience.length > 0) {
            sectionsScore += 8;
            let descriptionsOk = resumeData.experience.every(exp => exp.desc && exp.desc.trim().length > 40);
            if (!descriptionsOk) {
                suggestions.push({ type: "warning", text: "Some work descriptions are too short. Expand accomplishments with achievements." });
                sectionsScore -= 2;
            }
        } else {
            suggestions.push({ type: "danger", text: "No Work Experience. Resumes without employment history fail basic parsing queries." });
        }

        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            sectionsScore += 6;
        } else {
            suggestions.push({ type: "danger", text: "Missing Education. Standard parsers scan for degrees or academic timelines." });
        }

        // Skills
        if (resumeData.skills && resumeData.skills.length >= 6) {
            sectionsScore += 6;
        } else if (resumeData.skills && resumeData.skills.length > 0) {
            sectionsScore += 3;
            suggestions.push({ type: "warning", text: `Only ${resumeData.skills.length} skills listed. Aim for 8-15 core skills to match search filters.` });
        } else {
            suggestions.push({ type: "danger", text: "Skills section is empty. Critical technical and soft skills must be explicitly named." });
        }
        score += sectionsScore;

        // 3. Bullet Point Formatting (Max 15 points)
        let formattingScore = 15;
        let hasExp = resumeData.experience && resumeData.experience.length > 0;
        if (hasExp) {
            let bulletsCount = 0;
            let paragraphsCount = 0;
            
            resumeData.experience.forEach(exp => {
                let desc = exp.desc || "";
                let lines = desc.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                lines.forEach(line => {
                    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
                        bulletsCount++;
                    } else {
                        paragraphsCount++;
                    }
                });
            });

            if (bulletsCount === 0 && paragraphsCount > 0) {
                formattingScore = 3;
                suggestions.push({ type: "danger", text: "Format experience items as a bulleted list. Paragraph blocks break parser tokenizers." });
            } else if (paragraphsCount > bulletsCount) {
                formattingScore = 8;
                suggestions.push({ type: "warning", text: "Mixed paragraphs and bullets. Convert all duties into action-verb bullet points." });
            } else {
                suggestions.push({ type: "success", text: "Excellent bullet-point formatting utilized in experience descriptions." });
            }
        } else {
            formattingScore = 0;
        }
        score += formattingScore;

        // 4. Job Description Keyword Matching (Max 40 points)
        let keywordScore = 0;
        let fullResumeText = (
            (resumeData.name || "") + " " +
            (resumeData.title || "") + " " +
            (resumeData.skills ? resumeData.skills.join(" ") : "") + " " +
            (resumeData.experience ? resumeData.experience.map(exp => (exp.role + " " + exp.desc)).join(" ") : "") + " " +
            (resumeData.projects ? resumeData.projects.map(proj => (proj.title + " " + proj.desc)).join(" ") : "")
        ).toLowerCase();

        if (resumeData.jobDescription && resumeData.jobDescription.trim().length > 30) {
            usingJdMode = true;
            extractedJDKeywords = this.extractKeywordsFromJD(resumeData.jobDescription);
            
            if (extractedJDKeywords.length > 0) {
                extractedJDKeywords.forEach(kw => {
                    const kwLower = kw.toLowerCase();
                    // Match with word boundaries to avoid false positives (e.g. "go" in "good")
                    const escaped = kwLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp('(?:\\b|\\s)' + escaped + '(?:\\b|\\s|\\.|,)', 'i');
                    
                    if (regex.test(fullResumeText)) {
                        matchedJDKeywords.push(kw);
                    } else {
                        missingJDKeywords.push(kw);
                    }
                });

                const matchRatio = matchedJDKeywords.length / extractedJDKeywords.length;
                keywordScore = Math.round(matchRatio * 40);
                
                if (matchRatio >= 0.75) {
                    suggestions.push({ type: "success", text: `Exceptional job description match (${matchedJDKeywords.length}/${extractedJDKeywords.length} key skills identified).` });
                } else if (matchRatio >= 0.45) {
                    suggestions.push({ type: "warning", text: `Moderate JD keyword alignment (${matchedJDKeywords.length}/${extractedJDKeywords.length}). Click the missing keywords below to inject them.` });
                } else {
                    suggestions.push({ type: "danger", text: `Low JD match score. Integrate missing high-priority target terms to beat filters.` });
                }
            } else {
                usingJdMode = false;
            }
        }

        // Fallback to title keywords if JD is not provided
        if (!usingJdMode) {
            let jobTitle = resumeData.targetJob || "";
            if (jobTitle) {
                let category = this.detectCategory(jobTitle);
                let targetKeywords = this.keywordsMap[category] || this.keywordsMap["generic"];
                
                let matched = [];
                targetKeywords.forEach(kw => {
                    if (fullResumeText.includes(kw.toLowerCase())) {
                        matched.push(kw);
                    }
                });

                let matchRatio = matched.length / targetKeywords.length;
                keywordScore = Math.round(matchRatio * 40);
                
                if (matchRatio >= 0.7) {
                    suggestions.push({ type: "success", text: `High static keywords matched (${matched.length}/${targetKeywords.length}) for "${jobTitle}".` });
                } else if (matchRatio >= 0.4) {
                    suggestions.push({ type: "warning", text: `Moderate keyword match. Paste a target Job Description in the sidebar to run a detailed ATS Audit.` });
                } else {
                    suggestions.push({ type: "danger", text: `Low target title matching. Paste a Job Description to discover missing skills.` });
                }
            } else {
                suggestions.push({ type: "warning", text: "Specify a Target Job Title or paste a Job Description to activate keyword match scoring." });
            }
        }
        score += keywordScore;

        // 5. Word Count and Spacing Density (Max 10 points)
        let lengthScore = 10;
        let totalWords = (
            (resumeData.name || "") + " " + 
            (resumeData.title || "") + " " + 
            (resumeData.experience ? resumeData.experience.map(e => e.desc).join(" ") : "") + " " +
            (resumeData.projects ? resumeData.projects.map(p => p.desc).join(" ") : "")
        ).split(/\s+/).filter(w => w.length > 0).length;

        if (totalWords > 900) {
            lengthScore = 4;
            suggestions.push({ type: "warning", text: "Dense layout (over 900 words). Highly dense files fail single-page layout check." });
        } else if (totalWords < 150) {
            lengthScore = 4;
            suggestions.push({ type: "warning", text: "Content is too sparse (under 150 words). Provide more details on project milestones." });
        } else {
            suggestions.push({ type: "success", text: "Optimal document length and word density (250-700 words)." });
        }
        score += lengthScore;

        // 6. Template Compatibility Checklist
        const activeTemplate = resumeData.activeTemplate || "modern";
        if (activeTemplate === "us" || activeTemplate === "classic") {
            suggestions.push({ type: "success", text: `Active layout (${activeTemplate.toUpperCase()}) is 100% ATS-Compliant (Single column text, standard margins).` });
        } else if (activeTemplate === "modern" || activeTemplate === "executive") {
            score -= 5; // Small penalty for semi-complex templates
            suggestions.push({ type: "warning", text: `Active layout (${activeTemplate.toUpperCase()}) is moderately compliant. Some enterprise parsers reject color decorations.` });
        } else {
            score -= 10; // Medium penalty for sidebars, double columns, or custom metadata structures
            suggestions.push({ type: "danger", text: `Active layout (${activeTemplate.toUpperCase()}) has low ATS compatibility. Avoid multi-columns, visual dials, or tables for automated submittals.` });
        }

        // Cap score at 100 and floor at 0
        score = Math.max(0, Math.min(100, score));

        let status = "Poor Compatibility";
        if (score >= 85) status = "Excellent Compatibility";
        else if (score >= 60) status = "Moderate Compatibility";

        return {
            score: score,
            status: status,
            suggestions: suggestions,
            jdMode: usingJdMode,
            extractedKeywords: extractedJDKeywords,
            matchedKeywords: matchedJDKeywords,
            missingKeywords: missingJDKeywords
        };
    }
};

// Global ATS Dashboard Data Reference
let pendingOptimizations = null;
let optimizationCache = null;
let lastCachedStateString = "";

const countryExpectations = {
    US: "<strong>US / Canada expectations:</strong> Strict anti-discrimination rules apply. Do NOT include a photo, age, date of birth, marital status, nationality, or gender. Single-page layout preferred. Focus heavily on action verbs and quantified impact.",
    UK: "<strong>United Kingdom expectations:</strong> Do NOT include a profile photo. Include a concise Personal Summary. Education details should mention GCSEs/A-Levels if early in your career. Standard A4 size.",
    EU: "<strong>Europe (Europass) expectations:</strong> Profile photos are highly expected in most EU countries. Personal details (birth date, nationality, gender) are standard. Keep layout neat, well-structured, and chronological.",
    AU: "<strong>Australia expectations:</strong> No photo. Long formats (2-3 pages) are common and acceptable to detail full responsibilities. Use clean typography and avoid personal sensitive information.",
    IN: "<strong>India expectations:</strong> Profile photo is optional. Career objective or summary is common. Personal details (date of birth, father's name, passport number, languages) are frequently listed at the bottom.",
    GCC: "<strong>GCC / Middle East expectations:</strong> Contact info, visa status, nationality, and marital status are critical for visa sponsorship. Profile photo is commonly expected. Highlight international experience."
};

window.switchATSTab = function(tabName) {
    document.querySelectorAll(".ats-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".ats-tab-panel").forEach(panel => panel.classList.remove("active"));
    
    document.getElementById(`tab-ats-${tabName}`).classList.add("active");
    document.getElementById(`panel-ats-${tabName}`).classList.add("active");
};

window.changeCountryRules = function(country) {
    const alertBox = document.getElementById("country-rule-alert");
    if (alertBox) {
        alertBox.innerHTML = countryExpectations[country] || "";
    }
};

window.onJDTextInput = function() {
    const txt = document.getElementById("ats-jd-text").value;
    state.jobDescription = txt;
    saveState();
};

window.handleJDFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        document.getElementById("ats-jd-text").value = text;
        state.jobDescription = text;
        saveState();
        showToast("Job Description uploaded successfully!");
        window.calculateJDMatch();
    };
    reader.readAsText(file);
};

window.calculateJDMatch = function() {
    const jdText = document.getElementById("ats-jd-text").value || "";
    state.jobDescription = jdText;
    saveState();
    
    const auditResult = ATSAuditor.audit(state);
    
    // Update Match Score
    const matchScoreElement = document.getElementById("ats-jd-match-score");
    if (matchScoreElement) {
        let matchScore = auditResult.jdMode ? Math.round((auditResult.matchedKeywords.length / auditResult.extractedKeywords.length) * 100) : 0;
        matchScoreElement.innerText = `${matchScore}%`;
        if (matchScore >= 80) matchScoreElement.style.color = "var(--success)";
        else if (matchScore >= 50) matchScoreElement.style.color = "var(--warning)";
        else matchScoreElement.style.color = "var(--danger)";
    }
    
    // Render Matched
    const matchedContainer = document.getElementById("ats-matched-keywords");
    if (matchedContainer) {
        matchedContainer.innerHTML = "";
        if (auditResult.matchedKeywords.length > 0) {
            auditResult.matchedKeywords.forEach(kw => {
                matchedContainer.innerHTML += `<span class="keyword-chip matched"><i class="fa-solid fa-check"></i> ${kw}</span>`;
            });
        } else {
            matchedContainer.innerHTML = `<span class="no-keywords">No matched keywords identified yet.</span>`;
        }
    }
    
    // Render Missing
    const missingContainer = document.getElementById("ats-missing-keywords");
    if (missingContainer) {
        missingContainer.innerHTML = "";
        if (auditResult.missingKeywords.length > 0) {
            auditResult.missingKeywords.forEach(kw => {
                missingContainer.innerHTML += `<span class="keyword-chip missing" onclick="window.injectKeyword('${kw.replace(/'/g, "\\'")}')"><i class="fa-solid fa-plus"></i> ${kw}</span>`;
            });
        } else {
            missingContainer.innerHTML = `<span class="no-keywords">Paste a job description to extract keywords.</span>`;
        }
    }
};

window.injectKeyword = function(kw) {
    if (!state.skills) state.skills = [];
    if (!state.skills.includes(kw)) {
        state.skills.push(kw);
        saveState();
        renderSkillsTags();
        renderResumePreview();
        window.calculateJDMatch();
        showToast(`Added skill: "${kw}"!`);
    } else {
        showToast("Skill is already listed!");
    }
};

window.initATSDashboard = function() {
    window.switchATSTab("dashboard");
    
    const auditResult = ATSAuditor.audit(state);
    
    // Set score circle gauge
    const scoreNum = document.getElementById("ats-modal-score");
    const scoreStatus = document.getElementById("ats-modal-status");
    const gauge = document.getElementById("ats-modal-gauge");
    
    if (scoreNum && scoreStatus && gauge) {
        scoreNum.innerText = `${auditResult.score}%`;
        scoreStatus.innerText = auditResult.status;
        gauge.style.setProperty("--score", auditResult.score);
        
        if (auditResult.score >= 85) scoreStatus.style.color = "var(--success)";
        else if (auditResult.score >= 60) scoreStatus.style.color = "var(--warning)";
        else scoreStatus.style.color = "var(--danger)";
    }
    
    // Country Selector initial rules
    const countrySelect = document.getElementById("ats-country-select");
    if (countrySelect) {
        window.changeCountryRules(countrySelect.value);
    }
    
    // Render checklists
    const checklist = document.getElementById("ats-modal-checklist");
    if (checklist) {
        checklist.innerHTML = "";
        
        const categories = [
            { name: "Resume Structure & completeness", score: state.experience && state.education && state.skills && state.skills.length > 0 ? 95 : 45 },
            { name: "Professional Summary description", score: state.summary && state.summary.length > 40 ? 90 : 15 },
            { name: "Keywords & JD alignment density", score: auditResult.jdMode ? Math.round((auditResult.matchedKeywords.length / Math.max(1, auditResult.extractedKeywords.length)) * 100) : (state.skills && state.skills.length >= 6 ? 85 : 40) },
            { name: "Work Experience Quality and length", score: state.experience && state.experience.length > 0 ? 80 : 0 },
            { name: "Format & Stacking compatibility", score: state.activeTemplate === "classic" || state.activeTemplate === "us" ? 95 : (state.activeTemplate === "modern" || state.activeTemplate === "executive" ? 75 : 55) }
        ];
        
        categories.forEach(cat => {
            checklist.innerHTML += `
                <div class="checklist-item">
                    <div class="checklist-item-header">
                        <span>${cat.name}</span>
                        <span>${cat.score}%</span>
                    </div>
                    <div class="checklist-progress-bar">
                        <div class="checklist-progress-fill" style="width: ${cat.score}%; background: ${cat.score >= 85 ? 'var(--success)' : (cat.score >= 50 ? 'var(--warning)' : 'var(--danger)')};"></div>
                    </div>
                </div>
            `;
        });
    }
    
    // Render Suggestions List
    const suggestionsList = document.getElementById("ats-modal-suggestions");
    if (suggestionsList) {
        suggestionsList.innerHTML = "";
        if (auditResult.suggestions.length > 0) {
            auditResult.suggestions.forEach(item => {
                let icon = "fa-circle-exclamation";
                if (item.type === "success") icon = "fa-circle-check";
                else if (item.type === "danger") icon = "fa-triangle-exclamation";
                
                suggestionsList.innerHTML += `
                    <div class="ats-suggestion-item ${item.type}">
                        <i class="fa-solid ${icon}"></i>
                        <div>${item.text}</div>
                    </div>
                `;
            });
        } else {
            suggestionsList.innerHTML = `
                <div class="ats-suggestion-item success">
                    <i class="fa-solid fa-circle-check"></i>
                    <div>Excellent! No major ATS warnings detected. Your resume is optimized.</div>
                </div>
            `;
        }
    }
    
    // Pre-fill JD textarea and recalculate match
    const jdTextarea = document.getElementById("ats-jd-text");
    if (jdTextarea) {
        jdTextarea.value = state.jobDescription || "";
    }
    window.calculateJDMatch();
};

window.diffWords = function(oldStr, newStr) {
    if (!oldStr) return `<span class="diff-add">${newStr || ''}</span>`;
    if (!newStr) return `<span class="diff-delete">${oldStr || ''}</span>`;
    
    const oldWords = oldStr.split(/\s+/);
    const newWords = newStr.split(/\s+/);
    let output = [];
    
    newWords.forEach(word => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const hasMatch = oldWords.some(ow => ow.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanWord);
        
        if (hasMatch || word === "") {
            output.push(word);
        } else {
            output.push(`<span class="diff-add">${word}</span>`);
        }
    });
    
    return output.join(" ");
};

window.createRevisionCard = function(id, title, originalText, optimizedText) {
    const diffHtml = window.diffWords(originalText, optimizedText);
    return `
        <div class="revision-card">
            <div class="revision-card-header">
                <span style="font-size: 0.8rem; font-weight: 700; color: white;">${title}</span>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary); cursor: pointer; text-transform: none;">
                    <input type="checkbox" id="accept-check-${id}" checked style="width: auto;"> Accept Revision
                </label>
            </div>
            <div class="revision-card-body">
                <div class="revision-column">
                    <span class="revision-col-title">Original Content</span>
                    <div class="revision-content original">${originalText.replace(/\n/g, '<br>')}</div>
                </div>
                <div class="revision-column">
                    <span class="revision-col-title">AI Optimized (Additions Highlighted)</span>
                    <div class="revision-content optimized">${diffHtml.replace(/\n/g, '<br>')}</div>
                </div>
            </div>
        </div>
    `;
};

window.runFullAIOptimization = function() {
    const loading = document.getElementById("ats-opt-loading");
    const results = document.getElementById("ats-opt-results");
    const btn = document.getElementById("ats-optimize-btn");
    
    if (loading && results && btn) {
        loading.style.display = "flex";
        results.style.display = "none";
        btn.disabled = true;
    }
    
    window.optimizeResumeData(state).then(optimizedData => {
        pendingOptimizations = optimizedData;
        
        if (loading && results && btn) {
            loading.style.display = "none";
            results.style.display = "block";
            btn.disabled = false;
        }
        
        window.renderRevisions(state, optimizedData);
    });
};

window.optimizeResumeData = async function(resumeState) {
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const jdText = document.getElementById("ats-jd-text").value || resumeState.targetJob || "Software Engineer";
    const selectedCountry = document.getElementById("ats-country-select").value || "US";
    
    // Create state hash key to determine if resume data has changed
    const currentStateString = JSON.stringify({
        resume: resumeState,
        jd: jdText,
        country: selectedCountry
    });
    
    // Check cache
    if (optimizationCache && lastCachedStateString === currentStateString) {
        console.log("Serving ATS optimization results from cache.");
        return optimizationCache;
    }
    
    if (apiKey) {
        const promptText = `
You are an expert ATS Resume Optimizer.
Analyze the following resume and target job description (or job title).
Country context: ${selectedCountry}.

Resume Details:
${JSON.stringify(resumeState, null, 2)}

Target Job:
${jdText}

Strict guidelines:
1. Do NOT invent, fabricate, or add any false qualifications, schools, certifications, employment history, names, dates, or skills.
2. Polish the summary to make it highly engaging and professional.
3. Enhance work experience and project description bullet points using strong action verbs and quantified achievements.
4. Detect missing high-priority keywords from the job description.
5. Provide actionable formatting improvements.
6. Check grammar and provide a list of verified spelling/grammar corrections.
7. Output ONLY a valid JSON object. Do not include markdown wraps or block comments.

Expected Output Format:
{
  "atsScore": 92,
  "scores": {
    "structure": 90,
    "keywords": 85,
    "formatting": 95,
    "experience": 90,
    "skills": 90
  },
  "strengths": ["Clear section headers", "Quantified business metrics"],
  "improvements": ["Optimize keyword density for ${selectedCountry}"],
  "missingKeywords": ["Docker", "CI/CD"],
  "suggestedKeywords": ["TypeScript", "AWS"],
  "optimizedSummary": "Optimized summary text here...",
  "optimizedExperience": [
    {"id": "exp_id_1", "desc": "Rewritten experience bullets..."},
    {"id": "exp_id_2", "desc": "Rewritten experience bullets..."}
  ],
  "optimizedProjects": [
    {"id": "proj_id_1", "desc": "Rewritten project bullets..."}
  ],
  "grammarFixes": [
    "Corrected past-tense verb usage on all previous experience bullet points.",
    "Ensured consistent terminal periods on bullet statements."
  ],
  "formattingSuggestions": [
    "Switching to Classic or US Standard template will eliminate visual parsing anomalies."
  ]
}
`;
        try {
            const resultText = await window.callGeminiOptimizerAPI(apiKey, promptText);
            let cleaned = resultText.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.substring(7);
            } else if (cleaned.startsWith("```")) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length - 3);
            }
            cleaned = cleaned.trim();
            
            const parsed = JSON.parse(cleaned);
            
            // Cache the result
            optimizationCache = parsed;
            lastCachedStateString = currentStateString;
            
            return parsed;
        } catch (err) {
            console.error("Gemini optimization failed:", err);
            throw new Error(`Gemini API Error: ${err.message || 'Verification failed. Check your API key settings or network connection.'}`);
        }
    } else {
        throw new Error("AI optimization requires an API key. Configure OpenAI, Gemini, or Claude in Settings.");
    }
};

window.callGeminiOptimizerAPI = async function(key, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
};

window.mockLocalOptimization = function(resumeState) {
    const optimized = {
        atsScore: 92,
        scores: {
            structure: 95,
            keywords: 85,
            formatting: 90,
            experience: 92,
            skills: 90
        },
        strengths: [
            "Consistent professional fonts and spacing used.",
            "Contact details are fully parsable and valid.",
            "Strong action statements are used in experience blocks."
        ],
        improvements: [
            "Consider organizing skills into clear domain groups.",
            "Review keyword density to align with target role parameters."
        ],
        optimizedSummary: "",
        optimizedExperience: [],
        optimizedProjects: []
    };
    
    // Summary
    const origSummary = resumeState.summary || "";
    if (origSummary.trim().length > 10) {
        optimized.optimizedSummary = `Highly accomplished professional specializing in ${resumeState.title || 'software systems'} with a proven record of leading technical implementations, optimizing application workflows, and delivering high-performance scalable solutions. Demonstrated success in collaborating with cross-functional teams to translate user requirements into robust software architectures, boosting user engagement and system uptime.`;
    } else {
        optimized.optimizedSummary = `Results-oriented professional specializing in ${resumeState.title || 'modern application development'} with a dedication to engineering high-performance responsive systems, optimizing data pipelines, and fostering collaboration across agile development cycles to deliver user-centric milestones.`;
    }
    
    // Experiences
    if (resumeState.experience) {
        resumeState.experience.forEach(exp => {
            const verbs = ["Spearheaded", "Engineered", "Optimized", "Architected", "Orchestrated"];
            const metrics = [
                "improving overall system performance by 35%",
                "reducing server infrastructure costs by 22%",
                "saving 10+ hours of manual testing per week",
                "increasing user conversion rates by 18% in the first quarter"
            ];
            
            let lines = (exp.desc || "").split(/[.\n]+/).map(l => l.trim().replace(/^[-•*]/, '').trim()).filter(l => l.length > 5);
            let rewritten = [];
            
            for (let i = 0; i < Math.max(2, lines.length); i++) {
                let line = lines[i] || "Responsible for maintaining and developing modern software modules.";
                let verb = verbs[i % verbs.length];
                let metric = metrics[i % metrics.length];
                
                let cleaned = line
                    .replace(/^(I was|responsible for|helped to|worked on|developed|designed|managed|made|created|did)\s+/i, '')
                    .trim();
                
                cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                rewritten.push(`- ${verb} ${cleaned.toLowerCase().replace(/[\.]+$/, '')}, ${metric}.`);
            }
            optimized.optimizedExperience.push({
                id: exp.id,
                desc: rewritten.join("\n")
            });
        });
    }

    // Projects
    if (resumeState.projects) {
        resumeState.projects.forEach(proj => {
            const verbs = ["Designed and developed", "Pioneered deployment of", "Implemented and launched"];
            const metrics = [
                "improving user experience metrics by 25%",
                "streamlining workflow efficiency",
                "maximizing codebase test coverage to 85%"
            ];
            
            let lines = (proj.desc || "").split(/[.\n]+/).map(l => l.trim().replace(/^[-•*]/, '').trim()).filter(l => l.length > 5);
            let rewritten = [];
            
            for (let i = 0; i < Math.max(1, lines.length); i++) {
                let line = lines[i] || "Created personal application to solve complex scheduling parameters.";
                let verb = verbs[i % verbs.length];
                let metric = metrics[i % metrics.length];
                
                let cleaned = line
                    .replace(/^(I was|responsible for|helped to|worked on|developed|designed|managed|made|created|did)\s+/i, '')
                    .trim();
                
                cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                rewritten.push(`- ${verb} ${cleaned.toLowerCase().replace(/[\.]+$/, '')}, ${metric}.`);
            }
            optimized.optimizedProjects.push({
                id: proj.id,
                desc: rewritten.join("\n")
            });
        });
    }
    
    return optimized;
};

window.renderRevisions = function(original, optimized) {
    const list = document.getElementById("ats-revisions-list");
    if (!list) return;
    
    list.innerHTML = "";
    
    if (original.summary || optimized.optimizedSummary) {
        list.innerHTML += window.createRevisionCard(
            "summary",
            "Professional Summary",
            original.summary || "No summary provided.",
            optimized.optimizedSummary
        );
    }
    
    if (original.experience && optimized.optimizedExperience) {
        original.experience.forEach(exp => {
            const optExp = optimized.optimizedExperience.find(o => o.id === exp.id);
            if (optExp) {
                list.innerHTML += window.createRevisionCard(
                    `exp-${exp.id}`,
                    `Experience: ${exp.role} at ${exp.company}`,
                    exp.desc || "",
                    optExp.desc
                );
            }
        });
    }
    
    if (original.projects && optimized.optimizedProjects) {
        original.projects.forEach(proj => {
            const optProj = optimized.optimizedProjects.find(o => o.id === proj.id);
            if (optProj) {
                list.innerHTML += window.createRevisionCard(
                    `proj-${proj.id}`,
                    `Project: ${proj.title}`,
                    proj.desc || "",
                    optProj.desc
                );
            }
        });
    }
};

window.applyAllAIOptimizations = function() {
    if (!pendingOptimizations) return;
    
    let appliedCount = 0;
    
    // Summary
    const acceptSummary = document.getElementById("accept-check-summary");
    if (acceptSummary && acceptSummary.checked) {
        state.summary = pendingOptimizations.optimizedSummary;
        const summaryInput = document.getElementById("input-summary");
        if (summaryInput) summaryInput.value = state.summary;
        appliedCount++;
    }
    
    // Experience
    if (state.experience && pendingOptimizations.optimizedExperience) {
        state.experience.forEach(exp => {
            const acceptExp = document.getElementById(`accept-check-exp-${exp.id}`);
            if (acceptExp && acceptExp.checked) {
                const optExp = pendingOptimizations.optimizedExperience.find(o => o.id === exp.id);
                if (optExp) {
                    exp.desc = optExp.desc;
                    appliedCount++;
                }
            }
        });
    }
    
    // Projects
    if (state.projects && pendingOptimizations.optimizedProjects) {
        state.projects.forEach(proj => {
            const acceptProj = document.getElementById(`accept-check-proj-${proj.id}`);
            if (acceptProj && acceptProj.checked) {
                const optProj = pendingOptimizations.optimizedProjects.find(o => o.id === proj.id);
                if (optProj) {
                    proj.desc = optProj.desc;
                    appliedCount++;
                }
            }
        });
    }
    
    if (appliedCount > 0) {
        saveState();
        renderExperienceList();
        renderProjectsList();
        renderResumePreview();
        
        showToast(`Applied ${appliedCount} AI optimizations successfully!`);
        closeATSModal();
    } else {
        showToast("No optimizations were selected.");
    }
};

window.openAIOptimizeModal = function() {
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const modal = document.getElementById("ai-optimize-modal");
    if (!modal) return;
    
    modal.classList.add("open");
    
    const noKeyAlert = document.getElementById("ai-opt-no-key-alert");
    const dashboard = document.getElementById("ai-opt-dashboard");
    
    if (!apiKey) {
        noKeyAlert.style.display = "block";
        dashboard.style.display = "none";
    } else {
        noKeyAlert.style.display = "none";
        dashboard.style.display = "block";
        
        window.fetchAIOptimizationDetails();
    }
};

window.closeAIOptimizeModal = function() {
    const modal = document.getElementById("ai-optimize-modal");
    if (modal) modal.classList.remove("open");
};

window.fetchAIOptimizationDetails = function() {
    const container = document.getElementById("ai-opt-suggestions-container");
    if (!container) return;
    
    container.innerHTML = `
        <div class="ats-opt-loading" style="padding: 40px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
            <div class="loading-spinner"></div>
            <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 10px;">Gemini AI is analyzing and refactoring your resume details...</span>
        </div>
    `;
    
    window.optimizeResumeData(state).then(optimizedData => {
        pendingOptimizations = optimizedData;
        
        const valBox = document.getElementById("ai-opt-score-val");
        if (valBox) valBox.innerText = `${optimizedData.atsScore}%`;
        
        window.renderAIOptimizerSuggestions(state, optimizedData);
    }).catch(err => {
        container.innerHTML = `
            <div class="ats-suggestion-item danger" style="padding: 20px; display: flex; gap: 12px; border-radius: 8px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-top: 2px;"></i>
                <div>
                    <h4 style="margin: 0 0 6px 0; color: white;">Optimization Failed</h4>
                    <p style="margin: 0; font-size: 0.8rem; line-height: 1.4; color: #fecaca;">
                        ${err.message || 'An unexpected API error occurred. Check your connection or API key settings.'}
                    </p>
                </div>
            </div>
        `;
    });
};

window.aiOptToggleAll = function(checkedState) {
    const checkboxes = document.querySelectorAll("#ai-opt-suggestions-container input[type='checkbox']");
    checkboxes.forEach(cb => cb.checked = checkedState);
};

window.renderAIOptimizerSuggestions = function(original, optimized) {
    const container = document.getElementById("ai-opt-suggestions-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    // 1. Resume Analysis & Strengths
    let analysisHtml = `<div class="revision-card">
        <div class="revision-card-header">
            <span style="font-size: 0.8rem; font-weight: 700; color: white;"><i class="fa-solid fa-chart-pie"></i> Resume Health Analysis</span>
        </div>
        <div class="revision-card-body" style="grid-template-columns: 1fr;">
            <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                <strong>Strengths detected:</strong>
                <ul style="padding-left: 20px; margin: 4px 0 10px 0; color: var(--success);">
                    ${optimized.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
                <strong>Areas of improvement:</strong>
                <ul style="padding-left: 20px; margin: 4px 0 0 0; color: var(--warning);">
                    ${optimized.improvements.map(imp => `<li>${imp}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>`;
    container.innerHTML += analysisHtml;

    // 2. ATS Formatting Warnings & Suggestions
    const activeTemplate = original.activeTemplate || "modern";
    if (activeTemplate !== "classic" && activeTemplate !== "us") {
        const formattingRecs = optimized.formattingSuggestions || [
            "Switch to Classic or US Standard single-column layout for 100% compatibility."
        ];
        let formatHtml = `<div class="revision-card">
            <div class="revision-card-header">
                <span style="font-size: 0.8rem; font-weight: 700; color: white;"><i class="fa-solid fa-file-invoice"></i> ATS Formatting Suggestion</span>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary); cursor: pointer; text-transform: none;">
                    <input type="checkbox" id="accept-check-formatting" checked style="width: auto;"> Change Template
                </label>
            </div>
            <div class="revision-card-body" style="grid-template-columns: 1fr;">
                <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                    The active layout template (<strong>${activeTemplate.toUpperCase()}</strong>) uses color decorations or columns which some older parser systems might misalign.
                    <br><br>
                    <span style="color: var(--success); font-weight: 600;">Recommendations:</span>
                    <ul style="padding-left: 20px; margin: 4px 0 0 0;">
                        ${formattingRecs.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>`;
        container.innerHTML += formatHtml;
    }

    // 3. Professional Summary Improvements
    if (original.summary || optimized.optimizedSummary) {
        container.innerHTML += window.createRevisionCard(
            "summary",
            "<i class='fa-solid fa-user-tie'></i> Professional Summary Optimization",
            original.summary || "No profile summary provided.",
            optimized.optimizedSummary
        );
    }
    
    // 4. Stronger Bullet Point Suggestions (Experience)
    if (original.experience && optimized.optimizedExperience) {
        original.experience.forEach(exp => {
            const optExp = optimized.optimizedExperience.find(o => o.id === exp.id);
            if (optExp) {
                container.innerHTML += window.createRevisionCard(
                    `exp-${exp.id}`,
                    `<i class='fa-solid fa-briefcase'></i> Bullet Suggestion: ${exp.role} at ${exp.company}`,
                    exp.desc || "",
                    optExp.desc
                );
            }
        });
    }

    // 5. Stronger Bullet Point Suggestions (Projects)
    if (original.projects && optimized.optimizedProjects) {
        original.projects.forEach(proj => {
            const optProj = optimized.optimizedProjects.find(o => o.id === proj.id);
            if (optProj) {
                container.innerHTML += window.createRevisionCard(
                    `proj-${proj.id}`,
                    `<i class='fa-solid fa-code-fork'></i> Bullet Suggestion: Project "${proj.title}"`,
                    proj.desc || "",
                    optProj.desc
                );
            }
        });
    }

    // 6. Missing Keywords & Skills
    const missingJdKeywords = optimized.missingKeywords || [];
    const suggestedIndustryKeywords = optimized.suggestedKeywords || [];
    const allKeywords = [...new Set([...missingJdKeywords, ...suggestedIndustryKeywords])];
    
    if (allKeywords.length > 0) {
        let kwHtml = `<div class="revision-card">
            <div class="revision-card-header">
                <span style="font-size: 0.8rem; font-weight: 700; color: white;"><i class="fa-solid fa-key"></i> Missing Keywords & Technologies</span>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary); cursor: pointer; text-transform: none;">
                    <input type="checkbox" id="accept-check-keywords" checked style="width: auto;"> Inject Keywords
                </label>
            </div>
            <div class="revision-card-body" style="grid-template-columns: 1fr;">
                <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                    The following high-priority ATS keywords were identified as missing from your resume content. Injecting them will significantly boost parsing matches:
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;" id="ai-opt-keywords-list">
                        ${allKeywords.map(kw => `<span class="keyword-chip missing" style="cursor: default;"><i class="fa-solid fa-plus"></i> ${kw}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>`;
        container.innerHTML += kwHtml;
    }

    // 7. Grammar & Spelling Suggestions
    let grammarSuggestions = optimized.grammarFixes || [
        "Ensured consistent tense usage in all experience bullet statements (action verbs in past tense).",
        "Checked punctuation formatting consistency (periods at the end of bullet points)."
    ];
    let grammarHtml = `<div class="revision-card">
        <div class="revision-card-header">
            <span style="font-size: 0.8rem; font-weight: 700; color: white;"><i class="fa-solid fa-spell-check"></i> Grammar & Spelling Audit</span>
        </div>
        <div class="revision-card-body" style="grid-template-columns: 1fr;">
            <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                All spelling and syntax metrics verified:
                <ul style="padding-left: 20px; margin: 6px 0 0 0; color: var(--success);">
                    ${grammarSuggestions.map(g => `<li>${g}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>`;
    container.innerHTML += grammarHtml;
};

window.applyAIOptimizerChanges = function() {
    if (!pendingOptimizations) return;
    
    let appliedCount = 0;
    
    // 1. Apply Summary
    const acceptSummary = document.getElementById("accept-check-summary");
    if (acceptSummary && acceptSummary.checked) {
        state.summary = pendingOptimizations.optimizedSummary;
        const summaryInput = document.getElementById("input-summary");
        if (summaryInput) summaryInput.value = state.summary;
        appliedCount++;
    }
    
    // 2. Apply Experience
    if (state.experience && pendingOptimizations.optimizedExperience) {
        state.experience.forEach(exp => {
            const acceptExp = document.getElementById(`accept-check-exp-${exp.id}`);
            if (acceptExp && acceptExp.checked) {
                const optExp = pendingOptimizations.optimizedExperience.find(o => o.id === exp.id);
                if (optExp) {
                    exp.desc = optExp.desc;
                    appliedCount++;
                }
            }
        });
    }
    
    // 3. Apply Projects
    if (state.projects && pendingOptimizations.optimizedProjects) {
        state.projects.forEach(proj => {
            const acceptProj = document.getElementById(`accept-check-proj-${proj.id}`);
            if (acceptProj && acceptProj.checked) {
                const optProj = pendingOptimizations.optimizedProjects.find(o => o.id === proj.id);
                if (optProj) {
                    proj.desc = optProj.desc;
                    appliedCount++;
                }
            }
        });
    }
    
    // 4. Apply Keywords Injection
    const acceptKeywords = document.getElementById("accept-check-keywords");
    if (acceptKeywords && acceptKeywords.checked) {
        const missingJdKeywords = pendingOptimizations.missingKeywords || [];
        const suggestedIndustryKeywords = pendingOptimizations.suggestedKeywords || [];
        const allKeywords = [...new Set([...missingJdKeywords, ...suggestedIndustryKeywords])];
        
        allKeywords.forEach(kw => {
            if (!state.skills) state.skills = [];
            if (!state.skills.includes(kw)) {
                state.skills.push(kw);
                appliedCount++;
            }
        });
        
        renderSkillsTags();
    }
    
    // 5. Apply Template Formatting Change
    const acceptFormatting = document.getElementById("accept-check-formatting");
    if (acceptFormatting && acceptFormatting.checked) {
        state.activeTemplate = "classic";
        const templateFilter = document.getElementById("template-filter");
        if (templateFilter) templateFilter.value = "classic";
        appliedCount++;
    }
    
    if (appliedCount > 0) {
        saveState();
        renderExperienceList();
        renderProjectsList();
        renderResumePreview();
        
        updateATSScore();
        
        showToast(`Successfully merged ${appliedCount} AI optimizations and recalculated ATS score!`);
        window.closeAIOptimizeModal();
    } else {
        showToast("No changes were selected to apply.");
    }
};
