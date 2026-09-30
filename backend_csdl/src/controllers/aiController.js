/**
 * AI Controller — Smart Parking System
 * Tiếp nhận câu hỏi / lệnh giọng nói từ Web Admin
 */

const { processUserPrompt } = require('../services/aiService');
const { streamVietnameseTTS } = require('../services/ttsService');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

const AIController = {
  /**
   * POST /api/ai/chat
   * Body: { prompt: string }
   */
  async handleChat(req, res) {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return error(res, 'Vui lòng cung cấp nội dung câu hỏi hoặc lệnh thoại.', 400);
      }

      const io = req.app.get('io') || null;
      const result = await processUserPrompt(prompt, io);

      return success(res, result, 'Xử lý yêu cầu AI thành công');
    } catch (err) {
      logger.error('Lỗi tại AIController.handleChat:', err);
      return error(res, 'Không thể xử lý yêu cầu AI lúc này: ' + err.message, 500);
    }
  },

  /**
   * GET /api/ai/tts?text=...
   * Trả về file audio/mpeg giọng đọc tiếng Việt chuẩn
   */
  handleTTS(req, res) {
    const text = req.query.text || '';
    if (!text.trim()) {
      return res.status(400).send('Text query parameter is required');
    }
    streamVietnameseTTS(text, res);
  },

  /**
   * GET /api/ai/quick-prompts
   * Trả về danh sách câu hỏi mẫu biểu diễn cho Web Admin
   */
  async getQuickPrompts(req, res) {
    const prompts = [
      { text: 'Hôm nay doanh thu được bao nhiêu rồi?', icon: '💰', category: 'finance' },
      { text: 'Xe biển số 51A-123.45 đang đỗ ở đâu?', icon: '🚗', category: 'locate' },
      { text: 'Mở barie cổng vào', icon: '🚪', category: 'barrier' },
      { text: 'Đóng barie cổng vào', icon: '🔒', category: 'barrier' },
      { text: 'Tình trạng bãi xe hiện tại thế nào?', icon: '🅿️', category: 'status' },
      { text: 'Bật đèn bãi xe', icon: '💡', category: 'light' },
      { text: 'Bảng giá gửi xe hiện tại', icon: '🏷️', category: 'rates' }
    ];
    return success(res, { prompts }, 'Danh sách câu hỏi gợi ý AI');
  }
};

module.exports = AIController;
