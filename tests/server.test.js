const request = require('supertest');
const app = require('../backend/server');

describe('Express Server Basic Functionality', () => {
    describe('GET /', () => {
        it('should return API information', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);
            
            expect(response.body).toHaveProperty('message', 'AI Meeting Notes Summarizer API');
            expect(response.body).toHaveProperty('version', '1.0.0');
            expect(response.body).toHaveProperty('endpoints');
        });
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);
            
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('environment');
        });
    });

    describe('404 Handler', () => {
        it('should return 404 for undefined routes', async () => {
            const response = await request(app)
                .get('/nonexistent-route')
                .expect(404);
            
            expect(response.body).toHaveProperty('error', 'Not Found');
            expect(response.body.message).toContain('Route GET /nonexistent-route not found');
        });
    });

    describe('Middleware', () => {
        it('should handle JSON requests', async () => {
            const response = await request(app)
                .post('/nonexistent-post-route')
                .send({ test: 'data' })
                .set('Content-Type', 'application/json')
                .expect(404); // Route doesn't exist, but middleware should process JSON
            
            // If we get here without error, JSON middleware is working
            expect(response.body).toHaveProperty('error', 'Not Found');
        });

        it('should include CORS headers', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);
            
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
    });

    describe('Error Handling', () => {
        it('should handle large payloads gracefully', async () => {
            const largePayload = 'x'.repeat(15 * 1024 * 1024); // 15MB payload
            
            const response = await request(app)
                .post('/nonexistent-post-route')
                .send({ data: largePayload })
                .set('Content-Type', 'application/json');
            
            expect(response.status).toBe(413);
            expect(response.body).toHaveProperty('error', 'File too large');
        });
    });
});