const axios = require('axios');
const { 
    AIService, 
    GroqService, 
    OpenAIService, 
    AIServiceManager 
} = require('../backend/services/aiService');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('AI Service Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear environment variables
        delete process.env.GROQ_API_KEY;
        delete process.env.OPENAI_API_KEY;
    });

    describe('AIService Base Class', () => {
        it('should throw error for unimplemented methods', async () => {
            const service = new AIService();
            
            await expect(service.generateSummary('test', 'test'))
                .rejects.toThrow('generateSummary method must be implemented by subclass');
            
            await expect(service.validateConnection())
                .rejects.toThrow('validateConnection method must be implemented by subclass');
        });

        it('should return basic service status', () => {
            const service = new AIService({ apiKey: 'test-key', timeout: 5000 });
            const status = service.getServiceStatus();
            
            expect(status.name).toBe('AIService');
            expect(status.configured).toBe(true);
            expect(status.timeout).toBe(5000);
        });
    });

    describe('GroqService', () => {
        let groqService;

        beforeEach(() => {
            groqService = new GroqService({ apiKey: 'test-groq-key' });
        });

        it('should initialize with correct configuration', () => {
            const status = groqService.getServiceStatus();
            
            expect(status.name).toBe('Groq');
            expect(status.configured).toBe(true);
            expect(status.model).toBe('llama3-8b-8192');
            expect(status.baseURL).toBe('https://api.groq.com/openai/v1');
        });

        it('should generate summary successfully', async () => {
            const mockResponse = {
                data: {
                    choices: [{
                        message: {
                            content: 'This is a test summary of the meeting.'
                        }
                    }],
                    usage: {
                        total_tokens: 150
                    }
                }
            };

            mockedAxios.post.mockResolvedValue(mockResponse);

            const result = await groqService.generateSummary(
                'Test meeting transcript',
                'Summarize this meeting'
            );

            expect(result.content).toBe('This is a test summary of the meeting.');
            expect(result.metadata.service).toBe('groq');
            expect(result.metadata.model).toBe('llama3-8b-8192');
            expect(result.metadata.tokensUsed).toBe(150);
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.groq.com/openai/v1/chat/completions',
                expect.objectContaining({
                    model: 'llama3-8b-8192',
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'system' }),
                        expect.objectContaining({ role: 'user' })
                    ])
                }),
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer test-groq-key',
                        'Content-Type': 'application/json'
                    }
                })
            );
        });

        it('should use default instructions when none provided', async () => {
            const mockResponse = {
                data: {
                    choices: [{ message: { content: 'Summary' } }],
                    usage: { total_tokens: 100 }
                }
            };

            mockedAxios.post.mockResolvedValue(mockResponse);

            await groqService.generateSummary('Test transcript');

            const callArgs = mockedAxios.post.mock.calls[0][1];
            const userMessage = callArgs.messages.find(m => m.role === 'user');
            
            expect(userMessage.content).toContain('Key discussion points');
            expect(userMessage.content).toContain('Decisions made');
            expect(userMessage.content).toContain('Action items');
        });

        it('should handle API errors appropriately', async () => {
            // Test timeout error
            mockedAxios.post.mockRejectedValue({ code: 'ECONNABORTED' });
            await expect(groqService.generateSummary('test', 'test'))
                .rejects.toThrow('Groq service timeout - please try again');

            // Test 401 error
            mockedAxios.post.mockRejectedValue({ 
                response: { status: 401 } 
            });
            await expect(groqService.generateSummary('test', 'test'))
                .rejects.toThrow('Invalid Groq API key');

            // Test 429 error
            mockedAxios.post.mockRejectedValue({ 
                response: { status: 429 } 
            });
            await expect(groqService.generateSummary('test', 'test'))
                .rejects.toThrow('Groq rate limit exceeded - please try again later');

            // Test 500 error
            mockedAxios.post.mockRejectedValue({ 
                response: { status: 500 } 
            });
            await expect(groqService.generateSummary('test', 'test'))
                .rejects.toThrow('Groq service temporarily unavailable');
        });

        it('should throw error when API key not configured', async () => {
            const serviceWithoutKey = new GroqService();
            
            await expect(serviceWithoutKey.generateSummary('test', 'test'))
                .rejects.toThrow('Groq API key not configured');
        });

        it('should validate connection successfully', async () => {
            mockedAxios.get.mockResolvedValue({ status: 200 });
            
            const isValid = await groqService.validateConnection();
            
            expect(isValid).toBe(true);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.groq.com/openai/v1/models',
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer test-groq-key'
                    }
                })
            );
        });

        it('should return false for invalid connection', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Network error'));
            
            const isValid = await groqService.validateConnection();
            
            expect(isValid).toBe(false);
        });
    });

    describe('OpenAIService', () => {
        let openaiService;

        beforeEach(() => {
            openaiService = new OpenAIService({ apiKey: 'test-openai-key' });
        });

        it('should initialize with correct configuration', () => {
            const status = openaiService.getServiceStatus();
            
            expect(status.name).toBe('OpenAI');
            expect(status.configured).toBe(true);
            expect(status.model).toBe('gpt-3.5-turbo');
            expect(status.baseURL).toBe('https://api.openai.com/v1');
        });

        it('should generate summary successfully', async () => {
            const mockResponse = {
                data: {
                    choices: [{
                        message: {
                            content: 'OpenAI generated summary'
                        }
                    }],
                    usage: {
                        total_tokens: 200
                    }
                }
            };

            mockedAxios.post.mockResolvedValue(mockResponse);

            const result = await openaiService.generateSummary(
                'Test meeting transcript',
                'Custom instructions'
            );

            expect(result.content).toBe('OpenAI generated summary');
            expect(result.metadata.service).toBe('openai');
            expect(result.metadata.model).toBe('gpt-3.5-turbo');
            expect(result.metadata.tokensUsed).toBe(200);
        });

        it('should handle OpenAI specific errors', async () => {
            mockedAxios.post.mockRejectedValue({ 
                response: { 
                    status: 401,
                    data: { error: { message: 'Invalid API key' } }
                } 
            });
            
            await expect(openaiService.generateSummary('test', 'test'))
                .rejects.toThrow('Invalid OpenAI API key');
        });
    });

    describe('AIServiceManager', () => {
        let manager;

        beforeEach(() => {
            manager = new AIServiceManager();
        });

        it('should initialize with default services', () => {
            const services = manager.getServicesStatus();
            
            expect(services).toHaveLength(2);
            expect(services[0].name).toBe('Groq');
            expect(services[1].name).toBe('OpenAI');
        });

        it('should add custom services', () => {
            const customService = new GroqService({ apiKey: 'custom-key' });
            manager.addService(customService);
            
            const services = manager.getServicesStatus();
            expect(services).toHaveLength(3);
        });

        it('should reject invalid services', () => {
            expect(() => {
                manager.addService({});
            }).toThrow('Service must extend AIService class');
        });

        it('should generate summary with first available service', async () => {
            // Mock successful Groq response
            const mockResponse = {
                data: {
                    choices: [{ message: { content: 'Groq summary' } }],
                    usage: { total_tokens: 100 }
                }
            };
            mockedAxios.post.mockResolvedValue(mockResponse);

            // Create manager with configured services
            const testManager = new AIServiceManager();
            testManager.services = []; // Clear default services
            testManager.addService(new GroqService({ apiKey: 'test-groq-key' }));
            testManager.addService(new OpenAIService({ apiKey: 'test-openai-key' }));
            
            const result = await testManager.generateSummary('Test transcript');
            
            expect(result.content).toBe('Groq summary');
            expect(result.metadata.successfulService).toBe('Groq');
            expect(result.metadata.attemptedServices).toBe(1);
        });

        it('should fallback to second service when first fails', async () => {
            // Mock Groq failure and OpenAI success
            mockedAxios.post
                .mockRejectedValueOnce(new Error('Groq failed'))
                .mockResolvedValueOnce({
                    data: {
                        choices: [{ message: { content: 'OpenAI fallback summary' } }],
                        usage: { total_tokens: 150 }
                    }
                });

            // Create manager with configured services
            const testManager = new AIServiceManager();
            testManager.services = []; // Clear default services
            testManager.addService(new GroqService({ apiKey: 'test-groq-key' }));
            testManager.addService(new OpenAIService({ apiKey: 'test-openai-key' }));
            
            const result = await testManager.generateSummary('Test transcript');
            
            expect(result.content).toBe('OpenAI fallback summary');
            expect(result.metadata.successfulService).toBe('OpenAI');
            expect(result.metadata.attemptedServices).toBe(2);
        });

        it('should throw error when all services fail', async () => {
            mockedAxios.post.mockRejectedValue(new Error('All services failed'));
            
            // Create manager with configured services
            const testManager = new AIServiceManager();
            testManager.services = []; // Clear default services
            testManager.addService(new GroqService({ apiKey: 'test-groq-key' }));
            testManager.addService(new OpenAIService({ apiKey: 'test-openai-key' }));
            
            await expect(testManager.generateSummary('Test transcript'))
                .rejects.toThrow('All AI services failed');
        });

        it('should skip unconfigured services', async () => {
            const mockResponse = {
                data: {
                    choices: [{ message: { content: 'OpenAI summary' } }],
                    usage: { total_tokens: 100 }
                }
            };
            mockedAxios.post.mockResolvedValue(mockResponse);
            
            // Create manager with only OpenAI configured
            const testManager = new AIServiceManager();
            testManager.services = []; // Clear default services
            testManager.addService(new GroqService()); // No API key
            testManager.addService(new OpenAIService({ apiKey: 'test-openai-key' }));
            
            const result = await testManager.generateSummary('Test transcript');
            
            expect(result.metadata.successfulService).toBe('OpenAI');
        });

        it('should validate all services', async () => {
            mockedAxios.get
                .mockResolvedValueOnce({ status: 200 }) // Groq success
                .mockRejectedValueOnce(new Error('OpenAI failed')); // OpenAI failure

            // Create manager with configured services
            const testManager = new AIServiceManager();
            testManager.services = []; // Clear default services
            testManager.addService(new GroqService({ apiKey: 'test-groq-key' }));
            testManager.addService(new OpenAIService({ apiKey: 'test-openai-key' }));
            
            const results = await testManager.validateServices();
            
            expect(results.Groq.status).toBe('healthy');
            expect(results.OpenAI.status).toBe('unavailable');
        });

        it('should throw error when no services configured', async () => {
            const emptyManager = new AIServiceManager();
            emptyManager.services = []; // Clear services
            
            await expect(emptyManager.generateSummary('test'))
                .rejects.toThrow('No AI services configured');
        });
    });
});