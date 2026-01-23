/* ========================================
   MEDRAG AI - MODERN APP JAVASCRIPT
   Premium interactions & animations
======================================== */

// ========================================
// GLOBAL STATE
// ========================================
let isProcessing = false;
let startTime = 0;
let currentNlpData = null;

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧠 MedRAG AI - Modern UI Initialized');
    initializeApp();
});

function initializeApp() {
    initializeTheme();
    initializeDropZone();
    initializeImageDropZone();
    initializeSearch();
    initializeAnimations();
}

// ========================================
// THEME MANAGEMENT
// ========================================
function initializeTheme() {
    const savedTheme = localStorage.getItem('medrag-theme') || 'dark';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('medrag-theme', newTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const toggle = document.getElementById('themeToggle');

    body.classList.remove('dark-mode', 'light-mode');
    body.classList.add(`${theme}-mode`);

    if (toggle) {
        toggle.innerHTML = theme === 'dark'
            ? '<i class="fas fa-moon"></i>'
            : '<i class="fas fa-sun"></i>';
    }
}

// ========================================
// DROP ZONE & FILE UPLOAD
// ========================================
function initializeDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) return;

    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag events
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
        if (files.length > 0) handleFile(files[0]);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
}

async function handleFile(file) {
    if (isProcessing) return;

    // Validate
    if (!file.type.includes('pdf')) {
        showToast('Please upload a PDF file', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be less than 50MB', 'error');
        return;
    }

    try {
        isProcessing = true;
        startTime = Date.now();

        showProgress();

        const results = await uploadAndAnalyze(file);

        if (results.success) {
            displayResults(results);
            showToast('Analysis complete! 🎉', 'success');
        } else {
            throw new Error(results.detail || 'Analysis failed');
        }

    } catch (error) {
        console.error('Upload error:', error);
        showToast(error.message || 'Upload failed', 'error');
    } finally {
        isProcessing = false;
        hideProgress();
    }
}

async function uploadAndAnalyze(file) {
    const formData = new FormData();
    formData.append('file', file);

    const summaryType = document.querySelector('input[name="summaryType"]:checked')?.value || 'abstractive';
    formData.append('summary_type', summaryType);

    // Simulate progress
    simulateProgress();

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
    }

    return await response.json();
}

function showProgress() {
    const progress = document.getElementById('progressSection');
    const dropZone = document.getElementById('dropZone');

    if (dropZone) dropZone.style.display = 'none';
    if (progress) {
        progress.style.display = 'block';
        progress.style.animation = 'fadeIn 0.3s ease';
    }
}

function hideProgress() {
    const progress = document.getElementById('progressSection');
    const dropZone = document.getElementById('dropZone');

    if (progress) progress.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
}

function simulateProgress() {
    let percent = 0;
    const fill = document.getElementById('progressFill');
    const percentText = document.getElementById('progressPercent');
    const steps = ['step1', 'step2', 'step3', 'step4'];

    const interval = setInterval(() => {
        percent += Math.random() * 5 + 2;
        if (percent > 100) percent = 100;

        if (fill) fill.style.width = `${percent}%`;
        if (percentText) percentText.textContent = `${Math.round(percent)}%`;

        // Update steps
        const stepIndex = Math.floor((percent / 100) * steps.length);
        steps.forEach((stepId, idx) => {
            const step = document.getElementById(stepId);
            if (step) {
                step.classList.toggle('active', idx <= stepIndex);
            }
        });

        if (percent >= 100) clearInterval(interval);
    }, 150);
}

