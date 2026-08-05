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
import { renderDiffHTML } from "./templates/diff.js";
import {
    openInterviewPracticeModal,
    closeInterviewPracticeModal,
    generateInterviewQuestions,
    loadFallbackInterviewQuestions,
    renderInterviewDashboard,
    getFeedbackMarkup,
    evaluateInterviewAnswer,
    loadFallbackEvaluation
} from "./practice.js";

// Debounce helper to prevent rapid main-thread blocks during fast typing
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Debounced wrapper for preview rendering to keep typing butter-smooth
const debouncedRenderPreview = debounce(() => {
    renderResumePreview();
}, 150);

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
    
    // Bind inline editing event handlers
    bindInlineEditEvents();
    
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
                debouncedRenderPreview();
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
        
        if (window.syncProfilesToServer) {
            window.syncProfilesToServer();
        }

        updateATSScore();
        updateSidebarBadges();
        if (saveDot) {
            saveDot.classList.remove("saving");
            if (saveStatus) saveStatus.innerHTML = '<span class="save-dot"></span> Saved Locally';
        }
    }, 2000);
}

// Toast Alert Manager
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notify");
    const toastMsg = document.getElementById("toast-message");
    const toastIcon = toast.querySelector("i");
    if (!toast || !toastMsg) return;
    
    toastMsg.innerText = message;
    
    if (toastIcon) {
        toastIcon.className = ""; // Clear existing classes
        if (type === 'error') {
            toastIcon.className = "fa-solid fa-triangle-exclamation";
            toastIcon.style.color = "#ef4444";
            toast.style.borderColor = "rgba(239, 68, 68, 0.4)";
        } else if (type === 'warning') {
            toastIcon.className = "fa-solid fa-circle-exclamation";
            toastIcon.style.color = "#f59e0b";
            toast.style.borderColor = "rgba(245, 158, 11, 0.4)";
        } else {
            toastIcon.className = "fa-solid fa-circle-check";
            toastIcon.style.color = ""; // Fallback to CSS var(--success)
            toast.style.borderColor = ""; // Fallback to CSS var(--border-color)
        }
    }
    
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
                    <input type="text" id="exp-company-${exp.id}" value="${exp.company}" oninput="updateExperience('${exp.id}', 'company', this.value)" placeholder="e.g. Google">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" id="exp-role-${exp.id}" value="${exp.role}" oninput="updateExperience('${exp.id}', 'role', this.value)" placeholder="e.g. Lead Engineer">
                </div>
            </div>
            <div class="form-group">
                <label>Date Range</label>
                <input type="text" id="exp-date-${exp.id}" value="${exp.date}" oninput="updateExperience('${exp.id}', 'date', this.value)" placeholder="e.g. Jan 2022 - Present">
            </div>
            <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <label>Description / Accomplishments</label>
                    <button class="ai-btn ai-btn-accent" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px;" onclick="openAIEngine('${exp.id}')">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> AI Rewrite
                    </button>
                </div>
                <textarea id="exp-desc-${exp.id}" oninput="updateExperience('${exp.id}', 'desc', this.value)" placeholder="Include bullet points for achievements...">${exp.desc}</textarea>
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
        debouncedRenderPreview();
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
                    <input type="text" id="edu-institution-${edu.id}" value="${edu.institution}" oninput="updateEducation('${edu.id}', 'institution', this.value)" placeholder="e.g. Stanford University">
                </div>
                <div class="form-group">
                    <label>Degree / Certificate</label>
                    <input type="text" id="edu-degree-${edu.id}" value="${edu.degree}" oninput="updateEducation('${edu.id}', 'degree', this.value)" placeholder="e.g. MS in Computer Science">
                </div>
            </div>
            <div class="form-group">
                <label>Timeline / Dates</label>
                <input type="text" id="edu-date-${edu.id}" value="${edu.date}" oninput="updateEducation('${edu.id}', 'date', this.value)" placeholder="e.g. 2018 - 2020">
            </div>
            <div class="form-group">
                <label>Additional Info (Optional)</label>
                <textarea id="edu-desc-${edu.id}" oninput="updateEducation('${edu.id}', 'desc', this.value)" placeholder="GPA, notable courses...">${edu.desc}</textarea>
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
        debouncedRenderPreview();
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
        debouncedRenderPreview();
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
    // Setup contenteditable attributes on personal fields
    makePreviewSheetEditable();
}

function setNestedValue(obj, path, value) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined) {
            current[part] = isNaN(parts[i + 1]) ? {} : [];
        }
        current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
}

