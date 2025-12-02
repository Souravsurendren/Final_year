/* ========================================
   MEDANALYZER PRO - PREMIUM JAVASCRIPT
   Modern interactions with smooth animations
======================================== */

// ========================================
// GLOBAL EVENT HANDLERS
// ========================================
// Global handlers for HTML onclick events
function handleThemeChange(theme) {
    console.log('🎨 Direct theme change called:', theme);
    localStorage.setItem('medanalyzer_theme', theme);
    applyTheme(theme);
    
    // Show success message if showSuccess function exists
    if (typeof showSuccess === 'function') {
        showSuccess(`Switched to ${theme} mode`);
    }
}

function handleExportReport() {
    console.log('📄 Direct export called');
    if (typeof exportReport === 'function') {
        exportReport();
    } else {
        console.log('Export function not available yet');
        setTimeout(() => exportReport(), 500);
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
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Button hover effects
    addButtonEffects();
    
    // Card hover effects
    addCardEffects();
    
    // Smooth reveal on scroll
    addScrollRevealEffects();
}

// ========================================
// NAVBAR EFFECTS
// ========================================
function initializeNavbarEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Add/remove blur effect based on scroll
        if (currentScrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.9)';
            navbar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.8)';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        }
        
        // Hide/show navbar on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    });
}

// ========================================
// HERO ANIMATIONS
// ========================================
function animateHeroElements() {
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroStats = document.querySelector('.hero-stats');
    const floatingCards = document.querySelectorAll('.floating-card');
    
    // Animate hero text
    if (heroTitle) {
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            heroTitle.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 200);
    }
    
    if (heroSubtitle) {
        heroSubtitle.style.opacity = '0';
        heroSubtitle.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            heroSubtitle.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            heroSubtitle.style.opacity = '1';
            heroSubtitle.style.transform = 'translateY(0)';
        }, 400);
    }
    
    if (heroStats) {
        heroStats.style.opacity = '0';
        heroStats.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            heroStats.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            heroStats.style.opacity = '1';
            heroStats.style.transform = 'translateY(0)';
        }, 600);
    }
    
    // Animate floating cards
    floatingCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px) scale(0.8)';
        
        setTimeout(() => {
            card.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
        }, 800 + (index * 200));
    });
}

// ========================================
// PARTICLE EFFECTS
// ========================================
function initializeParticleEffects() {
    const particles = document.querySelector('.bg-particles');
    if (!particles) return;
    
    // Create floating particles
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            createFloatingParticle();
        }, i * 200);
    }
}

function createFloatingParticle() {
    const particle = document.createElement('div');
    particle.className = 'floating-particle';
    particle.style.cssText = `
        position: fixed;
        width: 4px;
        height: 4px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 50%;
        pointer-events: none;
        z-index: -1;
        left: ${Math.random() * window.innerWidth}px;
        top: ${window.innerHeight + 10}px;
        animation: floatUp ${10 + Math.random() * 10}s linear infinite;
        opacity: ${0.3 + Math.random() * 0.4};
    `;
    
    document.body.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 20000);
}

