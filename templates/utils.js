// Convert newline bullet summaries into standard HTML bullet lists or breaks
export function formatMultiline(str) {
    if (!str) return "";
    let lines = str.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let bullets = [];
    let paragraphs = [];

    lines.forEach(l => {
        if (l.startsWith('-') || l.startsWith('•') || l.startsWith('*')) {
            let clean = l.replace(/^[\-\•\*]\s*/, '');
            bullets.push(`<li>${clean}</li>`);
        } else {
            paragraphs.push(l);
        }
    });

    let output = "";
    if (paragraphs.length > 0) {
        output += paragraphs.map(p => `<p style="margin-bottom:6px;">${p}</p>`).join('');
    }
    if (bullets.length > 0) {
        output += `<ul style="padding-left:16px; margin-top:4px; display:flex; flex-direction:column; gap:4px;">${bullets.join('')}</ul>`;
    }
    return output || str;
}

// Escapes dangerous HTML tags and quotes for XSS prevention
export function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\//g, "&#x2F;");
}

// Deep cleans a state object by escaping all string fields
export function sanitizeState(state) {
    if (!state) return state;
    
    // Deep clone state to avoid mutating original state
    const cleanState = JSON.parse(JSON.stringify(state));
    
    // Helper to sanitize a value recursively
    const cleanValue = (val) => {
        if (typeof val === 'string') {
            return escapeHTML(val);
        }
        if (Array.isArray(val)) {
            return val.map(item => {
                if (typeof item === 'string') {
                    return escapeHTML(item);
                }
                if (item && typeof item === 'object') {
                    const obj = {};
                    for (let key in item) {
                        obj[key] = cleanValue(item[key]);
                    }
                    return obj;
                }
                return item;
            });
        }
        if (val && typeof val === 'object') {
            const obj = {};
            for (let key in val) {
                obj[key] = cleanValue(val[key]);
            }
            return obj;
        }
        return val;
    };
    
    for (let key in cleanState) {
        cleanState[key] = cleanValue(cleanState[key]);
    }
    
    return cleanState;
}


