// AI Meeting Notes Summarizer - Frontend JavaScript

// Application state
let appState = {
    currentStep: 1,
    uploadedFile: null,
    fileId: null,
    transcriptContent: '',
    customInstructions: '',
    generatedSummary: '',
    editedSummary: '',
    summaryId: null
};

// API Client Layer
class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.defaultTimeout = 30000; // 30 seconds
    }

    // Generic API request method with error handling
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            timeout: this.defaultTimeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Parse response
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                throw new APIError(
                    data.error || 'Request failed',
                    response.status,
                    data.message || `HTTP ${response.status}`,
                    data
                );
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 408, 'The request took too long to complete');
            }
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError('Network error', 0, error.message || 'Failed to connect to server');
        }
    }

    // File upload API
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('transcript', file);

        return this.request('/upload', {
            method: 'POST',
            headers: {}, // Let browser set Content-Type for FormData
            body: formData
        });
    }

    // Get uploaded file by ID
    async getFile(fileId) {
        return this.request(`/file/${fileId}`);
    }

    // Generate summary API
    async generateSummary(transcript, instructions, fileId = null) {
        const requestData = {
            instructions: instructions || ''
        };

        if (fileId) {
            requestData.fileId = fileId;
        } else {
            requestData.transcript = transcript;
        }

        return this.request('/summarize', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
    }

    // Get summary by ID
    async getSummary(summaryId) {
        return this.request(`/summary/${summaryId}`);
    }

    // Update summary content
    async updateSummary(summaryId, content) {
        return this.request(`/summary/${summaryId}`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
    }

    // Share summary via email
    async shareSummary(summaryId, recipients, subject, customMessage = '', senderName = '') {
        return this.request('/share', {
            method: 'POST',
            body: JSON.stringify({
                summaryId,
                recipients,
                subject,
                customMessage,
                senderName
            })
        });
    }

    // Get share record details
    async getShareRecord(shareId) {
        return this.request(`/share/${shareId}`);
    }

    // Get AI services status
    async getServicesStatus() {
        return this.request('/services/status');
    }

    // Get email service status
    async getEmailStatus() {
        return this.request('/email/status');
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
}

// Custom API Error class
class APIError extends Error {
    constructor(type, status, message, details = null) {
        super(message);
        this.name = 'APIError';
        this.type = type;
        this.status = status;
        this.details = details;
    }

    // Get user-friendly error message
    getUserMessage() {
        switch (this.status) {
            case 0:
                return 'Unable to connect to server. Please check your internet connection.';
            case 400:
                return this.message || 'Invalid request. Please check your input.';
            case 401:
                return 'Authentication required. Please refresh the page.';
            case 403:
                return 'Access denied. You do not have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 408:
                return 'Request timed out. Please try again.';
            case 413:
                return 'File too large. Please select a smaller file.';
            case 429:
                return 'Too many requests. Please wait a moment and try again.';
            case 500:
                return 'Server error occurred. Please try again later.';
            case 503:
                return 'Service temporarily unavailable. Please try again later.';
            default:
                return this.message || 'An unexpected error occurred. Please try again.';
        }
    }

    // Check if error is retryable
    isRetryable() {
        return [408, 429, 500, 502, 503, 504].includes(this.status);
    }
}

// Initialize API client
const apiClient = new APIClient();

// Workflow testing and validation
const WorkflowManager = {
    // Test backend connectivity
    async testBackendConnection() {
        try {
            await apiClient.healthCheck();
            return { success: true, message: 'Backend connection successful' };
        } catch (error) {
            return { success: false, message: 'Backend connection failed', error };
        }
    },

    // Test AI services
    async testAIServices() {
        try {
            const response = await apiClient.getServicesStatus();
            return {
                success: true,
                message: 'AI services available',
                services: response.services
            };
        } catch (error) {
            return { success: false, message: 'AI services unavailable', error };
        }
    },

    // Test email service
    async testEmailService() {
        try {
            const response = await apiClient.getEmailStatus();
            return {
                success: response.emailService.configured,
                message: response.emailService.message,
                status: response.emailService.status
            };
        } catch (error) {
            return { success: false, message: 'Email service test failed', error };
        }
    },

    // Run comprehensive system check
    async runSystemCheck() {
        console.log('Running system check...');

        const results = {
            backend: await this.testBackendConnection(),
            ai: await this.testAIServices(),
            email: await this.testEmailService()
        };

        // Show results to user
        let message = 'System Status:\n';
        message += `Backend: ${results.backend.success ? '✓' : '✗'} ${results.backend.message}\n`;
        message += `AI Services: ${results.ai.success ? '✓' : '✗'} ${results.ai.message}\n`;
        message += `Email Service: ${results.email.success ? '✓' : '✗'} ${results.email.message}`;

        const allGood = results.backend.success && results.ai.success && results.email.success;
        console.log(message);

        if (!allGood) {
            showMessage('Some services may not be available. Check console for details.', 'warning');
        }

        return results;
    },

    // Validate workflow state integrity
    validateWorkflowIntegrity() {
        const issues = [];

        // Check for orphaned state
        if (appState.summaryId && !appState.generatedSummary) {
            issues.push('Summary ID exists but no content found');
        }

        if (appState.fileId && !appState.transcriptContent) {
            issues.push('File ID exists but no content loaded');
        }

        if (appState.editedSummary && !appState.summaryId) {
            issues.push('Edited summary exists but no summary ID');
        }

        // Check step consistency
        if (appState.currentStep > 1 && !appState.transcriptContent && !appState.fileId) {
            issues.push('Advanced step but no transcript content');
        }

        if (appState.currentStep > 2 && !appState.customInstructions) {
            issues.push('Advanced step but no instructions');
        }

        if (appState.currentStep > 3 && !appState.generatedSummary) {
            issues.push('Advanced step but no generated summary');
        }

        return issues;
    },

    // Fix workflow integrity issues
    async fixWorkflowIssues() {
        const issues = this.validateWorkflowIntegrity();

        if (issues.length === 0) {
            return { success: true, message: 'No issues found' };
        }

        console.warn('Workflow integrity issues found:', issues);

        // Try to recover missing data
        let recovered = false;

        // Try to recover file content if we have file ID
        if (appState.fileId && !appState.transcriptContent) {
            try {
                const response = await apiClient.getFile(appState.fileId);
                appState.transcriptContent = response.file.content;
                recovered = true;
            } catch (error) {
                console.warn('Failed to recover file content:', error);
                appState.fileId = null;
            }
        }

        // Try to recover summary if we have summary ID
        if (appState.summaryId && !appState.generatedSummary) {
            try {
                const response = await apiClient.getSummary(appState.summaryId);
                appState.generatedSummary = response.summary.content;
                appState.editedSummary = response.summary.content;
                recovered = true;
            } catch (error) {
                console.warn('Failed to recover summary:', error);
                appState.summaryId = null;
            }
        }

        // Reset to safe state if recovery failed
        if (!recovered) {
            const safeStep = this.findSafeStep();
            appState.currentStep = safeStep;
            navigateToStep(safeStep);
        }

        StateManager.saveState();
        return {
            success: recovered,
            message: recovered ? 'Issues resolved' : 'Reset to safe state',
            issues
        };
    },

    // Find the highest safe step based on available data
    findSafeStep() {
        if (appState.generatedSummary && appState.summaryId) {
            return 4; // Editing step
        } else if (appState.customInstructions && (appState.transcriptContent || appState.fileId)) {
            return 3; // Summary generation step
        } else if (appState.transcriptContent || appState.fileId) {
            return 2; // Instructions step
        } else {
            return 1; // Upload step
        }
    }
};

// State restoration functions
function restoreFileUploadState() {
    if (appState.fileId) {
        // Try to get file details from server
        apiClient.getFile(appState.fileId)
            .then(response => {
                showFilePreview(response.file);
                appState.transcriptContent = response.file.content;
            })
            .catch(error => {
                console.warn('Failed to restore file state:', error);
                // Clear invalid file state
                appState.fileId = null;
                appState.transcriptContent = '';
                StateManager.saveState();
            });
    } else if (appState.transcriptContent) {
        // Show a generic preview for direct transcript content
        const previewContainer = document.getElementById('file-preview');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        const transcriptPreview = document.getElementById('transcript-preview');
        const continueBtn = document.getElementById('continue-to-instructions');

        fileName.textContent = 'Restored Content';
        fileSize.textContent = formatFileSize(appState.transcriptContent.length);
        transcriptPreview.textContent = appState.transcriptContent.substring(0, 500) +
            (appState.transcriptContent.length > 500 ? '...' : '');

        previewContainer.classList.remove('hidden');
        continueBtn.disabled = false;
    }
}

function restoreInstructionsState() {
    const instructionsTextarea = document.getElementById('custom-instructions');
    const continueBtn = document.getElementById('continue-to-summary');

    if (appState.customInstructions) {
        instructionsTextarea.value = appState.customInstructions;
        updateCharacterCount();
        updateContinueButton();

        // Mark custom template as active
        document.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-template="custom"]').classList.add('active');
    }
}

function restoreSummaryState() {
    if (appState.generatedSummary) {
        // Show the generated summary
        const summaryContent = document.getElementById('summary-content');
        const wordCount = document.getElementById('summary-word-count');
        const summaryDisplay = document.getElementById('summary-display');
        const continueBtn = document.getElementById('continue-to-edit');

        summaryContent.textContent = appState.generatedSummary;
        wordCount.textContent = `${countWords(appState.generatedSummary)} words`;
        summaryDisplay.classList.remove('hidden');
        continueBtn.disabled = false;

        // Also load into editor if we're on the editing step
        if (appState.currentStep === 4) {
            loadSummaryForEditing();
        }
    }
}

// Application state management
const StateManager = {
    // Save state to localStorage
    saveState() {
        try {
            const stateToSave = {
                ...appState,
                uploadedFile: null // Don't save file object
            };
            localStorage.setItem('meetingSummarizerState', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    },

    // Load state from localStorage
    loadState() {
        try {
            const savedState = localStorage.getItem('meetingSummarizerState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                // Only restore if it's recent (within 24 hours)
                const now = new Date();
                const stateAge = now.getTime() - new Date(parsedState.lastActivity || 0).getTime();
                if (stateAge < 24 * 60 * 60 * 1000) {
                    Object.assign(appState, parsedState);
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to load state:', error);
        }
        return false;
    },

    // Clear saved state
    clearState() {
        try {
            localStorage.removeItem('meetingSummarizerState');
        } catch (error) {
            console.warn('Failed to clear state:', error);
        }
    },

    // Update last activity timestamp
    updateActivity() {
        appState.lastActivity = new Date().toISOString();
        this.saveState();
    },

    // Validate current state for step
    validateStateForStep(step) {
        switch (step) {
            case 1: // Upload step
                return true;
            case 2: // Instructions step
                return appState.transcriptContent || appState.fileId;
            case 3: // Summary generation step
                return (appState.transcriptContent || appState.fileId) && appState.customInstructions;
            case 4: // Editing step
                return appState.generatedSummary && appState.summaryId;
            default:
                return false;
        }
    },

    // Navigate to step with validation
    navigateToStepSafely(targetStep) {
        // Check if we can navigate to this step
        for (let step = 1; step <= targetStep; step++) {
            if (!this.validateStateForStep(step)) {
                showMessage(`Please complete step ${step} first.`, 'warning');
                navigateToStep(step);
                return false;
            }
        }

        navigateToStep(targetStep);
        return true;
    }
};

// Utility functions for API responses and errors
const APIUtils = {
    // Handle API errors with user feedback
    handleError(error, context = '') {
        console.error(`API Error${context ? ` (${context})` : ''}:`, error);

        let message;
        if (error instanceof APIError) {
            message = error.getUserMessage();
        } else {
            message = 'An unexpected error occurred. Please try again.';
        }

        showMessage(message, 'error');
        return { success: false, error: message };
    },

    // Show loading state for API calls
    showLoading(element, text = 'Loading...') {
        if (element) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.textContent = text;
        }
    },

    // Hide loading state
    hideLoading(element) {
        if (element && element.dataset.originalText) {
            element.disabled = false;
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    },

    // Retry API call with exponential backoff
    async retryCall(apiCall, maxRetries = 3, baseDelay = 1000) {
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries || !(error instanceof APIError) || !error.isRetryable()) {
                    throw error;
                }

                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    },

    // Validate email addresses
    validateEmails(emailString) {
        const emails = emailString.split(',').map(email => email.trim()).filter(email => email);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmails = [];
        const invalidEmails = [];

        for (const email of emails) {
            if (emailRegex.test(email)) {
                validEmails.push(email);
            } else {
                invalidEmails.push(email);
            }
        }

        return { validEmails, invalidEmails, isValid: invalidEmails.length === 0 };
    }
};

// File upload configuration
const SUPPORTED_FORMATS = ['.txt', '.md', '.rtf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_MIME_TYPES = ['text/plain', 'text/markdown', 'application/rtf', 'text/rtf'];

// Validation configuration
const VALIDATION_CONFIG = {
    file: {
        maxSize: MAX_FILE_SIZE,
        supportedFormats: SUPPORTED_FORMATS,
        supportedMimeTypes: SUPPORTED_MIME_TYPES,
        minContentLength: 10, // Minimum characters in file content
        maxContentLength: 1000000 // Maximum characters (1MB of text)
    },
    instructions: {
        minLength: 5,
        maxLength: 2000,
        forbiddenPatterns: [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
            /javascript:/gi, // JavaScript protocol
            /on\w+\s*=/gi, // Event handlers
            /data:text\/html/gi // Data URLs with HTML
        ]
    },
    email: {
        maxRecipients: 10,
        maxSubjectLength: 200,
        maxMessageLength: 1000,
        emailRegex: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    },
    summary: {
        minLength: 10,
        maxLength: 50000
    }
};

// Input sanitization utilities
const InputSanitizer = {
    // Sanitize text input to prevent XSS
    sanitizeText(input) {
        if (typeof input !== 'string') return '';

        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    },

    // Sanitize HTML content while preserving basic formatting
    sanitizeHTML(input) {
        if (typeof input !== 'string') return '';

        // Allow only basic formatting tags
        const allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

        return input.replace(tagRegex, (match, tagName) => {
            if (allowedTags.includes(tagName.toLowerCase())) {
                return match;
            }
            return '';
        });
    },

    // Remove potentially dangerous patterns
    removeDangerousPatterns(input) {
        if (typeof input !== 'string') return '';

        let sanitized = input;
        VALIDATION_CONFIG.instructions.forbiddenPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });

        return sanitized;
    },

    // Validate and sanitize email addresses
    sanitizeEmail(email) {
        if (typeof email !== 'string') return '';

        return email.toLowerCase().trim().replace(/[^\w@.-]/g, '');
    }
};

// Enhanced validation utilities
const ValidationUtils = {
    // Validate file with comprehensive checks
    validateFile(file) {
        const errors = [];

        if (!file) {
            return { valid: false, errors: ['No file selected'] };
        }

        // Check file size
        if (file.size === 0) {
            errors.push('File is empty');
        } else if (file.size > VALIDATION_CONFIG.file.maxSize) {
            errors.push(`File size too large. Maximum size is ${formatFileSize(VALIDATION_CONFIG.file.maxSize)}`);
        }

        // Check file extension
        const fileName = file.name.toLowerCase();
        const hasValidExtension = VALIDATION_CONFIG.file.supportedFormats.some(ext => fileName.endsWith(ext));

        if (!hasValidExtension) {
            errors.push(`Unsupported file format. Please use: ${VALIDATION_CONFIG.file.supportedFormats.join(', ')}`);
        }

        // Check MIME type if available
        if (file.type && !VALIDATION_CONFIG.file.supportedMimeTypes.includes(file.type)) {
            errors.push('Invalid file type detected');
        }

        // Check for suspicious file names
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            errors.push('Invalid file name');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: []
        };
    },

    // Validate file content
    validateFileContent(content) {
        const errors = [];
        const warnings = [];

        if (!content || typeof content !== 'string') {
            return { valid: false, errors: ['No content found in file'] };
        }

        const length = content.length;

        if (length < VALIDATION_CONFIG.file.minContentLength) {
            errors.push(`File content too short. Minimum ${VALIDATION_CONFIG.file.minContentLength} characters required`);
        }

        if (length > VALIDATION_CONFIG.file.maxContentLength) {
            errors.push(`File content too long. Maximum ${VALIDATION_CONFIG.file.maxContentLength} characters allowed`);
        }

        // Check for suspicious content patterns
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];

        suspiciousPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                warnings.push('File contains potentially unsafe content that will be sanitized');
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    },

    // Validate instructions input
    validateInstructions(instructions) {
        const errors = [];
        const warnings = [];

        if (!instructions || typeof instructions !== 'string') {
            return { valid: true, errors: [], warnings: ['Using default instructions'] };
        }

        const sanitized = InputSanitizer.removeDangerousPatterns(instructions);
        const length = sanitized.length;

        if (length < VALIDATION_CONFIG.instructions.minLength) {
            errors.push(`Instructions too short. Minimum ${VALIDATION_CONFIG.instructions.minLength} characters required`);
        }

        if (length > VALIDATION_CONFIG.instructions.maxLength) {
            errors.push(`Instructions too long. Maximum ${VALIDATION_CONFIG.instructions.maxLength} characters allowed`);
        }

        if (sanitized !== instructions) {
            warnings.push('Instructions contained potentially unsafe content that was removed');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            sanitized: sanitized
        };
    },

    // Validate email addresses
    validateEmails(emailString) {
        const errors = [];
        const warnings = [];

        if (!emailString || typeof emailString !== 'string') {
            return { valid: false, errors: ['No email addresses provided'] };
        }

        const emails = emailString.split(',')
            .map(email => InputSanitizer.sanitizeEmail(email))
            .filter(email => email.length > 0);

        if (emails.length === 0) {
            return { valid: false, errors: ['No valid email addresses found'] };
        }

        if (emails.length > VALIDATION_CONFIG.email.maxRecipients) {
            errors.push(`Too many recipients. Maximum ${VALIDATION_CONFIG.email.maxRecipients} allowed`);
        }

        const validEmails = [];
        const invalidEmails = [];

        emails.forEach(email => {
            if (VALIDATION_CONFIG.email.emailRegex.test(email)) {
                validEmails.push(email);
            } else {
                invalidEmails.push(email);
            }
        });

        if (invalidEmails.length > 0) {
            errors.push(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            validEmails: validEmails,
            invalidEmails: invalidEmails
        };
    },

    // Validate email subject
    validateEmailSubject(subject) {
        const errors = [];

        if (!subject || typeof subject !== 'string') {
            return { valid: false, errors: ['Email subject is required'] };
        }

        const sanitized = InputSanitizer.sanitizeText(subject);

        if (sanitized.length === 0) {
            errors.push('Email subject cannot be empty');
        }

        if (sanitized.length > VALIDATION_CONFIG.email.maxSubjectLength) {
            errors.push(`Subject too long. Maximum ${VALIDATION_CONFIG.email.maxSubjectLength} characters allowed`);
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            sanitized: sanitized
        };
    },

    // Validate email message
    validateEmailMessage(message) {
        if (!message || typeof message !== 'string') {
            return { valid: true, sanitized: '' }; // Optional field
        }

        const errors = [];
        const sanitized = InputSanitizer.sanitizeText(message);

        if (sanitized.length > VALIDATION_CONFIG.email.maxMessageLength) {
            errors.push(`Message too long. Maximum ${VALIDATION_CONFIG.email.maxMessageLength} characters allowed`);
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            sanitized: sanitized
        };
    },

    // Validate summary content
    validateSummary(summary) {
        const errors = [];

        if (!summary || typeof summary !== 'string') {
            return { valid: false, errors: ['Summary content is required'] };
        }

        const sanitized = InputSanitizer.sanitizeHTML(summary);
        const length = sanitized.length;

        if (length < VALIDATION_CONFIG.summary.minLength) {
            errors.push(`Summary too short. Minimum ${VALIDATION_CONFIG.summary.minLength} characters required`);
        }

        if (length > VALIDATION_CONFIG.summary.maxLength) {
            errors.push(`Summary too long. Maximum ${VALIDATION_CONFIG.summary.maxLength} characters allowed`);
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            sanitized: sanitized
        };
    }
};

document.addEventListener('DOMContentLoaded', function () {
    console.log('AI Meeting Notes Summarizer loaded');

    // Try to restore previous state
    const stateRestored = StateManager.loadState();
    if (stateRestored) {
        console.log('Previous session restored');
        showMessage('Previous session restored', 'info');
    }

    initializeApp();

    // Run system check in background
    setTimeout(() => {
        WorkflowManager.runSystemCheck();
    }, 1000);

    // Navigate to appropriate step based on state
    if (stateRestored) {
        // Fix any workflow integrity issues
        WorkflowManager.fixWorkflowIssues().then(result => {
            if (!result.success) {
                showMessage('Session restored with some issues resolved', 'warning');
            }
        });
        let targetStep = 1;
        if (appState.summaryId && appState.generatedSummary) {
            targetStep = 4; // Editing step
        } else if (appState.customInstructions && (appState.transcriptContent || appState.fileId)) {
            targetStep = 3; // Summary generation step
        } else if (appState.transcriptContent || appState.fileId) {
            targetStep = 2; // Instructions step
        }

        if (targetStep > 1) {
            StateManager.navigateToStepSafely(targetStep);

            // Restore UI state for each step
            if (targetStep >= 2 && (appState.transcriptContent || appState.fileId)) {
                restoreFileUploadState();
            }
            if (targetStep >= 3 && appState.customInstructions) {
                restoreInstructionsState();
            }
            if (targetStep >= 4 && appState.generatedSummary) {
                restoreSummaryState();
            }
        }
    }
});

function initializeApp() {
    initializeFileUpload();
    initializeNavigation();
    initializeInstructions();
    initializeSummaryGeneration();
    initializeSummaryGenerationEnhanced();
    initializeEditing();
    initializeSharing();
    initializeClearButton();

    // Initialize validation system
    setupRealTimeValidation();

    // Set up error boundaries for critical functions
    setupErrorBoundaries();
}

// File Upload Component Implementation
function initializeFileUpload() {
    const fileDropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const continueBtn = document.getElementById('continue-to-instructions');

    // File select button click
    fileSelectBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop events
    fileDropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileDropZone.addEventListener('dragover', handleDragOver);
    fileDropZone.addEventListener('dragleave', handleDragLeave);
    fileDropZone.addEventListener('drop', handleFileDrop);

    // Continue button
    continueBtn.addEventListener('click', () => {
        navigateToStep(2);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    // Clear any previous error states
    clearValidationErrors('file-upload');

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        showValidationErrors('file-upload', validation.errors);
        return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => showMessage(warning, 'warning'));
    }

    // Show upload progress
    showUploadProgress();

    // Upload file with enhanced error handling
    uploadFile(file);
}

function validateFile(file) {
    return ValidationUtils.validateFile(file);
}

function showUploadProgress() {
    const progressContainer = document.getElementById('upload-progress');
    const progressFill = progressContainer.querySelector('.progress-fill');
    const progressText = progressContainer.querySelector('.progress-text');

    progressContainer.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading...';
}

async function uploadFile(file) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    let progressInterval;

    try {
        // Start upload progress animation
        let progress = 0;
        progressInterval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 80) progress = 80;

            progressFill.style.width = progress + '%';
            progressText.textContent = `Uploading... ${Math.round(progress)}%`;
        }, 150);

        // Upload file to backend with retry logic
        const response = await APIUtils.retryCall(
            () => apiClient.uploadFile(file),
            2, // Max 2 retries
            1000 // 1 second base delay
        );

        // Validate response content
        if (!response.file || !response.file.content) {
            throw new Error('Invalid response from server - no file content received');
        }

        // Validate file content
        const contentValidation = ValidationUtils.validateFileContent(response.file.content);
        if (!contentValidation.valid) {
            throw new Error(`File content validation failed: ${contentValidation.errors.join(', ')}`);
        }

        // Show content warnings if any
        if (contentValidation.warnings && contentValidation.warnings.length > 0) {
            contentValidation.warnings.forEach(warning => showMessage(warning, 'warning'));
        }

        // Complete progress animation
        clearInterval(progressInterval);
        progressInterval = null;
        progressFill.style.width = '100%';
        progressText.textContent = 'Upload complete!';

        // Store file data with sanitized content
        appState.uploadedFile = file;
        appState.fileId = response.file.id;
        appState.transcriptContent = InputSanitizer.removeDangerousPatterns(response.file.content);

        // Save state
        StateManager.updateActivity();

        // Show file preview
        setTimeout(() => {
            showFilePreview(response.file);
            hideUploadProgress();
        }, 500);

    } catch (error) {
        // Clear progress animation
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        hideUploadProgress();

        // Show specific error message based on error type
        let errorMessage = 'Upload failed. Please try again.';

        if (error instanceof APIError) {
            errorMessage = error.getUserMessage();
        } else if (error.message) {
            errorMessage = error.message;
        }

        showValidationErrors('file-upload', [errorMessage]);

        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';

        // Log detailed error for debugging
        console.error('File upload error:', error);
    }
}

