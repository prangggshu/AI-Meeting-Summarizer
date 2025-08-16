const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// In-memory storage
global.uploadedFiles = global.uploadedFiles || new Map();
global.summaries = global.summaries || new Map();

// AI Service for Groq
async function generateSummaryWithGroq(transcript, instructions) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }

  const defaultInstructions = `Please provide a comprehensive summary of this meeting transcript. Include:
1. Key discussion points
2. Decisions made
3. Action items and assignments
4. Next steps

Format the response in clear sections with bullet points where appropriate.`;

  const prompt = instructions.trim() || defaultInstructions;
  const fullPrompt = `${prompt}\n\nTranscript:\n${transcript}`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that specializes in summarizing meeting transcripts.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      content: response.data.choices[0].message.content,
      metadata: {
        service: 'groq',
        model: 'llama3-8b-8192',
        tokensUsed: response.data.usage?.total_tokens || 0,
        successfulService: 'Groq'
      }
    };

  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message);
    throw new Error(`AI service error: ${error.response?.data?.error?.message || error.message}`);
  }
}

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
    const { transcript, instructions = '', fileId } = JSON.parse(event.body);

    // Get transcript content
    let transcriptContent;
    let sourceFile = null;

    if (fileId) {
      const fileMetadata = global.uploadedFiles.get(fileId);
      if (!fileMetadata) {
        return {
          statusCode: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: 'File not found',
            message: 'The specified file ID could not be found'
          }),
        };
      }
      transcriptContent = fileMetadata.content;
      sourceFile = {
        id: fileId,
        originalName: fileMetadata.originalName,
        size: fileMetadata.size
      };
    } else {
      transcriptContent = transcript;
    }

    if (!transcriptContent || !transcriptContent.trim()) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Empty transcript',
          message: 'Transcript content cannot be empty'
        }),
      };
    }

    // Generate summary
    const startTime = Date.now();
    const summaryResult = await generateSummaryWithGroq(transcriptContent, instructions);
    const processingTime = Date.now() - startTime;

    // Generate unique summary ID
    const summaryId = uuidv4();

    // Create summary metadata
    const summaryMetadata = {
      id: summaryId,
      content: summaryResult.content,
      originalContent: summaryResult.content,
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

    // Store summary
    global.summaries.set(summaryId, summaryMetadata);

    // Return success response
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
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
      }),
    };

  } catch (error) {
    console.error('Summary generation error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Summary generation failed',
        message: 'An error occurred while generating the summary. Please try again.'
      }),
    };
  }
};