import { formatMultiline } from "./utils.js";

// Helper to compile regional details beautifully for standard templates
export function compileRegionalSection(state, titleLabel = "Personal & Regional Details", isTableFormat = false) {
    let items = [];
    if (state.dob) items.push({ label: "Date of Birth", value: state.dob });
    if (state.nationality) items.push({ label: "Nationality", value: state.nationality });
    if (state.visaStatus) items.push({ label: "Visa / Residency", value: state.visaStatus });
    if (state.maritalStatus) items.push({ label: "Marital Status / Gender", value: state.maritalStatus });
    if (state.languages) items.push({ label: "Languages Known", value: state.languages });
    
    if (items.length === 0) return "";
    
    if (isTableFormat) {
        let rows = items.map(it => `
            <tr>
                <td style="width:180px; font-weight:600; font-size:0.82rem; padding:4px 0; border:none; color:var(--text-primary);">${it.label}:</td>
                <td style="font-size:0.82rem; padding:4px 0; border:none; color:var(--text-primary);">${it.value}</td>
            </tr>
        `).join('');
        return `
            <div class="resume-section" style="page-break-inside:avoid;">
                <h2 class="resume-section-title">${titleLabel}</h2>
                <div class="resume-section-content">
                    <table style="width:100%; border-collapse:collapse; margin-top:5px; border:none;">
                        ${rows}
                    </table>
                </div>
            </div>
        `;
    } else {
        let textList = items.map(it => `<strong>${it.label}:</strong> ${it.value}`).join('  |  ');
        return `
            <div class="resume-section" style="page-break-inside:avoid;">
                <h2 class="resume-section-title">${titleLabel}</h2>
                <div class="resume-section-content">
                    <p style="font-size:0.82rem; line-height:1.5; margin-top:5px;">${textList}</p>
                </div>
            </div>
        `;
    }
}

export function compileGCCTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(`<i class="fa-solid fa-envelope"></i> ${state.email}`);
    if (state.phone) contacts.push(`<i class="fa-solid fa-phone"></i> ${state.phone}`);
    if (state.location) contacts.push(`<i class="fa-solid fa-location-dot"></i> ${state.location}`);
    if (state.website) contacts.push(`<i class="fa-solid fa-globe"></i> ${state.website}`);
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join(' | ')}</div>` : '';

    // GCC specific info block
    let gccMeta = [];
    if (state.dob) gccMeta.push(`<strong>DOB:</strong> ${state.dob}`);
    if (state.nationality) gccMeta.push(`<strong>Nationality:</strong> ${state.nationality}`);
    if (state.visaStatus) gccMeta.push(`<strong>Visa Status:</strong> ${state.visaStatus}`);
    if (state.maritalStatus) gccMeta.push(`<strong>Marital Status:</strong> ${state.maritalStatus}`);
    if (state.languages) gccMeta.push(`<strong>Languages:</strong> ${state.languages}`);
    
    let gccMetaBox = gccMeta.length > 0 ? `
        <div class="gcc-meta-box">
            <div class="gcc-meta-grid">
                ${gccMeta.map(m => `<div class="gcc-meta-item">${m}</div>`).join('')}
            </div>
        </div>
    ` : '';

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title">${exp.role || "Job Role"}</span> at 
                        <span class="item-subtitle">${exp.company || "Company Name"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Timeline"}</span>
                </div>
                <div class="item-desc">${formatMultiline(exp.desc || "Responsibility bullets...")}</div>
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
                <h2 class="resume-section-title">Core Competencies</h2>
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
                    <span class="item-title">${proj.title || "Project Name"}</span>
                    <span class="item-subtitle">${proj.role || "Role"}</span>
                </div>
                <div class="item-desc" style="margin-top:2px;">${formatMultiline(proj.desc || "Description...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Key Projects</h2>
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
                        <span class="item-title">${edu.degree || "Degree"}</span>
                    </div>
                    <span class="item-date">${edu.date || "Dates"}</span>
                </div>
                <div class="item-subtitle">${edu.institution || "Institution"}</div>
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
        ${gccMetaBox}
        ${expHTML}
        ${skillsHTML}
        ${projHTML}
        ${eduHTML}
    `;
}

