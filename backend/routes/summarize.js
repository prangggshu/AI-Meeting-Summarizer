const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { aiServiceManager } = require('../services/aiService');

const router = express.Router();

// Validation middleware for summarize requests
const validateSummarizeRequest = (req, res, next) => {
    const { transcript, instructions, fileId } = req.body;

    // Check if we have either transcript content or a file ID
    if (!transcript && !fileId) {
        return res.status(400).json({
            error: 'Missing content',
            message: 'Either transcript content or fileId must be provided'
        });
    }

    // If fileId is provided, validate it exists
    if (fileId) {
        if (!global.uploadedFiles || !global.uploadedFiles.has(fileId)) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The specified file ID could not be found'
            });
        }
    }

    // Validate transcript content if provided directly
    if (transcript && typeof transcript !== 'string') {
        return res.status(400).json({
            error: 'Invalid transcript',
            message: 'Transcript must be a string'
        });
    }

    // Validate instructions if provided
    if (instructions && typeof instructions !== 'string') {
        return res.status(400).json({
            error: 'Invalid instructions',
            message: 'Instructions must be a string'
        });
    }

    next();
};

// POST /api/summarize - Generate summary from transcript
router.post('/summarize', validateSummarizeRequest, async (req, res) => {
    try {
        const { transcript, instructions = '', fileId } = req.body;

        // Get transcript content
        let transcriptContent;
        let sourceFile = null;

        if (fileId) {
            // Get content from uploaded file
            const fileMetadata = global.uploadedFiles.get(fileId);
            transcriptContent = fileMetadata.content;
            sourceFile = {
                id: fileId,
                originalName: fileMetadata.originalName,
                size: fileMetadata.size
            };
        } else {
            // Use provided transcript content
            transcriptContent = transcript;
        }

        // Validate transcript content length
        if (!transcriptContent.trim()) {
            return res.status(400).json({
                error: 'Empty transcript',
                message: 'Transcript content cannot be empty'
            });
        }

        // Check transcript length (reasonable limits)
        const maxLength = 50000; // ~50k characters
        if (transcriptContent.length > maxLength) {
            return res.status(400).json({
                error: 'Transcript too long',
                message: `Transcript exceeds maximum length of ${maxLength} characters`
            });
        }

        console.log(`Starting summary generation for ${transcriptContent.length} character transcript`);

        // Generate summary using AI service manager
        const startTime = Date.now();
        const summaryResult = await aiServiceManager.generateSummary(transcriptContent, instructions);
        const processingTime = Date.now() - startTime;

        // Generate unique summary ID
        const summaryId = uuidv4();

        // Create summary metadata
        const summaryMetadata = {
            id: summaryId,
            content: summaryResult.content,
            originalContent: summaryResult.content, // Store original for editing
            instructions: instructions || 'Default summarization instructions',
            sourceFile: sourceFile,
            transcriptLength: transcriptContent.length,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            aiMetadata: {
                ...summaryResult.metadata,
                processingTime: processingTime
            }
        };

        // Store summary in memory (in a real app, this would be in a database)
        if (!global.summaries) {
            global.summaries = new Map();
        }
        global.summaries.set(summaryId, summaryMetadata);

        console.log(`Summary generated successfully in ${processingTime}ms using ${summaryResult.metadata.successfulService}`);

        // Return success response
        res.json({
            success: true,
            summary: {
                id: summaryId,
                content: summaryResult.content,
                instructions: summaryMetadata.instructions,
                sourceFile: sourceFile,
                createdAt: summaryMetadata.createdAt,
                wordCount: summaryResult.content.split(/\s+/).filter(word => word.length > 0).length,
                metadata: {
                    aiService: summaryResult.metadata.successfulService,
                    processingTime: processingTime,
                    tokensUsed: summaryResult.metadata.tokensUsed || 0
                }
            }
        });

    } catch (error) {
        console.error('Summary generation error:', error);

        // Handle specific AI service errors
        if (error.message.includes('timeout')) {
            return res.status(408).json({
                error: 'Request timeout',
                message: 'Summary generation timed out. Please try again with a shorter transcript.'
            });
        }

        if (error.message.includes('rate limit')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please try again later.'
            });
        }

        if (error.message.includes('API key')) {
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'AI summarization service is not properly configured'
            });
        }

        if (error.message.includes('All AI services failed')) {
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'AI summarization services are temporarily unavailable. Please try again later.'
            });
        }

        // Generic error response
        res.status(500).json({
            error: 'Summary generation failed',
            message: 'An error occurred while generating the summary. Please try again.'
        });
    }
});

