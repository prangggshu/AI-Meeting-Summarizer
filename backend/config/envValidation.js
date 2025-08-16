// Environment Variable Validation and Configuration
// This module validates all required environment variables on startup

const path = require('path');
const fs = require('fs');

// Configuration schema with validation rules
const CONFIG_SCHEMA = {
    // Server Configuration
    PORT: {
        required: false,
        type: 'number',
        default: 3000,
        min: 1,
        max: 65535,
        description: 'Server port number'
    },
    NODE_ENV: {
        required: false,
        type: 'string',
        default: 'development',
        enum: ['development', 'staging', 'production'],
        description: 'Application environment'
    },
    BASE_URL: {
        required: false,
        type: 'url',
        default: 'http://localhost:3000',
        description: 'Base URL for the application'
    },

    // AI Service Configuration
    GROQ_API_KEY: {
        required: true,
        type: 'string',
        minLength: 10,
        pattern: /^gsk_[a-zA-Z0-9]+$/,
        description: 'Groq API key for AI summarization',
        sensitive: true
    },
    OPENAI_API_KEY: {
        required: false,
        type: 'string',
        minLength: 10,
        pattern: /^sk-[a-zA-Z0-9]+$/,
        description: 'OpenAI API key (fallback service)',
        sensitive: true
    },
    AI_SERVICE_TIMEOUT: {
        required: false,
        type: 'number',
        default: 30000,
        min: 5000,
        max: 120000,
        description: 'AI service request timeout in milliseconds'
    },
    AI_MAX_RETRIES: {
        required: false,
        type: 'number',
        default: 3,
        min: 0,
        max: 10,
        description: 'Maximum retry attempts for AI service calls'
    },
    AI_RETRY_DELAY: {
        required: false,
        type: 'number',
        default: 2000,
        min: 500,
        max: 10000,
        description: 'Base delay between AI service retries in milliseconds'
    },

    // Groq-specific settings
    GROQ_MODEL: {
        required: false,
        type: 'string',
        default: 'llama3-8b-8192',
        enum: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
        description: 'Groq model to use for summarization'
    },
    GROQ_MAX_TOKENS: {
        required: false,
        type: 'number',
        default: 4000,
        min: 100,
        max: 8192,
        description: 'Maximum tokens for Groq responses'
    },
    GROQ_TEMPERATURE: {
        required: false,
        type: 'number',
        default: 0.3,
        min: 0,
        max: 2,
        description: 'Temperature setting for Groq model'
    },

    // OpenAI-specific settings
    OPENAI_MODEL: {
        required: false,
        type: 'string',
        default: 'gpt-3.5-turbo',
        enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
        description: 'OpenAI model to use for summarization'
    },
    OPENAI_MAX_TOKENS: {
        required: false,
        type: 'number',
        default: 4000,
        min: 100,
        max: 16000,
        description: 'Maximum tokens for OpenAI responses'
    },
    OPENAI_TEMPERATURE: {
        required: false,
        type: 'number',
        default: 0.3,
        min: 0,
        max: 2,
        description: 'Temperature setting for OpenAI model'
    },

    // Email Service Configuration
    SMTP_HOST: {
        required: true,
        type: 'string',
        minLength: 3,
        description: 'SMTP server hostname'
    },
    SMTP_PORT: {
        required: false,
        type: 'number',
        default: 587,
        min: 1,
        max: 65535,
        description: 'SMTP server port'
    },
    SMTP_SECURE: {
        required: false,
        type: 'boolean',
        default: false,
        description: 'Use SSL/TLS for SMTP connection'
    },
    SMTP_USER: {
        required: true,
        type: 'email',
        description: 'SMTP authentication username (email)',
        sensitive: true
    },
    SMTP_PASS: {
        required: true,
        type: 'string',
        minLength: 1,
        description: 'SMTP authentication password',
        sensitive: true
    },
    EMAIL_FROM: {
        required: true,
        type: 'email',
        description: 'Default sender email address'
    },
    EMAIL_FROM_NAME: {
        required: false,
        type: 'string',
        default: 'Meeting Summarizer',
        description: 'Default sender name'
    },
    EMAIL_TIMEOUT: {
        required: false,
        type: 'number',
        default: 10000,
        min: 1000,
        max: 60000,
        description: 'Email service timeout in milliseconds'
    },
    EMAIL_MAX_RECIPIENTS: {
        required: false,
        type: 'number',
        default: 10,
        min: 1,
        max: 100,
        description: 'Maximum number of email recipients per request'
    },

    // File Upload Configuration
    MAX_FILE_SIZE: {
        required: false,
        type: 'number',
        default: 10485760, // 10MB
        min: 1024, // 1KB
        max: 104857600, // 100MB
        description: 'Maximum file size in bytes'
    },
    ALLOWED_FILE_TYPES: {
        required: false,
        type: 'string',
        default: '.txt,.md,.rtf',
        pattern: /^(\.[a-z]+)(,\.[a-z]+)*$/,
        description: 'Comma-separated list of allowed file extensions'
    },
    MAX_CONTENT_LENGTH: {
        required: false,
        type: 'number',
        default: 1000000,
        min: 100,
        max: 10000000,
        description: 'Maximum content length in characters'
    },
    MIN_CONTENT_LENGTH: {
        required: false,
        type: 'number',
        default: 10,
        min: 1,
        max: 1000,
        description: 'Minimum content length in characters'
    },

    // Security Configuration
    FRONTEND_URL: {
        required: false,
        type: 'url',
        default: 'http://localhost:3000',
        description: 'Frontend URL for CORS configuration'
    },
    ALLOWED_ORIGINS: {
        required: false,
        type: 'string',
        default: 'http://localhost:3000,http://127.0.0.1:3000',
        description: 'Comma-separated list of allowed CORS origins'
    },
    RATE_LIMIT_WINDOW: {
        required: false,
        type: 'number',
        default: 60000,
        min: 1000,
        max: 3600000,
        description: 'Rate limiting window in milliseconds'
    },
    RATE_LIMIT_MAX_REQUESTS: {
        required: false,
        type: 'number',
        default: 100,
        min: 1,
        max: 10000,
        description: 'Maximum requests per rate limit window'
    },
    SESSION_SECRET: {
        required: false,
        type: 'string',
        default: 'change-this-in-production',
        minLength: 16,
        description: 'Session secret for security',
        sensitive: true
    },

    // Logging Configuration
    LOG_LEVEL: {
        required: false,
        type: 'string',
        default: 'info',
        enum: ['error', 'warn', 'info', 'debug'],
        description: 'Logging level'
    },
    LOG_API_REQUESTS: {
        required: false,
        type: 'boolean',
        default: true,
        description: 'Enable API request logging'
    },
    LOG_AI_REQUESTS: {
        required: false,
        type: 'boolean',
        default: true,
        description: 'Enable AI service request logging'
    },
    LOG_EMAIL_EVENTS: {
        required: false,
        type: 'boolean',
        default: true,
        description: 'Enable email event logging'
    }
};

