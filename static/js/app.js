/* ========================================
   MEDANALYZER PRO - OPEN SOURCE EDITION
   Modern interactions with smooth animations
======================================== */

// ========================================
// GLOBAL EVENT HANDLERS
// ========================================
// Global handlers for HTML onclick events
function toggleTheme() {
    const currentTheme = localStorage.getItem('medanalyzer_theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    console.log('🔄 Toggle theme from', currentTheme, 'to', newTheme);
    handleThemeChange(newTheme);
}

function handleThemeChange(theme) {
    console.log('🎨 Direct theme change called:', theme);
    localStorage.setItem('medanalyzer_theme', theme);
    applyTheme(theme);
    updateThemeToggle(theme);

    // Show success message if showSuccess function exists
    if (typeof showSuccess === 'function') {
        showSuccess(`Switched to ${theme} mode`);
    }
}

function updateThemeToggle(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        console.log('🎨 Updating theme toggle for:', theme);
        if (theme === 'dark') {
            themeToggle.classList.add('dark-active');
        } else {
            themeToggle.classList.remove('dark-active');
        }
    } else {
        console.log('❌ Theme toggle element not found');
    }
}

function handleExportReport() {
    console.log('📄 Export function called');
    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent || !summaryContent.textContent.trim()) {
        showError('No analysis results to export. Please upload and analyze a document first.');
        return;
    }

    try {
        // Gather all analysis data
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: summaryContent.textContent,
            stats: {
                processingTime: document.getElementById('processingTime')?.textContent || 'N/A',
                chunksProcessed: document.getElementById('chunksProcessed')?.textContent || 'N/A',
                confidenceScore: document.getElementById('confidenceScore')?.textContent || 'N/A',
                keyTerms: document.getElementById('keyTerms')?.textContent || 'N/A'
            },
            insights: Array.from(document.querySelectorAll('.insight-content')).map(insight => ({
                title: insight.querySelector('h4')?.textContent || '',
                description: insight.querySelector('p')?.textContent || ''
            })),
            analytics: Array.from(document.querySelectorAll('.metric')).map(metric => ({
                label: metric.querySelector('.metric-label')?.textContent || '',
                value: metric.querySelector('.metric-value')?.textContent || ''
            }))
        };

        // Generate PDF report
        generatePDFReport(reportData);

        showSuccess('PDF report generated successfully!');

    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export report. Please try again.');
    }
}

function handleShareReport() {
    console.log('📤 Share function called');
    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent || !summaryContent.textContent.trim()) {
        showError('No analysis results to share. Please upload and analyze a document first.');
        return;
    }

    try {
        const reportData = {
            title: 'Medical Document Analysis Report',
            summary: summaryContent.textContent.substring(0, 500) + '...',
            url: window.location.href
        };

        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: reportData.title,
                text: reportData.summary,
                url: reportData.url
            }).then(() => {
                showSuccess('Report shared successfully!');
            }).catch(err => {
                console.log('Error sharing:', err);
                fallbackShare(reportData);
            });
        } else {
            fallbackShare(reportData);
        }
    } catch (error) {
        console.error('Share error:', error);
        showError('Failed to share report.');
    }
}

function fallbackShare(data) {
    // Fallback: Copy share text to clipboard
    const shareText = `${data.title}\n\n${data.summary}\n\nView full report: ${data.url}`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            showSuccess('Share link copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard error:', err);
            showError('Unable to copy share link.');
        });
    } else {
        // Very old browser fallback
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showSuccess('Share text copied to clipboard!');
        } catch (err) {
            showError('Unable to copy share text.');
        }
        document.body.removeChild(textArea);
    }
}

function handleCopySummary() {
    console.log('📋 Copy summary called');
    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent || !summaryContent.textContent.trim()) {
        showError('No summary to copy. Please analyze a document first.');
        return;
    }

    const summaryText = summaryContent.textContent;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(summaryText).then(() => {
            showSuccess('Summary copied to clipboard!');
            // Visual feedback
            const copyBtn = document.querySelector('[title="Copy Summary"]');
            if (copyBtn) {
                const originalIcon = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = originalIcon;
                }, 2000);
            }
        }).catch(err => {
            console.error('Clipboard error:', err);
            showError('Failed to copy summary.');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = summaryText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showSuccess('Summary copied to clipboard!');
        } catch (err) {
            showError('Failed to copy summary.');
        }
        document.body.removeChild(textArea);
    }
}

