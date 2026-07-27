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
            throw err;
        }
    } else {
        throw new Error("AI optimization requires an API key. Configure OpenAI, Gemini, or Claude in Settings.");
    }
};

window.callGeminiOptimizerAPI = async function(key, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };
    
    // Log the complete request payload (excluding key)
    console.log("Gemini API Request Payload:", JSON.stringify(requestBody, null, 2));
    
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
    } catch (netErr) {
        console.error("Gemini API Network Error:", netErr);
        throw new Error("Network error. Please check your internet connection and try again.");
    }
    
    if (!response.ok) {
        let errorData = null;
        try {
            errorData = await response.json();
        } catch (jsonErr) {
            // response was not JSON
        }
        
        // Log the complete error response payload for debugging
        console.error(`Gemini API Error Response [HTTP ${response.status}]:`, errorData || response.statusText);
        
        const httpStatus = response.status;
        let errorMessage = response.statusText || "API Error";
        let apiStatus = "";
        
        if (errorData && errorData.error) {
            errorMessage = errorData.error.message || errorMessage;
            apiStatus = errorData.error.status || "";
        }
        
        const errObj = new Error(errorMessage);
        errObj.httpStatus = httpStatus;
        errObj.apiStatus = apiStatus;
        errObj.errorData = errorData;
        throw errObj;
    }
    
    const data = await response.json();
    
    // Log response payload for debugging
    console.log("Gemini API Response Payload:", JSON.stringify(data, null, 2));
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        throw new Error("Invalid response payload structure returned by Gemini API.");
    }
    
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

// ==========================================
// ATS SUGGESTIONS PANEL CONTROLLERS & LOGIC
// ==========================================
let atsSuggestionsList = [];
let completedSuggestions = {};
let panelExpanded = true;

window.toggleATSSuggestionsPanel = function() {
    const card = document.getElementById("ats-suggestions-card");
    if (!card) return;
    
    panelExpanded = !panelExpanded;
    if (panelExpanded) {
        card.classList.remove("collapsed");
    } else {
        card.classList.add("collapsed");
    }
};

window.syncATSSuggestionsPanel = function() {
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const noKey = document.getElementById("ats-suggestions-no-key");
    const dashboard = document.getElementById("ats-suggestions-dashboard");
    const countBadge = document.getElementById("ats-suggestions-count-badge");
    
    if (!noKey || !dashboard) return;
    
    if (!apiKey) {
        noKey.style.display = "block";
        dashboard.style.display = "none";
        if (countBadge) countBadge.innerText = "0 Suggestions";
        return;
    }
    
    noKey.style.display = "none";
    dashboard.style.display = "block";
    
    const report = ATSAuditor.audit(state);
    
    const curScoreBox = document.getElementById("ats-tracker-current-score");
    if (curScoreBox) curScoreBox.innerText = report.score;
    
    const fill = document.getElementById("ats-tracker-progress-fill");
    if (fill) fill.style.width = `${report.score}%`;
    
    if (atsSuggestionsList.length === 0) {
        const listContainer = document.getElementById("ats-suggestions-list");
        if (listContainer) {
            listContainer.innerHTML = `
                <div style="display: flex; justify-content: center; padding: 20px 0;">
                    <button class="btn btn-premium" onclick="window.runAIPanelAnalysis()"><i class="fa-solid fa-chart-line"></i> Analyze Resume</button>
                </div>
            `;
        }
        if (countBadge) countBadge.innerText = "Needs Analysis";
        
        const potScoreBox = document.getElementById("ats-tracker-potential-score");
        if (potScoreBox) potScoreBox.innerText = report.score;
    } else {
        window.renderSuggestionsList();
    }
};

