/**
 * MedRAG Dashboard - Main JavaScript
 * Apple Health + ChatGPT + Stripe Inspired UI
 */

// ========================================
// STATE MANAGEMENT
// ========================================
const AppState = {
    currentSection: 'dashboard',
    uploadedFile: null,
    summaryType: 'extractive',
    selectedLanguage: 'en',
    labData: [],
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
    labTrendsByCategory: {},
    latestLabValues: {},
    chatHistory: [],
    summaryContent: '',
<<<<<<< HEAD
=======
=======
    labTrends: null,
    latestLabs: {},
    chatHistory: [],
    summaryContent: '',
    originalSummaryContent: '',
    translatedSummaryContent: '',
    nlpAnalysis: {},
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
    visionResult: {},
    riskAssessment: {},
    suggestedQuestions: []
};

// ========================================
// DOM ELEMENTS
// ========================================
const DOM = {
    sidebar: null,
    navItems: null,
    sections: null,
    themeBtn: null,
    init() {
        this.sidebar = document.querySelector('.sidebar');
        this.navItems = document.querySelectorAll('.nav-item');
        this.sections = document.querySelectorAll('.content-section');
        this.themeBtn = document.getElementById('themeBtn');
    }
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    DOM.init();
    checkAuthentication();
    initNavigation();
    initTheme();
    initUpload();
    initChat();
    initLabTrends();
    initTranslate();
    initVision();
    initNLPTabs();
    
    // Load initial data
    loadLabTrendsData();
    updateQuickStats();
    updateLabTrendsSection();
    updateDashboardHealth();
});

// ========================================
// NAVIGATION
// ========================================
function initNavigation() {
    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                navigateTo(section);
            }
        });
    });
}

function navigateTo(sectionId) {
    // Update nav items
    DOM.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    // Update sections - HTML uses IDs like "dashboardSection", "uploadSection"
    const fullSectionId = sectionId + 'Section';
    DOM.sections.forEach(section => {
        section.classList.toggle('active', section.id === fullSectionId);
    });
    if (sectionId === 'profile') {
        loadUserProfile();
    }
    AppState.currentSection = sectionId;
    
    // Update page title
    updatePageTitle(sectionId);

    // Keep dashboard metrics fresh whenever user returns to dashboard
    if (sectionId === 'dashboard') {
        updateLabTrendsSection();
        updateDashboardHealth();
        updateQuickStats();
    }
}

function updatePageTitle(sectionId) {
    const titles = {
        'dashboard': { title: 'Dashboard', breadcrumb: 'Overview' },
        'upload': { title: 'Upload Document', breadcrumb: 'Analysis > Upload' },
        'summary': { title: 'Document Summary', breadcrumb: 'Analysis > Summary' },
        'vision': { title: 'Medical Imaging', breadcrumb: 'Analysis > Vision' },
        'trends': { title: 'Lab Trends', breadcrumb: 'Tools > Trends' },
        'risks': { title: 'Risk Assessment', breadcrumb: 'Tools > Risk' },
        'chat': { title: 'Medical Assistant', breadcrumb: 'Tools > Chat' },
        'translate': { title: 'Translation', breadcrumb: 'Tools > Translate' },
        'profile': { title: 'User Profile', breadcrumb: 'Account > Profile' }
    };
    
    const info = titles[sectionId] || { title: 'Dashboard', breadcrumb: 'Overview' };
    
    const titleEl = document.querySelector('.page-title h1');
    const breadcrumbEl = document.querySelector('.breadcrumb');
    
    if (titleEl) titleEl.textContent = info.title;
    if (breadcrumbEl) breadcrumbEl.textContent = info.breadcrumb;
}

// ========================================
// THEME TOGGLE
// ========================================
function initTheme() {
    const savedTheme = localStorage.getItem('medrag-theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeBtn(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateThemeBtn(false);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('medrag-theme', isDark ? 'dark' : 'light');
    updateThemeBtn(isDark);
}

function updateThemeBtn(isDark) {
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    if (text) text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

// ========================================
// FILE UPLOAD
// ========================================
function initUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imageDropZone = document.getElementById('imageDropZone');
    const imageInput = document.getElementById('imageFileInput');
    
    if (dropZone && fileInput) {
        // Click to upload
        dropZone.addEventListener('click', () => fileInput.click());
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) handleFileUpload(files[0]);
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }
    
    // Image upload
    if (imageDropZone && imageInput) {
        imageDropZone.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageUpload(e.target.files[0]);
            }
        });
    }
    
    // Summary type toggle
    const typeRadios = document.querySelectorAll('input[name="summaryType"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            AppState.summaryType = e.target.value;
        });
    });
}

async function handleFileUpload(file) {
    // Validate file
    if (!file.name.endsWith('.pdf')) {
        showToast('error', 'Invalid File', 'Please upload a PDF file');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Maximum file size is 10MB');
        return;
    }
    
    AppState.uploadedFile = file;
    
    // Show progress
    const progressEl = document.getElementById('uploadProgress');
    if (progressEl) progressEl.style.display = 'block';
    
    updateProgress(0, 'upload');
    
    // Upload file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('summary_type', AppState.summaryType);
    
    try {
        showLoading(true);
        updateProgress(30, 'parse');
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            updateProgress(60, 'analyze');
            
            // Store results
            AppState.summaryContent = data.summary || '';
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
            AppState.originalSummaryContent = data.summary || '';
            AppState.translatedSummaryContent = '';
            AppState.nlpAnalysis = data.nlp_analysis || {};
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
            AppState.labData = data.lab_values?.values || [];
            AppState.riskAssessment = data.risk_profile || {};
            AppState.suggestedQuestions = data.chatbot?.suggested_questions || [];

            // Reload complete lab history from backend persistence
            await loadLabTrendsData();
            
            updateProgress(100, 'complete');
            
            // Update UI
            updateSummarySection();
            updateSummaryStats(data.stats, data.summary_type);
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
            updateLabTrendsSection();
=======
            updateNLPSection();
            await updateLabTrendsSection();
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
            updateRiskSection();
            updateQuickStats();
            updateChatSuggestions();
            updateDashboardHealth();
            
            showToast('success', 'Success', 'Document processed successfully');
            
            // Navigate to summary
            setTimeout(() => {
                navigateTo('summary');
            }, 500);
            
        } else {
            throw new Error(data.detail || 'Upload failed');
        }
        
    } catch (error) {
        showToast('error', 'Error', error.message);
    } finally {
        showLoading(false);
    }
}

