#!/usr/bin/env node

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
            const url = `${this.baseUrl}${path}`;
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
                console.log(`${status} ${endpoint.path}: ${result.responseTime}ms`);
            } catch (error) {
                console.log(`❌ ${endpoint.path}: ERROR - ${error.message}`);
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
        
        console.log('\n📊 Performance Report:');
        console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log(`Fastest Endpoint: ${Math.min(...validResults.map(r => r.responseTime))}ms`);
        console.log(`Slowest Endpoint: ${Math.max(...validResults.map(r => r.responseTime))}ms`);
        
        const slowEndpoints = validResults.filter(r => r.responseTime > 2000);
        if (slowEndpoints.length > 0) {
            console.log('\n⚠️  Slow endpoints (>2s):');
            slowEndpoints.forEach(r => {
                console.log(`  • ${r.path}: ${r.responseTime}ms`);
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
