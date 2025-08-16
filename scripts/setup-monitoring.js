#!/usr/bin/env node

/**
 * Production Monitoring Setup Script
 * 
 * This script helps set up monitoring and error tracking for the production deployment.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function createVercelAnalyticsConfig() {
    log('📊 Setting up Vercel Analytics...', 'cyan');
    
    const analyticsConfig = {
        "analytics": {
            "id": "your-analytics-id"
        },
        "speed-insights": {
            "id": "your-speed-insights-id"
        }
    };

    log('To enable Vercel Analytics:', 'white');
    log('1. Go to your Vercel dashboard', 'white');
    log('2. Select your project', 'white');
    log('3. Navigate to Analytics tab', 'white');
    log('4. Enable Analytics and Speed Insights', 'white');
    log('5. Copy the IDs and update vercel.json', 'white');

    return analyticsConfig;
}

function createHealthCheckScript() {
    log('🏥 Creating health check script...', 'cyan');
    
    const healthCheckScript = `#!/bin/bash

# Production Health Check Script
# This script monitors the application health and sends alerts if issues are detected

BASE_URL="$1"
WEBHOOK_URL="$2"  # Optional: Slack webhook for alerts

if [ -z "$BASE_URL" ]; then
    echo "Usage: $0 <base-url> [webhook-url]"
    echo "Example: $0 https://your-app.vercel.app https://hooks.slack.com/..."
    exit 1
fi

echo "🏥 Checking application health..."
echo "URL: $BASE_URL"

# Check health endpoint
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$BASE_URL/health")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | tail -c 4)

if [ "$HEALTH_STATUS" != "200" ]; then
    echo "❌ Health check failed with status: $HEALTH_STATUS"
    
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \\
            --data "{\\"text\\":\\"🚨 Health check failed for $BASE_URL - Status: $HEALTH_STATUS\\"}" \\
            "$WEBHOOK_URL"
    fi
    
    exit 1
fi

echo "✅ Health check passed"

# Check API endpoints
echo "🔍 Testing API endpoints..."

# Test upload endpoint (should return 400 for empty request)
UPLOAD_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/api/upload")
if [ "$UPLOAD_STATUS" = "404" ]; then
    echo "❌ Upload endpoint not found"
    exit 1
fi

# Test summarize endpoint (should return 400 for empty request)
SUMMARIZE_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/api/summarize")
if [ "$SUMMARIZE_STATUS" = "404" ]; then
    echo "❌ Summarize endpoint not found"
    exit 1
fi

# Test share endpoint (should return 400 for empty request)
SHARE_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/api/share")
if [ "$SHARE_STATUS" = "404" ]; then
    echo "❌ Share endpoint not found"
    exit 1
fi

echo "✅ All API endpoints are accessible"

# Check frontend files
echo "🌐 Testing frontend files..."

FRONTEND_FILES=("index.html" "script.js" "styles.css")
for file in "\${FRONTEND_FILES[@]}"; do
    STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/$file")
    if [ "$STATUS" != "200" ]; then
        echo "❌ Frontend file $file failed with status: $STATUS"
        exit 1
    fi
done

echo "✅ All frontend files are accessible"

# Parse health response for service status
if command -v jq &> /dev/null; then
    echo "🔧 Checking service configuration..."
    
    AI_CONFIGURED=$(jq -r '.services.ai.groq.configured' /tmp/health_response.json)
    EMAIL_CONFIGURED=$(jq -r '.services.email.configured' /tmp/health_response.json)
    
    if [ "$AI_CONFIGURED" != "true" ]; then
        echo "⚠️  AI service not properly configured"
    else
        echo "✅ AI service configured"
    fi
    
    if [ "$EMAIL_CONFIGURED" != "true" ]; then
        echo "⚠️  Email service not properly configured"
    else
        echo "✅ Email service configured"
    fi
fi

echo "🎉 All health checks passed!"

# Cleanup
rm -f /tmp/health_response.json
`;

    const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.sh');
    fs.writeFileSync(scriptPath, healthCheckScript);
    
    // Make script executable (on Unix systems)
    try {
        fs.chmodSync(scriptPath, '755');
    } catch (error) {
        // Ignore chmod errors on Windows
    }
    
    log(`✅ Health check script created: ${scriptPath}`, 'green');
    return scriptPath;
}

function createCronJobExample() {
    log('⏰ Creating cron job example...', 'cyan');
    
    const cronExample = `# Production Monitoring Cron Jobs
# Add these to your server's crontab to monitor the application

# Health check every 5 minutes
*/5 * * * * /path/to/your/scripts/health-check.sh https://your-app.vercel.app https://your-slack-webhook-url

