/**
 * ResuMake AI - ATS Compatibility Auditor Module
 * 
 * Performs static analysis on resume data to determine parsing reliability:
 * 1. Contact information validation (email, phone, location)
 * 2. Section completeness checks (has work exp, education, skills, projects)
 * 3. Bullet-point format verification (for parsing optimization)
 * 4. Target keyword density assessment (based on job title match)
 * 5. Formatting length warnings
 */

const ATSAuditor = {
    // Keywords database for job matching
    keywordsMap: {
        "software": ["software", "developer", "engineer", "system", "git", "api", "database", "code", "architecture", "agile", "testing", "cloud", "aws"],
        "web": ["web", "developer", "frontend", "html", "css", "javascript", "typescript", "react", "next.js", "tailwind", "responsive", "ui", "ux"],
        "data": ["data", "analyst", "sql", "python", "pandas", "visualization", "machine learning", "tableau", "statistics", "database", "analytics"],
        "design": ["design", "ui", "ux", "figma", "wireframe", "prototype", "user research", "interface", "adobe", "layout", "visual"],
        "product": ["product", "manager", "roadmap", "agile", "scrum", "analytics", "jira", "lifecycle", "strategy", "metrics", "requirements"],
        "marketing": ["marketing", "seo", "sem", "analytics", "content", "campaign", "conversion", "google analytics", "brand", "social media", "crm"]
    },

    /**
     * Determines job category based on title (similar to ai.js)
     */
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
     * Runs the ATS compatibility audit on the current resume data state
     */
    audit(resumeData) {
        let score = 0;
        let suggestions = [];
        
        // 1. Contact Information Check (Max 20 points)
        let contactScore = 0;
        if (resumeData.name && resumeData.name.trim().length > 2) contactScore += 5;
        if (resumeData.email && resumeData.email.includes("@")) {
            contactScore += 5;
        } else {
            suggestions.push({ type: "danger", text: "Missing or invalid Email Address. ATS systems require a valid contact email." });
        }
        if (resumeData.phone && resumeData.phone.trim().length > 5) {
            contactScore += 5;
        } else {
            suggestions.push({ type: "warning", text: "Missing Phone Number. Employers won't be able to reach you easily." });
        }
        if (resumeData.location && resumeData.location.trim().length > 3) {
            contactScore += 5;
        } else {
            suggestions.push({ type: "warning", text: "Missing Location. Many systems filter candidates based on city/state availability." });
        }
        
        if (contactScore === 20) {
            suggestions.push({ type: "success", text: "Contact Information is complete and easily scannable." });
        }
        score += contactScore;

        // 2. Sections Completeness (Max 30 points)
        let sectionsScore = 0;
        
        // Work Experience
        if (resumeData.experience && resumeData.experience.length > 0) {
            sectionsScore += 10;
            // Check descriptions length
            let descriptionsOk = resumeData.experience.every(exp => exp.desc && exp.desc.trim().length > 40);
            if (!descriptionsOk) {
                suggestions.push({ type: "warning", text: "Work descriptions are too short. Expand bullet points to outline achievements." });
                sectionsScore -= 3;
            }
        } else {
            suggestions.push({ type: "danger", text: "No Work Experience added. Resumes without employment history score very low." });
        }

        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            sectionsScore += 10;
        } else {
            suggestions.push({ type: "danger", text: "Missing Education history. Academic background is standard for ATS check." });
        }

        // Skills
        if (resumeData.skills && resumeData.skills.length >= 5) {
            sectionsScore += 10;
        } else if (resumeData.skills && resumeData.skills.length > 0) {
            sectionsScore += 5;
            suggestions.push({ type: "warning", text: "Fewer than 5 skills listed. Aim for 8-15 core skills to pass filter queries." });
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
                formattingScore = 5;
                suggestions.push({ type: "danger", text: "Format descriptions with bullet points instead of paragraphs for better ATS parsing." });
            } else if (paragraphsCount > bulletsCount) {
                formattingScore = 10;
                suggestions.push({ type: "warning", text: "Some experiences use paragraphs. Convert all job duties to bulleted achievements." });
            } else {
                suggestions.push({ type: "success", text: "Excellent bullet-point styling utilized for work summaries." });
            }
        } else {
            formattingScore = 0;
        }
        score += formattingScore;

        // 4. Job Title Keyword Density (Max 25 points)
        let keywordScore = 0;
        let jobTitle = resumeData.targetJob || "";
        if (jobTitle) {
            let category = this.detectCategory(jobTitle);
            let targetKeywords = this.keywordsMap[category] || this.keywordsMap["generic"];
            
            // Build full resume text payload
            let fullText = (
                (resumeData.title || "") + " " +
                (resumeData.skills ? resumeData.skills.join(" ") : "") + " " +
                (resumeData.experience ? resumeData.experience.map(exp => (exp.role + " " + exp.desc)).join(" ") : "") + " " +
                (resumeData.projects ? resumeData.projects.map(proj => (proj.title + " " + proj.desc)).join(" ") : "")
            ).toLowerCase();

            let matched = [];
            targetKeywords.forEach(kw => {
                if (fullText.includes(kw.toLowerCase())) {
                    matched.push(kw);
                }
            });

            let matchRatio = matched.length / targetKeywords.length;
            keywordScore = Math.round(matchRatio * 25);
            
            if (matchRatio >= 0.7) {
                suggestions.push({ type: "success", text: `High keyword match (${matched.length}/${targetKeywords.length}) for "${jobTitle}".` });
            } else if (matchRatio >= 0.4) {
                suggestions.push({ type: "warning", text: `Moderate keyword match (${matched.length}/${targetKeywords.length}). Add more domain terms like: ${targetKeywords.filter(k => !matched.includes(k)).slice(0, 4).join(', ')}.` });
            } else {
                suggestions.push({ type: "danger", text: `Low keyword alignment with target role. Integrate key terms: ${targetKeywords.slice(0, 5).join(', ')}.` });
            }
        } else {
            suggestions.push({ type: "warning", text: "Specify a Target Job Title to allow target keyword optimization tests." });
        }
        score += keywordScore;

        // 5. Overall File Length / Spacing (Max 10 points)
        let lengthScore = 10;
        let totalWords = (
            (resumeData.name || "") + " " + 
            (resumeData.title || "") + " " + 
            (resumeData.experience ? resumeData.experience.map(e => e.desc).join(" ") : "") + " " +
            (resumeData.projects ? resumeData.projects.map(p => p.desc).join(" ") : "")
        ).split(/\s+/).filter(w => w.length > 0).length;

        if (totalWords > 800) {
            lengthScore = 5;
            suggestions.push({ type: "warning", text: "Resume is very dense (over 800 words). Try to edit down to avoid multi-page spillover." });
        } else if (totalWords < 150) {
            lengthScore = 5;
            suggestions.push({ type: "warning", text: "Resume content is too sparse (under 150 words). Add more details and accomplishments." });
        } else {
            suggestions.push({ type: "success", text: "Total word count and layout density fits standard single-page parsing." });
        }
        score += lengthScore;

        // Cap score at 100
        score = Math.max(0, Math.min(100, score));

        let status = "Poor Compatibility";
        if (score >= 80) status = "Excellent Compatibility";
        else if (score >= 60) status = "Moderate Compatibility";

        return {
            score: score,
            status: status,
            suggestions: suggestions
        };
    }
};