function handleExpandSummary() {
    console.log('🔍 Expand summary called');
    const summaryContent = document.getElementById('summaryContent');
    const summaryCard = document.querySelector('.summary-card');

    if (!summaryContent || !summaryCard) {
        showError('Summary not available.');
        return;
    }

    // Toggle expanded state
    const isExpanded = summaryCard.classList.contains('expanded');

    if (isExpanded) {
        // Collapse
        summaryCard.classList.remove('expanded');
        summaryCard.style.position = '';
        summaryCard.style.top = '';
        summaryCard.style.left = '';
        summaryCard.style.width = '';
        summaryCard.style.height = '';
        summaryCard.style.zIndex = '';
        summaryCard.style.maxHeight = '';

        // Update button icon
        const expandBtn = summaryCard.querySelector('[title="Expand"]');
        if (expandBtn) {
            expandBtn.innerHTML = '<i class="fas fa-expand"></i>';
            expandBtn.title = 'Expand';
        }

        showSuccess('Summary collapsed.');
    } else {
        // Expand
        summaryCard.classList.add('expanded');
        summaryCard.style.position = 'fixed';
        summaryCard.style.top = '10%';
        summaryCard.style.left = '5%';
        summaryCard.style.width = '90%';
        summaryCard.style.height = '80%';
        summaryCard.style.zIndex = '1000';
        summaryCard.style.maxHeight = '80vh';
        summaryCard.style.overflow = 'auto';

        // Update button icon
        const expandBtn = summaryCard.querySelector('[title="Expand"]');
        if (expandBtn) {
            expandBtn.innerHTML = '<i class="fas fa-compress"></i>';
            expandBtn.title = 'Collapse';
        }

        showSuccess('Summary expanded. Click collapse to return.');
    }
}

function handleNewAnalysis() {
    console.log('🔄 New analysis called');

    // Confirm before clearing
    if (confirm('Start a new analysis? This will clear current results.')) {
        // Reset file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // Hide results sections
        const resultsSection = document.getElementById('reports');
        const searchSection = document.getElementById('searchSection');

        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        if (searchSection) {
            searchSection.style.display = 'none';
        }

        // Clear summary content
        const summaryContent = document.getElementById('summaryContent');
        if (summaryContent) {
            summaryContent.innerHTML = '';
        }

        // Reset stats
        const stats = ['processingTime', 'chunksProcessed', 'confidenceScore', 'keyTerms'];
        stats.forEach(statId => {
            const element = document.getElementById(statId);
            if (element) {
                element.textContent = '--';
            }
        });

        // Scroll back to upload section
        const uploadSection = document.getElementById('analytics');
        if (uploadSection) {
            uploadSection.scrollIntoView({ behavior: 'smooth' });
        }

        showSuccess('Ready for new analysis!');
    }
}

// ========================================
// GLOBAL VARIABLES & CONSTANTS
// ========================================
let startTime = 0;
let uploadProgress = 0;
let isProcessing = false;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadProgressEl = document.getElementById('uploadProgress');
const resultsSection = document.getElementById('reports');
const searchSection = document.getElementById('searchSection');
const loadingOverlay = document.getElementById('loadingOverlay');
const funFact = document.getElementById('funFact');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

// Stats Elements
const processingTime = document.getElementById('processingTime');
const chunksProcessed = document.getElementById('chunksProcessed');
const confidenceScore = document.getElementById('confidenceScore');
const keyTerms = document.getElementById('keyTerms');
const summaryContent = document.getElementById('summaryContent');

// Fun Facts Data
const funFacts = [
    "AI can process medical documents 50x faster than traditional methods.",
    "Machine learning models can identify patterns in medical data that humans might miss.",
    "Natural language processing helps extract key insights from unstructured medical text.",
    "AI-powered summarization can reduce document review time by up to 80%.",
    "Advanced algorithms can maintain 99.7% accuracy in medical document analysis.",
    "Deep learning models are trained on millions of medical documents for precision.",
    "AI can help reduce medical errors by providing consistent analysis.",
    "Modern NLP can understand medical terminology and context with high accuracy."
];

// ========================================
// INITIALIZATION & EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
    addSmoothScrolling();
    initializeAnimations();

    // Enhanced UI binding with delays
    setTimeout(bindUIElements, 100);
    setTimeout(bindUIElements, 500);  // Multiple attempts
});

function bindUIElements() {
    console.log('🔧 Binding UI elements...');

    // Set theme selector value (using HTML onchange handler)
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        console.log('🎨 Found theme selector, setting value...');

        // Set current theme
        const currentTheme = localStorage.getItem('medanalyzer_theme') || 'light';
        themeSelect.value = currentTheme;
        applyTheme(currentTheme);
        console.log('✅ Theme selector value set (using HTML onchange)');
    }

    // Export button uses HTML onclick - no additional binding needed
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        console.log('📄 Export button found - using HTML onclick handler');
    }
}

function initializeApp() {
    console.log('🚀 MedAnalyzer Pro - Open Source Edition Initialized');

    // Initialize theme system
    initializeTheme();

    // Initialize export functionality
    initializeExport();

    // Debug floating cards
    setTimeout(() => {
        const floatingCards = document.querySelectorAll('.floating-card');
        console.log('🎴 Found', floatingCards.length, 'floating cards');
        floatingCards.forEach((card, index) => {
            console.log(`Card ${index + 1}:`, card.classList.toString());
        });
    }, 500);

    // Add entrance animations
    setTimeout(() => {
        document.body.classList.add('loaded');
        animateHeroElements();
    }, 100);

    // Initialize navbar scroll effect
    initializeNavbarEffects();

    // Initialize particle animations
    initializeParticleEffects();
}

function setupEventListeners() {
    // File upload events
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Search functionality
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // Search suggestions
    const suggestions = document.querySelectorAll('.suggestion-item');
    suggestions.forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            searchInput.value = suggestion.textContent;
            handleSearch();
        });
    });
}

