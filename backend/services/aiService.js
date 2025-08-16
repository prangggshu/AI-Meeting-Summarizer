const axios = require('axios');

/**
 * Abstract AI Service Interface
 * Defines the contract that all AI service implementations must follow
 */
class AIService {
    constructor(config = {}) {
        this.config = config;
        this.timeout = config.timeout || 30000; // 30 seconds default
    }

    /**
     * Generate a summary from transcript and instructions
     * @param {string} transcript - The meeting transcript text
     * @param {string} instructions - Custom summarization instructions
     * @returns {Promise<Object>} Summary response object
     */
    async generateSummary(transcript, instructions) {
        throw new Error('generateSummary method must be implemented by subclass');
    }

    /**
     * Validate the service connection and API key
     * @returns {Promise<boolean>} True if connection is valid
     */
    async validateConnection() {
        throw new Error('validateConnection method must be implemented by subclass');
    }

    /**
     * Get the current service status
     * @returns {Object} Service status information
     */
    getServiceStatus() {
        return {
            name: this.constructor.name,
            configured: !!this.config.apiKey,
            timeout: this.timeout
        };
    }
}

/**
 * Groq AI Service Implementation
 */
class GroqService extends AIService {
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.GROQ_API_KEY;
        this.baseURL = 'https://api.groq.com/openai/v1';
        this.model = config.model || 'llama3-8b-8192';
    }

    async generateSummary(transcript, instructions = '') {
        if (!this.apiKey) {
            throw new Error('Groq API key not configured');
        }

        const defaultInstructions = `Please provide a comprehensive summary of this meeting transcript. Include:
1. Key discussion points
2. Decisions made
3. Action items and assignments
4. Next steps

Format the response in clear sections with bullet points where appropriate.`;

        const prompt = instructions.trim() || defaultInstructions;
        const fullPrompt = `${prompt}\n\nTranscript:\n${transcript}`;

        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that specializes in summarizing meeting transcripts.'
                        },
                        {
                            role: 'user',
                            content: fullPrompt
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                }
            );

            return {
                content: response.data.choices[0].message.content,
                metadata: {
                    service: 'groq',
                    model: this.model,
                    tokensUsed: response.data.usage?.total_tokens || 0,
                    processingTime: Date.now()
                }
            };

        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Groq service timeout - please try again');
            }
            if (error.response?.status === 401) {
                throw new Error('Invalid Groq API key');
            }
            if (error.response?.status === 429) {
                throw new Error('Groq rate limit exceeded - please try again later');
            }
            if (error.response?.status >= 500) {
                throw new Error('Groq service temporarily unavailable');
            }
            
            console.error('Groq API error:', error.response?.data || error.message);
            throw new Error(`Groq service error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async validateConnection() {
        if (!this.apiKey) {
            return false;
        }

        try {
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    getServiceStatus() {
        return {
            ...super.getServiceStatus(),
            name: 'Groq',
            model: this.model,
            baseURL: this.baseURL
        };
    }
}

/**
 * OpenAI Service Implementation (Fallback)
 */
class OpenAIService extends AIService {
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = config.model || 'gpt-3.5-turbo';
    }

    async generateSummary(transcript, instructions = '') {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const defaultInstructions = `Please provide a comprehensive summary of this meeting transcript. Include:
1. Key discussion points
2. Decisions made
3. Action items and assignments
4. Next steps

Format the response in clear sections with bullet points where appropriate.`;

        const prompt = instructions.trim() || defaultInstructions;
        const fullPrompt = `${prompt}\n\nTranscript:\n${transcript}`;

        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that specializes in summarizing meeting transcripts.'
                        },
                        {
                            role: 'user',
                            content: fullPrompt
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                }
            );

            return {
                content: response.data.choices[0].message.content,
                metadata: {
                    service: 'openai',
                    model: this.model,
                    tokensUsed: response.data.usage?.total_tokens || 0,
                    processingTime: Date.now()
                }
            };

        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('OpenAI service timeout - please try again');
            }
            if (error.response?.status === 401) {
                throw new Error('Invalid OpenAI API key');
            }
            if (error.response?.status === 429) {
                throw new Error('OpenAI rate limit exceeded - please try again later');
            }
            if (error.response?.status >= 500) {
                throw new Error('OpenAI service temporarily unavailable');
            }
            
            console.error('OpenAI API error:', error.response?.data || error.message);
            throw new Error(`OpenAI service error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async validateConnection() {
        if (!this.apiKey) {
            return false;
        }

        try {
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    getServiceStatus() {
        return {
            ...super.getServiceStatus(),
            name: 'OpenAI',
            model: this.model,
            baseURL: this.baseURL
        };
    }
}

/**
 * AI Service Manager
 * Manages multiple AI services with fallback capabilities
 */
class AIServiceManager {
    constructor(config = null) {
        this.services = [];
        this.currentServiceIndex = 0;
        this.config = config;
        
        // Initialize services with configuration if provided
        this.initializeServices();
    }

    initializeServices() {
        // Get configuration from environment validation if available
        let aiConfig = null;
        if (this.config) {
            aiConfig = this.config;
        } else {
            // Fallback to environment variables
            try {
                const { getConfig } = require('../config/envValidation');
                aiConfig = getConfig('ai');
            } catch (error) {
                console.warn('Environment validation not available, using fallback configuration');
            }
        }

        // Initialize services in order of preference
        if (aiConfig) {
            this.addService(new GroqService(aiConfig.groq));
            this.addService(new OpenAIService(aiConfig.openai));
        } else {
            // Fallback initialization
            this.addService(new GroqService());
            this.addService(new OpenAIService());
        }
    }

    addService(service) {
        if (!(service instanceof AIService)) {
            throw new Error('Service must extend AIService class');
        }
        this.services.push(service);
    }

    async generateSummary(transcript, instructions = '') {
        if (this.services.length === 0) {
            throw new Error('No AI services configured');
        }

        let lastError;
        
        // Try each service in order
        for (let i = 0; i < this.services.length; i++) {
            const service = this.services[i];
            
            try {
                // Check if service is configured
                const status = service.getServiceStatus();
                if (!status.configured) {
                    console.log(`Skipping ${status.name} - not configured`);
                    continue;
                }

                console.log(`Attempting summary generation with ${status.name}`);
                const result = await service.generateSummary(transcript, instructions);
                
                // Update current service index on success
                this.currentServiceIndex = i;
                
                return {
                    ...result,
                    metadata: {
                        ...result.metadata,
                        attemptedServices: i + 1,
                        successfulService: status.name
                    }
                };

            } catch (error) {
                console.error(`${service.constructor.name} failed:`, error.message);
                lastError = error;
                
                // Continue to next service
                continue;
            }
        }

        // If we get here, all services failed
        throw new Error(`All AI services failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    async validateServices() {
        const results = {};
        
        for (const service of this.services) {
            const status = service.getServiceStatus();
            try {
                const isValid = await service.validateConnection();
                results[status.name] = {
                    configured: status.configured,
                    connected: isValid,
                    status: isValid ? 'healthy' : 'unavailable'
                };
            } catch (error) {
                results[status.name] = {
                    configured: status.configured,
                    connected: false,
                    status: 'error',
                    error: error.message
                };
            }
        }
        
        return results;
    }

    getServicesStatus() {
        return this.services.map(service => service.getServiceStatus());
    }

    getCurrentService() {
        return this.services[this.currentServiceIndex] || null;
    }
}

// Export classes and create singleton manager
module.exports = {
    AIService,
    GroqService,
    OpenAIService,
    AIServiceManager,
    // Singleton instance for easy use
    aiServiceManager: new AIServiceManager()
};