window.runAIPanelAnalysis = function() {
    const listContainer = document.getElementById("ats-suggestions-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0; gap: 10px;">
            <div class="loading-spinner"></div>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Analyzing entire resume layout and wording compatibility...</span>
        </div>
    `;
    
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const jdText = document.getElementById("ats-jd-text")?.value || state.targetJob || "Software Engineer";
    const selectedCountry = document.getElementById("ats-country-select")?.value || "US";
    
    if (!apiKey) {
        showToast("Configure your API Key in Settings first.");
        window.syncATSSuggestionsPanel();
        return;
    }
    
    const prompt = `
You are an expert ATS auditor. Analyze the following resume:
${JSON.stringify(state, null, 2)}

Target Job: ${jdText}
Country context: ${selectedCountry}.

Identify 5 concrete improvement suggestions to optimize this resume.
Strict guidelines:
1. Do NOT invent, fabricate, or add any false qualifications, schools, certifications, employment history, names, dates, or skills.
2. Suggest improvements only using information the user has already provided.
3. Estimate the potential ATS score increase (+2 to +10) for each suggestion.
4. Output ONLY a valid JSON array of suggestions. Do not include markdown code ticks.

Expected Output Format:
[
  {
    "id": "summary",
    "priority": "High",
    "category": "Professional Summary",
    "description": "Your summary is too generic. Include your years of experience, core skills, and career objective.",
    "points": 8,
    "actionText": "Improve Summary",
    "beforeText": "Original summary text...",
    "afterText": "Polished suggested summary text..."
  },
  {
    "id": "keywords",
    "priority": "High",
    "category": "Missing Keywords",
    "description": "Your resume is missing important keywords for the selected job role.",
    "points": 6,
    "actionText": "Add Keywords",
    "beforeText": "",
    "afterText": "React, REST API, Docker, CI/CD"
  },
  {
    "id": "experience",
    "priority": "Medium",
    "category": "Work Experience",
    "description": "Use stronger action verbs and include measurable achievements where supported by your experience.",
    "points": 5,
    "actionText": "Improve Experience",
    "beforeText": "Original experience text...",
    "afterText": "Polished experience text..."
  },
  {
    "id": "skills",
    "priority": "Medium",
    "category": "Skills Section",
    "description": "Group skills into categories such as: Programming Languages, Frameworks, Databases, Tools, Cloud.",
    "points": 4,
    "actionText": "Organize Skills",
    "beforeText": "JavaScript, React, CSS, Docker, SQL",
    "afterText": "Programming Languages: JavaScript\\nFrameworks: React\\nTools: Docker\\nDatabases: SQL"
  },
  {
    "id": "projects",
    "priority": "Medium",
    "category": "Projects",
    "description": "Add technologies used, your role, and measurable outcomes for each project.",
    "points": 3,
    "actionText": "Improve Projects",
    "beforeText": "Original projects text...",
    "afterText": "Polished projects text..."
  }
]
`;
    
    window.callGeminiOptimizerAPI(apiKey, prompt).then(resText => {
        let cleaned = resText.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
        else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
        cleaned = cleaned.trim();
        
        atsSuggestionsList = JSON.parse(cleaned);
        completedSuggestions = {};
        
        window.renderSuggestionsList();
    }).catch(err => {
        console.error("Suggestions analysis failed, loading fallback recommendations:", err);
        
        atsSuggestionsList = [
            {
                id: "summary",
                priority: "High",
                category: "Professional Summary",
                description: "Your summary is too generic. Include your years of experience, core skills, and career objective.",
                points: 8,
                actionText: "Improve Summary",
                beforeText: state.summary || "Results-driven Software Engineer with passion for tech.",
                afterText: `Highly accomplished professional specializing in software systems with a proven record of leading technical implementations, optimizing application workflows, and delivering high-performance scalable solutions.`
            },
            {
                id: "keywords",
                priority: "High",
                category: "Missing Keywords",
                description: "Your resume is missing important keywords for the selected job role. Suggested: React, REST API, Docker, CI/CD.",
                points: 6,
                actionText: "Add Keywords",
                beforeText: (state.skills || []).join(", "),
                afterText: "React, REST API, Docker, CI/CD"
            },
            {
                id: "experience",
                priority: "Medium",
                category: "Work Experience",
                description: "Use stronger action verbs and include measurable achievements where supported by your experience.",
                points: 5,
                actionText: "Improve Experience",
                beforeText: (state.experience && state.experience[0]) ? state.experience[0].desc : "Worked on web applications.",
                afterText: "- Spearheaded development of core features, boosting application load times by 35%.\n- Engineered database models saving 10+ hours of manual testing per week."
            },
            {
                id: "skills",
                priority: "Medium",
                category: "Skills Section",
                description: "Group skills into categories such as: Programming Languages, Frameworks, Databases, Tools, Cloud.",
                points: 4,
                actionText: "Organize Skills",
                beforeText: (state.skills || []).join(", "),
                afterText: `Programming Languages: ${state.skills ? state.skills.slice(0,3).join(', ') : 'JavaScript'}\nFrameworks: React, CSS\nTools: Git, Docker`
            },
            {
                id: "projects",
                priority: "Medium",
                category: "Projects",
                description: "Add technologies used, your role, and measurable outcomes for each project.",
                points: 3,
                actionText: "Improve Projects",
                beforeText: (state.projects && state.projects[0]) ? state.projects[0].desc : "Created personal application.",
                afterText: "- Designed and developed responsive dashboard improving user experience metrics by 25%.\n- Maximized codebase test coverage to 85%."
            }
        ];
        completedSuggestions = {};
        window.renderSuggestionsList();
    });
};

window.renderSuggestionsList = function() {
    const listContainer = document.getElementById("ats-suggestions-list");
    const countBadge = document.getElementById("ats-suggestions-count-badge");
    const potScoreBox = document.getElementById("ats-tracker-potential-score");
    const trackerPotentialList = document.getElementById("ats-tracker-potential-list");
    
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    if (trackerPotentialList) trackerPotentialList.innerHTML = "";
    
    let pendingCount = 0;
    let potentialScoreIncrease = 0;
    
    const sorted = [...atsSuggestionsList].sort((a, b) => {
        const aComp = completedSuggestions[a.id] ? 1 : 0;
        const bComp = completedSuggestions[b.id] ? 1 : 0;
        if (aComp !== bComp) return aComp - bComp;
        
        const prioMap = { High: 3, Medium: 2, Low: 1 };
        return prioMap[b.priority] - prioMap[a.priority];
    });
    
    sorted.forEach(s => {
        const isCompleted = completedSuggestions[s.id];
        if (!isCompleted) {
            pendingCount++;
            potentialScoreIncrease += s.points;
        }
        
        if (trackerPotentialList) {
            trackerPotentialList.innerHTML += `
                <span class="tracker-potential-chip ${isCompleted ? 'completed' : ''}">
                    ${isCompleted ? '<i class="fa-solid fa-circle-check"></i>' : `+${s.points}`} ${s.category}
                </span>
            `;
        }
        
        const diffOpen = s.isDiffOpen;
        const diffHtml = window.diffWords(s.beforeText, s.afterText);
        
        listContainer.innerHTML += `
            <div class="ats-suggestion-card ${isCompleted ? 'completed' : ''}">
                <div class="ats-suggestion-meta">
                    <span class="ats-suggestion-priority ${s.priority.toLowerCase()}">
                        <i class="fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
                        ${s.priority} Priority
                    </span>
                    <span class="ats-suggestion-points">+${s.points} Points</span>
                </div>
                <h4 class="ats-suggestion-category">${s.category}</h4>
                <p class="ats-suggestion-desc">${s.description}</p>
                
                <div class="ats-suggestion-action-row">
                    ${isCompleted ? `
                        <span class="ats-suggestion-check-badge"><i class="fa-solid fa-circle-check"></i> Completed</span>
                    ` : `
                        ${diffOpen ? '' : `<button class="btn btn-premium" style="font-size: 0.72rem; padding: 6px 14px;" onclick="window.triggerCardAIAction('${s.id}')"><i class="fa-solid fa-wand-magic-sparkles"></i> ${s.actionText}</button>`}
                    `}
                </div>
                
                ${diffOpen && !isCompleted ? `
                    <div class="card-diff-container" id="diff-container-${s.id}">
                        <div class="card-diff-columns">
                            <div class="card-diff-column">
                                <div class="card-diff-label">Original Content</div>
                                <div class="card-diff-content">${s.beforeText.replace(/\n/g, '<br>')}</div>
                            </div>
                            <div class="card-diff-column">
                                <div class="card-diff-label">AI Polished</div>
                                <div class="card-diff-content">${diffHtml.replace(/\n/g, '<br>')}</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button class="btn btn-secondary" style="font-size: 0.72rem; padding: 4px 10px;" onclick="window.rejectCardSuggestion('${s.id}')"><i class="fa-solid fa-xmark"></i> Reject</button>
                            <button class="btn btn-success" style="font-size: 0.72rem; padding: 4px 10px;" onclick="window.acceptCardSuggestion('${s.id}')"><i class="fa-solid fa-check"></i> Accept</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    if (countBadge) countBadge.innerText = `${pendingCount} Pending Suggestions`;
    
    const report = ATSAuditor.audit(state);
    if (potScoreBox) {
        potScoreBox.innerText = report.score + potentialScoreIncrease;
    }
};

window.triggerCardAIAction = function(id) {
    const suggestion = atsSuggestionsList.find(s => s.id === id);
    if (!suggestion) return;
    
    suggestion.isDiffOpen = true;
    window.renderSuggestionsList();
};

window.rejectCardSuggestion = function(id) {
    const suggestion = atsSuggestionsList.find(s => s.id === id);
    if (!suggestion) return;
    
    suggestion.isDiffOpen = false;
    window.renderSuggestionsList();
};

window.acceptCardSuggestion = function(id) {
    const suggestion = atsSuggestionsList.find(s => s.id === id);
    if (!suggestion) return;
    
    if (suggestion.id === "summary") {
        state.summary = suggestion.afterText;
        const summaryInput = document.getElementById("input-summary");
        if (summaryInput) summaryInput.value = state.summary;
    } else if (suggestion.id === "keywords") {
        const keywords = suggestion.afterText.split(",").map(k => k.trim());
        keywords.forEach(kw => {
            if (!state.skills) state.skills = [];
            if (!state.skills.includes(kw)) {
                state.skills.push(kw);
            }
        });
        renderSkillsTags();
    } else if (suggestion.id === "experience") {
        if (state.experience && state.experience.length > 0) {
            state.experience[0].desc = suggestion.afterText;
            renderExperienceList();
        }
    } else if (suggestion.id === "skills") {
        const keywords = suggestion.afterText.replace(/[\w\s]+:\s*/g, "").replace(/\n/g, ",").split(",").map(k => k.trim()).filter(Boolean);
        if (keywords.length > 0) {
            state.skills = keywords;
            renderSkillsTags();
        }
    } else if (suggestion.id === "projects") {
        if (state.projects && state.projects.length > 0) {
            state.projects[0].desc = suggestion.afterText;
            renderProjectsList();
        }
    } else if (suggestion.id === "formatting") {
        state.activeTemplate = "classic";
        const templateFilter = document.getElementById("template-filter");
        if (templateFilter) templateFilter.value = "classic";
    }
    
    completedSuggestions[id] = true;
    suggestion.isDiffOpen = false;
    
    saveState();
    renderResumePreview();
    
    const report = ATSAuditor.audit(state);
    window.animateScoreIncrease(report.score);
    
    window.renderSuggestionsList();
    showToast(`Applied ${suggestion.category} improvement successfully!`);
};

window.animateScoreIncrease = function(targetScore) {
    const currentScoreElement = document.getElementById("ats-tracker-current-score");
    if (!currentScoreElement) return;
    
    let startVal = parseInt(currentScoreElement.innerText) || 0;
    let endVal = targetScore;
    if (startVal === endVal) return;
    
    let duration = 800; // ms
    let startTime = null;
    
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = timestamp - startTime;
        let val = Math.min(startVal + Math.round((endVal - startVal) * (progress / duration)), endVal);
        
        currentScoreElement.innerText = val;
        
        const fill = document.getElementById("ats-tracker-progress-fill");
        if (fill) fill.style.width = `${val}%`;
        
        const tbBadge = document.getElementById("toolbar-ats-badge");
        if (tbBadge) tbBadge.innerText = val;
        
        if (progress < duration) {
            window.requestAnimationFrame(animate);
        } else {
            currentScoreElement.innerText = endVal;
        }
    }
    
    window.requestAnimationFrame(animate);
};

// ==========================================
// MULTI-PROFILE RESUME MANAGER CONTROLLER
// ==========================================
window.activeProfileId = "default";
window.profiles = [];

window.initProfiles = function() {
    const savedProfiles = localStorage.getItem('resumake_profiles');
    const savedActiveId = localStorage.getItem('resumake_active_profile_id');
    const savedState = localStorage.getItem('resumake_state');
    
    if (savedProfiles) {
        try {
            window.profiles = JSON.parse(savedProfiles);
            window.activeProfileId = savedActiveId || window.profiles[0].id;
        } catch (e) {
            console.error("Failed to parse profiles", e);
        }
    }
    
    if (window.profiles.length === 0) {
        let migrationData = null;
        if (savedState) {
            try {
                migrationData = JSON.parse(savedState);
            } catch (e) {}
        }
        
        const defaultProfile = {
            id: "default",
            name: "Default Profile",
            resumeData: migrationData || JSON.parse(JSON.stringify(state)),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        window.profiles = [defaultProfile];
        window.activeProfileId = "default";
        localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
        localStorage.setItem('resumake_active_profile_id', window.activeProfileId);
    }
    
    const active = window.profiles.find(p => p.id === window.activeProfileId) || window.profiles[0];
    if (active) {
        state = JSON.parse(JSON.stringify(active.resumeData));
        window.activeProfileId = active.id;
        localStorage.setItem('resumake_active_profile_id', window.activeProfileId);
    }
    
    window.renderProfileDropdown();
};

window.renderProfileDropdown = function() {
    const dropdown = document.getElementById("profile-select-dropdown");
    if (!dropdown) return;
    
    dropdown.innerHTML = "";
    window.profiles.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.innerText = p.name;
        if (p.id === window.activeProfileId) {
            opt.selected = true;
        }
        dropdown.appendChild(opt);
    });
};

window.switchProfile = function(profileId) {
    const activeIdx = window.profiles.findIndex(p => p.id === window.activeProfileId);
    if (activeIdx !== -1) {
        window.profiles[activeIdx].resumeData = JSON.parse(JSON.stringify(state));
        window.profiles[activeIdx].updatedAt = Date.now();
    }
    
    const target = window.profiles.find(p => p.id === profileId);
    if (target) {
        window.activeProfileId = target.id;
        state = JSON.parse(JSON.stringify(target.resumeData));
        localStorage.setItem('resumake_active_profile_id', window.activeProfileId);
        localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
        localStorage.setItem('resumake_state', JSON.stringify(state));
        
        setFormFields();
        updateSidebarBadges();
        renderExperienceList();
        renderEducationList();
        renderProjectsList();
        renderSkillsTags();
        renderResumePreview();
        updateATSScore();
        showToast(`Switched to profile: "${target.name}"`);
    }
};

window.createNewProfile = function() {
    const name = prompt("Enter a name for the new resume profile:");
    if (!name || name.trim() === "") return;
    
    const newId = "profile-" + Date.now();
    const newProfile = {
        id: newId,
        name: name.trim(),
        resumeData: {
            targetJob: "Software Developer",
            personal: { name: "", title: "", email: "", phone: "", address: "", website: "", linkedin: "", github: "" },
            summary: "",
            experience: [],
            education: [],
            skills: [],
            projects: [],
            languages: [],
            custom: [],
            activeTemplate: "modern"
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    const activeIdx = window.profiles.findIndex(p => p.id === window.activeProfileId);
    if (activeIdx !== -1) {
        window.profiles[activeIdx].resumeData = JSON.parse(JSON.stringify(state));
        window.profiles[activeIdx].updatedAt = Date.now();
    }
    
    window.profiles.push(newProfile);
    window.activeProfileId = newId;
    state = newProfile.resumeData;
    
    localStorage.setItem('resumake_active_profile_id', window.activeProfileId);
    localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
    localStorage.setItem('resumake_state', JSON.stringify(state));
    
    setFormFields();
    updateSidebarBadges();
    renderExperienceList();
    renderEducationList();
    renderProjectsList();
    renderSkillsTags();
    renderResumePreview();
    updateATSScore();
    window.renderProfileDropdown();
    showToast(`Created new profile: "${name}"`);
};

window.duplicateCurrentProfile = function() {
    const active = window.profiles.find(p => p.id === window.activeProfileId);
    if (!active) return;
    
    const newId = "profile-" + Date.now();
    const newProfile = {
        id: newId,
        name: active.name + " (Copy)",
        resumeData: JSON.parse(JSON.stringify(state)),
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    window.profiles.push(newProfile);
    window.activeProfileId = newId;
    state = newProfile.resumeData;
    
    localStorage.setItem('resumake_active_profile_id', window.activeProfileId);
    localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
    localStorage.setItem('resumake_state', JSON.stringify(state));
    
    setFormFields();
    updateSidebarBadges();
    renderExperienceList();
    renderEducationList();
    renderProjectsList();
    renderSkillsTags();
    renderResumePreview();
    updateATSScore();
    window.renderProfileDropdown();
    showToast(`Duplicated profile: "${newProfile.name}"`);
};

window.renameCurrentProfile = function() {
    const active = window.profiles.find(p => p.id === window.activeProfileId);
    if (!active) return;
    
    const name = prompt("Enter a new name for this profile:", active.name);
    if (!name || name.trim() === "") return;
    
    active.name = name.trim();
    active.updatedAt = Date.now();
    
    localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
    window.renderProfileDropdown();
    showToast(`Profile renamed to: "${active.name}"`);
};

window.deleteCurrentProfile = function() {
    if (window.profiles.length <= 1) {
        showToast("Cannot delete the only remaining profile.");
        return;
    }
    
    const active = window.profiles.find(p => p.id === window.activeProfileId);
    if (!active) return;
    
    const confirmDelete = confirm(`Are you sure you want to delete the profile "${active.name}"? This action cannot be undone.`);
    if (!confirmDelete) return;
    
    window.profiles = window.profiles.filter(p => p.id !== window.activeProfileId);
    window.activeProfileId = window.profiles[0].id;
    state = JSON.parse(JSON.stringify(window.profiles[0].resumeData));
    
    localStorage.setItem('resumake_active_profile_id', window.activeProfileId);
    localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
    localStorage.setItem('resumake_state', JSON.stringify(state));
    
    setFormFields();
    updateSidebarBadges();
    renderExperienceList();
    renderEducationList();
    renderProjectsList();
    renderSkillsTags();
    renderResumePreview();
    updateATSScore();
    window.renderProfileDropdown();
    showToast("Profile deleted successfully.");
};

// ==========================================
// RAW ATS PARSER SIMULATOR CONTROLLER
// ==========================================
let atsSimulatorActive = false;

window.toggleATSSimulator = function() {
    const toggleBtn = document.getElementById("ats-sim-toggle-btn");
    const scaler = document.getElementById("resume-sheet-scaler");
    const display = document.getElementById("ats-simulator-display");
    
    if (!toggleBtn || !scaler || !display) return;
    
    atsSimulatorActive = !atsSimulatorActive;
    if (atsSimulatorActive) {
        toggleBtn.classList.add("active");
        toggleBtn.style.background = "var(--primary-color)";
        toggleBtn.style.color = "white";
        
        scaler.style.display = "none";
        display.style.display = "block";
        
        window.runATSSimulation();
    } else {
        toggleBtn.classList.remove("active");
        toggleBtn.style.background = "";
        toggleBtn.style.color = "";
        
        scaler.style.display = "flex";
        display.style.display = "none";
    }
};

window.runATSSimulation = function() {
    const display = document.getElementById("ats-simulator-display");
    if (!display) return;
    
    const name = state.personal?.name || "";
    const email = state.personal?.email || "";
    const phone = state.personal?.phone || "";
    const address = state.personal?.address || "";
    const linkedin = state.personal?.linkedin || "";
    const github = state.personal?.github || "";
    
    let output = "";
    
    output += `========================================================\n`;
    output += `                 ATS PARSER SIMULATOR VIEW              \n`;
    output += `========================================================\n\n`;
    
    output += `[CANDIDATE INFORMATION]\n`;
    output += `Candidate Name:  ${name ? name : '[MISSING] (Critical Action Required)'}\n`;
    output += `Email Address:   ${email ? email : '[MISSING] (Critical Action Required)'}\n`;
    output += `Phone Number:    ${phone ? phone : '[MISSING] (Critical Action Required)'}\n`;
    output += `Address/Location:${address ? address : '[MISSING] (Medium Action Recommended)'}\n`;
    output += `LinkedIn Profile:${linkedin ? linkedin : '[NOT FOUND]'}\n`;
    output += `GitHub Account:  ${github ? github : '[NOT FOUND]'}\n\n`;
    
    output += `[PROFESSIONAL SUMMARY]\n`;
    output += `${state.summary ? state.summary : '[MISSING Summary Section]'}\n\n`;
    
    output += `[WORK HISTORY timeline]\n`;
    if (state.experience && state.experience.length > 0) {
        state.experience.forEach((exp, idx) => {
            output += `Timeline Record #${idx+1}:\n`;
            output += `  Role/Title: ${exp.role || '[MISSING]'}\n`;
            output += `  Company:    ${exp.company || '[MISSING]'}\n`;
            output += `  Date:       ${exp.date || '[MISSING]'}\n`;
            output += `  Details:\n${exp.desc || '[No achievements bulleted]'}\n\n`;
        });
    } else {
        output += `[WARNING] Work history could not be parsed.\n\n`;
    }
    
    output += `[EDUCATION HISTORY timeline]\n`;
    if (state.education && state.education.length > 0) {
        state.education.forEach((edu, idx) => {
            output += `Timeline Record #${idx+1}:\n`;
            output += `  Degree:     ${edu.degree || '[MISSING]'}\n`;
            output += `  Institution:${edu.school || '[MISSING]'}\n`;
            output += `  Date:       ${edu.date || '[MISSING]'}\n\n`;
        });
    } else {
        output += `[WARNING] Education records could not be parsed.\n\n`;
    }
    
    output += `[SKILLS KEYWORDS INDEX]\n`;
    const skills = state.skills || [];
    if (skills.length > 0) {
        output += `Keywords Detected: ${skills.join(', ')}\n`;
    } else {
        output += `[WARNING] No indexable skills keywords detected.\n`;
    }
    
    display.innerText = output;
};

