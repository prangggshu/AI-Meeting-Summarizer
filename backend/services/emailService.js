const nodemailer = require('nodemailer');

/**
 * Email Service for sending summary emails
 */
class EmailService {
    constructor(config = null) {
        this.transporter = null;
        this.initialized = false;
        this.config = config;
    }

    /**
     * Initialize the email service with SMTP configuration
     */
    async initialize() {
        try {
            // Get configuration from environment validation if available
            let emailConfig = null;
            if (this.config) {
                emailConfig = this.config;
            } else {
                try {
                    const { getConfig } = require('../config/envValidation');
                    emailConfig = getConfig('email');
                } catch (error) {
                    console.warn('Environment validation not available, using fallback configuration');
                    return this.initializeFallback();
                }
            }

            if (!emailConfig || !emailConfig.smtp.host || !emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass) {
                console.warn('Email service not configured - missing required SMTP settings');
                return false;
            }

            // Create transporter with validated configuration
            this.transporter = nodemailer.createTransport({
                host: emailConfig.smtp.host,
                port: emailConfig.smtp.port,
                secure: emailConfig.smtp.secure,
                auth: {
                    user: emailConfig.smtp.auth.user,
                    pass: emailConfig.smtp.auth.pass
                },
                connectionTimeout: emailConfig.timeout || 10000,
                greetingTimeout: emailConfig.timeout || 10000,
                socketTimeout: emailConfig.timeout || 10000,
                tls: {
                    rejectUnauthorized: false // Allow self-signed certificates for development
                }
            });

            // Verify connection
            await this.transporter.verify();
            this.initialized = true;
            this.emailConfig = emailConfig;
            console.log('✅ Email service initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize email service:', error.message);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Fallback initialization using environment variables directly
     */
    async initializeFallback() {
        try {
            const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
            const missingVars = requiredVars.filter(varName => !process.env[varName]);
            
            if (missingVars.length > 0) {
                console.warn(`Email service not configured. Missing environment variables: ${missingVars.join(', ')}`);
                return false;
            }

            // Create transporter with environment variables
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Verify connection
            await this.transporter.verify();
            this.initialized = true;
            
            // Create fallback config object
            this.emailConfig = {
                from: process.env.EMAIL_FROM,
                fromName: process.env.EMAIL_FROM_NAME || 'Meeting Summarizer',
                maxRecipients: parseInt(process.env.EMAIL_MAX_RECIPIENTS) || 10
            };
            
            console.log('Email service initialized with fallback configuration');
            return true;

        } catch (error) {
            console.error('Failed to initialize email service with fallback:', error.message);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Check if email service is properly configured and initialized
     */
    isConfigured() {
        return this.initialized && this.transporter !== null;
    }

    /**
     * Validate email addresses
     */
    validateEmails(emails) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        const errors = [];
        const validEmails = [];
        const maxRecipients = this.emailConfig?.maxRecipients || 10;

        // Check recipient limit
        if (emails.length > maxRecipients) {
            errors.push(`Too many recipients. Maximum ${maxRecipients} allowed, got ${emails.length}`);
            return { validEmails: [], errors };
        }

        for (const email of emails) {
            const trimmedEmail = email.trim().toLowerCase();
            if (!trimmedEmail) {
                errors.push('Empty email address found');
                continue;
            }
            
            if (trimmedEmail.length > 254) { // RFC 5321 limit
                errors.push(`Email address too long: ${trimmedEmail.substring(0, 50)}...`);
                continue;
            }
            
            if (!emailRegex.test(trimmedEmail)) {
                errors.push(`Invalid email format: ${trimmedEmail}`);
                continue;
            }
            
            // Check for duplicates
            if (validEmails.includes(trimmedEmail)) {
                errors.push(`Duplicate email address: ${trimmedEmail}`);
                continue;
            }
            
            validEmails.push(trimmedEmail);
        }

        return { validEmails, errors };
    }

    /**
     * Generate HTML email template for summary sharing
     */
    generateEmailTemplate(summary, customMessage = '') {
        const { content, instructions, sourceFile, createdAt, metadata } = summary;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Summary</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid #e1e5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 28px;
        }
        .meta-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 25px;
            border-left: 4px solid #007bff;
        }
        .meta-info h3 {
            margin: 0 0 10px 0;
            color: #495057;
            font-size: 16px;
        }
        .meta-item {
            margin: 5px 0;
            font-size: 14px;
            color: #6c757d;
        }
        .summary-content {
            background-color: #ffffff;
            padding: 25px;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            margin: 20px 0;
        }
        .summary-content h2 {
            color: #2c3e50;
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 22px;
        }
        .summary-text {
            white-space: pre-wrap;
            line-height: 1.7;
            font-size: 15px;
        }
        .custom-message {
            background-color: #e8f4fd;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 25px;
            border-left: 4px solid #17a2b8;
        }
        .custom-message h3 {
            margin: 0 0 10px 0;
            color: #0c5460;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e5e9;
            font-size: 12px;
            color: #6c757d;
            text-align: center;
        }
        .powered-by {
            margin-top: 15px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 Meeting Summary</h1>
        </div>
        
        ${customMessage ? `
        <div class="custom-message">
            <h3>Message from sender:</h3>
            <p>${customMessage}</p>
        </div>
        ` : ''}
        
        <div class="meta-info">
            <h3>Summary Details</h3>
            <div class="meta-item"><strong>Generated:</strong> ${new Date(createdAt).toLocaleString()}</div>
            ${sourceFile ? `<div class="meta-item"><strong>Source File:</strong> ${sourceFile.originalName}</div>` : ''}
            <div class="meta-item"><strong>Instructions:</strong> ${instructions}</div>
            ${metadata?.aiService ? `<div class="meta-item"><strong>AI Service:</strong> ${metadata.aiService}</div>` : ''}
        </div>
        
        <div class="summary-content">
            <h2>Summary Content</h2>
            <div class="summary-text">${content}</div>
        </div>
        
        <div class="footer">
            <p>This summary was generated automatically and may require review.</p>
            <div class="powered-by">Powered by AI Meeting Notes Summarizer</div>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Send summary email to recipients
     */
    async sendSummaryEmail(recipients, summary, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not properly configured');
        }

        const { subject, customMessage, senderName } = options;
        
        // Validate recipients
        const { validEmails, errors } = this.validateEmails(recipients);
        
        if (errors.length > 0) {
            throw new Error(`Email validation failed: ${errors.join(', ')}`);
        }

        if (validEmails.length === 0) {
            throw new Error('No valid email addresses provided');
        }

        // Generate email content
        const htmlContent = this.generateEmailTemplate(summary, customMessage);
        const defaultSubject = `Meeting Summary - ${new Date(summary.createdAt).toLocaleDateString()}`;
        
        // Prepare email options
        const fromName = senderName || this.emailConfig?.fromName || 'Meeting Summarizer';
        const fromEmail = this.emailConfig?.from || process.env.EMAIL_FROM;
        
        const mailOptions = {
            from: `${fromName} <${fromEmail}>`,
            to: validEmails.join(', '),
            subject: subject || defaultSubject,
            html: htmlContent,
            text: this.generatePlainTextVersion(summary, customMessage),
            headers: {
                'X-Mailer': 'AI Meeting Notes Summarizer',
                'X-Priority': '3'
            }
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            
            return {
                success: true,
                messageId: info.messageId,
                recipients: validEmails,
                rejectedRecipients: info.rejected || [],
                response: info.response
            };

        } catch (error) {
            console.error('Failed to send email:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    /**
     * Generate plain text version of the email
     */
    generatePlainTextVersion(summary, customMessage = '') {
        const { content, instructions, sourceFile, createdAt, metadata } = summary;
        
        let text = 'MEETING SUMMARY\n';
        text += '===============\n\n';
        
        if (customMessage) {
            text += `Message from sender:\n${customMessage}\n\n`;
        }
        
        text += 'Summary Details:\n';
        text += `Generated: ${new Date(createdAt).toLocaleString()}\n`;
        if (sourceFile) {
            text += `Source File: ${sourceFile.originalName}\n`;
        }
        text += `Instructions: ${instructions}\n`;
        if (metadata?.aiService) {
            text += `AI Service: ${metadata.aiService}\n`;
        }
        text += '\n';
        
        text += 'Summary Content:\n';
        text += '----------------\n';
        text += content;
        text += '\n\n';
        
        text += '---\n';
        text += 'This summary was generated automatically and may require review.\n';
        text += 'Powered by AI Meeting Notes Summarizer';
        
        return text;
    }

    /**
     * Test email configuration
     */
    async testConfiguration() {
        if (!this.isConfigured()) {
            return { success: false, error: 'Email service not configured' };
        }

        try {
            await this.transporter.verify();
            return { success: true, message: 'Email configuration is valid' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = {
    EmailService,
    emailService
};