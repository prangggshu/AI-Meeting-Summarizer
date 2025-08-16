const request = require('supertest');
const app = require('../backend/server');
const { aiServiceManager } = require('../backend/services/aiService');

// Mock the AI service manager
jest.mock('../backend/services/aiService', () => ({
    aiServiceManager: {
        generateSummary: jest.fn(),
        validateServices: jest.fn(),
        getCurrentService: jest.fn()
    }
}));

describe('Summary Generation API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear global storage
        global.uploadedFiles = new Map();
        global.summaries = new Map();
    });

    describe('POST /api/summarize', () => {
        const mockSummaryResult = {
            content: 'This is a test summary of the meeting transcript.',
            metadata: {
                service: 'groq',
                model: 'llama3-8b-8192',
                tokensUsed: 150,
                successfulService: 'Groq',
                processingTime: 1500
            }
        };

        beforeEach(() => {
            aiServiceManager.generateSummary.mockResolvedValue(mockSummaryResult);
        });

        it('should generate summary from direct transcript content', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'This is a test meeting transcript with important discussions.',
                    instructions: 'Please provide a brief summary'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.summary).toHaveProperty('id');
            expect(response.body.summary.content).toBe(mockSummaryResult.content);
            expect(response.body.summary.instructions).toBe('Please provide a brief summary');
            expect(response.body.summary.metadata.aiService).toBe('Groq');
            expect(response.body.summary.wordCount).toBe(9);

            expect(aiServiceManager.generateSummary).toHaveBeenCalledWith(
                'This is a test meeting transcript with important discussions.',
                'Please provide a brief summary'
            );
        });

        it('should generate summary from uploaded file', async () => {
            // First upload a file
            const fileContent = 'Meeting transcript from uploaded file with detailed discussions.';
            const uploadResponse = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(fileContent), 'meeting.txt');

            const fileId = uploadResponse.body.file.id;

            // Then generate summary from file
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    fileId: fileId,
                    instructions: 'Summarize key points'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.summary.sourceFile).toEqual({
                id: fileId,
                originalName: 'meeting.txt',
                size: fileContent.length
            });

            expect(aiServiceManager.generateSummary).toHaveBeenCalledWith(
                fileContent,
                'Summarize key points'
            );
        });

        it('should use default instructions when none provided', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript content'
                })
                .expect(200);

            expect(response.body.summary.instructions).toBe('Default summarization instructions');
            
            expect(aiServiceManager.generateSummary).toHaveBeenCalledWith(
                'Test transcript content',
                ''
            );
        });

        it('should reject request with no content', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Missing content');
            expect(response.body.message).toBe('Either transcript content or fileId must be provided');
        });

        it('should reject request with non-existent file ID', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    fileId: 'non-existent-id'
                })
                .expect(404);

            expect(response.body.error).toBe('File not found');
        });

        it('should reject empty transcript content', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: '   \n\t  '
                })
                .expect(400);

            expect(response.body.error).toBe('Empty transcript');
        });

        it('should reject transcript that is too long', async () => {
            const longTranscript = 'x'.repeat(60000); // Exceeds 50k limit
            
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: longTranscript
                })
                .expect(400);

            expect(response.body.error).toBe('Transcript too long');
        });

        it('should validate transcript type', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 123 // Not a string
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid transcript');
        });

        it('should validate instructions type', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Valid transcript',
                    instructions: 123 // Not a string
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid instructions');
        });

        it('should handle AI service timeout errors', async () => {
            aiServiceManager.generateSummary.mockRejectedValue(
                new Error('Groq service timeout - please try again')
            );

            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript'
                })
                .expect(408);

            expect(response.body.error).toBe('Request timeout');
        });

        it('should handle AI service rate limit errors', async () => {
            aiServiceManager.generateSummary.mockRejectedValue(
                new Error('Groq rate limit exceeded - please try again later')
            );

            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript'
                })
                .expect(429);

            expect(response.body.error).toBe('Rate limit exceeded');
        });

        it('should handle AI service API key errors', async () => {
            aiServiceManager.generateSummary.mockRejectedValue(
                new Error('Invalid Groq API key')
            );

            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript'
                })
                .expect(503);

            expect(response.body.error).toBe('Service unavailable');
        });

        it('should handle all AI services failed error', async () => {
            aiServiceManager.generateSummary.mockRejectedValue(
                new Error('All AI services failed. Last error: Network error')
            );

            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript'
                })
                .expect(503);

            expect(response.body.error).toBe('Service unavailable');
            expect(response.body.message).toContain('temporarily unavailable');
        });

        it('should handle generic errors', async () => {
            aiServiceManager.generateSummary.mockRejectedValue(
                new Error('Unexpected error')
            );

            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript'
                })
                .expect(500);

            expect(response.body.error).toBe('Summary generation failed');
        });

        it('should store summary for later retrieval', async () => {
            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript for storage'
                })
                .expect(200);

            const summaryId = response.body.summary.id;
            
            // Verify summary is stored
            expect(global.summaries.has(summaryId)).toBe(true);
            
            const storedSummary = global.summaries.get(summaryId);
            expect(storedSummary.content).toBe(mockSummaryResult.content);
            expect(storedSummary.originalContent).toBe(mockSummaryResult.content);
        });
    });

    describe('GET /api/summary/:id', () => {
        let summaryId;

        beforeEach(async () => {
            // Create a summary first
            aiServiceManager.generateSummary.mockResolvedValue({
                content: 'Test summary content',
                metadata: {
                    successfulService: 'Groq',
                    processingTime: 1000,
                    tokensUsed: 100
                }
            });

            const response = await request(app)
                .post('/api/summarize')
                .send({
                    transcript: 'Test transcript'
                });

            summaryId = response.body.summary.id;
        });

        it('should retrieve summary by ID', async () => {
            const response = await request(app)
                .get(`/api/summary/${summaryId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.summary.id).toBe(summaryId);
            expect(response.body.summary.content).toBe('Test summary content');
            expect(response.body.summary.originalContent).toBe('Test summary content');
            expect(response.body.summary).toHaveProperty('createdAt');
            expect(response.body.summary).toHaveProperty('lastModified');
        });

        it('should return 404 for non-existent summary', async () => {
            const response = await request(app)
                .get('/api/summary/non-existent-id')
                .expect(404);

            expect(response.body.error).toBe('Summary not found');
        });

        it('should include word count in response', async () => {
            const response = await request(app)
                .get(`/api/summary/${summaryId}`)
                .expect(200);

            expect(response.body.summary.wordCount).toBe(3); // "Test summary content"
        });
    });

    describe('GET /api/services/status', () => {
        it('should return AI services status', async () => {
            const mockServicesStatus = {
                Groq: { configured: true, connected: true, status: 'healthy' },
                OpenAI: { configured: false, connected: false, status: 'unavailable' }
            };

            const mockCurrentService = {
                getServiceStatus: () => ({
                    name: 'Groq',
                    configured: true,
                    model: 'llama3-8b-8192'
                })
            };

            aiServiceManager.validateServices.mockResolvedValue(mockServicesStatus);
            aiServiceManager.getCurrentService.mockReturnValue(mockCurrentService);

            const response = await request(app)
                .get('/api/services/status')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.services).toEqual(mockServicesStatus);
            expect(response.body.currentService.name).toBe('Groq');
            expect(response.body).toHaveProperty('timestamp');
        });

        it('should handle services status check errors', async () => {
            aiServiceManager.validateServices.mockRejectedValue(
                new Error('Status check failed')
            );

            const response = await request(app)
                .get('/api/services/status')
                .expect(500);

            expect(response.body.error).toBe('Status check failed');
        });

        it('should handle null current service', async () => {
            aiServiceManager.validateServices.mockResolvedValue({});
            aiServiceManager.getCurrentService.mockReturnValue(null);

            const response = await request(app)
                .get('/api/services/status')
                .expect(200);

            expect(response.body.currentService).toBe(null);
        });
    });
});