function showFilePreview(fileData) {
    const previewContainer = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const transcriptPreview = document.getElementById('transcript-preview');
    const continueBtn = document.getElementById('continue-to-instructions');

    // Update file details
    fileName.textContent = fileData.originalName;
    fileSize.textContent = formatFileSize(fileData.size);

    // Show preview of content
    transcriptPreview.textContent = fileData.preview;

    // Show preview container and enable continue button
    previewContainer.classList.remove('hidden');
    continueBtn.disabled = false;

    showMessage(`File uploaded successfully! (${fileData.wordCount} words)`, 'success');
}

function hideUploadProgress() {
    const progressContainer = document.getElementById('upload-progress');
    progressContainer.classList.add('hidden');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error boundaries setup
function setupErrorBoundaries() {
    // Wrap critical async functions with error handling
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        try {
            return await originalFetch.apply(this, args);
        } catch (error) {
            ErrorBoundary.handleError(error, 'Fetch Request');
            throw error;
        }
    };

    // Wrap setTimeout and setInterval for better error handling
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
        return originalSetTimeout(() => {
            try {
                callback.apply(this, args);
            } catch (error) {
                ErrorBoundary.handleError(error, 'Timeout Callback');
            }
        }, delay);
    };
}

// Navigation functions
function initializeNavigation() {
    // Back buttons with error handling
    document.getElementById('back-to-upload')?.addEventListener('click', () => {
        try {
            navigateToStep(1);
        } catch (error) {
            ErrorBoundary.handleError(error, 'Navigation');
        }
    });

    document.getElementById('back-to-instructions')?.addEventListener('click', () => {
        try {
            navigateToStep(2);
        } catch (error) {
            ErrorBoundary.handleError(error, 'Navigation');
        }
    });

    document.getElementById('back-to-summary')?.addEventListener('click', () => {
        try {
            navigateToStep(3);
        } catch (error) {
            ErrorBoundary.handleError(error, 'Navigation');
        }
    });
}

