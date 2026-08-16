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

// Delegate global saveState helper to autoSave if defined, otherwise fall back to localStorage
window.saveState = function() {
    if (typeof window.autoSave === "function") {
        window.autoSave();
    } else if (typeof autoSave === "function") {
        autoSave();
    } else {
        localStorage.setItem('resumake_state', JSON.stringify(state));
    }
};

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
        "marketing": ["marketing", "seo", "sem", "analytics", "content", "campaign", "conversion", "google analytics", "brand", "social media", "crm"],
        "science": ["laboratory", "research", "experiment", "analysis", "data", "quality control", "compliance", "safety", "protocol", "documentation", "culture", "testing"],
        "finance": ["accounting", "finance", "audit", "budget", "ledger", "reconciliation", "tax", "forecast", "compliance", "report", "excel", "sheets"],
        "sales": ["sales", "revenue", "deal", "client", "customer", "pipeline", "b2b", "negotiation", "relationship", "growth", "crm", "funnel"],
        "support": ["support", "customer", "service", "ticket", "sla", "resolution", "csat", "troubleshoot", "client", "communication", "helpdesk"],
        "healthcare": ["patient", "clinical", "nursing", "medical", "treatment", "safety", "documentation", "healthcare", "care", "compliance", "charts"],
        "legal": ["legal", "contract", "compliance", "agreement", "research", "attorney", "policy", "litigation", "risk", "negotiation", "audit"],
        "education": ["curriculum", "instruction", "student", "classroom", "lesson plan", "education", "training", "assessment", "learning", "pedagogy", "grading"],
        "hr": ["hr", "recruitment", "talent", "employee", "onboarding", "performance", "training", "relations", "compliance", "sourcing", "payroll"],
        "writing": ["content", "seo", "writing", "editing", "copywriting", "publishing", "editorial", "blog", "portfolio", "documentation", "copy"],
        "generic": ["management", "leadership", "organization", "project", "strategy", "collaboration", "communication", "planning", "operations", "execution", "planning"]
    },

    detectCategory(title) {
        if (!title) return "generic";
        title = title.toLowerCase();
        if (title.includes("software") || title.includes("developer") || title.includes("engineer") || title.includes("backend") || title.includes("full stack")) {
            if (title.includes("web") || title.includes("frontend")) return "web";
            return "software";
        }
        if (title.includes("bio") || title.includes("micro") || title.includes("chem") || title.includes("medical") || title.includes("clinical") || title.includes("science") || title.includes("lab") || title.includes("doctor") || title.includes("physician") || title.includes("therapist")) return "science";
        if (title.includes("data") || title.includes("analyst") || title.includes("science") || title.includes("ml") || title.includes("ai")) return "data";
        if (title.includes("design") || title.includes("ux") || title.includes("ui") || title.includes("artist") || title.includes("illustrator") || title.includes("product designer")) return "design";
        if (title.includes("product") || title.includes("manager") || title.includes("owner") || title.includes("scrum") || title.includes("agile")) return "product";
        if (title.includes("market") || title.includes("growth") || title.includes("seo") || title.includes("brand")) return "marketing";
        if (title.includes("finance") || title.includes("accounting") || title.includes("accountant") || title.includes("audit") || title.includes("tax") || title.includes("budget")) return "finance";
        if (title.includes("sales") || title.includes("sell") || title.includes("representative") || title.includes("business development") || title.includes("account manager")) return "sales";
        if (title.includes("support") || title.includes("customer") || title.includes("service") || title.includes("help") || title.includes("ticket") || title.includes("client relations")) return "support";
        if (title.includes("nurse") || title.includes("healthcare") || title.includes("patient") || title.includes("clinic") || title.includes("care")) return "healthcare";
        if (title.includes("legal") || title.includes("law") || title.includes("contract") || title.includes("attorney") || title.includes("paralegal") || title.includes("compliance")) return "legal";
        if (title.includes("teacher") || title.includes("education") || title.includes("school") || title.includes("professor") || title.includes("instructor") || title.includes("train")) return "education";
        if (title.includes("hr") || title.includes("human resources") || title.includes("recruit") || title.includes("talent") || title.includes("onboard")) return "hr";
        if (title.includes("write") || title.includes("content") || title.includes("edit") || title.includes("copywriter") || title.includes("journal")) return "writing";
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
        
        // 1. Contact Information Check (Max 10 points)
        let contactScore = 0;
        if (resumeData.name && resumeData.name.trim().length > 2) contactScore += 2;
        if (resumeData.email && resumeData.email.includes("@")) {
            contactScore += 3;
        } else {
            suggestions.push({ type: "danger", text: "Missing valid Email Address. ATS systems require a parsed contact email." });
        }
        if (resumeData.phone && resumeData.phone.trim().length > 5) {
            contactScore += 3;
        } else {
            suggestions.push({ type: "warning", text: "Missing Phone Number. Employers cannot contact you automatically." });
        }
        if (resumeData.location && resumeData.location.trim().length > 3) {
            contactScore += 2;
        } else {
            suggestions.push({ type: "warning", text: "Missing City/Location. Parsers often filter candidates based on local geofencing." });
        }
        
        if (contactScore === 10) {
            suggestions.push({ type: "success", text: "Contact Information is complete and easily parsable." });
        }
        score += contactScore;

        // 2. Sections Completeness (Max 15 points)
        let sectionsScore = 0;
        
        // Work Experience
        if (resumeData.experience && resumeData.experience.length > 0) {
            sectionsScore += 7;
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
            sectionsScore += 4;
        } else {
            suggestions.push({ type: "danger", text: "Missing Education. Standard parsers scan for degrees or academic timelines." });
        }

        // Skills
        if (resumeData.skills && resumeData.skills.length >= 6) {
            sectionsScore += 4;
        } else if (resumeData.skills && resumeData.skills.length > 0) {
            sectionsScore += 2;
            suggestions.push({ type: "warning", text: `Only ${resumeData.skills.length} skills listed. Aim for 8-15 core skills to match search filters.` });
        } else {
            suggestions.push({ type: "danger", text: "Skills section is empty. Critical technical and soft skills must be explicitly named." });
        }
        score += sectionsScore;

        // 3. Bullet Point Formatting (Max 10 points)
        let formattingScore = 10;
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
                formattingScore = 2;
                suggestions.push({ type: "danger", text: "Format experience items as a bulleted list. Paragraph blocks break parser tokenizers." });
            } else if (paragraphsCount > bulletsCount) {
                formattingScore = 6;
                suggestions.push({ type: "warning", text: "Mixed paragraphs and bullets. Convert all duties into action-verb bullet points." });
            } else {
                suggestions.push({ type: "success", text: "Excellent bullet-point formatting utilized in experience descriptions." });
            }
        } else {
            formattingScore = 0;
        }
        score += formattingScore;

        // 4. Job Description Keyword Matching (Max 35 points)
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
                keywordScore = Math.round(matchRatio * 35);
                
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
                keywordScore = Math.round(matchRatio * 35);
                
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

        // 5. Action Verb vs Buzzword Audit (Max 20 points)
        let verbScore = 0;
        const weakBuzzwords = ["responsible for", "helped", "assisted", "managed", "worked on", "handled", "duties included", "experienced in", "team player", "detail oriented", "hard working", "self motivated"];
        const strongActionVerbs = ["spearheaded", "engineered", "optimized", "implemented", "designed", "architected", "developed", "executed", "accelerated", "decreased", "increased", "maximized", "minimized", "pioneered", "orchestrated", "streamlined", "formulated", "conceptualized", "delivered"];
        
        let weakCount = 0;
        let strongCount = 0;
        let detectedWeak = [];

        weakBuzzwords.forEach(buzz => {
            const escaped = buzz.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
            const matches = fullResumeText.match(regex);
            if (matches) {
                weakCount += matches.length;
                detectedWeak.push(buzz);
            }
        });

        strongActionVerbs.forEach(verb => {
            const escaped = verb.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
            const matches = fullResumeText.match(regex);
            if (matches) {
                strongCount += matches.length;
            }
        });

        if (strongCount > 0) {
            verbScore += Math.min(15, strongCount * 3);
        }
        if (weakCount === 0 && strongCount > 2) {
            verbScore += 5;
        } else {
            verbScore -= Math.min(5, weakCount * 2);
        }
        verbScore = Math.max(0, Math.min(20, verbScore));
        score += verbScore;

        if (detectedWeak.length > 0) {
            suggestions.push({ 
                type: "warning", 
                text: `Detected weak buzzwords: "${detectedWeak.join(', ')}". Replace them with action-oriented phrases (e.g. replace 'responsible for' with 'spearheaded').` 
            });
        }
        if (strongCount >= 3) {
            suggestions.push({ 
                type: "success", 
                text: `Excellent usage of strong action verbs (${strongCount} detected).` 
            });
        } else {
            suggestions.push({ 
                type: "warning", 
                text: `Only ${strongCount} strong action verbs detected. Infuse achievements with active verbs like 'spearheaded', 'optimized', or 'engineered'.` 
            });
        }

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

        // 7. Country-Specific Rules (Adjusts score based on local conventions)
        const targetCountry = resumeData.targetCountry || "US";
        if (targetCountry === "US" || targetCountry === "UK" || targetCountry === "AU") {
            // US/UK/AU resumes should not contain age/DOB, nationality, marital status, or gender due to strict discrimination laws.
            let hasSensitive = false;
            if (resumeData.dob && resumeData.dob.trim().length > 0) {
                score -= 6;
                suggestions.push({ type: "danger", text: `US/UK/AU Rule: Remove Date of Birth (${resumeData.dob}) to avoid age discrimination rejection.` });
                hasSensitive = true;
            }
            if (resumeData.nationality && resumeData.nationality.trim().length > 0) {
                score -= 6;
                suggestions.push({ type: "danger", text: `US/UK/AU Rule: Remove Nationality (${resumeData.nationality}) to satisfy anti-bias hiring filters.` });
                hasSensitive = true;
            }
            if (resumeData.maritalStatus && resumeData.maritalStatus.trim().length > 0) {
                score -= 6;
                suggestions.push({ type: "danger", text: `US/UK/AU Rule: Remove Marital Status / Gender (${resumeData.maritalStatus}) to maintain standard compliance.` });
                hasSensitive = true;
            }
            if (!hasSensitive) {
                suggestions.push({ type: "success", text: `US/UK/AU Compliance: No sensitive details (DOB, Nationality, Marital Status) identified.` });
            }
        } else if (targetCountry === "GCC") {
            // GCC resumes require nationality, visa status, and marital status.
            let missingGCC = [];
            if (!resumeData.nationality || resumeData.nationality.trim().length === 0) {
                score -= 6;
                missingGCC.push("Nationality");
            }
            if (!resumeData.visaStatus || resumeData.visaStatus.trim().length === 0) {
                score -= 6;
                missingGCC.push("Visa Status");
            }
            if (!resumeData.maritalStatus || resumeData.maritalStatus.trim().length === 0) {
                score -= 6;
                missingGCC.push("Marital Status");
            }
            if (missingGCC.length > 0) {
                suggestions.push({ type: "danger", text: `GCC Rule: Missing sponsorship fields: ${missingGCC.join(', ')}.` });
            } else {
                suggestions.push({ type: "success", text: "GCC Alignment: Key sponsorship metadata (Nationality, Visa, Marital Status) is fully specified." });
            }
        } else if (targetCountry === "EU" || targetCountry === "IN") {
            // European and Indian resumes expect DOB and languages.
            let missingEUIN = [];
            if (!resumeData.dob || resumeData.dob.trim().length === 0) {
                score -= 5;
                missingEUIN.push("Date of Birth");
            }
            if (!resumeData.languages || resumeData.languages.trim().length === 0) {
                score -= 5;
                missingEUIN.push("Languages Known");
            }
            if (missingEUIN.length > 0) {
                suggestions.push({ type: "warning", text: `${targetCountry} Expectation: Missing standard details: ${missingEUIN.join(', ')}.` });
            } else {
                suggestions.push({ type: "success", text: `${targetCountry} Alignment: Standard metadata (DOB, Languages) is complete.` });
            }
        }

        // 8. Dynamic Brand Alignment (Color Theme Suggestion)
        const jobTitle = (resumeData.targetJob || resumeData.title || "").toLowerCase();
        let recommendedTheme = "cobalt";
        let recommendedThemeLabel = "Midnight Neon (Cobalt)";
        let themeReason = "established corporate fields requiring trust, structure, and professional authority";
        
        if (jobTitle.includes("finance") || jobTitle.includes("bank") || jobTitle.includes("law") || jobTitle.includes("attorney") || jobTitle.includes("consultant") || jobTitle.includes("advisor") || jobTitle.includes("accountant") || jobTitle.includes("exec") || jobTitle.includes("director")) {
            recommendedTheme = "cobalt";
            recommendedThemeLabel = "Midnight Neon (Cobalt)";
            themeReason = "established corporate fields requiring trust, structure, and professional authority";
        } else if (jobTitle.includes("green") || jobTitle.includes("eco") || jobTitle.includes("env") || jobTitle.includes("forest") || jobTitle.includes("mint") || jobTitle.includes("bio") || jobTitle.includes("medi") || jobTitle.includes("doctor") || jobTitle.includes("nurse") || jobTitle.includes("health")) {
            recommendedTheme = "emerald";
            recommendedThemeLabel = "Forest Mint (Emerald)";
            themeReason = "health, sustainability, medical care, and wellness industries denoting growth and restoration";
        } else if (jobTitle.includes("creat") || jobTitle.includes("design") || jobTitle.includes("art") || jobTitle.includes("ux") || jobTitle.includes("ui") || jobTitle.includes("product") || jobTitle.includes("market") || jobTitle.includes("brand") || jobTitle.includes("adv")) {
            recommendedTheme = "amethyst";
            recommendedThemeLabel = "Cyberpunk Orchid (Amethyst)";
            themeReason = "creative tech, designs, branding, and marketing domains requiring visual novelty and innovation";
        } else if (jobTitle.includes("sale") || jobTitle.includes("customer") || jobTitle.includes("relat") || jobTitle.includes("deal") || jobTitle.includes("growth") || jobTitle.includes("startup") || jobTitle.includes("entre")) {
            recommendedTheme = "amber";
            recommendedThemeLabel = "Sunset Flare (Amber)";
            themeReason = "high-energy, client-facing sales, or startup roles denoting drive, warmth, and vitality";
        } else if (jobTitle.includes("teal") || jobTitle.includes("aurora") || jobTitle.includes("tech") || jobTitle.includes("software") || jobTitle.includes("cloud") || jobTitle.includes("ops") || jobTitle.includes("dev")) {
            recommendedTheme = "aurora";
            recommendedThemeLabel = "Nordic Aurora (Teal)";
            themeReason = "cloud, operations, and modern tech environments requiring a clean, futuristic balance";
        } else if (jobTitle.includes("luxury") || jobTitle.includes("fash") || jobTitle.includes("gold") || jobTitle.includes("hotel") || jobTitle.includes("hospi") || jobTitle.includes("vip") || jobTitle.includes("service")) {
            recommendedTheme = "champagne";
            recommendedThemeLabel = "Rose Gold Champagne";
            themeReason = "premium hospitality, luxury branding, VIP services, or executive fashion requiring elegance";
        }

        const activeTheme = localStorage.getItem("resumake_theme_accent") || "cobalt";
        if (activeTheme === recommendedTheme) {
            suggestions.push({
                type: "success",
                text: `Brand Color Alignment: Your selected color theme matches the recommended palette for ${resumeData.targetJob || "your role"} (${recommendedThemeLabel})!`
            });
        } else {
            suggestions.push({
                type: "warning",
                text: `Brand Color Alignment: A "${recommendedThemeLabel}" theme is suggested for "${resumeData.targetJob || "your role"}" (${themeReason}). <a href="javascript:void(0)" onclick="window.setThemeAccent('${recommendedTheme}'); window.calculateJDMatch(); showToast('Applied theme: ${recommendedThemeLabel}!');" style="color:var(--primary); font-weight:600; text-decoration:underline; margin-left:4px;">Apply Theme</a>`
            });
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
    state.targetCountry = country;
    if (window.saveState) window.saveState();
    else if (typeof autoSave === "function") autoSave();
    
    if (window.updateATSScore) {
        window.updateATSScore();
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
    let matchScore = auditResult.jdMode ? Math.round((auditResult.matchedKeywords.length / auditResult.extractedKeywords.length) * 100) : 0;
    if (matchScoreElement) {
        matchScoreElement.innerText = `${matchScore}%`;
        if (matchScore >= 80) matchScoreElement.style.color = "var(--success)";
        else if (matchScore >= 50) matchScoreElement.style.color = "var(--warning)";
        else matchScoreElement.style.color = "var(--danger)";
    }
    
    // Sync to Sidebar Match Progress Gauge
    const sidebarPct = document.getElementById("sidebar-ats-pct");
    const sidebarBar = document.getElementById("sidebar-ats-progress-bar");
    const sidebarBarContainer = document.getElementById("sidebar-ats-progress-container");
    if (sidebarPct && sidebarBar && sidebarBarContainer) {
        if (auditResult.jdMode && auditResult.extractedKeywords.length > 0) {
            sidebarBarContainer.style.display = "block";
            sidebarPct.style.display = "inline";
            sidebarPct.innerText = `${matchScore}%`;
            sidebarBar.style.width = `${matchScore}%`;
            if (matchScore >= 80) {
                sidebarBar.style.backgroundColor = "var(--success)";
                sidebarPct.style.color = "var(--success)";
            } else if (matchScore >= 50) {
                sidebarBar.style.backgroundColor = "var(--warning)";
                sidebarPct.style.color = "var(--warning)";
            } else {
                sidebarBar.style.backgroundColor = "var(--danger)";
                sidebarPct.style.color = "var(--danger)";
            }
        } else {
            sidebarBarContainer.style.display = "none";
            sidebarPct.style.display = "none";
        }
    }
    
    // Render Matched
    const matchedContainer = document.getElementById("ats-matched-keywords");
    if (matchedContainer) {
        matchedContainer.innerHTML = "";
        if (auditResult.matchedKeywords.length > 0) {
            auditResult.matchedKeywords.forEach(kw => {
                matchedContainer.innerHTML += `<span class="keyword-chip matched"><i class="fa-solid fa-check"></i> ${kw}</span>`;
            });
        }
    }
    
    // Render sidebar matched & missing keywords
    const sidebarKeywordsContainer = document.getElementById("sidebar-job-keywords");
    if (sidebarKeywordsContainer) {
        sidebarKeywordsContainer.innerHTML = "";
        if (auditResult.jdMode && auditResult.extractedKeywords.length > 0) {
            auditResult.matchedKeywords.forEach(kw => {
                sidebarKeywordsContainer.innerHTML += `<span class="keyword-chip matched" style="font-size: 0.65rem; padding: 2px 6px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-check"></i> ${kw}</span>`;
            });
            auditResult.missingKeywords.forEach(kw => {
                sidebarKeywordsContainer.innerHTML += `<span class="keyword-chip missing" onclick="window.injectKeyword('${kw.replace(/'/g, "\\'")}')" style="font-size: 0.65rem; padding: 2px 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Click to add skill to resume"><i class="fa-solid fa-plus"></i> ${kw}</span>`;
            });
        } else {
            sidebarKeywordsContainer.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-secondary); font-style: italic;">Paste a job description to trigger parser alignment.</span>`;
        }
    }
};