// ========================================
// RESULTS DISPLAY
// ========================================
function displayResults(results) {
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);


    // Show sections
    document.getElementById('results').style.display = 'block';

    // Reset translation cache
    originalSummary = '';
    translatedSummaries = {};
    document.getElementById('languageSelector').value = 'en';

    // Update stats
    updateStat('pagesProcessed', results.stats?.pages || 0);
    updateStat('chunksProcessed', results.stats?.chunks || 0);
    updateStat('processingTime', processingTime);
    updateStat('entitiesFound', results.nlp_analysis?.entities?.total_count || 0);

    // Update summary type label
    const typeLabel = document.getElementById('summaryTypeLabel');
    if (typeLabel) {
        typeLabel.textContent = results.summary_type === 'Extractive' ? 'Extractive' : 'AI Abstractive';
    }

    // Display summary
    displaySummary(results.summary);

    // Display NLP analysis
    if (results.nlp_analysis) {
        displayNlpAnalysis(results.nlp_analysis);
    }

    // Show search section
    document.getElementById('searchSection').style.display = 'block';

    // Show chatbot section and populate suggestions
    if (results.chatbot?.enabled) {
        document.getElementById('chatbotSection').style.display = 'block';
        displayChatSuggestions(results.chatbot.suggested_questions || []);
    }

    // Show lab trends section if lab values were extracted
    if (results.lab_values?.extracted_count > 0) {
        document.getElementById('labTrendsSection').style.display = 'block';
        loadLabTrends();
    }

    // Show risk assessment if available
    if (results.risk_profile) {
        document.getElementById('riskSection').style.display = 'block';
        displayRiskAssessment(results.risk_profile);
    }

    // Scroll to results
    setTimeout(() => {
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

function updateStat(id, value) {
    const element = document.getElementById(id);
    if (element) {
        animateCounter(element, value);
    }
}

function animateCounter(element, target) {
    const duration = 1000;
    const start = parseInt(element.textContent) || 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * easeOut);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function displaySummary(summary) {
    const container = document.getElementById('summaryContent');
    if (!container || !summary) return;

    // Format summary into sections
    const formatted = formatSummary(summary);
    container.innerHTML = formatted;
}

function formatSummary(text) {
    if (!text) return '';

    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);

    // Updated sections with Patient Demographics first
    const sections = {
        'Patient Demographics': [],
        'Patient Overview': [],
        'Clinical Findings': [],
        'Diagnostics': [],
        'Treatment': [],
        'Follow-up': [],
        'Other': []
    };

    sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();

        // Patient Demographics - name, age, gender
        if ((lower.includes('mrs') || lower.includes('mr.') || lower.includes('miss') ||
            lower.includes('patient:') || lower.includes('name:')) &&
            (lower.includes('year') || lower.includes('female') || lower.includes('male') || lower.includes('yrs'))) {
            sections['Patient Demographics'].push(sentence);
        }
        // Demographics patterns
        else if (lower.match(/\d+[\s-]*(year|yr|yrs)[\s-]*(old)?[\s-]*(male|female)?/)) {
            sections['Patient Demographics'].push(sentence);
        }
        // Patient history and chief complaint
        else if (lower.includes('patient') && (lower.includes('present') || lower.includes('complaint') || lower.includes('history'))) {
            sections['Patient Overview'].push(sentence);
        }
        // Clinical findings
        else if (lower.includes('finding') || lower.includes('examination') || lower.includes('symptom') ||
            lower.includes('vital') || lower.includes('observation')) {
            sections['Clinical Findings'].push(sentence);
        }
        // Diagnostics - tests, results
        else if (lower.includes('test') || lower.includes('result') || lower.includes('hba1c') ||
            lower.includes('glucose') || lower.includes('level') || lower.includes('value') ||
            lower.includes('diagnosis') || lower.includes('condition') || lower.match(/\d+\.?\d*\s*%/)) {
            sections['Diagnostics'].push(sentence);
        }
        // Treatment
        else if (lower.includes('treatment') || lower.includes('medication') || lower.includes('therapy') ||
            lower.includes('drug') || lower.includes('prescribed') || lower.includes('administered')) {
            sections['Treatment'].push(sentence);
        }
        // Follow-up
        else if (lower.includes('recommend') || lower.includes('follow') || lower.includes('monitor') ||
            lower.includes('advice') || lower.includes('prognosis') || lower.includes('essential')) {
            sections['Follow-up'].push(sentence);
        }
        // Everything else
        else {
            sections['Other'].push(sentence);
        }
    });

    const icons = {
        'Patient Demographics': 'fa-id-card',
        'Patient Overview': 'fa-user-injured',
        'Clinical Findings': 'fa-stethoscope',
        'Diagnostics': 'fa-flask',
        'Treatment': 'fa-pills',
        'Follow-up': 'fa-calendar-check',
        'Other': 'fa-notes-medical'
    };

    let html = '';

    // Ensure order: Demographics first
    const orderedSections = ['Patient Demographics', 'Patient Overview', 'Clinical Findings', 'Diagnostics', 'Treatment', 'Follow-up', 'Other'];

    orderedSections.forEach(title => {
        const items = sections[title];
        if (items && items.length > 0) {
            html += `
                <div class="summary-section">
                    <h4 class="summary-section-title">
                        <i class="fas ${icons[title]}"></i>
                        ${title}
                    </h4>
                    ${items.map(s => `<p class="summary-point">${s}</p>`).join('')}
                </div>
            `;
        }
    });

    return html || `<p>${text}</p>`;
}