function navigateToStep(step) {
    // Hide all sections
    document.querySelectorAll('.workflow-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const sections = ['upload-section', 'instructions-section', 'summary-section', 'editing-section'];
    const targetSection = document.getElementById(sections[step - 1]);
    if (targetSection) {
        targetSection.classList.add('active');
        appState.currentStep = step;

        // Save state when navigating
        StateManager.updateActivity();
    }
}

// Enhanced validation error display system
function showValidationErrors(context, errors) {
    if (!errors || errors.length === 0) return;

    // Find or create error container for this context
    let errorContainer = document.getElementById(`${context}-errors`);
    if (!errorContainer) {
        errorContainer = createErrorContainer(context);
    }

    // Clear existing errors
    errorContainer.innerHTML = '';

    // Add each error
    errors.forEach(error => {
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error';
        errorElement.innerHTML = `
            <span class="error-icon">⚠️</span>
            <span class="error-text">${InputSanitizer.sanitizeText(error)}</span>
        `;
        errorContainer.appendChild(errorElement);
    });

    // Show container
    errorContainer.classList.remove('hidden');

    // Add error styling to related inputs
    addErrorStyling(context);
}

function clearValidationErrors(context) {
    const errorContainer = document.getElementById(`${context}-errors`);
    if (errorContainer) {
        errorContainer.classList.add('hidden');
        errorContainer.innerHTML = '';
    }

    // Remove error styling
    removeErrorStyling(context);
}

function createErrorContainer(context) {
    const container = document.createElement('div');
    container.id = `${context}-errors`;
    container.className = 'validation-errors hidden';

    // Insert after the relevant form element
    const contextElement = getContextElement(context);
    if (contextElement) {
        contextElement.parentNode.insertBefore(container, contextElement.nextSibling);
    }

    return container;
}

function getContextElement(context) {
    switch (context) {
        case 'file-upload':
            return document.getElementById('file-drop-zone');
        case 'instructions':
            return document.getElementById('custom-instructions');
        case 'email-recipients':
            return document.getElementById('email-recipients');
        case 'email-subject':
            return document.getElementById('email-subject');
        case 'email-message':
            return document.getElementById('email-message');
        case 'summary-editor':
            return document.getElementById('summary-editor');
        default:
            return null;
    }
}

function addErrorStyling(context) {
    const element = getContextElement(context);
    if (element) {
        element.classList.add('validation-error-input');
    }
}

function removeErrorStyling(context) {
    const element = getContextElement(context);
    if (element) {
        element.classList.remove('validation-error-input');
    }
}

// Real-time validation for form inputs
function setupRealTimeValidation() {
    // Instructions textarea validation
    const instructionsTextarea = document.getElementById('custom-instructions');
    if (instructionsTextarea) {
        let validationTimeout;

        instructionsTextarea.addEventListener('input', function () {
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(() => {
                validateInstructionsInput();
            }, 500); // Debounce validation
        });

        instructionsTextarea.addEventListener('blur', validateInstructionsInput);
    }

    // Email recipients validation
    const emailRecipientsInput = document.getElementById('email-recipients');
    if (emailRecipientsInput) {
        let emailValidationTimeout;

        emailRecipientsInput.addEventListener('input', function () {
            clearTimeout(emailValidationTimeout);
            emailValidationTimeout = setTimeout(() => {
                validateEmailRecipientsInput();
            }, 800); // Longer debounce for email validation
        });

        emailRecipientsInput.addEventListener('blur', validateEmailRecipientsInput);
    }

    // Email subject validation
    const emailSubjectInput = document.getElementById('email-subject');
    if (emailSubjectInput) {
        emailSubjectInput.addEventListener('blur', validateEmailSubjectInput);
    }

    // Email message validation
    const emailMessageTextarea = document.getElementById('email-message');
    if (emailMessageTextarea) {
        emailMessageTextarea.addEventListener('blur', validateEmailMessageInput);
    }

    // Summary editor validation
    const summaryEditor = document.getElementById('summary-editor');
    if (summaryEditor) {
        let summaryValidationTimeout;

        summaryEditor.addEventListener('input', function () {
            clearTimeout(summaryValidationTimeout);
            summaryValidationTimeout = setTimeout(() => {
                validateSummaryInput();
            }, 1000); // Longer debounce for large text
        });
    }
}

// Individual validation functions
function validateInstructionsInput() {
    const textarea = document.getElementById('custom-instructions');
    if (!textarea) return;

    const value = textarea.value;
    const validation = ValidationUtils.validateInstructions(value);

    if (!validation.valid) {
        showValidationErrors('instructions', validation.errors);
    } else {
        clearValidationErrors('instructions');

        // Show warnings if any
        if (validation.warnings && validation.warnings.length > 0) {
            validation.warnings.forEach(warning => showMessage(warning, 'warning'));
        }

        // Update with sanitized content if different
        if (validation.sanitized && validation.sanitized !== value) {
            textarea.value = validation.sanitized;
            showMessage('Instructions were automatically cleaned for security', 'info');
        }
    }

    // Update continue button state
    updateContinueButton();
}

function validateEmailRecipientsInput() {
    const input = document.getElementById('email-recipients');
    if (!input) return;

    const value = input.value.trim();
    if (!value) {
        clearValidationErrors('email-recipients');
        updateSendButton();
        return;
    }

    const validation = ValidationUtils.validateEmails(value);

    if (!validation.valid) {
        showValidationErrors('email-recipients', validation.errors);
    } else {
        clearValidationErrors('email-recipients');

        // Show success feedback
        const successMessage = `${validation.validEmails.length} valid email${validation.validEmails.length !== 1 ? 's' : ''} found`;
        showValidationSuccess('email-recipients', successMessage);
    }

    updateSendButton();
}

function validateEmailSubjectInput() {
    const input = document.getElementById('email-subject');
    if (!input) return;

    const value = input.value;
    const validation = ValidationUtils.validateEmailSubject(value);

    if (!validation.valid) {
        showValidationErrors('email-subject', validation.errors);
    } else {
        clearValidationErrors('email-subject');

        // Update with sanitized content if different
        if (validation.sanitized !== value) {
            input.value = validation.sanitized;
        }
    }

    updateSendButton();
}

function validateEmailMessageInput() {
    const textarea = document.getElementById('email-message');
    if (!textarea) return;

    const value = textarea.value;
    const validation = ValidationUtils.validateEmailMessage(value);

    if (!validation.valid) {
        showValidationErrors('email-message', validation.errors);
    } else {
        clearValidationErrors('email-message');

        // Update with sanitized content if different
        if (validation.sanitized !== value) {
            textarea.value = validation.sanitized;
        }
    }
}

function validateSummaryInput() {
    const editor = document.getElementById('summary-editor');
    if (!editor) return;

    const value = editor.value;
    const validation = ValidationUtils.validateSummary(value);

    if (!validation.valid) {
        showValidationErrors('summary-editor', validation.errors);
    } else {
        clearValidationErrors('summary-editor');

        // Update with sanitized content if different
        if (validation.sanitized !== value) {
            editor.value = validation.sanitized;
            showMessage('Summary content was automatically cleaned for security', 'info');
        }
    }
}

function showValidationSuccess(context, message) {
    // Find or create success container
    let successContainer = document.getElementById(`${context}-success`);
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.id = `${context}-success`;
        successContainer.className = 'validation-success';

        const contextElement = getContextElement(context);
        if (contextElement) {
            contextElement.parentNode.insertBefore(successContainer, contextElement.nextSibling);
        }
    }

    successContainer.innerHTML = `
        <span class="success-icon">✓</span>
        <span class="success-text">${InputSanitizer.sanitizeText(message)}</span>
    `;
    successContainer.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
        successContainer.classList.add('hidden');
    }, 3000);
}

