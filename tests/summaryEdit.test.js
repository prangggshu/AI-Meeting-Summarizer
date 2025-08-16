const request = require('supertest');
const app = require('../backend/server');
const { aiServiceManager } = require('../backend/services/aiService');

// Mock the AI service manager
jest.mock('../backend/services/aiService', () => ({
    aiServiceManager: {
        generateSummary: jest.fn()
    }
}));

describe('Summary Editing API', () => {
    let summaryId;

    beforeEach(async () => {
        jest.clearAllMocks();
        // Clear global storage
        global.uploadedFiles = new Map();
        global.summaries = new Map();

        // Mock AI service response
        aiServiceManager.generateSummary.mockResolvedValue({
            content: 'Original AI generated summary content for testing.',
            metadata: {
                service: 'groq',
                model: 'llama3-8b-8192',
                tokensUsed: 150,
                successfulService: 'Groq',
                processingTime: 1500
            }
        });

        // Create a summary to edit
        const response = await request(app)
            .post('/api/summarize')
            .send({
                transcript: 'Test transcript for summary editing'
            });

        summaryId = response.body.summary.id;
    });

    describe('PUT /api/summary/:id', () => {
        it('should successfully update summary content', async () => {
            const updatedContent = 'This is the updated summary content with new information.';
            
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: updatedContent
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.summary.id).toBe(summaryId);
            expect(response.body.summary.content).toBe(updatedContent);
            expect(response.body.summary.originalContent).toBe('Original AI generated summary content for testing.');
            expect(response.body.summary).toHaveProperty('lastModified');
            expect(response.body.summary.wordCount).toBe(9);

            // Verify the summary was actually updated in storage
            const storedSummary = global.summaries.get(summaryId);
            expect(storedSummary.content).toBe(updatedContent);
            expect(storedSummary.lastModified).toBeDefined();
        });

        it('should preserve original content and metadata', async () => {
            const updatedContent = 'Updated content';
            
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: updatedContent
                })
                .expect(200);

            expect(response.body.summary.originalContent).toBe('Original AI generated summary content for testing.');
            expect(response.body.summary.instructions).toBe('Default summarization instructions');
            expect(response.body.summary.metadata).toHaveProperty('successfulService');
            expect(response.body.summary).toHaveProperty('createdAt');
        });

        it('should trim whitespace from content', async () => {
            const contentWithWhitespace = '   Updated content with whitespace   \n\t  ';
            
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: contentWithWhitespace
                })
                .expect(200);

            expect(response.body.summary.content).toBe('Updated content with whitespace');
        });

        it('should return 404 for non-existent summary ID', async () => {
            const response = await request(app)
                .put('/api/summary/non-existent-id')
                .send({
                    content: 'Updated content'
                })
                .expect(404);

            expect(response.body.error).toBe('Summary not found');
            expect(response.body.message).toBe('The requested summary could not be found');
        });

        it('should reject request with no content', async () => {
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Invalid content');
            expect(response.body.message).toBe('Content must be a non-empty string');
        });

        it('should reject request with null content', async () => {
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: null
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid content');
        });

        it('should reject request with non-string content', async () => {
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: 123
                })
                .expect(400);

            expect(response.body.error).toBe('Invalid content');
            expect(response.body.message).toBe('Content must be a non-empty string');
        });

        it('should reject empty content after trimming', async () => {
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: '   \n\t  '
                })
                .expect(400);

            expect(response.body.error).toBe('Empty content');
            expect(response.body.message).toBe('Summary content cannot be empty');
        });

        it('should reject content that is too long', async () => {
            const longContent = 'x'.repeat(25000); // Exceeds 20k limit
            
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: longContent
                })
                .expect(400);

            expect(response.body.error).toBe('Content too long');
            expect(response.body.message).toContain('exceeds maximum length of 20000 characters');
        });

        it('should handle content at maximum length', async () => {
            const maxLengthContent = 'x'.repeat(20000); // Exactly at limit
            
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: maxLengthContent
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.summary.content).toBe(maxLengthContent);
        });

        it('should update lastModified timestamp', async () => {
            // Get original timestamp
            const originalResponse = await request(app)
                .get(`/api/summary/${summaryId}`);
            const originalTimestamp = originalResponse.body.summary.lastModified;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update the summary
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: 'Updated content'
                })
                .expect(200);

            expect(response.body.summary.lastModified).not.toBe(originalTimestamp);
            expect(new Date(response.body.summary.lastModified).getTime())
                .toBeGreaterThan(new Date(originalTimestamp).getTime());
        });

        it('should calculate word count correctly for updated content', async () => {
            const testCases = [
                { content: 'One two three', expectedCount: 3 },
                { content: 'Single', expectedCount: 1 },
                { content: 'Multiple   spaces    between   words', expectedCount: 4 },
                { content: 'Words\nwith\nnewlines', expectedCount: 3 },
                { content: 'Words\twith\ttabs', expectedCount: 3 }
            ];

            for (const testCase of testCases) {
                const response = await request(app)
                    .put(`/api/summary/${summaryId}`)
                    .send({
                        content: testCase.content
                    })
                    .expect(200);

                expect(response.body.summary.wordCount).toBe(testCase.expectedCount);
            }
        });

        it('should preserve all other summary fields', async () => {
            // Get original summary
            const originalResponse = await request(app)
                .get(`/api/summary/${summaryId}`);
            const originalSummary = originalResponse.body.summary;

            // Update content
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: 'New updated content'
                })
                .expect(200);

            const updatedSummary = response.body.summary;

            // Check that other fields are preserved
            expect(updatedSummary.id).toBe(originalSummary.id);
            expect(updatedSummary.originalContent).toBe(originalSummary.originalContent);
            expect(updatedSummary.instructions).toBe(originalSummary.instructions);
            expect(updatedSummary.sourceFile).toEqual(originalSummary.sourceFile);
            expect(updatedSummary.createdAt).toBe(originalSummary.createdAt);
            expect(updatedSummary.metadata).toEqual(originalSummary.metadata);

            // Only content and lastModified should change
            expect(updatedSummary.content).toBe('New updated content');
            expect(updatedSummary.lastModified).not.toBe(originalSummary.lastModified);
        });

        it('should handle multiple updates to the same summary', async () => {
            // First update
            await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: 'First update'
                })
                .expect(200);

            // Second update
            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: 'Second update'
                })
                .expect(200);

            expect(response.body.summary.content).toBe('Second update');
            expect(response.body.summary.originalContent).toBe('Original AI generated summary content for testing.');
        });

        it('should handle special characters and formatting', async () => {
            const contentWithSpecialChars = `Updated summary with:
- Bullet points
- Special chars: @#$%^&*()
- Unicode: 🚀 ✨ 📝
- Numbers: 123 456.789
- Quotes: "Hello" and 'World'`;

            const response = await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: contentWithSpecialChars
                })
                .expect(200);

            expect(response.body.summary.content).toBe(contentWithSpecialChars);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Integration with GET /api/summary/:id', () => {
        it('should return updated content when retrieving summary', async () => {
            const updatedContent = 'This content was updated via PUT request';

            // Update the summary
            await request(app)
                .put(`/api/summary/${summaryId}`)
                .send({
                    content: updatedContent
                })
                .expect(200);

            // Retrieve the summary
            const response = await request(app)
                .get(`/api/summary/${summaryId}`)
                .expect(200);

            expect(response.body.summary.content).toBe(updatedContent);
            expect(response.body.summary.originalContent).toBe('Original AI generated summary content for testing.');
        });
    });
});