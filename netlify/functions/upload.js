const multipart = require('lambda-multipart-parser');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for demo (use database in production)
global.uploadedFiles = global.uploadedFiles || new Map();

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse multipart form data
    const result = await multipart.parse(event);
    
    if (!result.files || result.files.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        }),
      };
    }

    const file = result.files[0];
    
    // Validate file type
    const allowedExtensions = ['.txt', '.md', '.rtf'];
    const fileName = file.filename.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Invalid file type',
          message: `Only ${allowedExtensions.join(', ')} files are allowed.`
        }),
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.content.length > maxSize) {
      return {
        statusCode: 413,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'File too large',
          message: 'The uploaded file exceeds the maximum size limit'
        }),
      };
    }

    // Get file content
    const fileContent = file.content.toString('utf-8');
    
    if (!fileContent.trim()) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Empty file',
          message: 'The uploaded file appears to be empty'
        }),
      };
    }

    // Generate unique file ID
    const fileId = uuidv4();
    
    // Create file metadata
    const fileMetadata = {
      id: fileId,
      originalName: file.filename,
      size: file.content.length,
      mimeType: file.contentType,
      uploadedAt: new Date().toISOString(),
      content: fileContent
    };

    // Store file metadata
    global.uploadedFiles.set(fileId, fileMetadata);

    // Return success response
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        file: {
          id: fileId,
          originalName: file.filename,
          size: file.content.length,
          uploadedAt: fileMetadata.uploadedAt,
          content: fileContent,
          preview: fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : ''),
          wordCount: fileContent.split(/\s+/).filter(word => word.length > 0).length
        }
      }),
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Upload failed',
        message: 'An error occurred while processing the file'
      }),
    };
  }
};