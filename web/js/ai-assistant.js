/**
 * AI Assistant (Voice & Chatbot) Controller
 * Smart Parking System — Web Admin
 * 
 * Tính năng chính:
 * 1. Đọc tiếng Việt chuẩn 100% bằng backend Google TTS Proxy (/api/ai/tts?text=...)
 * 2. Nhận diện giọng nói tiếng Việt bằng Web Speech API (webkitSpeechRecognition)
 * 3. Hiệu ứng suy nghĩ (Thinking delay) & Đánh máy dần dần (Typewriter effect)
 * 4. Gợi ý câu hỏi thông minh khi gõ phím (Realtime Autocomplete Suggestions)
 * 5. Ngân hàng câu hỏi toàn diện đáp ứng mọi tình huống của hệ thống bãi xe
 */

(function() {
  // Trạng thái AI
  let isAiOpen = false;
  let isListening = false;
  let isVoiceEnabled = true;
  let recognition = null;

  // Lấy API Base URL (tương thích cả khi chạy trực tiếp qua Express lẫn Live Server 5500)
  const API_BASE = (typeof window.API_BASE === 'string')
    ? window.API_BASE.replace(/\/api\/?$/, '')
    : ((window.location.hostname === '127.0.0.1' && window.location.port === '5500')
        ? 'http://localhost:3000'
        : window.location.origin);

  // ========================================================
  //  1. NGÂN HÀNG CÂU HỎI THÔNG MINH (SYSTEM QUESTION BANK)
  // ========================================================
  const SYSTEM_QUESTION_BANK = [
    // Xe & Vị trí đỗ
    { text: "Xe biển số 15B-999.99 đang đỗ ở đâu?", icon: "🚗", category: "Xe & Vị trí", keywords: ["xe", "bien", "15b", "o dau", "tim xe", "do xe"] },
    { text: "Xe biển số 36A-999.99 đang đỗ ở đâu?", icon: "🚘", category: "Xe & Vị trí", keywords: ["xe", "bien", "36a", "o dau", "tim xe"] },
    { text: "Xe biển số 30E-123.45 đang đỗ ở đâu?", icon: "🚙", category: "Xe & Vị trí", keywords: ["xe", "bien", "30e", "o dau", "tim xe"] },
    { text: "Xe biển số 51A-123.45 đang đỗ ở đâu?", icon: "🚗", category: "Xe & Vị trí", keywords: ["xe", "bien", "51a", "o dau", "tim xe"] },
    { text: "Hiện có những xe nào đang đỗ trong bãi?", icon: "📋", category: "Xe & Vị trí", keywords: ["danh sach", "xe nao", "dang do", "trong bai", "toan bo xe", "cac xe"] },
    { text: "Lịch sử xe ra vào gần nhất", icon: "⏱️", category: "Xe & Vị trí", keywords: ["gan nhat", "vua vao", "vua ra", "lich su", "luot xe", "hoat dong"] },

    // Ô đỗ & Tình trạng
    { text: "Tình trạng bãi xe hiện tại thế nào?", icon: "🅿️", category: "Chỗ đỗ", keywords: ["tinh trang", "bai xe", "cho trong", "con cho", "day chua", "o do", "suc chua"] },
    { text: "Gợi ý ô đỗ gần cổng vào nhất", icon: "✨", category: "Chỗ đỗ", keywords: ["goi y", "o nao", "gan nhat", "thuan tien", "do o dau", "cho nao de"] },
    { text: "Ô A01 có xe không?", icon: "📍", category: "Chỗ đỗ", keywords: ["o a01", "a01", "cho a01"] },
    { text: "Kiểm tra tình trạng ô A02", icon: "📍", category: "Chỗ đỗ", keywords: ["o a02", "a02", "cho a02"] },
    { text: "Ô A03 hiện tại thế nào?", icon: "📍", category: "Chỗ đỗ", keywords: ["o a03", "a03", "cho a03"] },
    { text: "Ô A04 đang trống hay có xe?", icon: "📍", category: "Chỗ đỗ", keywords: ["o a04", "a04", "cho a04"] },
    { text: "Ô A05 có ai đặt trước không?", icon: "📍", category: "Chỗ đỗ", keywords: ["o a05", "a05", "cho a05"] },
    { text: "Ô A06 tình trạng ra sao?", icon: "📍", category: "Chỗ đỗ", keywords: ["o a06", "a06", "cho a06"] },

    // Doanh thu & Báo cáo tài chính linh hoạt
    { text: "Hôm nay doanh thu được bao nhiêu rồi?", icon: "💰", category: "Doanh thu", keywords: ["doanh thu", "hom nay", "tien", "bao nhieu", "thu duoc", "thu nhap"] },
    { text: "Doanh thu ngày 22/9 là bao nhiêu?", icon: "📊", category: "Doanh thu", keywords: ["doanh thu", "22/9", "ngay 22", "ngay 22/9"] },
    { text: "Doanh thu ngày 21/9 là bao nhiêu?", icon: "📊", category: "Doanh thu", keywords: ["doanh thu", "21/9", "ngay 21", "ngay 21/9"] },
    { text: "Doanh thu ngày 10/9 là bao nhiêu?", icon: "📊", category: "Doanh thu", keywords: ["doanh thu", "10/9", "ngay 10", "ngay 10/9"] },
    { text: "Doanh thu hôm qua được bao nhiêu?", icon: "📊", category: "Doanh thu", keywords: ["doanh thu", "hom qua"] },
    { text: "Doanh thu tháng này được bao nhiêu?", icon: "📈", category: "Doanh thu", keywords: ["doanh thu", "thang", "thang nay", "thang 9"] },
    { text: "Doanh thu trong 7 ngày qua?", icon: "📅", category: "Doanh thu", keywords: ["doanh thu", "7 ngay", "tuan nay", "tuan qua"] },
    { text: "Bảng giá gửi xe hiện tại", icon: "🏷️", category: "Bảng giá", keywords: ["bang gia", "gia gui", "phi", "bao nhieu mot gio", "gia tien", "qua dem"] },

    // Thiết bị & Điều khiển IoT
    { text: "Mở barie cổng vào", icon: "🚪", category: "Thiết bị", keywords: ["mo barie", "cong vao", "barrier", "cua vao", "mo cong"] },
    { text: "Đóng barie cổng vào", icon: "🔒", category: "Thiết bị", keywords: ["dong barie", "cong vao", "ha barie", "dong cong"] },
    { text: "Mở barie cổng ra", icon: "🚪", category: "Thiết bị", keywords: ["mo barie", "cong ra", "cua ra"] },
    { text: "Đóng barie cổng ra", icon: "🔒", category: "Thiết bị", keywords: ["dong barie", "cong ra"] },
    { text: "Mở tất cả barie khẩn cấp", icon: "🚨", category: "Thiết bị", keywords: ["khan cap", "mo het", "mo tat ca", "chay", "so tan", "cuu hoa"] },
    { text: "Bật đèn chiếu sáng bãi xe", icon: "💡", category: "Thiết bị", keywords: ["bat den", "chieu sang", "den", "anh sang", "light"] },
    { text: "Tắt đèn bãi xe", icon: "🌑", category: "Thiết bị", keywords: ["tat den", "ngat den"] },

    // Quy trình, An ninh & Sự cố
    { text: "Quy trình đặt chỗ gửi xe qua App", icon: "📱", category: "Quy trình", keywords: ["dat cho", "quy trinh", "booking", "app", "cach gui", "giu cho"] },
    { text: "Nếu mất điện bãi xe xử lý thế nào?", icon: "⚡", category: "Sự cố", keywords: ["mat dien", "su co", "ups", "khoa co", "kẹt barie"] },
    { text: "Khách mất thẻ hoặc quên thẻ RFID", icon: "💳", category: "An ninh", keywords: ["mat the", "quen the", "the rfid", "khong co the", "vang lai"] },
    { text: "Cơ chế bảo mật 2 lớp RFID và ANPR", icon: "🛡️", category: "An ninh", keywords: ["bao mat", "anpr", "rfid", "nhan dien bien so", "2 lop", "khong khop"] },
    { text: "Thông tin phần cứng ESP32 và cảm biến", icon: "⚙️", category: "Kỹ thuật", keywords: ["esp32", "phan cung", "cam bien", "ir", "servo", "mqtt", "cong nghe"] },
    { text: "Bãi xe mở cửa những khung giờ nào?", icon: "🕐", category: "Thông tin", keywords: ["gio mo cua", "24/7", "hoat dong", "thoi gian", "gio lam viec"] },
    { text: "Thông tin đề tài và bài tập lớn IoT", icon: "🎓", category: "Đồ án", keywords: ["de tai", "do an", "bai tap lon", "nhom", "tac gia", "ai lam"] }
  ];

  function normalizeStr(str) {
    if (!str) return '';
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  // ========================================================
  //  2. WEB SPEECH RECOGNITION (NHẬN DIỆN GIỌNG NÓI TIẾNG VIỆT)
  // ========================================================
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Trình duyệt không hỗ trợ Web Speech API. Hãy sử dụng Google Chrome hoặc MS Edge.');
      return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'vi-VN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = function() {
      isListening = true;
      updateMicUI(true);
    };

    rec.onresult = function(event) {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

      const input = document.getElementById('ai-chat-input');
      if (input) {
        input.value = transcript;
        updateSuggestions(transcript);
      }

      // Nếu là kết quả cuối cùng -> Tự động gửi
      if (event.results[0] && event.results[0].isFinal) {
        setTimeout(() => {
          sendUserMessage(transcript);
        }, 300);
      }
    };

    rec.onerror = function(event) {
      console.warn('Lỗi nhận diện giọng nói:', event.error);
      isListening = false;
      updateMicUI(false);
      if (event.error === 'not-allowed') {
        alert('Vui lòng cấp quyền truy cập Microphone trên trình duyệt để sử dụng tính năng giọng nói!');
      }
    };

    rec.onend = function() {
      isListening = false;
      updateMicUI(false);
    };

    return rec;
  }

  function updateMicUI(listening) {
    const micBtns = document.querySelectorAll('.ai-mic-btn, .sidebar-ai-mic-btn');
    const indicator = document.getElementById('ai-listening-indicator');

    micBtns.forEach(btn => {
      if (listening) {
        btn.classList.add('listening');
        btn.title = 'Đang nghe... Bấm để dừng';
      } else {
        btn.classList.remove('listening');
        btn.title = 'Bấm để nói tiếng Việt';
      }
    });

    if (indicator) {
      if (listening) indicator.classList.add('active');
      else indicator.classList.remove('active');
    }
  }

  function toggleSpeechRecognition() {
    if (!recognition) {
      recognition = initSpeechRecognition();
    }
    if (!recognition) {
      alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Web Speech API). Hãy sử dụng Google Chrome!');
      return;
    }

    if (isListening) {
      recognition.stop();
      isListening = false;
      updateMicUI(false);
    } else {
      openAiAssistant();
      try {
        recognition.start();
      } catch (err) {
        console.warn('Không thể bắt đầu nhận diện:', err);
      }
    }
  }

  // ========================================================
  //  3. TEXT-TO-SPEECH (TTS TIẾNG VIỆT CHUẨN 100% QUA BACKEND)
  // ========================================================
  let currentTtsAudio = null;
  let audioQueue = [];

  function stopAudio() {
    if (currentTtsAudio) {
      try {
        currentTtsAudio.pause();
        currentTtsAudio.currentTime = 0;
      } catch (e) {}
      currentTtsAudio = null;
    }
    audioQueue = [];
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  // Tìm giọng đọc tiếng Việt của hệ thống nếu audio backend gặp lỗi
  function getBestVietnameseVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    let viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang === 'vi_VN' || (v.lang && v.lang.toLowerCase().startsWith('vi')));
    if (!viVoice) {
      viVoice = voices.find(v => /vietnam/i.test(v.name) || /tiếng việt/i.test(v.name) || /hoaimy/i.test(v.name) || /nam/i.test(v.name));
    }
    return viVoice;
  }

  /**
   * Đọc câu trả lời bằng giọng nói tiếng Việt tự nhiên chuẩn 100%
   * Tuyệt đối không đọc tiếng Anh
   */
  function speakVietnamese(text) {
    if (!isVoiceEnabled || !text) return;
    stopAudio();

    // Làm sạch ký tự markdown, emoji, icon để đọc tự nhiên
    const clean = text
      .replace(/[*#`_~[\](){}<>|\\]/g, ' ')
      .replace(/[•\-\–⚡🚪📍📊💡🏷️🚗🚙🅿️🔒🚨✨⏱️💳🛡️⚙️🕐🎓]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    // Tách thành các câu ngắn dưới 150 ký tự để Google TTS phát mượt mà
    const rawSentences = clean.match(/[^.!?\n]+[.!?\n]*/g) || [clean];
    const sentences = rawSentences
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 3); // Đọc tối đa 3 câu đầu để vừa vặn, không quá dài

    if (sentences.length === 0) return;

    audioQueue = [...sentences];
    playNextAudioQueueItem();
  }

  function playNextAudioQueueItem() {
    if (!isVoiceEnabled || audioQueue.length === 0) {
      currentTtsAudio = null;
      return;
    }

    const sentence = audioQueue.shift();
    if (!sentence) {
      playNextAudioQueueItem();
      return;
    }

    const url = `${API_BASE}/api/ai/tts?text=${encodeURIComponent(sentence)}`;
    const audio = new Audio(url);
    // Tăng tốc độ đọc lên 1.25x theo yêu cầu người dùng
    audio.defaultPlaybackRate = 1.25;
    audio.playbackRate = 1.25;
    audio.addEventListener('play', () => {
      audio.playbackRate = 1.25;
    });
    currentTtsAudio = audio;

    audio.onended = function() {
      playNextAudioQueueItem();
    };

    audio.onerror = function(err) {
      console.warn('Lỗi nạp audio từ backend TTS, thử fallback tiếng Việt:', err);
      // Chỉ dùng SpeechSynthesis NẾU máy có giọng tiếng Việt (Tránh bị đọc tiếng Anh)
      const viVoice = getBestVietnameseVoice();
      if (viVoice && window.speechSynthesis) {
        try {
          const utter = new SpeechSynthesisUtterance(sentence);
          utter.voice = viVoice;
          utter.lang = 'vi-VN';
          utter.rate = 1.25; // Tăng tốc độ đọc tiếng Việt
          utter.onend = () => playNextAudioQueueItem();
          utter.onerror = () => playNextAudioQueueItem();
          window.speechSynthesis.speak(utter);
          return;
        } catch (e) {}
      }
      playNextAudioQueueItem();
    };

    audio.play().catch(err => {
      console.warn('Audio play blocked (cần tương tác người dùng):', err);
      playNextAudioQueueItem();
    });
  }

  // ========================================================
  //  4. GỢI Ý CÂU HỎI THÔNG MINH (AUTOCOMPLETE SUGGESTIONS)
  // ========================================================
  let selectedSuggestionIndex = -1;

  function updateSuggestions(rawQuery) {
    const dropdown = document.getElementById('ai-autocomplete-dropdown');
    const listEl = document.getElementById('ai-autocomplete-list');
    if (!dropdown || !listEl) return;

    // CHỈ KHI BẮT ĐẦU GÕ CHỮ (có ký tự) MỚI HIỆN GỢI Ý CÂU HỎI
    if (!rawQuery || !rawQuery.trim()) {
      closeAiSuggestions();
      return;
    }

    const query = normalizeStr(rawQuery);
    if (!query) {
      closeAiSuggestions();
      return;
    }

    const matched = SYSTEM_QUESTION_BANK.filter(item => {
      const itemNorm = normalizeStr(item.text);
      if (itemNorm.includes(query)) return true;
      return item.keywords.some(kw => {
        const kwNorm = normalizeStr(kw);
        return kwNorm.includes(query) || query.includes(kwNorm);
      });
    }).slice(0, 6);

    if (matched.length === 0) {
      closeAiSuggestions();
      return;
    }

    selectedSuggestionIndex = -1;
    listEl.innerHTML = matched.map((item, idx) => {
      let displayHtml = item.text;
      if (query && rawQuery.trim()) {
        try {
          const safeQuery = rawQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${safeQuery})`, 'gi');
          displayHtml = item.text.replace(regex, '<span class="ai-suggestion-highlight">$1</span>');
        } catch (e) {
          displayHtml = item.text;
        }
      }
      return `
        <div class="ai-suggestion-item" data-index="${idx}" data-text="${item.text.replace(/"/g, '&quot;')}">
          <span class="ai-suggestion-icon">${item.icon}</span>
          <span class="ai-suggestion-text">${displayHtml}</span>
          <span class="ai-suggestion-arrow">↵</span>
        </div>
      `;
    }).join('');

    const items = listEl.querySelectorAll('.ai-suggestion-item');
    items.forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const promptText = el.getAttribute('data-text');
        closeAiSuggestions();
        sendUserMessage(promptText);
      });
    });

    dropdown.classList.add('active');
  }

  function updateItemSelection(items) {
    items.forEach((item, idx) => {
      if (idx === selectedSuggestionIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function closeAiSuggestions() {
    const dropdown = document.getElementById('ai-autocomplete-dropdown');
    if (dropdown) dropdown.classList.remove('active');
    selectedSuggestionIndex = -1;
  }
  window.closeAiSuggestions = closeAiSuggestions;

  // ========================================================
  //  5. GIAO DIỆN DRAWER & HIỆU ỨNG TYPEWRITER
  // ========================================================
  window.openAiAssistant = function() {
    const drawer = document.getElementById('ai-assistant-drawer');
    const overlay = document.getElementById('ai-assistant-overlay');
    if (drawer && overlay) {
      drawer.classList.add('open');
      overlay.classList.add('open');
      isAiOpen = true;
      setTimeout(() => {
        const input = document.getElementById('ai-chat-input');
        if (input) input.focus();
      }, 300);
    }
  };

  window.closeAiAssistant = function() {
    const drawer = document.getElementById('ai-assistant-drawer');
    const overlay = document.getElementById('ai-assistant-overlay');
    if (drawer && overlay) {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      isAiOpen = false;
      closeAiSuggestions();
      if (isListening && recognition) {
        recognition.stop();
      }
      stopAudio();
    }
  };

  window.toggleAiAssistant = function() {
    if (isAiOpen) closeAiAssistant();
    else openAiAssistant();
  };

  function scrollToBottom() {
    const body = document.getElementById('ai-messages-body');
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }

  // Hiển thị khung "AI đang suy nghĩ và tra cứu dữ liệu..."
  function showThinking() {
    hideThinking();
    const body = document.getElementById('ai-messages-body');
    if (!body) return;
    const thinkingEl = document.createElement('div');
    thinkingEl.id = 'ai-typing-indicator';
    thinkingEl.className = 'ai-thinking-box';
    thinkingEl.innerHTML = `
      <div class="ai-typing-dot"></div>
      <div class="ai-typing-dot"></div>
      <div class="ai-typing-dot"></div>
      <span class="ai-thinking-text">AI đang tra cứu dữ liệu & suy nghĩ...</span>
    `;
    body.appendChild(thinkingEl);
    scrollToBottom();
  }

  function hideThinking() {
    const el = document.getElementById('ai-typing-indicator');
    if (el) el.remove();
  }

  // Thêm tin nhắn từ người dùng
  function appendUserMessage(text) {
    const body = document.getElementById('ai-messages-body');
    if (!body) return;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = 'ai-message user';
    msgEl.innerHTML = `
      <div class="ai-msg-avatar">AD</div>
      <div class="ai-msg-bubble">
        <div>${text.replace(/\n/g, '<br>')}</div>
        <div class="ai-msg-time">${timeStr}</div>
      </div>
    `;
    body.appendChild(msgEl);
    scrollToBottom();
  }

  // Render Action Card phong phú
  function renderActionCard(action, data) {
    if (!action || !data) return '';

    if (action === 'CONTROL_BARRIER') {
      const isAll = data.gate === 'ALL';
      const gate = isAll ? 'TOÀN BỘ CỔNG' : (data.gate === 'IN' ? 'Cổng Vào' : 'Cổng Ra');
      const cmd = data.command === 'OPEN' ? 'MỞ BARIE' : 'ĐÓNG BARIE';
      return `
        <div class="ai-action-card success">
          <div class="ai-action-card-header">
            <span>⚡ ĐÃ THỰC THI LỆNH MQTT</span>
            <span class="ai-action-badge">${gate}</span>
          </div>
          <div>Trạng thái: <strong>${cmd}</strong> — Đã gửi tín hiệu tới Servo ESP32.</div>
        </div>
      `;
    }

    if (action === 'CONTROL_LIGHT') {
      const st = data.status === 'ON' ? 'BẬT ĐÈN' : 'TẮT ĐÈN';
      return `
        <div class="ai-action-card success">
          <div class="ai-action-card-header">
            <span>💡 ĐÃ ĐIỀU KHIỂN RELAY ĐÈN</span>
            <span class="ai-action-badge">${st}</span>
          </div>
          <div>Tín hiệu Relay ESP32: <strong>${st} THÀNH CÔNG</strong>.</div>
        </div>
      `;
    }

    if (action === 'LOCATE_VEHICLE') {
      if (data.found !== false) {
        return `
          <div class="ai-action-card">
            <div class="ai-action-card-header">
              <span>📍 VỊ TRÍ ĐỖ XE HIỆN TẠI</span>
              <span class="ai-action-badge" style="background:#DCFCE7;color:#166534">Ô ${data.slot_code || 'A0x'}</span>
            </div>
            <div>• Biển số: <strong>${data.plate_number}</strong></div>
            <div>• Chủ xe: <strong>${data.owner_name}</strong></div>
            <div>• Thời gian đỗ: <strong>${data.parked_time}</strong></div>
            <div>• Phí tạm tính: <strong>${data.estimated_fee}</strong></div>
          </div>
        `;
      }
      if (data.last_exit) {
        return `
          <div class="ai-action-card">
            <div class="ai-action-card-header">
              <span>🚪 LỊCH SỬ XUẤT BÃI GẦN NHẤT</span>
              <span class="ai-action-badge" style="background:#FEE2E2;color:#991B1B">ĐÃ XUẤT BÃI</span>
            </div>
            <div>• Biển số: <strong>${data.plate_number}</strong> (${data.owner_name || 'Khách hàng'})</div>
            <div>• Vị trí đã đỗ: <strong>Ô ${data.slot_code}</strong></div>
            <div>• Xuất bãi lúc: <strong>${data.last_exit}</strong></div>
            <div>• Phí đã trả: <strong>${data.fee}</strong></div>
          </div>
        `;
      }
    }

    if (action === 'QUERY_REVENUE') {
      const isPast = data.periodTitle && !data.periodTitle.includes('Hôm nay');
      return `
        <div class="ai-action-card success">
          <div class="ai-action-card-header">
            <span>📊 THỐNG KÊ ${data.periodBadge ? data.periodBadge : 'DOANH THU'}</span>
            <span class="ai-action-badge">${data.formattedRevenue}</span>
          </div>
          <div>• Thời gian: <strong>${data.periodTitle || 'Hôm nay'}</strong></div>
          <div>• Doanh thu: <strong>${data.formattedRevenue}</strong></div>
          <div>• Lượt xe gửi: <strong>${data.totalTurns} lượt</strong> (${data.completedTurns || 0} đã hoàn tất${data.activeTurns > 0 ? `, ${data.activeTurns} đang đỗ` : ''})</div>
          ${!isPast ? `<div>• Tỷ lệ sử dụng: <strong>${data.occupiedSlots}/${data.totalSlots} ô (${data.occupancyRate}%)</strong></div>` : ''}
        </div>
      `;
    }

    if (action === 'GET_SLOTS_STATUS') {
      return `
        <div class="ai-action-card">
          <div class="ai-action-card-header">
            <span>🅿️ TRẠNG THÁI CHỖ ĐỖ</span>
            <span class="ai-action-badge" style="background:#E0E7FF;color:#4338CA">Trống ${data.freeCount}/${data.total} ô</span>
          </div>
          <div>• Ô còn trống: <strong>${data.freeSlots && data.freeSlots.length > 0 ? data.freeSlots.join(', ') : 'Hết chỗ'}</strong></div>
          <div>• Ô có xe: <strong>${data.occupiedSlots && data.occupiedSlots.length > 0 ? data.occupiedSlots.join(', ') : 'Không'}</strong></div>
        </div>
      `;
    }

    if (action === 'LIST_ACTIVE_VEHICLES') {
      const count = data.count || 0;
      return `
        <div class="ai-action-card">
          <div class="ai-action-card-header">
            <span>📋 DANH SÁCH XE TRONG BÃI</span>
            <span class="ai-action-badge" style="background:${count > 0 ? '#DCFCE7' : '#F3F4F6'};color:${count > 0 ? '#166534' : '#4B5563'}">${count} xe đang đỗ</span>
          </div>
          <div>Hiện có <strong>${count} xe</strong> đang gửi trong bãi đỗ. Toàn bộ thông tin chi tiết hiển thị ở tin nhắn trên.</div>
        </div>
      `;
    }

    if (action === 'SLOT_DETAIL') {
      const isFree = data.status === 'FREE';
      const isOccupied = data.status === 'OCCUPIED';
      const stColor = isFree ? '#DCFCE7' : (isOccupied ? '#FEE2E2' : '#FEF3C7');
      const txtColor = isFree ? '#166534' : (isOccupied ? '#991B1B' : '#92400E');
      const stText = isFree ? 'TRỐNG' : (isOccupied ? 'CÓ XE ĐỖ' : 'ĐÃ ĐẶT TRƯỚC');
      return `
        <div class="ai-action-card">
          <div class="ai-action-card-header">
            <span>📍 CHI TIẾT Ô ${data.slot_code}</span>
            <span class="ai-action-badge" style="background:${stColor};color:${txtColor}">${stText}</span>
          </div>
          <div>• Mã vị trí: <strong>${data.slot_code}</strong> (Khu vực: ${data.zone || 'Khu A'})</div>
          <div>• Trạng thái: <strong>${stText}</strong></div>
        </div>
      `;
    }

    if (action === 'RECENT_ACTIVITY') {
      return `
        <div class="ai-action-card">
          <div class="ai-action-card-header">
            <span>⏱️ HOẠT ĐỘNG RA VÀO GẦN NHẤT</span>
            <span class="ai-action-badge" style="background:#E0E7FF;color:#4338CA">5 lượt gần nhất</span>
          </div>
          <div>Lịch sử phương tiện vào ra được ghi nhận tự động theo thời gian thực từ cảm biến và camera ANPR.</div>
        </div>
      `;
    }

    if (action === 'GET_RATES') {
      return `
        <div class="ai-action-card">
          <div class="ai-action-card-header">
            <span>🏷️ BẢNG GIÁ DỊCH VỤ</span>
            <span class="ai-action-badge" style="background:#E0E7FF;color:#4338CA">ÁP DỤNG 24/7</span>
          </div>
          <div>Đơn giá theo giờ và mức phí tối thiểu cho từng loại phương tiện được áp dụng tự động khi xe xuất bãi.</div>
        </div>
      `;
    }

    return '';
  }

  // Thêm tin nhắn bot kèm hiệu ứng ĐÁNH MÁY DẦN DẦN (Typewriter)
  function appendBotMessageWithTypewriter(fullText, actionData = null) {
    const body = document.getElementById('ai-messages-body');
    if (!body) return;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    let actionHTML = '';
    if (actionData && actionData.action) {
      actionHTML = renderActionCard(actionData.action, actionData.data);
    }

    const msgEl = document.createElement('div');
    msgEl.className = 'ai-message bot';
    msgEl.innerHTML = `
      <div class="ai-msg-avatar">🤖</div>
      <div class="ai-msg-bubble">
        <div class="ai-bot-text-content"><span class="ai-typewriter-cursor"></span></div>
        <div class="ai-bot-action-slot"></div>
        <div class="ai-msg-time">${timeStr}</div>
      </div>
    `;

    body.appendChild(msgEl);
    scrollToBottom();

    const textContainer = msgEl.querySelector('.ai-bot-text-content');
    const actionSlot = msgEl.querySelector('.ai-bot-action-slot');

    // Tách câu trả lời thành từng từ để hiển thị dần dần
    const words = (fullText || '').split(' ');
    let wordIdx = 0;
    let accumulated = '';

    // Bắt đầu đọc giọng nói tiếng Việt tốc độ cao ngay khi câu trả lời xuất hiện
    try {
      speakVietnamese(fullText);
    } catch (e) {
      console.warn('Lỗi speakVietnamese:', e);
    }

    const typingTimer = setInterval(() => {
      if (wordIdx < words.length) {
        accumulated += (wordIdx === 0 ? '' : ' ') + words[wordIdx];
        textContainer.innerHTML = accumulated.replace(/\n/g, '<br>') + '<span class="ai-typewriter-cursor"></span>';
        wordIdx++;
        scrollToBottom();
      } else {
        clearInterval(typingTimer);
        // Xóa con trỏ nhấp nháy khi đã hoàn tất
        textContainer.innerHTML = accumulated.replace(/\n/g, '<br>');

        // Hiện Action Card nếu có
        if (actionHTML) {
          actionSlot.innerHTML = actionHTML;
          actionSlot.classList.add('fade-in');
          scrollToBottom();
        }
      }
    }, 18); // Tốc độ gõ chữ 18ms mỗi từ -> Nhanh nhẹn, đồng bộ với giọng đọc
  }

  // Gửi tin nhắn lên Server AI
  async function sendUserMessage(promptText) {
    const text = promptText || document.getElementById('ai-chat-input')?.value?.trim();
    if (!text) return;

    // Đóng dropdown gợi ý
    closeAiSuggestions();

    // Dừng giọng nói trước đó nếu đang phát
    stopAudio();

    // Xóa ô input
    const input = document.getElementById('ai-chat-input');
    if (input) input.value = '';

    // 1. Hiển thị tin nhắn người dùng
    appendUserMessage(text);

    // 2. Hiển thị hiệu ứng suy nghĩ
    showThinking();
    const startTime = Date.now();

    try {
      const token = (window.Auth && typeof window.Auth.getToken === 'function')
        ? window.Auth.getToken()
        : (localStorage.getItem('sp_token') || sessionStorage.getItem('sp_token') || localStorage.getItem('token') || '');
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: text })
      });

      const json = await res.json();

      // Thời gian suy nghĩ ngắn gọn vừa phải (400ms)
      const elapsed = Date.now() - startTime;
      const minThinkingTime = 400;
      if (elapsed < minThinkingTime) {
        await new Promise(r => setTimeout(r, minThinkingTime - elapsed));
      }

      hideThinking();

      if (json.success && json.data) {
        const replyText = json.data.message || 'Yêu cầu của bạn đã được xử lý.';
        appendBotMessageWithTypewriter(replyText, json.data);
      } else {
        const errMsg = json.message || 'Không thể kết nối đến máy chủ AI.';
        appendBotMessageWithTypewriter(`⚠️ Lỗi: ${errMsg}`, null);
      }
    } catch (err) {
      hideThinking();
      console.error('Lỗi gọi API AI:', err);
      appendBotMessageWithTypewriter('⚠️ Không thể kết nối với Backend hoặc AI Service. Hãy kiểm tra máy chủ Node.js.', null);
    }
  }

  // ========================================================
  //  6. TẠO KHUNG HTML VÀ GẮN SỰ KIỆN TOÀN CỤC
  // ========================================================
  function injectAiDrawerHTML() {
    if (document.getElementById('ai-assistant-drawer')) return;

    const drawerHTML = `
      <!-- Overlay -->
      <div id="ai-assistant-overlay" class="ai-drawer-overlay" onclick="closeAiAssistant()"></div>

      <!-- Drawer Panel -->
      <div id="ai-assistant-drawer" class="ai-drawer">
        <!-- Header -->
        <div class="ai-drawer-header">
          <div class="ai-header-left">
            <div class="ai-header-avatar">
              <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><rect x="4" y="8" width="16" height="12" rx="4"/><circle cx="9" cy="13" r="1.5" fill="currentColor"/><circle cx="15" cy="13" r="1.5" fill="currentColor"/><path d="M9 17h6"/></svg>
            </div>
            <div>
              <div class="ai-header-title">Trợ Lý Ảo AI Điều Hành</div>
              <div class="ai-header-status">
                <span class="ai-status-dot"></span>
                <span>ONLINE (AI Voice Tiếng Việt)</span>
              </div>
            </div>
          </div>
          <div class="ai-header-actions">
            <button id="ai-voice-toggle-btn" class="ai-btn-icon active" title="Bật/Tắt âm giọng nói AI tiếng Việt">
              <svg id="ai-voice-icon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <button class="ai-btn-icon" onclick="closeAiAssistant()" title="Đóng khung chat">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Messages Body -->
        <div id="ai-messages-body" class="ai-drawer-body">
          <div class="ai-message bot">
            <div class="ai-msg-avatar">🤖</div>
            <div class="ai-msg-bubble">
              <div>Xin chào Quản trị viên! Tôi là <strong>Trợ lý ảo AI Điều hành bãi xe</strong>.</div>
              <div style="margin-top:6px;font-size:12.5px;color:#475569;">
                Bạn có thể <strong>bấm nút Micro để nói tiếng Việt</strong> hoặc gõ câu hỏi:
                <br>• <em>"Hôm nay doanh thu được bao nhiêu rồi?"</em>
                <br>• <em>"Xe biển số 51A-123.45 đang đỗ ở đâu?"</em>
                <br>• <em>"Mở barie cổng vào"</em> hoặc <em>"Bật đèn bãi xe"</em>
              </div>
              <div class="ai-msg-time">Vừa xong</div>
            </div>
          </div>
        </div>

        <!-- Quick Prompts Chips -->
        <div class="ai-quick-prompts">
          <div class="ai-prompt-chip" onclick="window.askAi('Hôm nay doanh thu được bao nhiêu rồi?')">💰 Doanh thu hôm nay?</div>
          <div class="ai-prompt-chip" onclick="window.askAi('Xe biển số 51A-123.45 đang đỗ ở đâu?')">🚗 Xe 51A-123.45 ở đâu?</div>
          <div class="ai-prompt-chip" onclick="window.askAi('Xe biển số 30A-999.88 đang đỗ ở đâu?')">🚙 Xe 30A-999.88 ở đâu?</div>
          <div class="ai-prompt-chip" onclick="window.askAi('Mở barie cổng vào')">🚪 Mở barie vào</div>
          <div class="ai-prompt-chip" onclick="window.askAi('Đóng barie cổng vào')">🔒 Đóng barie vào</div>
          <div class="ai-prompt-chip" onclick="window.askAi('Tình trạng bãi xe hiện tại thế nào?')">🅿️ Kiểm tra chỗ trống</div>
          <div class="ai-prompt-chip" onclick="window.askAi('Bật đèn bãi xe')">💡 Bật đèn bãi xe</div>
          <div class="ai-prompt-chip" onclick="window.askAi('Bảng giá gửi xe hiện tại')">🏷️ Bảng giá gửi xe</div>
        </div>

        <!-- Footer / Input Area -->
        <div class="ai-drawer-footer">
          <!-- Autocomplete Dropdown -->
          <div id="ai-autocomplete-dropdown" class="ai-autocomplete-dropdown">
            <div class="ai-autocomplete-header">
              <span>💡 GỢI Ý CÂU HỎI THÔNG MINH</span>
              <span style="font-size:10px;color:#94A3B8;cursor:pointer;" onclick="window.closeAiSuggestions()">✕ Đóng</span>
            </div>
            <div id="ai-autocomplete-list" class="ai-autocomplete-list"></div>
          </div>

          <!-- Voice Listening Indicator -->
          <div id="ai-listening-indicator" class="ai-listening-indicator">
            <div class="voice-wave-bars">
              <div class="voice-wave-bar"></div>
              <div class="voice-wave-bar"></div>
              <div class="voice-wave-bar"></div>
              <div class="voice-wave-bar"></div>
            </div>
            <span>Đang lắng nghe giọng nói tiếng Việt... Hãy nói!</span>
          </div>

          <!-- Input Row -->
          <div class="ai-input-wrap">
            <input type="text" id="ai-chat-input" class="ai-input-field" placeholder="Gõ câu hỏi hoặc bấm micro để nói..." autocomplete="off">
            <button id="ai-mic-trigger-btn" class="ai-mic-btn" title="Bấm để nói tiếng Việt">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
            <button id="ai-send-trigger-btn" class="ai-send-btn" title="Gửi câu hỏi">
              <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = drawerHTML;
    document.body.appendChild(div);

    // Gắn sự kiện
    const micBtn = document.getElementById('ai-mic-trigger-btn');
    if (micBtn) micBtn.addEventListener('click', toggleSpeechRecognition);

    const sendBtn = document.getElementById('ai-send-trigger-btn');
    if (sendBtn) sendBtn.addEventListener('click', () => sendUserMessage());

    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        const dropdown = document.getElementById('ai-autocomplete-dropdown');
        const isDropdownActive = dropdown && dropdown.classList.contains('active');
        const items = dropdown ? dropdown.querySelectorAll('.ai-suggestion-item') : [];

        if (isDropdownActive && items.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
            updateItemSelection(items);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
            updateItemSelection(items);
            return;
          }
          if (e.key === 'Enter') {
            if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
              e.preventDefault();
              const chosenText = items[selectedSuggestionIndex].getAttribute('data-text');
              closeAiSuggestions();
              sendUserMessage(chosenText);
              return;
            }
          }
          if (e.key === 'Escape') {
            closeAiSuggestions();
            return;
          }
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          closeAiSuggestions();
          sendUserMessage();
        }
      });

      // Chỉ khi gõ phím (input) mới cập nhật gợi ý, khi focus/chọn ô không hiện gợi ý
      input.addEventListener('input', (e) => {
        updateSuggestions(e.target.value);
      });
    }

    // Đóng gợi ý khi click ra ngoài
    document.addEventListener('click', (e) => {
      const inputWrap = document.querySelector('.ai-input-wrap');
      const dropdown = document.getElementById('ai-autocomplete-dropdown');
      if (dropdown && !dropdown.contains(e.target) && inputWrap && !inputWrap.contains(e.target)) {
        closeAiSuggestions();
      }
    });

    // Toggle giọng đọc AI
    const voiceToggleBtn = document.getElementById('ai-voice-toggle-btn');
    if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', () => {
        isVoiceEnabled = !isVoiceEnabled;
        if (isVoiceEnabled) {
          voiceToggleBtn.classList.add('active');
          voiceToggleBtn.title = 'Giọng đọc AI tiếng Việt: ĐANG BẬT';
          voiceToggleBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
        } else {
          voiceToggleBtn.classList.remove('active');
          voiceToggleBtn.title = 'Giọng đọc AI tiếng Việt: ĐÃ TẮT';
          voiceToggleBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
          stopAudio();
        }
      });
    }
  }

  // Tiện ích gửi câu hỏi từ nút bấm ngoài (Quick Prompts Chips)
  window.askAi = function(promptText) {
    closeAiSuggestions();
    openAiAssistant();
    setTimeout(() => {
      sendUserMessage(promptText);
    }, 100);
  };

  // Khởi động khi DOM sẵn sàng hoặc đã nạp xong
  function initAiAssistant() {
    injectAiDrawerHTML();
    recognition = initSpeechRecognition();

    // Lắng nghe phím tắt Alt + A để mở AI nhanh
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        toggleAiAssistant();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiAssistant);
  } else {
    initAiAssistant();
  }

  // Export hàm toàn cục
  window.toggleAiSpeech = toggleSpeechRecognition;
})();
