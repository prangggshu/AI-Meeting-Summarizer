const express = require('express');
const { emailService } = require('../services/emailService');

const router = express.Router();

// Validation middleware for share requests
const validateShareRequest = (req, res, next) => {
    const { summaryId, recipients, subject, customMessage } = req.body;
    
    // Validate summary ID
    if (!summaryId || typeof summaryId !== 'string') {
        return res.status(400).json({
            error: 'Invalid summary ID',
            message: 'Summary ID must be provided as a string'
        });
    }
    
    // Check if summary exists
    if (!global.summaries || !global.summaries.has(summaryId)) {
        return res.status(404).json({
            error: 'Summary not found',
            message: 'The specified summary could not be found'
        });
    }
    
    // Validate recipients
    if (!recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
            error: 'Invalid recipients',
            message: 'Recipients must be provided as an array of email addresses'
        });
    }
    
    if (recipients.length === 0) {
        return res.status(400).json({
            error: 'No recipients',
            message: 'At least one recipient email address must be provided'
        });
    }
    
    // Validate recipients array length (reasonable limit)
    if (recipients.length > 50) {
        return res.status(400).json({
            error: 'Too many recipients',
            message: 'Maximum of 50 recipients allowed per email'
        });
    }
    
    // Validate subject if provided
    if (subject && typeof subject !== 'string') {
        return res.status(400).json({
            error: 'Invalid subject',
            message: 'Subject must be a string'
        });
    }
    
    // Validate custom message if provided
    if (customMessage && typeof customMessage !== 'string') {
        return res.status(400).json({
            error: 'Invalid custom message',
            message: 'Custom message must be a string'
        });
    }
    
    // Validate subject and message length
    if (subject && subject.length > 200) {
        return res.status(400).json({
            error: 'Subject too long',
            message: 'Subject must be 200 characters or less'
        });
    }
    
    if (customMessage && customMessage.length > 1000) {
        return res.status(400).json({
            error: 'Message too long',
            message: 'Custom message must be 1000 characters or less'
        });
    }
    
    next();
};

// POST /api/share - Share summary via email
router.post('/share', validateShareRequest, async (req, res) => {
    try {
        const { summaryId, recipients, subject, customMessage, senderName } = req.body;
        
        // Check if email service is configured
        if (!emailService.isConfigured()) {
            // Try to initialize email service
            const initialized = await emailService.initialize();
            if (!initialized) {
                return res.status(503).json({
                    error: 'Email service unavailable',
                    message: 'Email service is not properly configured. Please contact the administrator.'
                });
            }
        }
        
        // Get summary data
        const summaryData = global.summaries.get(summaryId);
        
        console.log(`Sharing summary ${summaryId} with ${recipients.length} recipients`);
        
        // Send email
        const emailResult = await emailService.sendSummaryEmail(recipients, summaryData, {
            subject: subject?.trim(),
            customMessage: customMessage?.trim(),
            senderName: senderName?.trim()
        });
        
        // Create share record
        const shareRecord = {
            id: require('uuid').v4(),
            summaryId: summaryId,
            recipients: emailResult.recipients,
            rejectedRecipients: emailResult.rejectedRecipients,
            subject: subject?.trim() || `Meeting Summary - ${new Date(summaryData.createdAt).toLocaleDateString()}`,
            customMessage: customMessage?.trim() || '',
            senderName: senderName?.trim() || 'Meeting Summarizer',
            sentAt: new Date().toISOString(),
            messageId: emailResult.messageId,
            status: 'sent'
        };
        
        // Store share record (in a real app, this would be in a database)
        if (!global.shareRecords) {
            global.shareRecords = new Map();
        }
        global.shareRecords.set(shareRecord.id, shareRecord);
        
        // Update summary with share history
        summaryData.shareHistory = summaryData.shareHistory || [];
        summaryData.shareHistory.push({
            shareId: shareRecord.id,
            recipients: emailResult.recipients,
            sentAt: shareRecord.sentAt
        });
        
        console.log(`Summary shared successfully. Message ID: ${emailResult.messageId}`);
        
        // Return success response
        res.json({
            success: true,
            share: {
                id: shareRecord.id,
                summaryId: summaryId,
                recipients: emailResult.recipients,
                rejectedRecipients: emailResult.rejectedRecipients,
                subject: shareRecord.subject,
                sentAt: shareRecord.sentAt,
                messageId: emailResult.messageId,
                status: 'sent'
            }
        });
        
    } catch (error) {
        console.error('Email sharing error:', error);
        
        // Handle specific email errors
        if (error.message.includes('Email validation failed')) {
            return res.status(400).json({
                error: 'Invalid email addresses',
                message: error.message
            });
        }
        
        if (error.message.includes('No valid email addresses')) {
            return res.status(400).json({
                error: 'No valid recipients',
                message: 'No valid email addresses were provided'
            });
        }
        
        if (error.message.includes('Failed to send email')) {
            return res.status(503).json({
                error: 'Email delivery failed',
                message: 'Failed to send email. Please try again later.'
            });
        }
        
        // Generic error response
        res.status(500).json({
            error: 'Sharing failed',
            message: 'An error occurred while sharing the summary. Please try again.'
        });
    }
});

// GET /api/share/:id - Get share record details
router.get('/share/:id', (req, res) => {
    try {
        const shareId = req.params.id;
        
        if (!global.shareRecords || !global.shareRecords.has(shareId)) {
            return res.status(404).json({
                error: 'Share record not found',
                message: 'The requested share record could not be found'
            });
        }
        
        const shareRecord = global.shareRecords.get(shareId);
        
        res.json({
            success: true,
            share: {
                id: shareRecord.id,
                summaryId: shareRecord.summaryId,
                recipients: shareRecord.recipients,
                rejectedRecipients: shareRecord.rejectedRecipients,
                subject: shareRecord.subject,
                customMessage: shareRecord.customMessage,
                senderName: shareRecord.senderName,
                sentAt: shareRecord.sentAt,
                messageId: shareRecord.messageId,
                status: shareRecord.status
            }
        });
        
    } catch (error) {
        console.error('Share record retrieval error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'An error occurred while retrieving the share record'
        });
    }
});

// GET /api/email/status - Get email service status
router.get('/email/status', async (req, res) => {
    try {
        const isConfigured = emailService.isConfigured();
        let testResult = null;
        
        if (isConfigured) {
            testResult = await emailService.testConfiguration();
        } else {
            // Try to initialize
            const initialized = await emailService.initialize();
            if (initialized) {
                testResult = await emailService.testConfiguration();
            }
        }
        
        res.json({
            success: true,
            emailService: {
                configured: emailService.isConfigured(),
                status: testResult ? (testResult.success ? 'healthy' : 'error') : 'not_configured',
                message: testResult ? testResult.message || testResult.error : 'Email service not configured',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Email status check error:', error);
        res.status(500).json({
            error: 'Status check failed',
            message: 'Unable to check email service status'
        });
    }
});

module.exports = router;