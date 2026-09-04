'use strict';
const express = require('express');
const router = express.Router();

// Nama fungsinya "protected" bukan "verifyToken"
const { protected: auth } = require('../../middleware/authMiddleware');
const { getCbtToken } = require('../../controllers/CBT/CbtAuthController');

router.post('/auth', auth, getCbtToken);

module.exports = router;