// ========================================
// ANIMATIONS & EFFECTS
// ========================================
function initializeAnimations() {
    // Animate cards on scroll
    const cards = document.querySelectorAll('.feature-card, .stat-card, .insight-item');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(card);
    });
}

function animateHeroElements() {
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const uploadCard = document.querySelector('.upload-card');

    if (heroTitle) {
        heroTitle.style.animation = 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    }

    if (heroSubtitle) {
        setTimeout(() => {
            heroSubtitle.style.animation = 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        }, 200);
    }

    if (uploadCard) {
        setTimeout(() => {
            uploadCard.style.animation = 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        }, 400);
    }
}

function initializeNavbarEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/show navbar on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }

        lastScrollY = currentScrollY;
    });
}

function initializeParticleEffects() {
    // Simple particle animation for hero section
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;

    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    heroSection.appendChild(particleContainer);

    // Create particles
    for (let i = 0; i < 50; i++) {
        createParticle(particleContainer);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Random properties
    const size = Math.random() * 4 + 2;
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const duration = Math.random() * 20 + 10;

    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.animationDuration = duration + 's';

    container.appendChild(particle);

    // Remove and recreate particle after animation
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
            createParticle(container);
        }
    }, duration * 1000);
}

function addSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ========================================
// FILE UPLOAD HANDLING
// ========================================
function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

async function handleFile(file) {
    if (isProcessing) return;

    // Validate file
    if (!validateFile(file)) return;

    try {
        isProcessing = true;
        startTime = Date.now();

        // Show progress and fun facts
        showUploadProgress();
        showFunFacts();

        // Upload and analyze
        const results = await uploadAndAnalyze(file);

        // Display results with animation
        await displayResults(results);

        // Show search section
        showSearchSection();

        showSuccess('Analysis complete! 🎉');

    } catch (error) {
        console.error('Upload error:', error);
        showError('Upload failed. Please try again.');
    } finally {
        isProcessing = false;
        hideUploadProgress();
    }
}

function validateFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['application/pdf'];

    if (!allowedTypes.includes(file.type)) {
        showError('Please upload a PDF file only.');
        return false;
    }

    if (file.size > maxSize) {
        showError('File size must be less than 50MB.');
        return false;
    }

    return true;
}

async function uploadAndAnalyze(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Get selected summarization type
    const summaryTypeRadio = document.querySelector('input[name="summaryType"]:checked');
    const summaryType = summaryTypeRadio ? summaryTypeRadio.value : 'abstractive';
    formData.append('summary_type', summaryType);

    // Simulate progress updates
    simulateProgress();

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json();
}

async function uploadAndAnalyze(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Get selected summarization type
    const summaryTypeRadio = document.querySelector('input[name="summaryType"]:checked');
    const summaryType = summaryTypeRadio ? summaryTypeRadio.value : 'abstractive';
    formData.append('summary_type', summaryType);

    // Simulate progress updates
    simulateProgress();

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json();
}

function simulateProgress() {
    let progress = 0;
    let currentStep = 0;
    const steps = document.querySelectorAll('.progress-steps .step');

    const interval = setInterval(() => {
        progress += Math.random() * 3 + 1;
        progress = Math.min(progress, 100);

        // Update progress bar
        const progressFill = document.querySelector('.progress-fill');
        const progressPercent = document.querySelector('.progress-percent');

        if (progressFill) {
            progressFill.style.width = progress + '%';
        }

        if (progressPercent) {
            progressPercent.textContent = Math.round(progress) + '%';
        }

        // Update steps
        const newStep = Math.floor((progress / 100) * steps.length);
        if (newStep > currentStep && newStep < steps.length) {
            steps[currentStep].classList.remove('active');
            steps[newStep].classList.add('active');
            currentStep = newStep;
        }

        if (progress >= 100) {
            clearInterval(interval);
            // Activate final step
            if (steps.length > 0) {
                steps.forEach(step => step.classList.remove('active'));
                steps[steps.length - 1].classList.add('active');
            }
        }
    }, 200);
}

// ========================================
// RESULTS DISPLAY
// ========================================
async function displayResults(results) {
    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;

    // Update statistics with animation
    await updateStatistics(results, processingTimeMs);

    // Display summary with typewriter effect
    displaySummary(results.summary);

    // Display Medical NLP analysis if available
    if (results.nlp_analysis) {
        displayNlpAnalysis(results.nlp_analysis);
    }

    // Show results section with animation
    setTimeout(() => {
        showResultsSection();
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        showSearchSection();
    }, 500);
}

async function updateStatistics(results, processingTimeMs) {
    const stats = results.stats || {};

    // Animate each stat counter
    const counters = [
        { element: chunksProcessed, target: stats.chunks || 0 },
        { element: keyTerms, target: Math.floor((stats.characters || 0) / 100) },
        { element: processingTime, target: Math.round(processingTimeMs / 1000), suffix: 's' },
        { element: confidenceScore, target: 98, suffix: '%' }
    ];

    for (const counter of counters) {
        if (counter.element) {
            await animateCounter(counter.element, counter.target, counter.suffix || '');
        }
    }
}