// Enhanced button state management
function updateContinueButton() {
    const continueBtn = document.getElementById('continue-to-summary');
    if (!continueBtn) return;

    const instructionsTextarea = document.getElementById('custom-instructions');
    const hasValidInstructions = instructionsTextarea &&
        (instructionsTextarea.value.trim().length >= VALIDATION_CONFIG.instructions.minLength ||
            instructionsTextarea.value.trim().length === 0); // Allow empty for default

    const hasTranscript = appState.transcriptContent || appState.fileId;

    continueBtn.disabled = !hasValidInstructions || !hasTranscript;
}

function updateSendButton() {
    const sendBtn = document.getElementById('send-email');
    if (!sendBtn) return;

    const recipientsInput = document.getElementById('email-recipients');
    const subjectInput = document.getElementById('email-subject');

    const hasValidRecipients = recipientsInput &&
        ValidationUtils.validateEmails(recipientsInput.value).valid;

    const hasValidSubject = subjectInput &&
        ValidationUtils.validateEmailSubject(subjectInput.value).valid;

    const hasSummary = appState.editedSummary || appState.generatedSummary;

    sendBtn.disabled = !hasValidRecipients || !hasValidSubject || !hasSummary;
}

// Error boundary implementation
class ErrorBoundary {
    static handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);

        // Log error details for debugging
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            appState: { ...appState, uploadedFile: null } // Don't log file object
        };

        // Store error for potential reporting
        try {
            const errors = JSON.parse(localStorage.getItem('app-errors') || '[]');
            errors.push(errorDetails);
            // Keep only last 10 errors
            if (errors.length > 10) errors.splice(0, errors.length - 10);
            localStorage.setItem('app-errors', JSON.stringify(errors));
        } catch (e) {
            console.warn('Failed to store error details:', e);
        }

        // Show user-friendly error message
        let userMessage = 'An unexpected error occurred. Please try again.';

        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            userMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (error.name === 'ValidationError') {
            userMessage = error.message;
        } else if (error.message.includes('timeout')) {
            userMessage = 'The operation timed out. Please try again.';
        }

        showMessage(userMessage, 'error');

        // Try to recover to a safe state
        this.recoverToSafeState(context);
    }

    static recoverToSafeState(context) {
        try {
            // Clear any loading states
            document.querySelectorAll('.btn').forEach(btn => {
                APIUtils.hideLoading(btn);
            });

            // Hide progress indicators
            document.querySelectorAll('.loading-spinner').forEach(spinner => {
                spinner.classList.add('hidden');
            });

            // Re-enable form inputs
            document.querySelectorAll('input, textarea, button').forEach(element => {
                if (!element.dataset.permanentlyDisabled) {
                    element.disabled = false;
                }
            });

            // Validate current workflow state
            WorkflowManager.fixWorkflowIssues();

        } catch (recoveryError) {
            console.error('Failed to recover to safe state:', recoveryError);
        }
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    ErrorBoundary.handleError(event.error, 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorBoundary.handleError(event.reason, 'Unhandled Promise Rejection');
});

// Message system
function showMessage(text, type = 'info') {
    const container = document.getElementById('message-container');
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;

    container.appendChild(message);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 5000);
}

