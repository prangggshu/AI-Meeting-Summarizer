const request = require('supertest');
const app = require('../backend/server');
const { emailService } = require('../backend/services/emailService');
const { aiServiceManager } = require('../backend/services/aiService');

// Mock the email service
jest.mock('../backend/services/emailService', () => ({
    emailService: {
        isConfigured: jest.fn(),
        initialize: jest.fn(),
        sendSummaryEmail: jest.fn(),
        testConfiguration: jest.fn()
    }
}));

// Mock the AI service manager
jest.mock('../backend/services/aiService', () => ({
    aiServiceManager: {
        generateSummary: jest.fn()
    }
}));

describe('Email Sharing API', () => {
    let summaryId;

    beforeEach(async () => {
        jest.clearAllMocks();
        // Clear global storage
        global.uploadedFiles = new Map();
        global.summaries = new Map();
        global.shareRecords = new Map();

        // Mock AI service response
        aiServiceManager.generateSummary.mockResolvedValue({
            content: 'Test summary content for email sharing.',
            metadata: {
                service: 'groq',
                model: 'llama3-8b-8192',
                tokensUsed: 150,
                successfulService: 'Groq',
                processingTime: 1500
            }
        });

        // Create a summary to share
        const response = await request(app)
            .post('/api/summarize')
            .send({
                transcript: 'Test transcript for email sharing'
            });

        summaryId = response.body.summary.id;

        // Mock email service as configured by default
        emailService.isConfigured.mockReturnValue(true);
    });

    describe('POST /api/share', () => {
        const mockEmailResult = {
            success: true,
            messageId: 'test-message-id-123',
            recipients: ['test@example.com'],
            rejectedRecipients: [],
            response: '250 OK'
        };

        beforeEach(() => {
            emailService.sendSummaryEmail.mockResolvedValue(mockEmailResult);
        });

        it('should successfully share summary via email', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com'],
                    subject: 'Test Meeting Summary',
                    customMessage: 'Please review this summary.'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.share).toHaveProperty('id');
            expect(response.body.share.summaryId).toBe(summaryId);
            expect(response.body.share.recipients).toEqual(['test@example.com']);
            expect(response.body.share.subject).toBe('Test Meeting Summary');
            expect(response.body.share.messageId).toBe('test-message-id-123');
            expect(response.body.share.status).toBe('sent');

            expect(emailService.sendSummaryEmail).toHaveBeenCalledWith(
                ['test@example.com'],
                expect.any(Object), // summary data
                {
                    subject: 'Test Meeting Summary',
                    customMessage: 'Please review this summary.',
                    senderName: undefined
                }
            );
        });

        it('should share with multiple recipients', async () => {
            const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
            emailService.sendSummaryEmail.mockResolvedValue({
                ...mockEmailResult,
                recipients: recipients
            });

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: recipients
                })
                .expect(200);

            expect(response.body.share.recipients).toEqual(recipients);
        });

        it('should use default subject when none provided', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com']
                })
                .expect(200);

            expect(response.body.share.subject).toContain('Meeting Summary');
            expect(response.body.share.subject).toContain(new Date().toLocaleDateString());
        });

        it('should handle custom sender name', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com'],
                    senderName: 'John Doe'
                })
                .expect(200);

            expect(emailService.sendSummaryEmail).toHaveBeenCalledWith(
                ['test@example.com'],
                expect.any(Object),
                expect.objectContaining({
                    senderName: 'John Doe'
                })
            );
        });

        it('should trim whitespace from inputs', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['  test@example.com  '],
                    subject: '  Test Subject  ',
                    customMessage: '  Test message  ',
                    senderName: '  John Doe  '
                })
                .expect(200);

            expect(response.body.share.subject).toBe('Test Subject');
        });

        it('should reject request with invalid summary ID', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: 123, // Not a string
                    recipients: ['test@example.com']
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid summary ID');
        });

        it('should reject request with non-existent summary ID', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: 'non-existent-id',
                    recipients: ['test@example.com']
                })
                .expect(404);

            expect(response.body.error).toBe('Summary not found');
        });

        it('should reject request with invalid recipients', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: 'not-an-array'
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid recipients');
        });

        it('should reject request with no recipients', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: []
                })
                .expect(400);

            expect(response.body.error).toBe('No recipients');
        });

        it('should reject request with too many recipients', async () => {
            const tooManyRecipients = Array.from({ length: 51 }, (_, i) => `user${i}@example.com`);
            
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: tooManyRecipients
                })
                .expect(400);

            expect(response.body.error).toBe('Too many recipients');
        });

        it('should reject request with invalid subject type', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com'],
                    subject: 123
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid subject');
        });

        it('should reject request with subject too long', async () => {
            const longSubject = 'x'.repeat(201);
            
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com'],
                    subject: longSubject
                })
                .expect(400);

            expect(response.body.error).toBe('Subject too long');
        });

        it('should reject request with custom message too long', async () => {
            const longMessage = 'x'.repeat(1001);
            
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com'],
                    customMessage: longMessage
                })
                .expect(400);

            expect(response.body.error).toBe('Message too long');
        });

        it('should handle email service not configured', async () => {
            emailService.isConfigured.mockReturnValue(false);
            emailService.initialize.mockResolvedValue(false);

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com']
                })
                .expect(503);

            expect(response.body.error).toBe('Email service unavailable');
        });

        it('should initialize email service if not configured', async () => {
            emailService.isConfigured.mockReturnValue(false);
            emailService.initialize.mockResolvedValue(true);

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com']
                })
                .expect(200);

            expect(emailService.initialize).toHaveBeenCalled();
            expect(response.body.success).toBe(true);
        });

        it('should handle email validation errors', async () => {
            emailService.sendSummaryEmail.mockRejectedValue(
                new Error('Email validation failed: Invalid email format: invalid-email')
            );

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['invalid-email']
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid email addresses');
        });

        it('should handle email sending failures', async () => {
            emailService.sendSummaryEmail.mockRejectedValue(
                new Error('Failed to send email: SMTP connection failed')
            );

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com']
                })
                .expect(503);

            expect(response.body.error).toBe('Email delivery failed');
        });

        it('should handle generic errors', async () => {
            emailService.sendSummaryEmail.mockRejectedValue(
                new Error('Unexpected error')
            );

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com']
                })
                .expect(500);

            expect(response.body.error).toBe('Sharing failed');
        });

        it('should store share record and update summary history', async () => {
            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com']
                })
                .expect(200);

            const shareId = response.body.share.id;
            
            // Check that share record was stored
            expect(global.shareRecords.has(shareId)).toBe(true);
            
            // Check that summary history was updated
            const summary = global.summaries.get(summaryId);
            expect(summary.shareHistory).toHaveLength(1);
            expect(summary.shareHistory[0].shareId).toBe(shareId);
        });

        it('should handle rejected recipients', async () => {
            emailService.sendSummaryEmail.mockResolvedValue({
                ...mockEmailResult,
                recipients: ['valid@example.com'],
                rejectedRecipients: ['invalid@example.com']
            });

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['valid@example.com', 'invalid@example.com']
                })
                .expect(200);

            expect(response.body.share.recipients).toEqual(['valid@example.com']);
            expect(response.body.share.rejectedRecipients).toEqual(['invalid@example.com']);
        });
    });

    describe('GET /api/share/:id', () => {
        let shareId;

        beforeEach(async () => {
            // Create a share record first
            emailService.sendSummaryEmail.mockResolvedValue({
                success: true,
                messageId: 'test-message-id',
                recipients: ['test@example.com'],
                rejectedRecipients: []
            });

            const response = await request(app)
                .post('/api/share')
                .send({
                    summaryId: summaryId,
                    recipients: ['test@example.com'],
                    subject: 'Test Subject',
                    customMessage: 'Test message'
                });

            shareId = response.body.share.id;
        });

        it('should retrieve share record by ID', async () => {
            const response = await request(app)
                .get(`/api/share/${shareId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.share.id).toBe(shareId);
            expect(response.body.share.summaryId).toBe(summaryId);
            expect(response.body.share.recipients).toEqual(['test@example.com']);
            expect(response.body.share.subject).toBe('Test Subject');
            expect(response.body.share.customMessage).toBe('Test message');
        });

        it('should return 404 for non-existent share record', async () => {
            const response = await request(app)
                .get('/api/share/non-existent-id')
                .expect(404);

            expect(response.body.error).toBe('Share record not found');
        });
    });

    describe('GET /api/email/status', () => {
        it('should return email service status when configured', async () => {
            emailService.isConfigured.mockReturnValue(true);
            emailService.testConfiguration.mockResolvedValue({
                success: true,
                message: 'Email configuration is valid'
            });

            const response = await request(app)
                .get('/api/email/status')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.emailService.configured).toBe(true);
            expect(response.body.emailService.status).toBe('healthy');
            expect(response.body.emailService.message).toBe('Email configuration is valid');
        });

        it('should return status when not configured', async () => {
            emailService.isConfigured.mockReturnValue(false);
            emailService.initialize.mockResolvedValue(false);

            const response = await request(app)
                .get('/api/email/status')
                .expect(200);

            expect(response.body.emailService.configured).toBe(false);
            expect(response.body.emailService.status).toBe('not_configured');
        });

        it('should try to initialize when not configured', async () => {
            emailService.isConfigured
                .mockReturnValueOnce(false) // First call returns false
                .mockReturnValueOnce(true); // Second call after initialization returns true
            emailService.initialize.mockResolvedValue(true);
            emailService.testConfiguration.mockResolvedValue({
                success: true,
                message: 'Email configuration is valid'
            });

            const response = await request(app)
                .get('/api/email/status')
                .expect(200);

            expect(emailService.initialize).toHaveBeenCalled();
            expect(response.body.emailService.configured).toBe(true);
        });

        it('should handle email service errors', async () => {
            emailService.isConfigured.mockReturnValue(true);
            emailService.testConfiguration.mockResolvedValue({
                success: false,
                error: 'SMTP connection failed'
            });

            const response = await request(app)
                .get('/api/email/status')
                .expect(200);

            expect(response.body.emailService.status).toBe('error');
            expect(response.body.emailService.message).toBe('SMTP connection failed');
        });

        it('should handle status check failures', async () => {
            emailService.isConfigured.mockImplementation(() => {
                throw new Error('Status check failed');
            });

            const response = await request(app)
                .get('/api/email/status')
                .expect(500);

            expect(response.body.error).toBe('Status check failed');
        });
    });
});