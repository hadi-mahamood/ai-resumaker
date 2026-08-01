import { compileModernTemplate } from "./templates/modern.js";
import { compileClassicTemplate } from "./templates/classic.js";
import { compileExecutiveTemplate } from "./templates/executive.js";
import {
    compileGCCTemplate,
    compileIndiaTemplate,
    compileEuropeTemplate,
    compileUSTemplate,
    compileUKTemplate,
    compileAsiaTemplate,
    compileLATAMTemplate
} from "./templates/regional.js";
import { formatMultiline } from "./templates/utils.js";

/**
 * ResuMake AI - Main Application Controller
 * 
 * Manages state synchronization, dynamic list builders, tags rendering,
 * template compilers (Modern, Classic, Executive), local storage preservation,
 * AI Assistant drawer interface, ATS auditing triggers, and native PDF layout.
 */

// Core App State
var state = {
    targetJob: "Software Developer",
    targetCountry: "US",
    name: "Alex Mercer",
    title: "Full Stack Software Engineer",
    email: "alex.mercer@dev.io",
    phone: "+1 (555) 321-9876",
    location: "Seattle, WA",
    website: "github.com/alex-mercer",
    dob: "12 Oct 1998",
    nationality: "Indian",
    visaStatus: "Employment Visa (GCC Eligible)",
    maritalStatus: "Single / Male",
    languages: "English (Native), Hindi (Native), Arabic (Basic)",
    skills: ["React.js", "JavaScript (ES6+)", "Node.js", "Python", "REST APIs", "SQL", "Git/GitHub", "Docker"],
    experience: [
        {
            id: "exp-1",
            company: "TechNova Solutions",
            role: "Software Engineer",
            date: "Jan 2024 - Present",
            desc: "- Spearheaded development of core web application dashboard, improving speed by 35%.\n- Collaborated with 5 engineers to design REST API endpoints and integrate them with React UI.\n- Integrated automated unit tests, increasing system reliability by 25%."
        },
        {
            id: "exp-2",
            company: "Quantum Code Inc",
            role: "Junior Web Developer",
            date: "Jun 2022 - Dec 2023",
            desc: "- Developed and maintained robust websites for client projects using JavaScript, HTML, and CSS.\n- Revamped the main e-commerce portal, boosting overall mobile conversion rate by 15%.\n- Debugged production issues, resolving an average of 10+ critical issues weekly."
        }
    ],
    education: [
        {
            id: "edu-1",
            institution: "University of Washington",
            degree: "Bachelor of Science in Computer Science",
            date: "2018 - 2022",
            desc: "Graduated with Honors. Specialized in Software Architecture and Database Systems."
        }
    ],
    projects: [
        {
            id: "proj-1",
            title: "DevPortfolio Generator",
            role: "Creator",
            desc: "An open-source portfolio generator that turns markdown files into gorgeous, responsive portfolio sites. Gained 150+ stars on GitHub."
        }
    ],
    activeTemplate: "modern"
};

// Accordion Logic
function toggleAccordion(itemId) {
    const item = document.getElementById(itemId);
    const isActive = item.classList.contains('active');
    
    // Deactivate all accordions
    document.querySelectorAll('.accordion-item').forEach(acc => {
        acc.classList.remove('active');
    });

    // Toggle target
    if (!isActive) {
        item.classList.add('active');
    }
}

function expandAllAccordions() {
    document.querySelectorAll('.accordion-item').forEach(acc => {
        acc.classList.add('active');
    });
}

function collapseAllAccordions() {
    document.querySelectorAll('.accordion-item').forEach(acc => {
        acc.classList.remove('active');
    });
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    // Initialize mobile view classes on load
    if (window.innerWidth <= 768) {
        document.body.classList.add("mobile-view-edit");
    }

    // Initialize Profiles Manager
    if (window.initProfiles) {
        window.initProfiles();
    } else {
        // Load from local storage if exists
        const savedState = localStorage.getItem('resumake_state');
        if (savedState) {
            try {
                state = JSON.parse(savedState);
            } catch (e) {
                console.error("Failed to parse saved state, using default values.");
            }
        }
    }

    // Set initial values in inputs
    setFormFields();
    
    // Bind event listeners
    bindInputEvents();

    // Populate API key input if exists
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey && document.getElementById("api-key-input")) {
        document.getElementById("api-key-input").value = savedKey;
    }

    // Update sidebar indicators initially
    updateSidebarBadges();
    
    // Render list items
    renderExperienceList();
    renderEducationList();
    renderProjectsList();
    renderSkillsTags();

    // Render preview
    renderResumePreview();
    
    // Switch templates to active one
    switchTemplate(state.activeTemplate);

    // Dynamic A4 Sheet Preview Scaling
    resizeResumePreview();
    window.addEventListener("resize", () => {
        resizeResumePreview();
        if (window.resizeCoverLetterPreview) {
            window.resizeCoverLetterPreview();
        }
    });
});

