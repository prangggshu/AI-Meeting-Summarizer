const request = require('supertest');
const app = require('../backend/server');
const path = require('path');
const fs = require('fs');

describe('File Upload API', () => {
    // Clean up uploaded files before each test
    beforeEach(() => {
        global.uploadedFiles = new Map();
    });

    describe('POST /api/upload', () => {
        it('should successfully upload a valid text file', async () => {
            const testContent = 'This is a test meeting transcript with some content.';
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(testContent), 'test.txt')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.file).toHaveProperty('id');
            expect(response.body.file.originalName).toBe('test.txt');
            expect(response.body.file.size).toBe(testContent.length);
            expect(response.body.file.preview).toBe(testContent);
            expect(response.body.file.wordCount).toBe(9);
        });

        it('should successfully upload a markdown file', async () => {
            const testContent = '# Meeting Notes\n\nThis is a markdown file with meeting notes.';
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(testContent), 'notes.md')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.file.originalName).toBe('notes.md');
        });

        it('should successfully upload an RTF file', async () => {
            const testContent = '{\\rtf1 This is RTF content for testing.}';
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(testContent), 'document.rtf')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.file.originalName).toBe('document.rtf');
        });

        it('should reject files with invalid extensions', async () => {
            const testContent = 'This should not be uploaded';
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(testContent), 'invalid.pdf')
                .expect(400);

            expect(response.body.error).toBe('Invalid file type');
            expect(response.body.message).toContain('Only .txt, .md, .rtf files are allowed');
        });

        it('should reject empty files', async () => {
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(''), 'empty.txt')
                .expect(400);

            expect(response.body.error).toBe('Empty file');
            expect(response.body.message).toBe('The uploaded file appears to be empty');
        });

        it('should reject files with only whitespace', async () => {
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from('   \n\t  '), 'whitespace.txt')
                .expect(400);

            expect(response.body.error).toBe('Empty file');
        });

        it('should return error when no file is uploaded', async () => {
            const response = await request(app)
                .post('/api/upload')
                .expect(400);

            expect(response.body.error).toBe('No file uploaded');
            expect(response.body.message).toBe('Please select a file to upload');
        });

        it('should handle large files within limit', async () => {
            // Create a file just under the 10MB limit
            const largeContent = 'x'.repeat(5 * 1024 * 1024); // 5MB
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(largeContent), 'large.txt')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.file.size).toBe(largeContent.length);
        });

        it('should reject files exceeding size limit', async () => {
            // Create a file over the 10MB limit
            const oversizedContent = 'x'.repeat(15 * 1024 * 1024); // 15MB
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(oversizedContent), 'oversized.txt')
                .expect(413);

            expect(response.body.error).toBe('File too large');
        });

        it('should truncate preview for long files', async () => {
            const longContent = 'x'.repeat(1000);
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(longContent), 'long.txt')
                .expect(200);

            expect(response.body.file.preview).toHaveLength(503); // 500 chars + '...'
            expect(response.body.file.preview.endsWith('...')).toBe(true);
        });

        it('should calculate word count correctly', async () => {
            const testContent = 'One two three four five words here.';
            
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(testContent), 'words.txt')
                .expect(200);

            expect(response.body.file.wordCount).toBe(7);
        });

        it('should reject multiple files', async () => {
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from('File 1'), 'file1.txt')
                .attach('transcript', Buffer.from('File 2'), 'file2.txt')
                .expect(400);

            expect(response.body.error).toBe('Too many files');
        });

        it('should reject wrong field name', async () => {
            const response = await request(app)
                .post('/api/upload')
                .attach('wrongfield', Buffer.from('Test content'), 'test.txt')
                .expect(400);

            expect(response.body.error).toBe('Unexpected field');
        });
    });

    describe('GET /api/file/:id', () => {
        let uploadedFileId;

        beforeEach(async () => {
            // Upload a test file first
            const testContent = 'Test content for retrieval';
            const response = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(testContent), 'test.txt');
            
            uploadedFileId = response.body.file.id;
        });

        it('should retrieve uploaded file by ID', async () => {
            const response = await request(app)
                .get(`/api/file/${uploadedFileId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.file.id).toBe(uploadedFileId);
            expect(response.body.file.originalName).toBe('test.txt');
            expect(response.body.file.content).toBe('Test content for retrieval');
        });

        it('should return 404 for non-existent file ID', async () => {
            const response = await request(app)
                .get('/api/file/non-existent-id')
                .expect(404);

            expect(response.body.error).toBe('File not found');
        });

        it('should return full content (not truncated)', async () => {
            // Upload a long file
            const longContent = 'x'.repeat(1000);
            const uploadResponse = await request(app)
                .post('/api/upload')
                .attach('transcript', Buffer.from(longContent), 'long.txt');
            
            const fileId = uploadResponse.body.file.id;
            
            const response = await request(app)
                .get(`/api/file/${fileId}`)
                .expect(200);

            expect(response.body.file.content).toHaveLength(1000);
            expect(response.body.file.content).not.toContain('...');
        });
    });
});