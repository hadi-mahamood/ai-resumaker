import { formatMultiline, escapeHTML } from "./utils.js";
import { compileRegionalSection } from "./regional.js";

export function compileClassicTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(`<span contenteditable="true" data-path="email" style="outline:none; display:inline-block;">${escapeHTML(state.email)}</span>`);
    if (state.phone) contacts.push(`<span contenteditable="true" data-path="phone" style="outline:none; display:inline-block;">${escapeHTML(state.phone)}</span>`);
    if (state.location) contacts.push(`<span contenteditable="true" data-path="location" style="outline:none; display:inline-block;">${escapeHTML(state.location)}</span>`);
    if (state.website) contacts.push(`<span contenteditable="true" data-path="website" style="outline:none; display:inline-block;">${escapeHTML(state.website)}</span>`);
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join('   •   ')}</div>` : '';

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title">${escapeHTML(exp.company || "Company")}</span> — 
                        <span class="item-subtitle">${escapeHTML(exp.role || "Role")}</span>
                    </div>
                    <span class="item-date">${escapeHTML(exp.date || "Dates")}</span>
                </div>
                <div class="item-desc">${formatMultiline(escapeHTML(exp.desc || "Bullet achievements..."))}</div>
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
        let badges = state.skills.map(s => `<span class="skill-badge-preview">${escapeHTML(s)}</span>`).join('');
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
                    <span class="item-title">${escapeHTML(proj.title || "Project")}</span>
                    <span class="item-subtitle">${escapeHTML(proj.role || "Role")}</span>
                </div>
                <div class="item-desc">${formatMultiline(escapeHTML(proj.desc || "Description..."))}</div>
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
                        <span class="item-title">${escapeHTML(edu.institution || "School")}</span> — 
                        <span class="item-subtitle">${escapeHTML(edu.degree || "Degree")}</span>
                    </div>
                    <span class="item-date">${escapeHTML(edu.date || "Dates")}</span>
                </div>
                ${edu.desc ? `<div class="item-desc">${escapeHTML(edu.desc)}</div>` : ''}
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
            <h1 class="resume-name" contenteditable="true" data-path="name" style="outline:none;">${escapeHTML(name)}</h1>
            <div class="resume-title" contenteditable="true" data-path="title" style="outline:none;">${escapeHTML(title)}</div>
            ${contactBar}
        </header>
        ${expHTML}
        ${skillsHTML}
        ${projHTML}
        ${eduHTML}
        ${compileRegionalSection(state, "Personal & Regional Details", true)}
    `;
}