// ========================================
// NLP ANALYSIS DISPLAY
// ========================================
function displayNlpAnalysis(data) {
    if (!data) return;

    currentNlpData = data;
    document.getElementById('nlpSection').style.display = 'block';

    displayEntities(data.entities);
    displayICD10(data.icd10_codes);
    displayInteractions(data.drug_interactions);
    displayAbbreviations(data.abbreviations);
    displaySentiment(data.sentiment_analysis);
}

function switchNlpTab(tabName) {
    // Update tabs
    document.querySelectorAll('.nlp-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update panels
    document.querySelectorAll('.nlp-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}-panel`);
    });
}

function displayEntities(data) {
    const container = document.getElementById('entityCategories');
    const badge = document.getElementById('entitiesBadge');

    if (!container) return;

    badge.textContent = data?.total_count || 0;

    const summary = data?.summary || {};

    if (Object.keys(summary).length === 0) {
        container.innerHTML = '<div class="nlp-no-data"><i class="fas fa-search"></i><h4>No entities found</h4></div>';
        return;
    }

    const icons = {
        'DISEASE': 'fa-virus',
        'DRUG': 'fa-pills',
        'PROCEDURE': 'fa-procedures',
        'ANATOMY': 'fa-user-injured',
        'SYMPTOM': 'fa-thermometer-half',
        'LAB_TEST': 'fa-flask'
    };

    let html = '';
    Object.entries(summary).forEach(([category, entities]) => {
        if (entities?.length > 0) {
            html += `
                <div class="entity-category">
                    <div class="entity-category-header">
                        <span class="entity-category-title">
                            <i class="fas ${icons[category] || 'fa-tag'}"></i>
                            ${category.replace('_', ' ')}
                        </span>
                        <span class="entity-category-count">${entities.length}</span>
                    </div>
                    <div class="entity-tags">
                        ${entities.map(e => `<span class="entity-tag ${category.toLowerCase()}">${e}</span>`).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

function displayICD10(data) {
    const container = document.getElementById('icd10List');
    const badge = document.getElementById('icd10Badge');

    if (!container) return;

    const codes = data?.items || [];
    badge.textContent = codes.length;

    if (codes.length === 0) {
        container.innerHTML = '<div class="nlp-no-data"><i class="fas fa-hashtag"></i><h4>No ICD-10 codes mapped</h4></div>';
        return;
    }

    container.innerHTML = codes.map(code => `
        <div class="icd10-card">
            <div>
                <span class="icd10-code-value">${code.code}</span>
                <div class="icd10-category">${code.category}</div>
            </div>
            <div>
                <div class="icd10-description">${code.description}</div>
                <div class="icd10-source">Found: "${code.source_text}"</div>
            </div>
        </div>
    `).join('');
}

function displayInteractions(data) {
    const container = document.getElementById('interactionsList');
    const badge = document.getElementById('interactionsBadge');

    if (!container) return;

    const items = data?.items || [];
    badge.textContent = items.length;

    if (data?.has_major) {
        badge.style.background = 'var(--red-500)';
    }

    if (items.length === 0) {
        container.innerHTML = '<div class="nlp-no-data"><i class="fas fa-check-circle" style="color: var(--green-400)"></i><h4>No drug interactions detected</h4></div>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="interaction-card ${item.severity.toLowerCase()}">
            <div class="interaction-header">
                <div class="interaction-drugs">
                    <span class="drug-name">${item.drug1}</span>
                    <i class="fas fa-exchange-alt"></i>
                    <span class="drug-name">${item.drug2}</span>
                </div>
                <span class="severity-badge ${item.severity.toLowerCase()}">${item.severity}</span>
            </div>
            <p class="interaction-description">${item.description}</p>
            <div class="interaction-recommendation">
                <i class="fas fa-lightbulb"></i>
                <span>${item.recommendation}</span>
            </div>
        </div>
    `).join('');
}

function displayAbbreviations(data) {
    const container = document.getElementById('abbreviationsList');
    const badge = document.getElementById('abbreviationsBadge');

    if (!container) return;

    const items = data?.items || [];
    badge.textContent = items.length;

    if (items.length === 0) {
        container.innerHTML = '<div class="nlp-no-data"><i class="fas fa-spell-check"></i><h4>No abbreviations found</h4></div>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="abbreviation-card">
            <span class="abbreviation-short">${item.abbreviation}</span>
            <i class="fas fa-arrow-right abbreviation-arrow"></i>
            <span class="abbreviation-full">${item.expansion}</span>
        </div>
    `).join('');
}

function displaySentiment(data) {
    const container = document.getElementById('sentimentOverview');

    if (!container) return;

    const overall = data?.overall || { label: 'NEUTRAL', confidence: 0.5 };
    const items = data?.items || [];

    const icons = {
        'POSITIVE': 'fa-face-smile',
        'NEGATIVE': 'fa-face-frown',
        'NEUTRAL': 'fa-face-meh'
    };

    let html = `
        <div class="sentiment-summary">
            <div class="sentiment-indicator">
                <div class="sentiment-icon ${overall.label.toLowerCase()}">
                    <i class="fas ${icons[overall.label] || 'fa-face-meh'}"></i>
                </div>
                <div class="sentiment-label">${overall.label}</div>
                <div class="sentiment-confidence">${Math.round((overall.confidence || 0.5) * 100)}% confidence</div>
            </div>
            <div class="sentiment-stats">
                <div class="sentiment-stat positive">
                    <div class="sentiment-stat-value">${overall.positive_statements || 0}</div>
                    <div class="sentiment-stat-label">Positive</div>
                </div>
                <div class="sentiment-stat negative">
                    <div class="sentiment-stat-value">${overall.negative_statements || 0}</div>
                    <div class="sentiment-stat-label">Negative</div>
                </div>
                <div class="sentiment-stat neutral">
                    <div class="sentiment-stat-value">${overall.neutral_statements || 0}</div>
                    <div class="sentiment-stat-label">Neutral</div>
                </div>
            </div>
        </div>
    `;

    if (items.length > 0) {
        html += `<div class="sentiment-items">`;
        items.slice(0, 5).forEach(item => {
            html += `
                <div class="sentiment-item ${item.sentiment.toLowerCase()}">
                    <div class="sentiment-item-icon">
                        <i class="fas ${icons[item.sentiment] || 'fa-face-meh'}"></i>
                    </div>
                    <div class="sentiment-item-text">${item.text}</div>
                    <span class="sentiment-item-relevance">${item.clinical_relevance}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================
function initializeSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');

    if (input && btn) {
        btn.addEventListener('click', () => performSearch(input.value));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch(input.value);
        });
    }
}

async function performSearch(query) {
    if (!query.trim()) return;

    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    if (input) input.value = query;

    try {
        const response = await fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.success && data.answer) {
            results.innerHTML = `
                <div class="search-answer">
                    <p>${data.answer}</p>
                </div>
            `;
        } else {
            results.innerHTML = `<div class="nlp-no-data"><p>No relevant information found.</p></div>`;
        }
    } catch (error) {
        results.innerHTML = `<div class="nlp-no-data"><p>Search failed. Please try again.</p></div>`;
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function handleCopySummary() {
    const content = document.getElementById('summaryContent');
    if (content) {
        navigator.clipboard.writeText(content.textContent)
            .then(() => showToast('Summary copied!', 'success'))
            .catch(() => showToast('Copy failed', 'error'));
    }
}

function handleExportReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const doc = new jsPDF();
    const content = document.getElementById('summaryContent');

    doc.setFontSize(20);
    doc.setTextColor(6, 182, 212);
    doc.text('MedRAG AI - Analysis Report', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const text = content ? content.textContent : 'No content';
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, 20, 35);

    doc.save('medrag-report.pdf');
    showToast('Report exported!', 'success');
}

function handleNewAnalysis() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('nlpSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'none';
    document.getElementById('chatbotSection').style.display = 'none';
    document.getElementById('labTrendsSection').style.display = 'none';
    document.getElementById('riskSection').style.display = 'none';
    document.getElementById('fileInput').value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Ready for new analysis', 'info');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// ANIMATIONS
// ========================================
function initializeAnimations() {
    // Parallax effect for orbs
    document.addEventListener('mousemove', (e) => {
        const orbs = document.querySelectorAll('.gradient-orb');
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        orbs.forEach((orb, i) => {
            const factor = (i + 1) * 0.5;
            orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
        });
    });
}

// Global function exposure
window.toggleTheme = toggleTheme;
window.switchNlpTab = switchNlpTab;
window.performSearch = performSearch;
window.handleCopySummary = handleCopySummary;
window.handleExportReport = handleExportReport;
window.handleNewAnalysis = handleNewAnalysis;

// Navigation function
function navigateTo(sectionId) {
    const section = document.getElementById(sectionId);

    if (!section) {
        showToast('Section not available yet. Please analyze a document first.', 'info');
        return;
    }

    // Check if section is hidden
    if (section.style.display === 'none') {
        showToast('This section will appear after document analysis.', 'info');
        return;
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });

    // Smooth scroll to section
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.navigateTo = navigateTo;

// ========================================
// MEDICAL IMAGE UPLOAD
// ========================================
let currentImageData = null;

function initializeImageDropZone() {
    const dropZone = document.getElementById('imageDropZone');
    const fileInput = document.getElementById('imageFileInput');

    if (!dropZone || !fileInput) return;

    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag events
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
        if (files.length > 0) handleImageFile(files[0]);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleImageFile(e.target.files[0]);
    });
}