export function compileIndiaTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(state.email);
    if (state.phone) contacts.push(state.phone);
    if (state.location) contacts.push(state.location);
    if (state.website) contacts.push(state.website);
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join('  |  ')}</div>` : '';

    // Skills (Top)
    let skillsHTML = "";
    if (state.skills && state.skills.length > 0) {
        let badges = state.skills.map(s => `<span class="skill-badge-preview">${s}</span>`).join('');
        skillsHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Technical & Professional Skills</h2>
                <div class="resume-section-content">
                    <div class="skills-list-preview">${badges}</div>
                </div>
            </div>
        `;
    }

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <strong class="item-title">${exp.role || "Job Role"}</strong> — 
                        <span class="item-subtitle">${exp.company || "Company"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Timeline"}</span>
                </div>
                <div class="item-desc">${formatMultiline(exp.desc || "Accomplishments...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Professional Work Experience</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Projects
    let projHTML = "";
    if (state.projects && state.projects.length > 0) {
        let items = state.projects.map(proj => `
            <div class="project-item">
                <div class="item-header">
                    <strong class="item-title">${proj.title || "Project Title"}</strong>
                    <span class="item-subtitle">(${proj.role || "Role"})</span>
                </div>
                <div class="item-desc" style="margin-top:2px;">${formatMultiline(proj.desc || "Details...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Academic & Personal Projects</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Education
    let eduHTML = "";
    if (state.education && state.education.length > 0) {
        let rows = state.education.map(edu => `
            <tr>
                <td style="border: 1px solid #d1d5db; padding: 6px; font-weight:600; font-size:0.82rem;">${edu.degree || "Degree"}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; font-size:0.82rem;">${edu.institution || "Board/University"}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align:center; font-size:0.82rem;">${edu.date || "Year"}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; font-size:0.82rem;">${edu.desc || "Details"}</td>
            </tr>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Education History</h2>
                <div class="resume-section-content">
                    <table style="width:100%; border-collapse:collapse; margin-top:5px;">
                        <thead>
                            <tr style="background:#f3f4f6; color:#111;">
                                <th style="border: 1px solid #d1d5db; padding: 6px; text-align:left; font-size:0.8rem; text-transform:uppercase;">Degree / Course</th>
                                <th style="border: 1px solid #d1d5db; padding: 6px; text-align:left; font-size:0.8rem; text-transform:uppercase;">University / Board</th>
                                <th style="border: 1px solid #d1d5db; padding: 6px; text-align:center; font-size:0.8rem; text-transform:uppercase;">Year</th>
                                <th style="border: 1px solid #d1d5db; padding: 6px; text-align:left; font-size:0.8rem; text-transform:uppercase;">Score / Specialization</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Personal Declaration (Very common in Indian resumes)
    let personalHTML = "";
    let personalItems = [];
    if (state.dob) personalItems.push(`<tr><td style="width:150px; font-weight:600; font-size:0.82rem; padding: 4px 0;">Date of Birth:</td><td style="font-size:0.82rem; padding: 4px 0;">${state.dob}</td></tr>`);
    if (state.nationality) personalItems.push(`<tr><td style="font-weight:600; font-size:0.82rem; padding: 4px 0;">Nationality:</td><td style="font-size:0.82rem; padding: 4px 0;">${state.nationality}</td></tr>`);
    if (state.visaStatus) personalItems.push(`<tr><td style="font-weight:600; font-size:0.82rem; padding: 4px 0;">Visa / Residency:</td><td style="font-size:0.82rem; padding: 4px 0;">${state.visaStatus}</td></tr>`);
    if (state.maritalStatus) personalItems.push(`<tr><td style="font-weight:600; font-size:0.82rem; padding: 4px 0;">Marital Status:</td><td style="font-size:0.82rem; padding: 4px 0;">${state.maritalStatus}</td></tr>`);
    if (state.languages) personalItems.push(`<tr><td style="font-weight:600; font-size:0.82rem; padding: 4px 0;">Languages Known:</td><td style="font-size:0.82rem; padding: 4px 0;">${state.languages}</td></tr>`);

    if (personalItems.length > 0) {
        personalHTML = `
            <div class="resume-section" style="page-break-inside:avoid;">
                <h2 class="resume-section-title">Personal Profile Details</h2>
                <div class="resume-section-content">
                    <table style="width:100%; border-collapse:collapse; margin-top:5px;">
                        ${personalItems.join('')}
                    </table>
                </div>
            </div>
        `;
    }

    return `
        <header class="resume-header">
            <h1 class="resume-name">${name}</h1>
            <div class="resume-title">${title}</div>
            ${contactBar}
        </header>
        ${skillsHTML}
        ${expHTML}
        ${projHTML}
        ${eduHTML}
        ${personalHTML}
    `;
}

export function compileEuropeTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-envelope"></i> ${state.email}</div>`);
    if (state.phone) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-phone"></i> ${state.phone}</div>`);
    if (state.location) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-location-dot"></i> ${state.location}</div>`);
    if (state.website) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-globe"></i> ${state.website}</div>`);
    if (state.dob) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-calendar-days"></i> DOB: ${state.dob}</div>`);
    if (state.nationality) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-flag"></i> Nationality: ${state.nationality}</div>`);
    if (state.visaStatus) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-id-card"></i> ${state.visaStatus}</div>`);
    if (state.maritalStatus) contacts.push(`<div class="europe-contact-item"><i class="fa-solid fa-user-check"></i> Status: ${state.maritalStatus}</div>`);
    let contactCol = contacts.length > 0 ? `<div class="europe-contact-col">${contacts.join('')}</div>` : '';

    // Languages (Europass specific format)
    let langHTML = "";
    if (state.languages) {
        let items = state.languages.split(',').map(l => {
            let parts = l.trim().split('(');
            let name = parts[0].trim();
            let level = parts[1] ? parts[1].replace(')', '').trim() : 'Professional';
            // Map to CEFR standard if possible
            let cefr = "C1";
            if (level.toLowerCase().includes("native") || level.toLowerCase().includes("fluent")) cefr = "C2";
            else if (level.toLowerCase().includes("basic")) cefr = "A2";
            else if (level.toLowerCase().includes("conversational")) cefr = "B2";

            return `
                <div class="europe-lang-item">
                    <span class="europe-lang-name">${name}</span>
                    <span class="europe-lang-level">${level} (${cefr})</span>
                </div>
            `;
        }).join('');
        langHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Languages</h2>
                <div class="resume-section-content" style="display:flex; flex-direction:column; gap:6px; margin-top:5px;">${items}</div>
            </div>
        `;
    }

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title">${exp.role || "Job Role"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Timeline"}</span>
                </div>
                <div class="item-subtitle" style="color: #0d47a1; font-weight:600;">${exp.company || "Company"}</div>
                <div class="item-desc">${formatMultiline(exp.desc || "Bullet achievements...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Work Experience</h2>
                <div class="resume-section-content" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">${items}</div>
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
                        <span class="item-title">${edu.degree || "Degree"}</span>
                    </div>
                    <span class="item-date">${edu.date || "Dates"}</span>
                </div>
                <div class="item-subtitle" style="color: #0d47a1; font-weight:600;">${edu.institution || "Institution"}</div>
                ${edu.desc ? `<div class="item-desc">${edu.desc}</div>` : ''}
            </div>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Education and Training</h2>
                <div class="resume-section-content" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">${items}</div>
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
                    <span class="item-date">${proj.role || "Role"}</span>
                </div>
                <div class="item-desc">${formatMultiline(proj.desc || "Details...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Projects</h2>
                <div class="resume-section-content" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">${items}</div>
            </div>
        `;
    }

    // Skills
    let skillsHTML = "";
    if (state.skills && state.skills.length > 0) {
        let badges = state.skills.map(s => `<span class="skill-badge-preview">${s}</span>`).join('');
        skillsHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Digital Skills</h2>
                <div class="resume-section-content">
                    <div class="skills-list-preview">${badges}</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="europe-layout">
            <div class="europe-left-col">
                <header class="resume-header">
                    <h1 class="resume-name" style="font-size:1.6rem; color:#0d47a1; margin-bottom:2px;">${name}</h1>
                    <div class="resume-title" style="color:#555; font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${title}</div>
                </header>
                ${contactCol}
                ${langHTML}
            </div>
            <div class="europe-right-col">
                ${expHTML}
                ${skillsHTML}
                ${projHTML}
                ${eduHTML}
            </div>
        </div>
    `;
}

export function compileUSTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(state.email);
    if (state.phone) contacts.push(state.phone);
    if (state.location) contacts.push(state.location);
    if (state.website) contacts.push(state.website);
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join('  |  ')}</div>` : '';

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title" style="font-weight:700;">${exp.company || "Company Name"}</span> — 
                        <span class="item-subtitle">${exp.role || "Job Role"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Timeline"}</span>
                </div>
                <div class="item-desc">${formatMultiline(exp.desc || "Responsibility bullets...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Professional Experience</h2>
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
                        <span class="item-title" style="font-weight:700;">${edu.institution || "College Name"}</span>
                    </div>
                    <span class="item-date">${edu.date || "Timeline"}</span>
                </div>
                <div class="item-subtitle">${edu.degree || "Degree"}</div>
                ${edu.desc ? `<div class="item-desc" style="margin-top:2px;">${edu.desc}</div>` : ''}
            </div>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Education</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Projects
    let projHTML = "";
    if (state.projects && state.projects.length > 0) {
        let items = state.projects.map(proj => `
            <div class="project-item">
                <div class="item-header">
                    <span class="item-title" style="font-weight:700;">${proj.title || "Project Name"}</span>
                    <span class="item-subtitle">${proj.role || "Role"}</span>
                </div>
                <div class="item-desc" style="margin-top:2px;">${formatMultiline(proj.desc || "Description...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Technical Projects</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Skills
    let skillsHTML = "";
    if (state.skills && state.skills.length > 0) {
        let list = state.skills.join(', ');
        skillsHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Skills & Technologies</h2>
                <div class="resume-section-content">
                    <p style="font-size:0.82rem; line-height:1.4;">${list}</p>
                </div>
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
        ${eduHTML}
        ${projHTML}
        ${skillsHTML}
        ${compileRegionalSection(state, "Additional Information", false)}
    `;
}

export function compileUKTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(state.email);
    if (state.phone) contacts.push(state.phone);
    if (state.location) contacts.push(state.location);
    if (state.website) contacts.push(state.website);
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join('  |  ')}</div>` : '';

    // Career profile summary
    let profileHTML = `
        <div class="resume-section">
            <h2 class="resume-section-title">Professional Profile</h2>
            <div class="resume-section-content">
                <p style="font-size:0.83rem; line-height:1.5;">
                    A highly motivated and results-driven professional specializing in ${state.skills.slice(0, 3).join(', ')}. Proven track record of architecting robust systems and driving product achievements within fast-paced teams. Committed to implementing clean, scalable software frameworks.
                </p>
            </div>
        </div>
    `;

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title" style="font-weight:700;">${exp.role || "Job Role"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Dates"}</span>
                </div>
                <div class="item-subtitle" style="font-weight:600; color:#555;">${exp.company || "Company Name"}</div>
                <div class="item-desc">${formatMultiline(exp.desc || "Bullet achievements...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Employment History</h2>
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
                        <span class="item-title" style="font-weight:700;">${edu.degree || "Degree"}</span>
                    </div>
                    <span class="item-date">${edu.date || "Dates"}</span>
                </div>
                <div class="item-subtitle">${edu.institution || "College Name"}</div>
                ${edu.desc ? `<div class="item-desc">${edu.desc}</div>` : ''}
            </div>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Education & Qualifications</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Skills
    let skillsHTML = "";
    if (state.skills && state.skills.length > 0) {
        let list = state.skills.join(', ');
        skillsHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Key Skills & Core Competencies</h2>
                <div class="resume-section-content">
                    <p style="font-size:0.82rem; line-height:1.4;">${list}</p>
                </div>
            </div>
        `;
    }

    // References (UK classic addition)
    let referencesHTML = `
        <div class="resume-section" style="page-break-inside:avoid;">
            <h2 class="resume-section-title">References</h2>
            <div class="resume-section-content">
                <p style="font-size:0.8rem; font-style:italic; color:#555;">Professional references are available upon request.</p>
            </div>
        </div>
    `;

    return `
        <header class="resume-header">
            <h1 class="resume-name">${name}</h1>
            <div class="resume-title">${title}</div>
            ${contactBar}
        </header>
        ${profileHTML}
        ${expHTML}
        ${skillsHTML}
        ${eduHTML}
        ${compileRegionalSection(state, "Additional Details", false)}
        ${referencesHTML}
    `;
}

export function compileAsiaTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";

    // Left sidebar
    let contactCol = `
        <div class="asia-contact-box">
            <div class="asia-meta-title">Contact</div>
            ${state.email ? `<div class="asia-meta-item"><i class="fa-solid fa-envelope"></i> ${state.email}</div>` : ''}
            ${state.phone ? `<div class="asia-meta-item"><i class="fa-solid fa-phone"></i> ${state.phone}</div>` : ''}
            ${state.location ? `<div class="asia-meta-item"><i class="fa-solid fa-location-dot"></i> ${state.location}</div>` : ''}
            ${state.website ? `<div class="asia-meta-item"><i class="fa-solid fa-globe"></i> ${state.website}</div>` : ''}
        </div>
    `;

    let metaCol = "";
    let metaItems = [];
    if (state.dob) metaItems.push(`<div class="asia-meta-item"><strong>DOB:</strong> ${state.dob}</div>`);
    if (state.nationality) metaItems.push(`<div class="asia-meta-item"><strong>Nationality:</strong> ${state.nationality}</div>`);
    if (state.visaStatus) metaItems.push(`<div class="asia-meta-item"><strong>Visa Status:</strong> ${state.visaStatus}</div>`);
    if (state.maritalStatus) metaItems.push(`<div class="asia-meta-item"><strong>Status:</strong> ${state.maritalStatus}</div>`);
    if (state.languages) metaItems.push(`<div class="asia-meta-item"><strong>Languages:</strong> ${state.languages}</div>`);

    if (metaItems.length > 0) {
        metaCol = `
            <div class="asia-contact-box">
                <div class="asia-meta-title">Personal Info</div>
                ${metaItems.join('')}
            </div>
        `;
    }

    let skillsHTML = "";
    if (state.skills && state.skills.length > 0) {
        let badges = state.skills.map(s => `<span class="skill-badge-preview">${s}</span>`).join('');
        skillsHTML = `
            <div class="asia-contact-box">
                <div class="asia-meta-title">Skills</div>
                <div class="skills-list-preview" style="gap:4px; flex-wrap:wrap; display:flex;">${badges}</div>
            </div>
        `;
    }

    // Right pane - Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title" style="font-weight:700;">${exp.role || "Job Role"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Timeline"}</span>
                </div>
                <div class="item-subtitle" style="font-weight:600; color:#555;">${exp.company || "Company"}</div>
                <div class="item-desc">${formatMultiline(exp.desc || "Accomplishments...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Professional Experience</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    // Projects
    let projHTML = "";
    if (state.projects && state.projects.length > 0) {
        let items = state.projects.map(proj => `
            <div class="project-item">
                <div class="item-header">
                    <span class="item-title" style="font-weight:700;">${proj.title || "Project"}</span>
                    <span class="item-subtitle">(${proj.role || "Role"})</span>
                </div>
                <div class="item-desc">${formatMultiline(proj.desc || "Details...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Key Projects</h2>
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
                        <span class="item-title" style="font-weight:700;">${edu.degree || "Degree"}</span>
                    </div>
                    <span class="item-date">${edu.date || "Timeline"}</span>
                </div>
                <div class="item-subtitle">${edu.institution || "Institution"}</div>
                ${edu.desc ? `<div class="item-desc">${edu.desc}</div>` : ''}
            </div>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Education History</h2>
                <div class="resume-section-content">${items}</div>
            </div>
        `;
    }

    return `
        <div class="asia-layout">
            <div class="asia-left-col">
                <header class="resume-header">
                    <h1 class="resume-name" style="font-size:1.6rem; color:#0f172a; margin-bottom:2px;">${name}</h1>
                    <div class="resume-title" style="color:#0284c7; font-size:0.85rem; font-weight:600; text-transform:uppercase;">${title}</div>
                </header>
                ${contactCol}
                ${metaCol}
                ${skillsHTML}
            </div>
            <div class="asia-right-col">
                ${expHTML}
                ${projHTML}
                ${eduHTML}
            </div>
        </div>
    `;
}

export function compileLATAMTemplate(state) {
    let name = state.name || "YOUR NAME";
    let title = state.title || "Target Professional Title";
    
    let contacts = [];
    if (state.email) contacts.push(`<i class="fa-solid fa-envelope"></i> ${state.email}`);
    if (state.phone) contacts.push(`<i class="fa-solid fa-phone"></i> ${state.phone}`);
    if (state.location) contacts.push(`<i class="fa-solid fa-location-dot"></i> ${state.location}`);
    if (state.website) contacts.push(`<i class="fa-solid fa-globe"></i> ${state.website}`);
    let contactBar = contacts.length > 0 ? `<div class="resume-contact-bar">${contacts.join('  |  ')}</div>` : '';

    // LATAM personal meta row
    let latamMeta = [];
    if (state.dob) latamMeta.push(`Fecha de Nacimiento: ${state.dob}`);
    if (state.nationality) latamMeta.push(`Nacionalidad: ${state.nationality}`);
    if (state.visaStatus) latamMeta.push(`Visa / Residencia: ${state.visaStatus}`);
    if (state.maritalStatus) latamMeta.push(`Estado Civil: ${state.maritalStatus}`);
    if (state.languages) latamMeta.push(`Idiomas: ${state.languages}`);

    let latamMetaBox = latamMeta.length > 0 ? `
        <div class="latam-meta-box">
            ${latamMeta.map(m => `<div class="latam-meta-item">${m}</div>`).join('')}
        </div>
    ` : '';

    // Experience
    let expHTML = "";
    if (state.experience && state.experience.length > 0) {
        let items = state.experience.map(exp => `
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title" style="font-weight:700;">${exp.role || "Puesto"}</span> — 
                        <span class="item-subtitle">${exp.company || "Empresa"}</span>
                    </div>
                    <span class="item-date">${exp.date || "Período"}</span>
                </div>
                <div class="item-desc">${formatMultiline(exp.desc || "Logros y responsabilidades...")}</div>
            </div>
        `).join('');
        expHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Experiencia Profesional</h2>
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
                        <span class="item-title" style="font-weight:700;">${edu.degree || "Título / Certificación"}</span>
                    </div>
                    <span class="item-date">${edu.date || "Fecha"}</span>
                </div>
                <div class="item-subtitle">${edu.institution || "Institución Educativa"}</div>
                ${edu.desc ? `<div class="item-desc">${edu.desc}</div>` : ''}
            </div>
        `).join('');
        eduHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Educación y Formación</h2>
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
                <h2 class="resume-section-title">Habilidades y Competencias</h2>
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
                    <span class="item-title" style="font-weight:700;">${proj.title || "Proyecto"}</span>
                    <span class="item-subtitle">(${proj.role || "Rol"})</span>
                </div>
                <div class="item-desc" style="margin-top:2px;">${formatMultiline(proj.desc || "Detalles...")}</div>
            </div>
        `).join('');
        projHTML = `
            <div class="resume-section">
                <h2 class="resume-section-title">Proyectos Destacados</h2>
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
        ${latamMetaBox}
        ${expHTML}
        ${eduHTML}
        ${skillsHTML}
        ${projHTML}
    `;
}