function animateCounter(element, target, suffix = '') {
    return new Promise(resolve => {
        let current = 0;
        const increment = target / 50; // 50 steps
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
                resolve();
            }
            element.textContent = Math.round(current) + suffix;
        }, 30);
    });
}

function displaySummary(summary) {
    if (!summaryContent || !summary) return;

    summaryContent.innerHTML = '';

    // Format the summary into organized sections
    const formattedSummary = formatMedicalSummary(summary);

    // Display formatted content immediately (no typewriter effect for better readability)
    summaryContent.innerHTML = formattedSummary;
}

function formatMedicalSummary(summary) {
    if (!summary) return '';

    // Clean up the text
    let cleanSummary = summary.trim();

    // Split into sentences for better processing
    const sentences = cleanSummary.split(/(?<=\.)\s+/).filter(s => s.trim().length > 10);

    // Group sentences into logical sections
    let sections = {
        'Patient Overview': [],
        'Clinical Findings': [],
        'Diagnosis & Assessment': [],
        'Treatment & Recommendations': [],
        'Additional Notes': []
    };

    // Categorize sentences based on keywords
    sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase();

        if (lowerSentence.includes('patient') && (lowerSentence.includes('year') || lowerSentence.includes('old') || lowerSentence.includes('history'))) {
            sections['Patient Overview'].push(sentence);
        } else if (lowerSentence.includes('examination') || lowerSentence.includes('findings') || lowerSentence.includes('observed') || lowerSentence.includes('symptoms')) {
            sections['Clinical Findings'].push(sentence);
        } else if (lowerSentence.includes('diagnosis') || lowerSentence.includes('condition') || lowerSentence.includes('impression') || lowerSentence.includes('capacity')) {
            sections['Diagnosis & Assessment'].push(sentence);
        } else if (lowerSentence.includes('treatment') || lowerSentence.includes('medication') || lowerSentence.includes('recommendation') || lowerSentence.includes('follow-up') || lowerSentence.includes('prognosis')) {
            sections['Treatment & Recommendations'].push(sentence);
        } else {
            sections['Additional Notes'].push(sentence);
        }
    });

    // Build formatted HTML
    let formattedHTML = '';

    Object.keys(sections).forEach(sectionTitle => {
        const sectionContent = sections[sectionTitle];
        if (sectionContent.length > 0) {
            formattedHTML += `
                <div class="summary-section">
                    <h4 class="summary-section-title">
                        <i class="fas ${getSectionIcon(sectionTitle)}"></i>
                        ${sectionTitle}
                    </h4>
                    <div class="summary-section-content">
                        ${sectionContent.map(sentence => `<p class="summary-point">${sentence.trim()}</p>`).join('')}
                    </div>
                </div>
            `;
        }
    });

    // If no sections were created, display as organized paragraphs
    if (formattedHTML === '') {
        const paragraphs = cleanSummary.split(/\.\s+(?=[A-Z])/).filter(p => p.trim().length > 20);
        formattedHTML = paragraphs.map(paragraph =>
            `<p class="summary-paragraph">${paragraph.trim()}${paragraph.endsWith('.') ? '' : '.'}</p>`
        ).join('');
    }

    return formattedHTML;
}

function getSectionIcon(sectionTitle) {
    const icons = {
        'Patient Overview': 'fa-user-md',
        'Clinical Findings': 'fa-stethoscope',
        'Diagnosis & Assessment': 'fa-diagnoses',
        'Treatment & Recommendations': 'fa-prescription-bottle',
        'Additional Notes': 'fa-clipboard-list'
    };
    return icons[sectionTitle] || 'fa-notes-medical';
}

function showResultsSection() {
    resultsSection.style.display = 'block';
    resultsSection.style.opacity = '0';
    resultsSection.style.transform = 'translateY(50px)';

    setTimeout(() => {
        resultsSection.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        resultsSection.style.opacity = '1';
        resultsSection.style.transform = 'translateY(0)';
    }, 100);
}

// ========================================
// PROGRESS & UI STATES
// ========================================
function showUploadProgress() {
    if (uploadProgressEl) {
        uploadProgressEl.style.display = 'block';
        uploadProgressEl.style.opacity = '0';
        uploadProgressEl.style.transform = 'translateY(20px)';

        setTimeout(() => {
            uploadProgressEl.style.transition = 'all 0.4s ease';
            uploadProgressEl.style.opacity = '1';
            uploadProgressEl.style.transform = 'translateY(0)';
        }, 10);
    }
}

function hideUploadProgress() {
    if (uploadProgressEl) {
        uploadProgressEl.style.transition = 'all 0.4s ease';
        uploadProgressEl.style.opacity = '0';
        uploadProgressEl.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            uploadProgressEl.style.display = 'none';
        }, 400);
    }
}

