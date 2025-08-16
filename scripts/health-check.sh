#!/bin/bash

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
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Health check failed for $BASE_URL - Status: $HEALTH_STATUS\"}" \
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
for file in "${FRONTEND_FILES[@]}"; do
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
