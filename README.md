# AI Meeting Notes Summarizer

An AI-powered application for processing meeting transcripts, generating customizable summaries, and sharing them via email. Built with a focus on functionality, security, and ease of use.

## 🚀 Features

- **📄 File Upload**: Support for text transcripts (.txt, .md, .rtf) with drag-and-drop interface
- **🎯 Custom Instructions**: Tailored summarization with predefined templates and custom prompts
- **🤖 AI-Powered Summaries**: Multiple AI service integration (Groq, OpenAI) with automatic fallback
- **✏️ Summary Editing**: Real-time editing with auto-save functionality and change tracking
- **📧 Email Sharing**: Send summaries to multiple recipients with custom messages and subjects
- **🔒 Security**: Comprehensive input validation, sanitization, and XSS protection
- **⚡ Performance**: Optimized with retry logic, timeout handling, and error recovery
- **📱 Responsive**: Mobile-friendly interface that works across all devices
- **🔍 Monitoring**: Built-in health checks and service status monitoring

## 🏗️ Project Structure

```
├── frontend/              # Frontend web application
│   ├── index.html        # Main HTML file with semantic structure
│   ├── styles.css        # Comprehensive CSS with responsive design
│   └── script.js         # Enhanced JavaScript with validation & error handling
├── backend/              # Backend API server
│   ├── server.js         # Main Express server with middleware
│   ├── config/           # Configuration and validation
│   │   └── envValidation.js  # Environment variable validation
│   ├── routes/           # API route handlers
│   │   ├── upload.js     # File upload handling with multer
│   │   ├── summarize.js  # AI summarization endpoints
│   │   ├── share.js      # Email sharing functionality
│   │   └── services.js   # Service status and health checks
│   └── services/         # Business logic services
│       ├── aiService.js  # AI service integration with fallback
│       └── emailService.js  # Email service with SMTP support
├── tests/                # Comprehensive test suite
│   ├── server.test.js    # Server and middleware tests
│   ├── upload.test.js    # File upload functionality tests
│   ├── summarize.test.js # AI summarization tests
│   ├── share.test.js     # Email sharing tests
│   └── aiService.test.js # AI service integration tests
├── scripts/              # Deployment and monitoring scripts
│   ├── deploy-vercel.js  # Vercel deployment automation
│   ├── verify-deployment.js  # Post-deployment verification
│   └── setup-monitoring.js  # Monitoring configuration
└── .env.example          # Comprehensive environment configuration template
```

## 🛠️ Tech Stack & Architecture Decisions

### Frontend Technology Choices
- **HTML5, CSS3, Vanilla JavaScript**: Chosen for simplicity, fast loading, and minimal dependencies
- **No Framework**: Reduces bundle size and complexity while maintaining full control over functionality
- **Responsive Design**: CSS Grid and Flexbox for modern, mobile-first responsive layouts
- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with JS features

### Backend Technology Choices
- **Node.js + Express.js**: Lightweight, fast, and excellent for API development with rich ecosystem
- **Multer**: Industry-standard file upload handling with memory storage for processing
- **Joi**: Robust schema validation for environment variables and request data
- **Nodemailer**: Comprehensive email library supporting multiple SMTP providers

### AI Service Integration
- **Groq API (Primary)**: Fast inference with competitive pricing and good model selection
- **OpenAI API (Fallback)**: Reliable backup service ensuring high availability
- **Service Manager Pattern**: Abstraction layer allowing easy addition of new AI providers
- **Automatic Failover**: Seamless switching between services on failures

### Email Service Design
- **SMTP Integration**: Universal compatibility with all email providers
- **Multiple Provider Support**: Gmail, SendGrid, Outlook, and custom SMTP servers
- **HTML Templates**: Rich email formatting with proper fallbacks for text-only clients
- **Delivery Tracking**: Message IDs and status tracking for monitoring