function makePreviewSheetEditable() {
    const sheet = document.getElementById("resume-sheet");
    if (!sheet) return;

    // Helper to find and tag text nodes or elements matching state values
    const fields = [
        { key: "name", value: state.name },
        { key: "title", value: state.title },
        { key: "email", value: state.email },
        { key: "phone", value: state.phone },
        { key: "location", value: state.location },
        { key: "website", value: state.website },
        { key: "dob", value: state.dob },
        { key: "nationality", value: state.nationality },
        { key: "visaStatus", value: state.visaStatus },
        { key: "maritalStatus", value: state.maritalStatus },
        { key: "languages", value: state.languages }
    ];

    // 1. Tag name and title directly using selectors as robust targets
    const nameEl = sheet.querySelector(".resume-name, h1.name-preview");
    if (nameEl && state.name) {
        nameEl.setAttribute("contenteditable", "true");
        nameEl.setAttribute("data-path", "name");
        nameEl.style.outline = "none";
    }
    const titleEl = sheet.querySelector(".resume-title, .title-preview");
    if (titleEl && state.title) {
        titleEl.setAttribute("contenteditable", "true");
        titleEl.setAttribute("data-path", "title");
        titleEl.style.outline = "none";
    }

    // 2. Walk text nodes in the DOM to search and wrap all remaining personal details dynamically
    const walk = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const matches = [];

    while (node = walk.nextNode()) {
        const text = node.nodeValue.trim();
        if (!text) continue;

        for (const field of fields) {
            if (!field.value || field.key === "name" || field.key === "title") continue;
            
            if (text === field.value.trim()) {
                matches.push({ node, field });
                break;
            }
        }
    }

    // Wrap the text node in a contenteditable span
    matches.forEach(({ node, field }) => {
        const parent = node.parentNode;
        if (parent.getAttribute("data-path") === field.key) return;

        const span = document.createElement("span");
        span.setAttribute("contenteditable", "true");
        span.setAttribute("data-path", field.key);
        span.style.outline = "none";
        span.style.display = "inline-block";
        span.style.minWidth = "10px";
        span.innerText = node.nodeValue.trim();

        parent.replaceChild(span, node);
    });

    // Helper to find and tag item sections
    function tagItemFields(item, arrayName, index) {
        // 1. Title (Role for Exp, Institution for Edu, Title for Proj)
        const titleEl = item.querySelector(".item-title");
        if (titleEl) {
            let fieldName = "role";
            if (arrayName === "education") fieldName = "institution";
            if (arrayName === "projects") fieldName = "title";
            
            titleEl.setAttribute("contenteditable", "true");
            titleEl.setAttribute("data-path", `${arrayName}.${index}.${fieldName}`);
            titleEl.style.outline = "none";
        }

        // 2. Subtitle (Company for Exp, Degree for Edu, Role for Proj)
        const subtitleEl = item.querySelector(".item-subtitle");
        if (subtitleEl) {
            let fieldName = "company";
            if (arrayName === "education") fieldName = "degree";
            if (arrayName === "projects") fieldName = "role";

            subtitleEl.setAttribute("contenteditable", "true");
            subtitleEl.setAttribute("data-path", `${arrayName}.${index}.${fieldName}`);
            subtitleEl.style.outline = "none";
        }

        // 3. Date
        const dateEl = item.querySelector(".item-date");
        if (dateEl) {
            dateEl.setAttribute("contenteditable", "true");
            dateEl.setAttribute("data-path", `${arrayName}.${index}.date`);
            dateEl.style.outline = "none";
        }

        // 4. Description
        const descEl = item.querySelector(".item-desc");
        if (descEl) {
            descEl.setAttribute("contenteditable", "true");
            descEl.setAttribute("data-path", `${arrayName}.${index}.desc`);
            descEl.style.outline = "none";
        }
    }

    // 3. Tag resume sections (Experience, Education, Projects, Skills) dynamically
    const sections = sheet.querySelectorAll(".resume-section");
    sections.forEach(sec => {
        const titleEl = sec.querySelector(".resume-section-title");
        if (!titleEl) return;
        const titleText = titleEl.innerText.toLowerCase();

        if (titleText.includes("experienc") || titleText.includes("work") || titleText.includes("employ") || titleText.includes("experia")) {
            const items = sec.querySelectorAll(".experience-item");
            items.forEach((item, index) => {
                tagItemFields(item, "experience", index);
            });
        } else if (titleText.includes("educat") || titleText.includes("academic") || titleText.includes("educa")) {
            const items = sec.querySelectorAll(".experience-item, .project-item");
            items.forEach((item, index) => {
                tagItemFields(item, "education", index);
            });
        } else if (titleText.includes("project") || titleText.includes("proyect")) {
            const items = sec.querySelectorAll(".project-item, .experience-item");
            items.forEach((item, index) => {
                tagItemFields(item, "projects", index);
            });
        } else if (titleText.includes("skill") || titleText.includes("competenc") || titleText.includes("habilidad") || titleText.includes("expertise")) {
            const badges = sec.querySelectorAll(".skill-badge-preview");
            badges.forEach((badge, index) => {
                badge.setAttribute("contenteditable", "true");
                badge.setAttribute("data-path", `skills.${index}`);
                badge.style.outline = "none";
            });
        }
    });
}