// ==========================================
// STAR METHOD BULLET ASSISTANT CONTROLLER
// ==========================================
window.toggleStarHelper = function(expId) {
    const helper = document.getElementById(`star-helper-${expId}`);
    if (helper) {
        const isHidden = helper.style.display === "none";
        helper.style.display = isHidden ? "flex" : "none";
    }
};

window.generateStarBullet = function(expId) {
    const situation = document.getElementById(`star-s-${expId}`)?.value || "";
    const task = document.getElementById(`star-t-${expId}`)?.value || "";
    const action = document.getElementById(`star-a-${expId}`)?.value || "";
    const result = document.getElementById(`star-r-${expId}`)?.value || "";
    
    if (!situation && !task && !action && !result) {
        showToast("Please enter at least one field to synthesize.");
        return;
    }
    
    const outputContainer = document.getElementById(`star-output-container-${expId}`);
    const outputBox = document.getElementById(`star-output-${expId}`);
    
    if (outputContainer && outputBox) {
        outputContainer.style.display = "block";
        outputBox.innerText = "Generating STAR-structured bullet points...";
    }
    
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    if (apiKey) {
        const prompt = `
You are an expert resume writer. Synthesize the following STAR variables into a single high-impact bullet point for a resume.
Do NOT use first-person pronouns (I, me, my, we).
Use strong action verbs.
Highlight measurable metrics if provided.

STAR Details:
- Situation: ${situation}
- Task: ${task}
- Action: ${action}
- Result: ${result}

Output ONLY the single generated bullet text. No explanations or quotes.
`;
        window.callGeminiOptimizerAPI(apiKey, prompt).then(text => {
            let bullet = text.trim().replace(/^[-•*]\s*/, "");
            outputBox.innerText = bullet;
        }).catch(err => {
            console.error("Gemini STAR generation failed, falling back to local builder:", err);
            outputBox.innerText = window.localFallbackSTARBullet(situation, task, action, result);
        });
    } else {
        setTimeout(() => {
            outputBox.innerText = window.localFallbackSTARBullet(situation, task, action, result);
        }, 800);
    }
};