window.addSkillDirectly = function(kw) {
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

window.injectKeyword = function(kw) {
    // Check if user has any experiences
    if (!state.experience || state.experience.length === 0) {
        // Fallback: just add to skills if no experiences exist
        window.addSkillDirectly(kw);
        return;
    }

    // Create a glassy selection overlay
    const overlay = document.createElement("div");
    overlay.id = "keyword-weave-overlay";
    overlay.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(10,11,16,0.85); backdrop-filter:blur(8px); display:flex; justify-content:center; align-items:center; z-index:100000; transition: opacity 0.3s ease;";
    
    let expOptions = state.experience.map(exp => `
        <button class="btn btn-outline" style="justify-content:flex-start; text-align:left; width:100%; font-size:0.8rem; margin-bottom:8px; padding:10px; height:auto; color:white; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); cursor:pointer;" onclick="window.handleWeaveChoice('${kw.replace(/'/g, "\\'")}', '${exp.id}')">
            <i class="fa-solid fa-briefcase" style="color:var(--primary); margin-right:8px;"></i>
            <span style="display:flex; flex-direction:column; gap:2px;">
                <strong>${exp.role || "Role"}</strong>
                <span style="font-size:0.7rem; color:var(--text-secondary);">${exp.company || "Company"}</span>
            </span>
        </button>
    `).join('');

    overlay.innerHTML = `
        <div class="ats-modal-card" style="max-width:450px; height:auto; padding:24px; display:flex; flex-direction:column; gap:16px; box-shadow:var(--shadow-lg); background:#121420; border:1px solid var(--border-color); border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                <h3 style="font-size:1.05rem; color:white; font-weight:600; margin:0; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary);"></i> Integrate Keyword: "${kw}"</h3>
                <button onclick="document.getElementById('keyword-weave-overlay').remove()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; margin:0;">
                How would you like to add <strong>${kw}</strong> to your resume?
            </p>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <button class="btn btn-primary" style="justify-content:center; width:100%; padding:10px; font-weight:600;" onclick="window.handleWeaveChoice('${kw.replace(/'/g, "\\'")}', 'skills')">
                    <i class="fa-solid fa-brain" style="margin-right:6px;"></i> Add to Skills list (Direct)
                </button>
                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin:10px 0 2px 0; text-align:center; position:relative;">
                    <span style="background:#121420; padding:0 8px; position:relative; z-index:1;">Or weave into experience</span>
                    <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:var(--border-color); z-index:0;"></div>
                </div>
                <div style="max-height:180px; overflow-y:auto; padding-right:4px; display:flex; flex-direction:column; gap:6px;">
                    ${expOptions}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
};

window.handleWeaveChoice = function(kw, choice) {
    const overlay = document.getElementById("keyword-weave-overlay");
    if (overlay) overlay.remove();

    if (choice === "skills") {
        window.addSkillDirectly(kw);
    } else {
        // Close ATS modal if open
        const atsModal = document.getElementById("ats-modal");
        if (atsModal) atsModal.classList.remove("open");

        // Open AI Bullet Optimization for selected experience
        if (window.openAIEngine) {
            window.openAIEngine(choice);
        }

        // Pre-fill keywords to weave field
        const kwInput = document.getElementById("ai-rewrite-keywords");
        if (kwInput) {
            kwInput.value = kw;
        }
    }
};

window.onJDTextInput = function() {
    const txt = document.getElementById("ats-jd-text").value;
    state.jobDescription = txt;
    
    const sidebarJdText = document.getElementById("target-job-desc");
    if (sidebarJdText) sidebarJdText.value = txt;
    
    window.updateJobTarget("jobDescription", txt);
};

window.updateJobTarget = function(key, val) {
    state[key] = val;
    
    if (key === "jobDescription") {
        const modalJdText = document.getElementById("ats-jd-text");
        if (modalJdText) modalJdText.value = val;
        
        const sidebarJdText = document.getElementById("target-job-desc");
        if (sidebarJdText && sidebarJdText.value !== val) sidebarJdText.value = val;
        
        if (window.calculateJDMatch) {
            window.calculateJDMatch();
        }
    } else if (key === "targetCompany") {
        const sidebarCompanyInput = document.getElementById("target-company");
        if (sidebarCompanyInput && sidebarCompanyInput.value !== val) sidebarCompanyInput.value = val;
    }
    
    if (window.profiles && window.activeProfileId) {
        const activeIdx = window.profiles.findIndex(p => p.id === window.activeProfileId);
        if (activeIdx !== -1) {
            window.profiles[activeIdx].resumeData = JSON.parse(JSON.stringify(state));
            window.profiles[activeIdx].updatedAt = Date.now();
            localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
        }
    }
    
    saveState();
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
        if (state.targetCountry) {
            countrySelect.value = state.targetCountry;
        }
        const alertBox = document.getElementById("country-rule-alert");
        if (alertBox) {
            alertBox.innerHTML = countryExpectations[countrySelect.value] || "";
        }
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

window.getOfflineFullOptimizationMock = function(resumeState) {
    let optSummary = resumeState.summary || "Highly motivated professional.";
    if (window.AIService && typeof window.AIService.getOfflineRewriteMock === "function") {
        optSummary = window.AIService.getOfflineRewriteMock(optSummary);
    }
    
    let optExp = [];
    if (resumeState.experience) {
        resumeState.experience.forEach(exp => {
            let desc = exp.desc || "";
            if (window.AIService && typeof window.AIService.getOfflineRewriteMock === "function") {
                desc = window.AIService.getOfflineRewriteMock(desc);
            }
            optExp.push({ id: exp.id, desc: desc });
        });
    }
    
    let optProj = [];
    if (resumeState.projects) {
        resumeState.projects.forEach(proj => {
            let desc = proj.desc || "";
            if (window.AIService && typeof window.AIService.getOfflineRewriteMock === "function") {
                desc = window.AIService.getOfflineRewriteMock(desc);
            }
            optProj.push({ id: proj.id, desc: desc });
        });
    }
    
    return {
        atsScore: 88,
        scores: {
            structure: 90,
            keywords: 80,
            formatting: 85,
            experience: 90,
            skills: 85
        },
        strengths: ["Quantified impact metrics", "Consistent formatting structures", "Standard section labeling"],
        improvements: ["Inject missing target technical tools", "Replace passive verbs in work summary"],
        missingKeywords: ["CI/CD", "Docker", "REST APIs"],
        suggestedKeywords: ["TypeScript", "System Design", "Agile Methodologies"],
        optimizedSummary: optSummary,
        optimizedExperience: optExp,
        optimizedProjects: optProj,
        grammarFixes: [
            "Corrected action verb alignments in bullet points.",
            "Standardized capitalization of technologies."
        ],
        formattingSuggestions: [
            "Maintain 0.5-0.75 margin padding across active sheets."
        ]
    };
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
    }).catch(err => {
        console.error("AI Optimization failed:", err);
        showToast("Optimization failed: " + err.message);
        if (loading && results && btn) {
            loading.style.display = "none";
            results.style.display = "none";
            btn.disabled = false;
        }
    });
};

window.optimizeResumeData = async function(resumeState) {
    const provider = (window.AIService && window.AIService.activeProvider) || 'gemini';
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
    
    if (provider === "gemini") {
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
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            } else {
                if (cleaned.startsWith("```json")) {
                    cleaned = cleaned.substring(7);
                } else if (cleaned.startsWith("```")) {
                    cleaned = cleaned.substring(3);
                }
                if (cleaned.endsWith("```")) {
                    cleaned = cleaned.substring(0, cleaned.length - 3);
                }
                cleaned = cleaned.trim();
            }
            
            const parsed = JSON.parse(cleaned);
            
            // Cache the result
            optimizationCache = parsed;
            lastCachedStateString = currentStateString;
            
            return parsed;
        } catch (err) {
            console.error("Gemini optimization failed, falling back to local optimization:", err);
            const offlineResult = window.getOfflineFullOptimizationMock(resumeState);
            optimizationCache = offlineResult;
            lastCachedStateString = currentStateString;
            return offlineResult;
        }
    } else if (provider === "webgpu") {
        showToast("Running fast local optimization...");
        return new Promise((resolve) => {
            setTimeout(() => {
                const offlineResult = window.getOfflineFullOptimizationMock(resumeState);
                optimizationCache = offlineResult;
                lastCachedStateString = currentStateString;
                resolve(offlineResult);
            }, 600);
        });
    } else {
        showToast("Using offline optimization fallback...");
        return new Promise((resolve) => {
            setTimeout(() => {
                const offlineResult = window.getOfflineFullOptimizationMock(resumeState);
                optimizationCache = offlineResult;
                lastCachedStateString = currentStateString;
                resolve(offlineResult);
            }, 500);
        });
    }
};