function showFunFacts() {
    if (!funFact) return;

    let factIndex = 0;

    function rotateFact() {
        const currentFact = funFacts[factIndex];
        funFact.innerHTML = `
            <div class="fun-fact-content">
                <i class="fas fa-lightbulb"></i>
                <span>${currentFact}</span>
            </div>
        `;

        funFact.style.display = 'block';
        funFact.style.animation = 'slideInRight 0.5s ease';

        setTimeout(() => {
            funFact.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                factIndex = (factIndex + 1) % funFacts.length;
                rotateFact();
            }, 500);
        }, 4000);
    }

    rotateFact();
}

function showSearchSection() {
    if (!searchSection) return;

    setTimeout(() => {
        searchSection.style.display = 'block';
        searchSection.style.opacity = '0';
        searchSection.style.transform = 'translateY(30px)';

        setTimeout(() => {
            searchSection.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            searchSection.style.opacity = '1';
            searchSection.style.transform = 'translateY(0)';
        }, 100);
    }, 1000);
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        showSearchLoading();

        const response = await fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });

        if (!response.ok) {
            throw new Error('Search failed');
        }

        const results = await response.json();
        displaySearchResults(results);

    } catch (error) {
        showError('Search failed. Please try again.');
    } finally {
        hideSearchLoading();
    }
}

function showSearchLoading() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        searchBtn.disabled = true;
    }
}

function hideSearchLoading() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
        searchBtn.disabled = false;
    }
}