window.localFallbackSTARBullet = function(situation, task, action, result) {
    const s = situation ? situation.trim().charAt(0).toLowerCase() + situation.slice(1) : "";
    const t = task ? task.trim().charAt(0).toLowerCase() + task.slice(1) : "";
    const a = action ? action.trim().charAt(0).toUpperCase() + action.slice(1) : "";
    const r = result ? result.trim().charAt(0).toLowerCase() + result.slice(1) : "";
    
    let bullet = "";
    if (a) {
        bullet += `${a}`;
    } else {
        bullet += `Executed critical responsibilities`;
    }
    
    if (t) {
        bullet += ` targeting ${t}`;
    }
    if (s) {
        bullet += ` to address ${s}`;
    }
    if (r) {
        bullet += `, resulting in ${r}`;
    }
    
    return "- " + bullet.trim().replace(/\.$/, "") + ".";
};

window.rejectStarBullet = function(expId) {
    const container = document.getElementById(`star-output-container-${expId}`);
    if (container) container.style.display = "none";
};

window.insertStarBullet = function(expId) {
    const text = document.getElementById(`star-output-${expId}`)?.innerText;
    if (!text) return;
    
    const exp = state.experience.find(e => e.id === expId);
    if (exp) {
        let currentDesc = exp.desc || "";
        if (currentDesc && !currentDesc.endsWith("\n")) {
            currentDesc += "\n";
        }
        currentDesc += text;
        exp.desc = currentDesc;
        
        renderExperienceList();
        saveState();
        renderResumePreview();
        showToast("STAR bullet appended to experience details!");
    }
};