// GET /api/summary/:id - Retrieve summary by ID
router.get('/summary/:id', (req, res) => {
    try {
        const summaryId = req.params.id;

        if (!global.summaries || !global.summaries.has(summaryId)) {
            return res.status(404).json({
                error: 'Summary not found',
                message: 'The requested summary could not be found'
            });
        }

        const summaryMetadata = global.summaries.get(summaryId);

        res.json({
            success: true,
            summary: {
                id: summaryId,
                content: summaryMetadata.content,
                originalContent: summaryMetadata.originalContent,
                instructions: summaryMetadata.instructions,
                sourceFile: summaryMetadata.sourceFile,
                createdAt: summaryMetadata.createdAt,
                lastModified: summaryMetadata.lastModified,
                wordCount: summaryMetadata.content.split(/\s+/).filter(word => word.length > 0).length,
                metadata: summaryMetadata.aiMetadata
            }
        });

    } catch (error) {
        console.error('Summary retrieval error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'An error occurred while retrieving the summary'
        });
    }
});

// PUT /api/summary/:id - Update summary content
router.put('/summary/:id', (req, res) => {
    try {
        const summaryId = req.params.id;
        const { content } = req.body;

        // Validate summary ID exists
        if (!global.summaries || !global.summaries.has(summaryId)) {
            return res.status(404).json({
                error: 'Summary not found',
                message: 'The requested summary could not be found'
            });
        }

        // Validate content
        if (!content || typeof content !== 'string') {
            return res.status(400).json({
                error: 'Invalid content',
                message: 'Content must be a non-empty string'
            });
        }

        if (!content.trim()) {
            return res.status(400).json({
                error: 'Empty content',
                message: 'Summary content cannot be empty'
            });
        }

        // Validate content length (reasonable limits)
        const maxLength = 20000; // 20k characters for edited summaries
        if (content.length > maxLength) {
            return res.status(400).json({
                error: 'Content too long',
                message: `Summary content exceeds maximum length of ${maxLength} characters`
            });
        }

        // Get existing summary
        const existingSummary = global.summaries.get(summaryId);

        // Update summary content
        const updatedSummary = {
            ...existingSummary,
            content: content.trim(),
            lastModified: new Date().toISOString()
        };

        // Store updated summary
        global.summaries.set(summaryId, updatedSummary);

        console.log(`Summary ${summaryId} updated successfully`);

        // Return success response
        res.json({
            success: true,
            summary: {
                id: summaryId,
                content: updatedSummary.content,
                originalContent: updatedSummary.originalContent,
                instructions: updatedSummary.instructions,
                sourceFile: updatedSummary.sourceFile,
                createdAt: updatedSummary.createdAt,
                lastModified: updatedSummary.lastModified,
                wordCount: updatedSummary.content.split(/\s+/).filter(word => word.length > 0).length,
                metadata: updatedSummary.aiMetadata
            }
        });

    } catch (error) {
        console.error('Summary update error:', error);
        res.status(500).json({
            error: 'Update failed',
            message: 'An error occurred while updating the summary'
        });
    }
});

// GET /api/services/status - Get AI services status
router.get('/services/status', async (req, res) => {
    try {
        const servicesStatus = await aiServiceManager.validateServices();
        const currentService = aiServiceManager.getCurrentService();

        res.json({
            success: true,
            services: servicesStatus,
            currentService: currentService ? currentService.getServiceStatus() : null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Services status error:', error);
        res.status(500).json({
            error: 'Status check failed',
            message: 'Unable to check AI services status'
        });
    }
});

module.exports = router;