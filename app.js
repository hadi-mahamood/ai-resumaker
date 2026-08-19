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
import { AIService } from "./ai.js";
import { ATSAuditor } from "./ats.js";

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
}, 350);

// Decoupled, longer-debounced ATS score calculator to prevent heavy main-thread freezes
const debouncedUpdateATS = debounce(() => {
    updateATSScore();
}, 800);

/**
 * ResuMake AI - Main Application Controller
 * 
 * Manages state synchronization, dynamic list builders, tags rendering,
 * template compilers (Modern, Classic, Executive), local storage preservation,
 * AI Assistant drawer interface, ATS auditing triggers, and native PDF layout.
 */

// Core App State
var state = {
    targetJob: "",
    targetCountry: "US",
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    dob: "",
    nationality: "",
    visaStatus: "",
    maritalStatus: "",
    languages: "",
    skills: [],
    experience: [],
    education: [],
    projects: [],
    activeTemplate: "modern",
    showRegional: true,
    showSkills: true,
    showEducation: true,
    showProjects: true
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
        
        // Premium UX: Auto-scroll the preview workspace to the matching section
        setTimeout(() => {
            scrollToResumeSection(itemId);
        }, 100); // small delay to allow CSS transitions to initialize
    }
}

function scrollToResumeSection(itemId) {
    const workspace = document.querySelector(".preview-workspace");
    const sheet = document.getElementById("resume-sheet");
    if (!workspace || !sheet) return;

    let targetTitleText = "";
    if (itemId === "sec-name" || itemId === "sec-contact") {
        workspace.scrollTo({ top: 0, behavior: "smooth" });
        return;
    } else if (itemId === "sec-target") {
        workspace.scrollTo({ top: 0, behavior: "smooth" });
        return;
    } else if (itemId === "sec-regional") {
        targetTitleText = "Regional"; 
    } else if (itemId === "sec-experience") {
        targetTitleText = "Experience";
    } else if (itemId === "sec-education") {
        targetTitleText = "Education";
    } else if (itemId === "sec-skills") {
        targetTitleText = "Skills";
    } else if (itemId === "sec-projects") {
        targetTitleText = "Projects";
    } else if (itemId === "sec-languages") {
        targetTitleText = "Languages";
    }

    if (!targetTitleText) return;

    // Find section headers inside A4 sheet
    const sectionTitles = sheet.querySelectorAll(".resume-section-title, h2, h3, h4");
    let targetEl = null;

    for (let titleEl of sectionTitles) {
        const text = titleEl.textContent.trim().toLowerCase();
        if (text.includes(targetTitleText.toLowerCase()) || 
            (targetTitleText === "Skills" && text.includes("competencies")) || 
            (targetTitleText === "Languages" && text.includes("languages"))) {
            targetEl = titleEl;
            break;
        }
    }

    if (targetEl) {
        const workspaceRect = workspace.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const currentScroll = workspace.scrollTop;
        
        const targetScroll = currentScroll + (targetRect.top - workspaceRect.top) - 100;

        workspace.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: "smooth"
        });

        // Flash target section briefly with a premium subtle highlight
        const sectionContainer = targetEl.closest(".resume-section") || targetEl.parentElement;
        if (sectionContainer) {
            const originalBg = sectionContainer.style.backgroundColor;
            sectionContainer.style.transition = "background-color 0.4s ease";
            sectionContainer.style.backgroundColor = "rgba(99, 102, 241, 0.05)";
            setTimeout(() => {
                sectionContainer.style.backgroundColor = originalBg || "transparent";
            }, 800);
        }
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
    renderLanguagesTags();

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

    // Signal app initialization is complete
    window.appInitialized = true;
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
    if (window.loadNameSelects) window.loadNameSelects();
    document.getElementById("input-title").value = state.title || "";
    document.getElementById("input-email").value = state.email || "";
    document.getElementById("input-phone").value = state.phone || "";
    document.getElementById("input-location").value = state.location || "";
    document.getElementById("input-website").value = state.website || "";
    if (window.populateDOBDropdowns) window.populateDOBDropdowns();
    if (window.loadDOBSelects) window.loadDOBSelects();
    if (document.getElementById("input-nationality")) document.getElementById("input-nationality").value = state.nationality || "";
    if (document.getElementById("input-visa")) document.getElementById("input-visa").value = state.visaStatus || "";
    if (window.loadMaritalGenderSelects) window.loadMaritalGenderSelects();
    if (window.renderLanguagesTags) window.renderLanguagesTags();
    
    // Set section visibility checkboxes based on state
    const chkRegional = document.getElementById("visible-regional");
    const chkSkills = document.getElementById("visible-skills");
    const chkEducation = document.getElementById("visible-education");
    const chkProjects = document.getElementById("visible-projects");
    
    if (chkRegional) chkRegional.checked = state.showRegional !== false;
    if (chkSkills) chkSkills.checked = state.showSkills !== false;
    if (chkEducation) chkEducation.checked = state.showEducation !== false;
    if (chkProjects) chkProjects.checked = state.showProjects !== false;
    
    // Auto-calculate keywords match for current profile
    if (window.calculateJDMatch) {
        // Sync textareas first
        const modalJdText = document.getElementById("ats-jd-text");
        if (modalJdText) modalJdText.value = state.jobDescription || "";
        window.calculateJDMatch();
    }
}

const LOCATION_PRESETS = [
    // India
    { name: "Malappuram, Kerala, India", prefix: "+91" },
    { name: "Tirurangadi, Kerala, India", prefix: "+91" },
    { name: "Kochi, Kerala, India", prefix: "+91" },
    { name: "Kozhikode, Kerala, India", prefix: "+91" },
    { name: "Trivandrum, Kerala, India", prefix: "+91" },
    { name: "Thrissur, Kerala, India", prefix: "+91" },
    { name: "Palakkad, Kerala, India", prefix: "+91" },
    { name: "Wayanad, Kerala, India", prefix: "+91" },
    { name: "Bangalore, Karnataka, India", prefix: "+91" },
    { name: "Chennai, Tamil Nadu, India", prefix: "+91" },
    { name: "Mumbai, Maharashtra, India", prefix: "+91" },
    { name: "Delhi, NCR, India", prefix: "+91" },
    { name: "Hyderabad, Telangana, India", prefix: "+91" },
    { name: "Pune, Maharashtra, India", prefix: "+91" },
    { name: "Kolkata, West Bengal, India", prefix: "+91" },
    { name: "Ahmedabad, Gujarat, India", prefix: "+91" },
    { name: "Jaipur, Rajasthan, India", prefix: "+91" },
    { name: "Lucknow, Uttar Pradesh, India", prefix: "+91" },
    { name: "Patna, Bihar, India", prefix: "+91" },
    // United States
    { name: "Seattle, WA, USA", prefix: "+1" },
    { name: "San Francisco, CA, USA", prefix: "+1" },
    { name: "New York, NY, USA", prefix: "+1" },
    { name: "Austin, TX, USA", prefix: "+1" },
    { name: "Boston, MA, USA", prefix: "+1" },
    { name: "Chicago, IL, USA", prefix: "+1" },
    { name: "Los Angeles, CA, USA", prefix: "+1" },
    { name: "Houston, TX, USA", prefix: "+1" },
    { name: "Miami, FL, USA", prefix: "+1" },
    { name: "Atlanta, GA, USA", prefix: "+1" },
    { name: "Denver, CO, USA", prefix: "+1" },
    { name: "Portland, OR, USA", prefix: "+1" },
    // United Arab Emirates
    { name: "Dubai, United Arab Emirates", prefix: "+971" },
    { name: "Abu Dhabi, United Arab Emirates", prefix: "+971" },
    { name: "Sharjah, United Arab Emirates", prefix: "+971" },
    { name: "Ajman, United Arab Emirates", prefix: "+971" },
    { name: "Ras Al Khaimah, United Arab Emirates", prefix: "+971" },
    { name: "Fujairah, United Arab Emirates", prefix: "+971" },
    // Saudi Arabia
    { name: "Riyadh, Saudi Arabia", prefix: "+966" },
    { name: "Jeddah, Saudi Arabia", prefix: "+966" },
    { name: "Mecca, Saudi Arabia", prefix: "+966" },
    { name: "Medina, Saudi Arabia", prefix: "+966" },
    { name: "Dammam, Saudi Arabia", prefix: "+966" },
    { name: "Khobar, Saudi Arabia", prefix: "+966" },
    // Oman
    { name: "Muscat, Oman", prefix: "+968" },
    { name: "Salalah, Oman", prefix: "+968" },
    { name: "Sohar, Oman", prefix: "+968" },
    { name: "Nizwa, Oman", prefix: "+968" },
    // Qatar
    { name: "Doha, Qatar", prefix: "+974" },
    { name: "Al Rayyan, Qatar", prefix: "+974" },
    { name: "Al Wakrah, Qatar", prefix: "+974" },
    { name: "Khor, Qatar", prefix: "+974" },
    // Kuwait
    { name: "Kuwait City, Kuwait", prefix: "+965" },
    { name: "Hawally, Kuwait", prefix: "+965" },
    { name: "Salmiya, Kuwait", prefix: "+965" },
    // Bahrain
    { name: "Manama, Bahrain", prefix: "+973" },
    { name: "Riffa, Bahrain", prefix: "+973" },
    { name: "Muharraq, Bahrain", prefix: "+973" },
    // United Kingdom
    { name: "London, United Kingdom", prefix: "+44" },
    { name: "Manchester, United Kingdom", prefix: "+44" },
    { name: "Birmingham, United Kingdom", prefix: "+44" },
    { name: "Edinburgh, United Kingdom", prefix: "+44" },
    { name: "Glasgow, United Kingdom", prefix: "+44" },
    { name: "Leeds, United Kingdom", prefix: "+44" },
    { name: "Bristol, United Kingdom", prefix: "+44" },
    // Singapore
    { name: "Singapore, SG", prefix: "+65" },
    // Germany
    { name: "Berlin, Germany", prefix: "+49" },
    { name: "Munich, Germany", prefix: "+49" },
    { name: "Frankfurt, Germany", prefix: "+49" },
    // France
    { name: "Paris, France", prefix: "+33" },
    { name: "Lyon, France", prefix: "+33" },
    { name: "Marseille, France", prefix: "+33" },
    // Canada
    { name: "Toronto, ON, Canada", prefix: "+1" },
    { name: "Vancouver, BC, Canada", prefix: "+1" },
    { name: "Montreal, QC, Canada", prefix: "+1" },
    // Australia
    { name: "Sydney, NSW, Australia", prefix: "+61" },
    { name: "Melbourne, VIC, Australia", prefix: "+61" },
    { name: "Brisbane, QLD, Australia", prefix: "+61" },
    { name: "Perth, WA, Australia", prefix: "+61" },
    { name: "Adelaide, SA, Australia", prefix: "+61" },
    // Pakistan
    { name: "Karachi, Pakistan", prefix: "+92" },
    { name: "Lahore, Pakistan", prefix: "+92" },
    // Bangladesh
    { name: "Dhaka, Bangladesh", prefix: "+880" },
    // Philippines
    { name: "Manila, Philippines", prefix: "+63" },
    { name: "Cebu, Philippines", prefix: "+63" },
    // East & Southeast Asia
    { name: "Tokyo, Japan", prefix: "+81" },
    { name: "Osaka, Japan", prefix: "+81" },
    { name: "Seoul, South Korea", prefix: "+82" },
    { name: "Hong Kong, HK", prefix: "+852" },
    { name: "Shanghai, China", prefix: "+86" },
    { name: "Beijing, China", prefix: "+86" },
    { name: "Taipei, Taiwan", prefix: "+886" },
    { name: "Bangkok, Thailand", prefix: "+66" },
    { name: "Kuala Lumpur, Malaysia", prefix: "+60" },
    { name: "Jakarta, Indonesia", prefix: "+62" },
    { name: "Colombo, Sri Lanka", prefix: "+94" },
    { name: "Kathmandu, Nepal", prefix: "+977" },
    // Oceania
    { name: "Auckland, New Zealand", prefix: "+64" },
    { name: "Wellington, New Zealand", prefix: "+64" },
    // Africa
    { name: "Cairo, Egypt", prefix: "+20" },
    { name: "Johannesburg, South Africa", prefix: "+27" },
    { name: "Cape Town, South Africa", prefix: "+27" },
    { name: "Nairobi, Kenya", prefix: "+254" },
    { name: "Lagos, Nigeria", prefix: "+234" },
    { name: "Casablanca, Morocco", prefix: "+212" },
    // Europe (Other)
    { name: "Amsterdam, Netherlands", prefix: "+31" },
    { name: "Rotterdam, Netherlands", prefix: "+31" },
    { name: "Brussels, Belgium", prefix: "+32" },
    { name: "Zurich, Switzerland", prefix: "+41" },
    { name: "Geneva, Switzerland", prefix: "+41" },
    { name: "Rome, Italy", prefix: "+39" },
    { name: "Milan, Italy", prefix: "+39" },
    { name: "Madrid, Spain", prefix: "+34" },
    { name: "Barcelona, Spain", prefix: "+34" },
    { name: "Dublin, Ireland", prefix: "+353" },
    { name: "Vienna, Austria", prefix: "+43" },
    { name: "Warsaw, Poland", prefix: "+48" },
    { name: "Stockholm, Sweden", prefix: "+46" },
    { name: "Oslo, Norway", prefix: "+47" },
    { name: "Copenhagen, Denmark", prefix: "+45" },
    // Americas (Other)
    { name: "Mexico City, Mexico", prefix: "+52" },
    { name: "Sao Paulo, Brazil", prefix: "+55" },
    { name: "Buenos Aires, Argentina", prefix: "+54" },
    { name: "Bogota, Colombia", prefix: "+57" }
];