// Custom Instructions Component Implementation
function initializeInstructions() {
    const templateButtons = document.querySelectorAll('.template-btn');
    const instructionsTextarea = document.getElementById('custom-instructions');
    const charCount = document.getElementById('char-count');
    const continueBtn = document.getElementById('continue-to-summary');

    // Template definitions
    const templates = {
        executive: `Create an executive summary focusing on:
- Key decisions made
- Strategic outcomes
- High-level action items
- Business impact
- Next steps for leadership`,

        'action-items': `Extract and organize action items with:
- Specific tasks to be completed
- Assigned owners/responsible parties
- Due dates and timelines
- Dependencies between tasks
- Priority levels`,

        detailed: `Provide a comprehensive summary including:
- Detailed discussion points
- All decisions and rationale
- Complete action items with owners
- Technical details discussed
- Follow-up meetings needed
- Resource requirements`,

        custom: ''
    };

    // Template button handlers
    templateButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            templateButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Set template content
            const template = button.dataset.template;
            const templateText = templates[template] || '';
            instructionsTextarea.value = templateText;

            // Update character count
            updateCharacterCount();

            // Store in app state
            appState.customInstructions = templateText;

            // Enable continue button if there's content or it's custom template
            updateContinueButton();
        });
    });

    // Textarea input handler
    instructionsTextarea.addEventListener('input', () => {
        updateCharacterCount();
        updateContinueButton();

        // Mark custom template as active if user types
        if (instructionsTextarea.value.trim()) {
            templateButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-template="custom"]').classList.add('active');
        }

        // Store in app state
        appState.customInstructions = instructionsTextarea.value;

        // Save state
        StateManager.updateActivity();
    });

    // Continue button
    continueBtn.addEventListener('click', () => {
        if (validateInstructions()) {
            navigateToStep(3);
            initiateSummaryGeneration();
        }
    });

    // Initialize with executive template selected
    document.querySelector('[data-template="executive"]').click();
}

function updateCharacterCount() {
    const instructionsTextarea = document.getElementById('custom-instructions');
    const charCount = document.getElementById('char-count');
    const length = instructionsTextarea.value.length;

    charCount.textContent = `${length} characters`;

    // Add warning for very long instructions
    if (length > 1000) {
        charCount.style.color = '#ffc107';
        charCount.textContent = `${length} characters (very long - may affect processing)`;
    } else if (length > 500) {
        charCount.style.color = '#fd7e14';
        charCount.textContent = `${length} characters (long)`;
    } else {
        charCount.style.color = '#6c757d';
        charCount.textContent = `${length} characters`;
    }
}

function updateContinueButton() {
    const instructionsTextarea = document.getElementById('custom-instructions');
    const continueBtn = document.getElementById('continue-to-summary');
    const hasInstructions = instructionsTextarea.value.trim().length > 0;

    continueBtn.disabled = !hasInstructions;
}

function validateInstructions() {
    const instructionsTextarea = document.getElementById('custom-instructions');
    const instructions = instructionsTextarea.value.trim();

    if (!instructions) {
        showMessage('Please provide summarization instructions or select a template.', 'error');
        return false;
    }

    if (instructions.length > 2000) {
        showMessage('Instructions are too long. Please keep them under 2000 characters for optimal processing.', 'error');
        return false;
    }

    return true;
}

// Summary generation initiation (placeholder for task 3.4)
function initiateSummaryGeneration() {
    // Will be implemented in task 3.4
    console.log('Initiating summary generation with instructions:', appState.customInstructions);
}

// Summary Generation Component Implementation
function initializeSummaryGeneration() {
    const retryBtn = document.getElementById('retry-generation');
    const continueBtn = document.getElementById('continue-to-edit');

    // Retry button handler
    retryBtn.addEventListener('click', () => {
        initiateSummaryGeneration();
    });

    // Continue to edit button
    continueBtn.addEventListener('click', () => {
        console.log('Edit Summary button clicked - navigating to step 4');
        navigateToStep(4);
        loadSummaryForEditing();
    });
}

// Summary generation initiation (updated implementation)
function initiateSummaryGeneration() {
    if (!appState.transcriptContent || !appState.customInstructions) {
        showMessage('Missing transcript or instructions. Please go back and complete previous steps.', 'error');
        return;
    }

    showGenerationProgress();
    generateSummary();
}

function showGenerationProgress() {
    const statusContainer = document.getElementById('generation-status');
    const spinner = statusContainer.querySelector('.loading-spinner');
    const statusMessage = document.getElementById('status-message');
    const retryBtn = document.getElementById('retry-generation');
    const summaryDisplay = document.getElementById('summary-display');
    const continueBtn = document.getElementById('continue-to-edit');

    // Show loading state
    spinner.classList.remove('hidden');
    statusMessage.textContent = 'Generating AI summary...';
    retryBtn.classList.add('hidden');
    summaryDisplay.classList.add('hidden');
    continueBtn.disabled = true;

    // Update status messages periodically
    const messages = [
        'Analyzing transcript content...',
        'Processing with AI service...',
        'Generating structured summary...',
        'Finalizing results...'
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
        if (messageIndex < messages.length - 1) {
            messageIndex++;
            statusMessage.textContent = messages[messageIndex];
        }
    }, 2000);

    // Store interval for cleanup
    appState.messageInterval = messageInterval;
}

async function generateSummary() {
    try {
        const startTime = Date.now();

        // Use file ID if available, otherwise use transcript content
        const response = await APIUtils.retryCall(async () => {
            if (appState.fileId) {
                return await apiClient.generateSummary(null, appState.customInstructions, appState.fileId);
            } else {
                return await apiClient.generateSummary(appState.transcriptContent, appState.customInstructions);
            }
        });

        const endTime = Date.now();
        const processingTime = Math.round((endTime - startTime) / 1000);

        // Store summary data
        appState.generatedSummary = response.summary.content;
        appState.summaryId = response.summary.id;

        // Save state
        StateManager.updateActivity();

        // Show success
        showGenerationSuccess(response.summary, processingTime);

    } catch (error) {
        console.error('Summary generation error:', error);
        showGenerationError(error);
    }
}

function showGenerationSuccess(summaryData, processingTime) {
    // Clear message interval
    if (appState.messageInterval) {
        clearInterval(appState.messageInterval);
    }

    const statusContainer = document.getElementById('generation-status');
    const spinner = statusContainer.querySelector('.loading-spinner');
    const statusMessage = document.getElementById('status-message');
    const retryBtn = document.getElementById('retry-generation');
    const summaryDisplay = document.getElementById('summary-display');
    const summaryContent = document.getElementById('summary-content');
    const wordCount = document.getElementById('summary-word-count');
    const generationTime = document.getElementById('generation-time');
    const continueBtn = document.getElementById('continue-to-edit');

    // Hide loading state
    spinner.classList.add('hidden');
    statusMessage.textContent = 'Summary generated successfully!';
    retryBtn.classList.add('hidden');

    // Show summary
    summaryContent.textContent = summaryData.content;
    wordCount.textContent = `${summaryData.wordCount || countWords(summaryData.content)} words`;

    // Show processing time and AI service info
    let timeText = `Generated in ${processingTime}s`;
    if (summaryData.metadata && summaryData.metadata.aiService) {
        timeText += ` using ${summaryData.metadata.aiService}`;
    }
    generationTime.textContent = timeText;

    summaryDisplay.classList.remove('hidden');
    continueBtn.disabled = false;

    // Debug logging
    console.log('Summary generation complete - button should be enabled:', !continueBtn.disabled);

    showMessage('Summary generated successfully!', 'success');
}

function showGenerationError(error) {
    // Clear message interval
    if (appState.messageInterval) {
        clearInterval(appState.messageInterval);
    }

    const statusContainer = document.getElementById('generation-status');
    const spinner = statusContainer.querySelector('.loading-spinner');
    const statusMessage = document.getElementById('status-message');
    const retryBtn = document.getElementById('retry-generation');
    const summaryDisplay = document.getElementById('summary-display');
    const continueBtn = document.getElementById('continue-to-edit');

    // Show error state
    spinner.classList.add('hidden');
    retryBtn.classList.remove('hidden');
    summaryDisplay.classList.add('hidden');
    continueBtn.disabled = true;

    // Determine error message
    let errorMessage = 'Failed to generate summary. ';
    if (error.message.includes('404')) {
        errorMessage += 'API endpoint not found.';
    } else if (error.message.includes('500')) {
        errorMessage += 'Server error occurred.';
    } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out.';
    } else {
        errorMessage += 'Please check your connection and try again.';
    }

    statusMessage.textContent = errorMessage;
    showMessage(errorMessage, 'error');
}

function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Summary Editing Component Implementation
function initializeEditing() {
    const summaryEditor = document.getElementById('summary-editor');
    const manualSaveBtn = document.getElementById('manual-save');
    const saveStatus = document.getElementById('save-status');
    const editWordCount = document.getElementById('edit-word-count');

    let autoSaveTimeout;
    let hasUnsavedChanges = false;

    // Editor input handler
    summaryEditor.addEventListener('input', () => {
        hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        updateEditWordCount();

        // Store in app state
        appState.editedSummary = summaryEditor.value;

        // Save state
        StateManager.updateActivity();

        // Clear existing auto-save timeout
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }

        // Set new auto-save timeout (2 seconds after user stops typing)
        autoSaveTimeout = setTimeout(() => {
            autoSaveSummary();
        }, 2000);
    });

    // Manual save button
    manualSaveBtn.addEventListener('click', () => {
        saveSummary();
    });

    // Prevent data loss on page unload
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
}

function loadSummaryForEditing() {
    const summaryEditor = document.getElementById('summary-editor');
    const editWordCount = document.getElementById('edit-word-count');

    // Load the generated summary into the editor
    summaryEditor.value = appState.generatedSummary;
    appState.editedSummary = appState.generatedSummary;

    // Update word count
    updateEditWordCount();

    // Set initial save status
    updateSaveStatus('saved');

    // Focus the editor
    summaryEditor.focus();
}

function updateEditWordCount() {
    const summaryEditor = document.getElementById('summary-editor');
    const editWordCount = document.getElementById('edit-word-count');
    const wordCount = countWords(summaryEditor.value);

    editWordCount.textContent = `${wordCount} words`;
}

function updateSaveStatus(status) {
    const saveStatus = document.getElementById('save-status');
    const manualSaveBtn = document.getElementById('manual-save');

    if (status === 'saved') {
        saveStatus.textContent = 'Saved';
        saveStatus.className = 'save-indicator';
        manualSaveBtn.disabled = true;
    } else if (status === 'unsaved') {
        saveStatus.textContent = 'Unsaved changes';
        saveStatus.className = 'save-indicator unsaved';
        manualSaveBtn.disabled = false;
    } else if (status === 'saving') {
        saveStatus.textContent = 'Saving...';
        saveStatus.className = 'save-indicator';
        manualSaveBtn.disabled = true;
    } else if (status === 'error') {
        saveStatus.textContent = 'Save failed';
        saveStatus.className = 'save-indicator unsaved';
        manualSaveBtn.disabled = false;
    }
}

