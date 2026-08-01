import { formatMultiline } from "./utils.js";

export function compileExecutiveTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    // Assemble sidebar contact column
    let contactItems = [];
    if (state.email) contactItems.push(`<div class="contact-item"><i class="fa-solid fa-envelope" style="width:14px; margin-right:4px;"></i> ${state.email}</div>`);
    if (state.phone) contactItems.push(`<div class="contact-item"><i class="fa-solid fa-phone" style="width:14px; margin-right:4px;"></i> ${state.phone}</div>`);
    if (state.location) contactItems.push(`<div class="contact-item"><i class="fa-solid fa-location-dot" style="width:14px; margin-right:4px;"></i> ${state.location}</div>`);
    if (state.website) contactItems.push(`<div class="contact-item"><i class="fa-solid fa-globe" style="width:14px; margin-right:4px;"></i> ${state.website}</div>`);
    let contactBox = contactItems.length > 0 ? `<div class="contact-info-list">${contactItems.join('')}</div>` : '';

    // Skills
    let skillsHTML = "";
    if (state.skills && state.skills.length > 0) {
        let badges = state.skills.map(s => `<span class="skill-badge-preview">${s}</span>`).join('');
        skillsHTML = `
            <div class="resume-section" style="margin-top: 15px;">
                <h2 class="resume-section-title">Expertise</h2>
                <div style="margin-top: 8px;">${badges}</div>
            </div>
        `;
    }

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <span class="item-title">${exp.role || "Role"}</span>
                    <span class="item-subtitle">${exp.company || "Company"}</span>
                    <span class="item-date">${exp.date || "Dates"}</span>
                </div>
                <div class="item-desc">${formatMultiline(exp.desc || "Accomplishments...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Professional Experience</h2>
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">${items}</div>
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
                <div class="item-desc">${formatMultiline(proj.desc || "Details...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Projects</h2>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">${items}</div>
            </div>
        `;
    }

    // Education
    let eduHTML = "";
    if (state.education && state.education.length > 0) {
        let items = state.education.map(edu => `
            <div class="experience-item">
                <div class="item-header">
                    <span class="item-title">${edu.degree || "Degree"}</span>
                    <span class="item-subtitle">${edu.institution || "Institution"}</span>
                    <span class="item-date">${edu.date || "Dates"}</span>
                </div>
                ${edu.desc ? `<div class="item-desc" style="margin-top:2px;">${edu.desc}</div>` : ''}
            </div>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Education</h2>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">${items}</div>
            </div>
        `;
    }

    // Regional details for Executive sidebar layout
    let regionalHTML = "";
    let regionalItems = [];
    if (state.dob) regionalItems.push(`<div class="contact-item"><strong>DOB:</strong> ${state.dob}</div>`);
    if (state.nationality) regionalItems.push(`<div class="contact-item"><strong>Nationality:</strong> ${state.nationality}</div>`);
    if (state.visaStatus) regionalItems.push(`<div class="contact-item"><strong>Visa / Residency:</strong> ${state.visaStatus}</div>`);
    if (state.maritalStatus) regionalItems.push(`<div class="contact-item"><strong>Status:</strong> ${state.maritalStatus}</div>`);
    if (state.languages) regionalItems.push(`<div class="contact-item"><strong>Languages:</strong> ${state.languages}</div>`);
    if (regionalItems.length > 0) {
        regionalHTML = `
            <div class="resume-section" style="margin-top: 15px;">
                <h2 class="resume-section-title">Personal Details</h2>
                <div class="contact-info-list" style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">${regionalItems.join('')}</div>
            </div>
        `;
    }

    return `
        <div class="sidebar-col">
            <header class="resume-header">
                <h1 class="resume-name">${name}</h1>
                <div class="resume-title">${title}</div>
            </header>
            ${contactBox}
            ${skillsHTML}
            ${regionalHTML}
        </div>
        <div class="main-col">
            ${expHTML}
            ${projHTML}
            ${eduHTML}
        </div>
    `;
}