// Bind standard text input keyup events to auto-save and update preview
function bindInputEvents() {
    const textInputs = [
        { id: "target-job", key: "targetJob" },
        { id: "input-title", key: "title" },
        { id: "input-email", key: "email" },
        { id: "input-phone", key: "phone" },
        { id: "input-location", key: "location" },
        { id: "input-website", key: "website" },
        { id: "input-nationality", key: "nationality" },
        { id: "input-visa", key: "visaStatus" }
    ];

    textInputs.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.addEventListener("input", (e) => {
                state[item.key] = e.target.value;
                updateSidebarBadges();
                autoSave();
                debouncedRenderPreview();
            });
        }
    });

    // Create datalist elements dynamically for Location Suggestions
    let datalist = document.getElementById("location-suggestions");
    if (!datalist) {
        datalist = document.createElement("datalist");
        datalist.id = "location-suggestions";
        document.body.appendChild(datalist);
    }
    
    const locInput = document.getElementById("input-location");
    const phoneInput = document.getElementById("input-phone");
    if (locInput) {
        locInput.setAttribute("list", "location-suggestions");
        
        const populateLocationSuggestions = () => {
            const phoneVal = (phoneInput ? phoneInput.value.trim() : "");
            let matchedPrefix = "";
            
            if (phoneVal.startsWith("+")) {
                for (let preset of LOCATION_PRESETS) {
                    if (phoneVal.startsWith(preset.prefix)) {
                        matchedPrefix = preset.prefix;
                        break;
                    }
                }
            } else if (phoneVal.startsWith("91")) {
                matchedPrefix = "+91";
            }
            
            const sorted = [...LOCATION_PRESETS].sort((a, b) => {
                if (matchedPrefix) {
                    if (a.prefix === matchedPrefix && b.prefix !== matchedPrefix) return -1;
                    if (a.prefix !== matchedPrefix && b.prefix === matchedPrefix) return 1;
                }
                return a.name.localeCompare(b.name);
            });
            
            datalist.innerHTML = sorted.map(item => `<option value="${item.name}"></option>`).join('');
        };
        
        locInput.addEventListener("focus", populateLocationSuggestions);
        if (phoneInput) {
            phoneInput.addEventListener("input", populateLocationSuggestions);
        }
        
        locInput.addEventListener("input", (e) => {
            const val = e.target.value.trim();
            const prefix = window.detectPrefixFromLocation ? window.detectPrefixFromLocation(val) : "";
            
            if (prefix && phoneInput) {
                const currentPhone = phoneInput.value.trim();
                if (!currentPhone) {
                    phoneInput.value = prefix + " ";
                    state.phone = phoneInput.value;
                    updateSidebarBadges();
                    autoSave();
                    debouncedRenderPreview();
                } else {
                    const digits = currentPhone.replace(/\D/g, '');
                    if (digits.length === 10 && !currentPhone.startsWith("+") && !currentPhone.startsWith("0")) {
                        phoneInput.value = prefix + " " + currentPhone;
                        state.phone = phoneInput.value;
                        updateSidebarBadges();
                        autoSave();
                        debouncedRenderPreview();
                        showToast(`Formatted phone number with country prefix ${prefix}!`);
                    } else if (currentPhone.startsWith("+")) {
                        const prefixes = ["+91", "+971", "+966", "+968", "+974", "+965", "+973", "+65", "+49", "+33", "+44", "+1", "+61", "+92", "+880", "+63", "+81", "+82", "+852", "+86", "+886", "+66", "+60", "+62", "+94", "+977", "+64", "+20", "+27", "+254", "+234", "+212", "+31", "+32", "+41", "+39", "+34", "+353", "+43", "+48", "+46", "+47", "+45", "+52", "+55", "+54", "+57"];
                        const matchedOldPrefix = prefixes.find(p => currentPhone.startsWith(p));
                        if (matchedOldPrefix && matchedOldPrefix !== prefix) {
                            phoneInput.value = currentPhone.replace(matchedOldPrefix, prefix);
                            state.phone = phoneInput.value;
                            updateSidebarBadges();
                            autoSave();
                            debouncedRenderPreview();
                            showToast(`Updated phone country code to ${prefix} based on new location!`);
                        }
                    }
                }
            }
        });
    }

    // Create datalist elements dynamically for Phone Suggestions
    let phoneDatalist = document.getElementById("phone-suggestions");
    if (!phoneDatalist) {
        phoneDatalist = document.createElement("datalist");
        phoneDatalist.id = "phone-suggestions";
        document.body.appendChild(phoneDatalist);
    }
    
    if (phoneInput) {
        phoneInput.setAttribute("list", "phone-suggestions");
        
        const populatePhoneSuggestions = () => {
            const locVal = (locInput ? locInput.value.trim() : "");
            const matchedPrefix = window.detectPrefixFromLocation ? window.detectPrefixFromLocation(locVal) : "";
            
            const PHONE_CODE_SUGGESTIONS = [
                { code: "+91", label: "+91 (India)" },
                { code: "+1", label: "+1 (USA / Canada)" },
                { code: "+44", label: "+44 (United Kingdom)" },
                { code: "+971", label: "+971 (UAE)" },
                { code: "+966", label: "+966 (Saudi Arabia)" },
                { code: "+968", label: "+968 (Oman)" },
                { code: "+974", label: "+974 (Qatar)" },
                { code: "+965", label: "+965 (Kuwait)" },
                { code: "+973", label: "+973 (Bahrain)" },
                { code: "+65", label: "+65 (Singapore)" },
                { code: "+49", label: "+49 (Germany)" },
                { code: "+61", label: "+61 (Australia)" },
                { code: "+33", label: "+33 (France)" },
                { code: "+92", label: "+92 (Pakistan)" },
                { code: "+880", label: "+880 (Bangladesh)" },
                { code: "+63", label: "+63 (Philippines)" }
            ];
            
            const sorted = [...PHONE_CODE_SUGGESTIONS].sort((a, b) => {
                if (matchedPrefix) {
                    if (a.code === matchedPrefix && b.code !== matchedPrefix) return -1;
                    if (a.code !== matchedPrefix && b.code === matchedPrefix) return 1;
                }
                return 0;
            });
            
            phoneDatalist.innerHTML = sorted.map(item => `<option value="${item.code}">${item.label}</option>`).join('');
        };
        
        phoneInput.addEventListener("focus", populatePhoneSuggestions);
        
        phoneInput.addEventListener("input", (e) => {
            const phoneVal = e.target.value.trim();
            if (locInput && !locInput.value.trim()) {
                const DEFAULT_CITIES = {
                    "+91": "Malappuram, Kerala, India",
                    "+1": "Seattle, WA, USA",
                    "+44": "London, United Kingdom",
                    "+971": "Dubai, United Arab Emirates",
                    "+966": "Riyadh, Saudi Arabia",
                    "+968": "Muscat, Oman",
                    "+974": "Doha, Qatar",
                    "+965": "Kuwait City, Kuwait",
                    "+973": "Manama, Bahrain",
                    "+65": "Singapore, SG",
                    "+49": "Berlin, Germany",
                    "+61": "Sydney, NSW, Australia",
                    "+33": "Paris, France",
                    "+92": "Karachi, Pakistan",
                    "+880": "Dhaka, Bangladesh",
                    "+63": "Manila, Philippines"
                };
                
                for (let prefix in DEFAULT_CITIES) {
                    if (phoneVal === prefix || phoneVal === prefix + " ") {
                        locInput.value = DEFAULT_CITIES[prefix];
                        state.location = locInput.value;
                        updateSidebarBadges();
                        autoSave();
                        debouncedRenderPreview();
                        showToast(`Set default location to ${DEFAULT_CITIES[prefix]} based on phone code!`);
                        break;
                    }
                }
            }
        });
    }

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
                updateSidebarBadges();
                autoSave();
                renderResumePreview();
                showToast("Skill added successfully!");
            }
        }
    });

    // Language name input listener
    const langInput = document.getElementById("language-name-input");
    if (langInput) {
        langInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                window.addLanguageTag();
            }
        });
    }
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

function loadNameSelects() {
    const firstInput = document.getElementById("input-first-name");
    const lastInput = document.getElementById("input-last-name");
    if (!firstInput || !lastInput) return;
    
    const nameVal = state.name || "";
    if (!nameVal) {
        firstInput.value = "";
        lastInput.value = "";
        return;
    }
    
    const parts = nameVal.trim().split(/\s+/);
    if (parts.length > 1) {
        firstInput.value = parts[0];
        lastInput.value = parts.slice(1).join(" ");
    } else {
        firstInput.value = nameVal;
        lastInput.value = "";
    }
}

function updateNameCombined() {
    const firstInput = document.getElementById("input-first-name");
    const lastInput = document.getElementById("input-last-name");
    if (!firstInput || !lastInput) return;
    
    const first = firstInput.value.trim();
    const last = lastInput.value.trim();
    
    if (first && last) {
        state.name = `${first} ${last}`;
    } else if (first) {
        state.name = first;
    } else if (last) {
        state.name = last;
    } else {
        state.name = "";
    }
    
    updateSidebarBadges();
    autoSave();
    debouncedRenderPreview();
}

window.loadNameSelects = loadNameSelects;
window.updateNameCombined = updateNameCombined;

function populateDOBDropdowns() {
    const daySelect = document.getElementById("select-dob-day");
    const yearSelect = document.getElementById("select-dob-year");
    if (!daySelect || !yearSelect) return;
    
    // Clear old options except the placeholder
    daySelect.innerHTML = '<option value="">DD</option>';
    yearSelect.innerHTML = '<option value="">YYYY</option>';
    
    // Populate Days 01 - 31
    for (let d = 1; d <= 31; d++) {
        const val = String(d).padStart(2, '0');
        daySelect.insertAdjacentHTML('beforeend', `<option value="${val}">${val}</option>`);
    }
    
    // Populate Years (2026 down to 1950)
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1950; y--) {
        yearSelect.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
    }
}

function loadDOBSelects() {
    const daySelect = document.getElementById("select-dob-day");
    const monthSelect = document.getElementById("select-dob-month");
    const yearSelect = document.getElementById("select-dob-year");
    if (!daySelect || !monthSelect || !yearSelect) return;
    
    const dob = state.dob || "";
    if (!dob) {
        daySelect.value = "";
        monthSelect.value = "";
        yearSelect.value = "";
        return;
    }
    
    let day = "", month = "", year = "";
    
    // Check for DD-MM-YY or DD-MM-YYYY format (e.g. 12-10-98, 12-10-1998)
    const dmyMatch = dob.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
        day = dmyMatch[1].padStart(2, '0');
        month = dmyMatch[2].padStart(2, '0');
        let yr = dmyMatch[3];
        if (yr.length === 2) {
            const num = parseInt(yr, 10);
            year = num > 30 ? `19${yr}` : `20${yr}`;
        } else {
            year = yr;
        }
    } else {
        // Check for words format (e.g. "12 Oct 1998")
        const wordMatch = dob.match(/^(\d{1,2})\s+([A-Za-z]{3,10})\s+(\d{4})$/);
        if (wordMatch) {
            day = wordMatch[1].padStart(2, '0');
            const monthNames = {
                "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
                "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
            };
            const mName = wordMatch[2].toLowerCase().substring(0, 3);
            month = monthNames[mName] || "01";
            year = wordMatch[3];
        } else {
            // Check for YYYY-MM-DD standard date input fallback
            const ymdMatch = dob.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (ymdMatch) {
                year = ymdMatch[1];
                month = ymdMatch[2].padStart(2, '0');
                day = ymdMatch[3].padStart(2, '0');
            }
        }
    }
    
    daySelect.value = day;
    monthSelect.value = month;
    yearSelect.value = year;
}

function updateDOBCombined() {
    const daySelect = document.getElementById("select-dob-day");
    const monthSelect = document.getElementById("select-dob-month");
    const yearSelect = document.getElementById("select-dob-year");
    if (!daySelect || !monthSelect || !yearSelect) return;
    
    const day = daySelect.value;
    const month = monthSelect.value;
    const year = yearSelect.value;
    
    if (day && month && year) {
        const shortYear = year.slice(-2);
        state.dob = `${day}-${month}-${shortYear}`;
    } else {
        state.dob = "";
    }
    
    updateSidebarBadges();
    autoSave();
    debouncedRenderPreview();
}

window.populateDOBDropdowns = populateDOBDropdowns;
window.loadDOBSelects = loadDOBSelects;
window.updateDOBCombined = updateDOBCombined;

function loadMaritalGenderSelects() {
    const maritalSelect = document.getElementById("select-marital-status");
    const genderSelect = document.getElementById("select-gender-status");
    if (!maritalSelect || !genderSelect) return;
    
    const val = state.maritalStatus || "";
    if (val.includes(" / ")) {
        const parts = val.split(" / ").map(p => p.trim());
        maritalSelect.value = parts[0] || "";
        genderSelect.value = parts[1] || "";
    } else {
        const maritalOptions = ["Single", "Married", "Divorced", "Widowed"];
        const genderOptions = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
        if (maritalOptions.includes(val)) {
            maritalSelect.value = val;
            genderSelect.value = "";
        } else if (genderOptions.includes(val)) {
            maritalSelect.value = "";
            genderSelect.value = val;
        } else {
            maritalSelect.value = "";
            genderSelect.value = "";
        }
    }
}