async function autoSaveSummary() {
    if (!hasUnsavedChanges) return;

    try {
        updateSaveStatus('saving');
        await saveSummaryToServer();
        updateSaveStatus('saved');
        hasUnsavedChanges = false;
    } catch (error) {
        console.error('Auto-save failed:', error);
        updateSaveStatus('error');
        // Don't show error message for auto-save failures to avoid spam
    }
}

async function saveSummary() {
    try {
        updateSaveStatus('saving');
        await saveSummaryToServer();
        updateSaveStatus('saved');
        hasUnsavedChanges = false;
        showMessage('Summary saved successfully!', 'success');
    } catch (error) {
        console.error('Manual save failed:', error);
        updateSaveStatus('error');
        showMessage('Failed to save summary. Please try again.', 'error');
    }
}

async function saveSummaryToServer() {
    if (!appState.summaryId) {
        throw new Error('No summary ID available');
    }

    const response = await apiClient.updateSummary(appState.summaryId, appState.editedSummary);
    return response;
}

// Email Sharing Component Implementation
function initializeSharing() {
    const emailInput = document.getElementById('email-recipients');
    const subjectInput = document.getElementById('email-subject');
    const messageTextarea = document.getElementById('email-message');
    const previewBtn = document.getElementById('preview-email');
    const sendBtn = document.getElementById('send-email');
    const startNewBtn = document.getElementById('start-new');

    // Email input validation
    emailInput.addEventListener('input', validateEmailInput);
    emailInput.addEventListener('blur', validateEmailInput);

    // Subject input handler
    subjectInput.addEventListener('input', () => {
        validateSharingForm();
    });

    // Message textarea handler
    messageTextarea.addEventListener('input', () => {
        validateSharingForm();
    });

    // Preview button
    previewBtn.addEventListener('click', () => {
        if (validateSharingForm()) {
            showEmailPreview();
        }
    });

    // Send button
    sendBtn.addEventListener('click', () => {
        if (validateSharingForm()) {
            sendEmail();
        }
    });

    // Start new button
    startNewBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to start a new summary? Any unsaved changes will be lost.')) {
            resetApplication();
        }
    });

    // Initialize modal handlers
    initializeEmailModal();

    // Set default subject
    const today = new Date().toLocaleDateString();
    subjectInput.value = `Meeting Summary - ${today}`;
}

function validateEmailInput() {
    const emailInput = document.getElementById('email-recipients');

    if (!emailInput.value.trim()) {
        emailInput.style.borderColor = '#dee2e6';
        validateSharingForm();
        return true;
    }

    const emailValidation = APIUtils.validateEmails(emailInput.value);

    // Visual feedback
    if (emailValidation.isValid) {
        emailInput.style.borderColor = '#28a745';
    } else {
        emailInput.style.borderColor = '#dc3545';
    }

    validateSharingForm();
    return emailValidation.isValid;
}

function validateSharingForm() {
    const emailInput = document.getElementById('email-recipients');
    const subjectInput = document.getElementById('email-subject');
    const sendBtn = document.getElementById('send-email');

    const emailValidation = APIUtils.validateEmails(emailInput.value);
    const hasValidEmails = emailValidation.validEmails.length > 0;
    const hasSubject = subjectInput.value.trim().length > 0;
    const hasSummary = appState.editedSummary && appState.editedSummary.trim().length > 0;

    const isValid = hasValidEmails && hasSubject && hasSummary;
    sendBtn.disabled = !isValid;

    return isValid;
}

function showEmailPreview() {
    const emailInput = document.getElementById('email-recipients');
    const subjectInput = document.getElementById('email-subject');
    const messageTextarea = document.getElementById('email-message');
    const modal = document.getElementById('email-preview-modal');
    const previewContent = document.getElementById('email-preview-content');

    // Prepare email content
    const recipients = emailInput.value.split(',').map(email => email.trim()).filter(email => email);
    const subject = subjectInput.value.trim();
    const customMessage = messageTextarea.value.trim();

    let emailContent = `To: ${recipients.join(', ')}\n`;
    emailContent += `Subject: ${subject}\n\n`;

    if (customMessage) {
        emailContent += `${customMessage}\n\n`;
        emailContent += `--- Meeting Summary ---\n\n`;
    }

    emailContent += appState.editedSummary;

    // Show preview
    previewContent.textContent = emailContent;
    modal.classList.remove('hidden');
}

function initializeEmailModal() {
    const modal = document.getElementById('email-preview-modal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const confirmBtn = document.getElementById('confirm-send');

    // Close modal handlers
    closeBtn.addEventListener('click', hideEmailPreview);
    cancelBtn.addEventListener('click', hideEmailPreview);

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideEmailPreview();
        }
    });

    // Confirm send
    confirmBtn.addEventListener('click', () => {
        hideEmailPreview();
        sendEmail();
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            hideEmailPreview();
        }
    });
}

function hideEmailPreview() {
    const modal = document.getElementById('email-preview-modal');
    modal.classList.add('hidden');
}

async function sendEmail() {
    const emailInput = document.getElementById('email-recipients');
    const subjectInput = document.getElementById('email-subject');
    const messageTextarea = document.getElementById('email-message');
    const sendBtn = document.getElementById('send-email');

    try {
        // Validate email addresses first
        const emailValidation = APIUtils.validateEmails(emailInput.value);
        if (!emailValidation.isValid) {
            showMessage(`Invalid email addresses: ${emailValidation.invalidEmails.join(', ')}`, 'error');
            return;
        }

        // Show loading state
        APIUtils.showLoading(sendBtn, 'Sending...');

        // Send email using API client with retry
        const response = await APIUtils.retryCall(async () => {
            return await apiClient.shareSummary(
                appState.summaryId,
                emailValidation.validEmails,
                subjectInput.value.trim(),
                messageTextarea.value.trim(),
                'Meeting Summarizer'
            );
        });

        // Show success message
        let successMessage = `Summary sent successfully to ${response.share.recipients.length} recipient(s)!`;
        if (response.share.rejectedRecipients && response.share.rejectedRecipients.length > 0) {
            successMessage += ` (${response.share.rejectedRecipients.length} addresses were rejected)`;
        }
        showMessage(successMessage, 'success');

        // Reset form
        resetSharingForm();

    } catch (error) {
        APIUtils.handleError(error, 'email sending');
    } finally {
        // Hide loading state
        APIUtils.hideLoading(sendBtn);
        validateSharingForm(); // Re-validate to set correct disabled state
    }
}

function resetSharingForm() {
    const emailInput = document.getElementById('email-recipients');
    const messageTextarea = document.getElementById('email-message');

    emailInput.value = '';
    messageTextarea.value = '';
    emailInput.style.borderColor = '#dee2e6';

    validateSharingForm();
}

function resetApplication() {
    // Reset app state
    appState = {
        currentStep: 1,
        uploadedFile: null,
        fileId: null,
        transcriptContent: '',
        customInstructions: '',
        generatedSummary: '',
        editedSummary: '',
        summaryId: null
    };

    // Clear saved state
    StateManager.clearState();

    // Reset UI
    navigateToStep(1);

    // Reset file upload
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('continue-to-instructions').disabled = true;

    // Reset instructions
    document.getElementById('custom-instructions').value = '';
    document.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));

    // Reset summary section
    document.getElementById('summary-display').classList.add('hidden');
    document.getElementById('continue-to-edit').disabled = true;

    // Reset editor
    document.getElementById('summary-editor').value = '';

    // Reset sharing form
    resetSharingForm();

    showMessage('Application reset. You can start a new summary.', 'info');
}
// Instructions Component Implementation with Enhanced Validation
function initializeInstructions() {
    const instructionsTextarea = document.getElementById('custom-instructions');
    const templateButtons = document.querySelectorAll('.template-btn');
    const continueBtn = document.getElementById('continue-to-summary');
    const charCount = document.getElementById('char-count');

    // Template button handlers
    templateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            try {
                const template = btn.dataset.template;
                handleTemplateSelection(template, btn);
            } catch (error) {
                ErrorBoundary.handleError(error, 'Template Selection');
            }
        });
    });

    // Instructions textarea handlers
    if (instructionsTextarea) {
        instructionsTextarea.addEventListener('input', () => {
            try {
                updateCharacterCount();
                updateContinueButton();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Instructions Input');
            }
        });

        instructionsTextarea.addEventListener('paste', (e) => {
            try {
                // Validate pasted content
                setTimeout(() => {
                    const pastedContent = instructionsTextarea.value;
                    const validation = ValidationUtils.validateInstructions(pastedContent);

                    if (validation.sanitized !== pastedContent) {
                        instructionsTextarea.value = validation.sanitized;
                        showMessage('Pasted content was automatically cleaned for security', 'info');
                    }

                    updateCharacterCount();
                    validateInstructionsInput();
                }, 10);
            } catch (error) {
                ErrorBoundary.handleError(error, 'Paste Handler');
            }
        });
    }

    // Continue button handler
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            try {
                handleInstructionsContinue();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Instructions Continue');
            }
        });
    }
}