// Sync state data to form inputs
function setFormFields() {
    document.getElementById("target-job").value = state.targetJob || "";
    if (document.getElementById("target-company")) {
        document.getElementById("target-company").value = state.targetCompany || "";
    }
    if (document.getElementById("target-job-desc")) {
        document.getElementById("target-job-desc").value = state.jobDescription || "";
    }
    document.getElementById("input-name").value = state.name || "";
    document.getElementById("input-title").value = state.title || "";
    document.getElementById("input-email").value = state.email || "";
    document.getElementById("input-phone").value = state.phone || "";
    document.getElementById("input-location").value = state.location || "";
    document.getElementById("input-website").value = state.website || "";
    if (document.getElementById("input-dob")) document.getElementById("input-dob").value = state.dob || "";
    if (document.getElementById("input-nationality")) document.getElementById("input-nationality").value = state.nationality || "";
    if (document.getElementById("input-visa")) document.getElementById("input-visa").value = state.visaStatus || "";
    if (document.getElementById("input-marital")) document.getElementById("input-marital").value = state.maritalStatus || "";
    if (document.getElementById("input-languages")) document.getElementById("input-languages").value = state.languages || "";
    
    // Auto-calculate keywords match for current profile
    if (window.calculateJDMatch) {
        // Sync textareas first
        const modalJdText = document.getElementById("ats-jd-text");
        if (modalJdText) modalJdText.value = state.jobDescription || "";
        window.calculateJDMatch();
    }
}

// Bind standard text input keyup events to auto-save and update preview
function bindInputEvents() {
    const textInputs = [
        { id: "target-job", key: "targetJob" },
        { id: "input-name", key: "name" },
        { id: "input-title", key: "title" },
        { id: "input-email", key: "email" },
        { id: "input-phone", key: "phone" },
        { id: "input-location", key: "location" },
        { id: "input-website", key: "website" },
        { id: "input-dob", key: "dob" },
        { id: "input-nationality", key: "nationality" },
        { id: "input-visa", key: "visaStatus" },
        { id: "input-marital", key: "maritalStatus" },
        { id: "input-languages", key: "languages" }
    ];

    textInputs.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.addEventListener("input", (e) => {
                state[item.key] = e.target.value;
                autoSave();
                renderResumePreview();
            });
        }
    });

    // Skill input listener
    const skillInput = document.getElementById("skill-input");
    skillInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const val = skillInput.value.trim();
            if (val && !state.skills.includes(val)) {
                state.skills.push(val);
                skillInput.value = "";
                renderSkillsTags();
                autoSave();
                renderResumePreview();
                showToast("Skill added successfully!");
            }
        }
    });
}

// Auto Save State Helper
let saveTimeout;
function autoSave() {
    clearTimeout(saveTimeout);
    
    // Pulse save indicator status
    const saveDot = document.querySelector(".save-dot");
    const saveStatus = document.querySelector(".save-status");
    if (saveDot) {
        saveDot.classList.add("saving");
        if (saveStatus) saveStatus.innerHTML = '<span class="save-dot saving"></span> Saving...';
    }

    saveTimeout = setTimeout(() => {
        localStorage.setItem('resumake_state', JSON.stringify(state));
        
        if (window.profiles && window.activeProfileId) {
            const activeIdx = window.profiles.findIndex(p => p.id === window.activeProfileId);
            if (activeIdx !== -1) {
                window.profiles[activeIdx].resumeData = JSON.parse(JSON.stringify(state));
                window.profiles[activeIdx].updatedAt = Date.now();
                localStorage.setItem('resumake_profiles', JSON.stringify(window.profiles));
            }
        }

        updateATSScore();
        updateSidebarBadges();
        if (saveDot) {
            saveDot.classList.remove("saving");
            if (saveStatus) saveStatus.innerHTML = '<span class="save-dot"></span> Saved Locally';
        }
    }, 500);
}