// Validation functions
const validators = {
    string: (value, config) => {
        if (typeof value !== 'string') {
            throw new Error(`Expected string, got ${typeof value}`);
        }
        
        if (config.minLength && value.length < config.minLength) {
            throw new Error(`Minimum length is ${config.minLength}, got ${value.length}`);
        }
        
        if (config.maxLength && value.length > config.maxLength) {
            throw new Error(`Maximum length is ${config.maxLength}, got ${value.length}`);
        }
        
        if (config.pattern && !config.pattern.test(value)) {
            throw new Error(`Value does not match required pattern`);
        }
        
        if (config.enum && !config.enum.includes(value)) {
            throw new Error(`Value must be one of: ${config.enum.join(', ')}`);
        }
        
        return value;
    },

    number: (value, config) => {
        const num = Number(value);
        
        if (isNaN(num)) {
            throw new Error(`Expected number, got ${typeof value}`);
        }
        
        if (config.min !== undefined && num < config.min) {
            throw new Error(`Minimum value is ${config.min}, got ${num}`);
        }
        
        if (config.max !== undefined && num > config.max) {
            throw new Error(`Maximum value is ${config.max}, got ${num}`);
        }
        
        return num;
    },

    boolean: (value, config) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
        }
        throw new Error(`Expected boolean, got ${typeof value}`);
    },

    email: (value, config) => {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (typeof value !== 'string' || !emailRegex.test(value)) {
            throw new Error(`Invalid email format`);
        }
        
        return value;
    },

    url: (value, config) => {
        try {
            new URL(value);
            return value;
        } catch (error) {
            throw new Error(`Invalid URL format`);
        }
    }
};