window.callGeminiOptimizerAPI = async function(key, prompt) {
    const url = '/api/ai/chat';
    const requestBody = {
        prompt: prompt
    };
    
    // Log the complete request payload
    console.log("Gemini Proxy API Request Payload:", JSON.stringify(requestBody, null, 2));
    
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': key
            },
            body: JSON.stringify(requestBody)
        });
    } catch (netErr) {
        console.error("Gemini Proxy API Network Error:", netErr);
        throw new Error("Network error. Please check your internet connection and try again.");
    }
    
    if (!response.ok) {
        let errorData = null;
        try {
            errorData = await response.json();
        } catch (jsonErr) {}
        
        console.error(`Gemini Proxy API Error Response [HTTP ${response.status}]:`, errorData || response.statusText);
        
        const httpStatus = response.status;
        let errorMessage = response.statusText || "API Error";
        if (errorData && errorData.error) {
            errorMessage = errorData.error.message || errorData.error;
        }
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log("Gemini Proxy API Response Payload:", JSON.stringify(data, null, 2));
    
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
            let category = "generic";
            const jobTitle = (state.targetJob || "").toLowerCase();
            if (jobTitle.includes("software") || jobTitle.includes("developer") || jobTitle.includes("engineer") || jobTitle.includes("backend") || jobTitle.includes("full stack")) {
                category = (jobTitle.includes("web") || jobTitle.includes("frontend")) ? "web" : "software";
            } else if (jobTitle.includes("bio") || jobTitle.includes("micro") || jobTitle.includes("chem") || jobTitle.includes("medical") || jobTitle.includes("clinical") || jobTitle.includes("science") || jobTitle.includes("lab") || jobTitle.includes("doctor") || jobTitle.includes("physician") || jobTitle.includes("therapist")) {
                category = "science";
            } else if (jobTitle.includes("data") || jobTitle.includes("analyst") || jobTitle.includes("science") || jobTitle.includes("ml") || jobTitle.includes("ai")) {
                category = "data";
            } else if (jobTitle.includes("design") || jobTitle.includes("ux") || jobTitle.includes("ui") || jobTitle.includes("artist") || jobTitle.includes("illustrator") || jobTitle.includes("product designer")) {
                category = "design";
            } else if (jobTitle.includes("product") || jobTitle.includes("manager") || jobTitle.includes("owner") || jobTitle.includes("scrum") || jobTitle.includes("agile")) {
                category = "product";
            } else if (jobTitle.includes("market") || jobTitle.includes("growth") || jobTitle.includes("seo") || jobTitle.includes("brand")) {
                category = "marketing";
            } else if (jobTitle.includes("finance") || jobTitle.includes("accounting") || jobTitle.includes("accountant") || jobTitle.includes("audit") || jobTitle.includes("tax") || jobTitle.includes("budget")) {
                category = "finance";
            } else if (jobTitle.includes("sales") || jobTitle.includes("sell") || jobTitle.includes("representative") || jobTitle.includes("business development") || jobTitle.includes("account manager")) {
                category = "sales";
            } else if (jobTitle.includes("support") || jobTitle.includes("customer") || jobTitle.includes("service") || jobTitle.includes("help") || jobTitle.includes("ticket") || jobTitle.includes("client relations")) {
                category = "support";
            } else if (jobTitle.includes("nurse") || jobTitle.includes("healthcare") || jobTitle.includes("patient") || jobTitle.includes("clinic") || jobTitle.includes("care")) {
                category = "healthcare";
            } else if (jobTitle.includes("legal") || jobTitle.includes("law") || jobTitle.includes("contract") || jobTitle.includes("attorney") || jobTitle.includes("paralegal") || jobTitle.includes("compliance")) {
                category = "legal";
            } else if (jobTitle.includes("teacher") || jobTitle.includes("education") || jobTitle.includes("school") || jobTitle.includes("professor") || jobTitle.includes("instructor") || jobTitle.includes("train")) {
                category = "education";
            } else if (jobTitle.includes("hr") || jobTitle.includes("human resources") || jobTitle.includes("recruit") || jobTitle.includes("talent") || jobTitle.includes("onboard")) {
                category = "hr";
            } else if (jobTitle.includes("write") || jobTitle.includes("content") || jobTitle.includes("edit") || jobTitle.includes("copywriter") || jobTitle.includes("journal")) {
                category = "writing";
            }
            
            const metricsPool = {
                "software": [
                    "boosting application load times by 35%",
                    "saving 8 hours of manual deployment work per week",
                    "resulting in a 42% reduction in production crash rates",
                    "improving test coverage from 45% to 88%"
                ],
                "web": [
                    "boosting application load times by 35%",
                    "increasing customer conversion rate by 18% in the first quarter",
                    "enhancing web accessibility index score to 98%"
                ],
                "data": [
                    "improving query search optimization speed by 40%",
                    "increasing predictive model accuracy to 94%",
                    "accelerating data pipeline ingestion rates by 50%"
                ],
                "design": [
                    "improving user onboarding conversion rate by 28%",
                    "reducing user task completion times by 22%",
                    "boosting customer satisfaction (CSAT) score by 15%"
                ],
                "product": [
                    "delivering the product roadmap milestone 2 weeks ahead of schedule",
                    "increasing active monthly user engagement by 18%",
                    "improving product onboarding metrics by 30%"
                ],
                "marketing": [
                    "increasing customer conversion rate by 18% in the first quarter",
                    "boosting organic search engine traffic by 45%",
                    "maximizing campaign click-through rates (CTR) by 2.4x"
                ],
                "science": [
                    "improving culture testing and analysis accuracy by 25%",
                    "reducing sample processing turnaround times by 30%",
                    "enhancing laboratory safety compliance index score to 100%",
                    "accelerating critical diagnosis validation speed by 15%"
                ],
                "finance": [
                    "improving budget forecasting accuracy by 15%",
                    "identifying cost-saving opportunities of $50K annually",
                    "reducing audit processing cycles by 20%",
                    "reconciling account discrepancies to achieve 99.8% balance accuracy"
                ],
                "sales": [
                    "boosting regional sales revenue by 24%",
                    "increasing customer retention rate by 15%",
                    "securing 12 new high-value client contracts in the fiscal year",
                    "shortening lead-to-close pipeline cycle times by 18%"
                ],
                "support": [
                    "improving customer satisfaction (CSAT) rating to 96%",
                    "reducing average ticket resolution time by 30%",
                    "maintaining SLA response compliance at 99.5%",
                    "reducing escalation rates by 12% through first-contact resolution"
                ],
                "healthcare": [
                    "improving patient satisfaction scores by 22%",
                    "reducing medication administration errors to 0%",
                    "optimizing patient intake processing speed by 15%",
                    "conducting 200+ clinical assessments with 100% compliance record"
                ],
                "legal": [
                    "reducing contract review turnaround times by 25%",
                    "mitigating legal risk metrics by 35% through compliance audits",
                    "managing a caseload of 40+ active files with 100% filing deadlines met",
                    "drafting 50+ vendor agreement protocols with zero breach disputes"
                ],
                "education": [
                    "improving student test scores by an average of 14%",
                    "enhancing classroom participation rates by 25%",
                    "designing 12 comprehensive curriculum standards adopted school-wide",
                    "achieving a 98% positive review rating from parent-teacher surveys"
                ],
                "hr": [
                    "reducing time-to-hire by 18% through optimized sourcing strategies",
                    "improving employee onboarding satisfaction score to 95%",
                    "reducing voluntary staff turnover rates by 12%",
                    "coordinating 50+ recruitment cycles across 8 department heads"
                ],
                "writing": [
                    "increasing reader engagement metrics by 35%",
                    "boosting website organic traffic by 40% through targeted keywords",
                    "producing 20+ high-quality publications ahead of tight editorial deadlines",
                    "enhancing brand copy conversion rate by 15%"
                ],
                "generic": [
                    "increasing team productivity by 15% through workflow automation",
                    "delivering the target milestone 2 weeks ahead of schedule",
                    "saving 8 hours of manual tracking work per week"
                ]
            };
            
            const rewrittenDesc = AIService.getOfflineRewriteMock(exp.desc || "", state.targetJob || "");
            optimized.optimizedExperience.push({
                id: exp.id,
                desc: rewrittenDesc
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
    
    const allSuggested = [
        ...(optimized.missingKeywords || []),
        ...(optimized.suggestedKeywords || [])
    ].filter(Boolean);
    
    const currentSkills = original.skills || [];
    const newKeywords = allSuggested.filter(kw => !currentSkills.includes(kw));
    
    if (newKeywords.length > 0) {
        const originalText = currentSkills.join(", ") || "No skills listed.";
        const optimizedText = [...currentSkills, ...newKeywords].join(", ");
        list.innerHTML += window.createRevisionCard(
            "keywords",
            "Suggested Skills & Keywords",
            originalText,
            optimizedText
        );
    }
    
    if (original.experience && optimized.optimizedExperience) {
        original.experience.forEach((exp, index) => {
            const optExp = optimized.optimizedExperience.find(o => o.id === exp.id) ||
                           optimized.optimizedExperience.find(o => String(o.id).replace(/[^0-9]/g, '') === String(exp.id).replace(/[^0-9]/g, '')) ||
                           optimized.optimizedExperience[index];
            if (optExp) {
                const descVal = optExp.desc || optExp.description || optExp.bullets || optExp.text;
                if (descVal) {
                    list.innerHTML += window.createRevisionCard(
                        `exp-${exp.id}`,
                        `Experience: ${exp.role} at ${exp.company}`,
                        exp.desc || "",
                        descVal
                    );
                }
            }
        });
    }
    
    if (original.projects && optimized.optimizedProjects) {
        original.projects.forEach((proj, index) => {
            const optProj = optimized.optimizedProjects.find(o => o.id === proj.id) ||
                            optimized.optimizedProjects.find(o => String(o.id).replace(/[^0-9]/g, '') === String(proj.id).replace(/[^0-9]/g, '')) ||
                            optimized.optimizedProjects[index];
            if (optProj) {
                const descVal = optProj.desc || optProj.description || optProj.bullets || optProj.text;
                if (descVal) {
                    list.innerHTML += window.createRevisionCard(
                        `proj-${proj.id}`,
                        `Project: ${proj.title}`,
                        proj.desc || "",
                        descVal
                    );
                }
            }
        });
    }
};

window.findOptimizedProperty = function(obj, keysArray) {
    if (!obj) return null;
    for (const key of keysArray) {
        if (obj[key] !== undefined && obj[key] !== null) {
            return obj[key];
        }
    }
    const lowerKeys = keysArray.map(k => k.toLowerCase());
    for (const k in obj) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const targetKey of lowerKeys) {
            const cleanTarget = targetKey.replace(/[^a-z0-9]/g, '');
            if (cleanK === cleanTarget) {
                return obj[k];
            }
        }
    }
    return null;
};