function updateProgress(percent, step) {
    const fill = document.querySelector('.progress-fill');
    const percentText = document.querySelector('.progress-percent');
    const steps = document.querySelectorAll('.progress-steps .step');
    
    if (fill) fill.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
    
    const stepOrder = ['upload', 'parse', 'analyze', 'complete'];
    const currentIdx = stepOrder.indexOf(step);
    
    steps.forEach((stepEl, idx) => {
        stepEl.classList.remove('active', 'completed');
        if (idx < currentIdx) stepEl.classList.add('completed');
        if (idx === currentIdx) stepEl.classList.add('active');
    });
}

// ========================================
// VISION / IMAGE ANALYSIS
// ========================================
function initVision() {
    // Initialize vision section file input
    const visionDropZone = document.getElementById('visionDropZone');
    const visionFileInput = document.getElementById('visionFileInput');
    
    if (visionDropZone && visionFileInput) {
        visionDropZone.addEventListener('click', (e) => {
            // Only trigger if not clicking the button directly
            if (e.target.tagName !== 'BUTTON') {
                visionFileInput.click();
            }
        });
        
        visionDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            visionDropZone.classList.add('dragover');
        });
        
        visionDropZone.addEventListener('dragleave', () => {
            visionDropZone.classList.remove('dragover');
        });
        
        visionDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            visionDropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) handleImageUpload(files[0]);
        });
        
        visionFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageUpload(e.target.files[0]);
            }
        });
    }
}

async function handleImageUpload(file) {
    // Validate
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showToast('error', 'Invalid File', 'Please upload a PNG or JPEG image');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showLoading(true);
        
        const response = await fetch('/upload-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            AppState.visionResult = data.analysis || data;
            updateVisionResults(file, data.analysis || data);
            showToast('success', 'Analysis Complete', 'Medical image analyzed successfully');
            navigateTo('vision');
        } else {
            throw new Error(data.detail || 'Analysis failed');
        }
        
    } catch (error) {
        showToast('error', 'Error', error.message);
    } finally {
        showLoading(false);
    }
}

function updateVisionResults(file, data) {
    const resultsContainer = document.getElementById('visionResults');
    const uploadSection = document.getElementById('visionUpload');
    
    if (!resultsContainer) return;
    
    // Debug: Log the received data
    console.log('Vision API Response:', JSON.stringify(data, null, 2));
    
    // Hide upload section, show results
    if (uploadSection) uploadSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    
    // Create image URL
    const imageUrl = URL.createObjectURL(file);

    const confidenceScore = Number(data.confidence_score ?? data.confidence ?? 0.85);
    const triageLevel = data.urgency_level || 'Needs routine follow-up';
    const triageReason = data.urgency_reason || 'Clinical review recommended for confirmation.';
    const patientSummary = data.patient_summary || 'AI analysis completed. Review findings with a clinician.';
    const triageMeta = getTriageMeta(triageLevel);

    const findingsHtml = Array.isArray(data.findings) && data.findings.length > 0
        ? `<div class="vision-findings-list">${data.findings.map((f) => {
            const severity = (f.severity || 'NORMAL').toUpperCase();
            const severityClass = `severity-${severity.toLowerCase()}`;
            const location = f.location ? `<span class="finding-location">${escapeHtml(f.location)}</span>` : '';
            const description = f.description ? `<p>${escapeHtml(f.description)}</p>` : '';
            return `
                <article class="finding-card ${severityClass}">
                    <div class="finding-head">
                        <h5>${escapeHtml(f.finding || 'Finding')}</h5>
                        <span class="severity-pill ${severityClass}">${escapeHtml(severity)}</span>
                    </div>
                    ${location}
                    ${description}
                </article>
            `;
        }).join('')}</div>`
        : '<p class="vision-empty">No significant findings detected.</p>';

    const differentialHtml = Array.isArray(data.differential_diagnosis) && data.differential_diagnosis.length > 0
        ? `<section class="vision-block"><h4>Differential Diagnosis</h4><ul>${data.differential_diagnosis.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul></section>`
        : '';

    const normalFindingsHtml = Array.isArray(data.normal_findings) && data.normal_findings.length > 0
        ? `<section class="vision-block"><h4>Normal Findings</h4><ul>${data.normal_findings.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul></section>`
        : '';

    const recommendationsHtml = Array.isArray(data.recommendations) && data.recommendations.length > 0
        ? `<section class="vision-block"><h4>Recommendations</h4><ul>${data.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></section>`
        : '';

    const limitationsHtml = Array.isArray(data.limitations) && data.limitations.length > 0
        ? `<section class="vision-block"><h4>Limitations</h4><ul>${data.limitations.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></section>`
        : '';
    
    resultsContainer.innerHTML = `
        <div class="vision-image-card">
            <img src="${imageUrl}" alt="Medical Image">
            <div class="image-overlay">
                <span class="image-type-badge">${escapeHtml(data.image_type || 'Medical Image')}</span>
            </div>
        </div>
        <div class="vision-analysis-card">
            <div class="analysis-header">
                <h3><i class="fas fa-microscope"></i> Analysis Results</h3>
                <span class="confidence-badge">${Math.round(confidenceScore * 100)}% Confidence</span>
            </div>
            <section class="vision-block patient-summary-block">
                <h4>Patient Summary</h4>
                <p>${escapeHtml(patientSummary)}</p>
            </section>
            <section class="triage-banner ${triageMeta.className}">
                <span class="triage-label">Triage</span>
                <div class="triage-content">
                    <strong>${escapeHtml(triageLevel)}</strong>
                    ${triageReason ? `<span>${escapeHtml(triageReason)}</span>` : ''}
                </div>
            </section>
            <div class="analysis-details">
                <div class="detail-row">
                    <span class="detail-label">Body Region</span>
                    <span class="detail-value">${escapeHtml(data.body_part || 'Not specified')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Modality</span>
                    <span class="detail-value">${escapeHtml(data.modality || 'Unknown')}</span>
                </div>
            </div>
            <section class="vision-block">
                <h4>Findings</h4>
                ${findingsHtml}
            </section>
            <section class="vision-block">
                <h4>Clinical Impression</h4>
                <p>${escapeHtml(data.impression || 'Normal study.')}</p>
            </section>
            ${differentialHtml}
            ${normalFindingsHtml}
            ${recommendationsHtml}
            ${limitationsHtml}
            <p class="chat-disclaimer vision-disclaimer">
                <i class="fas fa-shield-alt"></i>
                AI-generated educational support only. Clinical decisions require professional radiologist review.
            </p>
        </div>
    `;
}