// Environment validation class
class EnvironmentValidator {
    constructor() {
        this.config = {};
        this.errors = [];
        this.warnings = [];
    }

    // Validate all environment variables
    validate() {
        console.log('🔍 Validating environment configuration...');
        
        this.errors = [];
        this.warnings = [];
        this.config = {};

        // Check for .env file
        this.checkEnvFile();

        // Validate each configuration item
        for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
            try {
                this.validateVariable(key, schema);
            } catch (error) {
                this.errors.push(`${key}: ${error.message}`);
            }
        }

        // Check for unknown environment variables
        this.checkUnknownVariables();

        // Report results
        this.reportResults();

        // Throw error if validation failed
        if (this.errors.length > 0) {
            throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
        }

        return this.config;
    }

    // Validate a single environment variable
    validateVariable(key, schema) {
        const value = process.env[key];
        
        // Handle missing required variables
        if (schema.required && (value === undefined || value === '')) {
            throw new Error(`Required environment variable is missing`);
        }

        // Use default value if not provided
        if (value === undefined || value === '') {
            if (schema.default !== undefined) {
                this.config[key] = schema.default;
                return;
            }
            return; // Optional variable with no default
        }

        // Validate the value
        const validator = validators[schema.type];
        if (!validator) {
            throw new Error(`Unknown validation type: ${schema.type}`);
        }

        try {
            this.config[key] = validator(value, schema);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // Check if .env file exists
    checkEnvFile() {
        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');
        
        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                this.warnings.push('No .env file found. Copy .env.example to .env and configure your settings.');
            } else {
                this.warnings.push('No .env file found. Create one with your configuration settings.');
            }
        }
    }

    // Check for unknown environment variables that might be typos
    checkUnknownVariables() {
        const knownKeys = new Set(Object.keys(CONFIG_SCHEMA));
        const envKeys = Object.keys(process.env).filter(key => 
            key.startsWith('GROQ_') || 
            key.startsWith('OPENAI_') || 
            key.startsWith('SMTP_') || 
            key.startsWith('EMAIL_') ||
            key.startsWith('AI_') ||
            key.startsWith('LOG_') ||
            key.includes('PORT') ||
            key.includes('URL') ||
            key.includes('SECRET')
        );

        const unknownKeys = envKeys.filter(key => !knownKeys.has(key));
        
        if (unknownKeys.length > 0) {
            this.warnings.push(`Unknown environment variables found (possible typos): ${unknownKeys.join(', ')}`);
        }
    }

    // Report validation results
    reportResults() {
        if (this.warnings.length > 0) {
            console.log('⚠️  Environment warnings:');
            this.warnings.forEach(warning => console.log(`   ${warning}`));
        }

        if (this.errors.length > 0) {
            console.log('❌ Environment validation errors:');
            this.errors.forEach(error => console.log(`   ${error}`));
        } else {
            console.log('✅ Environment validation passed');
            
            // Show configuration summary (without sensitive values)
            const summary = this.getConfigSummary();
            console.log('📋 Configuration summary:');
            Object.entries(summary).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        }
    }

    // Get configuration summary (hiding sensitive values)
    getConfigSummary() {
        const summary = {};
        
        for (const [key, value] of Object.entries(this.config)) {
            const schema = CONFIG_SCHEMA[key];
            if (schema && schema.sensitive) {
                summary[key] = '[HIDDEN]';
            } else if (typeof value === 'string' && value.length > 50) {
                summary[key] = value.substring(0, 47) + '...';
            } else {
                summary[key] = value;
            }
        }
        
        return summary;
    }

    // Get configuration for a specific service
    getServiceConfig(service) {
        const configs = {
            ai: {
                groq: {
                    apiKey: this.config.GROQ_API_KEY,
                    model: this.config.GROQ_MODEL,
                    maxTokens: this.config.GROQ_MAX_TOKENS,
                    temperature: this.config.GROQ_TEMPERATURE,
                    timeout: this.config.AI_SERVICE_TIMEOUT,
                    maxRetries: this.config.AI_MAX_RETRIES,
                    retryDelay: this.config.AI_RETRY_DELAY
                },
                openai: {
                    apiKey: this.config.OPENAI_API_KEY,
                    model: this.config.OPENAI_MODEL,
                    maxTokens: this.config.OPENAI_MAX_TOKENS,
                    temperature: this.config.OPENAI_TEMPERATURE,
                    timeout: this.config.AI_SERVICE_TIMEOUT,
                    maxRetries: this.config.AI_MAX_RETRIES,
                    retryDelay: this.config.AI_RETRY_DELAY
                }
            },
            email: {
                smtp: {
                    host: this.config.SMTP_HOST,
                    port: this.config.SMTP_PORT,
                    secure: this.config.SMTP_SECURE,
                    auth: {
                        user: this.config.SMTP_USER,
                        pass: this.config.SMTP_PASS
                    }
                },
                from: this.config.EMAIL_FROM,
                fromName: this.config.EMAIL_FROM_NAME,
                timeout: this.config.EMAIL_TIMEOUT,
                maxRecipients: this.config.EMAIL_MAX_RECIPIENTS
            },
            upload: {
                maxFileSize: this.config.MAX_FILE_SIZE,
                allowedTypes: this.config.ALLOWED_FILE_TYPES.split(','),
                maxContentLength: this.config.MAX_CONTENT_LENGTH,
                minContentLength: this.config.MIN_CONTENT_LENGTH
            },
            security: {
                allowedOrigins: this.config.ALLOWED_ORIGINS.split(','),
                rateLimit: {
                    windowMs: this.config.RATE_LIMIT_WINDOW,
                    max: this.config.RATE_LIMIT_MAX_REQUESTS
                },
                sessionSecret: this.config.SESSION_SECRET
            },
            logging: {
                level: this.config.LOG_LEVEL,
                apiRequests: this.config.LOG_API_REQUESTS,
                aiRequests: this.config.LOG_AI_REQUESTS,
                emailEvents: this.config.LOG_EMAIL_EVENTS
            }
        };

        return configs[service] || null;
    }

    // Generate setup instructions for missing configuration
    generateSetupInstructions() {
        const instructions = [];
        
        if (!this.config.GROQ_API_KEY) {
            instructions.push(`
🔑 GROQ API Key Setup:
1. Visit https://console.groq.com/keys
2. Create a new API key
3. Add to .env: GROQ_API_KEY=your_key_here
            `);
        }

        if (!this.config.SMTP_HOST || !this.config.SMTP_USER || !this.config.SMTP_PASS) {
            instructions.push(`
📧 Email Service Setup:
1. For Gmail:
   - Enable 2FA on your account
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Add to .env:
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your_email@gmail.com
     SMTP_PASS=your_app_password
     EMAIL_FROM=your_email@gmail.com

2. For SendGrid:
   - Get API key from https://app.sendgrid.com/settings/api_keys
   - Add to .env:
     SMTP_HOST=smtp.sendgrid.net
     SMTP_PORT=587
     SMTP_USER=apikey
     SMTP_PASS=your_sendgrid_api_key
            `);
        }

        return instructions.join('\n');
    }
}

// Create and export validator instance
const envValidator = new EnvironmentValidator();

module.exports = {
    validate: () => envValidator.validate(),
    getConfig: (service) => envValidator.getServiceConfig(service),
    getSetupInstructions: () => envValidator.generateSetupInstructions(),
    CONFIG_SCHEMA
};