async function handleImageFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
    if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        showToast('Please upload a valid image file (JPEG, PNG, BMP, TIFF)', 'error');
        return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
        showToast('Image file must be less than 20MB', 'error');
        return;
    }

    try {
        // Show preview
        showImagePreview(file);

        // Upload and analyze
        showToast('Analyzing medical image...', 'info');
        const results = await uploadAndAnalyzeImage(file);

        if (results.success) {
            displayImageAnalysis(results, file);
            showToast('Image analysis complete! 🎉', 'success');
        } else {
            throw new Error(results.detail || 'Analysis failed');
        }

    } catch (error) {
        console.error('Image analysis error:', error);
        showToast(error.message || 'Image analysis failed', 'error');
        hideImageAnalyzing();
    }
}

function showImagePreview(file) {
    const previewSection = document.getElementById('imagePreviewSection');
    const previewImg = document.getElementById('imagePreview');
    const analyzingDiv = document.getElementById('imageAnalyzing');

    if (previewSection && previewImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            currentImageData = e.target.result;
        };
        reader.readAsDataURL(file);

        previewSection.style.display = 'block';
        if (analyzingDiv) analyzingDiv.style.display = 'flex';
    }
}

function hideImageAnalyzing() {
    const analyzingDiv = document.getElementById('imageAnalyzing');
    if (analyzingDiv) analyzingDiv.style.display = 'none';
}