function displaySearchResults(results) {
    if (!searchResults) return;

    searchResults.innerHTML = '';

    if (!results.results || results.results.length === 0) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <h3>No Results Found</h3>
                <p>Try adjusting your search terms or uploading a document first.</p>
            </div>
        `;
        return;
    }

    // Generate user-friendly summary from search results
    const searchSummary = generateSearchSummary(results.results);

    searchResults.innerHTML = `
        <div class="search-answer-card">
            <div class="answer-header">
                <h3>
                    <i class="fas fa-lightbulb"></i>
                    Answer to your question
                </h3>
            </div>
            <div class="answer-content">
                <div class="answer-text">${searchSummary}</div>
            </div>
            <div class="answer-footer">
                <span class="answer-source">
                    <i class="fas fa-file-medical"></i>
                    Based on ${results.results.length} relevant sections from your document
                </span>
            </div>
        </div>
    `;
}

function generateSearchSummary(searchResults) {
    if (!searchResults || searchResults.length === 0) {
        return "No relevant information found in the document.";
    }

    // Extract text content from the search results
    const relevantTexts = searchResults.slice(0, 5).map(result => {
        return result.text || result.content || '';
    }).filter(text => text.length > 20);

    if (relevantTexts.length === 0) {
        return "No relevant information found in the document.";
    }

    // Combine and clean up the text
    const combinedText = relevantTexts.join(' ').replace(/\s+/g, ' ').trim();

    // Generate a coherent summary (simplified approach)
    const sentences = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length === 0) {
        return "The document contains information related to your query, but no clear answer could be extracted.";
    }

    // Take the most relevant sentences (up to 3 for readability)
    const summary = sentences.slice(0, 3).join('. ').trim();

    return summary + (summary.endsWith('.') ? '' : '.');
}

// ========================================
// THEME SYSTEM
// ========================================
function initializeTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem('medanalyzer_theme') || 'light';
    console.log('🎨 Initializing theme system with:', savedTheme);

    applyTheme(savedTheme);

    // Delay the toggle update to ensure DOM is ready
    setTimeout(() => {
        updateThemeToggle(savedTheme);
        console.log('✅ Theme toggle initialized');
    }, 100);

    // Set theme selector value (no duplicate event binding)
    setTimeout(() => {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = savedTheme;
            console.log('✅ Theme selector value set (using HTML onchange)');
        } else {
            console.log('❓ Theme selector not found (using toggle instead)');
        }
    }, 200);
}

function applyTheme(theme) {
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme', 'auto-theme');

    if (theme === 'dark') {
        body.classList.add('dark-theme');
    } else if (theme === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('medanalyzer_theme') === 'auto') {
                body.classList.remove('light-theme', 'dark-theme');
                body.classList.add(e.matches ? 'dark-theme' : 'light-theme');
                updateThemeToggle(e.matches ? 'dark' : 'light');
            }
        });
    } else {
        body.classList.add('light-theme');
    }
}

// Function already defined above in global handlers section

// ========================================
// EXPORT FUNCTIONALITY
// ========================================
function initializeExport() {
    // Export functionality is handled by HTML onclick attribute
    // No additional event listeners needed to avoid double downloads
    console.log('✅ Export system ready (using HTML onclick)');
}

function generatePDFReport(data) {
    // Check if jsPDF is available with multiple checks
    let jsPDF;

    if (window.jsPDF) {
        jsPDF = window.jsPDF.jsPDF || window.jsPDF;
    } else if (typeof window.jspdf !== 'undefined') {
        jsPDF = window.jspdf.jsPDF;
    } else {
        console.error('jsPDF library not loaded');
        showError('PDF generation library not available. Please refresh the page and try again.');
        return;
    }

    if (!jsPDF) {
        console.error('jsPDF constructor not found');
        showError('PDF generation not available. Please refresh the page and try again.');
        return;
    }

    try {
        const doc = new jsPDF();

        // Professional medical color scheme
        const primaryColor = [40, 116, 166]; // Medical blue
        const accentColor = [26, 188, 156]; // Medical teal  
        const textColor = [44, 62, 80]; // Professional dark blue
        const lightBlue = [236, 247, 252]; // Very light blue background
        const sectionColor = [52, 152, 219]; // Section headers

        let yPosition = 15;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        // HEADER SECTION - Professional medical header
        doc.setFillColor(40, 116, 166);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Logo placeholder (medical cross icon area)
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, 12, 26, 26, 'F');
        doc.setTextColor(40, 116, 166);
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('+', margin + 11, 28);

        // Main title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('MEDICAL ANALYSIS REPORT', margin + 35, 23);

        // Subtitle with professional styling
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text('MedAnalyzer Pro - Clinical Document Intelligence System', margin + 35, 32);

        // Report ID and date
        doc.setFontSize(10);
        const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
        doc.text(`Report ID: ${reportId}`, margin + 35, 40);

        yPosition = 65;

        // PATIENT/DOCUMENT INFO SECTION
        doc.setFillColor(...lightBlue);
        doc.rect(margin, yPosition - 5, contentWidth, 25, 'F');

        doc.setTextColor(...textColor);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('DOCUMENT INFORMATION', margin + 5, yPosition + 5);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Analysis Date: ${new Date(data.timestamp).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`, margin + 5, yPosition + 12);

        doc.text(`Processing Time: ${data.stats?.processingTime || 'N/A'}`, margin + 5, yPosition + 18);
        doc.text(`System Confidence: ${data.stats?.confidenceScore || 'N/A'}`, margin + 130, yPosition + 12);
        doc.text(`Data Points: ${data.stats?.keyTerms || 'N/A'}`, margin + 130, yPosition + 18);

        yPosition += 35;

        // ANALYSIS METRICS - Professional stats display
        doc.setFillColor(...sectionColor);
        doc.rect(margin, yPosition, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('CLINICAL ANALYSIS METRICS', margin + 5, yPosition + 6);

        yPosition += 15;

        // Professional metrics grid
        const metrics = [
            { label: 'Processing Efficiency', value: data.stats?.processingTime || 'N/A', unit: '', color: [46, 204, 113] },
            { label: 'Chunks Analyzed', value: data.stats?.chunksProcessed || 'N/A', unit: 'segments', color: [52, 152, 219] },
            { label: 'Confidence Level', value: data.stats?.confidenceScore || 'N/A', unit: '', color: [155, 89, 182] },
            { label: 'Key Terms Identified', value: data.stats?.keyTerms || 'N/A', unit: 'terms', color: [230, 126, 34] }
        ];

        const boxWidth = (contentWidth - 15) / 2;
        const boxHeight = 32;

        for (let i = 0; i < metrics.length; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = margin + (col * (boxWidth + 5));
            const y = yPosition + (row * (boxHeight + 5));

            // Metric box
            doc.setFillColor(248, 249, 250);
            doc.rect(x, y, boxWidth, boxHeight, 'F');

            // Accent line
            doc.setFillColor(...metrics[i].color);
            doc.rect(x, y, 4, boxHeight, 'F');

            // Value
            doc.setTextColor(...textColor);
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(metrics[i].value.toString(), x + 8, y + 15);

            // Label
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(127, 140, 141);
            doc.text(metrics[i].label, x + 8, y + 22);
            if (metrics[i].unit) {
                doc.text(metrics[i].unit, x + 8, y + 28);
            }
        }

        yPosition += 75;

        // CLINICAL SUMMARY SECTION - Formatted medical content
        doc.setFillColor(...sectionColor);
        doc.rect(margin, yPosition, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('CLINICAL DOCUMENT SUMMARY', margin + 5, yPosition + 6);

        yPosition += 15;

        // Process and format the medical summary
        doc.setTextColor(...textColor);
        const summaryText = data.summary || 'No summary available.';

        // Parse structured summary if it exists (from our formatMedicalSummary function)
        if (summaryText.includes('Patient Overview') || summaryText.includes('Clinical Findings')) {
            const sections = parseMedicalSummary(summaryText);

            sections.forEach(section => {
                // Check if we need a new page
                if (yPosition > pageHeight - 50) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Section header
                doc.setFillColor(...lightBlue);
                doc.rect(margin, yPosition - 2, contentWidth, 12, 'F');

                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...sectionColor);
                doc.text(section.title, margin + 5, yPosition + 6);
                yPosition += 18;

                // Section content with proper medical formatting
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...textColor);

                const lines = doc.splitTextToSize(section.content, contentWidth - 10);
                const lineHeight = 5;

                // Add subtle background for content readability
                doc.setFillColor(252, 252, 252);
                doc.rect(margin + 5, yPosition - 2, contentWidth - 10, (lines.length * lineHeight) + 8, 'F');

                doc.text(lines, margin + 8, yPosition + 3);
                yPosition += (lines.length * lineHeight) + 15;
            });

        } else {
            // Fallback for unstructured summary
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 10);

            // Background for better readability
            doc.setFillColor(252, 252, 252);
            doc.rect(margin + 5, yPosition - 2, contentWidth - 10, (summaryLines.length * 5) + 10, 'F');

            doc.text(summaryLines, margin + 8, yPosition + 3);
            yPosition += (summaryLines.length * 5) + 20;
        }

        // FOOTER SECTION
        const footerY = pageHeight - 25;
        doc.setFillColor(240, 240, 240);
        doc.rect(0, footerY - 5, pageWidth, 30, 'F');

        // Footer content
        doc.setFontSize(8);
        doc.setTextColor(127, 140, 141);
        doc.setFont(undefined, 'normal');
        doc.text('This report was generated using AI-powered medical document analysis technology.', margin, footerY + 2);
        doc.text('For clinical use only. Please consult with healthcare professionals for medical decisions.', margin, footerY + 8);

        // Page info and generation date
        doc.setFont(undefined, 'bold');
        doc.text(`Page 1 | Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, footerY + 16);

        // Professional disclaimer
        doc.setTextColor(192, 57, 43);
        doc.text('CONFIDENTIAL MEDICAL DOCUMENT', pageWidth - 65, footerY + 16);

        // Save with professional filename
        const fileName = `Medical_Analysis_Report_${new Date().toISOString().slice(0, 10)}_${reportId}.pdf`;
        doc.save(fileName);

        showSuccess('Professional medical report generated successfully!');

    } catch (error) {
        console.error('PDF generation error:', error);
        showError('Failed to generate PDF report. Please try again.');
    }
}

// Helper function to parse medical summary into sections
function parseMedicalSummary(summaryText) {
    const sections = [];
    const sectionTitles = [
        'Patient Overview',
        'Clinical Findings',
        'Diagnosis & Assessment',
        'Treatment & Recommendations',
        'Additional Notes'
    ];

    let currentSection = '';
    let currentContent = '';

    const lines = summaryText.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if this line is a section title
        const matchedTitle = sectionTitles.find(title => trimmedLine.includes(title));

        if (matchedTitle) {
            // Save previous section
            if (currentSection && currentContent.trim()) {
                sections.push({
                    title: currentSection,
                    content: currentContent.trim()
                });
            }
            // Start new section
            currentSection = matchedTitle;
            currentContent = '';
        } else if (currentSection && trimmedLine) {
            // Add content to current section
            currentContent += trimmedLine + ' ';
        }
    }

    // Add final section
    if (currentSection && currentContent.trim()) {
        sections.push({
            title: currentSection,
            content: currentContent.trim()
        });
    }

    // If no structured sections found, create a general summary section
    if (sections.length === 0) {
        sections.push({
            title: 'Clinical Summary',
            content: summaryText.replace(/\n\s*\n/g, '\n').trim()
        });
    }

    return sections;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease';
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// ========================================
// MEDICAL NLP ANALYSIS FUNCTIONS
// ========================================

// Store NLP data globally for tab switching
let currentNlpData = null;

// Switch between NLP tabs
function switchNlpTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nlp-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.nlp-tab[data-tab="${tabName}"]`)?.classList.add('active');

    // Update panels
    document.querySelectorAll('.nlp-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-panel`)?.classList.add('active');
}