window.renderRevisions = function(original, optimized) {
    const list = document.getElementById("ats-revisions-list");
    if (!list) return;
    
    list.innerHTML = "";
    
    const optimizedSummary = window.findOptimizedProperty(optimized, ["optimizedSummary", "summary", "profile", "about", "bio"]);
    const optimizedExperience = window.findOptimizedProperty(optimized, ["optimizedExperience", "experience", "experiences", "workExperience", "work_experience"]);
    const optimizedProjects = window.findOptimizedProperty(optimized, ["optimizedProjects", "projects", "project", "personalProjects", "personal_projects"]);
    const missingKeywords = window.findOptimizedProperty(optimized, ["missingKeywords", "missing_keywords", "missingKeyword"]);
    const suggestedKeywords = window.findOptimizedProperty(optimized, ["suggestedKeywords", "suggested_keywords", "suggestedKeyword"]);

    if (original.summary || optimizedSummary) {
        list.innerHTML += window.createRevisionCard(
            "summary",
            "Professional Summary",
            original.summary || "No summary provided.",
            optimizedSummary
        );
    }
    
    const allSuggested = [
        ...(missingKeywords || []),
        ...(suggestedKeywords || [])
    ].filter(Boolean);
    
    const currentSkills = original.skills || [];
    const newKeywords = allSuggested.filter(kw => !currentSkills.includes(kw));
    
    if (newKeywords.length > 0) {
        const originalText = currentSkills.join(", ") || "No skills listed.";
        const optimizedText = [...currentSkills, ...newKeywords].join(", ");
        list.innerHTML += window.createRevisionCard(
            "keywords",
            "Suggested Skills & Keywords",
            originalText,
            optimizedText
        );
    }
    
    if (original.experience && optimizedExperience) {
        original.experience.forEach((exp, index) => {
            const optExp = optimizedExperience.find(o => o.id === exp.id) ||
                           optimizedExperience.find(o => String(o.id).replace(/[^0-9]/g, '') === String(exp.id).replace(/[^0-9]/g, '')) ||
                           optimizedExperience[index];
            if (optExp) {
                const descVal = optExp.desc || optExp.description || optExp.bullets || optExp.text;
                if (descVal) {
                    list.innerHTML += window.createRevisionCard(
                        `exp-${exp.id}`,
                        `Experience: ${exp.role} at ${exp.company}`,
                        exp.desc || "",
                        descVal
                    );
                }
            }
        });
    }
    
    if (original.projects && optimizedProjects) {
        original.projects.forEach((proj, index) => {
            const optProj = optimizedProjects.find(o => o.id === proj.id) ||
                            optimizedProjects.find(o => String(o.id).replace(/[^0-9]/g, '') === String(proj.id).replace(/[^0-9]/g, '')) ||
                            optimizedProjects[index];
            if (optProj) {
                const descVal = optProj.desc || optProj.description || optProj.bullets || optProj.text;
                if (descVal) {
                    list.innerHTML += window.createRevisionCard(
                        `proj-${proj.id}`,
                        `Project: ${proj.title}`,
                        proj.desc || "",
                        descVal
                    );
                }
            }
        });
    }
};

