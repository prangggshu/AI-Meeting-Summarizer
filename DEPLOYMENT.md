# Deployment Guide - AI Meeting Notes Summarizer

This guide provides comprehensive instructions for deploying the AI Meeting Notes Summarizer to Vercel with production monitoring and verification.

## 📋 Prerequisites

Before deploying, ensure you have:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Vercel CLI](https://vercel.com/cli) installed globally: `npm install -g vercel`
- API keys for AI services (Groq and/or OpenAI)
- Email service credentials (Gmail App Password or SendGrid API key)
- A Vercel account

## 🚀 Quick Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Validate Deployment Configuration

```bash
npm run deploy:validate
```

This script will check:
- Required files are present
- `vercel.json` configuration is valid
- `package.json` has required scripts
- Environment variables checklist

### 3. Deploy to Vercel

```bash
# First-time deployment (follow prompts)
vercel

# Production deployment
vercel --prod

# Or use the npm script
npm run deploy:vercel
```

## 🔧 Environment Configuration

### Required Environment Variables

Set these in your Vercel dashboard (Settings > Environment Variables):

#### Core Configuration
```
NODE_ENV=production
BASE_URL=https://your-app-name.vercel.app
```

#### AI Service Configuration
```
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here (optional fallback)
AI_SERVICE_TIMEOUT=25000
AI_MAX_RETRIES=2
GROQ_MODEL=llama3-8b-8192
```

#### Email Service Configuration
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=AI Meeting Summarizer
```

#### Security Configuration
```
SESSION_SECRET=your_super_secure_random_string_here
ALLOWED_ORIGINS=https://your-app-name.vercel.app
FRONTEND_URL=https://your-app-name.vercel.app
```

### Setting Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** > **Environment Variables**
4. Add each variable:
   - **Name**: Variable name (e.g., `GROQ_API_KEY`)
   - **Value**: Your actual value
   - **Environment**: Select "Production" (and "Preview" if needed)
5. Click **Save**

## 🔑 API Keys Setup

### Groq API Key
1. Visit [Groq Console](https://console.groq.com/keys)
2. Create a new API key
3. Copy the key and add it as `GROQ_API_KEY` in Vercel

### OpenAI API Key (Optional)
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and add it as `OPENAI_API_KEY` in Vercel

### Gmail SMTP Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Select "Mail" and your device
   - Copy the generated password
3. Use your Gmail address for `SMTP_USER`
4. Use the App Password for `SMTP_PASS`

## 📁 Project Structure for Deployment

```
ai-meeting-notes-summarizer/
├── backend/
│   ├── server.js           # Main server file
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── config/             # Configuration
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── script.js           # Frontend JavaScript
│   └── styles.css          # Styling
├── scripts/
│   └── deploy-vercel.js    # Deployment validation
├── vercel.json             # Vercel configuration
├── package.json            # Dependencies and scripts
├── .env.example            # Environment template
├── .env.production.example # Production environment template
└── DEPLOYMENT.md           # This file
```

## ⚙️ Vercel Configuration Details

The `vercel.json` file is optimized for:

- **Serverless Functions**: Backend API runs as serverless functions
- **Static Files**: Frontend files served with optimal caching
- **Security Headers**: XSS protection, content type sniffing prevention
- **CORS Configuration**: Proper cross-origin resource sharing
- **Cache Optimization**: Long-term caching for static assets
- **Function Timeout**: 30-second timeout for AI processing

### Key Configuration Features

```json
{
  "functions": {
    "backend/server.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

## 🧪 Testing Deployment

### Automated Verification
Use the built-in verification script to test your deployment:

```bash
# Test your deployed application
npm run verify:deployment https://your-app-name.vercel.app

# Or run directly
node scripts/verify-deployment.js https://your-app-name.vercel.app
```

This script automatically tests:
- Health endpoint functionality
- API endpoint availability
- Frontend file accessibility
- CORS configuration
- Security headers
- Environment configuration

### Manual Testing Steps

#### 1. Health Check
Visit your health endpoint:
```
https://your-app-name.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "production",
  "services": {
    "ai": {
      "groq": { "configured": true },
      "openai": { "configured": true }
    },
    "email": { "configured": true }
  }
}
```

#### 2. Complete Workflow Test
1. Visit `https://your-app-name.vercel.app`
2. Upload a text file (.txt, .md, or .rtf)
3. Add custom summarization instructions
4. Generate a summary using AI
5. Edit the generated summary
6. Share the summary via email

#### 3. API Endpoint Testing
Test each API endpoint:
- `POST /api/upload` - File upload
- `POST /api/summarize` - AI summarization
- `PUT /api/summary/:id` - Summary editing
- `POST /api/share` - Email sharing

## 🔍 Monitoring and Debugging

### Vercel Logs
View deployment and runtime logs:
```bash
vercel logs your-app-name.vercel.app
```

### Function Logs
Monitor serverless function execution:
1. Go to Vercel Dashboard
2. Select your project
3. Navigate to **Functions** tab
4. Click on a function to view logs

### Error Tracking
The application includes comprehensive error handling:
- Client-side validation errors
- API error responses
- AI service failures
- Email delivery issues

## 🚨 Troubleshooting

### Common Issues

#### 1. Environment Variables Not Set
**Error**: "Environment validation failed"
**Solution**: Ensure all required environment variables are set in Vercel dashboard

#### 2. AI Service Errors
**Error**: "AI service unavailable"
**Solution**: 
- Verify API keys are correct
- Check API key quotas and limits
- Ensure network connectivity

#### 3. Email Delivery Failures
**Error**: "Email sending failed"
**Solution**:
- Verify SMTP credentials
- Check Gmail App Password setup
- Ensure "Less secure app access" is disabled (use App Password)

#### 4. File Upload Issues
**Error**: "File too large" or "Invalid file type"
**Solution**:
- Check file size limits in environment variables
- Verify allowed file types configuration
- Ensure proper CORS headers

#### 5. CORS Errors
**Error**: "Access-Control-Allow-Origin"
**Solution**:
- Update `ALLOWED_ORIGINS` with your actual domain
- Verify `FRONTEND_URL` matches your deployment URL

### Debug Mode
Enable debug logging by setting:
```
LOG_LEVEL=debug
LOG_API_REQUESTS=true
```

## 🔄 Continuous Deployment

### GitHub Integration
1. Connect your repository to Vercel
2. Enable automatic deployments
3. Set up branch protection rules
4. Configure preview deployments

### Environment-Specific Deployments
- **Production**: `main` branch → Production environment
- **Staging**: `develop` branch → Preview environment
- **Feature**: Feature branches → Preview deployments

## 📊 Performance Optimization

### Vercel Optimizations Applied
- **Edge Caching**: Static assets cached at edge locations
- **Compression**: Gzip compression enabled
- **Image Optimization**: Automatic image optimization (if images added)
- **Function Optimization**: Minimal cold start times

### Setting Up Production Monitoring

#### 1. Initialize Monitoring Setup
```bash
npm run setup:monitoring
```

This creates:
- Health check scripts
- Performance monitoring tools
- Error tracking configuration
- Cron job examples for automated monitoring

#### 2. Vercel Analytics
Enable in your Vercel dashboard:
1. Go to your project settings
2. Navigate to Analytics tab
3. Enable Analytics and Speed Insights
4. Monitor real-time performance data

#### 3. Health Monitoring
Set up automated health checks:

```bash
# Manual health check
./scripts/health-check.sh https://your-app-name.vercel.app

# Set up cron job for continuous monitoring
# Add to crontab: */5 * * * * /path/to/scripts/health-check.sh https://your-app-name.vercel.app
```

#### 4. Performance Monitoring
Monitor application performance:

```bash
# Run performance tests
npm run monitor:performance https://your-app-name.vercel.app

# Expected output:
# ✅ /health: 150ms
# ✅ /: 200ms
# ✅ /index.html: 100ms
```

#### 5. Error Tracking (Optional)
Set up Sentry for error tracking:

1. Create account at https://sentry.io
2. Add environment variables:
   ```
   SENTRY_DSN=your_sentry_dsn
   SENTRY_ENVIRONMENT=production
   ```
3. Follow the setup guide in `ERROR_TRACKING.md`

### Monitoring Performance
- Use Vercel Analytics for performance insights
- Monitor function execution times with health checks
- Track API response times with performance scripts
- Monitor error rates with error tracking tools

## 🔒 Security Considerations

### Production Security Features
- **HTTPS**: Automatic SSL/TLS certificates
- **Security Headers**: XSS protection, content sniffing prevention
- **Environment Variables**: Secure storage of sensitive data
- **Rate Limiting**: API rate limiting implemented
- **Input Validation**: Comprehensive input sanitization

### Security Checklist
- [ ] All API keys stored as environment variables
- [ ] Strong session secret generated
- [ ] CORS properly configured
- [ ] File upload validation enabled
- [ ] Rate limiting configured
- [ ] Security headers applied

## 📞 Support

If you encounter issues during deployment:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review Vercel logs for error details
3. Validate environment variables are set correctly
4. Test API keys independently
5. Verify email service configuration

For additional help:
- [Vercel Documentation](https://vercel.com/docs)
- [Node.js Deployment Guide](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Last Updated**: December 2024
**Version**: 1.0.0