function updateMaritalGenderCombined() {
    const maritalSelect = document.getElementById("select-marital-status");
    const genderSelect = document.getElementById("select-gender-status");
    if (!maritalSelect || !genderSelect) return;
    
    const marital = maritalSelect.value;
    const gender = genderSelect.value;
    
    if (marital && gender) {
        state.maritalStatus = `${marital} / ${gender}`;
    } else if (marital) {
        state.maritalStatus = marital;
    } else if (gender) {
        state.maritalStatus = gender;
    } else {
        state.maritalStatus = "";
    }
    
    updateSidebarBadges();
    autoSave();
    debouncedRenderPreview();
}

window.loadMaritalGenderSelects = loadMaritalGenderSelects;
window.updateMaritalGenderCombined = updateMaritalGenderCombined;

// Languages Tags builder
function renderLanguagesTags() {
    const container = document.getElementById("languages-tags-container");
    const nameInput = document.getElementById("language-name-input");
    
    if (!container || !nameInput) return;
    
    // Clear old tags
    container.querySelectorAll('.tag').forEach(t => t.remove());
    
    const items = state.languages ? state.languages.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    items.forEach((item, index) => {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.innerHTML = `<span class="tag-text">${item}</span> <span class="tag-remove" onclick="window.removeLanguageTag(${index})">&times;</span>`;
        
        container.insertBefore(tag, nameInput.parentNode);
    });
}

function addLanguageTag() {
    const nameInput = document.getElementById("language-name-input");
    const profSelect = document.getElementById("language-proficiency-select");
    if (!nameInput || !profSelect) return;
    
    const name = nameInput.value.trim();
    const prof = profSelect.value;
    
    if (name) {
        const newTag = `${name} (${prof})`;
        const items = state.languages ? state.languages.split(',').map(s => s.trim()).filter(Boolean) : [];
        
        if (!items.includes(newTag)) {
            items.push(newTag);
            state.languages = items.join(', ');
            nameInput.value = "";
            renderLanguagesTags();
            updateSidebarBadges();
            autoSave();
            renderResumePreview();
            showToast(`Language ${name} added!`);
        }
    }
}

function removeLanguageTag(index) {
    const items = state.languages ? state.languages.split(',').map(s => s.trim()).filter(Boolean) : [];
    items.splice(index, 1);
    state.languages = items.join(', ');
    renderLanguagesTags();
    updateSidebarBadges();
    autoSave();
    renderResumePreview();
}

window.renderLanguagesTags = renderLanguagesTags;
window.addLanguageTag = addLanguageTag;
window.removeLanguageTag = removeLanguageTag;

// Skills Tags builder
function renderSkillsTags() {
    const container = document.getElementById("skills-tags-container");
    const input = document.getElementById("skill-input");
    
    // Clear old tags
    container.querySelectorAll('.tag').forEach(t => t.remove());

    state.skills.forEach((skill, index) => {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.title = "Double-click to edit";
        tag.innerHTML = `<span class="tag-text">${skill}</span> <span class="tag-remove" onclick="removeSkill(${index})">&times;</span>`;
        
        tag.addEventListener("dblclick", (e) => {
            if (e.target.classList.contains("tag-remove")) return;
            
            const textSpan = tag.querySelector(".tag-text");
            if (!textSpan) return;
            
            const originalVal = textSpan.innerText;
            const inputField = document.createElement("input");
            inputField.type = "text";
            inputField.value = originalVal;
            inputField.className = "tag-edit-input";
            inputField.style.width = `${Math.max(60, originalVal.length * 8)}px`;
            
            tag.replaceChild(inputField, textSpan);
            inputField.focus();
            
            let saved = false;
            const saveEdit = () => {
                if (saved) return;
                saved = true;
                const newVal = inputField.value.trim();
                if (newVal && newVal !== originalVal) {
                    state.skills[index] = newVal;
                    autoSave();
                    renderResumePreview();
                }
                renderSkillsTags();
            };
            
            inputField.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") {
                    ev.preventDefault();
                    saveEdit();
                } else if (ev.key === "Escape") {
                    saved = true;
                    renderSkillsTags();
                }
            });
            
            inputField.addEventListener("blur", saveEdit);
        });
        
        container.insertBefore(tag, input);
    });
}

function removeSkill(index) {
    state.skills.splice(index, 1);
    renderSkillsTags();
    updateSidebarBadges();
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
                    <input type="text" id="exp-company-${exp.id}" value="${exp.company}" oninput="updateExperience('${exp.id}', 'company', this.value)" placeholder="e.g. Google, Microsoft, Startup (Type to set)">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" id="exp-role-${exp.id}" value="${exp.role}" oninput="updateExperience('${exp.id}', 'role', this.value)" placeholder="e.g. Lead Engineer, Product Manager, Analyst (Type to set)">
                </div>
            </div>
            <div class="form-group">
                <label>Date Range</label>
                <input type="text" id="exp-date-${exp.id}" value="${exp.date}" oninput="updateExperience('${exp.id}', 'date', this.value)" placeholder="e.g. Jan 2022 - Present, 2018 - 2020 (Type to set)">
            </div>
            <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <label>Description / Accomplishments</label>
                    <div style="display:flex; gap:6px;">
                        <button class="ai-btn ai-btn-outline" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; border: 1.5px solid var(--border-color); color: var(--text-secondary); cursor: pointer;" onclick="window.openBulletLibrary('${exp.id}')">
                            <i class="fa-solid fa-list-check"></i> Suggest Bullets
                        </button>
                        <button class="ai-btn ai-btn-accent" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px;" onclick="openAIEngine('${exp.id}')">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Rewrite
                        </button>
                    </div>
                </div>
                <textarea id="exp-desc-${exp.id}" oninput="updateExperience('${exp.id}', 'desc', this.value)" placeholder="e.g. Rebuilt database index mapping, decreasing query latency by 40% (Press Enter for new bullet)...">${exp.desc}</textarea>
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
    updateSidebarBadges();
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
    updateSidebarBadges();
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
                    <input type="text" id="edu-institution-${edu.id}" value="${edu.institution}" oninput="updateEducation('${edu.id}', 'institution', this.value)" placeholder="e.g. Stanford University, MIT, High School (Type to set)">
                </div>
                <div class="form-group">
                    <label>Degree / Certificate</label>
                    <input type="text" id="edu-degree-${edu.id}" value="${edu.degree}" oninput="updateEducation('${edu.id}', 'degree', this.value)" placeholder="e.g. MS in Computer Science, MBA, BTech (Type to set)">
                </div>
            </div>
            <div class="form-group">
                <label>Timeline / Dates</label>
                <input type="text" id="edu-date-${edu.id}" value="${edu.date}" oninput="updateEducation('${edu.id}', 'date', this.value)" placeholder="e.g. 2018 - 2020, 2014 - 2018 (Type to set)">
            </div>
            <div class="form-group">
                <label>Additional Info (Optional)</label>
                <textarea id="edu-desc-${edu.id}" oninput="updateEducation('${edu.id}', 'desc', this.value)" placeholder="e.g. GPA 3.8/4.0, Dean's List, coursework in Algorithms (Type to set)">${edu.desc}</textarea>
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
    updateSidebarBadges();
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
    updateSidebarBadges();
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
                    <input type="text" value="${proj.title}" oninput="updateProject('${proj.id}', 'title', this.value)" placeholder="e.g. E-Commerce Backend, Portfolio Webpage (Type to set)">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" value="${proj.role}" oninput="updateProject('${proj.id}', 'role', this.value)" placeholder="e.g. Sole Architect, Lead Developer, Contributor (Type to set)">
                </div>
            </div>
            <div class="form-group">
                <label>Description / Technical Details</label>
                <textarea oninput="updateProject('${proj.id}', 'desc', this.value)" placeholder="e.g. Designed distributed caching mechanism, improving page load speeds by 25% (Type to set)...">${proj.desc}</textarea>
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
    updateSidebarBadges();
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
    updateSidebarBadges();
    autoSave();
    renderResumePreview();
}

/* ==========================================
   RESUME TEMPLATE COMPILERS (PREVIEW RENDERING)
   ========================================== */