window.applyAllAIOptimizations = function() {
    if (!pendingOptimizations) return;
    
    let appliedCount = 0;
    
    const optimizedSummary = window.findOptimizedProperty(pendingOptimizations, ["optimizedSummary", "summary", "profile", "about", "bio"]);
    const optimizedExperience = window.findOptimizedProperty(pendingOptimizations, ["optimizedExperience", "experience", "experiences", "workExperience", "work_experience"]);
    const optimizedProjects = window.findOptimizedProperty(pendingOptimizations, ["optimizedProjects", "projects", "project", "personalProjects", "personal_projects"]);
    const missingKeywords = window.findOptimizedProperty(pendingOptimizations, ["missingKeywords", "missing_keywords", "missingKeyword"]);
    const suggestedKeywords = window.findOptimizedProperty(pendingOptimizations, ["suggestedKeywords", "suggested_keywords", "suggestedKeyword"]);

    // Summary
    const acceptSummary = document.getElementById("accept-check-summary");
    if (acceptSummary && acceptSummary.checked && optimizedSummary) {
        state.summary = optimizedSummary;
        const summaryInput = document.getElementById("input-summary");
        if (summaryInput) summaryInput.value = state.summary;
        appliedCount++;
    }
    
    // Experience
    if (state.experience && optimizedExperience) {
        state.experience.forEach((exp, index) => {
            const acceptExp = document.getElementById(`accept-check-exp-${exp.id}`);
            if (acceptExp && acceptExp.checked) {
                const optExp = optimizedExperience.find(o => o.id === exp.id) ||
                               optimizedExperience.find(o => String(o.id).replace(/[^0-9]/g, '') === String(exp.id).replace(/[^0-9]/g, '')) ||
                               optimizedExperience[index];
                if (optExp) {
                    const descVal = optExp.desc || optExp.description || optExp.bullets || optExp.text;
                    if (descVal) {
                        exp.desc = descVal;
                        appliedCount++;
                    }
                }
            }
        });
    }
    
    // Projects
    if (state.projects && optimizedProjects) {
        state.projects.forEach((proj, index) => {
            const acceptProj = document.getElementById(`accept-check-proj-${proj.id}`);
            if (acceptProj && acceptProj.checked) {
                const optProj = optimizedProjects.find(o => o.id === proj.id) ||
                                optimizedProjects.find(o => String(o.id).replace(/[^0-9]/g, '') === String(proj.id).replace(/[^0-9]/g, '')) ||
                                optimizedProjects[index];
                if (optProj) {
                    const descVal = optProj.desc || optProj.description || optProj.bullets || optProj.text;
                    if (descVal) {
                        proj.desc = descVal;
                        appliedCount++;
                    }
                }
            }
        });
    }
    
    // Keywords / Skills
    const acceptKeywords = document.getElementById("accept-check-keywords");
    if (acceptKeywords && acceptKeywords.checked) {
        const allSuggested = [
            ...(missingKeywords || []),
            ...(suggestedKeywords || [])
        ].filter(Boolean);
        
        if (!state.skills) state.skills = [];
        let addedCount = 0;
        allSuggested.forEach(kw => {
            if (!state.skills.includes(kw)) {
                state.skills.push(kw);
                addedCount++;
            }
        });
        if (addedCount > 0) {
            appliedCount++;
        }
    }
    
    if (appliedCount > 0) {
        saveState();
        if (window.renderExperienceList) window.renderExperienceList();
        if (window.renderProjectsList) window.renderProjectsList();
        if (window.renderSkillsTags) {
            window.renderSkillsTags();
        }
        if (window.renderResumePreview) window.renderResumePreview();
        if (window.calculateJDMatch) {
            window.calculateJDMatch();
        }
        
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
        window.syncATSSuggestionsPanel();
    } else {
        card.classList.add("collapsed");
        window.renderSuggestionsList();
    }
};