// Add CSS for particle animation
const particleStyles = document.createElement('style');
particleStyles.textContent = `
    @keyframes floatUp {
        0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            transform: translateY(-100vh) translateX(${Math.random() * 200 - 100}px) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(particleStyles);

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
        
    } catch (error) {
        showError(error.message);
    } finally {
        isProcessing = false;
        hideUploadProgress();
        hideFunFacts();
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
    const summaryTypeRadio = document.querySelector('input[name=\"summaryType\"]:checked');
    const summaryType = summaryTypeRadio ? summaryTypeRadio.value : 'abstractive';
    formData.append('summary_type', summaryType);
    
    // Simulate progress updates
    simulateProgress();
    
    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Network error occurred' }));
        throw new Error(error.detail || 'Upload failed. Please check your connection and try again.');
    }
    
    return await response.json();
}

// ========================================
// PROGRESS HANDLING
// ========================================
function showUploadProgress() {
    uploadProgressEl.style.display = 'block';
    uploadProgressEl.style.opacity = '0';
    uploadProgressEl.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        uploadProgressEl.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        uploadProgressEl.style.opacity = '1';
        uploadProgressEl.style.transform = 'translateY(0)';
    }, 100);
}

function hideUploadProgress() {
    setTimeout(() => {
        uploadProgressEl.style.opacity = '0';
        uploadProgressEl.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            uploadProgressEl.style.display = 'none';
        }, 500);
    }, 1000);
}

function simulateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const progressPercent = document.querySelector('.progress-percent');
    const steps = document.querySelectorAll('.step');
    
    let progress = 0;
    let currentStep = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        // Update progress bar
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
    
    // Typewriter effect
    let index = 0;
    const speed = 30; // milliseconds per character
    
    function typeWriter() {
        if (index < summary.length) {
            summaryContent.innerHTML += summary.charAt(index);
            index++;
            setTimeout(typeWriter, speed);
        }
    }
    
    setTimeout(typeWriter, 500);
}

function showResultsSection() {
    resultsSection.style.display = 'block';
    resultsSection.style.opacity = '0';
    resultsSection.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        resultsSection.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        resultsSection.style.opacity = '1';
        resultsSection.style.transform = 'translateY(0)';
    }, 100);
    
    // Animate result cards
    const resultCards = document.querySelectorAll('.result-card');
    resultCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });
}

function showSearchSection() {
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
        searchBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin\"></i>';
        searchBtn.disabled = true;
    }
}

function hideSearchLoading() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.innerHTML = '<i class=\"fas fa-search\"></i>';
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
                <h3>No results found</h3>
                <p>Try rephrasing your question or using different keywords.</p>
            </div>
        `;
        return;
    }
    
    results.results.forEach((result, index) => {
        const resultElement = document.createElement('div');
        resultElement.className = 'search-result-item';
        resultElement.innerHTML = `
            <div class="result-content">
                <div class="result-text">${result.content}</div>
                <div class="result-meta">
                    <span class="result-score">Relevance: ${Math.round(result.score * 100)}%</span>
                    <span class="result-source">Page ${result.page || 'N/A'}</span>
                </div>
            </div>
        `;
        
        // Add entrance animation
        resultElement.style.opacity = '0';
        resultElement.style.transform = 'translateY(20px)';
        searchResults.appendChild(resultElement);
        
        setTimeout(() => {
            resultElement.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            resultElement.style.opacity = '1';
            resultElement.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ========================================
// FUN FACTS
// ========================================
function showFunFacts() {
    if (!funFact) return;
    
    const factSpan = funFact.querySelector('span');
    if (!factSpan) return;
    
    let factIndex = 0;
    factSpan.textContent = funFacts[factIndex];
    
    funFact.style.display = 'block';
    
    const interval = setInterval(() => {
        factIndex = (factIndex + 1) % funFacts.length;
        
        // Fade out
        factSpan.style.opacity = '0';
        factSpan.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            factSpan.textContent = funFacts[factIndex];
            factSpan.style.opacity = '1';
            factSpan.style.transform = 'translateY(0)';
        }, 300);
        
    }, 4000);
    
    // Stop after processing
    setTimeout(() => {
        clearInterval(interval);
    }, 15000);
}

function hideFunFacts() {
    if (funFact) {
        funFact.style.opacity = '0';
        funFact.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            funFact.style.display = 'none';
            funFact.style.opacity = '1';
            funFact.style.transform = 'translateX(0)';
        }, 500);
    }
}

// ========================================
// UI ENHANCEMENTS
// ========================================
function addButtonEffects() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-icon');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
        
        button.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(0) scale(0.98)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-2px) scale(1)';
        });
    });
}

function addCardEffects() {
    const cards = document.querySelectorAll('.result-card, .stat-card, .option-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

function addScrollRevealEffects() {
    const elements = document.querySelectorAll('.upload-card, .quick-stats, .section-header');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(element);
    });
}

function addSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-item[href^=\"#\"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Update active navigation state
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                // Smooth scroll to target
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Special handling for results and search sections
                if (targetId === 'reports') {
                    resultsSection.style.display = 'block';
                } else if (targetId === 'searchSection') {
                    const searchSection = document.getElementById('searchSection');
                    if (searchSection) {
                        searchSection.style.display = 'block';
                    }
                }
            }
        });
    });
    
    // Add scroll spy functionality
    window.addEventListener('scroll', debounce(updateActiveNavigation, 100));
}

