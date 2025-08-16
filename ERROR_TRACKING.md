# Error Tracking Setup Guide

## Sentry Integration (Recommended)

### 1. Create Sentry Account
- Visit https://sentry.io/signup/
- Create a new project for Node.js
- Copy your DSN (Data Source Name)

### 2. Install Sentry SDK
```bash
npm install @sentry/node @sentry/tracing
```

### 3. Add to Environment Variables
Add to your Vercel environment variables:
```
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

### 4. Initialize in server.js
Add at the top of backend/server.js:
```javascript
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
```

## Alternative: LogRocket

### 1. Create LogRocket Account
- Visit https://logrocket.com/
- Create a new project
- Copy your app ID

### 2. Add Environment Variable
```
LOGROCKET_APP_ID=your_app_id_here
```

## Custom Error Logging

### Environment Variables for Custom Logging
```
LOG_LEVEL=error
ERROR_WEBHOOK_URL=https://your-webhook-url
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Webhook Payload Example
```json
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
```