// ==========================================
// THEME-MATCHED COVER LETTER LAYOUT PREVIEW
// ==========================================
window.previewCoverLetterTheme = function() {
    const clText = document.getElementById("ai-cl-result-text")?.value;
    if (!clText || clText.startsWith("Drafting")) {
        showToast("Please generate a Cover Letter first.");
        return;
    }
    
    const modal = document.getElementById("cover-letter-preview-modal");
    if (!modal) return;
    
    modal.classList.add("open");
    
    const subtitle = document.getElementById("cover-letter-theme-subtitle");
    if (subtitle) {
        subtitle.innerText = `Inheriting "${state.activeTemplate.toUpperCase()}" Layout Theme`;
    }
    
    const sheet = document.getElementById("cover-letter-preview-sheet");
    if (!sheet) return;
    
    sheet.className = `resume-sheet t-${state.activeTemplate}`;
    
    const name = state.personal?.name || "Candidate Name";
    const title = state.personal?.title || state.targetJob || "Software Engineer";
    const email = state.personal?.email || "email@example.com";
    const phone = state.personal?.phone || "(123) 456-7890";
    const address = state.personal?.address || "City, Country";
    const linkedin = state.personal?.linkedin || "";
    const github = state.personal?.github || "";
    
    let headerHtml = "";
    
    if (state.activeTemplate === "modern" || state.activeTemplate === "executive") {
        headerHtml = `
            <div class="resume-header">
                <h1 class="name-preview">${name}</h1>
                <div class="title-preview">${title}</div>
                <div class="contact-preview">
                    <span><i class="fa-solid fa-envelope"></i> ${email}</span>
                    <span><i class="fa-solid fa-phone"></i> ${phone}</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${address}</span>
                    ${linkedin ? `<span><i class="fa-brands fa-linkedin"></i> ${linkedin}</span>` : ''}
                </div>
            </div>
        `;
    } else if (state.activeTemplate === "us" || state.activeTemplate === "classic") {
        headerHtml = `
            <div class="resume-header" style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">
                <h1 style="font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${name}</h1>
                <div style="font-size: 11px; margin-bottom: 4px; font-weight: 600;">${title}</div>
                <div style="font-size: 10px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                    <span>${email}</span> | <span>${phone}</span> | <span>${address}</span>
                    ${linkedin ? `| <span>${linkedin}</span>` : ''}
                </div>
            </div>
        `;
    } else {
        headerHtml = `
            <div class="resume-header" style="border-bottom: 1.5px solid var(--border-color); padding-bottom: 10px; margin-bottom: 16px;">
                <h1 style="font-size: 1.6rem; font-weight: 700; margin-bottom: 2px;">${name}</h1>
                <div style="font-size: 0.9rem; color: var(--primary-color); font-weight: 600; margin-bottom: 6px;">${title}</div>
                <div style="display: flex; gap: 12px; font-size: 0.75rem; color: #475569; flex-wrap: wrap;">
                    <span>${email}</span>
                    <span>${phone}</span>
                    <span>${address}</span>
                </div>
            </div>
        `;
    }
    
    const paragraphs = clText.split("\n\n").map(p => p.trim()).filter(Boolean);
    const bodyHtml = paragraphs.map(p => `<p style="font-size: 0.82rem; line-height: 1.5; margin-bottom: 12px; color: #334155; text-align: left;">${p}</p>`).join('');
    
    sheet.innerHTML = `
        ${headerHtml}
        <div class="cover-letter-content-body" style="padding: 20px 0; text-align: left;">
            <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 16px;">
                Date: ${new Date().toLocaleDateString()}
            </div>
            ${bodyHtml}
        </div>
    `;
};