function bindInlineEditEvents() {
    const sheet = document.getElementById("resume-sheet");
    if (!sheet) return;

    // Real-time keyboard input updates state and sidebar form fields
    sheet.addEventListener("input", (e) => {
        const target = e.target;
        const path = target.getAttribute("data-path");
        if (!path) return;

        // Use innerText to preserve line breaks in desc textarea elements
        const val = target.innerText;
        setNestedValue(state, path, val);

        // Update single-field sidebar elements dynamically
        if (path.indexOf(".") === -1) {
            let inputId = `input-${path}`;
            if (path === "visaStatus") inputId = "input-visa";
            if (path === "maritalStatus") inputId = "input-marital";

            const inputEl = document.getElementById(inputId);
            if (inputEl) {
                inputEl.value = val;
            }
        } else {
            // It's an array element (e.g. experience.0.company or skills.2)
            const parts = path.split(".");
            const arrayName = parts[0];
            const index = parseInt(parts[1]);
            const fieldName = parts[2];

            if (arrayName === "skills") {
                // Find matching skill tag input in the sidebar
                const skillInputs = document.querySelectorAll("#skills-tags-container .skill-tag input");
                if (skillInputs[index]) {
                    skillInputs[index].value = val;
                }
            } else {
                // Find list item ID from state
                const item = state[arrayName] ? state[arrayName][index] : null;
                if (item && item.id) {
                    let prefix = "";
                    if (arrayName === "experience") prefix = "exp-";
                    if (arrayName === "education") prefix = "edu-";
                    if (arrayName === "projects") prefix = "proj-";

                    let inputId = "";
                    if (arrayName === "projects") {
                        // Projects do not have prefixed IDs, synchronized fully on blur
                    } else {
                        inputId = `${prefix}${fieldName}-${item.id}`;
                        const inputEl = document.getElementById(inputId);
                        if (inputEl) {
                            inputEl.value = val;
                        }
                    }
                }
            }
        }

        // Save progress to local storage and queue cloud sync
        if (window.saveState) {
            window.saveState();
        }
    });

    // Blur (focus out) triggers a full preview compile to recalculate page metrics and breaks
    sheet.addEventListener("blur", (e) => {
        const target = e.target;
        if (target.getAttribute("data-path")) {
            // Rebuild sidebar list cards to ensure inputs match the updated array state
            const path = target.getAttribute("data-path");
            if (path.indexOf(".") !== -1) {
                const arrayName = path.split(".")[0];
                if (arrayName === "experience") renderExperienceList();
                if (arrayName === "education") renderEducationList();
                if (arrayName === "projects") renderProjectsList();
                if (arrayName === "skills") renderSkillsTags();
            }

            if (window.debouncedRenderPreview) {
                window.debouncedRenderPreview();
            } else {
                renderResumePreview();
            }
        }
    }, true);
}



/* ==========================================
   ATS WIDGET & MODAL LOGIC
   ========================================== */

