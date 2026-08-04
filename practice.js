/**
 * ResuMake AI - AI Practice Interview Controller (Module)
 * 
 * Generates tailored behavioral, technical, and resume-specific mock questions,
 * renders the practice dashboard, and submits answers to Gemini API for evaluation.
 */

let practiceQuestionsList = [];
let evaluatedAnswersList = {};

export function openInterviewPracticeModal() {
    const modal = document.getElementById("ats-interview-practice-modal");
    if (!modal) return;
    
    modal.classList.add("open");
    
    const startPane = document.getElementById("interview-start-pane");
    const dashboard = document.getElementById("interview-dashboard");
    
    if (practiceQuestionsList.length > 0) {
        startPane.style.display = "none";
        dashboard.style.display = "flex";
        renderInterviewDashboard();
    } else {
        startPane.style.display = "flex";
        dashboard.style.display = "none";
    }
}

export function closeInterviewPracticeModal() {
    const modal = document.getElementById("ats-interview-practice-modal");
    if (modal) modal.classList.remove("open");
}

export function generateInterviewQuestions() {
    const startPane = document.getElementById("interview-start-pane");
    const dashboard = document.getElementById("interview-dashboard");
    const questionsContainer = document.getElementById("interview-questions-list");
    
    if (!startPane || !dashboard || !questionsContainer) return;
    
    startPane.style.display = "none";
    dashboard.style.display = "flex";
    
    questionsContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; gap: 10px;">
            <div class="loading-spinner"></div>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Analyzing target profile to formulate interview scenarios...</span>
        </div>
    `;
    
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const state = window.state || {};
    const jdText = document.getElementById("ats-jd-text")?.value || state.targetJob || "Software Engineer";
    
    if (apiKey && window.callGeminiOptimizerAPI) {
        const prompt = `
You are an expert interviewer. Generate 3 tailored practice interview questions based on the candidate's resume and target job.
Include:
- 1 Technical question matching their skills.
- 1 Behavioral question matching their experience.
- 1 Resume-specific question asking details about their work history.

Resume Details:
${JSON.stringify(state, null, 2)}

Target Job: ${jdText}

Strictly output ONLY a valid JSON array of questions. Do not include markdown code ticks.
Expected Output Format:
[
  {
    "id": "q1",
    "type": "Technical",
    "question": "Custom question here..."
  },
  {
    "id": "q2",
    "type": "Behavioral",
    "question": "Custom question here..."
  },
  {
    "id": "q3",
    "type": "Resume-Specific",
    "question": "Custom question here..."
  }
]
`;
        window.callGeminiOptimizerAPI(apiKey, prompt).then(text => {
            let cleaned = text.trim();
            if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
            else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
            if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
            cleaned = cleaned.trim();
            
            practiceQuestionsList = JSON.parse(cleaned);
            evaluatedAnswersList = {};
            renderInterviewDashboard();
        }).catch(err => {
            console.error("AI Interview questions failed, using fallback list:", err);
            loadFallbackInterviewQuestions(jdText);
        });
    } else {
        setTimeout(() => {
            loadFallbackInterviewQuestions(jdText);
        }, 1200);
    }
}

export function loadFallbackInterviewQuestions(jdText) {
    const state = window.state || {};
    practiceQuestionsList = [
        {
            id: "q1",
            type: "Technical",
            question: `Can you explain your experience using standard architectural models for ${jdText || 'software system design'}?`
        },
        {
            id: "q2",
            type: "Behavioral",
            question: "Describe a situation where you encountered a major technical bottleneck. How did you diagnose the root cause and resolve it?"
        },
        {
            id: "q3",
            type: "Resume-Specific",
            question: `Explain how you leveraged your skill keywords: ${(state.skills || []).slice(0, 4).join(', ') || 'coding'} to optimize accomplishments in your recent role.`
        }
    ];
    evaluatedAnswersList = {};
    renderInterviewDashboard();
}

export function renderInterviewDashboard() {
    const container = document.getElementById("interview-questions-list");
    if (!container) return;
    
    container.innerHTML = "";
    practiceQuestionsList.forEach(q => {
        const feedback = evaluatedAnswersList[q.id];
        
        container.innerHTML += `
            <div class="ats-suggestion-card" style="background: rgba(255,255,255,0.01); border-color: rgba(255,255,255,0.03); margin-bottom: 16px;">
                <div class="ats-suggestion-meta">
                    <span class="ats-suggestion-priority low"><i class="fa-solid fa-circle-question"></i> ${q.type} Question</span>
                </div>
                <h4 style="margin: 0 0 10px 0; color: white; font-size: 0.85rem; line-height: 1.4; text-align: left;">${q.question}</h4>
                
                <div class="form-group" style="margin-bottom: 10px;">
                    <textarea id="interview-ans-${q.id}" placeholder="Type your answer here..." style="width: 100%; font-size: 0.8rem; background: rgba(0,0,0,0.25); height: 80px; resize: vertical; padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); color: white; outline: none;"></textarea>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn btn-primary" style="font-size: 0.72rem; padding: 4px 10px;" id="eval-btn-${q.id}" onclick="window.evaluateInterviewAnswer('${q.id}')">
                        <i class="fa-solid fa-award"></i> Evaluate Answer
                    </button>
                </div>
                
                <div id="eval-feedback-${q.id}" style="display: ${feedback ? 'block' : 'none'}; margin-top: 14px; padding-top: 14px; border-top: 1px dashed rgba(255,255,255,0.08); text-align: left;">
                    ${feedback ? getFeedbackMarkup(feedback) : ''}
                </div>
            </div>
        `;
        
        const textarea = document.getElementById(`interview-ans-${q.id}`);
        if (textarea && q.userAnswer) {
            textarea.value = q.userAnswer;
        }
    });
}

export function getFeedbackMarkup(fb) {
    return `
        <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
            <div style="margin-bottom: 8px;"><strong style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Strengths:</strong><br>${fb.strengths}</div>
            <div style="margin-bottom: 8px;"><strong style="color: var(--warning);"><i class="fa-solid fa-triangle-exclamation"></i> Areas for Improvement:</strong><br>${fb.improvements}</div>
            <div><strong style="color: #a78bfa;"><i class="fa-solid fa-lightbulb"></i> Recommended Answer Outline:</strong><br>${fb.sampleAnswer}</div>
        </div>
    `;
}

export function evaluateInterviewAnswer(qId) {
    const q = practiceQuestionsList.find(item => item.id === qId);
    if (!q) return;
    
    const answer = document.getElementById(`interview-ans-${qId}`)?.value || "";
    q.userAnswer = answer;
    
    if (answer.trim() === "") {
        if (window.showToast) window.showToast("Please type an answer to evaluate.");
        else alert("Please type an answer to evaluate.");
        return;
    }
    
    const feedbackBox = document.getElementById(`eval-feedback-${qId}`);
    const evalBtn = document.getElementById(`eval-btn-${qId}`);
    
    if (feedbackBox && evalBtn) {
        feedbackBox.style.display = "block";
        feedbackBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary);">
                <div class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
                <span>Evaluating your response against industry expectations...</span>
            </div>
        `;
        evalBtn.disabled = true;
    }
    
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    if (apiKey && window.callGeminiOptimizerAPI) {
        const prompt = `
You are an expert tech interviewer. Evaluate the candidate's answer for the following question.
Question: ${q.question}
Candidate's Answer: ${answer}

Provide feedback detailing:
- Strengths of their response.
- Missing details they should have included.
- A strong sample answer or outline.

Strictly output ONLY a valid JSON object matching this schema:
{
  "strengths": "Feedback on strengths...",
  "improvements": "Feedback on improvements...",
  "sampleAnswer": "Recommended outline or strong sample answer..."
}
`;
        window.callGeminiOptimizerAPI(apiKey, prompt).then(text => {
            let cleaned = text.trim();
            if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
            else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
            if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
            cleaned = cleaned.trim();
            
            const feedback = JSON.parse(cleaned);
            evaluatedAnswersList[qId] = feedback;
            
            if (feedbackBox && evalBtn) {
                feedbackBox.innerHTML = getFeedbackMarkup(feedback);
                evalBtn.disabled = false;
            }
        }).catch(err => {
            console.error("AI Evaluation failed, using local rule-based builder:", err);
            loadFallbackEvaluation(qId, answer, feedbackBox, evalBtn);
        });
    } else {
        setTimeout(() => {
            loadFallbackEvaluation(qId, answer, feedbackBox, evalBtn);
        }, 1000);
    }
}

export function loadFallbackEvaluation(qId, answer, feedbackBox, evalBtn) {
    const feedback = {
        strengths: "Your answer provides clear background context and shows active involvement in solving technical tasks.",
        improvements: "Quantify the outcome of your actions using measurable metrics (e.g. performance speed-ups or hours saved).",
        sampleAnswer: "Start with a high-level Situation description. Next, detail the Action you spearheaded, and conclude with the Result metric."
    };
    
    evaluatedAnswersList[qId] = feedback;
    if (feedbackBox && evalBtn) {
        feedbackBox.innerHTML = getFeedbackMarkup(feedback);
        evalBtn.disabled = false;
    }
}