function escapeHtml(value) {
    const str = String(value ?? '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTriageMeta(level) {
    const normalized = String(level || '').toLowerCase();
    if (normalized.includes('urgent')) {
        return { className: 'triage-high' };
    }
    if (normalized.includes('prompt')) {
        return { className: 'triage-medium' };
    }
    return { className: 'triage-low' };
}

// ========================================
// SUMMARY SECTION
// ========================================
function updateSummarySection() {
    const summaryTextEl = document.getElementById('summaryContent');
    if (!summaryTextEl) return;
    
    const contentToRender = AppState.translatedSummaryContent || AppState.summaryContent;

    if (contentToRender) {
        // Parse markdown-like content
        let html = contentToRender
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n- /g, '<li>')
            .replace(/- (.*)/g, '<li>$1</li>');
        
        summaryTextEl.innerHTML = `<p>${html}</p>`;
    } else {
        summaryTextEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-medical"></i>
                <h3>No Summary Available</h3>
                <p>Upload a medical document to generate a summary</p>
                <button class="btn-primary" onclick="navigateTo('upload')">
                    <i class="fas fa-upload"></i> Upload Document
                </button>
            </div>
        `;
    }
}



// ========================================
// LAB TRENDS SECTION
// ========================================
let labChart = null;

const LAB_CATEGORY_ALIASES = {
    glucose: ['glucose', 'fbg', 'fbs', 'rbs', 'blood sugar', 'fasting glucose', 'random glucose', 'eag'],
    hba1c: ['hba1c', 'a1c', 'glycated hemoglobin', 'glycosylated hemoglobin'],
    bp: ['systolic bp', 'diastolic bp', 'blood pressure', 'bp'],
    cholesterol: ['total cholesterol', 'cholesterol', 'hdl cholesterol', 'ldl cholesterol', 'triglycerides']
};

function initLabTrends() {
    // Initialize trend select
    const trendSelect = document.getElementById('trendSelector');
    if (trendSelect) {
        trendSelect.addEventListener('change', (e) => {
            updateLabChart(e.target.value);
        });
    }
}

<<<<<<< HEAD
async function loadLabTrendsData() {
    try {
        const [trendsResp, latestResp] = await Promise.all([
=======
<<<<<<< HEAD
async function loadLabTrendsData() {
    try {
        const [trendsResp, latestResp] = await Promise.all([
=======
async function fetchLabTrendData() {
    try {
        const [trendsRes, latestRes] = await Promise.all([
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
            fetch('/lab-trends'),
            fetch('/lab-trends/latest')
        ]);

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
        const trendsData = await trendsResp.json();
        const latestData = await latestResp.json();

        if (!trendsResp.ok || !trendsData.success) {
            throw new Error('Failed to load lab trends');
        }

        const grouped = trendsData.trends || {};
        const byCategory = {
            glucose: [],
            hba1c: [],
            bp: [],
            cholesterol: []
        };

        const flattened = [];
        Object.entries(grouped).forEach(([labName, entries]) => {
            (entries || []).forEach((entry) => {
                const normalized = normalizeLabEntry(entry, labName);
                const category = normalizeLabCategory(normalized.name);
                flattened.push(normalized);
                if (category) {
                    byCategory[category].push(normalized);
                }
            });
        });

        Object.keys(byCategory).forEach((key) => {
            byCategory[key].sort((a, b) => new Date(a.date) - new Date(b.date));
        });

        flattened.sort((a, b) => new Date(b.date) - new Date(a.date));

        AppState.labData = flattened;
        AppState.labTrendsByCategory = byCategory;
        AppState.latestLabValues = normalizeLatestValues(latestData?.latest || {});

        updateLabTrendsSection();
        updateDashboardHealth();
        updateQuickStats();
    } catch (error) {
        console.error('Lab trends load failed:', error);
    }
}

function normalizeLabEntry(entry, fallbackName = '') {
    return {
        ...entry,
        name: entry.name || fallbackName || 'Unknown Lab',
        reference: entry.reference || entry.reference_range || 'N/A',
        status: (entry.status || 'normal').toLowerCase()
    };
}

function normalizeLatestValues(latest) {
    const normalized = {
        glucose: null,
        hba1c: null,
        bpSystolic: null,
        bpDiastolic: null,
        cholesterol: null
    };

    Object.values(latest || {}).forEach((entry) => {
        const e = normalizeLabEntry(entry);
        const name = (e.name || '').toLowerCase();
        const category = normalizeLabCategory(name);

        if (name.includes('systolic')) normalized.bpSystolic = e;
        if (name.includes('diastolic')) normalized.bpDiastolic = e;

        if (category === 'glucose' && !normalized.glucose) normalized.glucose = e;
        if (category === 'hba1c' && !normalized.hba1c) normalized.hba1c = e;
        if (category === 'cholesterol' && !normalized.cholesterol) normalized.cholesterol = e;
    });

    return normalized;
}

function normalizeLabCategory(name = '') {
    const n = String(name).toLowerCase();
    for (const [category, aliases] of Object.entries(LAB_CATEGORY_ALIASES)) {
        if (aliases.some((alias) => n.includes(alias))) {
            return category;
        }
    }
    return null;
}

function updateLabTrendsSection() {
    updateLabCards();
    const selectedTrend = document.getElementById('trendSelector')?.value || 'glucose';
    updateLabChart(selectedTrend);
<<<<<<< HEAD
=======
=======
        const trendsData = await trendsRes.json();
        const latestData = await latestRes.json();

        AppState.labTrends = (trendsData && trendsData.success) ? trendsData : { success: false, trends: {}, available_labs: [] };
        AppState.latestLabs = (latestData && latestData.success) ? (latestData.latest || {}) : {};
    } catch (error) {
        AppState.labTrends = { success: false, trends: {}, available_labs: [] };
        AppState.latestLabs = {};
    }
}

async function updateLabTrendsSection() {
    await fetchLabTrendData();
    updateLabCards();
    const trendSelect = document.getElementById('trendSelector');
    const selected = trendSelect ? trendSelect.value : 'glucose';
    updateLabChart(selected);
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
    updateLabHistoryTable();
    updateDashboardHealth();
}

function normalizeLabKey(name) {
    const value = (name || '').toLowerCase();
    if (value.includes('hba1c') || value.includes('a1c')) return 'hba1c';
    if (value.includes('glucose') || value.includes('sugar') || value.includes('fbg') || value.includes('fbs') || value.includes('rbs')) return 'glucose';
    if (value.includes('systolic') || value.includes('diastolic') || value.includes('blood pressure') || value === 'bp') return 'bp';
    if (value.includes('cholesterol') || value.includes('ldl') || value.includes('hdl') || value.includes('triglycerides')) return 'cholesterol';
    return value;
}

function getLatestMappedValues() {
    const mapped = {
        glucose: null,
        hba1c: null,
        bp: { systolic: null, diastolic: null },
        cholesterol: null
    };

    Object.entries(AppState.latestLabs || {}).forEach(([name, entry]) => {
        const key = normalizeLabKey(name);
        const val = entry?.value;
        if (key === 'glucose' && mapped.glucose === null) mapped.glucose = val;
        if (key === 'hba1c' && mapped.hba1c === null) mapped.hba1c = val;
        if (key === 'cholesterol' && mapped.cholesterol === null) mapped.cholesterol = val;
        if (key === 'bp') {
            if ((name || '').toLowerCase().includes('systolic')) mapped.bp.systolic = val;
            if ((name || '').toLowerCase().includes('diastolic')) mapped.bp.diastolic = val;
        }
    });

    return mapped;
}

function updateLabCards() {
    const latest = getLatestMappedValues();
    const cardData = [
        { 
            id: 'glucose', 
            name: 'Glucose', 
            unit: 'mg/dL', 
            normalRange: '70-100',
            getValue: () => latest.glucose || getLatestLabValue('glucose')
        },
        { 
            id: 'hba1c', 
            name: 'HbA1c', 
            unit: '%', 
            normalRange: '< 5.7',
            getValue: () => latest.hba1c || getLatestLabValue('hba1c')
        },
        { 
            id: 'bp', 
            name: 'Blood Pressure', 
            unit: 'mmHg', 
            normalRange: '< 120/80',
            getValue: () => {
                const sys = latest.bp?.systolic;
                const dia = latest.bp?.diastolic;
                if (sys && dia) return `${sys}/${dia}`;
                return getLatestLabValue('blood_pressure') || getLatestLabValue('bp');
            }
        },
        { 
            id: 'chol', 
            name: 'Total Cholesterol', 
            unit: 'mg/dL', 
            normalRange: '< 200',
            getValue: () => latest.cholesterol || getLatestLabValue('cholesterol')
        }
    ];
    
    cardData.forEach(card => {
        const valueEl = document.getElementById(`${card.id}Value`);
        const statusEl = document.getElementById(`${card.id}Status`);
        
        if (valueEl) {
            const value = card.getValue();
            valueEl.textContent = value || '--';
        }
        
        if (statusEl) {
            const status = getLatestLabStatus(card.id) || getValueStatus(card.id, card.getValue());
            statusEl.textContent = status;
            statusEl.className = `value-status ${status.toLowerCase()}`;
        }
    });
}

function getLatestLabStatus(category) {
    const latest = AppState.latestLabValues || {};

    if (category === 'glucose') return latest.glucose?.status ? capitalizeStatus(latest.glucose.status) : null;
    if (category === 'hba1c') return latest.hba1c?.status ? capitalizeStatus(latest.hba1c.status) : null;
    if (category === 'cholesterol') return latest.cholesterol?.status ? capitalizeStatus(latest.cholesterol.status) : null;
    if (category === 'bp') {
        const status = latest.bpSystolic?.status || latest.bpDiastolic?.status;
        return status ? capitalizeStatus(status) : null;
    }
    return null;
}

function capitalizeStatus(status) {
    const s = String(status || '').toLowerCase();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Normal';
}

function getLatestLabValue(labType) {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
    const latest = AppState.latestLabValues || {};

    if (labType === 'glucose') return latest.glucose?.value ?? getLatestFromCategory('glucose')?.value ?? null;
    if (labType === 'hba1c') return latest.hba1c?.value ?? getLatestFromCategory('hba1c')?.value ?? null;
    if (labType === 'blood_pressure' || labType === 'bp') {
        const sys = latest.bpSystolic?.value;
        const dia = latest.bpDiastolic?.value;
        if (sys != null && dia != null) return `${sys}/${dia}`;
        return getLatestBpFromTrend();
    }
    if (labType === 'cholesterol') return latest.cholesterol?.value ?? getLatestFromCategory('cholesterol')?.value ?? null;

    return null;
}

function getLatestFromCategory(category) {
    const arr = AppState.labTrendsByCategory?.[category] || [];
    return arr.length ? arr[arr.length - 1] : null;
}

function getLatestBpFromTrend() {
    const bpEntries = AppState.labTrendsByCategory?.bp || [];
    if (!bpEntries.length) return null;

    const systolic = bpEntries.filter((x) => x.name.toLowerCase().includes('systolic')).pop();
    const diastolic = bpEntries.filter((x) => x.name.toLowerCase().includes('diastolic')).pop();

    if (systolic && diastolic) return `${systolic.value}/${diastolic.value}`;

    const generic = bpEntries.pop();
    return generic ? generic.value : null;
<<<<<<< HEAD
=======
=======
    const target = normalizeLabKey(labType);
    const matching = (AppState.labData || [])
        .filter(l => {
            const nameKey = normalizeLabKey(l.name || l.type || '');
            return nameKey === target;
        })
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    return matching.length > 0 ? matching[0].value : null;
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
}

function getValueStatus(type, value) {
    if (!value) return 'Normal';
    const normalizedType = type === 'chol' ? 'cholesterol' : type;
    
    const ranges = {
        glucose: { low: 70, high: 100 },
        hba1c: { low: 0, high: 5.7 },
        cholesterol: { low: 0, high: 200 }
    };
    
    const range = ranges[normalizedType];
    if (!range) return 'Normal';
    
    const numValue = parseFloat(value);
    if (numValue < range.low) return 'Low';
    if (numValue > range.high) return 'High';
    return 'Normal';
}

function updateLabChart(labType) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
<<<<<<< HEAD

    const data = generateChartDataFromTrend(labType);
=======
<<<<<<< HEAD

    const data = generateChartDataFromTrend(labType);
=======
    
    const data = generateChartData(labType);
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
    
    if (labChart) {
        labChart.destroy();
    }
    
    labChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: labType.charAt(0).toUpperCase() + labType.slice(1),
                data: data.values,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
function generateChartDataFromTrend(labType) {
    const values = AppState.labTrendsByCategory?.[labType] || [];

    if (!values.length) {
        return {
            labels: ['No data'],
            values: [null]
        };
    }

    if (labType === 'bp') {
        const systolicPoints = values.filter((v) => v.name.toLowerCase().includes('systolic'));
        const source = systolicPoints.length ? systolicPoints : values;
        return {
            labels: source.map((v) => formatTrendDate(v.date)),
            values: source.map((v) => Number(v.value))
<<<<<<< HEAD
=======
=======
function generateChartData(labType) {
    const trendMap = AppState.labTrends?.trends || {};
    const entries = Object.entries(trendMap);
    const matched = entries
        .filter(([name]) => normalizeLabKey(name) === labType)
        .flatMap(([, values]) => values || [])
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (matched.length > 0) {
        return {
            labels: matched.map(v => String(v.date || '').slice(5)),
            values: matched.map(v => Number(v.value) || 0)
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
        };
    }

    return {
<<<<<<< HEAD
        labels: values.map((v) => formatTrendDate(v.date)),
        values: values.map((v) => Number(v.value))
=======
<<<<<<< HEAD
        labels: values.map((v) => formatTrendDate(v.date)),
        values: values.map((v) => Number(v.value))
=======
        labels: ['No Data'],
        values: [0]
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
    };
}

function formatTrendDate(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr || 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateLabHistoryTable() {
    const tbody = document.getElementById('labHistoryBody');
    if (!tbody) return;

    const trendMap = AppState.labTrends?.trends || {};
    const flattened = Object.values(trendMap).flat();
    const rows = flattened.length > 0 ? flattened : AppState.labData;

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No lab history available</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
<<<<<<< HEAD
    AppState.labData.forEach(lab => {
        const status = (lab.status || 'normal').toLowerCase();
<<<<<<< HEAD
=======
=======
    rows
        .slice()
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .forEach(lab => {
        const status = lab.status || 'Normal';
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
        html += `
            <tr>
                <td>${lab.date || 'N/A'}</td>
                <td>${lab.name || 'N/A'}</td>
                <td>${lab.value || 'N/A'} ${lab.unit || ''}</td>
<<<<<<< HEAD
                <td>${lab.reference || lab.reference_range || 'N/A'}</td>
                <td><span class="value-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
=======
<<<<<<< HEAD
                <td>${lab.reference || lab.reference_range || 'N/A'}</td>
                <td><span class="value-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
=======
                <td>${lab.reference_range || lab.reference || 'N/A'}</td>
                <td><span class="value-status ${status.toLowerCase()}">${status}</span></td>
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ========================================
// RISK SECTION
// ========================================
function updateRiskSection() {
    const risk = AppState.riskAssessment;
    
    // Update Framingham Risk
    const framinghamScore = document.getElementById('framinghamScore');
    const framinghamGauge = document.getElementById('framinghamGauge');
    
    if (framinghamScore) {
        framinghamScore.textContent = risk.framingham?.risk_percent || 'N/A';
    }
    
    if (framinghamGauge) {
        const points = risk.framingham?.points || 0;
        framinghamGauge.style.width = `${Math.min(points * 5, 100)}%`;
    }
    
    // Update Metabolic Syndrome
    const metabolicScore = document.getElementById('metabolicScore');
    if (metabolicScore) {
        const met = risk.metabolic_syndrome?.criteria_count || 0;
        metabolicScore.textContent = `${met}/5`;
    }
    
    // Update demographics
    const ageEl = document.getElementById('demoAge');
    const genderEl = document.getElementById('demoGender');
    const smokerEl = document.getElementById('demoSmoker');
    
    if (ageEl) ageEl.textContent = risk.demographics?.age || 'N/A';
    if (genderEl) genderEl.textContent = risk.demographics?.gender || 'N/A';
    if (smokerEl) smokerEl.textContent = risk.demographics?.smoker_detected ? 'Yes' : 'No';
}

// ========================================
// CHAT SECTION
// ========================================
function initChat() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.querySelector('.send-btn');
    
    if (chatInput && sendBtn) {
        sendBtn.addEventListener('click', () => sendChatMessage());
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    
    // Quick suggestions
    const suggestions = document.querySelectorAll('.suggestion-chip');
    suggestions.forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.querySelector('span')?.textContent;
            if (text && chatInput) {
                chatInput.value = text;
                sendChatMessage();
            }
        });
    });
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addChatMessage(data.response || 'I apologize, but I couldn\'t generate a response.', 'bot');
        } else {
            throw new Error(data.detail || 'Chat error');
        }
        
    } catch (error) {
        addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

function addChatMessage(text, type) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${type}`;
    
    const icon = type === 'bot' ? 'fa-robot' : 'fa-user';
    
    messageEl.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${icon}"></i>
        </div>
        <div class="message-bubble">${text}</div>
    `;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
    
    AppState.chatHistory.push({ type, text, timestamp: new Date() });
}