# Daily deployment verification
0 6 * * * /usr/bin/node /path/to/your/scripts/verify-deployment.js https://your-app.vercel.app

# Weekly performance report (if you have additional monitoring tools)
0 9 * * 1 /path/to/your/scripts/performance-report.sh https://your-app.vercel.app

# Example Slack webhook setup:
# 1. Go to your Slack workspace
# 2. Create a new app or use existing one
# 3. Add Incoming Webhooks feature
# 4. Create a webhook for your channel
# 5. Use the webhook URL in the cron jobs above

# To install these cron jobs:
# 1. Save this content to a file (e.g., monitoring-cron.txt)
# 2. Update the paths and URLs
# 3. Run: crontab monitoring-cron.txt
# 4. Verify with: crontab -l
`;

    const cronPath = path.join(__dirname, '..', 'monitoring-cron.example');
    fs.writeFileSync(cronPath, cronExample);
    
    log(`✅ Cron job example created: ${cronPath}`, 'green');
    return cronPath;
}

function createErrorTrackingSetup() {
    log('🐛 Setting up error tracking...', 'cyan');
    
    const errorTrackingGuide = `# Error Tracking Setup Guide

## Sentry Integration (Recommended)

### 1. Create Sentry Account
- Visit https://sentry.io/signup/
- Create a new project for Node.js
- Copy your DSN (Data Source Name)

### 2. Install Sentry SDK
\`\`\`bash
npm install @sentry/node @sentry/tracing
\`\`\`

### 3. Add to Environment Variables
Add to your Vercel environment variables:
\`\`\`
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
\`\`\`

### 4. Initialize in server.js
Add at the top of backend/server.js:
\`\`\`javascript
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || 'production',
        release: process.env.SENTRY_RELEASE || '1.0.0',
        integrations: [
            new Sentry.Integrations.Http({ tracing: true }),
            new Tracing.Integrations.Express({ app }),
        ],
        tracesSampleRate: 0.1,
    });
}
\`\`\`

## Alternative: LogRocket

### 1. Create LogRocket Account
- Visit https://logrocket.com/
- Create a new project
- Copy your app ID

### 2. Add Environment Variable
\`\`\`
LOGROCKET_APP_ID=your_app_id_here
\`\`\`

## Custom Error Logging

### Environment Variables for Custom Logging
\`\`\`
LOG_LEVEL=error
ERROR_WEBHOOK_URL=https://your-webhook-url
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
\`\`\`

### Webhook Payload Example
\`\`\`json
{
    "text": "🚨 Application Error",
    "attachments": [
        {
            "color": "danger",
            "fields": [
                {
                    "title": "Error Message",
                    "value": "Error details here",
                    "short": false
                },
                {
                    "title": "URL",
                    "value": "https://your-app.vercel.app",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "2024-01-01T00:00:00Z",
                    "short": true
                }
            ]
        }
    ]
}
\`\`\`
`;

    const guidePath = path.join(__dirname, '..', 'ERROR_TRACKING.md');
    fs.writeFileSync(guidePath, errorTrackingGuide);
    
    log(`✅ Error tracking guide created: ${guidePath}`, 'green');
    return guidePath;
}