window.updateATSScore = function() {
    const report = ATSAuditor.audit(state);
    
    // Update toolbar indicator
    const tbBadge = document.getElementById("toolbar-ats-badge");
    const tbStatus = document.getElementById("toolbar-ats-status");
    const radialFill = document.getElementById("ats-radial-progress");
    
    if (tbBadge && tbStatus) {
        tbBadge.innerText = report.score;
        tbStatus.innerText = report.status;
        
        // Update SVG circle percent fill
        if (radialFill) {
            radialFill.setAttribute("stroke-dasharray", `${report.score}, 100`);
            
            // Set dynamic stroke colors
            if (report.score < 60) {
                radialFill.setAttribute("stroke", "#ef4444");
            } else if (report.score < 80) {
                radialFill.setAttribute("stroke", "#f59e0b");
            } else {
                radialFill.setAttribute("stroke", "#10b981");
            }
        }
        
        const pill = tbBadge.closest(".ats-score-pill");
        if (pill) {
            pill.className = "ats-score-pill";
            if (report.score < 60) {
                pill.classList.add("low");
                pill.style.borderColor = "rgba(239, 68, 68, 0.3)";
            } else if (report.score < 80) {
                pill.classList.add("medium");
                pill.style.borderColor = "rgba(245, 158, 11, 0.3)";
            } else {
                pill.style.borderColor = "rgba(16, 185, 129, 0.3)";
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
            
            <div class="form-group" style="margin-top: 8px;">
                <label>Keywords to Weave (Optional)</label>
                <input type="text" id="ai-rewrite-keywords" placeholder="e.g. Docker, REST APIs" style="background: rgba(0,0,0,0.3); border:1px solid var(--border-color); color:white; border-radius:4px; padding:6px 10px; font-size:0.8rem; outline:none; width:100%;">
            </div>
            
            <button class="btn btn-primary" style="justify-content:center; margin-top: 8px;" onclick="runAIEperienceRewrite('${expId}')">
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
    const keywordsVal = document.getElementById("ai-rewrite-keywords") ? document.getElementById("ai-rewrite-keywords").value : "";
    const resultCard = document.getElementById("ai-rewrite-result-card");
    const resultBox = document.getElementById("ai-rewrite-result");
    const diffBox = document.getElementById("ai-rewrite-diff");

    resultCard.style.display = "flex";
    resultBox.className = "ai-result-box loading";
    resultBox.innerHTML = '<div class="ai-spinner"></div>';
    if (diffBox) {
        diffBox.style.display = "none";
    }

    // Call AIService with streaming support for real-time typing effect
    const optimized = await AIService.rewriteExperience(textInput, state.targetJob, keywordsVal, (chunkText) => {
        resultBox.className = "ai-result-box";
        resultBox.innerText = chunkText;
        if (diffBox) {
            diffBox.innerHTML = renderDiffHTML(textInput, chunkText);
        }
    });
    
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
    if (!panel || !btn) return;
    
    // On mobile viewports, make sure we switch to the Edit tab first
    if (window.switchMobileTab) {
        window.switchMobileTab("edit");
    }
    const sidebar = document.querySelector(".sidebar");
    if (sidebar && sidebar.style.left && sidebar.style.left.startsWith("-")) {
        if (window.toggleSidebar) window.toggleSidebar();
    }
    
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

window.previewZoom = 100;

function resizeResumePreview() {
    const workspace = document.querySelector(".preview-workspace");
    const scaler = document.getElementById("resume-sheet-scaler");
    const sheet = document.getElementById("resume-sheet");
    if (!workspace || !scaler || !sheet) return;

    const pad = parseFloat(window.getComputedStyle(workspace).paddingLeft) * 2;
    const workspaceWidth = workspace.clientWidth - pad;
    const sheetWidth = 794;
    
    const zoomFactor = (window.previewZoom || 100) / 100;

    if (workspaceWidth < sheetWidth) {
        const autoScale = workspaceWidth / sheetWidth;
        const scale = autoScale * zoomFactor;
        sheet.style.transform = `scale(${scale})`;
        sheet.style.transformOrigin = "top center";
        const scaledHeight = sheet.offsetHeight * scale;
        scaler.style.height = `${scaledHeight}px`;
        sheet.style.marginBottom = `${-sheet.offsetHeight * (1 - scale)}px`;
        scaler.style.width = "100%";
        scaler.style.justifyContent = "center";
    } else {
        const scale = zoomFactor;
        sheet.style.transform = scale === 1 ? "none" : `scale(${scale})`;
        sheet.style.transformOrigin = "top center";
        const scaledHeight = sheet.offsetHeight * scale;
        scaler.style.height = scale === 1 ? "auto" : `${scaledHeight}px`;
        sheet.style.marginBottom = scale === 1 ? "0px" : `${-sheet.offsetHeight * (1 - scale)}px`;
        scaler.style.width = scale === 1 ? "794px" : "100%";
        scaler.style.justifyContent = "center";
    }
}

window.adjustPreviewZoom = function(amount) {
    window.previewZoom = Math.max(50, Math.min(150, window.previewZoom + amount));
    const badge = document.getElementById("zoom-percent-badge");
    if (badge) badge.innerText = `${window.previewZoom}%`;
    resizeResumePreview();
};

window.resetPreviewZoom = function() {
    window.previewZoom = 100;
    const badge = document.getElementById("zoom-percent-badge");
    if (badge) badge.innerText = "100%";
    resizeResumePreview();
};

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
window.autoSave = autoSave;
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

window.openInterviewPracticeModal = openInterviewPracticeModal;
window.closeInterviewPracticeModal = closeInterviewPracticeModal;
window.generateInterviewQuestions = generateInterviewQuestions;
window.loadFallbackInterviewQuestions = loadFallbackInterviewQuestions;
window.renderInterviewDashboard = renderInterviewDashboard;
window.getFeedbackMarkup = getFeedbackMarkup;
window.evaluateInterviewAnswer = evaluateInterviewAnswer;
window.loadFallbackEvaluation = loadFallbackEvaluation;

window.updateStateObject = function(newData) {
    if (!newData) return;
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, newData);
};

window.toggleSettingsPanel = toggleSettingsPanel;
window.saveApiKey = saveApiKey;
window.renderExperienceList = renderExperienceList;
window.renderProjectsList = renderProjectsList;
window.renderSkillsTags = renderSkillsTags;
window.renderEducationList = renderEducationList;
window.closeATSModal = closeATSModal;
window.openATSModal = openATSModal;
window.openAIEngine = openAIEngine;
window.openAISkills = openAISkills;
window.openAICoverLetter = openAICoverLetter;
window.runAICoverLetter = runAICoverLetter;
window.applyExperienceRewrite = applyExperienceRewrite;
window.closeAIPanel = closeAIPanel;
window.toggleRewriteView = toggleRewriteView;
window.runAIEperienceRewrite = runAIEperienceRewrite;

// Supabase Authentication state management globals
window.supabaseClient = null;
window.supabaseSessionToken = null;
window.supabaseUserEmail = null;

window.openAuthModal = function() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    
    // Toggle active display view depending on user login state
    const loginForm = document.getElementById("auth-login-form");
    const registerForm = document.getElementById("auth-register-form");
    const userPanel = document.getElementById("auth-user-panel");
    const tabs = document.getElementById("auth-modal-tabs");
    const socialContainer = document.getElementById("auth-social-container");
    
    if (window.supabaseSessionToken) {
        if (loginForm) loginForm.style.display = "none";
        if (registerForm) registerForm.style.display = "none";
        if (tabs) tabs.style.display = "none";
        if (socialContainer) socialContainer.style.display = "none";
        if (userPanel) {
            userPanel.style.display = "block";
            const emailLabel = document.getElementById("auth-user-email");
            if (emailLabel) emailLabel.innerText = window.supabaseUserEmail || "User Session Active";
        }
    } else {
        if (userPanel) userPanel.style.display = "none";
        if (tabs) tabs.style.display = "flex";
        if (socialContainer) socialContainer.style.display = "block";
        window.switchAuthTab('login');
    }
    
    modal.classList.add("open");
};

window.handleOAuthLogin = async function(provider) {
    if (!window.supabaseClient) {
        showToast("Cloud authentication not configured.", "warning");
        return;
    }
    try {
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) showToast(`OAuth Error: ${error.message}`, "error");
    } catch (e) {
        console.error("OAuth exception: ", e);
        showToast("Social login request failed.", "error");
    }
};

window.closeAuthModal = function() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.remove("open");
};

