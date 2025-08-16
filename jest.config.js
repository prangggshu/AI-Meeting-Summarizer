module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/node_modules/**',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/backend/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000
};