function updateActiveNavigation() {
    const sections = ['dashboard', 'analytics', 'reports', 'settings'];
    const navbarHeight = 72; // Height of fixed navbar
    
    for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= navbarHeight + 50) {
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                const activeNav = document.querySelector(`.nav-item[href="#${sections[i]}"]`);
                if (activeNav) {
                    activeNav.classList.add('active');
                }
                break;
            }
        }
    }
}

// ========================================
// ERROR HANDLING
// ========================================
function showError(message) {
    // Create error toast
    const errorToast = document.createElement('div');
    errorToast.className = 'error-toast';
    errorToast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    errorToast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #f56565, #e53e3e);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(errorToast);
    
    // Auto remove
    setTimeout(() => {
        errorToast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (errorToast.parentNode) {
                errorToast.parentNode.removeChild(errorToast);
            }
        }, 300);
    }, 5000);
}

// Add toast animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .toast-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .search-result-item {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
    }
    
    .result-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .result-text {
        font-size: 16px;
        line-height: 1.6;
        color: #334155;
    }
    
    .result-meta {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #64748b;
    }
    
    .result-score {
        font-weight: 600;
        color: #667eea;
    }
    
    .search-no-results {
        text-align: center;
        padding: 40px;
        color: #64748b;
    }
    
    .search-no-results i {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.5;
    }
    
    .search-no-results h3 {
        font-size: 24px;
        margin-bottom: 12px;
        color: #334155;
    }