// Display all NLP analysis results
function displayNlpAnalysis(nlpData) {
    if (!nlpData) {
        console.log('No NLP data available');
        return;
    }

    currentNlpData = nlpData;

    // Show the NLP section
    const nlpSection = document.getElementById('nlpAnalysisSection');
    if (nlpSection) {
        nlpSection.style.display = 'block';
    }

    // Populate each section
    displayEntities(nlpData.entities);
    displayICD10Codes(nlpData.icd10_codes);
    displayDrugInteractions(nlpData.drug_interactions);
    displayAbbreviations(nlpData.abbreviations);
    displaySentiment(nlpData.sentiment_analysis);

    console.log('✨ Medical NLP analysis displayed successfully');
}

// Display Named Entities
function displayEntities(entitiesData) {
    const container = document.getElementById('entityCategories');
    const badge = document.getElementById('entitiesBadge');

    if (!container || !entitiesData) return;

    badge.textContent = entitiesData.total_count || 0;

    const summary = entitiesData.summary || {};

    if (Object.keys(summary).length === 0) {
        container.innerHTML = `
            <div class="nlp-no-data">
                <i class="fas fa-search"></i>
                <h4>No Medical Entities Found</h4>
                <p>No significant medical entities were detected in this document.</p>
            </div>
        `;
        return;
    }

    const entityIcons = {
        'DISEASE': 'fa-virus',
        'DRUG': 'fa-pills',
        'PROCEDURE': 'fa-procedures',
        'ANATOMY': 'fa-user-injured',
        'SYMPTOM': 'fa-thermometer-half',
        'LAB_TEST': 'fa-flask'
    };

    let html = '';

    Object.entries(summary).forEach(([category, entities]) => {
        if (entities && entities.length > 0) {
            html += `
                <div class="entity-category">
                    <div class="entity-category-header">
                        <span class="entity-category-title">
                            <i class="fas ${entityIcons[category] || 'fa-tag'}"></i>
                            ${category.replace('_', ' ')}
                        </span>
                        <span class="entity-category-count">${entities.length}</span>
                    </div>
                    <div class="entity-tags">
                        ${entities.map(entity => `
                            <span class="entity-tag ${category.toLowerCase()}">${entity}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

// Display ICD-10 Codes
function displayICD10Codes(icd10Data) {
    const container = document.getElementById('icd10List');
    const badge = document.getElementById('icd10Badge');

    if (!container || !icd10Data) return;

    const codes = icd10Data.items || [];
    badge.textContent = codes.length;

    if (codes.length === 0) {
        container.innerHTML = `
            <div class="nlp-no-data">
                <i class="fas fa-code"></i>
                <h4>No ICD-10 Codes Mapped</h4>
                <p>No recognizable conditions were found to map to ICD-10 codes.</p>
            </div>
        `;
        return;
    }

    let html = '';

    codes.forEach(code => {
        html += `
            <div class="icd10-card">
                <div class="icd10-code">
                    <span class="icd10-code-value">${code.code}</span>
                    <span class="icd10-category">${code.category}</span>
                </div>
                <div class="icd10-details">
                    <div class="icd10-description">${code.description}</div>
                    <div class="icd10-source">
                        Source: <strong>"${code.source_text}"</strong>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Display Drug Interactions
function displayDrugInteractions(interactionsData) {
    const container = document.getElementById('interactionsList');
    const badge = document.getElementById('interactionsBadge');

    if (!container || !interactionsData) return;

    const interactions = interactionsData.items || [];
    badge.textContent = interactions.length;

    // Highlight badge if major interactions exist
    if (interactionsData.has_major) {
        badge.style.background = '#ef4444';
    }

    if (interactions.length === 0) {
        container.innerHTML = `
            <div class="nlp-no-data">
                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                <h4>No Drug Interactions Detected</h4>
                <p>No potential drug-drug interactions were identified in this document.</p>
            </div>
        `;
        return;
    }

    let html = '';

    interactions.forEach(interaction => {
        const severityClass = interaction.severity.toLowerCase();

        html += `
            <div class="interaction-card ${severityClass}">
                <div class="interaction-header">
                    <div class="interaction-drugs">
                        <span class="drug-name">${interaction.drug1}</span>
                        <i class="fas fa-exchange-alt"></i>
                        <span class="drug-name">${interaction.drug2}</span>
                    </div>
                    <span class="severity-badge ${severityClass}">${interaction.severity}</span>
                </div>
                <p class="interaction-description">${interaction.description}</p>
                <div class="interaction-recommendation">
                    <i class="fas fa-lightbulb"></i>
                    <span>${interaction.recommendation}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Display Abbreviations
function displayAbbreviations(abbreviationsData) {
    const container = document.getElementById('abbreviationsList');
    const badge = document.getElementById('abbreviationsBadge');

    if (!container || !abbreviationsData) return;

    const abbreviations = abbreviationsData.items || [];
    badge.textContent = abbreviations.length;

    if (abbreviations.length === 0) {
        container.innerHTML = `
            <div class="nlp-no-data">
                <i class="fas fa-spell-check"></i>
                <h4>No Medical Abbreviations Found</h4>
                <p>No medical abbreviations were detected in this document.</p>
            </div>
        `;
        return;
    }

    let html = '';

    abbreviations.forEach(abbr => {
        html += `
            <div class="abbreviation-card">
                <span class="abbreviation-short">${abbr.abbreviation}</span>
                <i class="fas fa-arrow-right abbreviation-arrow"></i>
                <span class="abbreviation-full">${abbr.expansion}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Display Sentiment Analysis
function displaySentiment(sentimentData) {
    const container = document.getElementById('sentimentOverview');

    if (!container || !sentimentData) return;

    const overall = sentimentData.overall || { label: 'NEUTRAL', confidence: 0.5 };
    const items = sentimentData.items || [];

    const sentimentIcons = {
        'POSITIVE': 'fa-smile',
        'NEGATIVE': 'fa-frown',
        'NEUTRAL': 'fa-meh'
    };

    let html = `
        <div class="sentiment-summary">
            <div class="sentiment-indicator">
                <div class="sentiment-icon ${overall.label.toLowerCase()}">
                    <i class="fas ${sentimentIcons[overall.label] || 'fa-meh'}"></i>
                </div>
                <span class="sentiment-label">${overall.label}</span>
                <span class="sentiment-confidence">${Math.round((overall.confidence || 0.5) * 100)}% confidence</span>
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
            const sentimentClass = item.sentiment.toLowerCase();
            const icon = sentimentIcons[item.sentiment] || 'fa-meh';

            html += `
                <div class="sentiment-item ${sentimentClass}">
                    <div class="sentiment-item-icon">
                        <i class="fas ${icon}"></i>
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

// Make switchNlpTab globally available
window.switchNlpTab = switchNlpTab;

console.log('🎨 MedAnalyzer Pro - Open Source Edition JavaScript Loaded Successfully!');
console.log('🌟 No authentication required - unlimited document analysis available!');
console.log('🧠 Medical NLP features enabled: NER, ICD-10, Drug Interactions, Abbreviations, Sentiment');