### Security Implementation
- **Input Validation**: Server-side validation using Joi schemas for all endpoints
- **File Type Validation**: Strict file extension and MIME type checking
- **XSS Protection**: Input sanitization and output encoding
- **Rate Limiting**: Configurable request limits per IP address
- **CORS Configuration**: Strict origin validation for cross-origin requests

### Testing Strategy
- **Jest + Supertest**: Comprehensive unit and integration testing
- **Service Mocking**: Isolated testing of components with external service mocks
- **Error Scenario Testing**: Extensive testing of failure modes and edge cases
- **API Contract Testing**: Validation of request/response formats

### Deployment Architecture
- **Vercel Serverless**: Automatic scaling, global CDN, and zero-config deployment
- **Environment Validation**: Startup checks ensuring all required configuration is present
- **Health Monitoring**: Built-in endpoints for service status and health checks

## 📋 Prerequisites

- **Node.js** (version 16.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** package manager
- **AI Service API Key** (at least one required):
  - **Groq API** (recommended) - [Get key here](https://console.groq.com/keys)
  - **OpenAI API** (fallback) - [Get key here](https://platform.openai.com/api-keys)
- **Email Service** (required for sharing functionality):
  - **Gmail** (recommended for development) - Requires App Password
  - **SendGrid** (recommended for production) - [Get API key](https://app.sendgrid.com/settings/api_keys)
  - **Any SMTP provider** - Custom SMTP configuration supported

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-meeting-notes-summarizer

# Install dependencies
npm install

# Verify installation
npm run health-check  # Optional: Test basic setup
```

### 2. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit the .env file with your configuration
# Windows: notepad .env
# macOS/Linux: nano .env
```

### 3. Required Configuration

**Minimum required settings for basic functionality:**

```env
# AI Service (Required - choose at least one)
GROQ_API_KEY=your_groq_api_key_here
# OR
OPENAI_API_KEY=your_openai_api_key_here

# Email Service (Required for sharing functionality)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
EMAIL_FROM=your_email@gmail.com

# Basic server configuration
PORT=3000
NODE_ENV=development
```

### 4. Start the Application

```bash
# Development mode (with auto-reload and detailed logging)
npm run dev

# Production mode
npm start

# Alternative: Start with custom port
PORT=8080 npm start
```

### 5. Verify Setup

**Option 1: Web Interface**
- Open your browser and go to `http://localhost:3000`
- Check the health status at `http://localhost:3000/health`

**Option 2: Command Line Testing**
```bash
# Test overall system health
curl http://localhost:3000/health

# Test AI services
curl -X POST http://localhost:3000/api/services/ai/test

# Test email service
curl -X POST http://localhost:3000/api/services/email/test \
  -H "Content-Type: application/json" \
  -d '{"recipient":"your-email@example.com"}'

# Check service status
curl http://localhost:3000/api/services/status
```

**Option 3: Built-in Scripts**
```bash
# Run comprehensive service tests
npm run test:services

# Verify deployment readiness
npm run deploy:validate
```

## 🔧 Detailed Configuration

### AI Service Setup

#### Groq API (Recommended - Primary Service)

1. Visit [Groq Console](https://console.groq.com/keys)
2. Create a new API key
3. Add to `.env`:
   ```env
   GROQ_API_KEY=gsk_your_key_here
   GROQ_MODEL=llama3-8b-8192
   ```

#### OpenAI API (Optional - Fallback Service)

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-your_key_here
   OPENAI_MODEL=gpt-3.5-turbo
   ```

### Email Service Setup

#### Gmail (Recommended for Development)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Generate a new app password
3. Configure in `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_character_app_password
   EMAIL_FROM=your_email@gmail.com
   ```

#### SendGrid (Recommended for Production)

1. Get API key from [SendGrid](https://app.sendgrid.com/settings/api_keys)
2. Configure in `.env`:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your_sendgrid_api_key
   EMAIL_FROM=your_verified_sender@yourdomain.com
   ```

#### Other SMTP Providers

The application supports any SMTP provider. See `.env.example` for additional configuration examples.

### Security Configuration

```env
# CORS and Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=your_secure_random_string_here

# File Upload Limits
MAX_FILE_SIZE=10485760  # 10MB
MAX_CONTENT_LENGTH=1000000  # 1M characters
```

## 🧪 Development & Testing

### Available Scripts

```bash
# Development
npm run dev          # Start with auto-reload
npm start           # Production server

# Testing
npm test            # Run all tests
npm run test:watch  # Watch mode
npm run test:coverage  # Coverage report

# Code Quality
npm run lint        # Check code style
npm run lint:fix    # Fix style issues

# Service Testing
npm run test:services  # Test AI and email services
```

### Environment Validation

The application includes comprehensive environment validation that runs on startup:

- ✅ **Validates all required variables**
- ⚠️ **Warns about missing optional settings**
- 🔍 **Checks for configuration typos**
- 📋 **Provides setup recommendations**

### Service Health Monitoring

Monitor service health via API endpoints:

- `GET /health` - Overall system health
- `GET /api/services/status` - Detailed service status
- `GET /api/services/ai/status` - AI services status
- `GET /api/services/email/status` - Email service status

## 🚀 Deployment

### Vercel Deployment

1. **Environment Variables**: Set all required environment variables in Vercel dashboard
2. **Build Configuration**: The project includes `vercel.json` for optimal deployment
3. **Domain Setup**: Configure custom domain and SSL in Vercel settings

### Environment-Specific Configuration

```env
# Production Settings
NODE_ENV=production
ENABLE_COMPRESSION=true
ENABLE_HELMET=true
LOG_LEVEL=warn

# Staging Settings
NODE_ENV=staging
LOG_LEVEL=info
DEV_ENABLE_DEBUG_ROUTES=false
```

## 🔒 Security Features

- **Input Validation**: Comprehensive client and server-side validation
- **XSS Protection**: Input sanitization and output encoding
- **Rate Limiting**: Configurable request rate limits
- **CORS**: Strict origin validation
- **File Upload Security**: Type validation and size limits
- **Error Handling**: Secure error messages without information leakage

## 🐛 Troubleshooting Guide

### Environment Setup Issues

#### Node.js Version Problems
```bash
# Check Node.js version
node --version

# Should be 16.0.0 or higher
# If not, update Node.js from https://nodejs.org/
```

#### Package Installation Failures
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Alternative: Use yarn
npm install -g yarn
yarn install
```

#### Environment Variable Issues
```bash
# Verify .env file exists
ls -la .env

# Check environment validation
npm start
# Look for validation errors in startup logs

# Common fixes:
# 1. Ensure no spaces around = in .env file
# 2. Use quotes for values with spaces: VALUE="my value"
# 3. Check for typos in variable names
# 4. Verify all required variables are set
```

### AI Service Issues

#### Groq API Problems
```bash
# Test Groq API key
curl -H "Authorization: Bearer YOUR_GROQ_KEY" \
  https://api.groq.com/openai/v1/models

# Common issues:
# 1. Invalid API key format
# 2. Expired or revoked key
# 3. Rate limit exceeded
# 4. Network connectivity issues
```

**Solutions:**
- Verify API key from [Groq Console](https://console.groq.com/keys)
- Check for extra spaces or characters in the key
- Ensure key has proper permissions
- Try regenerating the API key

#### OpenAI API Problems
```bash
# Test OpenAI API key
curl -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  https://api.openai.com/v1/models

# Check account status and billing
```

**Solutions:**
- Verify API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Check account billing and usage limits
- Ensure sufficient credits/quota available
- Verify organization access if using organization keys

#### AI Service Timeout Issues
```bash
# Check service status
curl http://localhost:3000/api/services/ai/status

# Test with shorter content
curl -X POST http://localhost:3000/api/services/ai/test
```

**Solutions:**
- Increase timeout values in `.env`:
  ```env
  AI_SERVICE_TIMEOUT=60000  # 60 seconds
  AI_MAX_RETRIES=5
  ```
- Try with shorter transcript content
- Check network connectivity
- Verify AI service status pages

### Email Service Issues

#### Gmail SMTP Problems
```bash
# Test Gmail SMTP configuration
curl -X POST http://localhost:3000/api/services/email/test \
  -H "Content-Type: application/json" \
  -d '{"recipient":"your-email@gmail.com"}'
```

**Common Gmail Issues:**
1. **App Password Required**: Regular password won't work
   - Enable 2FA on Gmail account
   - Generate App Password: [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Use App Password in `SMTP_PASS`

2. **Less Secure Apps**: If not using App Password
   - Enable "Less secure app access" (not recommended)
   - Use App Password instead for better security

3. **SMTP Settings**: Verify configuration
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   ```

#### SendGrid Issues
```bash
# Verify SendGrid API key
curl -X GET https://api.sendgrid.com/v3/user/profile \
  -H "Authorization: Bearer YOUR_SENDGRID_KEY"
```

**Solutions:**
- Verify API key from [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
- Check sender verification status
- Ensure domain authentication is complete
- Verify account is not suspended

#### General Email Issues
```bash
# Check email service status
curl http://localhost:3000/api/services/email/status

# Enable email debugging
LOG_EMAIL_EVENTS=true npm start
```

### File Upload Issues

#### File Size Limits
```bash
# Check current limit
echo $MAX_FILE_SIZE

# Increase limit in .env
MAX_FILE_SIZE=20971520  # 20MB
```

#### Unsupported File Types
**Supported formats:** `.txt`, `.md`, `.rtf`

**Convert unsupported files:**
- **PDF to Text**: Use online converters or `pdftotext`
- **Word Documents**: Save as `.txt` or `.rtf`
- **Other formats**: Copy content to plain text file

#### File Encoding Issues
```bash
# Check file encoding
file -I your-file.txt

# Convert to UTF-8 if needed
iconv -f ISO-8859-1 -t UTF-8 input.txt > output.txt
```

### Network and Connectivity Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or use different port
PORT=8080 npm start
```

#### CORS Issues
```bash
# Check CORS configuration in .env
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# For development, temporarily allow all origins
ALLOWED_ORIGINS=*
```

#### Firewall/Proxy Issues
- Check corporate firewall settings
- Verify proxy configuration
- Test with different network connection
- Contact IT administrator if needed

### Performance Issues

#### Slow AI Processing
```bash
# Monitor processing times
LOG_AI_REQUESTS=true npm start

# Check AI service status
curl http://localhost:3000/api/services/ai/status
```

**Solutions:**
- Use shorter transcripts (under 10,000 words)
- Simplify summarization instructions
- Check AI service status pages
- Try different AI service (Groq vs OpenAI)

#### Memory Issues
```bash
# Monitor memory usage
node --max-old-space-size=4096 backend/server.js

# Check for memory leaks
npm install -g clinic
clinic doctor -- node backend/server.js
```

### Debug Mode and Logging

#### Enable Comprehensive Logging
```env
# Add to .env file
LOG_LEVEL=debug
LOG_API_REQUESTS=true
LOG_AI_REQUESTS=true
LOG_EMAIL_EVENTS=true

# Enable development debug routes
DEV_ENABLE_DEBUG_ROUTES=true
```

#### Debug Endpoints (Development Only)
```bash
# Check environment variables
curl http://localhost:3000/debug/env

# View system information
curl http://localhost:3000/debug/system

# Test all services
curl http://localhost:3000/debug/services
```

### Getting Help

#### Check Application Logs
```bash
# View real-time logs
npm run dev

# Check error logs (if configured)
tail -f logs/error.log
```

#### Verify System Requirements
```bash
# Check Node.js version
node --version  # Should be >= 16.0.0

# Check npm version
npm --version

# Check available memory
free -h  # Linux
vm_stat  # macOS
```

#### Test Individual Components
```bash
# Test file upload only
curl -X POST http://localhost:3000/api/upload \
  -F "transcript=@test-file.txt"

# Test AI service only
curl -X POST http://localhost:3000/api/services/ai/test

# Test email service only
curl -X POST http://localhost:3000/api/services/email/test \
  -H "Content-Type: application/json" \
  -d '{"recipient":"test@example.com"}'
```

#### Common Error Messages and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "AI service timeout" | AI service taking too long | Reduce transcript length, check network |
| "Invalid API key" | Wrong or expired API key | Verify and regenerate API key |
| "Email delivery failed" | SMTP configuration issue | Check email settings and credentials |
| "File too large" | File exceeds size limit | Reduce file size or increase `MAX_FILE_SIZE` |
| "Port already in use" | Another process using port | Kill process or use different port |
| "Environment validation failed" | Missing required env vars | Check `.env` file against `.env.example` |

#### Still Need Help?

1. **Check the logs** for detailed error messages
2. **Test individual components** to isolate the issue
3. **Verify configuration** against `.env.example`
4. **Check service status** pages for AI and email providers
5. **Try with minimal configuration** to identify the problem
6. **Review the troubleshooting steps** above systematically

## 📚 API Documentation

### Core Endpoints

#### POST /api/upload
Upload a transcript file for processing.

**Request:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "transcript=@meeting-notes.txt"
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "uuid-string",
    "originalName": "meeting-notes.txt",
    "size": 1024,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "preview": "First 500 characters of content...",
    "wordCount": 150
  }
}
```

**Supported File Types:** `.txt`, `.md`, `.rtf`
**Maximum File Size:** 10MB (configurable via `MAX_FILE_SIZE`)

#### POST /api/summarize
Generate an AI-powered summary from transcript content.

**Request:**
```bash
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "uuid-from-upload",
    "instructions": "Create an executive summary with action items"
  }'
```

**Alternative Request (direct content):**
```bash
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Meeting content here...",
    "instructions": "Focus on decisions made and next steps"
  }'
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "id": "summary-uuid",
    "content": "Generated summary content...",
    "instructions": "Create an executive summary with action items",
    "sourceFile": {
      "id": "file-uuid",
      "originalName": "meeting-notes.txt",
      "size": 1024
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "wordCount": 75,
    "metadata": {
      "aiService": "groq",
      "processingTime": 2500,
      "tokensUsed": 1200
    }
  }
}
```

#### PUT /api/summary/:id
Update the content of an existing summary.

**Request:**
```bash
curl -X PUT http://localhost:3000/api/summary/summary-uuid \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated summary content with edits..."
  }'
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "id": "summary-uuid",
    "content": "Updated summary content with edits...",
    "originalContent": "Original AI-generated content...",
    "lastModified": "2024-01-01T00:05:00.000Z",
    "wordCount": 80
  }
}
```

#### POST /api/share
Share a summary via email to multiple recipients.

**Request:**
```bash
curl -X POST http://localhost:3000/api/share \
  -H "Content-Type: application/json" \
  -d '{
    "summaryId": "summary-uuid",
    "recipients": ["colleague@company.com", "manager@company.com"],
    "subject": "Meeting Summary - Project Kickoff",
    "customMessage": "Please review the attached meeting summary.",
    "senderName": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "share": {
    "id": "share-uuid",
    "summaryId": "summary-uuid",
    "recipients": ["colleague@company.com", "manager@company.com"],
    "rejectedRecipients": [],
    "subject": "Meeting Summary - Project Kickoff",
    "sentAt": "2024-01-01T00:10:00.000Z",
    "messageId": "email-message-id",
    "status": "sent"
  }
}
```

### Service & Health Check Endpoints

#### GET /health
Basic health check for the application.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### GET /api/services/status
Comprehensive status check for all services.

**Response:**
```json
{
  "success": true,
  "services": {
    "groq": {
      "available": true,
      "configured": true,
      "lastChecked": "2024-01-01T00:00:00.000Z"
    },
    "openai": {
      "available": true,
      "configured": true,
      "lastChecked": "2024-01-01T00:00:00.000Z"
    },
    "email": {
      "available": true,
      "configured": true,
      "provider": "gmail"
    }
  },
  "currentService": {
    "name": "groq",
    "status": "healthy"
  }
}
```

#### POST /api/services/ai/test
Test AI service connectivity and functionality.

**Response:**
```json
{
  "success": true,
  "test": {
    "service": "groq",
    "responseTime": 1200,
    "testSummary": "Brief test summary generated successfully"
  }
}
```

#### POST /api/services/email/test
Test email service configuration and delivery.

**Request:**
```bash
curl -X POST http://localhost:3000/api/services/email/test \
  -H "Content-Type: application/json" \
  -d '{"recipient": "test@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "test": {
    "recipient": "test@example.com",
    "messageId": "test-message-id",
    "provider": "gmail",
    "deliveryTime": 800
  }
}
```

### Error Response Format

All API endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors, invalid input)
- `404` - Not Found (resource doesn't exist)
- `408` - Request Timeout (AI service timeout)
- `413` - Payload Too Large (file size exceeded)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (AI/email service down)

## 👥 User Guide

### Getting Started

1. **Access the Application**
   - Open your web browser and navigate to the application URL
   - For local development: `http://localhost:3000`

2. **Upload a Transcript**
   - Click the upload area or drag and drop a text file
   - Supported formats: `.txt`, `.md`, `.rtf`
   - Maximum file size: 10MB
   - The transcript content will appear in a preview area

3. **Customize Instructions (Optional)**
   - Enter custom summarization instructions in the text area
   - Use predefined templates for common summary types:
     - **Executive Summary**: High-level overview for leadership
     - **Action Items**: Focus on tasks and next steps
     - **Decision Log**: Highlight decisions made and rationale
     - **Technical Summary**: Emphasize technical details and specifications

4. **Generate Summary**
   - Click "Generate Summary" to process the transcript
   - Wait for AI processing (typically 2-10 seconds)
   - The generated summary will appear in the results area

5. **Edit Summary (Optional)**
   - Click in the summary area to make edits
   - Changes are automatically saved
   - Use basic text formatting as needed

6. **Share via Email**
   - Enter recipient email addresses (comma-separated)
   - Customize the email subject line
   - Add a personal message if desired
   - Click "Send Email" to share the summary

### Supported File Formats

| Format | Extension | Description | Best For |
|--------|-----------|-------------|----------|
| Plain Text | `.txt` | Simple text files | Basic transcripts, notes |
| Markdown | `.md` | Formatted text with markup | Structured notes, documentation |
| Rich Text | `.rtf` | Rich text format | Formatted documents from word processors |

### Instruction Examples

**Executive Summary Instructions:**
```
Create a concise executive summary focusing on:
- Key decisions made
- Strategic implications
- Resource requirements
- Timeline and next steps
Keep it under 200 words for executive consumption.
```

**Action Items Instructions:**
```
Extract all action items and tasks mentioned in the meeting:
- List each action item with assigned owner
- Include deadlines and dependencies
- Prioritize by urgency and importance
- Format as a numbered list for easy tracking
```

**Technical Summary Instructions:**
```
Focus on technical aspects discussed:
- Architecture decisions and rationale
- Technical challenges and solutions
- Implementation details and specifications
- Performance considerations and metrics
```

**Decision Log Instructions:**
```
Document all decisions made during the meeting:
- What was decided
- Who made the decision
- Rationale and alternatives considered
- Impact and implications
- Follow-up actions required
```

### Best Practices

#### For Better Summaries
- **Clear Transcripts**: Ensure transcripts are well-formatted and readable
- **Specific Instructions**: Provide detailed, specific instructions for better results
- **Appropriate Length**: Longer transcripts may need more specific instructions
- **Context**: Include relevant context in your instructions

#### For Email Sharing
- **Descriptive Subjects**: Use clear, descriptive email subject lines
- **Relevant Recipients**: Only include stakeholders who need the information
- **Personal Message**: Add context about why you're sharing the summary
- **Follow-up**: Mention any required actions or responses

#### For File Organization
- **Naming Convention**: Use descriptive filenames (e.g., "2024-01-15-project-kickoff.txt")
- **File Size**: Keep files under 10MB for optimal processing
- **Content Quality**: Clean up transcripts before upload for better results

### Troubleshooting Common Issues

#### Upload Problems
- **File Too Large**: Compress or split large files
- **Unsupported Format**: Convert to .txt, .md, or .rtf
- **Empty File**: Ensure file contains text content
- **Special Characters**: Some special characters may cause issues

#### Summary Generation Issues
- **Timeout Errors**: Try with shorter transcripts or simpler instructions
- **Poor Quality**: Provide more specific instructions or clean up transcript
- **Service Unavailable**: Wait a moment and try again (automatic fallback enabled)

#### Email Sharing Problems
- **Invalid Addresses**: Check email format and spelling
- **Delivery Failures**: Verify email service configuration
- **Large Summaries**: Very long summaries may be truncated in email

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` (Windows) / `Cmd+U` (Mac) | Focus upload area |
| `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac) | Generate summary |
| `Ctrl+S` (Windows) / `Cmd+S` (Mac) | Save summary edits |
| `Ctrl+Shift+S` (Windows) / `Cmd+Shift+S` (Mac) | Open share dialog |

### Privacy and Security

- **File Processing**: Files are processed in memory and not permanently stored
- **Data Retention**: Summaries are temporarily stored for the session only
- **Email Privacy**: Email addresses are not stored or shared
- **AI Processing**: Transcripts are sent to AI services for processing (see privacy policies)
- **Secure Transmission**: All data is transmitted over HTTPS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with comprehensive tests
4. Ensure all tests pass (`npm test`)
5. Run linting (`npm run lint:fix`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request with detailed description

## 📄 License

MIT License - see LICENSE file for details

## 📄 Supported File Formats and Examples

### File Format Support

| Format | Extension | MIME Type | Description | Max Size |
|--------|-----------|-----------|-------------|----------|
| Plain Text | `.txt` | `text/plain` | Simple text files from any source | 10MB |
| Markdown | `.md` | `text/markdown` | Formatted text with markdown syntax | 10MB |
| Rich Text Format | `.rtf` | `application/rtf` | Rich text from word processors | 10MB |

### Content Guidelines

#### Optimal Transcript Format
```
Meeting: Project Kickoff
Date: January 15, 2024
Attendees: John Doe, Jane Smith, Bob Johnson

[10:00 AM] John: Welcome everyone to the project kickoff...
[10:05 AM] Jane: I'd like to discuss the timeline...
[10:15 AM] Bob: From a technical perspective...

Action Items:
- John to prepare project charter by Friday
- Jane to schedule follow-up meeting
- Bob to review technical requirements
```

#### Instruction Templates

**Executive Summary Template:**
```
Create a concise executive summary that includes:
- Meeting purpose and key participants
- Major decisions and their business impact
- Resource commitments and budget implications
- Strategic risks and mitigation strategies
- Next steps and timeline
- Success metrics and KPIs
Limit to 300 words maximum.
```

**Technical Meeting Template:**
```
Focus on technical aspects:
- Architecture decisions and rationale
- Technology stack choices
- Performance requirements and constraints
- Security considerations
- Integration points and dependencies
- Technical risks and mitigation plans
- Development timeline and milestones
```

**Action Items Template:**
```
Extract all actionable items:
- Task description and scope
- Assigned owner and backup
- Due date and dependencies
- Success criteria
- Priority level (High/Medium/Low)
- Required resources
Format as a prioritized checklist.
```

### Content Processing Limits

| Limit Type | Value | Configurable |
|------------|-------|--------------|
| Maximum file size | 10MB | Yes (`MAX_FILE_SIZE`) |
| Maximum content length | 1M characters | Yes (`MAX_CONTENT_LENGTH`) |
| Minimum content length | 10 characters | Yes (`MIN_CONTENT_LENGTH`) |
| Maximum instruction length | 2000 characters | No |
| Maximum recipients per email | 50 | Yes (`EMAIL_MAX_RECIPIENTS`) |

## 🚀 Deployment Guide

### Local Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Check code quality
npm run lint
```

### Production Deployment

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Verify deployment
npm run verify:deployment
```

#### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start

# Health check
curl http://your-domain.com/health
```

### Environment-Specific Configuration

#### Development
```env
NODE_ENV=development
LOG_LEVEL=debug
DEV_ENABLE_DEBUG_ROUTES=true
```

#### Staging
```env
NODE_ENV=staging
LOG_LEVEL=info
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

#### Production
```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_COMPRESSION=true
ENABLE_HELMET=true
ALLOWED_ORIGINS=https://yourdomain.com
```

## 📊 Monitoring and Analytics

### Health Monitoring
- **Endpoint**: `GET /health`
- **Service Status**: `GET /api/services/status`
- **Uptime Tracking**: Built-in uptime counter
- **Error Tracking**: Comprehensive error logging

### Performance Metrics
- **AI Processing Time**: Tracked per request
- **Email Delivery Time**: Monitored for each send
- **File Upload Speed**: Measured and logged
- **API Response Times**: Tracked across all endpoints

### Usage Analytics
- **File Upload Statistics**: Count, size, format distribution
- **Summary Generation**: Success rate, processing time
- **Email Sharing**: Delivery success rate, recipient count
- **Error Rates**: Categorized by type and endpoint

## 🔒 Security Considerations

### Data Protection
- **File Processing**: Files processed in memory, not stored permanently
- **Summary Storage**: Temporary session-based storage only
- **Email Privacy**: Recipient addresses not logged or stored
- **API Keys**: Secure environment variable storage

### Security Features
- **Input Validation**: Comprehensive server-side validation
- **File Type Validation**: Strict file extension and MIME type checking
- **Rate Limiting**: Configurable request limits per IP
- **CORS Protection**: Strict origin validation
- **XSS Prevention**: Input sanitization and output encoding

### Best Practices
- **API Key Rotation**: Regular rotation of AI and email service keys
- **Environment Separation**: Different keys for dev/staging/production
- **Access Logging**: Comprehensive request and error logging
- **Secure Headers**: Helmet.js for security headers in production

## 🆘 Support and Resources

### Documentation Resources
- **Setup Guide**: Complete environment configuration in `.env.example`
- **API Reference**: Comprehensive endpoint documentation above
- **Troubleshooting**: Detailed problem resolution guide
- **User Guide**: Step-by-step usage instructions

### Health and Status Monitoring
- **Application Health**: `http://localhost:3000/health`
- **Service Status**: `http://localhost:3000/api/services/status`
- **AI Service Test**: `POST /api/services/ai/test`
- **Email Service Test**: `POST /api/services/email/test`

### Development Tools
```bash
# Run comprehensive tests
npm test

# Test specific services
npm run test:services

# Performance monitoring
npm run monitor:performance

# Deployment validation
npm run deploy:validate
```

### Getting Help
1. **Check Health Endpoints**: Verify system status first
2. **Review Logs**: Enable debug logging for detailed information
3. **Test Components**: Use individual service test endpoints
4. **Validate Configuration**: Compare `.env` with `.env.example`
5. **Check Dependencies**: Ensure all required services are configured

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🏷️ Version Information

- **Current Version**: 1.0.0
- **Node.js Requirement**: >=16.0.0
- **Last Updated**: January 2024
- **Compatibility**: Modern browsers, mobile-responsive