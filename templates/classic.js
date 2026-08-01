import { formatMultiline } from "./utils.js";
import { compileRegionalSection } from "./regional.js";

export function compileClassicTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(state.email);
    if (state.phone) contacts.push(state.phone);
    if (state.location) contacts.push(state.location);
    if (state.website) contacts.push(state.website);
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join('   •   ')}</div>` : '';

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title">${exp.company || "Company"}</span> — 
                        <span class="item-subtitle">${exp.role || "Role"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Dates"}</span>
                </div>
                <div class="item-desc">${formatMultiline(exp.desc || "Bullet achievements...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Professional Experience</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Skills
    let skillsHTML = "";
    if (state.skills && state.skills.length > 0) {
        let badges = state.skills.map(s => `<span class="skill-badge-preview">${s}</span>`).join('');
        skillsHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Key Competencies</h2>
                <div class="resume-section-content">
                    <div class="skills-list-preview">${badges}</div>
                </div>
            </div>
        `;
    }

    // Projects
    let projHTML = "";
    if (state.projects && state.projects.length > 0) {
        let items = state.projects.map(proj => `
            <div class="project-item">
                <div class="item-header">
                    <span class="item-title">${proj.title || "Project"}</span>
                    <span class="item-subtitle">${proj.role || "Role"}</span>
                </div>
                <div class="item-desc">${formatMultiline(proj.desc || "Description...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Technical Projects</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Education
    let eduHTML = "";
    if (state.education && state.education.length > 0) {
        let items = state.education.map(edu => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title">${edu.institution || "School"}</span> — 
                        <span class="item-subtitle">${edu.degree || "Degree"}</span>
                    </div>
                    <span class="item-date">${edu.date || "Dates"}</span>
                </div>
                ${edu.desc ? `<div class="item-desc">${edu.desc}</div>` : ''}
            </div>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Education</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    return `
        <header class="resume-header">
            <h1 class="resume-name">${name}</h1>
            <div class="resume-title">${title}</div>
            ${contactBar}
        </header>
        ${expHTML}
        ${skillsHTML}
        ${projHTML}
        ${eduHTML}
        ${compileRegionalSection(state, "Personal & Regional Details", true)}
    `;
}
