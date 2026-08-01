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
