// API Routes - will be implemented in later tasks
const express = require('express');
const router = express.Router();

// Placeholder routes - will be expanded in later tasks
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;