window.closeCoverLetterPreviewModal = function() {
    const modal = document.getElementById("cover-letter-preview-modal");
    if (modal) modal.classList.remove("open");
};

window.printCoverLetter = function() {
    window.print();
};

// ==========================================
// AI PRACTICE INTERVIEW CONTROLLER
// ==========================================
let practiceQuestionsList = [];
let evaluatedAnswersList = {};

window.openInterviewPracticeModal = function() {
    const modal = document.getElementById("ats-interview-practice-modal");
    if (!modal) return;
    
    modal.classList.add("open");
    
    const startPane = document.getElementById("interview-start-pane");
    const dashboard = document.getElementById("interview-dashboard");
    
    if (practiceQuestionsList.length > 0) {
        startPane.style.display = "none";
        dashboard.style.display = "flex";
        window.renderInterviewDashboard();
    } else {
        startPane.style.display = "flex";
        dashboard.style.display = "none";
    }
};

window.closeInterviewPracticeModal = function() {
    const modal = document.getElementById("ats-interview-practice-modal");
    if (modal) modal.classList.remove("open");
};

window.generateInterviewQuestions = function() {
    const startPane = document.getElementById("interview-start-pane");
    const dashboard = document.getElementById("interview-dashboard");
    const questionsContainer = document.getElementById("interview-questions-list");
    
    if (!startPane || !dashboard || !questionsContainer) return;
    
    startPane.style.display = "none";
    dashboard.style.display = "flex";
    
    questionsContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; gap: 10px;">
            <div class="loading-spinner"></div>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Analyzing target profile to formulate interview scenarios...</span>
        </div>
    `;
    
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const jdText = document.getElementById("ats-jd-text")?.value || state.targetJob || "Software Engineer";
    
    if (apiKey) {
        const prompt = `
You are an expert interviewer. Generate 3 tailored practice interview questions based on the candidate's resume and target job.
Include:
- 1 Technical question matching their skills.
- 1 Behavioral question matching their experience.
- 1 Resume-specific question asking details about their work history.

Resume Details:
${JSON.stringify(state, null, 2)}

Target Job: ${jdText}

Strictly output ONLY a valid JSON array of questions. Do not include markdown code ticks.
Expected Output Format:
[
  {
    "id": "q1",
    "type": "Technical",
    "question": "Custom question here..."
  },
  {
    "id": "q2",
    "type": "Behavioral",
    "question": "Custom question here..."
  },
  {
    "id": "q3",
    "type": "Resume-Specific",
    "question": "Custom question here..."
  }
]
`;
        window.callGeminiOptimizerAPI(apiKey, prompt).then(text => {
            let cleaned = text.trim();
            if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
            else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
            if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
            cleaned = cleaned.trim();
            
            practiceQuestionsList = JSON.parse(cleaned);
            evaluatedAnswersList = {};
            window.renderInterviewDashboard();
        }).catch(err => {
            console.error("AI Interview questions failed, using fallback list:", err);
            window.loadFallbackInterviewQuestions(jdText);
        });
    } else {
        setTimeout(() => {
            window.loadFallbackInterviewQuestions(jdText);
        }, 1200);
    }
};

window.loadFallbackInterviewQuestions = function(jdText) {
    practiceQuestionsList = [
        {
            id: "q1",
            type: "Technical",
            question: `Can you explain your experience using standard architectural models for ${jdText || 'software system design'}?`
        },
        {
            id: "q2",
            type: "Behavioral",
            question: "Describe a situation where you encountered a major technical bottleneck. How did you diagnose the root cause and resolve it?"
        },
        {
            id: "q3",
            type: "Resume-Specific",
            question: `Explain how you leveraged your skill keywords: ${(state.skills || []).slice(0, 4).join(', ') || 'coding'} to optimize accomplishments in your recent role.`
        }
    ];
    evaluatedAnswersList = {};
    window.renderInterviewDashboard();
};

window.renderInterviewDashboard = function() {
    const container = document.getElementById("interview-questions-list");
    if (!container) return;
    
    container.innerHTML = "";
    practiceQuestionsList.forEach(q => {
        const feedback = evaluatedAnswersList[q.id];
        
        container.innerHTML += `
            <div class="ats-suggestion-card" style="background: rgba(255,255,255,0.01); border-color: rgba(255,255,255,0.03); margin-bottom: 16px;">
                <div class="ats-suggestion-meta">
                    <span class="ats-suggestion-priority low"><i class="fa-solid fa-circle-question"></i> ${q.type} Question</span>
                </div>
                <h4 style="margin: 0 0 10px 0; color: white; font-size: 0.85rem; line-height: 1.4; text-align: left;">${q.question}</h4>
                
                <div class="form-group" style="margin-bottom: 10px;">
                    <textarea id="interview-ans-${q.id}" placeholder="Type your answer here..." style="width: 100%; font-size: 0.8rem; background: rgba(0,0,0,0.25); height: 80px; resize: vertical; padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); color: white; outline: none;"></textarea>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-primary" style="font-size: 0.72rem; padding: 4px 10px;" id="eval-btn-${q.id}" onclick="window.evaluateInterviewAnswer('${q.id}')">
                        <i class="fa-solid fa-award"></i> Evaluate Answer
                    </button>
                </div>
                
                <div id="eval-feedback-${q.id}" style="display: ${feedback ? 'block' : 'none'}; margin-top: 14px; padding-top: 14px; border-top: 1px dashed rgba(255,255,255,0.08); text-align: left;">
                    ${feedback ? window.getFeedbackMarkup(feedback) : ''}
                </div>
            </div>
        `;
        
        const textarea = document.getElementById(`interview-ans-${q.id}`);
        if (textarea && q.userAnswer) {
            textarea.value = q.userAnswer;
        }
    });
};

window.getFeedbackMarkup = function(fb) {
    return `
        <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
            <div style="margin-bottom: 8px;"><strong style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Strengths:</strong><br>${fb.strengths}</div>
            <div style="margin-bottom: 8px;"><strong style="color: var(--warning);"><i class="fa-solid fa-triangle-exclamation"></i> Areas for Improvement:</strong><br>${fb.improvements}</div>
            <div><strong style="color: #a78bfa;"><i class="fa-solid fa-lightbulb"></i> Recommended Answer Outline:</strong><br>${fb.sampleAnswer}</div>
        </div>
    `;
};

window.evaluateInterviewAnswer = function(qId) {
    const q = practiceQuestionsList.find(item => item.id === qId);
    if (!q) return;
    
    const answer = document.getElementById(`interview-ans-${qId}`)?.value || "";
    q.userAnswer = answer;
    
    if (answer.trim() === "") {
        showToast("Please type an answer to evaluate.");
        return;
    }
    
    const feedbackBox = document.getElementById(`eval-feedback-${qId}`);
    const evalBtn = document.getElementById(`eval-btn-${qId}`);
    
    if (feedbackBox && evalBtn) {
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary);">
                <div class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
                <span>Evaluating your response against industry expectations...</span>
            </div>
        `;
        evalBtn.disabled = true;
    }
    
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    if (apiKey) {
        const prompt = `
You are an expert tech interviewer. Evaluate the candidate's answer for the following question.
Question: ${q.question}
Candidate's Answer: ${answer}

Provide feedback detailing:
- Strengths of their response.
- Missing details they should have included.
- A strong sample answer or outline.

Strictly output ONLY a valid JSON object matching this schema:
{
  "strengths": "Feedback on strengths...",
  "improvements": "Feedback on improvements...",
  "sampleAnswer": "Recommended outline or strong sample answer..."
}
`;
        window.callGeminiOptimizerAPI(apiKey, prompt).then(text => {
            let cleaned = text.trim();
            if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
            else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
            if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
            cleaned = cleaned.trim();
            
            const feedback = JSON.parse(cleaned);
            evaluatedAnswersList[qId] = feedback;
            
            if (feedbackBox && evalBtn) {
                feedbackBox.innerHTML = window.getFeedbackMarkup(feedback);
                evalBtn.disabled = false;
            }
        }).catch(err => {
            console.error("AI Evaluation failed, using local rule-based builder:", err);
            window.loadFallbackEvaluation(qId, answer, feedbackBox, evalBtn);
        });
    } else {
        setTimeout(() => {
            window.loadFallbackEvaluation(qId, answer, feedbackBox, evalBtn);
        }, 1000);
    }
};

window.loadFallbackEvaluation = function(qId, answer, feedbackBox, evalBtn) {
    const feedback = {
        strengths: "Your answer provides clear background context and shows active involvement in solving technical tasks.",
        improvements: "Quantify the outcome of your actions using measurable metrics (e.g. performance speed-ups or hours saved).",
        sampleAnswer: "Start with a high-level Situation description. Next, detail the Action you spearheaded, and conclude with the Result metric."
    };
    
    evaluatedAnswersList[qId] = feedback;
    if (feedbackBox && evalBtn) {
        feedbackBox.innerHTML = window.getFeedbackMarkup(feedback);
        evalBtn.disabled = false;
    }
};
