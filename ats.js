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