// ========================================
// TRANSLATION SECTION
// ========================================
function initTranslate() {
    // Translation is handled via onclick="translateTo('xx')" in HTML
    // No additional initialization needed
}

async function translateSummary() {
    // Read language directly from dropdown to get current selection
    const languageSelect = document.getElementById('languageSelect');
    const lang = languageSelect ? languageSelect.value : 'en';
    const content = AppState.originalSummaryContent || AppState.summaryContent;
    
    if (!content) {
        showToast('info', 'No Content', 'Upload a document first to translate');
        updateTranslationContent('');
        return;
    }
    
    if (lang === 'en' || !lang) {
        const summarySection = document.getElementById('summaryContent');
        AppState.translatedSummaryContent = '';
        if (summarySection) {
            summarySection.innerHTML = formatSummaryDisplay(content);
        }
        updateTranslationContent(content);
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: content,
                language: lang
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const translated = data.translated_text || content;
            const summarySection = document.getElementById('summaryContent');
            AppState.translatedSummaryContent = translated;
            if (summarySection) {
                summarySection.innerHTML = formatSummaryDisplay(translated);
            }
            updateTranslationContent(translated);
        } else {
            throw new Error(data.detail || 'Translation failed');
        }
        
    } catch (error) {
        showToast('error', 'Error', error.message);
    } finally {
        showLoading(false);
    }
}

