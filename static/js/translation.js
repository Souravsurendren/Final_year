/* ========================================
   TRANSLATION MODULE FOR MEDANALYZER
   Handles language switching and translation
======================================== */

// Global storage for original summary
let originalSummaryHTML = '';
let originalSummaryPlainText = '';

// Override the displaySummary function to store original content
const originalDisplaySummary = window.displaySummary;
window.displaySummary = function(summary) {
    if (!summaryContent || !summary) return;

    summaryContent.innerHTML = '';

    // Format the summary into organized sections
    const formattedSummary = formatMedicalSummary(summary);

    // Store original summary for translation purposes
    originalSummaryHTML = formattedSummary;
    originalSummaryPlainText = summary;

    // Display formatted content immediately (no typewriter effect for better readability)
    summaryContent.innerHTML = formattedSummary;
    
    // Reset language selector to English
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = 'en';
    }
};

/**
 * Translate the medical summary to the selected language
 */
async function translateSummary() {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect) {
        console.error('Language selector not found');
        return;
    }

    const selectedLanguage = languageSelect.value;
    console.log('🌍 Translating to:', selectedLanguage);

    // If English selected, show original summary
    if (selectedLanguage === 'en') {
        if (summaryContent && originalSummaryHTML) {
            summaryContent.innerHTML = originalSummaryHTML;
        }
        showSuccess('Summary displayed in English');
        return;
    }

    // Check if we have a summary to translate
    if (!originalSummaryPlainText || originalSummaryPlainText.trim().length === 0) {
        showError('No summary available to translate. Please analyze a document first.');
        languageSelect.value = 'en';
        return;
    }

    try {
        // Show loading state
        if (summaryContent) {
            summaryContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #2563EB;"></i><p style="margin-top: 10px;">Translating summary...</p></div>';
        }

        // Call translation endpoint
        const response = await fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: originalSummaryPlainText,
                language: selectedLanguage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.translated_text) {
            // Format and display translated content
            const translatedFormatted = formatMedicalSummary(result.translated_text);
            if (summaryContent) {
                summaryContent.innerHTML = translatedFormatted;
            }

            console.log('✅ Translation successful');
            showSuccess(`Summary translated to ${result.language}`);
        } else {
            throw new Error(result.error || 'Translation failed');
        }
    } catch (error) {
        console.error('❌ Translation error:', error);
        
        // Show error and reset to English
        showError(`Translation failed: ${error.message}`);
        if (summaryContent && originalSummaryHTML) {
            summaryContent.innerHTML = originalSummaryHTML;
        }
        languageSelect.value = 'en';
    }
}

// Export for use
window.translateSummary = translateSummary;