window.syncATSSuggestionsPanel = function() {
    const noKey = document.getElementById("ats-suggestions-no-key");
    const dashboard = document.getElementById("ats-suggestions-dashboard");
    const countBadge = document.getElementById("ats-suggestions-count-badge");
    
    if (!noKey || !dashboard) return;
    
    noKey.style.display = "none";
    dashboard.style.display = "block";
    
    const report = ATSAuditor.audit(state);
    
    const curScoreBox = document.getElementById("ats-tracker-current-score");
    if (curScoreBox) curScoreBox.innerText = report.score;
    
    const fill = document.getElementById("ats-tracker-progress-fill");
    if (fill) fill.style.width = `${report.score}%`;
    
    if (atsSuggestionsList.length === 0) {
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
    } else {
        window.renderSuggestionsList();
    }
};

window.runAIPanelAnalysis = function() {
    const listContainer = document.getElementById("ats-suggestions-list");
    if (!listContainer) return;
    
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    if (!apiKey) {
        showToast("Please configure your Gemini API Key in Settings first.");
        if (window.toggleSettingsPanel) {
            window.toggleSettingsPanel();
        }
        return;
    }
    
    listContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0; gap: 10px;">
            <div class="loading-spinner"></div>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Analyzing entire resume layout and wording compatibility...</span>
        </div>
    `;
    
    const jdText = document.getElementById("ats-jd-text")?.value || state.targetJob || "Software Engineer";
    const selectedCountry = document.getElementById("ats-country-select")?.value || "US";
    
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
    
    let pendingCount = 0;
    let potentialScoreIncrease = 0;
    
    atsSuggestionsList.forEach(s => {
        const isCompleted = completedSuggestions[s.id];
        if (!isCompleted) {
            pendingCount++;
            potentialScoreIncrease += s.points;
        }
    });
    
    if (countBadge) countBadge.innerText = `${pendingCount} Pending Suggestions`;
    
    const report = ATSAuditor.audit(state);
    if (potScoreBox) {
        potScoreBox.innerText = report.score + potentialScoreIncrease;
    }
    
    // Core performance optimization: if collapsed, skip diff DOM compiling!
    if (!panelExpanded) {
        listContainer.innerHTML = `<div style="text-align: center; padding: 12px; font-size: 0.72rem; color: var(--text-secondary);">Suggestions panel is collapsed. Click to expand.</div>`;
        if (trackerPotentialList) trackerPotentialList.innerHTML = "";
        return;
    }
    
    listContainer.innerHTML = "";
    if (trackerPotentialList) trackerPotentialList.innerHTML = "";
    
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

// Synchronize all profiles and current state with Express Server Database
window.syncProfilesToServer = async function() {
    try {
        let token = null;
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            token = session?.access_token || null;
        }
        
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        await fetch('/api/profiles', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                profiles: window.profiles,
                activeProfileId: window.activeProfileId,
                resumeData: state
            })
        });
    } catch (e) {
        console.error("Failed to sync profiles with Express server: ", e);
    }
};

window.initProfiles = async function() {
    // Try to load profiles from Express Server Database
    try {
        let token = null;
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            token = session?.access_token || null;
        }

        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch('/api/profiles', { headers });
        if (response.ok) {
            const db = await response.json();
            
            // If authenticated and cloud is empty, but local has profiles, auto-upload local profiles to cloud!
            if (token && (!db.profiles || db.profiles.length === 0) && window.profiles.length > 0) {
                showToast("Uploading local profiles to cloud...");
                await window.syncProfilesToServer();
                return;
            }

            if (db.profiles && db.profiles.length > 0) {
                window.profiles = db.profiles;
                window.activeProfileId = db.activeProfileId || window.profiles[0].id;
                const active = window.profiles.find(p => p.id === window.activeProfileId) || window.profiles[0];
                window.updateStateObject(active.resumeData);
                
                // Re-render UI forms and preview if initialized
                if (window.appInitialized) {
                    if (typeof setFormFields === "function") setFormFields();
                    if (typeof updateSidebarBadges === "function") updateSidebarBadges();
                    if (typeof renderExperienceList === "function") renderExperienceList();
                    if (typeof renderEducationList === "function") renderEducationList();
                    if (typeof renderProjectsList === "function") renderProjectsList();
                    if (typeof renderSkillsTags === "function") renderSkillsTags();
                    if (typeof renderResumePreview === "function") renderResumePreview();
                    if (typeof updateATSScore === "function") updateATSScore();
                    if (typeof window.renderProfileDropdown === "function") window.renderProfileDropdown();
                }
                return;
            }
        }
    } catch (e) {
        console.error("Failed to load profiles from server, falling back to local storage: ", e);
    }

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
        window.updateStateObject(active.resumeData);
        window.activeProfileId = active.id;
        localStorage.setItem('resumake_active_profile_id', window.activeProfileId);
    }
    
    // Sync migrations back to server
    window.syncProfilesToServer();
    
    if (window.appInitialized) {
        if (typeof setFormFields === "function") setFormFields();
        if (typeof updateSidebarBadges === "function") updateSidebarBadges();
        if (typeof renderExperienceList === "function") renderExperienceList();
        if (typeof renderEducationList === "function") renderEducationList();
        if (typeof renderProjectsList === "function") renderProjectsList();
        if (typeof renderSkillsTags === "function") renderSkillsTags();
        if (typeof renderResumePreview === "function") renderResumePreview();
        if (typeof updateATSScore === "function") updateATSScore();
        if (typeof window.renderProfileDropdown === "function") window.renderProfileDropdown();
    }
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
        window.updateStateObject(target.resumeData);
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
        window.syncProfilesToServer();
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
    window.updateStateObject(newProfile.resumeData);
    
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
    window.syncProfilesToServer();
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
    window.updateStateObject(newProfile.resumeData);
    
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
    window.syncProfilesToServer();
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
    window.syncProfilesToServer();
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
    window.updateStateObject(window.profiles[0].resumeData);
    
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
    window.syncProfilesToServer();
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
    const suggestionsCard = document.getElementById("ats-suggestions-card");
    
    if (!toggleBtn || !scaler || !display) return;
    
    atsSimulatorActive = !atsSimulatorActive;
    if (atsSimulatorActive) {
        document.body.classList.add("ats-simulator-active");
        toggleBtn.classList.add("active");
        toggleBtn.style.background = "var(--primary)";
        toggleBtn.style.color = "white";
        
        scaler.style.display = "none";
        if (suggestionsCard) suggestionsCard.style.display = "none";
        display.style.display = "flex";
        
        window.runATSSimulation();
    } else {
        document.body.classList.remove("ats-simulator-active");
        toggleBtn.classList.remove("active");
        toggleBtn.style.background = "";
        toggleBtn.style.color = "";
        
        scaler.style.display = "flex";
        if (suggestionsCard) suggestionsCard.style.display = "block";
        display.style.display = "none";
    }
};

window.focusSidebarInput = function(inputId, sectionId) {
    // On mobile viewports, switch to Edit Form tab first
    if (window.switchMobileTab) {
        window.switchMobileTab("edit");
    }

    // If sidebar is collapsed on mobile viewports, slide it open!
    const sidebar = document.querySelector(".sidebar");
    if (sidebar && sidebar.style.left && sidebar.style.left.startsWith("-")) {
        if (window.toggleSidebar) window.toggleSidebar();
    }
    
    // Auto-expand accordion section first
    if (sectionId && window.toggleAccordion) {
        const section = document.getElementById(sectionId);
        if (section && !section.classList.contains("active")) {
            window.toggleAccordion(sectionId);
        }
    }
    
    // Focus target element with highlighted glow
    setTimeout(() => {
        const input = document.getElementById(inputId);
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const originalBorder = input.style.borderColor;
            const originalShadow = input.style.boxShadow;
            input.style.borderColor = "var(--primary)";
            input.style.boxShadow = "0 0 12px var(--primary)";
            
            setTimeout(() => {
                input.style.borderColor = originalBorder;
                input.style.boxShadow = originalShadow;
            }, 1500);
        }
    }, 150);
};

window.runATSSimulation = function() {
    const rawContent = document.getElementById("ats-sim-raw-content");
    if (!rawContent) return;
    
    const name = state.name || "";
    const email = state.email || "";
    const phone = state.phone || "";
    const address = state.location || "";
    const website = state.website || "";
    const linkedin = website.includes("linkedin.com") ? website : "";
    const github = website.includes("github.com") ? website : "";
    
    let html = "";
    
    // 1. Candidate Contact Information Section
    html += `
    <div style="margin-bottom: 24px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #60a5fa; border-bottom: 1px solid rgba(96,165,250,0.15); padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-address-card"></i> [CANDIDATE INFORMATION]
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <div style="background: rgba(30,41,59,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px; border-left: 4px solid ${name ? '#10b981' : '#ef4444'};">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Candidate Name</div>
                <div style="margin-top: 4px; font-size: 0.85rem;">
                    ${name ? `<span style="color: #10b981; font-weight: 500;"><i class="fa-solid fa-circle-check"></i> ${name}</span>` : `<a href="javascript:void(0)" onclick="window.focusSidebarInput('input-name', 'sec-personal')" style="color: #ef4444; font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-circle-xmark"></i> [MISSING] (Click to Fix)</a>`}
                </div>
            </div>
            <div style="background: rgba(30,41,59,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px; border-left: 4px solid ${email ? '#10b981' : '#ef4444'};">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Email Address</div>
                <div style="margin-top: 4px; font-size: 0.85rem;">
                    ${email ? `<span style="color: #10b981; font-weight: 500;"><i class="fa-solid fa-circle-check"></i> ${email}</span>` : `<a href="javascript:void(0)" onclick="window.focusSidebarInput('input-email', 'sec-personal')" style="color: #ef4444; font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-circle-xmark"></i> [MISSING] (Click to Fix)</a>`}
                </div>
            </div>
            <div style="background: rgba(30,41,59,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px; border-left: 4px solid ${phone ? '#10b981' : '#ef4444'};">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Phone Number</div>
                <div style="margin-top: 4px; font-size: 0.85rem;">
                    ${phone ? `<span style="color: #10b981; font-weight: 500;"><i class="fa-solid fa-circle-check"></i> ${phone}</span>` : `<a href="javascript:void(0)" onclick="window.focusSidebarInput('input-phone', 'sec-personal')" style="color: #ef4444; font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-circle-xmark"></i> [MISSING] (Click to Fix)</a>`}
                </div>
            </div>
            <div style="background: rgba(30,41,59,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px; border-left: 4px solid ${address ? '#10b981' : '#f59e0b'};">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Address/Location</div>
                <div style="margin-top: 4px; font-size: 0.85rem;">
                    ${address ? `<span style="color: #10b981; font-weight: 500;"><i class="fa-solid fa-circle-check"></i> ${address}</span>` : `<a href="javascript:void(0)" onclick="window.focusSidebarInput('input-location', 'sec-personal')" style="color: #f59e0b; font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-triangle-exclamation"></i> [MISSING] (Click to Fix)</a>`}
                </div>
            </div>
            <div style="background: rgba(30,41,59,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px; border-left: 4px solid ${linkedin ? '#10b981' : '#94a3b8'};">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">LinkedIn Profile</div>
                <div style="margin-top: 4px; font-size: 0.85rem;">
                    ${linkedin ? `<span style="color: #10b981; font-weight: 500;"><i class="fa-solid fa-circle-check"></i> ${linkedin}</span>` : `<a href="javascript:void(0)" onclick="window.focusSidebarInput('input-website', 'sec-personal')" style="color: #94a3b8; font-weight: 500; text-decoration: underline;"><i class="fa-solid fa-ellipsis"></i> [NOT FOUND]</a>`}
                </div>
            </div>
            <div style="background: rgba(30,41,59,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px; border-left: 4px solid ${github ? '#10b981' : '#94a3b8'};">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">GitHub Account</div>
                <div style="margin-top: 4px; font-size: 0.85rem;">
                    ${github ? `<span style="color: #10b981; font-weight: 500;"><i class="fa-solid fa-circle-check"></i> ${github}</span>` : `<a href="javascript:void(0)" onclick="window.focusSidebarInput('input-website', 'sec-personal')" style="color: #94a3b8; font-weight: 500; text-decoration: underline;"><i class="fa-solid fa-ellipsis"></i> [NOT FOUND]</a>`}
                </div>
            </div>
        </div>
    </div>
    
    <!-- 2. Work History Section -->
    <div style="margin-bottom: 24px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #60a5fa; border-bottom: 1px solid rgba(96,165,250,0.15); padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-briefcase"></i> [WORK HISTORY TIMELINE]
        </h4>
    `;
    
    if (state.experience && state.experience.length > 0) {
        state.experience.forEach((exp, idx) => {
            html += `
            <div style="background: rgba(30,41,59,0.2); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600;">
                    <span style="color: #e2e8f0;">${exp.role || '[Missing Role]'} at ${exp.company || '[Missing Company]'}</span>
                    <a href="javascript:void(0)" onclick="window.focusSidebarInput('exp-role-${exp.id}', 'sec-experience')" style="color: #3b82f6; font-size: 0.75rem; text-decoration: none;"><i class="fa-solid fa-pen-to-square"></i> Edit</a>
                </div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Timeline: ${exp.date || '[Missing Dates]'}</div>
                <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 6px; white-space: pre-wrap; font-family: monospace; line-height: 1.4;">${exp.desc || '[No achievements listed]'}</div>
            </div>`;
        });
    } else {
        html += `
        <div style="border: 1px dashed #ef4444; background: rgba(239,68,68,0.03); border-radius: 6px; padding: 16px; text-align: center;">
            <a href="javascript:void(0)" onclick="window.focusSidebarInput('experience-list', 'sec-experience')" style="color: #ef4444; font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-circle-xmark"></i> [WARNING] Work history could not be parsed. Click to add your career experience.</a>
        </div>`;
    }
    html += `</div>`;
    
    // 3. Education Section
    html += `
    <div style="margin-bottom: 24px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #60a5fa; border-bottom: 1px solid rgba(96,165,250,0.15); padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-graduation-cap"></i> [EDUCATION HISTORY TIMELINE]
        </h4>
    `;
    
    if (state.education && state.education.length > 0) {
        state.education.forEach((edu, idx) => {
            html += `
            <div style="background: rgba(30,41,59,0.2); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600;">
                    <span style="color: #e2e8f0;">${edu.degree || '[Missing Degree]'} at ${edu.institution || '[Missing Institution]'}</span>
                    <a href="javascript:void(0)" onclick="window.focusSidebarInput('edu-degree-${edu.id}', 'sec-education')" style="color: #3b82f6; font-size: 0.75rem; text-decoration: none;"><i class="fa-solid fa-pen-to-square"></i> Edit</a>
                </div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Timeline: ${edu.date || '[Missing Dates]'}</div>
            </div>`;
        });
    } else {
        html += `
        <div style="border: 1px dashed #ef4444; background: rgba(239,68,68,0.03); border-radius: 6px; padding: 16px; text-align: center;">
            <a href="javascript:void(0)" onclick="window.focusSidebarInput('education-list', 'sec-education')" style="color: #ef4444; font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-circle-xmark"></i> [WARNING] Education history could not be parsed. Click to add your academic degrees.</a>
        </div>`;
    }
    html += `</div>`;
    
    // 4. Skills Section
    html += `
    <div style="margin-bottom: 24px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #60a5fa; border-bottom: 1px solid rgba(96,165,250,0.15); padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-brain"></i> [SKILLS KEYWORDS INDEX]
        </h4>
    `;
    
    const skills = state.skills || [];
    if (skills.length > 0) {
        html += `
        <div style="background: rgba(30,41,59,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 16px;">
            <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Keywords Detected by Parsing Bots</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${skills.map(s => `<span style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #34d399; font-size: 0.75rem; padding: 4px 10px; border-radius: 4px; font-weight: 500;">${s}</span>`).join('')}
            </div>
            <div style="margin-top: 12px; text-align: right;">
                <a href="javascript:void(0)" onclick="window.focusSidebarInput('skill-input', 'sec-skills')" style="color: #3b82f6; font-size: 0.78rem; text-decoration: none;"><i class="fa-solid fa-plus"></i> Add More Skills</a>
            </div>
        </div>`;
    } else {
        html += `
        <div style="border: 1px dashed #ef4444; background: rgba(239,68,68,0.03); border-radius: 6px; padding: 16px; text-align: center;">
            <a href="javascript:void(0)" onclick="window.focusSidebarInput('skill-input', 'sec-skills')" style="color: #ef4444; font-weight: 600; text-decoration: underline;"><i class="fa-solid fa-circle-xmark"></i> [WARNING] No indexable skills detected. Click to add technical tags.</a>
        </div>`;
    }
    html += `</div>`;
    
    rawContent.innerHTML = html;
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
    
    const name = state.name || "Candidate Name";
    const title = state.title || state.targetJob || "Software Engineer";
    const email = state.email || "email@example.com";
    const phone = state.phone || "(123) 456-7890";
    const address = state.location || "City, Country";
    const website = state.website || "";
    const linkedin = website.includes("linkedin.com") ? website : "";
    const github = website.includes("github.com") ? website : "";
    
    let headerHtml = "";
    
    let contacts = [];
    if (email) contacts.push(`<span><i class="fa-solid fa-envelope"></i> ${email}</span>`);
    if (phone) contacts.push(`<span><i class="fa-solid fa-phone"></i> ${phone}</span>`);
    if (address) contacts.push(`<span><i class="fa-solid fa-location-dot"></i> ${address}</span>`);
    if (website) contacts.push(`<span><i class="fa-solid fa-globe"></i> ${website}</span>`);
    
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join(' | ')}</div>` : '';

    if (state.activeTemplate === "modern" || state.activeTemplate === "executive") {
        headerHtml = `
            <header class="resume-header">
                <h1 class="resume-name">${name}</h1>
                <div class="resume-title">${title}</div>
                ${contactBar}
            </header>
        `;
    } else if (state.activeTemplate === "us" || state.activeTemplate === "classic") {
        headerHtml = `
            <header class="resume-header" style="text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 20px;">
                <h1 class="resume-name" style="font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; color: var(--primary);">${name}</h1>
                <div class="resume-title" style="font-size: 11px; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">${title}</div>
                <div class="resume-contact-bar" style="font-size: 10px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; color: var(--text-secondary);">
                    <span>${email}</span> | <span>${phone}</span> | <span>${address}</span>
                    ${website ? `| <span>${website}</span>` : ''}
                </div>
            </header>
        `;
    } else {
        headerHtml = `
            <header class="resume-header" style="border-bottom: 1.5px solid var(--border-color); padding-bottom: 10px; margin-bottom: 16px;">
                <h1 class="resume-name" style="font-size: 1.6rem; font-weight: 700; margin-bottom: 2px; color: var(--primary);">${name}</h1>
                <div class="resume-title" style="font-size: 0.9rem; color: var(--primary); font-weight: 600; margin-bottom: 6px;">${title}</div>
                <div class="resume-contact-bar" style="display: flex; gap: 12px; font-size: 0.75rem; color: var(--text-secondary); flex-wrap: wrap;">
                    <span>${email}</span>
                    <span>${phone}</span>
                    <span>${address}</span>
                </div>
            </header>
        `;
    }
    
    const paragraphs = clText.split("\n\n").map(p => p.trim()).filter(Boolean);
    const bodyHtml = paragraphs.map(p => `<p style="font-size: 0.86rem; line-height: 1.6; margin-bottom: 16px; color: #1e293b; text-align: justify; font-family: inherit;">${p}</p>`).join('');
    
    sheet.innerHTML = `
        ${headerHtml}
        <div class="cover-letter-content-body" style="padding: 10px 0; text-align: left; font-family: inherit;">
            ${bodyHtml}
        </div>
    `;
    
    if (window.applyLayoutMetrics) window.applyLayoutMetrics();
    
    setTimeout(() => {
        if (window.resizeCoverLetterPreview) {
            window.resizeCoverLetterPreview();
        }
    }, 50);
};