window.switchAuthTab = function(tab) {
    const tabLogin = document.getElementById("auth-tab-login");
    const tabRegister = document.getElementById("auth-tab-register");
    const formLogin = document.getElementById("auth-login-form");
    const formRegister = document.getElementById("auth-register-form");
    
    if (tab === 'login') {
        if (tabLogin) {
            tabLogin.classList.add("active");
            tabLogin.style.color = "var(--primary)";
            tabLogin.style.borderBottomColor = "var(--primary)";
        }
        if (tabRegister) {
            tabRegister.classList.remove("active");
            tabRegister.style.color = "#64748b";
            tabRegister.style.borderBottomColor = "transparent";
        }
        if (formLogin) formLogin.style.display = "block";
        if (formRegister) formRegister.style.display = "none";
    } else {
        if (tabRegister) {
            tabRegister.classList.add("active");
            tabRegister.style.color = "var(--primary)";
            tabRegister.style.borderBottomColor = "var(--primary)";
        }
        if (tabLogin) {
            tabLogin.classList.remove("active");
            tabLogin.style.color = "#64748b";
            tabLogin.style.borderBottomColor = "transparent";
        }
        if (formRegister) formRegister.style.display = "block";
        if (formLogin) formLogin.style.display = "none";
    }
};

window.handleAuthSubmit = async function(event, mode) {
    event.preventDefault();
    if (!window.supabaseClient) {
        showToast("Cloud database not configured on server.", "warning");
        return;
    }
    
    const emailInput = document.getElementById(mode === 'login' ? 'login-email' : 'register-email');
    const passwordInput = document.getElementById(mode === 'login' ? 'login-password' : 'register-password');
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    try {
        let result;
        if (mode === 'login') {
            result = await window.supabaseClient.auth.signInWithPassword({ email, password });
        } else {
            result = await window.supabaseClient.auth.signUp({ email, password });
        }
        
        if (result.error) {
            console.error("Auth error details: ", result.error);
            showToast(`Authentication failed: ${result.error.message}`, "error");
        } else {
            if (mode === 'register' && result.data?.user?.identities?.length === 0) {
                showToast("Account already exists. Try signing in.", "warning");
            } else {
                showToast(mode === 'login' ? "Logged in successfully!" : "Account created! Confirm your email.");
                window.closeAuthModal();
            }
        }
    } catch (e) {
        console.error("Supabase auth exception: ", e);
        showToast("Authentication request failed.", "error");
    }
};

