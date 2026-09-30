/**
 * AI Routes — Smart Parking System
 */

const express = require('express');
const router = express.Router();
const AIController = require('../controllers/aiController');

// POST /api/ai/chat — Xử lý câu hỏi / lệnh thoại từ Web Admin
router.post('/chat', AIController.handleChat);

// GET /api/ai/tts — Phát âm tiếng Việt chuẩn 100%
router.get('/tts', AIController.handleTTS);

// GET /api/ai/quick-prompts — Danh sách câu hỏi gợi ý nhanh
router.get('/quick-prompts', AIController.getQuickPrompts);

module.exports = router;