`;
document.head.appendChild(toastStyles);

// ========================================
// UTILITY FUNCTIONS
// ========================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// ========================================
// PERFORMANCE MONITORING
// ========================================
function logPerformance(label, startTime) {
    const endTime = performance.now();
    console.log(`⚡ ${label}: ${(endTime - startTime).toFixed(2)}ms`);
}

// ========================================
// ACCESSIBILITY ENHANCEMENTS
// ========================================
function enhanceAccessibility() {
    // Add keyboard navigation for dropzone
    if (dropZone) {
        dropZone.setAttribute('tabindex', '0');
        dropZone.setAttribute('role', 'button');
        dropZone.setAttribute('aria-label', 'Upload medical document');
        
        dropZone.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
    }
    
    // Add aria-live regions for dynamic content
    const ariaLive = document.createElement('div');
    ariaLive.setAttribute('aria-live', 'polite');
    ariaLive.setAttribute('aria-atomic', 'true');
    ariaLive.style.position = 'absolute';
    ariaLive.style.left = '-10000px';
    ariaLive.style.width = '1px';
    ariaLive.style.height = '1px';
    ariaLive.style.overflow = 'hidden';
    document.body.appendChild(ariaLive);
    
    // Announce important updates
    window.announceToScreenReader = function(message) {
        ariaLive.textContent = message;
    };
}

// Initialize accessibility on load
document.addEventListener('DOMContentLoaded', enhanceAccessibility);

// ========================================
// AUTHENTICATION SYSTEM
// ========================================
function initializeAuth() {
    // Load user data from localStorage
    loadUserData();
    
    // Update UI based on auth state
    updateAuthUI();
    
    // Setup auth event listeners
    setupAuthEventListeners();
}

function loadUserData() {
    // Load current user
    const userData = localStorage.getItem('medanalyzer_user');
    if (userData) {
        currentUser = JSON.parse(userData);
    }
    
    // Load usage count
    const storedUsage = localStorage.getItem('medanalyzer_usage');
    usageCount = storedUsage ? parseInt(storedUsage) : 0;
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const usageIndicator = document.getElementById('usageIndicator');
    const usageText = usageIndicator?.querySelector('.usage-text');
    const usageFill = usageIndicator?.querySelector('.usage-fill');
    
    if (currentUser) {
        // User is logged in
        authButtons.style.display = 'none';
        userProfile.style.display = 'flex';
        userName.textContent = currentUser.name;
        
        if (usageText && usageFill) {
            usageText.textContent = 'Premium';
            usageFill.style.width = '100%';
        }
    } else {
        // User is not logged in - show free trial status
        authButtons.style.display = 'flex';
        userProfile.style.display = 'flex';
        userName.textContent = 'Guest User';
        
        if (usageText && usageFill) {
            const remaining = Math.max(0, MAX_FREE_USAGE - usageCount);
            usageText.textContent = `${remaining}/${MAX_FREE_USAGE} Free`;
            const percentage = Math.min(100, (usageCount / MAX_FREE_USAGE) * 100);
            usageFill.style.width = `${percentage}%`;
            
            if (usageCount >= MAX_FREE_USAGE) {
                usageFill.style.background = 'var(--error)';
                usageText.style.color = 'var(--error)';
            }
        }
    }
}

function setupAuthEventListeners() {
    // Modal triggers
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const signupFromLimit = document.getElementById('signupFromLimit');
    const loginFromLimit = document.getElementById('loginFromLimit');
    
    // Modal switches
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    
    // Modal closes
    const loginModalClose = document.getElementById('loginModalClose');
    const signupModalClose = document.getElementById('signupModalClose');
    const usageLimitModalClose = document.getElementById('usageLimitModalClose');
    
    // Forms
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // User menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Event listeners
    if (loginBtn) loginBtn.addEventListener('click', () => showModal('loginModal'));
    if (signupBtn) signupBtn.addEventListener('click', () => showModal('signupModal'));
    if (signupFromLimit) signupFromLimit.addEventListener('click', () => {
        hideModal('usageLimitModal');
        showModal('signupModal');
    });
    if (loginFromLimit) loginFromLimit.addEventListener('click', () => {
        hideModal('usageLimitModal');
        showModal('loginModal');
    });
    
    if (switchToSignup) switchToSignup.addEventListener('click', () => {
        hideModal('loginModal');
        showModal('signupModal');
    });
    if (switchToLogin) switchToLogin.addEventListener('click', () => {
        hideModal('signupModal');
        showModal('loginModal');
    });
    
    if (loginModalClose) loginModalClose.addEventListener('click', () => hideModal('loginModal'));
    if (signupModalClose) signupModalClose.addEventListener('click', () => hideModal('signupModal'));
    if (usageLimitModalClose) usageLimitModalClose.addEventListener('click', () => hideModal('usageLimitModal'));
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    
    if (userMenuBtn) userMenuBtn.addEventListener('click', toggleUserMenu);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Close modals on overlay click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            hideModal(e.target.id);
        }
        
        // Close user menu when clicking outside
        if (userMenu && !userMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
            userMenu.style.display = 'none';
        }
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Login successful
            currentUser = data.user;
            localStorage.setItem('medanalyzer_user', JSON.stringify(currentUser));
            localStorage.setItem('medanalyzer_token', data.token);
            
            hideModal('loginModal');
            updateAuthUI();
            showSuccess('Welcome back! You now have unlimited access.');
        } else {
            showFormError('loginEmailError', data.error || 'Login failed');
        }
    } catch (error) {
        showFormError('loginEmailError', 'Connection error. Please try again.');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Client-side validation
    if (password !== confirmPassword) {
        showFormError('signupConfirmPasswordError', 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showFormError('signupPasswordError', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Signup successful
            currentUser = data.user;
            localStorage.setItem('medanalyzer_user', JSON.stringify(currentUser));
            localStorage.setItem('medanalyzer_token', data.token);
            
            hideModal('signupModal');
            updateAuthUI();
            showSuccess('Account created successfully! Welcome to MedAnalyzer Pro.');
        } else {
            showFormError('signupEmailError', data.error || 'Signup failed');
        }
    } catch (error) {
        showFormError('signupEmailError', 'Connection error. Please try again.');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('medanalyzer_user');
    localStorage.removeItem('medanalyzer_token');
    
    updateAuthUI();
    document.getElementById('userMenu').style.display = 'none';
    showSuccess('You have been logged out successfully.');
}

function showFormError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.parentElement.querySelector('input').classList.add('error');
        
        // Clear error after 5 seconds
        setTimeout(() => {
            errorElement.textContent = '';
            errorElement.parentElement.querySelector('input').classList.remove('error');
        }, 5000);
    }
}

function showSuccess(message) {
    // Create success toast
    const successToast = document.createElement('div');
    successToast.className = 'success-toast';
    successToast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    successToast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #43e97b, #38f9d7);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(successToast);
    
    // Auto remove
    setTimeout(() => {
        successToast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (successToast.parentNode) {
                successToast.parentNode.removeChild(successToast);
            }
        }, 300);
    }, 5000);
}

function checkUsageLimit() {
    if (!currentUser && usageCount >= MAX_FREE_USAGE) {
        showModal('usageLimitModal');
        return false;
    }
    return true;
}

function incrementUsage() {
    if (!currentUser) {
        usageCount++;
        localStorage.setItem('medanalyzer_usage', usageCount.toString());
        updateAuthUI();
    }
}

// ========================================
// THEME SYSTEM
// ========================================
function initializeTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem('medanalyzer_theme') || 'light';
    applyTheme(savedTheme);
    
    // Set theme selector value (no duplicate event binding)
    setTimeout(() => {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = savedTheme;
            console.log('✅ Theme selector value set (using HTML onchange)');
        } else {
            console.log('❌ Theme selector not found');
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
            }
        });
    } else {
        body.classList.add('light-theme');
    }
}

// ========================================
// EXPORT FUNCTIONALITY
// ========================================
function initializeExport() {
    // Export functionality is handled by HTML onclick attribute
    // No additional event listeners needed to avoid double downloads
    console.log('✅ Export system ready (using HTML onclick)');
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
        
        // Create PDF-style report
        const reportHTML = generateReportHTML(reportData);
        
        // Create and download file
        const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `medical-analysis-report-${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccess('Report exported successfully!');
        
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export report. Please try again.');
    }
}

