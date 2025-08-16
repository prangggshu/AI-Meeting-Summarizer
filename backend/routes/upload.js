const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing

const fileFilter = (req, file, cb) => {
    // Check file extension
    const allowedExtensions = ['.txt', '.md', '.rtf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed.`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
        files: 1 // Only allow one file at a time
    }
});

// File upload endpoint
router.post('/upload', upload.single('transcript'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a file to upload'
            });
        }

        // Validate file content
        const fileContent = req.file.buffer.toString('utf-8');
        
        if (!fileContent.trim()) {
            return res.status(400).json({
                error: 'Empty file',
                message: 'The uploaded file appears to be empty'
            });
        }

        // Generate unique file ID
        const fileId = uuidv4();
        
        // Create file metadata
        const fileMetadata = {
            id: fileId,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: new Date().toISOString(),
            content: fileContent
        };

        // Store file metadata in memory (in a real app, this would be in a database)
        if (!global.uploadedFiles) {
            global.uploadedFiles = new Map();
        }
        global.uploadedFiles.set(fileId, fileMetadata);

        // Return success response with file preview and content
        res.json({
            success: true,
            file: {
                id: fileId,
                originalName: req.file.originalname,
                size: req.file.size,
                uploadedAt: fileMetadata.uploadedAt,
                content: fileContent,
                preview: fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : ''),
                wordCount: fileContent.split(/\s+/).filter(word => word.length > 0).length
            }
        });

    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: 'An error occurred while processing the file'
        });
    }
});

// Get uploaded file by ID
router.get('/file/:id', (req, res) => {
    try {
        const fileId = req.params.id;
        
        if (!global.uploadedFiles || !global.uploadedFiles.has(fileId)) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The requested file could not be found'
            });
        }

        const fileMetadata = global.uploadedFiles.get(fileId);
        
        res.json({
            success: true,
            file: {
                id: fileId,
                originalName: fileMetadata.originalName,
                size: fileMetadata.size,
                uploadedAt: fileMetadata.uploadedAt,
                content: fileMetadata.content,
                wordCount: fileMetadata.content.split(/\s+/).filter(word => word.length > 0).length
            }
        });

    } catch (error) {
        console.error('File retrieval error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'An error occurred while retrieving the file'
        });
    }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large',
                message: 'The uploaded file exceeds the maximum size limit'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files',
                message: 'Only one file can be uploaded at a time'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Unexpected field',
                message: 'Please use the "transcript" field for file upload'
            });
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: 'Invalid file type',
            message: error.message
        });
    }
    
    next(error);
});

module.exports = router;