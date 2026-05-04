'use strict';

const express = require('express');
const router = express.Router();

// Gunakan authMiddleware TIAS yang sudah ada
const { protected: verifyToken } = require('../../middleware/authMiddleware');

const { getCbtToken } = require('../../controllers/CBT/CbtAuthController');

// POST /api/cbt/auth
router.post('/auth', verifyToken, getCbtToken);

module.exports = router;
