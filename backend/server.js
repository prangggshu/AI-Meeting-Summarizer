// AI Meeting Notes Summarizer - Backend Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Validate environment configuration on startup
const { validate: validateEnv, getConfig } = require('./config/envValidation');

let config;
try {
    config = validateEnv();
    console.log('✅ Environment validation completed successfully');
} catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error.message);
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    console.error('📖 See .env.example for configuration template and setup instructions.');
    process.exit(1);
}

const app = express();
const PORT = config.PORT || 3000;

// Get security configuration
const securityConfig = getConfig('security');

// Middleware setup
app.use(cors({
    origin: securityConfig.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Handle specific error types
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'File too large',
            message: 'The uploaded file exceeds the maximum size limit'
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
});

// Import routes
const uploadRoutes = require('./routes/upload');
const summarizeRoutes = require('./routes/summarize');
const shareRoutes = require('./routes/share');
const servicesRoutes = require('./routes/services');

// Initialize services with validated configuration
const { aiServiceManager } = require('./services/aiService');
const { emailService } = require('./services/emailService');

// Initialize services
(async () => {
    try {
        // Initialize AI service manager with validated config
        const aiConfig = getConfig('ai');
        if (aiConfig) {
            // Reinitialize with validated config
            aiServiceManager.config = aiConfig;
            aiServiceManager.services = [];
            aiServiceManager.initializeServices();
        }

        // Initialize email service with validated config
        const emailConfig = getConfig('email');
        emailService.config = emailConfig;
        await emailService.initialize();

        console.log('🚀 Services initialization completed');
    } catch (error) {
        console.error('⚠️  Service initialization warning:', error.message);
    }
})();

// Health check endpoint with configuration status
app.get('/health', (req, res) => {
    const aiConfig = getConfig('ai');
    const emailConfig = getConfig('email');

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV || 'development',
        services: {
            ai: {
                groq: {
                    configured: !!aiConfig.groq.apiKey,
                    model: aiConfig.groq.model
                },
                openai: {
                    configured: !!aiConfig.openai.apiKey,
                    model: aiConfig.openai.model
                }
            },
            email: {
                configured: !!(emailConfig.smtp.host && emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass),
                host: emailConfig.smtp.host,
                port: emailConfig.smtp.port
            }
        },
        configuration: {
            maxFileSize: getConfig('upload').maxFileSize,
            allowedFileTypes: getConfig('upload').allowedTypes,
            rateLimit: securityConfig.rateLimit
        }
    });
});

// Serve static files from frontend directory
app.use(express.static('frontend'));

// API routes
app.use('/api', uploadRoutes);
app.use('/api', summarizeRoutes);
app.use('/api', shareRoutes);
app.use('/api', servicesRoutes);

// Add health endpoint to API routes as well
app.get('/api/health', (req, res) => {
    const aiConfig = getConfig('ai');
    const emailConfig = getConfig('email');

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV || 'development',
        services: {
            ai: {
                groq: {
                    configured: !!aiConfig.groq.apiKey,
                    model: aiConfig.groq.model
                },
                openai: {
                    configured: !!aiConfig.openai.apiKey,
                    model: aiConfig.openai.model
                }
            },
            email: {
                configured: !!(emailConfig.smtp.host && emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass),
                host: emailConfig.smtp.host,
                port: emailConfig.smtp.port
            }
        },
        configuration: {
            maxFileSize: getConfig('upload').maxFileSize,
            allowedFileTypes: getConfig('upload').allowedTypes,
            rateLimit: securityConfig.rateLimit
        }
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'AI Meeting Notes Summarizer API',
        version: '1.0.0',
        environment: config.NODE_ENV || 'development',
        endpoints: {
            health: '/health',
            upload: '/api/upload',
            file: '/api/file/:id',
            summarize: '/api/summarize',
            summary: '/api/summary/:id',
            share: '/api/share',
            shareRecord: '/api/share/:id',
            services: {
                status: '/api/services/status',
                aiStatus: '/api/services/ai/status',
                emailStatus: '/api/services/email/status',
                testEmail: '/api/services/email/test',
                testAI: '/api/services/ai/test'
            }
        },
        documentation: {
            setup: 'See .env.example for configuration instructions',
            apiDocs: 'Visit /health for system status'
        }
    });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health check available at: http://localhost:${PORT}/health`);
    });
}

module.exports = app;