function updateTranslationContent(text) {
    const container = document.getElementById('translatedContent');
    if (!container) return;
    
    if (text) {
        const rendered = renderTranslationMarkup(text);
        container.innerHTML = rendered;
    } else {
        container.innerHTML = `
            <div class="empty-state small">
                <i class="fas fa-language"></i>
                <h3>No Content to Translate</h3>
                <p>Upload a document first to translate the summary</p>
            </div>
        `;
    }
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
function renderTranslationMarkup(text) {
    const safeText = String(text || '');
    if (window.marked && typeof window.marked.parse === 'function') {
        try {
            return window.marked.parse(safeText, {
                breaks: true,
                gfm: true
            });
        } catch (error) {
            console.warn('Marked rendering failed, falling back to plain text:', error);
        }
    }

    return safeText
        .split(/\n{2,}/)
        .map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
        .join('');
<<<<<<< HEAD
=======
=======
// Handle language dropdown change - sync AppState and trigger translation
async function handleLanguageChange() {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect) return;
    
    const selectedLanguage = languageSelect.value;
    AppState.selectedLanguage = selectedLanguage; // Keep AppState in sync
    
    // If English is selected, just show original content in summary section
    if (selectedLanguage === 'en') {
        const summarySection = document.getElementById('summaryContent');
        if (summarySection && AppState.summaryContent) {
            summarySection.innerHTML = formatSummaryDisplay(AppState.summaryContent);
        }
        updateTranslationContent('');
        return;
    }
    
    // For other languages, call translateSummary which now reads from dropdown
    await translateSummary();
}

// Helper to format summary for display with proper styling
function formatSummaryDisplay(text) {
    if (!text) return '';
    
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    return `<p>${html}</p>`;
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
}

// ========================================
// DASHBOARD STATS
// ========================================
function updateQuickStats() {
    // Update stats based on current data
    const stats = {
        documents: AppState.summaryContent ? 1 : 0,
        labValues: AppState.labData.length,
        chatMessages: AppState.chatHistory.length
    };
    
    // Update DOM elements
    const docCount = document.getElementById('totalDocuments');
    const labCount = document.getElementById('totalLabValues');
    const entityCount = document.getElementById('totalEntities');
    const chatCount = document.getElementById('totalChats');
    
    if (docCount) docCount.textContent = stats.documents;
    if (labCount) labCount.textContent = stats.labValues;
    if (chatCount) chatCount.textContent = stats.chatMessages;
}

// ========================================
// CHAT SUGGESTIONS
// ========================================
function updateChatSuggestions() {
    const container = document.querySelector('.chat-suggestions');
    if (!container) return;
    
    const questions = AppState.suggestedQuestions;
    
    if (questions.length === 0) {
        // Default suggestions if none from backend
        container.innerHTML = `
            <div class="suggestion-chip" onclick="askQuestion('What are the main diagnoses?')">
                <i class="fas fa-stethoscope"></i>
                <span>What are the main diagnoses?</span>
            </div>
            <div class="suggestion-chip" onclick="askQuestion('Summarize the lab results')">
                <i class="fas fa-vial"></i>
                <span>Summarize the lab results</span>
            </div>
            <div class="suggestion-chip" onclick="askQuestion('What medications are mentioned?')">
                <i class="fas fa-pills"></i>
                <span>What medications are mentioned?</span>
            </div>
        `;
        return;
    }
    
    let html = '';
    questions.forEach(q => {
        html += `
            <div class="suggestion-chip" onclick="askQuestion('${q.replace(/'/g, "\\'")}')">
                <i class="fas fa-comment-medical"></i>
                <span>${q}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function askQuestion(question) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = question;
        sendChatMessage();
    }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
async function exportToPDF() {
    if (!AppState.summaryContent) {
        showToast('error', 'No Content', 'No summary available to export');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Medical Document Summary', 20, 20);
        
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(AppState.summaryContent, 170);
        doc.text(lines, 20, 40);
        
        doc.save('medical_summary.pdf');
        showToast('success', 'Exported', 'PDF downloaded successfully');
        
    } catch (error) {
        showToast('error', 'Export Failed', error.message);
    }
}

function copySummary() {
    if (!AppState.summaryContent) {
        showToast('error', 'No Content', 'No summary available to copy');
        return;
    }
    
    navigator.clipboard.writeText(AppState.summaryContent)
        .then(() => showToast('success', 'Copied', 'Summary copied to clipboard'))
        .catch(() => showToast('error', 'Error', 'Failed to copy'));
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function showToast(type, title, message) {
    const container = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check',
        error: 'fa-times',
        info: 'fa-info'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ========================================
// SUMMARY STATS UPDATE
// ========================================
function updateSummaryStats(stats, summaryType) {
    // Update summary stat cards
    const pagesEl = document.getElementById('statPages');
    const chunksEl = document.getElementById('statChunks');
    const timeEl = document.getElementById('statTime');
    const entitiesEl = document.getElementById('statEntities');
    const typeBadge = document.getElementById('summaryTypeBadge');
    
    if (pagesEl && stats) pagesEl.textContent = stats.pages || '--';
    if (chunksEl && stats) chunksEl.textContent = stats.chunks || '--';
    if (timeEl) timeEl.textContent = ((Date.now() % 10000) / 1000).toFixed(1); // Approximate
    if (typeBadge) typeBadge.textContent = summaryType === 'Extractive' ? 'Extractive' : 'AI Generated';
}

// ========================================
// DASHBOARD HEALTH METRICS
// ========================================
function updateDashboardHealth() {
    // Update dashboard health overview cards
    const glucoseEl = document.getElementById('dashGlucose');
    const hba1cEl = document.getElementById('dashHba1c');
    const bpEl = document.getElementById('dashBP');
    const cholEl = document.getElementById('dashChol');
    const healthRing = document.getElementById('healthRing');
    
    // Get latest values from persisted lab trend data first, then fallback to current upload data
    const latest = getLatestMappedValues();
    const glucose = latest.glucose || getLatestLabValue('glucose');
    const hba1c = latest.hba1c || getLatestLabValue('hba1c');
    const bp = latest.bp?.systolic && latest.bp?.diastolic
        ? `${latest.bp.systolic}/${latest.bp.diastolic}`
        : (getLatestLabValue('blood_pressure') || getLatestLabValue('bp'));
    const chol = latest.cholesterol || getLatestLabValue('cholesterol');
    
    if (glucoseEl) glucoseEl.textContent = glucose || '--';
    if (hba1cEl) hba1cEl.textContent = hba1c || '--';
    if (bpEl) bpEl.textContent = bp || '--';
    if (cholEl) cholEl.textContent = chol || '--';
    
    // Calculate health score based on available data
    let score = 0;
    let factors = 0;
    if (glucose && parseFloat(glucose) >= 70 && parseFloat(glucose) <= 100) { score += 25; factors++; }
    else if (glucose) factors++;
    if (hba1c && parseFloat(hba1c) < 5.7) { score += 25; factors++; }
    else if (hba1c) factors++;
    if (chol && parseFloat(chol) < 200) { score += 25; factors++; }
    else if (chol) factors++;
    if (factors > 0 && !glucose && !hba1c && !chol) score = 0;
    else if (factors > 0) score = Math.round((score / (factors * 25)) * 100);
    
    // Animate health ring and score label
    if (healthRing && factors > 0) {
        healthRing.style.strokeDasharray = `${score}, 100`;
        healthRing.setAttribute('stroke-dasharray', `${score}, 100`);
    }

    const scoreEl = document.querySelector('.health-card .metric-value span');
    if (scoreEl) {
        scoreEl.textContent = factors > 0 ? String(score) : '--';
    }
}

// ========================================
// TRANSLATE TO LANGUAGE
// ========================================
function translateTo(language) {
    AppState.selectedLanguage = language;

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = language;
    }
    
    // Update active button state
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(getLanguageName(language).toLowerCase())) {
            btn.classList.add('active');
        }
    });
    
    translateSummary();
}

function getLanguageName(code) {
    const names = {
        'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu', 'kn': 'Kannada',
        'ml': 'Malayalam'
    };
    return names[code] || code;
}

// ========================================
// CLEAR LAB HISTORY
// ========================================
async function clearLabHistory() {
    try {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
        const response = await fetch('/lab-trends/clear', {
            method: 'POST'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to clear lab history');
        }

        await loadLabTrendsData();
        showToast('success', 'Cleared', 'Lab history has been cleared');
    } catch (error) {
        showToast('error', 'Error', error.message || 'Could not clear lab history');
<<<<<<< HEAD
=======
=======
        const response = await fetch('/lab-trends/clear', { method: 'POST' });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || 'Failed to clear lab history');
        }

        AppState.labData = [];
        AppState.labTrends = { success: true, trends: {}, available_labs: [] };
        AppState.latestLabs = {};
        updateLabCards();
        updateLabChart('glucose');
        updateLabHistoryTable();
        updateDashboardHealth();
        updateQuickStats();
        showToast('success', 'Cleared', 'Lab history has been cleared');
    } catch (error) {
        showToast('error', 'Error', error.message);
>>>>>>> 39c87361d1bd8d1f6b77f858059bbda69eaa180b
>>>>>>> 60ebcb446ea456efba9f22156a4552bb5d19a3ab
    }
}

// ========================================
// GLOBAL EXPORTS
// ========================================
window.navigateTo = navigateTo;
window.showSection = navigateTo; // Alias for HTML onclick handlers
window.exportToPDF = exportToPDF;
window.exportPDF = exportToPDF; // Alias for HTML onclick
window.copySummary = copySummary;
window.askQuestion = askQuestion;
window.toggleTheme = toggleTheme;
window.translateTo = translateTo;
window.translateSummary = translateSummary;
window.handleLanguageChange = handleLanguageChange;
window.sendMessage = sendChatMessage;
window.clearLabHistory = clearLabHistory;
window.logout = logout;

// ========================================
// AUTHENTICATION
// ========================================
async function checkAuthentication() {
    // Don't check auth on page load - let middleware handle it
    // This prevents infinite redirect loops
    return;
}

function displayUserInfo(user) {
    // Add user info to header if element exists
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
        userInfoEl.innerHTML = `
            <div class="user-menu">
                <span class="user-name">${escapeHtml(user.full_name || user.email)}</span>
                <button class="btn-secondary" onclick="logout()">Logout</button>
            </div>
        `;
    }
}

async function logout() {
    try {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/login.html';
    }
}

// Clear chat history
window.clearChat = function() {
    const container = document.getElementById('chatMessages');
    if (container) {
        container.innerHTML = `
            <div class="chat-message bot">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-bubble">👋 Hello! I'm your MedRAG AI assistant. Upload a medical document and ask me anything about it.</div>
            </div>
        `;
    }
    AppState.chatHistory = [];
    updateQuickStats();
    showToast('success', 'Cleared', 'Chat history has been cleared');
};

// Inline translation from summary section dropdown
window.translateSummaryInline = function() {
    const selector = document.getElementById('summaryLangSelect');
    if (!selector) return;
    const lang = selector.value;
    if (lang === 'en') {
        updateSummarySection();
        return;
    }
    AppState.selectedLanguage = lang;
    translateSummary();
};

// Toggle sidebar collapsed state
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
};
// ========================================
// PROFILE FUNCTIONS
// ========================================

async function loadUserProfile() {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            document.getElementById('profileFullName').textContent = data.user.full_name;
            document.getElementById('profileEmail').textContent = data.user.email;
            
            // Update sidebar user info
            const userName = document.querySelector('.user-name');
            if (userName) userName.textContent = data.user.full_name;
            
            // Set member since (you can enhance this with actual data from backend)
            document.getElementById('profileMemberSince').textContent = 'Recently';
            document.getElementById('profileLastLogin').textContent = 'Just now';
            
            // Get document count
            fetchUserStats(data.user.user_id);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

async function fetchUserStats(userId) {
    try {
        const docsResponse = await fetch('/documents/history?limit=1000', {
            credentials: 'include'
        });
        const docsData = await docsResponse.json();
        
        if (docsData.success) {
            document.getElementById('profileDocCount').textContent = docsData.documents.length;
        }
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('changePasswordBtn');
    const errorDiv = document.getElementById('passwordError');
    const successDiv = document.getElementById('passwordSuccess');
    
    // Hide messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    // Validate
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'New passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (newPassword.length < 8) {
        errorDiv.textContent = 'Password must be at least 8 characters';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        errorDiv.textContent = 'Password must contain letters and numbers';
        errorDiv.style.display = 'block';
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
    
    try {
        const response = await fetch('/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                old_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            successDiv.textContent = 'Password changed successfully! Redirecting to login...';
            successDiv.style.display = 'block';
            document.getElementById('changePasswordForm').reset();
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            errorDiv.textContent = data.error || 'Failed to change password';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Change Password';
    }
}

// Make functions globally available
window.handlePasswordChange = handlePasswordChange;
window.loadUserProfile = loadUserProfile;
