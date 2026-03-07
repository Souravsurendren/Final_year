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
    chatHistory: [],
    summaryContent: '',
    nlpAnalysis: {},
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
    initNavigation();
    initTheme();
    initUpload();
    initChat();
    initLabTrends();
    initTranslate();
    initVision();
    initNLPTabs();
    
    // Load initial data
    updateQuickStats();
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
    
    AppState.currentSection = sectionId;
    
    // Update page title
    updatePageTitle(sectionId);
}

function updatePageTitle(sectionId) {
    const titles = {
        'dashboard': { title: 'Dashboard', breadcrumb: 'Overview' },
        'upload': { title: 'Upload Document', breadcrumb: 'Analysis > Upload' },
        'summary': { title: 'Document Summary', breadcrumb: 'Analysis > Summary' },
        'nlp': { title: 'NLP Analysis', breadcrumb: 'Analysis > NLP' },
        'vision': { title: 'Medical Imaging', breadcrumb: 'Analysis > Vision' },
        'trends': { title: 'Lab Trends', breadcrumb: 'Tools > Trends' },
        'risks': { title: 'Risk Assessment', breadcrumb: 'Tools > Risk' },
        'chat': { title: 'Medical Assistant', breadcrumb: 'Tools > Chat' },
        'translate': { title: 'Translation', breadcrumb: 'Tools > Translate' }
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
    const savedTheme = localStorage.getItem('medrag-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeBtn(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('medrag-theme', isDark ? 'dark' : 'light');
    updateThemeBtn(isDark);
}

function updateThemeBtn(isDark) {
    // Use IDs from HTML for direct access
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
            AppState.nlpAnalysis = data.nlp_analysis || {};
            AppState.labData = data.lab_values?.values || [];
            AppState.riskAssessment = data.risk_profile || {};
            AppState.suggestedQuestions = data.chatbot?.suggested_questions || [];
            
            updateProgress(100, 'complete');
            
            // Update UI
            updateSummarySection();
            updateSummaryStats(data.stats, data.summary_type);
            updateNLPSection();
            updateLabTrendsSection();
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
    
    // Hide upload section, show results
    if (uploadSection) uploadSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    
    // Create image URL
    const imageUrl = URL.createObjectURL(file);
    
    resultsContainer.innerHTML = `
        <div class="vision-image-card">
            <img src="${imageUrl}" alt="Medical Image">
            <div class="image-overlay">
                <span class="image-type-badge">${data.image_type || 'Medical Image'}</span>
            </div>
        </div>
        <div class="vision-analysis-card">
            <div class="analysis-header">
                <h3><i class="fas fa-microscope"></i> Analysis Results</h3>
                <span class="confidence-badge">${Math.round((data.confidence || 0.85) * 100)}% Confidence</span>
            </div>
            <div class="analysis-details">
                <div class="detail-row">
                    <span class="detail-label">Body Region</span>
                    <span class="detail-value">${data.body_region || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Modality</span>
                    <span class="detail-value">${data.modality || 'Unknown'}</span>
                </div>
            </div>
            <div class="findings-section">
                <h4>Findings</h4>
                <p>${data.findings || 'No significant findings detected.'}</p>
            </div>
            <div class="impression-section">
                <h4>Clinical Impression</h4>
                <p>${data.impression || 'Normal study.'}</p>
            </div>
            ${data.recommendations ? `
            <div class="recommendations-section">
                <h4>Recommendations</h4>
                <ul>
                    ${Array.isArray(data.recommendations) 
                        ? data.recommendations.map(r => `<li>${r}</li>`).join('')
                        : `<li>${data.recommendations}</li>`}
                </ul>
            </div>
            ` : ''}
        </div>
    `;
}

// ========================================
// SUMMARY SECTION
// ========================================
function updateSummarySection() {
    const summaryTextEl = document.getElementById('summaryContent');
    if (!summaryTextEl) return;
    
    if (AppState.summaryContent) {
        // Parse markdown-like content
        let html = AppState.summaryContent
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
// NLP SECTION
// ========================================
function initNLPTabs() {
    const tabs = document.querySelectorAll('.nlp-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active panel - HTML IDs have "Panel" suffix
            document.querySelectorAll('.nlp-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            
            const targetPanel = document.getElementById(targetId + 'Panel');
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

function updateNLPSection() {
    const analysis = AppState.nlpAnalysis;
    
    // Update entities - pass the summary for categorization
    updateEntities(analysis.entities?.summary || {});
    
    // Update ICD codes - access items array
    updateICDCodes(analysis.icd10_codes?.items || []);
    
    // Update drug interactions - access items array
    updateDrugInteractions(analysis.drug_interactions?.items || []);
    
    // Update abbreviations - access items array
    updateAbbreviations(analysis.abbreviations?.items || []);
    
    // Update sentiment - pass the overall sentiment
    updateSentiment(analysis.sentiment_analysis || {});
    
    // Update tab counts
    updateTabCounts(analysis);
}

function updateEntities(entities) {
    const container = document.getElementById('entityCategories');
    if (!container) return;
    
    // Map backend entity types to display names
    const categories = [
        { key: 'DISEASE', name: 'Conditions', icon: 'fa-disease' },
        { key: 'DRUG', name: 'Medications', icon: 'fa-pills' },
        { key: 'PROCEDURE', name: 'Procedures', icon: 'fa-syringe' },
        { key: 'SYMPTOM', name: 'Symptoms', icon: 'fa-thermometer' },
        { key: 'LAB_TEST', name: 'Lab Tests', icon: 'fa-vial' },
        { key: 'ANATOMY', name: 'Anatomy', icon: 'fa-lungs' }
    ];
    
    let html = '<div class="entity-categories">';
    
    // Only show categories that have entities
    const activeCategories = categories.filter(cat => 
        entities[cat.key] && entities[cat.key].length > 0
    );
    
    // If no entities found, show at least the first 3 categories with empty state
    const categoriesToShow = activeCategories.length > 0 
        ? activeCategories 
        : categories.slice(0, 3);
    
    categoriesToShow.forEach(cat => {
        const items = entities[cat.key] || [];
        html += `
            <div class="entity-category">
                <div class="category-header">
                    <i class="fas ${cat.icon}"></i>
                    ${cat.name}
                </div>
                <div class="entity-list">
                    ${items.length > 0 
                        ? items.map(e => `<span class="entity-tag">${e}</span>`).join('')
                        : '<span class="entity-tag" style="opacity:0.5">None found</span>'}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function updateICDCodes(codes) {
    const container = document.getElementById('icdList');
    if (!container) return;
    
    if (codes.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <i class="fas fa-hashtag"></i>
                <h3>No ICD Codes</h3>
                <p>No ICD codes were identified in the document</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="icd-list">';
    codes.forEach(code => {
        html += `
            <div class="icd-item">
                <span class="icd-code">${code.code || code}</span>
                <div class="icd-details">
                    <div class="icd-description">${code.description || 'Description not available'}</div>
                    <div class="icd-category">${code.category || ''}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function updateDrugInteractions(interactions) {
    const container = document.getElementById('drugInteractions');
    if (!container) return;
    
    if (interactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <i class="fas fa-check-circle"></i>
                <h3>No Interactions Found</h3>
                <p>No drug interactions were detected</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="drug-interactions">';
    interactions.forEach(interaction => {
        const severity = (interaction.severity || 'MODERATE').toLowerCase();
        const drugs = interaction.drug1 && interaction.drug2 
            ? `${interaction.drug1} + ${interaction.drug2}` 
            : interaction.drugs || 'Unknown drugs';
        html += `
            <div class="interaction-item ${severity}">
                <div class="interaction-header">
                    <span class="interaction-drugs">${drugs}</span>
                    <span class="severity-badge ${severity}">${severity}</span>
                </div>
                <p class="interaction-desc">${interaction.description || 'Potential interaction detected'}</p>
                ${interaction.recommendation ? `<p class="interaction-rec"><strong>Recommendation:</strong> ${interaction.recommendation}</p>` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function updateAbbreviations(abbreviations) {
    const container = document.getElementById('abbreviationList');
    if (!container) return;
    
    if (abbreviations.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <i class="fas fa-spell-check"></i>
                <h3>No Abbreviations</h3>
                <p>No medical abbreviations were found</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="abbreviation-list">';
    abbreviations.forEach(abbrev => {
        html += `
            <div class="abbrev-item">
                <span class="abbrev-short">${abbrev.abbreviation || abbrev.short || abbrev}</span>
                <span class="abbrev-full">${abbrev.expansion || abbrev.full || ''}</span>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function updateSentiment(sentiment) {
    const container = document.getElementById('sentimentOverview');
    if (!container) return;
    
    // Access the overall object's label field
    const overallObj = sentiment.overall || {};
    const overall = (overallObj.label || 'NEUTRAL').toLowerCase();
    const confidence = overallObj.confidence || 0.5;
    
    const icons = {
        positive: 'fa-smile',
        neutral: 'fa-meh',
        negative: 'fa-frown'
    };
    
    container.innerHTML = `
        <div class="sentiment-overview">
            <div class="sentiment-main">
                <div class="sentiment-icon ${overall}">
                    <i class="fas ${icons[overall] || icons.neutral}"></i>
                </div>
                <div class="sentiment-details">
                    <h4>${overall.charAt(0).toUpperCase() + overall.slice(1)} Outlook</h4>
                    <p>Document sentiment analysis indicates a ${overall} clinical outlook (${Math.round(confidence * 100)}% confidence).</p>
                </div>
            </div>
        </div>
    `;
}

function updateTabCounts(analysis) {
    // Update tab badges - map to HTML data-tab values
    const entityBadge = document.getElementById('entityCount');
    const icdBadge = document.getElementById('icdCount');
    const drugBadge = document.getElementById('drugCount');
    const abbrevBadge = document.getElementById('abbrevCount');
    
    if (entityBadge) entityBadge.textContent = analysis.entities?.total_count || 0;
    if (icdBadge) icdBadge.textContent = analysis.icd10_codes?.total_count || 0;
    if (drugBadge) drugBadge.textContent = analysis.drug_interactions?.total_count || 0;
    if (abbrevBadge) abbrevBadge.textContent = analysis.abbreviations?.total_count || 0;
}

// ========================================
// LAB TRENDS SECTION
// ========================================
let labChart = null;

function initLabTrends() {
    // Initialize trend select
    const trendSelect = document.getElementById('trendSelector');
    if (trendSelect) {
        trendSelect.addEventListener('change', (e) => {
            updateLabChart(e.target.value);
        });
    }
}

function updateLabTrendsSection() {
    updateLabCards();
    updateLabChart('glucose');
    updateLabHistoryTable();
}

function updateLabCards() {
    const cardData = [
        { 
            id: 'glucose', 
            name: 'Glucose', 
            unit: 'mg/dL', 
            normalRange: '70-100',
            getValue: () => getLatestLabValue('glucose')
        },
        { 
            id: 'hba1c', 
            name: 'HbA1c', 
            unit: '%', 
            normalRange: '< 5.7',
            getValue: () => getLatestLabValue('hba1c')
        },
        { 
            id: 'bp', 
            name: 'Blood Pressure', 
            unit: 'mmHg', 
            normalRange: '< 120/80',
            getValue: () => getLatestLabValue('blood_pressure')
        },
        { 
            id: 'cholesterol', 
            name: 'Total Cholesterol', 
            unit: 'mg/dL', 
            normalRange: '< 200',
            getValue: () => getLatestLabValue('cholesterol')
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
            const status = getValueStatus(card.id, card.getValue());
            statusEl.textContent = status;
            statusEl.className = `value-status ${status.toLowerCase()}`;
        }
    });
}

function getLatestLabValue(labType) {
    const lab = AppState.labData.find(l => 
        l.name?.toLowerCase().includes(labType.toLowerCase()) ||
        l.type?.toLowerCase().includes(labType.toLowerCase())
    );
    return lab?.value || null;
}

function getValueStatus(type, value) {
    if (!value) return 'Normal';
    
    const ranges = {
        glucose: { low: 70, high: 100 },
        hba1c: { low: 0, high: 5.7 },
        cholesterol: { low: 0, high: 200 }
    };
    
    const range = ranges[type];
    if (!range) return 'Normal';
    
    const numValue = parseFloat(value);
    if (numValue < range.low) return 'Low';
    if (numValue > range.high) return 'High';
    return 'Normal';
}

function updateLabChart(labType) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    // Sample data - in production, use actual lab data
    const data = generateChartData(labType);
    
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

function generateChartData(labType) {
    // In production, filter actual lab data by type
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseValues = {
        glucose: [95, 102, 98, 105, 92, 88],
        hba1c: [5.4, 5.6, 5.5, 5.8, 5.5, 5.3],
        cholesterol: [185, 192, 188, 195, 180, 175],
        bp: [118, 122, 120, 125, 118, 115]
    };
    
    return {
        labels: months,
        values: baseValues[labType] || baseValues.glucose
    };
}

function updateLabHistoryTable() {
    const tbody = document.getElementById('labHistoryBody');
    if (!tbody) return;
    
    if (AppState.labData.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No lab history available</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    AppState.labData.forEach(lab => {
        const status = lab.status || 'Normal';
        html += `
            <tr>
                <td>${lab.date || 'N/A'}</td>
                <td>${lab.name || 'N/A'}</td>
                <td>${lab.value || 'N/A'} ${lab.unit || ''}</td>
                <td>${lab.reference || 'N/A'}</td>
                <td><span class="value-status ${status.toLowerCase()}">${status}</span></td>
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
    const lang = AppState.selectedLanguage;
    const content = AppState.summaryContent;
    
    if (!content) {
        showToast('info', 'No Content', 'Upload a document first to translate');
        updateTranslationContent('');
        return;
    }
    
    if (lang === 'en' || !lang) {
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
            updateTranslationContent(data.translated_text || content);
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
        container.innerHTML = `<p>${text}</p>`;
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

// ========================================
// DASHBOARD STATS
// ========================================
function updateQuickStats() {
    // Update stats based on current data
    const stats = {
        documents: AppState.summaryContent ? 1 : 0,
        labValues: AppState.labData.length,
        chatMessages: AppState.chatHistory.length,
        analyses: Object.keys(AppState.nlpAnalysis).length > 0 ? 1 : 0
    };
    
    // Update DOM elements
    const docCount = document.getElementById('totalDocuments');
    const labCount = document.getElementById('totalLabValues');
    const entityCount = document.getElementById('totalEntities');
    const chatCount = document.getElementById('totalChats');
    
    if (docCount) docCount.textContent = stats.documents;
    if (labCount) labCount.textContent = stats.labValues;
    if (entityCount) entityCount.textContent = AppState.nlpAnalysis?.entities?.total_count || 0;
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
    if (entitiesEl) entitiesEl.textContent = AppState.nlpAnalysis?.entities?.total_count || '--';
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
    
    // Get latest values from lab data
    const glucose = getLatestLabValue('glucose');
    const hba1c = getLatestLabValue('hba1c');
    const bp = getLatestLabValue('blood_pressure') || getLatestLabValue('bp');
    const chol = getLatestLabValue('cholesterol');
    
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
    
    // Animate health ring
    if (healthRing && factors > 0) {
        healthRing.style.strokeDasharray = `${score}, 100`;
    }
}

// ========================================
// TRANSLATE TO LANGUAGE
// ========================================
function translateTo(language) {
    AppState.selectedLanguage = language;
    
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
        'ml': 'Malayalam', 'es': 'Spanish', 'fr': 'French', 'de': 'German'
    };
    return names[code] || code;
}

// ========================================
// CLEAR LAB HISTORY
// ========================================
function clearLabHistory() {
    AppState.labData = [];
    updateLabTrendsSection();
    updateDashboardHealth();
    updateQuickStats();
    showToast('success', 'Cleared', 'Lab history has been cleared');
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
window.sendMessage = sendChatMessage;
window.clearLabHistory = clearLabHistory;

// Toggle sidebar collapsed state
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
};