function handleTemplateSelection(template, buttonElement) {
    const instructionsTextarea = document.getElementById('custom-instructions');
    if (!instructionsTextarea) return;

    // Clear previous validation errors
    clearValidationErrors('instructions');

    // Remove active class from all buttons
    document.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));

    // Add active class to selected button
    buttonElement.classList.add('active');

    // Set template content
    const templates = {
        'executive': `Create an executive summary focusing on:
- Key decisions made
- Strategic outcomes
- High-level action items
- Business impact
- Next steps for leadership`,

        'action-items': `Extract and organize action items with:
- Specific tasks identified
- Assigned owners/responsible parties
- Due dates and timelines
- Dependencies between tasks
- Priority levels`,

        'detailed': `Provide a comprehensive summary including:
- Complete discussion overview
- All decisions and rationale
- Detailed action items with context
- Key quotes and insights
- Follow-up requirements
- Technical details discussed`,

        'custom': ''
    };

    const templateContent = templates[template] || '';
    instructionsTextarea.value = templateContent;

    // Store in app state
    appState.customInstructions = templateContent;

    // Update UI
    updateCharacterCount();
    updateContinueButton();

    // Validate the template content
    if (templateContent) {
        validateInstructionsInput();
    }

    // Save state
    StateManager.updateActivity();
}

function updateCharacterCount() {
    const instructionsTextarea = document.getElementById('custom-instructions');
    const charCount = document.getElementById('char-count');

    if (!instructionsTextarea || !charCount) return;

    const length = instructionsTextarea.value.length;
    const maxLength = VALIDATION_CONFIG.instructions.maxLength;

    charCount.textContent = `${length} characters`;

    // Update styling based on length
    charCount.classList.remove('warning', 'error');

    if (length > maxLength * 0.9) {
        charCount.classList.add('warning');
    }

    if (length > maxLength) {
        charCount.classList.add('error');
    }
}

function handleInstructionsContinue() {
    const instructionsTextarea = document.getElementById('custom-instructions');
    if (!instructionsTextarea) return;

    const instructions = instructionsTextarea.value.trim();

    // Validate instructions
    const validation = ValidationUtils.validateInstructions(instructions);

    if (!validation.valid) {
        showValidationErrors('instructions', validation.errors);
        return;
    }

    // Use sanitized instructions
    const finalInstructions = validation.sanitized || instructions;

    // Store in app state
    appState.customInstructions = finalInstructions;

    // Update textarea with sanitized content if different
    if (finalInstructions !== instructions) {
        instructionsTextarea.value = finalInstructions;
        showMessage('Instructions were automatically cleaned for security', 'info');
    }

    // Save state and navigate
    StateManager.updateActivity();
    navigateToStep(3);
}

// Summary Generation Component Implementation with Enhanced Error Handling
function initializeSummaryGenerationEnhanced() {
    const continueBtn = document.getElementById('continue-to-summary');
    const retryBtn = document.getElementById('retry-generation');
    const editBtn = document.getElementById('continue-to-edit');

    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            try {
                generateSummary();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Summary Generation');
            }
        });
    }

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            try {
                generateSummary();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Summary Retry');
            }
        });
    }

    // Edit Summary button handler
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            try {
                console.log('Edit Summary button clicked - navigating to step 4');
                navigateToStep(4);
                loadSummaryForEditing();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Edit Summary Navigation');
            }
        });
    }
}

async function generateSummary() {
    const statusMessage = document.getElementById('status-message');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const retryBtn = document.getElementById('retry-generation');
    const continueBtn = document.getElementById('continue-to-edit');

    try {
        // Validate prerequisites
        if (!appState.transcriptContent && !appState.fileId) {
            throw new Error('No transcript content available. Please upload a file first.');
        }

        // Show loading state
        if (statusMessage) statusMessage.textContent = 'Generating AI summary...';
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        if (retryBtn) retryBtn.classList.add('hidden');

        // Prepare request data
        const instructions = appState.customInstructions || 'Create a comprehensive summary of this meeting transcript.';

        // Generate summary with retry logic
        const response = await APIUtils.retryCall(
            () => apiClient.generateSummary(
                appState.transcriptContent,
                instructions,
                appState.fileId
            ),
            3, // Max 3 retries for AI generation
            2000 // 2 second base delay
        );

        // Validate response
        if (!response.summary || !response.summary.content) {
            throw new Error('Invalid response from AI service - no summary content received');
        }

        // Validate summary content
        const summaryValidation = ValidationUtils.validateSummary(response.summary.content);
        if (!summaryValidation.valid) {
            throw new Error(`Generated summary validation failed: ${summaryValidation.errors.join(', ')}`);
        }

        // Store summary data
        appState.generatedSummary = summaryValidation.sanitized;
        appState.editedSummary = summaryValidation.sanitized;
        appState.summaryId = response.summary.id;

        // Update UI
        displayGeneratedSummary(response.summary);

        // Hide loading state
        if (statusMessage) statusMessage.textContent = 'Summary generated successfully!';
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        if (continueBtn) continueBtn.disabled = false;

        // Save state
        StateManager.updateActivity();

        showMessage('Summary generated successfully!', 'success');

    } catch (error) {
        // Hide loading state
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        if (retryBtn) retryBtn.classList.remove('hidden');

        // Show error message
        let errorMessage = 'Failed to generate summary. Please try again.';

        if (error instanceof APIError) {
            errorMessage = error.getUserMessage();
            if (statusMessage) statusMessage.textContent = errorMessage;
        } else if (error.message) {
            errorMessage = error.message;
            if (statusMessage) statusMessage.textContent = errorMessage;
        }

        showMessage(errorMessage, 'error');

        // Log detailed error
        console.error('Summary generation error:', error);
    }
}

function displayGeneratedSummary(summaryData) {
    const summaryDisplay = document.getElementById('summary-display');
    const summaryContent = document.getElementById('summary-content');
    const wordCount = document.getElementById('summary-word-count');
    const generationTime = document.getElementById('generation-time');

    if (summaryContent) {
        // Sanitize and display content
        const sanitizedContent = InputSanitizer.sanitizeHTML(summaryData.content);
        summaryContent.innerHTML = sanitizedContent.replace(/\n/g, '<br>');
    }

    if (wordCount) {
        const words = countWords(summaryData.content);
        wordCount.textContent = `${words} words`;
    }

    if (generationTime && summaryData.processingTime) {
        generationTime.textContent = `Generated in ${summaryData.processingTime}ms`;
    }

    if (summaryDisplay) {
        summaryDisplay.classList.remove('hidden');
    }
}

// Editing Component Implementation with Enhanced Validation
function initializeEditing() {
    const summaryEditor = document.getElementById('summary-editor');
    const manualSaveBtn = document.getElementById('manual-save');
    const startNewBtn = document.getElementById('start-new');

    if (summaryEditor) {
        // Auto-save functionality with validation
        let saveTimeout;
        summaryEditor.addEventListener('input', () => {
            try {
                clearTimeout(saveTimeout);
                updateEditWordCount();
                updateSaveStatus('editing');

                saveTimeout = setTimeout(() => {
                    autoSaveSummary();
                }, 2000); // Auto-save after 2 seconds of inactivity
            } catch (error) {
                ErrorBoundary.handleError(error, 'Summary Editing');
            }
        });

        summaryEditor.addEventListener('blur', () => {
            try {
                validateSummaryInput();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Summary Validation');
            }
        });
    }

    if (manualSaveBtn) {
        manualSaveBtn.addEventListener('click', () => {
            try {
                manualSaveSummary();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Manual Save');
            }
        });
    }

    if (startNewBtn) {
        startNewBtn.addEventListener('click', () => {
            try {
                startNewSummary();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Start New');
            }
        });
    }
}

function updateEditWordCount() {
    const summaryEditor = document.getElementById('summary-editor');
    const wordCountElement = document.getElementById('edit-word-count');

    if (!summaryEditor || !wordCountElement) return;

    const words = countWords(summaryEditor.value);
    wordCountElement.textContent = `${words} words`;
}

function updateSaveStatus(status) {
    const saveStatus = document.getElementById('save-status');
    if (!saveStatus) return;

    const statusMap = {
        'editing': { text: 'Editing...', class: 'editing' },
        'saving': { text: 'Saving...', class: 'saving' },
        'saved': { text: 'Saved', class: 'saved' },
        'error': { text: 'Save failed', class: 'error' }
    };

    const statusInfo = statusMap[status] || statusMap['saved'];
    saveStatus.textContent = statusInfo.text;
    saveStatus.className = `save-indicator ${statusInfo.class}`;
}

async function autoSaveSummary() {
    const summaryEditor = document.getElementById('summary-editor');
    if (!summaryEditor || !appState.summaryId) return;

    try {
        updateSaveStatus('saving');

        const content = summaryEditor.value;
        const validation = ValidationUtils.validateSummary(content);

        if (!validation.valid) {
            updateSaveStatus('error');
            return;
        }

        // Save to backend
        await apiClient.updateSummary(appState.summaryId, validation.sanitized);

        // Update app state
        appState.editedSummary = validation.sanitized;
        StateManager.updateActivity();

        updateSaveStatus('saved');

    } catch (error) {
        updateSaveStatus('error');
        console.error('Auto-save failed:', error);
    }
}

async function manualSaveSummary() {
    const summaryEditor = document.getElementById('summary-editor');
    const manualSaveBtn = document.getElementById('manual-save');

    if (!summaryEditor || !appState.summaryId) return;

    try {
        APIUtils.showLoading(manualSaveBtn, 'Saving...');
        updateSaveStatus('saving');

        const content = summaryEditor.value;
        const validation = ValidationUtils.validateSummary(content);

        if (!validation.valid) {
            showValidationErrors('summary-editor', validation.errors);
            updateSaveStatus('error');
            return;
        }

        // Update editor with sanitized content if different
        if (validation.sanitized !== content) {
            summaryEditor.value = validation.sanitized;
            showMessage('Summary content was automatically cleaned for security', 'info');
        }

        // Save to backend
        await apiClient.updateSummary(appState.summaryId, validation.sanitized);

        // Update app state
        appState.editedSummary = validation.sanitized;
        StateManager.updateActivity();

        updateSaveStatus('saved');
        showMessage('Summary saved successfully!', 'success');

    } catch (error) {
        updateSaveStatus('error');
        APIUtils.handleError(error, 'manual save');
    } finally {
        APIUtils.hideLoading(manualSaveBtn);
    }
}