// Toast Alert Manager
function showToast(message) {
    const toast = document.getElementById("toast-notify");
    const toastMsg = document.getElementById("toast-message");
    toastMsg.innerText = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* ==========================================
   DYNAMIC LIST RENDERERS & BUILDERS
   ========================================== */

// Skills Tags builder
function renderSkillsTags() {
    const container = document.getElementById("skills-tags-container");
    const input = document.getElementById("skill-input");
    
    // Clear old tags
    container.querySelectorAll('.tag').forEach(t => t.remove());

    state.skills.forEach(skill => {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.innerHTML = `${skill} <span class="tag-remove" onclick="removeSkill('${skill}')">&times;</span>`;
        container.insertBefore(tag, input);
    });
}

function removeSkill(skill) {
    state.skills = state.skills.filter(s => s !== skill);
    renderSkillsTags();
    autoSave();
    renderResumePreview();
}

// Experience List Builder
function renderExperienceList() {
    const container = document.getElementById("experience-list");
    container.innerHTML = "";

    state.experience.forEach((exp, idx) => {
        const card = document.createElement("div");
        card.className = "list-item-card";
        card.innerHTML = `
            <div class="list-item-card-header">
                <span class="card-drag-handle"><i class="fa-solid fa-grip-vertical"></i> Experience #${idx + 1}</span>
                <button class="list-item-delete" onclick="deleteExperience('${exp.id}')" title="Delete Experience"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Company</label>
                    <input type="text" value="${exp.company}" oninput="updateExperience('${exp.id}', 'company', this.value)" placeholder="e.g. Google">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" value="${exp.role}" oninput="updateExperience('${exp.id}', 'role', this.value)" placeholder="e.g. Lead Engineer">
                </div>
            </div>
            <div class="form-group">
                <label>Date Range</label>
                <input type="text" value="${exp.date}" oninput="updateExperience('${exp.id}', 'date', this.value)" placeholder="e.g. Jan 2022 - Present">
            </div>
            <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <label>Description / Accomplishments</label>
                    <button class="ai-btn ai-btn-accent" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px;" onclick="openAIEngine('${exp.id}')">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> AI Rewrite
                    </button>
                </div>
                <textarea oninput="updateExperience('${exp.id}', 'desc', this.value)" placeholder="Include bullet points for achievements...">${exp.desc}</textarea>
            </div>

            <!-- STAR Method Helper Toggle -->
            <div style="margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 10px;">
                <button class="util-link-btn" onclick="window.toggleStarHelper('${exp.id}')" style="font-size: 0.75rem; font-weight: 600; color: #a5b4fc; background: none; border: none; cursor: pointer; padding: 0;">
                    <i class="fa-solid fa-star"></i> STAR Bullet Assistant
                </button>
                
                <div id="star-helper-${exp.id}" style="display: none; margin-top: 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 12px; gap: 8px; flex-direction: column;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">Situation</label>
                            <input type="text" id="star-s-${exp.id}" placeholder="e.g. Server crash during traffic spikes" style="width:100%; padding: 6px 10px; font-size: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">Task</label>
                            <input type="text" id="star-t-${exp.id}" placeholder="e.g. Needed to optimize querying performance" style="width:100%; padding: 6px 10px; font-size: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">Action</label>
                            <input type="text" id="star-a-${exp.id}" placeholder="e.g. Optimized database index mapping" style="width:100%; padding: 6px 10px; font-size: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">Result</label>
                            <input type="text" id="star-r-${exp.id}" placeholder="e.g. Latency decreased by 40%" style="width:100%; padding: 6px 10px; font-size: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
                        <button class="btn btn-secondary" style="font-size: 0.7rem; padding: 4px 10px;" onclick="window.generateStarBullet('${exp.id}')">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> Generate Bullet
                        </button>
                    </div>
                    
                    <!-- Bullet Output Preview -->
                    <div id="star-output-container-${exp.id}" style="display: none; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.06);">
                        <div style="font-size: 0.7rem; font-weight: 700; color: var(--success); margin-bottom: 4px;">Generated Bullet:</div>
                        <div id="star-output-${exp.id}" style="font-size: 0.75rem; line-height: 1.4; color: white; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 8px; white-space: pre-wrap;"></div>
                        <div style="display: flex; justify-content: flex-end; gap: 6px;">
                            <button class="btn btn-secondary" style="font-size: 0.7rem; padding: 4px 8px;" onclick="window.rejectStarBullet('${exp.id}')">Discard</button>
                            <button class="btn btn-success" style="font-size: 0.7rem; padding: 4px 8px;" onclick="window.insertStarBullet('${exp.id}')">Insert Bullet</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function addExperience() {
    const newExp = {
        id: "exp-" + Date.now(),
        company: "",
        role: "",
        date: "",
        desc: ""
    };
    state.experience.push(newExp);
    renderExperienceList();
    autoSave();
    renderResumePreview();
}

function updateExperience(id, field, value) {
    const idx = state.experience.findIndex(e => e.id === id);
    if (idx !== -1) {
        state.experience[idx][field] = value;
        autoSave();
        renderResumePreview();
    }
}

function deleteExperience(id) {
    state.experience = state.experience.filter(e => e.id !== id);
    renderExperienceList();
    autoSave();
    renderResumePreview();
}

// Education List Builder
function renderEducationList() {
    const container = document.getElementById("education-list");
    container.innerHTML = "";

    state.education.forEach((edu, idx) => {
        const card = document.createElement("div");
        card.className = "list-item-card";
        card.innerHTML = `
            <div class="list-item-card-header">
                <span class="card-drag-handle"><i class="fa-solid fa-grip-vertical"></i> Education #${idx + 1}</span>
                <button class="list-item-delete" onclick="deleteEducation('${edu.id}')" title="Delete Education"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Institution</label>
                    <input type="text" value="${edu.institution}" oninput="updateEducation('${edu.id}', 'institution', this.value)" placeholder="e.g. Stanford University">
                </div>
                <div class="form-group">
                    <label>Degree / Certificate</label>
                    <input type="text" value="${edu.degree}" oninput="updateEducation('${edu.id}', 'degree', this.value)" placeholder="e.g. MS in Computer Science">
                </div>
            </div>
            <div class="form-group">
                <label>Timeline / Dates</label>
                <input type="text" value="${edu.date}" oninput="updateEducation('${edu.id}', 'date', this.value)" placeholder="e.g. 2018 - 2020">
            </div>
            <div class="form-group">
                <label>Additional Info (Optional)</label>
                <textarea oninput="updateEducation('${edu.id}', 'desc', this.value)" placeholder="GPA, notable courses...">${edu.desc}</textarea>
            </div>
        `;
        container.appendChild(card);
    });
}

function addEducation() {
    const newEdu = {
        id: "edu-" + Date.now(),
        institution: "",
        degree: "",
        date: "",
        desc: ""
    };
    state.education.push(newEdu);
    renderEducationList();
    autoSave();
    renderResumePreview();
}

function updateEducation(id, field, value) {
    const idx = state.education.findIndex(e => e.id === id);
    if (idx !== -1) {
        state.education[idx][field] = value;
        autoSave();
        renderResumePreview();
    }
}

function deleteEducation(id) {
    state.education = state.education.filter(e => e.id !== id);
    renderEducationList();
    autoSave();
    renderResumePreview();
}

// Projects List Builder
function renderProjectsList() {
    const container = document.getElementById("projects-list");
    container.innerHTML = "";

    state.projects.forEach((proj, idx) => {
        const card = document.createElement("div");
        card.className = "list-item-card";
        card.innerHTML = `
            <div class="list-item-card-header">
                <span class="card-drag-handle"><i class="fa-solid fa-grip-vertical"></i> Project #${idx + 1}</span>
                <button class="list-item-delete" onclick="deleteProject('${proj.id}')" title="Delete Project"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Project Name</label>
                    <input type="text" value="${proj.title}" oninput="updateProject('${proj.id}', 'title', this.value)" placeholder="e.g. E-Commerce Backend">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" value="${proj.role}" oninput="updateProject('${proj.id}', 'role', this.value)" placeholder="e.g. Sole Architect">
                </div>
            </div>
            <div class="form-group">
                <label>Description / Technical Details</label>
                <textarea oninput="updateProject('${proj.id}', 'desc', this.value)" placeholder="Describe features, stack used...">${proj.desc}</textarea>
            </div>
        `;
        container.appendChild(card);
    });
}

function addProject() {
    const newProj = {
        id: "proj-" + Date.now(),
        title: "",
        role: "",
        desc: ""
    };
    state.projects.push(newProj);
    renderProjectsList();
    autoSave();
    renderResumePreview();
}

function updateProject(id, field, value) {
    const idx = state.projects.findIndex(e => e.id === id);
    if (idx !== -1) {
        state.projects[idx][field] = value;
        autoSave();
        renderResumePreview();
    }
}

function deleteProject(id) {
    state.projects = state.projects.filter(p => p.id !== id);
    renderProjectsList();
    autoSave();
    renderResumePreview();
}

/* ==========================================
   RESUME TEMPLATE COMPILERS (PREVIEW RENDERING)
   ========================================== */

function switchTemplate(templateName) {
    state.activeTemplate = templateName;
    
    // Sync custom dropdown active label
    const label = document.getElementById("current-template-label");
    if (label) {
        const activeItem = document.querySelector(`.dropdown-item[data-value="${templateName}"]`);
        if (activeItem) {
            label.innerText = activeItem.textContent.trim();
        }
    }
    
    // Sync custom dropdown item active class
    document.querySelectorAll(".dropdown-item").forEach(item => {
        if (item.getAttribute("data-value") === templateName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Sync filter dropdown if exists (for legacy backup)
    const filter = document.getElementById("template-filter");
    if (filter) {
        filter.value = templateName;
    }
    
    // Update toolbar active button (legacy support)
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase() === templateName) {
            btn.classList.add('active');
        }
    });

    const sheet = document.getElementById("resume-sheet");
    // Swap template style class
    sheet.className = `resume-sheet t-${templateName}`;
    
    autoSave();
    renderResumePreview();
}

function renderResumePreview() {
    const sheet = document.getElementById("resume-sheet");
    sheet.innerHTML = "";
    
    const template = state.activeTemplate;
    
    if (template === "modern") {
        sheet.innerHTML = compileModernTemplate(state);
    } else if (template === "classic") {
        sheet.innerHTML = compileClassicTemplate(state);
    } else if (template === "executive") {
        sheet.innerHTML = compileExecutiveTemplate(state);
    } else if (template === "gcc") {
        sheet.innerHTML = compileGCCTemplate(state);
    } else if (template === "india") {
        sheet.innerHTML = compileIndiaTemplate(state);
    } else if (template === "europe") {
        sheet.innerHTML = compileEuropeTemplate(state);
    } else if (template === "us") {
        sheet.innerHTML = compileUSTemplate(state);
    } else if (template === "uk") {
        sheet.innerHTML = compileUKTemplate(state);
    } else if (template === "asia") {
        sheet.innerHTML = compileAsiaTemplate(state);
    } else if (template === "latam") {
        sheet.innerHTML = compileLATAMTemplate(state);
    }
    
    // Trigger score checking
    updateATSScore();
    // Scale sheet dynamically
    resizeResumePreview();
}



/* ==========================================
   ATS WIDGET & MODAL LOGIC
   ========================================== */

window.updateATSScore = function() {
    const report = ATSAuditor.audit(state);
    
    // Update toolbar indicator
    const tbBadge = document.getElementById("toolbar-ats-badge");
    const tbStatus = document.getElementById("toolbar-ats-status");
    
    if (tbBadge && tbStatus) {
        tbBadge.innerText = report.score;
        tbStatus.innerText = report.status;
        
        tbBadge.className = "ats-score-num";
        if (report.score < 60) {
            tbBadge.classList.add("low");
        } else if (report.score < 80) {
            tbBadge.classList.add("medium");
        }
        
        const pill = tbBadge.closest(".ats-score-pill");
        if (pill) {
            pill.className = "ats-score-pill";
            if (report.score < 60) {
                pill.classList.add("low");
            } else if (report.score < 80) {
                pill.classList.add("medium");
            }
        }
    }
    if (window.syncATSSuggestionsPanel) {
        window.syncATSSuggestionsPanel();
    }
}

function openATSModal() {
    updateATSScore();
    if (window.initATSDashboard) {
        window.initATSDashboard();
    }
    document.getElementById("ats-modal").classList.add("open");
}

function closeATSModal() {
    document.getElementById("ats-modal").classList.remove("open");
}

/* ==========================================
   AI PANEL / DRAWER LOGIC
   ========================================== */

function openAIPanel(titleText) {
    document.getElementById("ai-panel-title").innerText = titleText;
    document.getElementById("ai-panel").classList.add("open");
}

function closeAIPanel() {
    document.getElementById("ai-panel").classList.remove("open");
}

// Word-level LCS diff algorithm helper
function diffWords(original, revised) {
    const origWords = (original || "").split(/\s+/).filter(Boolean);
    const revWords = (revised || "").split(/\s+/).filter(Boolean);
    
    const n = origWords.length;
    const m = revWords.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (origWords[i - 1].toLowerCase() === revWords[j - 1].toLowerCase()) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    let i = n, j = m;
    const diff = [];
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && origWords[i - 1].toLowerCase() === revWords[j - 1].toLowerCase()) {
            diff.push({ type: 'unchanged', text: revWords[j - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.push({ type: 'addition', text: revWords[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            diff.push({ type: 'deletion', text: origWords[i - 1] });
            i--;
        }
    }
    diff.reverse();
    return diff;
}

function renderDiffHTML(original, revised) {
    const diffs = diffWords(original, revised);
    return diffs.map(d => {
        if (d.type === 'addition') {
            return `<ins style="background-color: #dcfce7; color: #15803d; text-decoration: none; padding: 2px 4px; border-radius: 2px; font-weight: 500; display: inline-block; margin: 1px 0;">${d.text}</ins>`;
        } else if (d.type === 'deletion') {
            return `<del style="background-color: #fee2e2; color: #b91c1c; text-decoration: line-through; padding: 2px 4px; border-radius: 2px; display: inline-block; margin: 1px 0;">${d.text}</del>`;
        } else {
            return `<span>${d.text}</span>`;
        }
    }).join(' ');
}

function toggleRewriteView(view) {
    const finalBox = document.getElementById("ai-rewrite-result");
    const diffBox = document.getElementById("ai-rewrite-diff");
    const btnFinal = document.getElementById("btn-show-final");
    const btnDiff = document.getElementById("btn-show-diff");
    if (!finalBox || !diffBox) return;
    
    if (view === 'diff') {
        finalBox.style.display = 'none';
        diffBox.style.display = 'block';
        if (btnFinal) btnFinal.className = 'ai-btn ai-btn-outline';
        if (btnDiff) btnDiff.className = 'ai-btn ai-btn-accent';
    } else {
        finalBox.style.display = 'block';
        diffBox.style.display = 'none';
        if (btnFinal) btnFinal.className = 'ai-btn ai-btn-accent';
        if (btnDiff) btnDiff.className = 'ai-btn ai-btn-outline';
    }
}

// AI: Experience rewriter drawer trigger
function openAIEngine(expId) {
    const exp = state.experience.find(e => e.id === expId);
    if (!exp) return;

    openAIPanel("AI Bullet Optimization");
    
    const body = document.getElementById("ai-panel-body");
    body.innerHTML = `
        <div class="ai-card">
            <div class="ai-card-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Experience Rewriter</div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                This tool rewrites weak summaries using strong action verbs (e.g. <em>Spearheaded</em>, <em>Optimized</em>) and embeds calculated metrics.
            </p>
            <div class="form-group" style="margin-top: 8px;">
                <label>Current Description</label>
                <textarea id="ai-rewrite-input" style="min-height:100px;">${exp.desc || ""}</textarea>
            </div>
            
            <button class="btn btn-primary" style="justify-content:center; margin-top: 4px;" onclick="runAIEperienceRewrite('${expId}')">
                <i class="fa-solid fa-wand-magic"></i> Generate Optimization
            </button>
        </div>
        
        <div id="ai-rewrite-result-card" class="ai-card" style="display:none; flex-direction: column; gap: 8px;">
            <div class="ai-card-title"><i class="fa-solid fa-square-poll-horizontal"></i> Optimized Result</div>
            <div style="display: flex; gap: 6px; margin: 4px 0;">
                <button id="btn-show-final" class="ai-btn ai-btn-accent" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 4px;" onclick="toggleRewriteView('final')">Final Output</button>
                <button id="btn-show-diff" class="ai-btn ai-btn-outline" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 4px;" onclick="toggleRewriteView('diff')">Visual Diff</button>
            </div>
            <div class="ai-result-box" id="ai-rewrite-result" style="white-space: pre-wrap;"></div>
            <div class="ai-result-box" id="ai-rewrite-diff" style="display:none; white-space: pre-wrap; line-height: 1.6;"></div>
            <div class="ai-btn-group" style="margin-top: 8px;">
                <button class="ai-btn ai-btn-accent" onclick="applyExperienceRewrite('${expId}')">Apply to Resume</button>
                <button class="ai-btn ai-btn-outline" onclick="runAIEperienceRewrite('${expId}')">Regenerate</button>
            </div>
        </div>
    `;
}

async function runAIEperienceRewrite(expId) {
    const textInput = document.getElementById("ai-rewrite-input").value;
    const resultCard = document.getElementById("ai-rewrite-result-card");
    const resultBox = document.getElementById("ai-rewrite-result");
    const diffBox = document.getElementById("ai-rewrite-diff");

    resultCard.style.display = "flex";
    resultBox.className = "ai-result-box loading";
    resultBox.innerHTML = '<div class="ai-spinner"></div>';
    if (diffBox) {
        diffBox.style.display = "none";
    }

    // Call AIService
    const optimized = await AIService.rewriteExperience(textInput, state.targetJob);
    
    resultBox.className = "ai-result-box";
    resultBox.innerText = optimized;
    
    if (diffBox) {
        diffBox.innerHTML = renderDiffHTML(textInput, optimized);
    }
    
    toggleRewriteView('final');
}

function applyExperienceRewrite(expId) {
    const rewritten = document.getElementById("ai-rewrite-result").innerText;
    updateExperience(expId, 'desc', rewritten);
    renderExperienceList();
    closeAIPanel();
    showToast("AI rewrite applied!");
}

// AI: Suggest Skills drawer trigger
function openAISkills() {
    openAIPanel("AI Skills Suggestions");
    const body = document.getElementById("ai-panel-body");
    
    body.innerHTML = `
        <div class="ai-card">
            <div class="ai-card-title"><i class="fa-solid fa-brain"></i> Suggest Missing Skills</div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                Analyzing your target job title (<em>${state.targetJob}</em>) and existing keywords to extract relevant skills that resume screeners look for.
            </p>
            <button class="btn btn-primary" style="justify-content:center; margin-top: 8px;" onclick="runAISkillsSuggestion()">
                <i class="fa-solid fa-wand-magic"></i> Scan and Recommend
            </button>
        </div>
        
        <div id="ai-skills-result-card" class="ai-card" style="display:none;">
            <div class="ai-card-title"><i class="fa-solid fa-tags"></i> Recommended Additions</div>
            <p style="font-size: 0.78rem; color: var(--text-muted);">Click skills to add them to your resume:</p>
            <div class="skills-list-preview" id="ai-skills-suggestions-list" style="margin: 8px 0; gap:8px;"></div>
            <button class="ai-btn ai-btn-outline" style="width:100%" onclick="closeAIPanel()">Done</button>
        </div>
    `;
}

async function runAISkillsSuggestion() {
    const resultCard = document.getElementById("ai-skills-result-card");
    const container = document.getElementById("ai-skills-suggestions-list");
    
    resultCard.style.display = "flex";
    container.className = "skills-list-preview loading";
    container.innerHTML = '<div class="ai-spinner" style="margin:20px auto;"></div>';

    const suggestions = await AIService.suggestSkills(state.skills, state.targetJob);
    
    container.className = "skills-list-preview";
    container.innerHTML = "";
    
    const items = suggestions.split(',').map(s => s.trim()).filter(s => s.length > 0);
    items.forEach(skill => {
        const span = document.createElement("span");
        span.className = "skill-badge-preview";
        span.style.cursor = "pointer";
        span.style.background = "rgba(99,102,241,0.15)";
        span.style.color = "#a5b4fc";
        span.style.border = "1px solid rgba(99,102,241,0.3)";
        span.style.transition = "transform 0.2s";
        
        span.innerHTML = `<i class="fa-solid fa-plus" style="font-size:0.6rem; margin-right:4px;"></i> ${skill}`;
        span.onclick = () => {
            if (!state.skills.includes(skill)) {
                state.skills.push(skill);
                renderSkillsTags();
                autoSave();
                renderResumePreview();
                span.style.opacity = "0.4";
                span.style.pointerEvents = "none";
                showToast(`Added ${skill}!`);
            }
        };
        container.appendChild(span);
    });
}

// AI: Cover Letter drawer trigger
function openAICoverLetter() {
    openAIPanel("AI Cover Letter Generator");
    const body = document.getElementById("ai-panel-body");
    
    body.innerHTML = `
        <div class="ai-card">
            <div class="ai-card-title"><i class="fa-solid fa-envelope-open-text"></i> Cover Letter Writer</div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                Synthesizes your personal info, experiences, and skills into a formal target letter for a <em>${state.targetJob}</em> application.
            </p>
            <button class="btn btn-primary" style="justify-content:center; margin-top: 8px;" onclick="runAICoverLetter()">
                <i class="fa-solid fa-wand-magic"></i> Generate Cover Letter
            </button>
        </div>
        
        <div id="ai-cl-result-card" class="ai-card" style="display:none; flex: 1; min-height: 350px;">
            <div class="ai-card-title" style="justify-content:space-between; width:100%;">
                <span><i class="fa-solid fa-file-text"></i> Tailored Document</span>
                <div style="display:flex; gap:6px;">
                    <button class="ai-btn ai-btn-outline" style="padding:2px 8px; font-size:0.75rem;" onclick="copyCoverLetter()"><i class="fa-solid fa-copy"></i> Copy</button>
                    <button class="ai-btn ai-btn-accent" style="padding:2px 8px; font-size:0.75rem; background:var(--primary-gradient);" onclick="window.previewCoverLetterTheme()"><i class="fa-solid fa-eye"></i> Preview Styled</button>
                </div>
            </div>
            <textarea id="ai-cl-result-text" style="flex:1; background:rgba(0,0,0,0.3); color:var(--text-primary); font-family:var(--font-mono); font-size:0.78rem; line-height:1.4; border:1px solid rgba(255,255,255,0.05); resize:none; overflow-y:auto; padding:10px; border-radius:6px;"></textarea>
            <button class="ai-btn ai-btn-accent" style="width:100%" onclick="closeAIPanel()">Close Panel</button>
        </div>
    `;
}

async function runAICoverLetter() {
    const resultCard = document.getElementById("ai-cl-result-card");
    const textTarget = document.getElementById("ai-cl-result-text");
    
    resultCard.style.display = "flex";
    textTarget.value = "Drafting cover letter... Please wait.";
    
    const letter = await AIService.generateCoverLetter(state, (chunkText) => {
        textTarget.value = chunkText;
    });
    textTarget.value = letter;
}

function copyCoverLetter() {
    const txt = document.getElementById("ai-cl-result-text");
    txt.select();
    document.execCommand("copy");
    showToast("Cover letter copied to clipboard!");
}

/* ==========================================
   PDF EXPORTER LOGIC
   ========================================== */

function exportPDF() {
    // We trigger standard window printing.
    // CSS @media print is optimized to isolate the A4 sheet, scaling it to paper full width.
    showToast("Opening Print Wizard. Choose 'Save as PDF' to download.");
    
    setTimeout(() => {
        window.print();
    }, 500);
}

/* ==========================================
   SIDEBAR PREMIUM INTERACTIONS & KEY SYNC
   ========================================== */

function toggleSettingsPanel() {
    const panel = document.getElementById("settings-panel");
    const btn = document.getElementById("settings-toggle-btn");
    panel.classList.toggle("open");
    btn.classList.toggle("active");
}

function saveApiKey() {
    const input = document.getElementById("api-key-input");
    const key = input.value.trim();
    localStorage.setItem('gemini_api_key', key);
    AIService.apiKey = key;
    showToast(key ? "Gemini API Key saved!" : "Gemini API Key removed. Using offline mock.");
    toggleSettingsPanel();
}

function updateSidebarBadges() {
    // 0. Target role details progress
    const badgeTarget = document.getElementById("badge-target");
    if (badgeTarget) {
        const val = state.title || "";
        const targetFilled = val.trim().length > 0;
        badgeTarget.innerText = targetFilled ? "100%" : "0%";
        if (targetFilled) {
            badgeTarget.classList.add("success");
        } else {
            badgeTarget.classList.remove("success");
        }
    }

    // 1. Personal details progress
    const personalFields = [state.name, state.title, state.email, state.phone, state.location];
    const personalFilled = personalFields.filter(f => f && f.trim().length > 0).length;
    const personalPct = Math.round((personalFilled / personalFields.length) * 100);
    const badgePersonal = document.getElementById("badge-personal");
    if (badgePersonal) {
        badgePersonal.innerText = `${personalPct}%`;
        if (personalPct === 100) {
            badgePersonal.classList.add("success");
        } else {
            badgePersonal.classList.remove("success");
        }
    }

    // 2. Regional details progress
    const regionalFields = [state.dob, state.nationality, state.visaStatus, state.maritalStatus, state.languages];
    const regionalFilled = regionalFields.filter(f => f && f.trim().length > 0).length;
    const regionalPct = Math.round((regionalFilled / regionalFields.length) * 100);
    const badgeRegional = document.getElementById("badge-regional");
    if (badgeRegional) {
        badgeRegional.innerText = `${regionalPct}%`;
        if (regionalPct === 100) {
            badgeRegional.classList.add("success");
        } else {
            badgeRegional.classList.remove("success");
        }
    }

    // 3. Experience Count
    const badgeExp = document.getElementById("badge-exp");
    if (badgeExp) badgeExp.innerText = state.experience ? state.experience.length : 0;

    // 4. Education Count
    const badgeEdu = document.getElementById("badge-edu");
    if (badgeEdu) badgeEdu.innerText = state.education ? state.education.length : 0;

    // 5. Skills Count
    const badgeSkills = document.getElementById("badge-skills");
    if (badgeSkills) badgeSkills.innerText = state.skills ? state.skills.length : 0;

    // 6. Projects Count
    const badgeProj = document.getElementById("badge-proj");
    if (badgeProj) badgeProj.innerText = state.projects ? state.projects.length : 0;
}

function resizeResumePreview() {
    const workspace = document.querySelector(".preview-workspace");
    const scaler = document.getElementById("resume-sheet-scaler");
    const sheet = document.getElementById("resume-sheet");
    if (!workspace || !scaler || !sheet) return;

    const pad = parseFloat(window.getComputedStyle(workspace).paddingLeft) * 2;
    const workspaceWidth = workspace.clientWidth - pad;
    const sheetWidth = 794;

    if (workspaceWidth < sheetWidth) {
        const scale = workspaceWidth / sheetWidth;
        sheet.style.transform = `scale(${scale})`;
        sheet.style.transformOrigin = "top center";
        const scaledHeight = sheet.offsetHeight * scale;
        scaler.style.height = `${scaledHeight}px`;
        scaler.style.width = "100%";
        scaler.style.justifyContent = "center";
    } else {
        sheet.style.transform = "none";
        sheet.style.transformOrigin = "top center";
        scaler.style.height = "auto";
        scaler.style.width = "794px";
        scaler.style.justifyContent = "center";
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.toggle("open");
        if (isOpen) {
            overlay.classList.add("active");
        } else {
            overlay.classList.remove("active");
        }
    }
}

window.switchMobileTab = function(tab) {
    const editBtn = document.getElementById("mobile-tab-edit");
    const previewBtn = document.getElementById("mobile-tab-preview");
    if (!editBtn || !previewBtn) return;
    
    if (tab === "edit") {
        document.body.classList.add("mobile-view-edit");
        document.body.classList.remove("mobile-view-preview");
        editBtn.classList.add("active");
        previewBtn.classList.remove("active");
    } else {
        document.body.classList.remove("mobile-view-edit");
        document.body.classList.add("mobile-view-preview");
        editBtn.classList.remove("active");
        previewBtn.classList.add("active");
        
        // Trigger scale update after rendering tab view
        setTimeout(() => {
            if (window.resizeResumePreview) {
                window.resizeResumePreview();
            }
        }, 80);
    }
};

// Start mobile users in edit tab mode automatically
document.addEventListener("DOMContentLoaded", () => {
    if (window.innerWidth <= 768) {
        window.switchMobileTab("edit");
    }
});

window.toggleTemplateDropdown = function(e) {
    const menu = document.getElementById("template-dropdown-menu");
    if (!menu) return;
    menu.classList.toggle("show");
    if (e) e.stopPropagation();
};

window.selectTemplateOption = function(val, labelText) {
    const menu = document.getElementById("template-dropdown-menu");
    if (menu) menu.classList.remove("show");
    
    switchTemplate(val);
    
    const label = document.getElementById("current-template-label");
    if (label) label.innerText = labelText;
};

document.addEventListener("click", (e) => {
    const container = document.getElementById("template-dropdown-container");
    const menu = document.getElementById("template-dropdown-menu");
    if (container && menu && !container.contains(e.target)) {
        menu.classList.remove("show");
    }
});

// Bind module-scoped variables and functions to window scope for index.html compatibility
window.state = state;
window.formatMultiline = formatMultiline;
window.renderResumePreview = renderResumePreview;
window.resizeResumePreview = resizeResumePreview;
window.showToast = showToast;
window.toggleAccordion = toggleAccordion;
window.expandAllAccordions = expandAllAccordions;
window.collapseAllAccordions = collapseAllAccordions;
window.addExperience = addExperience;
window.updateExperience = updateExperience;
window.deleteExperience = deleteExperience;
window.addEducation = addEducation;
window.updateEducation = updateEducation;
window.deleteEducation = deleteEducation;
window.addProject = addProject;
window.updateProject = updateProject;
window.deleteProject = deleteProject;
window.switchTemplate = switchTemplate;
window.toggleSidebar = toggleSidebar;
window.exportPDF = exportPDF;
window.copyCoverLetter = copyCoverLetter;
window.toggleSettingsPanel = toggleSettingsPanel;
window.saveApiKey = saveApiKey;
window.closeATSModal = closeATSModal;
window.openATSModal = openATSModal;
window.openAIEngine = openAIEngine;
window.openAISkills = openAISkills;
window.openAICoverLetter = openAICoverLetter;
window.applyExperienceRewrite = applyExperienceRewrite;
window.closeAIPanel = closeAIPanel;
window.toggleRewriteView = toggleRewriteView;
window.runAIEperienceRewrite = runAIEperienceRewrite;
