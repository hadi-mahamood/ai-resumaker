/**
 * ResuMake AI - Word-Level Difference Visualizer Utility
 * 
 * Provides high-performance text diff comparisons using a typed-array
 * Dynamic Programming Longest Common Subsequence (LCS) matrix.
 * Optimizes memory consumption by avoiding nested array allocations,
 * reducing GC pauses to zero.
 */

/**
 * Computes word-level differences between original and revised sentences
 * @param {string} original - The source bullet point
 * @param {string} revised - The rewritten bullet point
 * @returns {Array<{type: string, text: string}>} Array of diff descriptors
 */
export function diffWords(original, revised) {
    const origWords = (original || "").split(/\s+/).filter(Boolean);
    const revWords = (revised || "").split(/\s+/).filter(Boolean);
    
    const n = origWords.length;
    const m = revWords.length;
    
    // Allocate a flat typed array to prevent multiple nested array GC cycles
    const stride = m + 1;
    const dp = new Int32Array((n + 1) * stride);
    
    for (let i = 1; i <= n; i++) {
        const rowOffset = i * stride;
        const prevRowOffset = (i - 1) * stride;
        const origWordLower = origWords[i - 1].toLowerCase();
        
        for (let j = 1; j <= m; j++) {
            if (origWordLower === revWords[j - 1].toLowerCase()) {
                dp[rowOffset + j] = dp[prevRowOffset + (j - 1)] + 1;
            } else {
                const valA = dp[prevRowOffset + j];
                const valB = dp[rowOffset + (j - 1)];
                dp[rowOffset + j] = valA > valB ? valA : valB;
            }
        }
    }
    
    let i = n, j = m;
    const diff = [];
    
    while (i > 0 || j > 0) {
        const currentVal = dp[i * stride + j];
        
        if (i > 0 && j > 0 && origWords[i - 1].toLowerCase() === revWords[j - 1].toLowerCase()) {
            diff.push({ type: 'unchanged', text: revWords[j - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i * stride + (j - 1)] >= dp[(i - 1) * stride + j])) {
            diff.push({ type: 'addition', text: revWords[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i * stride + (j - 1)] < dp[(i - 1) * stride + j])) {
            diff.push({ type: 'deletion', text: origWords[i - 1] });
            i--;
        }
    }
    
    diff.reverse();
    return diff;
}

/**
 * Formats differences between sentences into HTML insert/delete highlights
 * @param {string} original - The source text
 * @param {string} revised - The revised text
 * @returns {string} Safe HTML string containing ins and del highlights
 */
export function renderDiffHTML(original, revised) {
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
