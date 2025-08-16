// Service Status Routes
const express = require('express');
const router = express.Router();

// Import services
const { aiServiceManager } = require('../services/aiService');
const { emailService } = require('../services/emailService');

/**
 * GET /api/services/status
 * Get status of all services (AI and Email)
 */
router.get('/services/status', async (req, res) => {
    try {
        // Get AI services status
        const aiServicesStatus = await aiServiceManager.validateServices();
        
        // Get email service status
        let emailStatus;
        try {
            if (emailService.isConfigured()) {
                const testResult = await emailService.testConfiguration();
                emailStatus = {
                    configured: true,
                    connected: testResult.success,
                    status: testResult.success ? 'healthy' : 'error',
                    error: testResult.error || null,
                    message: testResult.message || 'Email service is operational'
                };
            } else {
                emailStatus = {
                    configured: false,
                    connected: false,
                    status: 'not_configured',
                    message: 'Email service is not configured. Please check SMTP settings.'
                };
            }
        } catch (error) {
            emailStatus = {
                configured: false,
                connected: false,
                status: 'error',
                error: error.message,
                message: 'Failed to check email service status'
            };
        }

        // Determine overall system health
        const aiHealthy = Object.values(aiServicesStatus).some(service => service.status === 'healthy');
        const emailHealthy = emailStatus.status === 'healthy';
        
        const overallStatus = {
            healthy: aiHealthy && emailHealthy,
            ai: aiHealthy,
            email: emailHealthy
        };

        res.json({
            status: overallStatus.healthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                ai: aiServicesStatus,
                email: emailStatus
            },
            overall: overallStatus,
            recommendations: generateRecommendations(aiServicesStatus, emailStatus)
        });

    } catch (error) {
        console.error('Error checking services status:', error);
        res.status(500).json({
            error: 'Failed to check services status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/services/ai/status
 * Get detailed AI services status
 */
router.get('/services/ai/status', async (req, res) => {
    try {
        const aiServicesStatus = await aiServiceManager.validateServices();
        const servicesInfo = aiServiceManager.getServicesStatus();
        
        res.json({
            status: 'success',
            timestamp: new Date().toISOString(),
            services: aiServicesStatus,
            configuration: servicesInfo,
            currentService: aiServiceManager.getCurrentService()?.getServiceStatus() || null
        });

    } catch (error) {
        console.error('Error checking AI services status:', error);
        res.status(500).json({
            error: 'Failed to check AI services status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/services/email/status
 * Get detailed email service status
 */
router.get('/services/email/status', async (req, res) => {
    try {
        let emailStatus;
        
        if (emailService.isConfigured()) {
            const testResult = await emailService.testConfiguration();
            emailStatus = {
                configured: true,
                connected: testResult.success,
                status: testResult.success ? 'healthy' : 'error',
                error: testResult.error || null,
                message: testResult.message || 'Email service is operational',
                configuration: {
                    host: emailService.emailConfig?.smtp?.host || 'Not configured',
                    port: emailService.emailConfig?.smtp?.port || 'Not configured',
                    secure: emailService.emailConfig?.smtp?.secure || false,
                    from: emailService.emailConfig?.from || 'Not configured',
                    maxRecipients: emailService.emailConfig?.maxRecipients || 10
                }
            };
        } else {
            emailStatus = {
                configured: false,
                connected: false,
                status: 'not_configured',
                message: 'Email service is not configured. Please check SMTP settings.',
                configuration: null
            };
        }

        res.json({
            status: 'success',
            timestamp: new Date().toISOString(),
            emailService: emailStatus
        });

    } catch (error) {
        console.error('Error checking email service status:', error);
        res.status(500).json({
            error: 'Failed to check email service status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/services/email/test
 * Test email service by sending a test email
 */
router.post('/services/email/test', async (req, res) => {
    try {
        const { recipient } = req.body;
        
        if (!recipient) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Recipient email address is required'
            });
        }

        if (!emailService.isConfigured()) {
            return res.status(503).json({
                error: 'Service Unavailable',
                message: 'Email service is not configured'
            });
        }

        // Validate recipient email
        const { validEmails, errors } = emailService.validateEmails([recipient]);
        
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: `Invalid email address: ${errors.join(', ')}`
            });
        }

        // Create test summary
        const testSummary = {
            content: `This is a test email from the AI Meeting Notes Summarizer.

If you received this email, your email configuration is working correctly!

Test Details:
- Timestamp: ${new Date().toISOString()}
- Service: Email Configuration Test
- Status: Successful

You can safely ignore this email.`,
            instructions: 'Email configuration test',
            createdAt: new Date().toISOString(),
            metadata: {
                aiService: 'Test Service',
                test: true
            }
        };

        // Send test email
        const result = await emailService.sendSummaryEmail(
            validEmails,
            testSummary,
            {
                subject: 'AI Meeting Notes Summarizer - Email Test',
                customMessage: 'This is a test email to verify your email configuration is working correctly.',
                senderName: 'System Test'
            }
        );

        res.json({
            status: 'success',
            message: 'Test email sent successfully',
            result: {
                messageId: result.messageId,
                recipients: result.recipients,
                rejectedRecipients: result.rejectedRecipients
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            error: 'Failed to send test email',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/services/ai/test
 * Test AI service by generating a test summary
 */
router.post('/services/ai/test', async (req, res) => {
    try {
        const testTranscript = `Test Meeting Transcript

Attendees: John Doe, Jane Smith
Date: ${new Date().toLocaleDateString()}
Duration: 5 minutes

Discussion:
- Reviewed the AI summarization service test
- Confirmed that the service is working correctly
- Agreed to proceed with implementation

Action Items:
- Complete service testing (Owner: System)
- Verify all components are functional (Owner: System)

Next Steps:
- Continue with normal operations
- Monitor service performance

End of test transcript.`;

        const testInstructions = 'Create a brief summary of this test meeting transcript. Focus on key points and action items.';

        // Generate test summary
        const result = await aiServiceManager.generateSummary(testTranscript, testInstructions);

        res.json({
            status: 'success',
            message: 'AI service test completed successfully',
            result: {
                summary: result.content,
                metadata: result.metadata,
                serviceUsed: result.metadata.successfulService
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error testing AI service:', error);
        res.status(500).json({
            error: 'Failed to test AI service',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Generate recommendations based on service status
 */
function generateRecommendations(aiServicesStatus, emailStatus) {
    const recommendations = [];

    // AI service recommendations
    const aiServices = Object.entries(aiServicesStatus);
    const healthyAiServices = aiServices.filter(([, status]) => status.status === 'healthy');
    
    if (healthyAiServices.length === 0) {
        recommendations.push({
            type: 'critical',
            service: 'ai',
            message: 'No AI services are available. Please check your API keys and network connection.',
            action: 'Verify GROQ_API_KEY and OPENAI_API_KEY in your environment configuration.'
        });
    } else if (healthyAiServices.length === 1) {
        recommendations.push({
            type: 'warning',
            service: 'ai',
            message: 'Only one AI service is available. Consider configuring a backup service.',
            action: 'Add a secondary AI service API key for redundancy.'
        });
    }

    // Check specific AI service issues
    aiServices.forEach(([serviceName, status]) => {
        if (!status.configured) {
            recommendations.push({
                type: 'info',
                service: 'ai',
                message: `${serviceName} is not configured.`,
                action: `Add ${serviceName.toUpperCase()}_API_KEY to your environment configuration.`
            });
        } else if (!status.connected) {
            recommendations.push({
                type: 'warning',
                service: 'ai',
                message: `${serviceName} is configured but not responding.`,
                action: `Check your ${serviceName.toUpperCase()}_API_KEY and network connectivity.`
            });
        }
    });

    // Email service recommendations
    if (!emailStatus.configured) {
        recommendations.push({
            type: 'warning',
            service: 'email',
            message: 'Email service is not configured. Summary sharing will not work.',
            action: 'Configure SMTP settings (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM) in your environment.'
        });
    } else if (emailStatus.status === 'error') {
        recommendations.push({
            type: 'error',
            service: 'email',
            message: 'Email service is configured but not working properly.',
            action: 'Check your SMTP credentials and server settings. Test with /api/services/email/test endpoint.'
        });
    }

    // General recommendations
    if (recommendations.length === 0) {
        recommendations.push({
            type: 'success',
            service: 'general',
            message: 'All services are healthy and operational.',
            action: 'No action required. System is ready for use.'
        });
    }

    return recommendations;
}

module.exports = router;