window.closeCoverLetterPreviewModal = function() {
    const modal = document.getElementById("cover-letter-preview-modal");
    if (modal) modal.classList.remove("open");
};

window.printCoverLetter = function() {
    document.body.classList.add("cover-letter-printing-active");
    window.print();
};

window.addEventListener("afterprint", () => {
    document.body.classList.remove("cover-letter-printing-active");
});

window.resizeCoverLetterPreview = function() {
    const modalBody = document.querySelector("#cover-letter-preview-modal .ats-modal-body");
    const scaler = document.querySelector("#cover-letter-preview-modal .cover-letter-sheet-scaler");
    const sheet = document.getElementById("cover-letter-preview-sheet");
    if (!modalBody || !scaler || !sheet) return;

    const availableWidth = modalBody.clientWidth - 64;
    const sheetWidth = 794;

    if (availableWidth < sheetWidth) {
        const scale = availableWidth / sheetWidth;
        sheet.style.transform = `scale(${scale})`;
        sheet.style.transformOrigin = "top center";
        const scaledHeight = sheet.offsetHeight * scale;
        scaler.style.height = `${scaledHeight}px`;
        sheet.style.marginBottom = `${-sheet.offsetHeight * (1 - scale)}px`;
        scaler.style.width = "100%";
        scaler.style.justifyContent = "center";
    } else {
        sheet.style.transform = "none";
        sheet.style.transformOrigin = "top center";
        scaler.style.height = "auto";
        sheet.style.marginBottom = "0px";
        scaler.style.width = "794px";
        scaler.style.justifyContent = "center";
    }
};

window.ATSAuditor = ATSAuditor;
export { ATSAuditor };

