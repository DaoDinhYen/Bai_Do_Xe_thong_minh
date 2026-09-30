/**
 * Text-to-Speech (TTS) Service — Vietnamese Voice Engine
 * Cung cấp giọng đọc tiếng Việt tự nhiên chuẩn 100%
 * Không phụ thuộc vào gói ngôn ngữ của Windows/trình duyệt
 */

const https = require('https');
const http = require('http');

/**
 * Stream audio MP3 tiếng Việt chuẩn từ Google TTS
 */
function streamVietnameseTTS(text, clientRes) {
  if (!text || typeof text !== 'string') {
    clientRes.status(400).send('Text is required');
    return;
  }

  // Làm sạch ký tự đặc biệt để phát âm mượt mà chuẩn tiếng Việt
  let clean = text
    .replace(/[*#`_~[\](){}<>|\\]/g, ' ')
    .replace(/[•\-\–⚡🚪📍📊💡🏷️🚗🚙🅿️🔒🚨]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Đảm bảo không cắt ngang từ nếu vượt quá 200 ký tự
  if (clean.length > 200) {
    const lastSpace = clean.lastIndexOf(' ', 200);
    clean = lastSpace > 100 ? clean.substring(0, lastSpace) : clean.substring(0, 200);
  }

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(clean)}&tl=vi&client=tw-ob`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    }
  };

  https.get(url, options, (googleRes) => {
    if (googleRes.statusCode !== 200) {
      clientRes.status(502).json({ success: false, message: 'Lỗi nạp giọng đọc TTS' });
      return;
    }

    clientRes.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    });

    googleRes.pipe(clientRes);
  }).on('error', (err) => {
    console.error('TTS Proxy Error:', err.message);
    if (!clientRes.headersSent) {
      clientRes.status(500).json({ success: false, message: err.message });
    }
  });
}

module.exports = {
  streamVietnameseTTS
};