window.handleAuthLogout = async function() {
    if (!window.supabaseClient) return;
    try {
        await window.supabaseClient.auth.signOut();
        showToast("Signed out successfully.");
        window.closeAuthModal();
    } catch (e) {
        console.error("Sign out exception: ", e);
        showToast("Failed to sign out.", "error");
    }
};

// Initialize client side Supabase client
// Initialize client side Supabase client
async function initClientSupabase() {
    let config = null;
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            config = await response.json();
        }
    } catch (e) {
        console.warn("Could not fetch server configurations. Using offline Mock Auth.", e);
    }
    
    const hasRealConfig = config && config.supabaseUrl && config.supabaseAnonKey && typeof supabase !== 'undefined';
    
    if (hasRealConfig) {
        window.supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        
        // Listen to Auth State changes in Supabase
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            const prevToken = window.supabaseSessionToken;
            window.supabaseSessionToken = session?.access_token || null;
            window.supabaseUserEmail = session?.user?.email || null;
            
            const authBtn = document.getElementById("auth-status-btn");
            const saveStatus = document.querySelector(".save-status");
            
            if (session) {
                if (authBtn) {
                    authBtn.innerHTML = `<i class="fa-solid fa-cloud" style="color: #10b981;"></i> Synced`;
                    authBtn.title = `Synced with Cloud: ${session.user.email}`;
                }
                if (saveStatus) {
                    saveStatus.innerHTML = `<span class="save-dot" style="background-color: #10b981;"></span> Saved to Cloud`;
                }
            } else {
                if (authBtn) {
                    authBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Sync`;
                    authBtn.title = "Sync to Cloud Database";
                }
                if (saveStatus) {
                    saveStatus.innerHTML = `<span class="save-dot"></span> Saved Locally`;
                }
            }
            
            // Only reload profiles if token actually changed (prevents recursive loops)
            if (prevToken !== window.supabaseSessionToken) {
                window.initProfiles();
            }
        });
    } else {
        console.log("Supabase configurations not present on backend. Initializing local Mock Auth simulation engine.");
        let mockCallback = () => {};
        window.supabaseClient = {
            auth: {
                getSession: async () => {
                    const sessionStr = localStorage.getItem("mock_supabase_session");
                    return { data: { session: sessionStr ? JSON.parse(sessionStr) : null } };
                },
                signInWithPassword: async ({ email, password }) => {
                    const session = {
                        access_token: "mock-jwt-token-for-" + email,
                        user: { email: email, id: "mock-uuid-" + btoa(email) }
                    };
                    localStorage.setItem("mock_supabase_session", JSON.stringify(session));
                    mockCallback("SIGNED_IN", session);
                    return { data: session, error: null };
                },
                signUp: async ({ email, password }) => {
                    const session = {
                        access_token: "mock-jwt-token-for-" + email,
                        user: { email: email, id: "mock-uuid-" + btoa(email) }
                    };
                    localStorage.setItem("mock_supabase_session", JSON.stringify(session));
                    mockCallback("SIGNED_IN", session);
                    return { data: session, error: null };
                },
                signInWithOAuth: async ({ provider }) => {
                    // Simulate social login by signing in as a mock email
                    const email = `${provider}-user@mock.com`;
                    const session = {
                        access_token: "mock-jwt-token-for-" + email,
                        user: { email: email, id: "mock-uuid-" + btoa(email) }
                    };
                    localStorage.setItem("mock_supabase_session", JSON.stringify(session));
                    mockCallback("SIGNED_IN", session);
                    showToast(`Logged in via ${provider.toUpperCase()}!`);
                    return { data: session, error: null };
                },
                signOut: async () => {
                    localStorage.removeItem("mock_supabase_session");
                    mockCallback("SIGNED_OUT", null);
                    return { error: null };
                },
                onAuthStateChange: (cb) => {
                    mockCallback = cb;
                    const sessionStr = localStorage.getItem("mock_supabase_session");
                    const currentSession = sessionStr ? JSON.parse(sessionStr) : null;
                    cb("INITIAL_SESSION", currentSession);
                    return { data: { subscription: { unsubscribe: () => {} } } };
                }
            }
        };
        
        // Listen to Mock Auth state changes
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            const prevToken = window.supabaseSessionToken;
            window.supabaseSessionToken = session?.access_token || null;
            window.supabaseUserEmail = session?.user?.email || null;
            
            const authBtn = document.getElementById("auth-status-btn");
            const saveStatus = document.querySelector(".save-status");
            
            if (session) {
                if (authBtn) {
                    authBtn.innerHTML = `<i class="fa-solid fa-cloud" style="color: #10b981;"></i> Synced`;
                    authBtn.title = `Synced with Local Mock Cloud: ${session.user.email}`;
                }
                if (saveStatus) {
                    saveStatus.innerHTML = `<span class="save-dot" style="background-color: #10b981;"></span> Saved to Cloud (Mock)`;
                }
            } else {
                if (authBtn) {
                    authBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Sync`;
                    authBtn.title = "Sync to Cloud Database (Mock)";
                }
                if (saveStatus) {
                    saveStatus.innerHTML = `<span class="save-dot"></span> Saved Locally`;
                }
            }
            
            if (prevToken !== window.supabaseSessionToken) {
                window.initProfiles();
            }
        });
    }
}