async function uploadAndAnalyzeImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
    }

    return await response.json();
}

function displayImageAnalysis(results, file) {
    hideImageAnalyzing();

    const analysis = results.analysis;

    // Show results section
    document.getElementById('imageResults').style.display = 'block';

    // Set image
    const analyzedImg = document.getElementById('analyzedImage');
    if (analyzedImg && currentImageData) {
        analyzedImg.src = currentImageData;
    }

    // Set file info
    document.getElementById('imageFileName').textContent = file.name;
    document.getElementById('imageType').textContent = analysis.image_type || 'Medical Image';

    // Set analysis meta
    document.getElementById('analysisImageType').textContent = analysis.image_type || '-';
    document.getElementById('analysisBodyPart').textContent = analysis.body_part || '-';
    document.getElementById('analysisModality').textContent = analysis.modality || '-';

    // Set abnormality status
    const abnormalityDiv = document.getElementById('abnormalityStatus');
    if (abnormalityDiv) {
        const badge = abnormalityDiv.querySelector('.status-badge');
        if (analysis.abnormalities_detected) {
            badge.className = 'status-badge abnormal';
            badge.textContent = 'Detected';
        } else {
            badge.className = 'status-badge normal';
            badge.textContent = 'None Detected';
        }
    }

    // Set confidence badge
    const confidenceBadge = document.getElementById('confidenceBadge');
    if (confidenceBadge) {
        const score = analysis.confidence_score || 0.5;
        if (score >= 0.7) {
            confidenceBadge.className = 'confidence-badge high';
            confidenceBadge.textContent = 'HIGH';
        } else if (score >= 0.4) {
            confidenceBadge.className = 'confidence-badge medium';
            confidenceBadge.textContent = 'MEDIUM';
        } else {
            confidenceBadge.className = 'confidence-badge low';
            confidenceBadge.textContent = 'LOW';
        }
    }

    // Display findings
    const findingsList = document.getElementById('findingsList');
    if (findingsList) {
        const findings = analysis.findings || [];
        if (findings.length === 0) {
            findingsList.innerHTML = '<p class="no-findings">No specific findings detected. Please consult a healthcare professional for interpretation.</p>';
        } else {
            findingsList.innerHTML = findings.map(f => `
                <div class="finding-item ${(f.severity || 'normal').toLowerCase()}">
                    <div class="finding-text">
                        <strong>${f.finding}</strong>
                        <span>Location: ${f.location || 'Not specified'}</span>
                    </div>
                    <span class="severity-tag ${(f.severity || 'normal').toLowerCase()}">${f.severity || 'NORMAL'}</span>
                </div>
            `).join('');
        }
    }

    // Display impression
    const impressionText = document.getElementById('impressionText');
    if (impressionText) {
        impressionText.textContent = analysis.impression || 'No impression available. Please consult a healthcare professional.';
    }

    // Display recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    if (recommendationsList) {
        const recommendations = analysis.recommendations || ['Consult a healthcare professional for proper interpretation'];
        recommendationsList.innerHTML = recommendations.map(r => `<li>${r}</li>`).join('');
    }

    // Scroll to results
    setTimeout(() => {
        document.getElementById('imageResults').scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

function handleCopyImageAnalysis() {
    const impression = document.getElementById('impressionText')?.textContent || '';
    const findings = Array.from(document.querySelectorAll('.finding-text strong')).map(el => el.textContent).join('\n');

    const text = `Medical Image Analysis\n\nFindings:\n${findings}\n\nImpression:\n${impression}`;

    navigator.clipboard.writeText(text)
        .then(() => showToast('Analysis copied!', 'success'))
        .catch(() => showToast('Copy failed', 'error'));
}

function handleNewImageAnalysis() {
    document.getElementById('imageResults').style.display = 'none';
    document.getElementById('imagePreviewSection').style.display = 'none';
    document.getElementById('imageFileInput').value = '';
    currentImageData = null;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Ready for new image analysis', 'info');
}

// Expose image functions globally
window.handleCopyImageAnalysis = handleCopyImageAnalysis;
window.handleNewImageAnalysis = handleNewImageAnalysis;


// ========================================
// MEDICAL CHATBOT
// ========================================
let isChatting = false;

function displayChatSuggestions(suggestions) {
    const container = document.getElementById('suggestionChips');
    if (!container) return;

    if (suggestions.length === 0) {
        suggestions = [
            "What is the patient's diagnosis?",
            "What are the key findings?",
            "Are there any medications mentioned?",
            "What are the recommendations?"
        ];
    }

    container.innerHTML = suggestions.map(q => `
        <span class="suggestion-chip" onclick="askSuggestedQuestion('${q.replace(/'/g, "\\'")}')">
            <i class="fas fa-comment"></i>
            ${q}
        </span>
    `).join('');
}

function askSuggestedQuestion(question) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = question;
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();

    if (!message || isChatting) return;

    // Clear input
    input.value = '';

    // Add user message
    addChatMessage(message, 'user');

    // Show typing indicator
    showTypingIndicator();

    isChatting = true;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove typing indicator
        hideTypingIndicator();

        if (data.success) {
            addChatMessage(data.response, 'bot');
        } else {
            addChatMessage(data.response || 'Sorry, I encountered an error. Please try again.', 'bot');
        }

    } catch (error) {
        console.error('Chat error:', error);
        hideTypingIndicator();
        addChatMessage('Sorry, I encountered a connection error. Please try again.', 'bot');
    } finally {
        isChatting = false;
    }
}

