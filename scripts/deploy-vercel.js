#!/usr/bin/env node

/**
 * Vercel Deployment Helper Script
 * 
 * This script helps prepare and validate the application for Vercel deployment.
 * It checks environment variables, validates configuration, and provides deployment guidance.
 */

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

function checkFileExists(filePath) {
    return fs.existsSync(path.join(__dirname, '..', filePath));
}

function validateVercelConfig() {
    log('\n🔍 Validating Vercel Configuration...', 'cyan');
    
    const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
    
    if (!fs.existsSync(vercelConfigPath)) {
        log('❌ vercel.json not found!', 'red');
        return false;
    }
    
    try {
        const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
        
        // Check required fields
        const requiredFields = ['version', 'builds', 'routes'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
            log(`❌ Missing required fields in vercel.json: ${missingFields.join(', ')}`, 'red');
            return false;
        }
        
        log('✅ vercel.json configuration is valid', 'green');
        return true;
    } catch (error) {
        log(`❌ Invalid JSON in vercel.json: ${error.message}`, 'red');
        return false;
    }
}

function checkRequiredFiles() {
    log('\n📁 Checking Required Files...', 'cyan');
    
    const requiredFiles = [
        'package.json',
        'backend/server.js',
        'frontend/index.html',
        '.env.example',
        '.env.production.example'
    ];
    
    let allFilesExist = true;
    
    requiredFiles.forEach(file => {
        if (checkFileExists(file)) {
            log(`✅ ${file}`, 'green');
        } else {
            log(`❌ ${file} - Missing!`, 'red');
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

function validatePackageJson() {
    log('\n📦 Validating package.json...', 'cyan');
    
    try {
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        // Check for required scripts
        const requiredScripts = ['start', 'build', 'vercel-build'];
        const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
        
        if (missingScripts.length > 0) {
            log(`⚠️  Missing recommended scripts: ${missingScripts.join(', ')}`, 'yellow');
        } else {
            log('✅ All required scripts are present', 'green');
        }
        
        // Check Node.js version
        if (packageJson.engines && packageJson.engines.node) {
            log(`✅ Node.js version specified: ${packageJson.engines.node}`, 'green');
        } else {
            log('⚠️  No Node.js version specified in engines field', 'yellow');
        }
        
        return true;
    } catch (error) {
        log(`❌ Error reading package.json: ${error.message}`, 'red');
        return false;
    }
}

function checkEnvironmentVariables() {
    log('\n🔐 Environment Variables Checklist...', 'cyan');
    
    const requiredEnvVars = [
        'NODE_ENV',
        'BASE_URL',
        'GROQ_API_KEY',
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASS',
        'EMAIL_FROM',
        'SESSION_SECRET'
    ];
    
    log('Required environment variables for production:', 'white');
    requiredEnvVars.forEach(envVar => {
        log(`  • ${envVar}`, 'yellow');
    });
    
    log('\n💡 To set these in Vercel:', 'blue');
    log('  1. Go to your Vercel dashboard', 'white');
    log('  2. Select your project', 'white');
    log('  3. Go to Settings > Environment Variables', 'white');
    log('  4. Add each variable with your production values', 'white');
    log('  5. Set environment to "Production"', 'white');
}

function generateDeploymentCommand() {
    log('\n🚀 Deployment Commands...', 'cyan');
    
    log('To deploy to Vercel:', 'white');
    log('  npm install -g vercel', 'yellow');
    log('  vercel --prod', 'yellow');
    
    log('\nOr using npx:', 'white');
    log('  npx vercel --prod', 'yellow');
    
    log('\nFor first-time deployment:', 'white');
    log('  npx vercel', 'yellow');
    log('  # Follow the prompts to configure your project', 'white');
    log('  npx vercel --prod', 'yellow');
}

function showPostDeploymentChecklist() {
    log('\n✅ Post-Deployment Checklist...', 'cyan');
    
    const checklist = [
        'Test the health endpoint: https://your-domain.vercel.app/health',
        'Verify file upload functionality',
        'Test AI summarization with a sample file',
        'Test email sharing functionality',
        'Check all API endpoints are working',
        'Verify CORS configuration with your domain',
        'Test error handling and edge cases',
        'Monitor logs for any issues'
    ];
    
    checklist.forEach((item, index) => {
        log(`  ${index + 1}. ${item}`, 'white');
    });
}

function main() {
    log('🎯 AI Meeting Notes Summarizer - Vercel Deployment Validator', 'magenta');
    log('=' .repeat(60), 'magenta');
    
    let isValid = true;
    
    // Run all validation checks
    isValid &= checkRequiredFiles();
    isValid &= validateVercelConfig();
    isValid &= validatePackageJson();
    
    // Show environment variables checklist
    checkEnvironmentVariables();
    
    // Show deployment commands
    generateDeploymentCommand();
    
    // Show post-deployment checklist
    showPostDeploymentChecklist();
    
    log('\n' + '=' .repeat(60), 'magenta');
    
    if (isValid) {
        log('🎉 Your application is ready for Vercel deployment!', 'green');
        log('📖 Make sure to set all environment variables in Vercel dashboard before deploying.', 'blue');
    } else {
        log('❌ Please fix the issues above before deploying.', 'red');
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    validateVercelConfig,
    checkRequiredFiles,
    validatePackageJson,
    checkEnvironmentVariables
};