// Kick off client check on script load
initClientSupabase();

// Theme Accent Switcher Manager
window.setThemeAccent = function(theme) {
    const colors = {
        cobalt: {
            primary: "#6366f1",
            accent: "#06b6d4",
            gradient: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
            glow: "0 0 15px rgba(99, 102, 241, 0.35)",
            glowColor: "rgba(99, 102, 241, 0.15)",
            bgGlow1: "rgba(99, 102, 241, 0.15)",
            bgGlow2: "rgba(6, 182, 212, 0.1)"
        },
        emerald: {
            primary: "#059669",
            accent: "#34d399",
            gradient: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
            glow: "0 0 15px rgba(5, 150, 105, 0.35)",
            glowColor: "rgba(5, 150, 105, 0.15)",
            bgGlow1: "rgba(5, 150, 105, 0.15)",
            bgGlow2: "rgba(52, 211, 153, 0.1)"
        },
        amber: {
            primary: "#f97316",
            accent: "#f43f5e",
            gradient: "linear-gradient(135deg, #f97316 0%, #f43f5e 100%)",
            glow: "0 0 15px rgba(249, 115, 22, 0.35)",
            glowColor: "rgba(249, 115, 22, 0.15)",
            bgGlow1: "rgba(249, 115, 22, 0.15)",
            bgGlow2: "rgba(244, 63, 94, 0.1)"
        },
        amethyst: {
            primary: "#8b5cf6",
            accent: "#ec4899",
            gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
            glow: "0 0 15px rgba(139, 92, 246, 0.35)",
            glowColor: "rgba(139, 92, 246, 0.15)",
            bgGlow1: "rgba(139, 92, 246, 0.15)",
            bgGlow2: "rgba(236, 72, 153, 0.1)"
        },
        aurora: {
            primary: "#0d9488",
            accent: "#84cc16",
            gradient: "linear-gradient(135deg, #0d9488 0%, #84cc16 100%)",
            glow: "0 0 15px rgba(13, 148, 136, 0.35)",
            glowColor: "rgba(13, 148, 136, 0.15)",
            bgGlow1: "rgba(13, 148, 136, 0.15)",
            bgGlow2: "rgba(132, 204, 22, 0.1)"
        },
        champagne: {
            primary: "#fb7185",
            accent: "#f59e0b",
            gradient: "linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)",
            glow: "0 0 15px rgba(251, 113, 133, 0.35)",
            glowColor: "rgba(251, 113, 133, 0.15)",
            bgGlow1: "rgba(251, 113, 133, 0.15)",
            bgGlow2: "rgba(245, 158, 11, 0.1)"
        }
    };
    
    const selected = colors[theme] || colors.cobalt;
    document.documentElement.style.setProperty('--primary', selected.primary);
    document.documentElement.style.setProperty('--primary-gradient', selected.gradient);
    document.documentElement.style.setProperty('--accent', selected.accent);
    document.documentElement.style.setProperty('--glow', selected.glow);
    document.documentElement.style.setProperty('--primary-glow', selected.glowColor);
    document.documentElement.style.setProperty('--bg-glow-1', selected.bgGlow1);
    document.documentElement.style.setProperty('--bg-glow-2', selected.bgGlow2);
    
    // Highlight active selection border
    document.querySelectorAll(".theme-bubble").forEach(el => {
        el.style.borderColor = el.getAttribute("data-theme") === theme ? "white" : "transparent";
    });
    
    localStorage.setItem("resumake_theme_accent", theme);
};