function switchTemplate(templateName) {
    state.activeTemplate = templateName;
    
    // Sync templates dropdown label
    const templatesLabel = document.getElementById("templates-dropdown-label");
    if (templatesLabel) {
        const templateTitles = {
            modern: "Modern",
            classic: "Classic",
            executive: "Executive",
            gcc: "GCC (Middle East)",
            india: "India (Academic)",
            europe: "Europe (Europass)",
            us: "US / Canada",
            uk: "UK / Commonwealth",
            asia: "Asia / Pacific",
            latam: "Latin America"
        };
        if (templateTitles[templateName]) {
            templatesLabel.innerText = templateTitles[templateName];
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

function drawPageBreakGuideline() {
    const sheet = document.getElementById("resume-sheet");
    if (!sheet) return;
    
    // Remove any existing guides first
    sheet.querySelectorAll(".page-break-guide").forEach(el => el.remove());
    
    // Add guideline at 1120px (slightly before 1123px boundary)
    const guide = document.createElement("div");
    guide.className = "page-break-guide";
    guide.style.position = "absolute";
    guide.style.top = "1120px";
    guide.style.left = "0";
    guide.style.right = "0";
    guide.style.borderTop = "2.5px dashed rgba(99, 102, 241, 0.4)";
    guide.style.pointerEvents = "none";
    guide.style.textAlign = "center";
    guide.style.fontSize = "0.68rem";
    guide.style.color = "var(--primary)";
    guide.style.fontWeight = "700";
    guide.style.paddingTop = "6px";
    guide.style.zIndex = "100";
    guide.style.fontFamily = "var(--font-sans)";
    guide.style.letterSpacing = "0.5px";
    guide.innerHTML = `<i class="fa-solid fa-scissors"></i> A4 PAGE 1 ENDS HERE (PDF CUT-OFF LINE)`;
    
    sheet.appendChild(guide);
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
    
    // Trigger score checking (decoupled from the render path to avoid keystroke lag)
    debouncedUpdateATS();
    // Scale sheet dynamically
    resizeResumePreview();
    // Setup contenteditable attributes on personal fields
    makePreviewSheetEditable();
    // Render visual page break guideline
    drawPageBreakGuideline();
    // Apply user chosen typography metrics
    if (window.applyLayoutMetrics) window.applyLayoutMetrics();
    // Apply layout section visibility toggles
    applySectionVisibility();
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
    
    // Generate pre-written suggestions from database based on target job classification
    const category = AIService.detectCategory(state.targetJob || "");
    const skills = AIService.knowledgeBase.skills[category] || [];
    const metrics = AIService.knowledgeBase.metrics[category] || [];
    
    const examples = [
        `Spearheaded development of core ${skills[0] || "product"} features, ${metrics[0] || "improving performance"}.`,
        `Engineered and integrated robust ${skills[1] || "system"} modules, ${metrics[1] || "saving manual effort"}.`,
        `Optimized database structures and ${skills[2] || "data"} pipelines, ${metrics[2] || "reducing crash rates"}.`,
        `Collaborated with cross-functional teams using ${skills[3] || "Agile"} methodologies, ${metrics[3] || "accelerating delivery"}.`,
        `Led implementation of scalable ${skills[4] || "architecture"} strategies, ${metrics[4] || "improving productivity"}.`
    ];

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
        
        <div class="ai-card" style="margin-top: 10px;">
            <div class="ai-card-title"><i class="fa-solid fa-lightbulb"></i> Job-Specific Pre-Written Bullets</div>
            <p style="font-size:0.72rem; color:var(--text-secondary); margin-bottom:8px;">Click any bullet to instantly append it to your current description:</p>
            <div class="ai-bullet-suggestions-list" style="display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto; padding-right:4px;">
                ${examples.map(ex => `
                    <div class="ai-bullet-item" onclick="document.getElementById('ai-rewrite-input').value += (document.getElementById('ai-rewrite-input').value ? '\\n' : '') + '- ${ex}'; window.showToast('Bullet appended!')" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:6px; padding:8px 10px; font-size:0.75rem; color:var(--text-secondary); cursor:pointer;">
                        - ${ex}
                    </div>
                `).join('')}
            </div>
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
                <button class="ai-btn ai-btn-outline" onclick="runAIEperienceRewrite('${expId}', true)">Regenerate</button>
            </div>
        </div>
    `;
}

async function runAIEperienceRewrite(expId, bypassCache = false) {
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
    }, bypassCache);
    
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
            <div class="ai-skills-list" id="ai-skills-suggestions-list"></div>
            <button class="ai-btn ai-btn-outline" style="width:100%" onclick="closeAIPanel()">Done</button>
        </div>
    `;
}

async function runAISkillsSuggestion() {
    const resultCard = document.getElementById("ai-skills-result-card");
    const container = document.getElementById("ai-skills-suggestions-list");
    
    resultCard.style.display = "flex";
    container.className = "ai-skills-list loading";
    container.innerHTML = '<div class="ai-spinner" style="margin:20px auto;"></div>';

    const suggestions = await AIService.suggestSkills(state.skills, state.targetJob);
    
    container.className = "ai-skills-list";
    container.innerHTML = "";
    
    const items = suggestions.split(',').map(s => s.trim()).filter(s => s.length > 0);
    items.forEach(skill => {
        const span = document.createElement("span");
        span.className = "ai-skill-badge";
        
        span.innerHTML = `<i class="fa-solid fa-plus" style="font-size:0.65rem; margin-right:6px;"></i>${skill}`;
        span.onclick = () => {
            if (!state.skills.includes(skill)) {
                state.skills.push(skill);
                renderSkillsTags();
                autoSave();
                renderResumePreview();
                span.classList.add("added");
                span.innerHTML = `<i class="fa-solid fa-check" style="font-size:0.65rem; margin-right:6px;"></i>${skill}`;
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
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">
                Synthesizes your personal info, experiences, and skills into a formal target letter for a <em>${state.targetJob}</em> application.
            </p>
            
            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary);">Writing Tone</label>
                <select id="ai-cl-tone" class="form-input" style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1.5px solid var(--border-color); border-radius: 6px; padding: 8px; color: white;">
                    <option value="Professional" selected>Professional (Standard)</option>
                    <option value="Confident">Confident & Assertive</option>
                    <option value="Creative">Creative & Storytelling</option>
                    <option value="Direct">Direct & Concise</option>
                </select>
            </div>
            
            <div style="margin-top: 10px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary);">Document Length</label>
                <select id="ai-cl-length" class="form-input" style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1.5px solid var(--border-color); border-radius: 6px; padding: 8px; color: white;">
                    <option value="Medium" selected>Medium (3 Paragraphs)</option>
                    <option value="Short">Short (2 Paragraphs)</option>
                    <option value="Long">Long (4 Paragraphs)</option>
                </select>
            </div>
            
            <button class="btn btn-primary" style="justify-content:center; margin-top: 8px; width: 100%;" onclick="runAICoverLetter()">
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
    const toneSelect = document.getElementById("ai-cl-tone");
    const lengthSelect = document.getElementById("ai-cl-length");
    
    const tone = toneSelect ? toneSelect.value : "Professional";
    const length = lengthSelect ? lengthSelect.value : "Medium";
    
    resultCard.style.display = "flex";
    textTarget.value = "Drafting cover letter... Please wait.";
    
    const letter = await AIService.generateCoverLetter(state, tone, length, (chunkText) => {
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
        const val = state.targetJob || "";
        const targetFilled = val.trim().length > 0;
        badgeTarget.innerText = targetFilled ? "100%" : "0%";
        if (targetFilled) {
            badgeTarget.classList.add("success");
        } else {
            badgeTarget.classList.remove("success");
        }
    }

    // 1. Personal details progress (including website/portfolio input)
    const personalFields = [state.name, state.title, state.email, state.phone, state.location, state.website];
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

    // Call Resume Strength progress helper
    if (window.updateCompletenessProgress) {
        window.updateCompletenessProgress();
    }
}

window.previewZoom = 100;

let resizePending = false;
function resizeResumePreview() {
    if (resizePending) return;
    resizePending = true;
    
    requestAnimationFrame(() => {
        resizePending = false;
        
        const workspace = document.querySelector(".preview-workspace");
        const scaler = document.getElementById("resume-sheet-scaler");
        const sheet = document.getElementById("resume-sheet");
        if (!workspace || !scaler || !sheet) return;

        // Perform all layout reads first to prevent forced synchronous layouts
        const pad = parseFloat(window.getComputedStyle(workspace).paddingLeft) * 2;
        const workspaceWidth = workspace.clientWidth - pad;
        const sheetWidth = 794;
        const sheetHeight = sheet.offsetHeight;
        const zoomFactor = (window.previewZoom || 100) / 100;

        // Apply visual scale writes cleanly
        if (workspaceWidth < sheetWidth) {
            const autoScale = workspaceWidth / sheetWidth;
            const scale = autoScale * zoomFactor;
            sheet.style.transform = `scale(${scale})`;
            sheet.style.transformOrigin = "top center";
            const scaledHeight = sheetHeight * scale;
            scaler.style.height = `${scaledHeight}px`;
            sheet.style.marginBottom = `${-sheetHeight * (1 - scale)}px`;
            scaler.style.width = "100%";
            scaler.style.justifyContent = "center";
        } else {
            const scale = zoomFactor;
            sheet.style.transform = scale === 1 ? "none" : `scale(${scale})`;
            sheet.style.transformOrigin = "top center";
            const scaledHeight = sheetHeight * scale;
            scaler.style.height = scale === 1 ? "auto" : `${scaledHeight}px`;
            sheet.style.marginBottom = scale === 1 ? "0px" : `${-sheetHeight * (1 - scale)}px`;
            scaler.style.width = scale === 1 ? "794px" : "100%";
            scaler.style.justifyContent = "center";
        }
        
        // Call PDF page count & overflow advisor helper
        if (window.updatePDFPageAdvisor) {
            window.updatePDFPageAdvisor();
        }
    });
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
    const menu = document.getElementById("templates-dropdown-menu");
    if (menu) menu.style.display = "none";
    
    switchTemplate(val);
    
    // Update templates dropdown button state text
    const btn = document.getElementById("chip-templates-dropdown");
    const label = document.getElementById("templates-dropdown-label");
    if (btn && label) {
        label.innerText = labelText.split(" (")[0];
    }
};

window.toggleTemplatesDropdown = function(e) {
    const menu = document.getElementById("templates-dropdown-menu");
    const btn = document.getElementById("chip-templates-dropdown");
    if (!menu || !btn) return;
    
    // Close other dropdowns
    const aiMenu = document.getElementById("ai-dropdown-menu");
    if (aiMenu) aiMenu.style.display = "none";

    const isShowing = menu.style.display === "block";
    if (isShowing) {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
        const rect = btn.getBoundingClientRect();
        menu.style.position = "absolute";
        menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
        
        // Prevent menu from overflowing right edge of screen on narrow viewports
        let left = rect.left + window.scrollX;
        const menuWidth = 230;
        const screenWidth = window.innerWidth;
        if (left + menuWidth > screenWidth) {
            left = screenWidth - menuWidth - 12;
        }
        menu.style.left = `${Math.max(12, left)}px`;
        menu.style.zIndex = "100000";
    }
    if (e) e.stopPropagation();
};

window.toggleAIDropdown = function(e) {
    const menu = document.getElementById("ai-dropdown-menu");
    const btn = document.getElementById("chip-ai-dropdown");
    if (!menu || !btn) return;
    
    // Close other dropdowns
    const templatesMenu = document.getElementById("templates-dropdown-menu");
    if (templatesMenu) templatesMenu.style.display = "none";

    const isShowing = menu.style.display === "block";
    if (isShowing) {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
        const rect = btn.getBoundingClientRect();
        menu.style.position = "absolute";
        menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
        
        // Prevent menu from overflowing right edge of screen on narrow viewports
        let left = rect.right + window.scrollX - 200;
        const menuWidth = 200;
        const screenWidth = window.innerWidth;
        if (left + menuWidth > screenWidth) {
            left = screenWidth - menuWidth - 12;
        }
        menu.style.left = `${Math.max(12, left)}px`;
        menu.style.zIndex = "100000";
    }
    if (e) e.stopPropagation();
};

document.addEventListener("click", (e) => {
    // Templates Dropdown outside click
    const templatesContainer = document.getElementById("templates-dropdown-container");
    const templatesMenu = document.getElementById("templates-dropdown-menu");
    if (templatesContainer && templatesMenu && !templatesContainer.contains(e.target) && !templatesMenu.contains(e.target)) {
        templatesMenu.style.display = "none";
    }

    // AI Dropdown outside click
    const aiContainer = document.getElementById("ai-dropdown-container");
    const aiMenu = document.getElementById("ai-dropdown-menu");
    if (aiContainer && aiMenu && !aiContainer.contains(e.target) && !aiMenu.contains(e.target)) {
        aiMenu.style.display = "none";
    }
});

// Auto-hide dropdowns on window resize to avoid detached menus
window.addEventListener("resize", () => {
    const templatesMenu = document.getElementById("templates-dropdown-menu");
    if (templatesMenu) templatesMenu.style.display = "none";
    const aiMenu = document.getElementById("ai-dropdown-menu");
    if (aiMenu) aiMenu.style.display = "none";
});

// Dismiss dropdowns when toolbar scrolls horizontally to keep alignment synchronized
setTimeout(() => {
    const toolbar = document.querySelector(".toolbar");
    if (toolbar) {
        toolbar.addEventListener("scroll", () => {
            const templatesMenu = document.getElementById("templates-dropdown-menu");
            if (templatesMenu) templatesMenu.style.display = "none";
            const aiMenu = document.getElementById("ai-dropdown-menu");
            if (aiMenu) aiMenu.style.display = "none";
        }, { passive: true });
    }
}, 500);

// Typography & Layout custom variable state management
let layoutState = {
    fontSize: 11,
    lineHeight: 1.4,
    padding: 60
};

if (localStorage.getItem('resumake_layout')) {
    try {
        layoutState = JSON.parse(localStorage.getItem('resumake_layout'));
    } catch(e) {}
}

function applyLayoutMetrics() {
    const sheets = document.querySelectorAll(".resume-sheet");
    sheets.forEach(sheet => {
        sheet.style.setProperty("--resume-font-size", `${layoutState.fontSize}px`);
        sheet.style.setProperty("--resume-line-height", `${layoutState.lineHeight}`);
        sheet.style.setProperty("--resume-padding", `${layoutState.padding}px`);
        if (layoutState.accentColor) {
            sheet.style.setProperty("--resume-accent-color", layoutState.accentColor);
        }
        if (layoutState.fontFamily) {
            sheet.style.setProperty("--resume-font-family", layoutState.fontFamily);
        }
    });
    
    const clSheets = document.querySelectorAll(".cover-letter-sheet");
    clSheets.forEach(sheet => {
        sheet.style.setProperty("--resume-font-size", `${layoutState.fontSize}px`);
        sheet.style.setProperty("--resume-line-height", `${layoutState.lineHeight}`);
        sheet.style.setProperty("--resume-padding", `${layoutState.padding}px`);
        if (layoutState.accentColor) {
            sheet.style.setProperty("--resume-accent-color", layoutState.accentColor);
        }
        if (layoutState.fontFamily) {
            sheet.style.setProperty("--resume-font-family", layoutState.fontFamily);
        }
    });

    // Sync UI bubbles
    if (layoutState.accentColor) {
        const bubbles = document.querySelectorAll(".layout-accent-picker .theme-bubble");
        bubbles.forEach(bubble => {
            const color = bubble.getAttribute("data-color");
            if (color === layoutState.accentColor) {
                bubble.classList.add("active");
                bubble.style.borderColor = "white";
            } else {
                bubble.classList.remove("active");
                bubble.style.borderColor = "transparent";
            }
        });
    }

    // Sync Font Family selector
    const fontDropdown = document.getElementById("slider-font-family");
    if (fontDropdown && layoutState.fontFamily) {
        fontDropdown.value = layoutState.fontFamily;
    }

    const fLabel = document.getElementById("val-font-size");
    if (fLabel) fLabel.innerText = `${layoutState.fontSize}px`;
    
    const lLabel = document.getElementById("val-line-height");
    if (lLabel) lLabel.innerText = layoutState.lineHeight.toFixed(2);
    
    const pLabel = document.getElementById("val-padding");
    if (pLabel) pLabel.innerText = `${layoutState.padding}px`;
}

window.changeResumeAccent = function(color, btnEl) {
    layoutState.accentColor = color;
    localStorage.setItem('resumake_layout', JSON.stringify(layoutState));
    
    const sheets = document.querySelectorAll(".resume-sheet");
    sheets.forEach(sheet => {
        sheet.style.setProperty("--resume-accent-color", color);
    });
    const clSheets = document.querySelectorAll(".cover-letter-sheet");
    clSheets.forEach(sheet => {
        sheet.style.setProperty("--resume-accent-color", color);
    });
    
    const bubbles = document.querySelectorAll(".layout-accent-picker .theme-bubble");
    bubbles.forEach(bubble => {
        bubble.classList.remove("active");
        bubble.style.borderColor = "transparent";
    });
    
    if (btnEl) {
        btnEl.classList.add("active");
        btnEl.style.borderColor = "white";
    }
    showToast("Template accent color updated!");
};

function changeLayoutMetric(key, val) {
    layoutState[key] = (key === 'fontFamily') ? val : parseFloat(val);
    localStorage.setItem('resumake_layout', JSON.stringify(layoutState));
    applyLayoutMetrics();
}

function resetLayoutMetrics() {
    layoutState = { fontSize: 11, lineHeight: 1.4, padding: 60, accentColor: "#6366f1", fontFamily: "Outfit, sans-serif" };
    localStorage.setItem('resumake_layout', JSON.stringify(layoutState));
    
    if (document.getElementById("slider-font-size")) document.getElementById("slider-font-size").value = 11;
    if (document.getElementById("slider-line-height")) document.getElementById("slider-line-height").value = 1.4;
    if (document.getElementById("slider-padding")) document.getElementById("slider-padding").value = 60;
    if (document.getElementById("slider-font-family")) document.getElementById("slider-font-family").value = "Outfit, sans-serif";
    
    applyLayoutMetrics();
}

function optimizeLayoutForOnePage() {
    const sheet = document.getElementById("resume-sheet");
    if (!sheet) return;

    let fSize = 11.5;
    let lHeight = 1.45;
    let pad = 64;

    // Reset to maximum values first
    layoutState.fontSize = fSize;
    layoutState.lineHeight = lHeight;
    layoutState.padding = pad;
    applyLayoutMetrics();

    let iterations = 0;
    const maxIterations = 20;

    // Iteratively compress margins, line height, and font size until content fits on a single page (1123px)
    while (sheet.scrollHeight > 1125 && iterations < maxIterations) {
        if (pad > 32) {
            pad -= 4;
        } else if (lHeight > 1.20) {
            lHeight -= 0.05;
        } else if (fSize > 9.0) {
            fSize -= 0.5;
        } else {
            break;
        }

        layoutState.fontSize = fSize;
        layoutState.lineHeight = lHeight;
        layoutState.padding = pad;
        applyLayoutMetrics();
        iterations++;
    }

    localStorage.setItem('resumake_layout', JSON.stringify(layoutState));
    
    if (document.getElementById("slider-font-size")) document.getElementById("slider-font-size").value = fSize;
    if (document.getElementById("slider-line-height")) document.getElementById("slider-line-height").value = lHeight;
    if (document.getElementById("slider-padding")) document.getElementById("slider-padding").value = pad;
    
    if (sheet.scrollHeight <= 1125) {
        showToast("Auto-Fit: Layout adjusted perfectly to exactly 1 page!");
    } else {
        showToast("Auto-Fit: Layout compressed to maximize single-page content!");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applyLayoutMetrics();
    
    if (document.getElementById("slider-font-size")) document.getElementById("slider-font-size").value = layoutState.fontSize;
    if (document.getElementById("slider-line-height")) document.getElementById("slider-line-height").value = layoutState.lineHeight;
    if (document.getElementById("slider-padding")) document.getElementById("slider-padding").value = layoutState.padding;
    if (document.getElementById("slider-font-family") && layoutState.fontFamily) {
        document.getElementById("slider-font-family").value = layoutState.fontFamily;
    }
});

// Bind module-scoped variables and functions to window scope for index.html compatibility
window.state = state;
window.formatMultiline = formatMultiline;
window.renderResumePreview = renderResumePreview;
window.resizeResumePreview = resizeResumePreview;
window.showToast = showToast;
window.autoSave = autoSave;
window.removeSkill = removeSkill;
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
window.applyLayoutMetrics = applyLayoutMetrics;
window.changeLayoutMetric = changeLayoutMetric;
window.resetLayoutMetrics = resetLayoutMetrics;
window.optimizeLayoutForOnePage = optimizeLayoutForOnePage;

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
window.runAISkillsSuggestion = runAISkillsSuggestion;
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

function detectPrefixFromLocation(locText) {
    if (!locText) return "";
    const clean = locText.toLowerCase();
    
    const keywordsMap = [
        { keys: ["india", "kerala", "mumbai", "delhi", "bangalore", "chennai", "hyderabad", "pune", "kolkata", "ahmedabad", "jaipur", "lucknow", "patna", "malappuram", "tirurangadi", "kochi", "kozhikode", "trivandrum", "thrissur", "palakkad", "wayanad", "in"], prefix: "+91" },
        { keys: ["usa", "united states", "america", "seattle", "san francisco", "new york", "austin", "boston", "chicago", "los angeles", "houston", "miami", "atlanta", "denver", "portland", "us"], prefix: "+1" },
        { keys: ["canada", "toronto", "vancouver", "montreal", "ca"], prefix: "+1" },
        { keys: ["united kingdom", "uk", "london", "manchester", "birmingham", "edinburgh", "glasgow", "leeds", "bristol", "gb"], prefix: "+44" },
        { keys: ["united arab emirates", "uae", "dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah", "fujairah", "ae"], prefix: "+971" },
        { keys: ["saudi arabia", "saudi", "riyadh", "jeddah", "mecca", "medina", "dammam", "khobar", "sa"], prefix: "+966" },
        { keys: ["oman", "muscat", "salalah", "sohar", "nizwa", "om"], prefix: "+968" },
        { keys: ["qatar", "doha", "al rayyan", "al wakrah", "khor", "qa"], prefix: "+974" },
        { keys: ["kuwait", "kuwait city", "hawally", "salmiya", "kw"], prefix: "+965" },
        { keys: ["bahrain", "manama", "riffa", "muharraq", "bh"], prefix: "+973" },
        { keys: ["singapore", "sg"], prefix: "+65" },
        { keys: ["germany", "berlin", "munich", "frankfurt", "de"], prefix: "+49" },
        { keys: ["france", "paris", "lyon", "marseille", "fr"], prefix: "+33" },
        { keys: ["australia", "sydney", "melbourne", "brisbane", "perth", "adelaide", "au"], prefix: "+61" },
        { keys: ["pakistan", "karachi", "lahore", "pk"], prefix: "+92" },
        { keys: ["bangladesh", "dhaka", "bd"], prefix: "+880" },
        { keys: ["philippines", "manila", "cebu", "ph"], prefix: "+63" },
        { keys: ["japan", "tokyo", "osaka", "jp"], prefix: "+81" },
        { keys: ["south korea", "korea", "seoul", "kr"], prefix: "+82" },
        { keys: ["hong kong", "hk"], prefix: "+852" },
        { keys: ["china", "shanghai", "beijing", "cn"], prefix: "+86" },
        { keys: ["taiwan", "taipei", "tw"], prefix: "+886" },
        { keys: ["thailand", "bangkok", "th"], prefix: "+66" },
        { keys: ["malaysia", "kuala lumpur", "my"], prefix: "+60" },
        { keys: ["indonesia", "jakarta", "id"], prefix: "+62" },
        { keys: ["sri lanka", "colombo", "lk"], prefix: "+94" },
        { keys: ["nepal", "kathmandu", "np"], prefix: "+977" },
        { keys: ["new zealand", "auckland", "wellington", "nz"], prefix: "+64" },
        { keys: ["egypt", "cairo", "eg"], prefix: "+20" },
        { keys: ["south africa", "johannesburg", "cape town", "za"], prefix: "+27" },
        { keys: ["kenya", "nairobi", "ke"], prefix: "+254" },
        { keys: ["nigeria", "lagos", "ng"], prefix: "+234" },
        { keys: ["morocco", "casablanca", "ma"], prefix: "+212" },
        { keys: ["netherlands", "holland", "amsterdam", "rotterdam", "nl"], prefix: "+31" },
        { keys: ["belgium", "brussels", "be"], prefix: "+32" },
        { keys: ["switzerland", "zurich", "geneva", "ch"], prefix: "+41" },
        { keys: ["italy", "rome", "milan", "it"], prefix: "+39" },
        { keys: ["spain", "madrid", "barcelona", "es"], prefix: "+34" },
        { keys: ["ireland", "dublin", "ie"], prefix: "+353" },
        { keys: ["austria", "vienna", "at"], prefix: "+43" },
        { keys: ["poland", "warsaw", "pl"], prefix: "+48" },
        { keys: ["sweden", "stockholm", "se"], prefix: "+46" },
        { keys: ["norway", "oslo", "no"], prefix: "+47" },
        { keys: ["denmark", "copenhagen", "dk"], prefix: "+45" },
        { keys: ["mexico", "mexico city", "mx"], prefix: "+52" },
        { keys: ["brazil", "sao paulo", "br"], prefix: "+55" },
        { keys: ["argentina", "buenos aires", "ar"], prefix: "+54" },
        { keys: ["colombia", "bogota", "co"], prefix: "+57" }
    ];
    
    for (let mapping of keywordsMap) {
        for (let key of mapping.keys) {
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(clean)) {
                return mapping.prefix;
            }
        }
    }
    
    for (let mapping of keywordsMap) {
        for (let key of mapping.keys) {
            if (clean.includes(key)) {
                return mapping.prefix;
            }
        }
    }
    
    return "";
}

window.detectPrefixFromLocation = detectPrefixFromLocation;

function getSampleDataByJobTitle(jobTitle) {
    const title = jobTitle.trim().toLowerCase();
    
    // 1. Data Science / Analytics / Machine Learning / AI
    if (title.includes("data") || title.includes("machine learning") || title.includes("ai ") || title.includes("artificial intelligence") || title.includes("analyst")) {
        return {
            name: "Sarah Chen",
            title: jobTitle,
            email: "sarah.chen@gmail.com",
            phone: "+1 415-555-0144",
            location: "San Francisco, CA, USA",
            website: "linkedin.com/in/sarahchen-data",
            dob: "04-05-1996",
            nationality: "Canadian",
            visaStatus: "H1-B Visa",
            maritalStatus: "Single / Female",
            languages: "English (Native), Mandarin (Fluent)",
            skills: ["Python", "SQL", "TensorFlow", "PyTorch", "Pandas & NumPy", "Tableau", "Git", "Spark"],
            experience: [
                {
                    id: "exp-1",
                    company: "Insight Analytics Corp",
                    role: "Lead Data Scientist",
                    date: "Mar 2023 - Present",
                    desc: "- Designed and deployed ML models that optimized search relevance, increasing conversion by 20%.\n- Led a team of 3 analysts to build dynamic dashboards that saved 15+ hours of manual reporting weekly.\n- Engineered automated data pipeline flows in Spark, reducing ETL latency by 45%."
                },
                {
                    id: "exp-2",
                    company: "DataWave Technologies",
                    role: "Data Analyst",
                    date: "Jun 2021 - Feb 2023",
                    desc: "- Conducted regression analyses to predict user churn, lowering customer attrition rate by 12%.\n- Queried databases to clean and structure 5M+ row analytics logs using SQL.\n- Built key predictive visualizations in Tableau for C-suite executive roadmap briefings."
                }
            ],
            education: [
                {
                    id: "edu-1",
                    institution: "Stanford University",
                    degree: "Master of Science in Statistics (Data Science track)",
                    date: "2019 - 2021",
                    desc: "Focus on Machine Learning, Statistical Inference, and Deep Architectures."
                }
            ],
            projects: [
                {
                    id: "proj-1",
                    title: "Fraud Detection Engine",
                    role: "Lead Researcher",
                    desc: "An open-source anomaly detection library that identifies invalid payment tokens in financial datasets using XGBoost."
                }
            ]
        };
    }
    
    // 2. Product / Project Management
    if (title.includes("product") || title.includes("project manager") || title.includes("scrum") || title.includes("program manager")) {
        return {
            name: "Marcus Vance",
            title: jobTitle,
            email: "marcus.vance@gmail.com",
            phone: "+1 212-555-0188",
            location: "New York, NY, USA",
            website: "linkedin.com/in/marcusvance-pm",
            dob: "18-09-1994",
            nationality: "American",
            visaStatus: "Citizen",
            maritalStatus: "Married / Male",
            languages: "English (Native), French (Conversational)",
            skills: ["Product Strategy", "Agile/Scrum Roadmap", "User Research", "JIRA & Confluence", "Amplitude & SQL", "A/B Testing"],
            experience: [
                {
                    id: "exp-1",
                    company: "InnovateTech Labs",
                    role: "Senior Product Manager",
                    date: "Feb 2023 - Present",
                    desc: "- Managed product roadmap for mobile checkout application, boosting daily active users (DAU) by 40%.\n- Collaborated with engineering and design leads to release 12 features using Agile sprints.\n- Formulated pricing model strategies that increased average checkout basket size by 18%."
                },
                {
                    id: "exp-2",
                    company: "Apex Enterprise Systems",
                    role: "Associate Product Manager",
                    date: "Jan 2021 - Jan 2023",
                    desc: "- Translated customer pain points into functional PRDs, reducing engineering rework by 25%.\n- Coordinated user testing initiatives for billing dashboard redesigns with 200+ global beta testers.\n- Monitored product health KPI trackers using SQL queries and Amplitude boards."
                }
            ],
            education: [
                {
                    id: "edu-1",
                    institution: "Wharton School, UPenn",
                    degree: "Bachelor of Science in Economics & Business Management",
                    date: "2016 - 2020",
                    desc: "Graduated Magna Cum Laude. President of the University Product Association."
                }
            ],
            projects: [
                {
                    id: "proj-1",
                    title: "SaaS Feedback Portal",
                    role: "Creator",
                    desc: "A widget-based customer feedback portal that maps text sentiments directly to JIRA ticketing systems."
                }
            ]
        };
    }
    
    // 3. Sales / Marketing
    if (title.includes("sale") || title.includes("market") || title.includes("marketing") || title.includes("seo") || title.includes("account executive")) {
        return {
            name: "Emily Rodriguez",
            title: jobTitle,
            email: "emily.rodriguez@gmail.com",
            phone: "+1 312-555-0155",
            location: "Chicago, IL, USA",
            website: "linkedin.com/in/emilyrodriguez",
            dob: "22-03-1997",
            nationality: "Mexican-American",
            visaStatus: "Citizen",
            maritalStatus: "Single / Female",
            languages: "English (Native), Spanish (Native)",
            skills: ["Digital Marketing", "SEO Strategy", "Salesforce CRM", "Google Analytics", "Content Copywriting", "Lead Generation"],
            experience: [
                {
                    id: "exp-1",
                    company: "GrowthSpark Media",
                    role: "Digital Marketing Manager",
                    date: "Aug 2023 - Present",
                    desc: "- Spearheaded localized SEO and Google Ads campaigns that generated $150K+ in new ARR.\n- Redesigned brand email sequences, improving marketing open rates from 14% to 28%.\n- Managed digital ad spend of $12K monthly, decreasing average customer acquisition cost (CAC) by 20%."
                },
                {
                    id: "exp-2",
                    company: "BrandBoosters Inc",
                    role: "Marketing Assistant",
                    date: "Sep 2021 - Jul 2023",
                    desc: "- Coordinated content calendars for Instagram, LinkedIn, and TikTok, growing followers by 65%.\n- Drafted B2B outreach templates that raised outbound conversion rates by 15%.\n- Analyzed traffic patterns in Google Analytics, submitting weekly report summaries to VP."
                }
            ],
            education: [
                {
                    id: "edu-1",
                    institution: "Northwestern University",
                    degree: "Bachelor of Science in Communication & Marketing",
                    date: "2017 - 2021",
                    desc: "Specialized in Integrated Marketing Communications. GPA: 3.82."
                }
            ],
            projects: [
                {
                    id: "proj-1",
                    title: "LeadGen Campaign Hub",
                    role: "Campaign Designer",
                    desc: "Designed and launched an automated digital newsletter hub that acquired 10K+ active subscribers in 3 months."
                }
            ]
        };
    }
    
    // 4. Human Resources / Recruiting
    if (title.includes("hr ") || title.includes("human resource") || title.includes("recruit") || title.includes("talent")) {
        return {
            name: "David Kim",
            title: jobTitle,
            email: "david.kim@gmail.com",
            phone: "+1 213-555-0122",
            location: "Los Angeles, CA, USA",
            website: "linkedin.com/in/davidkim-hr",
            dob: "15-11-1995",
            nationality: "American",
            visaStatus: "Citizen",
            maritalStatus: "Single / Male",
            languages: "English (Native), Korean (Fluent)",
            skills: ["Talent Acquisition", "Employee Onboarding", "ATS Management", "Conflict Resolution", "HR Operations", "Compensation Analysis"],
            experience: [
                {
                    id: "exp-1",
                    company: "PeopleFirst Solutions",
                    role: "HR Specialist",
                    date: "Nov 2022 - Present",
                    desc: "- Managed end-to-end recruitment workflows for 50+ tech positions, lowering average time-to-hire by 18 days.\n- Facilitated monthly company-wide onboarding bootcamps, improving 90-day retention index by 15%.\n- Resolved employee complaints and conflict cases, ensuring 100% compliance with labor regulations."
                },
                {
                    id: "exp-2",
                    company: "TalentSource Staffing",
                    role: "Junior Recruiter",
                    date: "Jul 2020 - Oct 2022",
                    desc: "- Sourced candidates using LinkedIn Recruiter and job boards, feeding pipeline with 80+ qualified resumes monthly.\n- Maintained candidate status updates in ATS, ensuring clear documentation of feedback.\n- Coordinated interviewing schedules and background checks for client placements."
                }
            ],
            education: [
                {
                    id: "edu-1",
                    institution: "University of California, Los Angeles (UCLA)",
                    degree: "Bachelor of Arts in Psychology & Human Resources",
                    date: "2016 - 2020",
                    desc: "Dean's List. Recipient of the HR Professional scholarship award."
                }
            ],
            projects: [
                {
                    id: "proj-1",
                    title: "Automated Interview Scheduler",
                    role: "Project Lead",
                    desc: "Initiated a third-party calendar widget integration that saved the HR team 8 hours of manual scheduling weekly."
                }
            ]
        };
    }
    
    // 5. Healthcare / Nursing / Medical
    if (title.includes("nurse") || title.includes("medical") || title.includes("doctor") || title.includes("clinic") || title.includes("healthcare")) {
        return {
            name: "Jessica Taylor, BSN",
            title: jobTitle,
            email: "jessica.taylor.ns@gmail.com",
            phone: "+1 617-555-0176",
            location: "Boston, MA, USA",
            website: "linkedin.com/in/jessicataylor-nurse",
            dob: "12-07-1994",
            nationality: "American",
            visaStatus: "Citizen",
            maritalStatus: "Married / Female",
            languages: "English (Native)",
            skills: ["Patient Triage", "EMR Databases", "Clinical Care", "BLS & ACLS Certified", "Wound Care", "IV Administration"],
            experience: [
                {
                    id: "exp-1",
                    company: "Boston General Hospital",
                    role: "Registered Emergency Nurse",
                    date: "May 2021 - Present",
                    desc: "- Delivered critical triage and medical nursing care in a fast-paced 30-bed emergency room.\n- Administered IVs, blood transfusions, and clinical medications as directed by attending physicians.\n- Updated patient status documentation logs in EMR database system with 100% precision."
                },
                {
                    id: "exp-2",
                    company: "Valley Care Clinic",
                    role: "Clinical Medical Assistant",
                    date: "Sep 2019 - Apr 2021",
                    desc: "- Assisted doctors during family care checkups, measuring patient vitals and health baselines.\n- Coordinated patient schedules and billing records in compliance with HIPAA privacy standards.\n- Managed sterilization of emergency clinical instruments and surgical trays."
                }
            ],
            education: [
                {
                    id: "edu-1",
                    institution: "Boston College",
                    degree: "Bachelor of Science in Nursing (BSN)",
                    date: "2015 - 2019",
                    desc: "Licensed RN. Graduated with honors. Specialized in Critical Emergency Care."
                }
            ],
            projects: [
                {
                    id: "proj-1",
                    title: "Triage Flow Optimization",
                    role: "Committee Member",
                    desc: "Redesigned emergency check-in workflows, reducing waiting room triage latency by 12%."
                }
            ]
        };
    }

    // 6. DEFAULT FALLBACK: Customize template dynamically to fit their custom title
    const formattedTitle = jobTitle ? jobTitle.trim().charAt(0).toUpperCase() + jobTitle.trim().slice(1) : "Professional Specialist";
    return {
        name: "Alex Mercer",
        title: formattedTitle,
        email: "alex.mercer@gmail.com",
        phone: "+1 555-0199",
        location: "Seattle, WA, USA",
        website: "linkedin.com/in/alexmercer",
        dob: "12-10-1998",
        nationality: "American",
        visaStatus: "Citizen",
        maritalStatus: "Single / Male",
        languages: "English (Native), Spanish (Fluent)",
        skills: ["Strategy", "Operations", "Critical Thinking", "Communication", "Problem Solving", "Collaboration", "Project Tools", "Execution"],
        experience: [
            {
                id: "exp-1",
                company: "Pinnacle Enterprise Solutions",
                role: `Senior ${formattedTitle}`,
                date: "Jan 2024 - Present",
                desc: `- Spearheaded strategic operations as a Senior ${formattedTitle}, improving productivity by 35%.\n- Collaborated with 5 senior team leads to optimize project workflows and align targets.\n- Integrated modern tracking standards, increasing team delivery reliability by 25%.`
            },
            {
                id: "exp-2",
                company: "Startup Core Systems",
                role: `${formattedTitle}`,
                date: "Jun 2022 - Dec 2023",
                desc: `- Developed and maintained core programs, resolving critical issues weekly.\n- Revamped main operational portals, boosting overall project performance by 15%.\n- Contributed to key client projects, ensuring 100% on-time milestone delivery.`
            }
        ],
        education: [
            {
                id: "edu-1",
                institution: "State University",
                degree: `Bachelor of Science in ${formattedTitle.replace(/senior|lead/gi, "").trim()} Administration`,
                date: "2018 - 2022",
                desc: "Graduated with Honors. Specialized in Organizational Leadership and Strategic Administration."
            }
        ],
        projects: [
            {
                id: "proj-1",
                title: `${formattedTitle} Toolkit`,
                role: "Creator",
                desc: `An open-source library that automates standard procedures for ${formattedTitle} teams. Gained positive industry recognition.`
            }
        ]
    };
}

function loadSampleResumeData() {
    let jobTitle = prompt("Enter your target job title to load a matched template (e.g. Software Engineer, Product Manager, Nurse, Accountant, Teacher):");
    
    // Abort if user cancelled the prompt
    if (jobTitle === null) return;
    
    jobTitle = jobTitle.trim();
    if (!jobTitle) {
        jobTitle = "Senior Full Stack Software Engineer";
    }

    const jobTitleInput = document.getElementById("target-job-input");
    if (jobTitleInput) {
        jobTitleInput.value = jobTitle;
    }
    
    const dataset = getSampleDataByJobTitle(jobTitle);
    
    state.targetJob = jobTitle;
    state.name = dataset.name;
    state.title = dataset.title;
    state.email = dataset.email;
    state.phone = dataset.phone;
    state.location = dataset.location;
    state.website = dataset.website;
    state.dob = dataset.dob;
    state.nationality = dataset.nationality;
    state.visaStatus = dataset.visaStatus;
    state.maritalStatus = dataset.maritalStatus;
    state.languages = dataset.languages;
    state.skills = dataset.skills;
    state.experience = dataset.experience;
    state.education = dataset.education;
    state.projects = dataset.projects;
    
    // Set form fields
    setFormFields();
    
    // Render dynamic lists
    renderSkillsTags();
    renderExperienceList();
    renderEducationList();
    renderProjectsList();
    
    // Save, update UI badges, render preview, and toast
    autoSave();
    updateSidebarBadges();
    renderResumePreview();
    
    // Reset wizard view back to step 1 to display loaded personal details
    if (window.setWizardStep) {
        window.setWizardStep(1);
    }

    // Dismiss beginner onboarding card
    const onboardingCard = document.getElementById("beginner-onboarding-card");
    if (onboardingCard) {
        onboardingCard.style.display = "none";
    }

    if (window.showToast) {
        showToast(`Sample ${state.title} resume loaded!`);
    } else {
        alert("Sample premium resume loaded successfully!");
    }
}

window.loadSampleResumeData = loadSampleResumeData;

// Mobile Swipe Gesture Recognition to slide between Edit and Preview sheets
function initMobileSwipeGestures() {
    let startX = 0;
    let startY = 0;
    
    document.addEventListener("touchstart", (e) => {
        if (window.innerWidth > 768) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener("touchend", (e) => {
        if (window.innerWidth > 768) return;
        
        const diffX = e.changedTouches[0].clientX - startX;
        const diffY = e.changedTouches[0].clientY - startY;
        
        // Ensure horizontal swipe is dominant and significant (e.g. > 100px)
        if (Math.abs(diffX) > 100 && Math.abs(diffY) < 60) {
            if (diffX > 0) {
                // Swipe Right -> Switch to Edit tab
                if (window.switchMobileTab) {
                    window.switchMobileTab("edit");
                }
            } else {
                // Swipe Left -> Switch to Preview tab
                if (window.switchMobileTab) {
                    window.switchMobileTab("preview");
                }
            }
        }
    }, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
    initMobileSwipeGestures();
});

async function optimizeAllExperiencesAI() {
    if (!state.experience || state.experience.length === 0) {
        if (window.showToast) showToast("Please add at least one work experience first!");
        else alert("Please add at least one work experience first!");
        return;
    }
    
    let optimizedCount = 0;
    state.experience.forEach(exp => {
        const text = exp.desc || "";
        if (text.trim().length > 0) {
            optimizedCount++;
        }
    });
    
    if (optimizedCount === 0) {
        if (window.showToast) showToast("No descriptions found to optimize!");
        else alert("No descriptions found to optimize!");
        return;
    }
    
    if (window.showToast) showToast("Optimizing all experience descriptions using AI... Please wait.");
    
    try {
        const promises = state.experience.map(async (exp) => {
            const text = exp.desc || "";
            if (text.trim().length > 0) {
                // Determine category dynamically
                const category = (window.ATSAuditor && window.ATSAuditor.detectCategory) 
                    ? window.ATSAuditor.detectCategory(exp.role || state.title || "") 
                    : "generic";
                
                // Call rewriter
                const result = await AIService.rewriteExperience(text, category);
                exp.desc = result;
            }
        });
        
        await Promise.all(promises);
        
        renderExperienceList();
        autoSave();
        updateSidebarBadges();
        renderResumePreview();
        if (window.showToast) showToast(`AI successfully optimized ${optimizedCount} job descriptions!`);
        else alert(`AI successfully optimized ${optimizedCount} job descriptions!`);
    } catch (err) {
        if (window.showToast) showToast("An error occurred during AI optimization.");
        else alert("An error occurred during AI optimization.");
    }
}

window.optimizeAllExperiencesAI = optimizeAllExperiencesAI;

function applySectionVisibility() {
    const sheet = document.getElementById("resume-sheet");
    if (!sheet) return;
    
    const sections = sheet.querySelectorAll(".resume-section");
    
    const showProjects = state.showProjects !== false;
    const showEducation = state.showEducation !== false;
    const showSkills = state.showSkills !== false;
    const showRegional = state.showRegional !== false;
    
    sections.forEach(sec => {
        const titleText = (sec.querySelector(".resume-section-title") || sec.querySelector("h2") || {}).innerText || "";
        const lowerTitle = titleText.toLowerCase();
        
        if ((lowerTitle.includes("project") || lowerTitle.includes("proyectos")) && !showProjects) {
            sec.style.display = "none";
        } else if ((lowerTitle.includes("education") || lowerTitle.includes("educación")) && !showEducation) {
            sec.style.display = "none";
        } else if ((lowerTitle.includes("skill") || lowerTitle.includes("competenc") || lowerTitle.includes("habilidades")) && !showSkills) {
            sec.style.display = "none";
        } else {
            sec.style.display = "";
        }
    });
    
    const regionalSec = sheet.querySelector(".resume-regional-section") || sheet.querySelector(".regional-grid-preview") || sheet.querySelector(".regional-details-preview");
    if (regionalSec) {
        regionalSec.style.display = showRegional ? "" : "none";
    }
}

function toggleSectionVisibility(sectionKey, isChecked) {
    state[sectionKey] = isChecked;
    autoSave();
    applySectionVisibility();
    showToast(`Updated section visibility!`, "info");
}

window.applySectionVisibility = applySectionVisibility;
window.toggleSectionVisibility = toggleSectionVisibility;

function updatePDFPageAdvisor() {
    const sheet = document.getElementById("resume-sheet");
    const advisor = document.getElementById("pdf-page-advisor");
    const status = document.getElementById("pdf-page-status");
    if (!sheet || !advisor || !status) return;
    
    // A4 print target height: 1123px
    const height = sheet.offsetHeight;
    const pages = Math.ceil(height / 1123);
    
    status.innerText = `${pages} Page${pages > 1 ? 's' : ''}`;
    
    // Check if close to overflow (within 40px of next page boundary)
    const threshold = 1123;
    const offsetInCurrentPage = height % threshold;
    const isCloseToOverflow = offsetInCurrentPage > 1080;
    
    if (isCloseToOverflow) {
        advisor.style.backgroundColor = "rgba(245, 158, 11, 0.08)";
        advisor.style.borderColor = "rgba(245, 158, 11, 0.2)";
        advisor.style.color = "#fbbf24";
        status.innerText = `${pages} Page${pages > 1 ? 's' : ''} (Close to split)`;
    } else if (pages > 2) {
        advisor.style.backgroundColor = "rgba(239, 68, 68, 0.08)";
        advisor.style.borderColor = "rgba(239, 68, 68, 0.2)";
        advisor.style.color = "#f87171";
    } else {
        advisor.style.backgroundColor = "rgba(16, 185, 129, 0.08)";
        advisor.style.borderColor = "rgba(16, 185, 129, 0.2)";
        advisor.style.color = "#34d399";
    }
}

window.updatePDFPageAdvisor = updatePDFPageAdvisor;

function updateCompletenessProgress() {
    // 1. Personal Details (20% weight)
    const personalFields = [state.name, state.title, state.email, state.phone, state.location, state.website];
    const personalFilled = personalFields.filter(f => f && f.trim().length > 0).length;
    const personalPct = personalFilled / personalFields.length;
    
    // 2. Regional Details (15% weight)
    const regionalFields = [state.dob, state.nationality, state.visaStatus, state.maritalStatus, state.languages];
    const regionalFilled = regionalFields.filter(f => f && f.trim().length > 0).length;
    const regionalPct = regionalFilled / regionalFields.length;

    // 3. Work Experience (20% weight)
    const hasExp = state.experience && state.experience.length > 0;
    const expPct = hasExp ? 1 : 0;

    // 4. Education (15% weight)
    const hasEdu = state.education && state.education.length > 0;
    const eduPct = hasEdu ? 1 : 0;

    // 5. Key Skills (15% weight)
    const hasSkills = state.skills && state.skills.length > 0;
    const skillsPct = hasSkills ? 1 : 0;

    // 6. Projects (15% weight)
    const hasProj = state.projects && state.projects.length > 0;
    const projPct = hasProj ? 1 : 0;

    // Weighted Score
    const score = (personalPct * 0.20) + (regionalPct * 0.15) + (expPct * 0.20) + (eduPct * 0.15) + (skillsPct * 0.15) + (projPct * 0.15);
    const overallPct = Math.round(score * 100);

    const progressCircle = document.getElementById("completeness-progress-circle");
    const pctBadge = document.getElementById("completeness-percentage-badge");
    const statusText = document.getElementById("completeness-status-text");

    if (progressCircle && pctBadge && statusText) {
        progressCircle.setAttribute("stroke-dasharray", `${overallPct}, 100`);
        pctBadge.innerText = `${overallPct}%`;

        if (overallPct === 100) {
            statusText.innerText = "All-Star Profile";
            statusText.style.color = "#10b981"; // Emerald var(--success)
            progressCircle.setAttribute("stroke", "#10b981");
        } else if (overallPct >= 75) {
            statusText.innerText = "Excellent Strength";
            statusText.style.color = "var(--primary)";
            progressCircle.setAttribute("stroke", "var(--primary)");
        } else if (overallPct >= 40) {
            statusText.innerText = "Good Progress";
            statusText.style.color = "var(--accent)";
            progressCircle.setAttribute("stroke", "var(--accent)");
        } else {
            statusText.innerText = "Building Profile";
            statusText.style.color = "white";
            progressCircle.setAttribute("stroke", "var(--primary)");
        }
    }
}

window.updateCompletenessProgress = updateCompletenessProgress;

window.toggleFloatingHub = function() {
    const menu = document.getElementById("fab-menu");
    const triggerIcon = document.querySelector(".fab-trigger i");
    if (!menu || !triggerIcon) return;
    
    if (menu.style.display === "none" || menu.style.display === "") {
        menu.style.display = "flex";
        triggerIcon.className = "fa-solid fa-xmark";
    } else {
        menu.style.display = "none";
        triggerIcon.className = "fa-solid fa-bolt";
    }
};

let currentWizardStep = 1;

window.setWizardStep = function(stepNum) {
    if (stepNum < 1 || stepNum > 4) return;
    currentWizardStep = stepNum;
    
    // Update step buttons active class
    document.querySelectorAll(".wizard-step-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    const activeBtn = document.getElementById(`wizard-btn-${stepNum}`);
    if (activeBtn) activeBtn.classList.add("active");
    
    // Update step indicator label
    const indicator = document.getElementById("wizard-step-indicator");
    if (indicator) indicator.innerText = `Step ${stepNum} of 4`;
    
    // Define visibility groups
    const groups = {
        1: ["sec-personal", "sec-regional"],
        2: ["sec-experience"],
        3: ["sec-education", "sec-skills", "sec-projects"],
        4: ["sec-layout", "sec-visibility"]
    };
    
    // Toggle accordions visibility
    const allIds = ["sec-personal", "sec-regional", "sec-experience", "sec-education", "sec-skills", "sec-projects", "sec-layout", "sec-visibility"];
    allIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (groups[stepNum].includes(id)) {
                el.style.display = "";
            } else {
                el.style.display = "none";
            }
            // Deactivate all first
            el.classList.remove("active");
        }
    });
    
    // Auto-expand the first accordion of the current step
    const firstAccordionId = groups[stepNum][0];
    const firstAccordion = document.getElementById(firstAccordionId);
    if (firstAccordion) {
        firstAccordion.classList.add("active");
        // Scroll the preview window to highlight the corresponding section
        if (window.scrollToResumeSection) {
            window.scrollToResumeSection(firstAccordionId);
        }
    }
    
    // Update Back and Next buttons
    const prevBtn = document.getElementById("wizard-prev-btn");
    const nextBtn = document.getElementById("wizard-next-btn");
    
    if (prevBtn) {
        prevBtn.style.display = (stepNum === 1) ? "none" : "";
    }
    
    if (nextBtn) {
        if (stepNum === 4) {
            nextBtn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Download PDF`;
            nextBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
            nextBtn.onclick = function() { window.exportPDF(); };
        } else {
            nextBtn.innerHTML = `Next Step <i class="fa-solid fa-arrow-right"></i>`;
            nextBtn.style.background = "var(--primary-gradient)";
            nextBtn.onclick = function() { window.nextWizardStep(); };
        }
    }
};

window.nextWizardStep = function() {
    if (currentWizardStep < 4) {
        window.setWizardStep(currentWizardStep + 1);
    }
};

window.prevWizardStep = function() {
    if (currentWizardStep > 1) {
        window.setWizardStep(currentWizardStep - 1);
    }
};

// Initialize wizard to step 1 and auto-start onboarding tour for new users on load
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        window.setWizardStep(1);
        
        // Check if first-time user and trigger onboarding guide automatically
        const tourSeen = localStorage.getItem("resumake_tour_seen");
        if (!tourSeen) {
            localStorage.setItem("resumake_tour_seen", "true");
            setTimeout(() => {
                if (window.startInteractiveTour) {
                    window.startInteractiveTour();
                }
            }, 600);
        }
    }, 200);
});

// Pre-Written Accomplishments Library Database
const BULLET_LIBRARY = {
    tech: [
        { role: "Software Developer", bullets: [
            "Designed and implemented high-throughput REST APIs, reducing server response times by 35%.",
            "Refactored legacy database models and migrations, decreasing backup latency by 45%.",
            "Coordinated with QA teams to implement automated CI/CD pipelines, reducing deployment errors by 20%.",
            "Developed fully responsive UI layouts using React and Tailwind CSS, increasing page load speed by 1.5s."
        ]},
        { role: "IT Support Specialist", bullets: [
            "Resolved 120+ monthly support tickets targeting network issues, backup failures, and hardware configurations.",
            "Maintained localized Active Directory servers and DNS routes, ensuring 99.9% hardware availability.",
            "Conducted comprehensive audit schedules on user credentials, enforcing security protocols across 200+ terminals.",
            "Deployed and configured remote work workspaces for 50+ staff members, boosting productivity metrics."
        ]}
    ],
    pm: [
        { role: "Product Manager", bullets: [
            "Spearheaded the development roadmap for a new mobile commerce product, increasing user retention by 28%.",
            "Conducted user research interviews with 50+ clients, identifying 12 core features that boosted engagement by 15%.",
            "Managed cross-functional scrum groups of 12 developers and designers, delivering features 2 weeks ahead of schedule.",
            "Defined and tracked product launch metrics, reporting weekly progress directly to executive sponsors."
        ]},
        { role: "Project Manager", bullets: [
            "Coordinated project scope definitions and milestone tracking for 5 enterprise contracts worth $2.5M+.",
            "Managed resource allocations across 3 parallel project lines, preventing burn-out and decreasing delay fees to 0%.",
            "Facilitated daily standups, sprint planning sessions, and retrospectives to boost developer efficiency by 22%.",
            "Mitigated project scheduling conflicts by optimizing dependency maps, cutting delivery cycle times by 18%."
        ]}
    ],
    sales: [
        { role: "Sales Representative", bullets: [
            "Exceeded quarterly sales targets by 125% for 4 consecutive periods, bringing in $400K+ in new ARR.",
            "Nurtured relationships with 60+ B2B prospect accounts, converting leads into active contracts at a 15% rate.",
            "Negotiated pricing terms and service levels with corporate procurement agents, increasing deal sizes by 12%.",
            "Delivered premium product demonstration schedules to prospective buyers, accelerating lead conversion speed."
        ]},
        { role: "Marketing Specialist", bullets: [
            "Managed a monthly ad campaign budget of $15K across search and social ads, driving a 3.4x ROI conversion increase.",
            "Coordinated email marketing newsletter campaigns, lifting open rates from 14% to 26% within 3 months.",
            "Analyzed SEO search keyword volumes and optimized article structures, expanding organic web traffic by 45%.",
            "Organized quarterly trade show sponsor events, capturing 500+ high-intent lead signups."
        ]}
    ],
    data: [
        { role: "Data Analyst", bullets: [
            "Built interactive Tableau dashboard reporting panels for operations leaders, cutting executive reporting time by 12h/week.",
            "Analyzed client retention cohorts and user churn rates, uncovering structural bottlenecks to save $50K in ARR.",
            "Performed deep-dive SQL queries on 10M+ transaction rows, extracting growth trends to guide inventory plans.",
            "Automated ETL pipeline queries using Python scripts, saving 8 hours of manual data preparation weekly."
        ]},
        { role: "Accountant", bullets: [
            "Managed month-end financial closing schedules and general ledger audits, reducing accounting entry errors by 18%.",
            "Coordinated tax filings and internal balance sheets audits, ensuring 100% compliance with GAAP regulations.",
            "Analyzed operating expenses profiles and identified cost-saving options, reducing office expenditures by 12%.",
            "Processed monthly accounts payable and receivable invoices, maintaining client dispute resolution times under 24h."
        ]}
    ],
    ops: [
        { role: "HR Specialist", bullets: [
            "Managed end-to-end recruitment pipelines for 40+ hires, reducing overall time-to-hire by 14 days.",
            "Coordinated company-wide onboarding training events, boosting first-year employee satisfaction indexes by 20%.",
            "Drafted and synchronized employee policy updates, ensuring alignment with regional labor regulations.",
            "Facilitated conflict resolution discussions, fostering a supportive work environment and lowering churn by 8%."
        ]},
        { role: "Operations Assistant", bullets: [
            "Coordinated logistics schedules and inventory shipping cycles, improving delivery speeds by 15%.",
            "Managed third-party vendor contracts and supplies procurement, negotiating a 10% unit cost reduction.",
            "Supervised office equipment installations and software licensing syncs, cutting technical downtime by 30%.",
            "Streamlined departmental communication procedures, cutting task handoff friction by 25%."
        ]}
    ],
    design: [
        { role: "UI/UX Designer", bullets: [
            "Created high-fidelity Figma design mockups and wireframes, speeding up developer handoff by 30%.",
            "Conducted user testing sessions on 20+ testers, optimizing conversion check-out flows by 14%.",
            "Designed and maintained the company design system UI library, improving brand consistency across web and mobile apps.",
            "Collaborated closely with product leads to map user journey flows, maximizing product accessibility."
        ]},
        { role: "Graphic Designer", bullets: [
            "Designed 50+ custom digital brand assets and marketing materials monthly, boosting banner ad click-throughs by 18%.",
            "Produced custom vector illustrations and brand packages, defining guidelines for 3 major product launches.",
            "Optimized image asset sizes and print color models, improving layout clarity on public print banners.",
            "Collaborated with product copywriters to design layout layouts for brochures and promotional print materials."
        ]}
    ]
};

window.activeBulletExpId = null;
window.activeBulletCategory = "tech";

window.openBulletLibrary = function(expId) {
    window.activeBulletExpId = expId;
    const modal = document.getElementById("bullet-library-modal");
    if (modal) modal.classList.add("show");
    window.switchBulletCategory(window.activeBulletCategory);
};

window.closeBulletLibrary = function() {
    const modal = document.getElementById("bullet-library-modal");
    if (modal) modal.classList.remove("show");
};

window.switchBulletCategory = function(catId) {
    window.activeBulletCategory = catId;
    
    // Toggle active classes on category buttons
    const btns = document.querySelectorAll(".bullet-cat-btn");
    btns.forEach(btn => {
        if (btn.id === `bullet-cat-${catId}`) {
            btn.classList.add("active");
            btn.style.background = "rgba(99, 102, 241, 0.1)";
            btn.style.borderColor = "rgba(99, 102, 241, 0.25)";
            btn.style.color = "white";
        } else {
            btn.classList.remove("active");
            btn.style.background = "none";
            btn.style.borderColor = "transparent";
            btn.style.color = "var(--text-secondary)";
        }
    });

    renderBulletItems(BULLET_LIBRARY[catId]);
};

function renderBulletItems(rolesArray) {
    const container = document.getElementById("bullet-library-list");
    if (!container) return;
    container.innerHTML = "";

    rolesArray.forEach(roleData => {
        const section = document.createElement("div");
        section.style.marginBottom = "16px";
        section.innerHTML = `
            <div style="font-size: 0.8rem; font-weight: 700; color: white; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <i class="fa-solid fa-user-tag" style="color: var(--accent); margin-right: 4px;"></i> ${roleData.role}
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${roleData.bullets.map(b => {
                    const cleanBullet = b.replace(/'/g, "\\'");
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; transition: all 0.2s;" onmouseover="this.style.background='rgba(99,102,241,0.04)'; this.style.borderColor='rgba(99,102,241,0.15)';" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='var(--border-color)';">
                            <span style="flex: 1;">${b}</span>
                            <button class="ai-btn ai-btn-outline" onclick="window.insertBullet('${cleanBullet}')" style="padding: 2px 8px; font-size: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer; flex-shrink: 0;"><i class="fa-solid fa-plus"></i> Add</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(section);
    });
}

window.insertBullet = function(bulletText) {
    if (!window.activeBulletExpId) return;
    const textarea = document.getElementById(`exp-desc-${window.activeBulletExpId}`);
    if (textarea) {
        let currentText = textarea.value.trim();
        if (currentText) {
            // Check if last character is newline, otherwise add one
            if (!currentText.endsWith('\n')) {
                currentText += '\n';
            }
            currentText += `• ${bulletText}\n`;
        } else {
            currentText = `• ${bulletText}\n`;
        }
        textarea.value = currentText;
        window.updateExperience(window.activeBulletExpId, 'desc', currentText);
    }
    window.closeBulletLibrary();
    if (window.showToast) {
        showToast("Accomplishment bullet added!");
    }
};

window.filterBulletLibrary = function(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        // Reset back to selected category
        window.switchBulletCategory(window.activeBulletCategory);
        return;
    }

    // Search across ALL categories
    const matchingRoles = [];
    Object.keys(BULLET_LIBRARY).forEach(cat => {
        BULLET_LIBRARY[cat].forEach(roleData => {
            if (roleData.role.toLowerCase().includes(q)) {
                matchingRoles.push(roleData);
            } else {
                // Check if any bullet matches
                const matchingBullets = roleData.bullets.filter(b => b.toLowerCase().includes(q));
                if (matchingBullets.length > 0) {
                    matchingRoles.push({
                        role: roleData.role,
                        bullets: matchingBullets
                    });
                }
            }
        });
    });

    renderBulletItems(matchingRoles);
};

// AI Copilot Conversational Assistant Drawer
window.openAICopilotModal = function() {
    const modal = document.getElementById("ai-copilot-modal");
    if (modal) modal.classList.add("show");
};

window.closeAICopilotModal = function() {
    const modal = document.getElementById("ai-copilot-modal");
    if (modal) modal.classList.remove("show");
};

window.sendCopilotPreset = function(promptText) {
    const input = document.getElementById("ai-copilot-input");
    if (input) input.value = promptText;
    window.sendCopilotMessage();
};

window.sendCopilotMessage = async function() {
    const input = document.getElementById("ai-copilot-input");
    if (!input) return;
    const msgText = input.value.trim();
    if (!msgText) return;

    // Clear input
    input.value = "";

    const chatLogs = document.getElementById("ai-copilot-chat-logs");
    if (!chatLogs) return;

    // 1. Render User Message bubble
    const userBubble = document.createElement("div");
    userBubble.style.alignSelf = "flex-end";
    userBubble.style.background = "rgba(99, 102, 241, 0.15)";
    userBubble.style.border = "1px solid rgba(99, 102, 241, 0.3)";
    userBubble.style.color = "white";
    userBubble.style.padding = "8px 12px";
    userBubble.style.borderRadius = "8px 8px 0 8px";
    userBubble.style.maxWidth = "80%";
    userBubble.style.fontSize = "0.76rem";
    userBubble.style.lineHeight = "1.4";
    userBubble.style.marginLeft = "auto";
    userBubble.style.marginBottom = "8px";
    userBubble.innerHTML = msgText.replace(/\n/g, "<br>");
    chatLogs.appendChild(userBubble);
    chatLogs.scrollTop = chatLogs.scrollHeight;

    // 2. Render AI Loading bubble
    const aiBubble = document.createElement("div");
    aiBubble.style.alignSelf = "flex-start";
    aiBubble.style.background = "rgba(255, 255, 255, 0.03)";
    aiBubble.style.border = "1px solid var(--border-color)";
    aiBubble.style.color = "var(--text-secondary)";
    aiBubble.style.padding = "8px 12px";
    aiBubble.style.borderRadius = "8px 8px 8px 0";
    aiBubble.style.maxWidth = "80%";
    aiBubble.style.fontSize = "0.76rem";
    aiBubble.style.lineHeight = "1.4";
    aiBubble.style.marginBottom = "8px";
    aiBubble.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Writing suggestion...`;
    chatLogs.appendChild(aiBubble);
    chatLogs.scrollTop = chatLogs.scrollHeight;

    // 3. Perform Gemini API call via active provider
    try {
        const systemPrompt = `You are a helpful, professional AI Resume Copilot. The user's active resume details are:
Name: ${state.name || ""}
Job Title: ${state.title || ""}
Skills: ${state.skills ? state.skills.join(", ") : ""}
The user has requested assistance: "${msgText}".
Write a high-quality, professional resume response that is direct and ATS-friendly. Keep the response under 100 words. Do not write introductory chatter, just give the rephrased bullets, bio summary, or answers.`;

        let resultText = "";
        const onChunk = (chunk) => {
            resultText += chunk;
            // Clean markdown bold tags for raw DOM viewing
            aiBubble.innerHTML = resultText
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n/g, "<br>");
            chatLogs.scrollTop = chatLogs.scrollHeight;
        };

        const provider = window.AIService.activeProvider;
        if (provider === "webgpu") {
            await window.AIService.callWebGPULLM(systemPrompt, onChunk);
        } else {
            await window.AIService.callGeminiAPI(systemPrompt, onChunk, "", state.targetJob || "");
        }

        // Add Apply options after completion
        const applyContainer = document.createElement("div");
        applyContainer.style.marginTop = "8px";
        applyContainer.style.display = "flex";
        applyContainer.style.gap = "6px";
        
        // Clean result text single quotes
        const safeText = resultText.replace(/'/g, "\\'").replace(/\n/g, "\\n");

        applyContainer.innerHTML = `
            <button onclick="window.applyCopilotSuggestion('summary', '${safeText}')" style="padding: 4px 8px; font-size: 0.65rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); color: white; border-radius: 4px; cursor: pointer;">Apply to Summary</button>
            <button onclick="window.applyCopilotSuggestion('copy', '${safeText}')" style="padding: 4px 8px; font-size: 0.65rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-copy"></i> Copy</button>
        `;
        aiBubble.appendChild(applyContainer);
        chatLogs.scrollTop = chatLogs.scrollHeight;

    } catch (err) {
        aiBubble.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: var(--danger);"></i> Error writing suggestion: ${err.message}`;
    }
};

window.applyCopilotSuggestion = function(targetKey, text) {
    if (targetKey === "summary") {
        state.summary = text;
        const summaryInput = document.getElementById("input-summary") || document.getElementById("exp-desc-summary");
        if (summaryInput) summaryInput.value = text;
        
        autoSave();
        debouncedRenderPreview();
        window.closeAICopilotModal();
        if (window.showToast) showToast("Applied to professional summary!");
    } else if (targetKey === "copy") {
        navigator.clipboard.writeText(text);
        if (window.showToast) showToast("Copied to clipboard!");
    }
};

// Interactive Onboarding Tour Controller
let currentTourStep = 0;
const TOUR_STEPS = [
    {
        element: "wizard-btn-1",
        title: "1. Step-by-Step Wizard 🪄",
        text: "We group forms into 4 logical steps (Info, Work, Academics, Design) to make setup simple and clean.",
        position: "bottom"
    },
    {
        element: "beginner-onboarding-card",
        title: "2. Beginner Quick-Start 🚀",
        text: "Click 'Auto-Fill' to pre-populate a complete professional resume in 1 click, then just customize the text!",
        position: "bottom"
    },
    {
        element: "resume-sheet",
        title: "3. Direct A4 Editor ✍️",
        text: "You can click and type directly on the resume paper! Hover elements to see the outline, click to edit.",
        position: "left"
    },
    {
        element: "chip-ai-dropdown",
        title: "4. Gemini AI Copilot 🔮",
        text: "Audit keywords for ATS, write cover letters, or practice mock interview questions with our integrated AI coach.",
        position: "bottom"
    }
];

window.startInteractiveTour = function() {
    currentTourStep = 0;
    
    // Show overlay
    const overlay = document.getElementById("tour-overlay");
    if (overlay) {
        overlay.style.display = "block";
        overlay.style.opacity = "1";
    }

    // Set wizard back to step 1 to focus setup wizard
    if (window.setWizardStep) {
        window.setWizardStep(1);
    }
    
    showTourStep(0);
};

window.endInteractiveTour = function() {
    // Remove highlights
    const highlights = document.querySelectorAll(".tour-highlight");
    highlights.forEach(el => el.classList.remove("tour-highlight"));

    // Hide overlays & tooltips
    const overlay = document.getElementById("tour-overlay");
    if (overlay) overlay.style.display = "none";
    const tooltip = document.getElementById("tour-tooltip-card");
    if (tooltip) tooltip.style.display = "none";
};

window.nextTourStep = function() {
    if (currentTourStep < TOUR_STEPS.length - 1) {
        currentTourStep++;
        // If third step is edit sheet, switch wizard to show preview if on mobile
        if (currentTourStep === 2 && window.innerWidth <= 768) {
            window.switchMobileTab("preview");
        }
        showTourStep(currentTourStep);
    } else {
        window.endInteractiveTour();
        if (window.showToast) showToast("Tour completed! Enjoy building!");
    }
};

window.prevTourStep = function() {
    if (currentTourStep > 0) {
        currentTourStep--;
        if (currentTourStep === 0 && window.innerWidth <= 768) {
            window.switchMobileTab("edit");
        }
        showTourStep(currentTourStep);
    }
};

function showTourStep(index) {
    // Remove other highlights
    const highlights = document.querySelectorAll(".tour-highlight");
    highlights.forEach(el => el.classList.remove("tour-highlight"));

    const step = TOUR_STEPS[index];
    const target = document.getElementById(step.element);
    const tooltip = document.getElementById("tour-tooltip-card");
    if (!tooltip) return;

    if (target) {
        // Scroll target into view smoothly so the beginner can see it immediately
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Short delay to let the scroll settle before calculating absolute positions
        setTimeout(() => {
            target.classList.add("tour-highlight");
            
            // Render tooltip content
            document.getElementById("tour-title").innerHTML = step.title;
            document.getElementById("tour-text").innerText = step.text;
            
            // Show card
            tooltip.style.display = "flex";
            
            // Calculate position relative to target
            const rect = target.getBoundingClientRect();
            const tooltipWidth = 280;
            const tooltipHeight = 120;
            
            let top = 0;
            let left = 0;
            
            if (step.position === "bottom") {
                top = rect.bottom + window.scrollY + 12;
                left = rect.left + window.scrollX + (rect.width - tooltipWidth) / 2;
            } else if (step.position === "left") {
                top = rect.top + window.scrollY + (rect.height - tooltipHeight) / 2;
                left = rect.left + window.scrollX - tooltipWidth - 12;
            } else if (step.position === "right") {
                top = rect.top + window.scrollY + (rect.height - tooltipHeight) / 2;
                left = rect.right + window.scrollX + 12;
            } else if (step.position === "top") {
                top = rect.top + window.scrollY - tooltipHeight - 12;
                left = rect.left + window.scrollX + (rect.width - tooltipWidth) / 2;
            }
            
            // Keep inside screen boundaries (relative to document dimensions)
            left = Math.max(12, Math.min(document.documentElement.scrollWidth - tooltipWidth - 12, left));
            top = Math.max(12, Math.min(document.documentElement.scrollHeight - tooltipHeight - 12, top));
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
        }, 400);
    }

    // Toggle back button visibility
    const prevBtn = document.getElementById("tour-prev-btn");
    if (prevBtn) {
        prevBtn.style.display = (index === 0) ? "none" : "block";
    }

    // Next button label
    const nextBtn = document.getElementById("tour-next-btn");
    if (nextBtn) {
        nextBtn.innerHTML = (index === TOUR_STEPS.length - 1) ? "Finish" : "Next";
    }
}