function generateReportHTML(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Medical Document Analysis Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
        .header { border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #667eea; margin: 0; font-size: 28px; }
        .timestamp { color: #666; font-size: 14px; margin-top: 10px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #334155; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-item { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
        .stat-label { font-weight: 600; color: #475569; font-size: 14px; }
        .stat-value { font-size: 18px; font-weight: bold; color: #667eea; }
        .summary-box { background: #f0f4ff; padding: 20px; border-radius: 10px; border: 1px solid #e0e7ff; }
        .insights-list { list-style: none; padding: 0; }
        .insights-list li { background: #fff; margin: 10px 0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .insight-title { font-weight: 600; color: #334155; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 Medical Document Analysis Report</h1>
        <div class="timestamp">Generated on: ${new Date(data.timestamp).toLocaleString()}</div>
    </div>
    
    <div class="section">
        <h2>📊 Processing Statistics</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Processing Time</div>
                <div class="stat-value">${data.stats.processingTime}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Chunks Processed</div>
                <div class="stat-value">${data.stats.chunksProcessed}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Confidence Score</div>
                <div class="stat-value">${data.stats.confidenceScore}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Key Terms</div>
                <div class="stat-value">${data.stats.keyTerms}</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>📄 Document Summary</h2>
        <div class="summary-box">
            ${data.summary}
        </div>
    </div>
    
    <div class="section">
        <h2>💡 Key Insights</h2>
        <ul class="insights-list">
            ${data.insights.map(insight => `
                <li>
                    <div class="insight-title">${insight.title}</div>
                    <div>${insight.description}</div>
                </li>
            `).join('')}
        </ul>
    </div>
    
    <div class="section">
        <h2>📈 Analytics</h2>
        <div class="stats-grid">
            ${data.analytics.map(metric => `
                <div class="stat-item">
                    <div class="stat-label">${metric.label}</div>
                    <div class="stat-value">${metric.value}</div>
                </div>
            `).join('')}
        </div>
    </div>
    
    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
        Generated by MedAnalyzer Pro - AI-Powered Medical Document Intelligence
    </div>
</body>
</html>`;
}

// ========================================
// PROFILE FUNCTIONALITY
// ========================================
function initializeProfile() {
    // Profile button is handled via HTML onclick to avoid duplicate bindings.
    setTimeout(() => {
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            console.log('📌 Profile button found (using HTML onclick)');
        } else {
            console.log('❌ Profile button not found');
        }
    }, 500);
}

function showProfileModal() {
    if (!currentUser) {
        showError('Please log in to view your profile.');
        return;
    }
    
    // Create profile modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'profileModal';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>👤 User Profile</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                <div class="profile-info">
                    <div class="profile-avatar">
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='20' fill='%23667eea'/%3E%3Cpath d='M20 85c0-16.6 13.4-30 30-30s30 13.4 30 30' fill='%23667eea'/%3E%3C/svg%3E" alt="Profile" class="avatar-large">
                    </div>
                    <div class="profile-details">
                        <h4>${currentUser.name}</h4>
                        <p>${currentUser.email}</p>
                        <span class="profile-badge">Premium User</span>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-file-medical"></i></div>
                        <div class="stat-info">
                            <div class="stat-number">∞</div>
                            <div class="stat-label">Documents Analyzed</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-calendar"></i></div>
                        <div class="stat-info">
                            <div class="stat-number">${new Date(currentUser.created_at).toLocaleDateString()}</div>
                            <div class="stat-label">Member Since</div>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn-secondary btn-full" onclick="editProfile()">
                        <i class="fas fa-edit"></i>
                        Edit Profile
                    </button>
                    <button class="btn-primary btn-full" onclick="changePassword()">
                        <i class="fas fa-key"></i>
                        Change Password
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add profile-specific styles
    if (!document.getElementById('profileStyles')) {
        const styles = document.createElement('style');
        styles.id = 'profileStyles';
        styles.textContent = `
            .profile-info { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; }
            .profile-avatar { flex-shrink: 0; }
            .avatar-large { width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .profile-details h4 { margin: 0 0 5px 0; font-size: 24px; color: #334155; font-weight: 700; }
            .profile-details p { margin: 0 0 10px 0; color: #64748b; font-size: 16px; }
            .profile-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .profile-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .profile-stats .stat-card { background: white; border: 1px solid #e2e8f0; }
            .profile-actions { display: flex; flex-direction: column; gap: 12px; }
        `;
        document.head.appendChild(styles);
    }
}

function editProfile() {
    showSuccess('Profile editing feature coming soon!');
}

function changePassword() {
    showSuccess('Password change feature coming soon!');
}

// Initialize additional features when page is fully loaded
window.addEventListener('load', function() {
    setTimeout(() => {
        console.log('🔧 Initializing additional features...');
        initializeExport();
        initializeProfile();
        
        // Also ensure theme selector has the correct value (HTML onchange handles events)
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect && !themeSelect.hasAttribute('data-initialized')) {
            const savedTheme = localStorage.getItem('medanalyzer_theme') || 'light';
            themeSelect.value = savedTheme;
            themeSelect.setAttribute('data-initialized', 'true');
            console.log('✅ Theme selector value set on window load (events handled by HTML onchange)');
        }
    }, 2000);
});

// Debug function to test features
window.testFeatures = function() {
    console.log('🧪 Testing all features...');
    
    // Test theme selector
    const themeSelect = document.getElementById('themeSelect');
    console.log('Theme selector:', themeSelect ? '✅ Found' : '❌ Not found');
    
    // Test export button
    const exportBtn = document.getElementById('exportBtn');
    console.log('Export button:', exportBtn ? '✅ Found' : '❌ Not found');
    
    // Test profile button
    const profileBtn = document.getElementById('profileBtn');
    console.log('Profile button:', profileBtn ? '✅ Found' : '❌ Not found');
    
    // Test settings section
    const settingsSection = document.getElementById('settings');
    console.log('Settings section:', settingsSection ? '✅ Found' : '❌ Not found');
    
    // Test if we can manually trigger functions
    if (exportBtn) {
        exportBtn.onclick = handleExportReport;
        console.log('✅ Export handler attached manually');
    }
    
    if (profileBtn) {
        profileBtn.onclick = showProfileModal;
        console.log('✅ Profile handler attached manually');
    }
    
    if (themeSelect) {
        themeSelect.onchange = function(e) {
            const newTheme = e.target.value;
            applyTheme(newTheme);
            localStorage.setItem('medanalyzer_theme', newTheme);
            showSuccess(`Switched to ${newTheme} mode`);
        };
        console.log('✅ Theme handler attached manually');
    }
    
    console.log('🎉 Manual feature binding complete!');
};

// Auto-run test after 3 seconds
setTimeout(() => {
    if (window.testFeatures) {
        window.testFeatures();
    }
}, 3000);

console.log('🎨 MedAnalyzer Pro - Premium UI JavaScript Loaded Successfully!');