function createPerformanceMonitoring() {
    log('⚡ Setting up performance monitoring...', 'cyan');
    
    const performanceScript = `#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Tests application performance and generates reports
 */

const https = require('https');
const http = require('http');

class PerformanceMonitor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.results = [];
    }

    async measureEndpoint(path, options = {}) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const url = \`\${this.baseUrl}\${path}\`;
            const isHttps = url.startsWith('https://');
            const client = isHttps ? https : http;
            
            const req = client.request(url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: 30000
            }, (res) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        path,
                        statusCode: res.statusCode,
                        responseTime,
                        contentLength: data.length,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(JSON.stringify(options.body));
            }

            req.end();
        });
    }

    async runPerformanceTests() {
        console.log('⚡ Running performance tests...');
        
        const endpoints = [
            { path: '/health' },
            { path: '/' },
            { path: '/index.html' },
            { path: '/script.js' },
            { path: '/styles.css' }
        ];

        for (const endpoint of endpoints) {
            try {
                const result = await this.measureEndpoint(endpoint.path);
                this.results.push(result);
                
                const status = result.statusCode === 200 ? '✅' : '❌';
                console.log(\`\${status} \${endpoint.path}: \${result.responseTime}ms\`);
            } catch (error) {
                console.log(\`❌ \${endpoint.path}: ERROR - \${error.message}\`);
                this.results.push({
                    path: endpoint.path,
                    error: error.message,
                    responseTime: null
                });
            }
        }

        this.generateReport();
    }

    generateReport() {
        const validResults = this.results.filter(r => r.responseTime !== null);
        const avgResponseTime = validResults.reduce((sum, r) => sum + r.responseTime, 0) / validResults.length;
        
        console.log('\\n📊 Performance Report:');
        console.log(\`Average Response Time: \${Math.round(avgResponseTime)}ms\`);
        console.log(\`Fastest Endpoint: \${Math.min(...validResults.map(r => r.responseTime))}ms\`);
        console.log(\`Slowest Endpoint: \${Math.max(...validResults.map(r => r.responseTime))}ms\`);
        
        const slowEndpoints = validResults.filter(r => r.responseTime > 2000);
        if (slowEndpoints.length > 0) {
            console.log('\\n⚠️  Slow endpoints (>2s):');
            slowEndpoints.forEach(r => {
                console.log(\`  • \${r.path}: \${r.responseTime}ms\`);
            });
        }
    }
}

async function main() {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    const monitor = new PerformanceMonitor(baseUrl);
    await monitor.runPerformanceTests();
}

if (require.main === module) {
    main();
}
`;

    const scriptPath = path.join(__dirname, '..', 'scripts', 'performance-monitor.js');
    fs.writeFileSync(scriptPath, performanceScript);
    
    log(`✅ Performance monitoring script created: ${scriptPath}`, 'green');
    return scriptPath;
}

function main() {
    log('🔧 Setting up Production Monitoring...', 'magenta');
    log('=' .repeat(60), 'magenta');

    // Create monitoring components
    createVercelAnalyticsConfig();
    createHealthCheckScript();
    createCronJobExample();
    createErrorTrackingSetup();
    createPerformanceMonitoring();

    log('\n' + '=' .repeat(60), 'magenta');
    log('✅ Monitoring setup completed!', 'green');
    
    log('\\n📋 Next Steps:', 'cyan');
    log('1. Set up Vercel Analytics in your dashboard', 'white');
    log('2. Configure error tracking (Sentry recommended)', 'white');
    log('3. Set up health check monitoring', 'white');
    log('4. Configure alerting webhooks', 'white');
    log('5. Test all monitoring components', 'white');
    
    log('\\n🔗 Useful Commands:', 'blue');
    log('• Test deployment: npm run verify:deployment <url>', 'white');
    log('• Health check: ./scripts/health-check.sh <url>', 'white');
    log('• Performance test: node scripts/performance-monitor.js <url>', 'white');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    createVercelAnalyticsConfig,
    createHealthCheckScript,
    createErrorTrackingSetup,
    createPerformanceMonitoring
};