function startNewSummary() {
    if (confirm('Are you sure you want to start a new summary? Any unsaved changes will be lost.')) {
        // Clear app state
        appState.currentStep = 1;
        appState.uploadedFile = null;
        appState.fileId = null;
        appState.transcriptContent = '';
        appState.customInstructions = '';
        appState.generatedSummary = '';
        appState.editedSummary = '';
        appState.summaryId = null;

        // Clear saved state
        StateManager.clearState();

        // Navigate to upload step
        navigateToStep(1);

        // Clear all forms
        document.querySelectorAll('input, textarea').forEach(element => {
            element.value = '';
        });

        // Clear validation errors
        document.querySelectorAll('.validation-errors').forEach(container => {
            container.classList.add('hidden');
        });

        showMessage('Started new summary session', 'info');
    }
}

// Sharing Component Implementation with Enhanced Validation
function initializeSharing() {
    const sendEmailBtn = document.getElementById('send-email');
    const previewEmailBtn = document.getElementById('preview-email');
    const emailRecipientsInput = document.getElementById('email-recipients');
    const emailSubjectInput = document.getElementById('email-subject');

    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', () => {
            try {
                handleEmailSend();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Email Send');
            }
        });
    }

    if (previewEmailBtn) {
        previewEmailBtn.addEventListener('click', () => {
            try {
                showEmailPreview();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Email Preview');
            }
        });
    }

    // Real-time validation for email inputs
    if (emailRecipientsInput) {
        emailRecipientsInput.addEventListener('input', () => {
            try {
                updateSendButton();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Email Input Validation');
            }
        });
    }

    if (emailSubjectInput) {
        emailSubjectInput.addEventListener('input', () => {
            try {
                updateSendButton();
            } catch (error) {
                ErrorBoundary.handleError(error, 'Subject Input Validation');
            }
        });
    }

    // Set default subject
    if (emailSubjectInput && !emailSubjectInput.value) {
        const today = new Date().toLocaleDateString();
        emailSubjectInput.value = `Meeting Summary - ${today}`;
    }
}

async function handleEmailSend() {
    // Validate all email inputs
    const recipientsInput = document.getElementById('email-recipients');
    const subjectInput = document.getElementById('email-subject');
    const messageTextarea = document.getElementById('email-message');
    const sendBtn = document.getElementById('send-email');

    if (!recipientsInput || !subjectInput) return;

    try {
        // Clear previous validation errors
        clearValidationErrors('email-recipients');
        clearValidationErrors('email-subject');
        clearValidationErrors('email-message');

        // Validate recipients
        const recipientsValidation = ValidationUtils.validateEmails(recipientsInput.value);
        if (!recipientsValidation.valid) {
            showValidationErrors('email-recipients', recipientsValidation.errors);
            return;
        }

        // Validate subject
        const subjectValidation = ValidationUtils.validateEmailSubject(subjectInput.value);
        if (!subjectValidation.valid) {
            showValidationErrors('email-subject', subjectValidation.errors);
            return;
        }

        // Validate message (optional)
        const messageValidation = ValidationUtils.validateEmailMessage(messageTextarea?.value || '');
        if (!messageValidation.valid) {
            showValidationErrors('email-message', messageValidation.errors);
            return;
        }

        // Validate summary exists
        if (!appState.summaryId) {
            showMessage('No summary available to share. Please generate a summary first.', 'error');
            return;
        }

        // Show loading state
        APIUtils.showLoading(sendBtn, 'Sending...');

        // Send email
        const response = await APIUtils.retryCall(
            () => apiClient.shareSummary(
                appState.summaryId,
                recipientsValidation.validEmails,
                subjectValidation.sanitized,
                messageValidation.sanitized,
                'Meeting Organizer' // Default sender name
            ),
            2, // Max 2 retries for email
            3000 // 3 second base delay
        );

        // Show success message
        showMessage(`Email sent successfully to ${recipientsValidation.validEmails.length} recipient(s)!`, 'success');

        // Clear form
        recipientsInput.value = '';
        if (messageTextarea) messageTextarea.value = '';

    } catch (error) {
        APIUtils.handleError(error, 'email sending');
    } finally {
        APIUtils.hideLoading(sendBtn);
    }
}

function showEmailPreview() {
    const recipientsInput = document.getElementById('email-recipients');
    const subjectInput = document.getElementById('email-subject');
    const messageTextarea = document.getElementById('email-message');
    const modal = document.getElementById('email-preview-modal');
    const previewContent = document.getElementById('email-preview-content');

    if (!recipientsInput || !subjectInput || !modal || !previewContent) return;

    // Validate inputs first
    const recipientsValidation = ValidationUtils.validateEmails(recipientsInput.value);
    const subjectValidation = ValidationUtils.validateEmailSubject(subjectInput.value);

    if (!recipientsValidation.valid || !subjectValidation.valid) {
        showMessage('Please fix validation errors before previewing', 'warning');
        return;
    }

    // Generate preview HTML
    const summary = appState.editedSummary || appState.generatedSummary;
    const customMessage = messageTextarea?.value || '';

    const previewHTML = `
        <div class="email-preview-header">
            <strong>To:</strong> ${recipientsValidation.validEmails.join(', ')}<br>
            <strong>Subject:</strong> ${InputSanitizer.sanitizeText(subjectValidation.sanitized)}
        </div>
        <div class="email-preview-body">
            ${customMessage ? `<p>${InputSanitizer.sanitizeText(customMessage)}</p><hr>` : ''}
            <h3>Meeting Summary</h3>
            <div class="summary-content">${InputSanitizer.sanitizeHTML(summary)}</div>
        </div>
    `;

    previewContent.innerHTML = previewHTML;
    modal.classList.remove('hidden');

    // Set up modal close handlers
    setupModalHandlers(modal);
}

function setupModalHandlers(modal) {
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const confirmBtn = modal.querySelector('#confirm-send');

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            closeModal();
            handleEmailSend();
        };
    }
}

// Utility function for word counting
function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Load summary for editing
function loadSummaryForEditing() {
    const summaryEditor = document.getElementById('summary-editor');
    if (!summaryEditor) return;

    const content = appState.editedSummary || appState.generatedSummary;
    if (content) {
        summaryEditor.value = content;
        updateEditWordCount();
        updateSaveStatus('saved');
    }
}

// Clear All Button Implementation
function initializeClearButton() {
    const clearBtn = document.getElementById('clear-all-btn');
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Show confirmation dialog
            const confirmed = confirm('Are you sure you want to start over? This will clear all uploaded files, summaries, and progress.');
            
            if (confirmed) {
                clearAllData();
            }
        });
    }
}

function clearAllData() {
    try {
        console.log('Clearing all application data...');
        
        // Reset application state
        appState.currentStep = 1;
        appState.uploadedFile = null;
        appState.fileId = null;
        appState.transcriptContent = '';
        appState.customInstructions = '';
        appState.generatedSummary = '';
        appState.editedSummary = '';
        appState.summaryId = null;
        
        // Clear localStorage
        StateManager.clearState();
        
        // Reset all form elements
        resetAllForms();
        
        // Navigate back to step 1
        navigateToStep(1);
        
        // Show success message
        showMessage('All data cleared. Starting fresh!', 'success');
        
        console.log('Application reset completed');
        
    } catch (error) {
        console.error('Error clearing data:', error);
        showMessage('Error clearing data. Please refresh the page.', 'error');
    }
}

function resetAllForms() {
    // Reset file upload section
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const continueUploadBtn = document.getElementById('continue-to-instructions');
    
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.classList.add('hidden');
    if (continueUploadBtn) continueUploadBtn.disabled = true;
    
    // Reset instructions section
    const instructionsTextarea = document.getElementById('custom-instructions');
    const continueInstructionsBtn = document.getElementById('continue-to-summary');
    const templateButtons = document.querySelectorAll('.template-btn');
    
    if (instructionsTextarea) instructionsTextarea.value = '';
    if (continueInstructionsBtn) continueInstructionsBtn.disabled = true;
    templateButtons.forEach(btn => btn.classList.remove('active'));
    
    // Reset summary section
    const summaryDisplay = document.getElementById('summary-display');
    const summaryContent = document.getElementById('summary-content');
    const continueEditBtn = document.getElementById('continue-to-edit');
    const retryBtn = document.getElementById('retry-generation');
    
    if (summaryDisplay) summaryDisplay.classList.add('hidden');
    if (summaryContent) summaryContent.textContent = '';
    if (continueEditBtn) continueEditBtn.disabled = true;
    if (retryBtn) retryBtn.classList.add('hidden');
    
    // Reset editing section
    const summaryEditor = document.getElementById('summary-editor');
    const emailRecipients = document.getElementById('email-recipients');
    const emailSubject = document.getElementById('email-subject');
    const emailMessage = document.getElementById('email-message');
    const sendEmailBtn = document.getElementById('send-email');
    
    if (summaryEditor) summaryEditor.value = '';
    if (emailRecipients) emailRecipients.value = '';
    if (emailSubject) emailSubject.value = '';
    if (emailMessage) emailMessage.value = '';
    if (sendEmailBtn) sendEmailBtn.disabled = true;
    
    // Reset status messages
    const statusMessage = document.getElementById('status-message');
    const loadingSpinner = document.querySelector('.loading-spinner');
    
    if (statusMessage) statusMessage.textContent = 'Ready to upload a file';
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
    
    // Clear any error messages
    document.querySelectorAll('.error-message').forEach(msg => msg.remove());
    
    console.log('All forms and UI elements reset');
}