function addChatMessage(text, type) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const avatar = type === 'bot' ? 'fa-robot' : 'fa-user';

    // Format the text - convert markdown bold to HTML
    const formattedText = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    const messageHTML = `
        <div class="chat-message ${type}">
            <div class="message-avatar">
                <i class="fas ${avatar}"></i>
            </div>
            <div class="message-content">
                <p>${formattedText}</p>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', messageHTML);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const typingHTML = `
        <div class="chat-message bot typing-message">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', typingHTML);
    container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
    const typingMsg = document.querySelector('.typing-message');
    if (typingMsg) {
        typingMsg.remove();
    }
}

async function clearChatHistory() {
    try {
        await fetch('/chat/clear', {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        // Reset chat UI
        const container = document.getElementById('chatMessages');
        if (container) {
            container.innerHTML = `
                <div class="chat-message bot">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>👋 Chat history cleared! I'm ready for new questions about your document.</p>
                    </div>
                </div>
            `;
        }

        showToast('Chat history cleared', 'success');

    } catch (error) {
        console.error('Clear chat error:', error);
        showToast('Failed to clear chat history', 'error');
    }
}

// Expose chatbot functions globally
window.sendChatMessage = sendChatMessage;
window.askSuggestedQuestion = askSuggestedQuestion;
window.clearChatHistory = clearChatHistory;

// ========================================
// TRANSLATION
// ========================================
let originalSummary = '';
let translatedSummaries = {}; // Cache translations

function translateReport() {
    const selector = document.getElementById('languageSelector');
    const lang = selector.value;
    const summaryContent = document.getElementById('summaryContent');
    const summaryTypeLabel = document.getElementById('summaryTypeLabel');

    // Store original summary if not stored yet
    if (!originalSummary && lang === 'en') {
        // It might be already populated with markdown, we can get it from there?
        // Actually best to store it when result comes.
        // But for now, let's assume if it's currently English, it is the original
        originalSummary = summaryContent.innerHTML;
    }

    if (lang === 'en') {
        if (originalSummary) {
            summaryContent.innerHTML = originalSummary;
        }
        summaryTypeLabel.textContent = 'AI Abstractive';
        return;
    }

    // Check cache
    if (translatedSummaries[lang]) {
        summaryContent.innerHTML = marked.parse(translatedSummaries[lang]);
        summaryTypeLabel.textContent = `Translated (${lang})`;
        return;
    }

    // Perform translation
    performTranslation(lang);
}

async function performTranslation(lang) {
    const summaryContent = document.getElementById('summaryContent');

    // Get text content to translate (clean HTML tags if needed, but for summary usually we want to translate the source text)
    // Here we'll take the text content of the original summary if we have it, or current
    // We should ideally translate the raw summary text, not HTML

    // Let's assume we want to translate the text content
    if (!originalSummary) {
        originalSummary = summaryContent.innerHTML;
    }

    // Extract text from HTML (simple way)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalSummary;
    const textToTranslate = tempDiv.innerText; // Or we could keep markdown structure if we had the raw markdown

    showToast(`Translating to ${lang}...`, 'info');
    summaryContent.style.opacity = '0.5';

    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                text: textToTranslate,
                language: lang
            })
        });

        const data = await response.json();

        if (data.success) {
            // Cache it
            translatedSummaries[lang] = data.translated_text;

            // Display it (convert markdown to HTML)
            summaryContent.innerHTML = marked.parse(data.translated_text);
            document.getElementById('summaryTypeLabel').textContent = `Translated (${data.language})`;
            showToast('Translation complete', 'success');
        } else {
            throw new Error(data.error || 'Translation failed');
        }

    } catch (error) {
        console.error('Translation error:', error);
        showToast('Translation failed. Please try again.', 'error');
        // Revert to english selection
        document.getElementById('languageSelector').value = 'en';
        summaryContent.innerHTML = originalSummary;
    } finally {
        summaryContent.style.opacity = '1';
    }
}