// Visual Diff Highlights toggle
window.toggleDiffHighlights = function() {
    const toggle = document.getElementById("diff-highlight-toggle");
    const sheet = document.getElementById("resume-sheet");
    if (!sheet) return;
    
    if (toggle && toggle.checked) {
        sheet.classList.add("diff-highlight-active");
        showToast("AI Diff Highlights visible.", "info");
    } else {
        sheet.classList.remove("diff-highlight-active");
        showToast("Highlights hidden. Viewing clean layout.", "info");
    }
};

// Toggle dark/light theme mode
window.toggleDarkLightMode = function() {
    const body = document.body;
    const btn = document.getElementById("theme-toggle-btn");
    if (!body || !btn) return;
    
    const isLight = body.classList.toggle("light-theme");
    
    if (isLight) {
        btn.innerHTML = `<i class="fa-solid fa-sun"></i>`;
        btn.title = "Switch to Dark Mode";
        localStorage.setItem("resumake_theme_mode", "light");
        showToast("Switched to Light Theme.", "info");
    } else {
        btn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
        btn.title = "Switch to Light Mode";
        localStorage.setItem("resumake_theme_mode", "dark");
        showToast("Switched to Dark Theme.", "info");
    }
};

// Load saved color theme accent & dark/light mode on script execute
setTimeout(() => {
    const savedTheme = localStorage.getItem("resumake_theme_accent") || "cobalt";
    window.setThemeAccent(savedTheme);
    
    const savedMode = localStorage.getItem("resumake_theme_mode") || "dark";
    if (savedMode === "light") {
        document.body.classList.add("light-theme");
        const btn = document.getElementById("theme-toggle-btn");
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-sun"></i>`;
            btn.title = "Switch to Dark Mode";
        }
    }
}, 200);

// Backup & Restore Profile Data (JSON Export/Import)
window.exportProfileBackup = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const filename = `resumake_backup_${(state.name || "profile").toLowerCase().replace(/\s+/g, "_")}.json`;
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Profile backup downloaded successfully!", "success");
};

window.importProfileBackup = function(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            if (!importedState.name && !importedState.experience && !importedState.skills) {
                throw new Error("Invalid format. Missing resume fields.");
            }
            // Update state
            window.updateStateObject(importedState);
            // Save state locally & sync
            if (window.saveState) {
                window.saveState();
            }
            // Update sidebar values
            setFormFields();
            // Re-render list elements in sidebar
            renderExperienceList();
            renderEducationList();
            renderProjectsList();
            renderSkillsTags();
            // Re-render A4 sheet preview
            renderResumePreview();
            showToast("Profile backup restored successfully!", "success");
        } catch (err) {
            alert("Error importing profile: " + err.message);
        }
    };
    reader.readAsText(file);
    // Reset input value to allow re-upload of same file
    input.value = "";
};

// Native Touch Swipe Gestures for Mobile Tab Transitions
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", (e) => {
    // Avoid triggering swipes on interactive inputs or editable elements
    const tag = e.target.tagName.toLowerCase();
    const isEditable = e.target.closest('[contenteditable="true"]') || e.target.closest('.ats-simulator-display') || e.target.closest('#settings-panel');
    if (tag === "input" || tag === "textarea" || tag === "select" || isEditable) {
        return;
    }
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", (e) => {
    const tag = e.target.tagName.toLowerCase();
    const isEditable = e.target.closest('[contenteditable="true"]') || e.target.closest('.ats-simulator-display') || e.target.closest('#settings-panel');
    if (tag === "input" || tag === "textarea" || tag === "select" || isEditable) {
        return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Check if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(diffX) > Math.abs(diffY) * 1.5 && Math.abs(diffX) > 75) {
        const isEditActive = document.body.classList.contains("mobile-view-edit");
        if (diffX < 0 && isEditActive) {
            // Swipe Left -> switch to Preview
            window.switchMobileTab("preview");
            showToast("Swiped to Preview");
        } else if (diffX > 0 && !isEditActive) {
            // Swipe Right -> switch to Edit Form
            window.switchMobileTab("edit");
            showToast("Swiped to Edit Form");
        }
    }
}, { passive: true });
