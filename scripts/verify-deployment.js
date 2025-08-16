#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script verifies that the deployed application is working correctly
 * by testing all API endpoints and functionality.
 */

const https = require('https');
const http = require('http');
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

class DeploymentVerifier {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${path}`;
            const isHttps = url.startsWith('https://');
            const client = isHttps ? https : http;
            
            const requestOptions = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'DeploymentVerifier/1.0',
                    ...options.headers
                },
                timeout: options.timeout || 30000
            };

            const req = client.request(url, requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = data ? JSON.parse(data) : {};
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: jsonData,
                            rawData: data
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: null,
                            rawData: data,
                            parseError: error.message
                        });
                    }
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

    async runTest(name, testFn) {
        try {
            log(`🧪 Testing: ${name}`, 'cyan');
            const result = await testFn();
            
            if (result.success) {
                log(`✅ ${name} - PASSED`, 'green');
                this.results.passed++;
            } else {
                log(`❌ ${name} - FAILED: ${result.message}`, 'red');
                this.results.failed++;
            }
            
            this.results.tests.push({
                name,
                success: result.success,
                message: result.message,
                details: result.details
            });
            
            return result;
        } catch (error) {
            log(`❌ ${name} - ERROR: ${error.message}`, 'red');
            this.results.failed++;
            this.results.tests.push({
                name,
                success: false,
                message: error.message,
                error: true
            });
            return { success: false, message: error.message };
        }
    }

    async testHealthEndpoint() {
        return this.runTest('Health Endpoint', async () => {
            const response = await this.makeRequest('/health');
            
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    message: `Expected status 200, got ${response.statusCode}`,
                    details: response.rawData
                };
            }

            if (!response.data || response.data.status !== 'healthy') {
                return {
                    success: false,
                    message: 'Health check response invalid',
                    details: response.data
                };
            }

            return {
                success: true,
                message: 'Health endpoint responding correctly',
                details: {
                    uptime: response.data.uptime,
                    environment: response.data.environment,
                    services: response.data.services
                }
            };
        });
    }

    async testRootEndpoint() {
        return this.runTest('Root Endpoint', async () => {
            const response = await this.makeRequest('/');
            
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    message: `Expected status 200, got ${response.statusCode}`,
                    details: response.rawData
                };
            }

            if (!response.data || !response.data.message) {
                return {
                    success: false,
                    message: 'Root endpoint response invalid',
                    details: response.data
                };
            }

            return {
                success: true,
                message: 'Root endpoint responding correctly',
                details: response.data
            };
        });
    }

    async testFrontendFiles() {
        return this.runTest('Frontend Files', async () => {
            const files = ['index.html', 'script.js', 'styles.css'];
            const results = [];

            for (const file of files) {
                try {
                    const response = await this.makeRequest(`/${file}`);
                    results.push({
                        file,
                        statusCode: response.statusCode,
                        success: response.statusCode === 200
                    });
                } catch (error) {
                    results.push({
                        file,
                        statusCode: 0,
                        success: false,
                        error: error.message
                    });
                }
            }

            const failedFiles = results.filter(r => !r.success);
            
            if (failedFiles.length > 0) {
                return {
                    success: false,
                    message: `Failed to load files: ${failedFiles.map(f => f.file).join(', ')}`,
                    details: results
                };
            }

            return {
                success: true,
                message: 'All frontend files accessible',
                details: results
            };
        });
    }

    async testAPIEndpoints() {
        return this.runTest('API Endpoints Structure', async () => {
            const endpoints = [
                { path: '/api/upload', method: 'POST' },
                { path: '/api/summarize', method: 'POST' },
                { path: '/api/share', method: 'POST' }
            ];

            const results = [];

            for (const endpoint of endpoints) {
                try {
                    // Test with empty body to check if endpoint exists
                    const response = await this.makeRequest(endpoint.path, {
                        method: endpoint.method,
                        body: {}
                    });
                    
                    // We expect 400 (bad request) for empty body, not 404 (not found)
                    const isEndpointAvailable = response.statusCode !== 404;
                    
                    results.push({
                        ...endpoint,
                        statusCode: response.statusCode,
                        available: isEndpointAvailable
                    });
                } catch (error) {
                    results.push({
                        ...endpoint,
                        statusCode: 0,
                        available: false,
                        error: error.message
                    });
                }
            }

            const unavailableEndpoints = results.filter(r => !r.available);
            
            if (unavailableEndpoints.length > 0) {
                return {
                    success: false,
                    message: `Unavailable endpoints: ${unavailableEndpoints.map(e => e.path).join(', ')}`,
                    details: results
                };
            }

            return {
                success: true,
                message: 'All API endpoints are available',
                details: results
            };
        });
    }

    async testCORSHeaders() {
        return this.runTest('CORS Configuration', async () => {
            const response = await this.makeRequest('/api/upload', {
                method: 'OPTIONS',
                headers: {
                    'Origin': this.baseUrl,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });

            const corsHeaders = {
                'access-control-allow-origin': response.headers['access-control-allow-origin'],
                'access-control-allow-methods': response.headers['access-control-allow-methods'],
                'access-control-allow-headers': response.headers['access-control-allow-headers']
            };

            const hasCORS = Object.values(corsHeaders).some(header => header);

            if (!hasCORS) {
                return {
                    success: false,
                    message: 'CORS headers not properly configured',
                    details: corsHeaders
                };
            }

            return {
                success: true,
                message: 'CORS headers configured correctly',
                details: corsHeaders
            };
        });
    }

    async testSecurityHeaders() {
        return this.runTest('Security Headers', async () => {
            const response = await this.makeRequest('/');
            
            const securityHeaders = {
                'x-content-type-options': response.headers['x-content-type-options'],
                'x-frame-options': response.headers['x-frame-options'],
                'x-xss-protection': response.headers['x-xss-protection']
            };

            const missingHeaders = Object.entries(securityHeaders)
                .filter(([key, value]) => !value)
                .map(([key]) => key);

            if (missingHeaders.length > 0) {
                return {
                    success: false,
                    message: `Missing security headers: ${missingHeaders.join(', ')}`,
                    details: securityHeaders
                };
            }

            return {
                success: true,
                message: 'Security headers configured correctly',
                details: securityHeaders
            };
        });
    }

    async testEnvironmentConfiguration() {
        return this.runTest('Environment Configuration', async () => {
            const response = await this.makeRequest('/health');
            
            if (response.statusCode !== 200 || !response.data) {
                return {
                    success: false,
                    message: 'Cannot access health endpoint for environment check'
                };
            }

            const { environment, services } = response.data;

            if (environment !== 'production') {
                return {
                    success: false,
                    message: `Expected production environment, got: ${environment}`,
                    details: { environment }
                };
            }

            const issues = [];
            
            if (!services.ai.groq.configured) {
                issues.push('Groq AI service not configured');
            }
            
            if (!services.email.configured) {
                issues.push('Email service not configured');
            }

            if (issues.length > 0) {
                return {
                    success: false,
                    message: `Configuration issues: ${issues.join(', ')}`,
                    details: services
                };
            }

            return {
                success: true,
                message: 'Environment and services configured correctly',
                details: { environment, services }
            };
        });
    }

    async runAllTests() {
        log('🚀 Starting Deployment Verification...', 'magenta');
        log(`🌐 Testing URL: ${this.baseUrl}`, 'blue');
        log('=' .repeat(60), 'magenta');

        // Run all tests
        await this.testHealthEndpoint();
        await this.testRootEndpoint();
        await this.testFrontendFiles();
        await this.testAPIEndpoints();
        await this.testCORSHeaders();
        await this.testSecurityHeaders();
        await this.testEnvironmentConfiguration();

        // Display results
        log('\n' + '=' .repeat(60), 'magenta');
        log('📊 Verification Results:', 'magenta');
        log(`✅ Passed: ${this.results.passed}`, 'green');
        log(`❌ Failed: ${this.results.failed}`, 'red');
        log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`, 'cyan');

        if (this.results.failed > 0) {
            log('\n🔍 Failed Tests:', 'red');
            this.results.tests
                .filter(test => !test.success)
                .forEach(test => {
                    log(`  • ${test.name}: ${test.message}`, 'red');
                });
        }

        log('\n' + '=' .repeat(60), 'magenta');
        
        if (this.results.failed === 0) {
            log('🎉 All tests passed! Deployment is successful.', 'green');
            return true;
        } else {
            log('❌ Some tests failed. Please review and fix the issues.', 'red');
            return false;
        }
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            summary: {
                total: this.results.passed + this.results.failed,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)
            },
            tests: this.results.tests
        };

        const reportPath = path.join(__dirname, '..', 'deployment-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log(`📄 Report saved to: ${reportPath}`, 'blue');
        
        return report;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const baseUrl = args[0] || 'http://localhost:3000';

    if (!baseUrl) {
        log('❌ Please provide a base URL to test', 'red');
        log('Usage: node verify-deployment.js <base-url>', 'white');
        log('Example: node verify-deployment.js https://your-app.vercel.app', 'white');
        process.exit(1);
    }

    const verifier = new DeploymentVerifier(baseUrl);
    
    try {
        const success = await verifier.runAllTests();
        verifier.generateReport();
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        log(`💥 Verification failed with error: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = DeploymentVerifier;