// Expose translation function
window.translateReport = translateReport;



// ========================================
// LAB TRENDS
// ========================================
let labTrendChart = null;
let labTrendsData = null;

async function loadLabTrends() {
    try {
        const response = await fetch('/lab-trends', {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const data = await response.json();

        if (data.success) {
            labTrendsData = data;
            displayLatestValues(data);
            populateLabSelector(data.available_labs);
            displayLabHistory(data.trends);
        }

    } catch (error) {
        console.error('Error loading lab trends:', error);
    }
}

function displayLatestValues(data) {
    const container = document.getElementById('latestValuesGrid');
    if (!container) return;

    // Get latest value for each lab type
    const latest = {};
    Object.entries(data.trends || {}).forEach(([labName, values]) => {
        if (values.length > 0) {
            latest[labName] = values[values.length - 1];
        }
    });

    if (Object.keys(latest).length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-flask"></i>
                <p>No lab values recorded yet. Upload a medical report to start tracking.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = Object.entries(latest).map(([name, v]) => `
        <div class="lab-value-item status-${v.status}">
            <div class="lab-value-name">${name}</div>
            <div>
                <span class="lab-value-number">${v.value}</span>
                <span class="lab-value-unit">${v.unit}</span>
            </div>
            <div class="lab-value-date">${formatDate(v.date)}</div>
        </div>
    `).join('');
}

function populateLabSelector(labs) {
    const selector = document.getElementById('labSelector');
    if (!selector) return;

    selector.innerHTML = '<option value="">Select Lab Value</option>' +
        (labs || []).map(lab => `<option value="${lab}">${lab}</option>`).join('');
}

function displayLabHistory(trends) {
    const tbody = document.getElementById('labHistoryBody');
    if (!tbody) return;

    // Flatten all values and sort by date
    const allValues = [];
    Object.entries(trends || {}).forEach(([labName, values]) => {
        values.forEach(v => {
            allValues.push({ ...v, labName });
        });
    });

    allValues.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allValues.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="5">No measurements recorded</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = allValues.slice(0, 20).map(v => `
        <tr>
            <td>${formatDate(v.date)}</td>
            <td>${v.name}</td>
            <td><strong>${v.value}</strong> ${v.unit}</td>
            <td>${v.reference_range}</td>
            <td><span class="status-badge-small ${v.status}">${v.status}</span></td>
        </tr>
    `).join('');
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function updateChart() {
    const selector = document.getElementById('labSelector');
    const selectedLab = selector?.value;
    const chartEmpty = document.getElementById('chartEmpty');

    if (!selectedLab || !labTrendsData?.trends?.[selectedLab]) {
        if (chartEmpty) chartEmpty.classList.remove('hidden');
        if (labTrendChart) {
            labTrendChart.destroy();
            labTrendChart = null;
        }
        return;
    }

    if (chartEmpty) chartEmpty.classList.add('hidden');

    const values = labTrendsData.trends[selectedLab];
    const labels = values.map(v => formatDate(v.date));
    const dataPoints = values.map(v => v.value);

    const ctx = document.getElementById('labTrendChart').getContext('2d');

    if (labTrendChart) {
        labTrendChart.destroy();
    }

    // Determine color based on latest status
    const latestStatus = values[values.length - 1]?.status || 'normal';
    const colors = {
        normal: { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' },
        elevated: { border: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.1)' },
        high: { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' },
        low: { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' },
        critical: { border: 'rgb(220, 38, 38)', bg: 'rgba(220, 38, 38, 0.2)' }
    };

    const color = colors[latestStatus] || colors.normal;

    labTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedLab,
                data: dataPoints,
                borderColor: color.border,
                backgroundColor: color.bg,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: color.border
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: 'rgb(156, 163, 175)'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            const v = values[context.dataIndex];
                            return `${v.value} ${v.unit} (${v.status})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(75, 85, 99, 0.3)'
                    },
                    ticks: {
                        color: 'rgb(156, 163, 175)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(75, 85, 99, 0.3)'
                    },
                    ticks: {
                        color: 'rgb(156, 163, 175)'
                    }
                }
            }
        }
    });
}

async function refreshLabTrends() {
    showToast('Refreshing lab trends...', 'info');
    await loadLabTrends();
    showToast('Lab trends refreshed!', 'success');
}

async function clearLabTrends() {
    if (!confirm('Are you sure you want to clear all lab trend history?')) {
        return;
    }

    try {
        await fetch('/lab-trends/clear', {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        labTrendsData = null;
        if (labTrendChart) {
            labTrendChart.destroy();
            labTrendChart = null;
        }

        document.getElementById('latestValuesGrid').innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-flask"></i>
                <p>No lab values recorded yet. Upload a medical report to start tracking.</p>
            </div>
        `;

        document.getElementById('labHistoryBody').innerHTML = `
            <tr class="no-data-row">
                <td colspan="5">No measurements recorded</td>
            </tr>
        `;

        document.getElementById('labSelector').innerHTML = '<option value="">Select Lab Value</option>';
        document.getElementById('chartEmpty').classList.remove('hidden');

        showToast('Lab trend history cleared!', 'success');

    } catch (error) {
        console.error('Error clearing lab trends:', error);
        showToast('Failed to clear lab trends', 'error');
    }
}

// Expose lab trends functions globally
window.loadLabTrends = loadLabTrends;
window.updateChart = updateChart;
window.refreshLabTrends = refreshLabTrends;
window.clearLabTrends = clearLabTrends;


// ========================================
// RISK ASSESSMENT
// ========================================

function displayRiskAssessment(profile) {
    if (!profile) return;

    // 1. Framingham Score
    const framingham = profile.framingham;
    document.getElementById('framinghamPercent').textContent = framingham.risk_percent;
    document.getElementById('framinghamDesc').textContent = framingham.interpretation;

    // Badge
    const fBadge = document.getElementById('framinghamRiskBadge');
    fBadge.textContent = framingham.category;
    fBadge.className = 'risk-badge'; // Reset
    if (framingham.category.includes('High')) fBadge.classList.add('high');
    else if (framingham.category.includes('Intermediate')) fBadge.classList.add('intermediate');
    else fBadge.classList.add('low');

    // 2. Metabolic Syndrome
    const metabolic = profile.metabolic_syndrome;
    document.getElementById('metabolicScore').textContent = `${metabolic.criteria_count}/5`;
    document.getElementById('metabolicDesc').textContent = metabolic.interpretation;

    // Badge
    const mBadge = document.getElementById('metabolicBadge');
    if (metabolic.risk_present) {
        mBadge.textContent = "Detected";
        mBadge.className = 'risk-badge high';
    } else {
        mBadge.textContent = "Not Detected";
        mBadge.className = 'risk-badge low';
    }

    // List Criteria
    const mList = document.getElementById('metabolicList');
    if (metabolic.factors.length > 0) {
        mList.innerHTML = metabolic.factors.map(f => `<li>${f}</li>`).join('');
    } else {
        mList.innerHTML = '<li>No risk factors detected</li>';
    }

    // 3. Demographics
    const demos = profile.demographics;
    document.getElementById('riskAge').textContent = demos.age + ' years';
    document.getElementById('riskGender').textContent = demos.gender;
    document.getElementById('riskSmoker').textContent = demos.smoker_detected ? 'Detected' : 'Not Detected';
}

console.log('✨ MedRAG AI - Premium UI Ready');
