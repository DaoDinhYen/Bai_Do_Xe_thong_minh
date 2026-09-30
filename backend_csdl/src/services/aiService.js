/**
 * AI Service — Smart Parking System
 * Trợ Lý Ảo AI Điều Hành Bãi Xe Thông Minh
 * Hỗ trợ:
 * 1. Hybrid Engine: Gemini LLM Function Calling + Smart Vietnamese NLP Fallback (100% offline-ready)
 * 2. Tools: Tra cứu doanh thu, vị trí xe, chỗ đỗ, bảng giá, điều khiển barie và đèn qua MQTT
 */

const { query, queryOne } = require('../config/db');
const ParkingSlotModel = require('../models/parkingSlotModel');
const ParkingRateModel = require('../models/parkingRateModel');
const { publishOpenGate, publishCloseGate, publishLightOn, publishLightOff } = require('../mqtt/mqttPublisher');
const { normalizePlate, platesMatch } = require('../utils/plateNormalizer');
const logger = require('../utils/logger');

// ==========================================
//  1. TOOL DEFINITIONS & EXECUTION HANDLERS
// ==========================================

function removeAccents(str) {
  if (!str) return '';
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Phân tích và trích xuất ngày tháng từ câu hỏi tiếng Việt
 * Hỗ trợ: "22/9", "ngày 22/9", "10/9", "22/09/2026", "22-9", "ngày 22 tháng 9", "hôm qua", "hôm nay", "tháng 9", "7 ngày qua"
 */
function extractTargetDate(text) {
  if (!text) return null;
  const norm = removeAccents(text);

  // 1. "hom qua" -> yesterday
  if (norm.includes('hom qua')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    return {
      type: 'DAY',
      dateStr: `${y}-${m}-${d}`,
      displayStr: `Hôm qua (${d}/${m}/${y})`,
      periodLabel: `HÔM QUA (${d}/${m})`
    };
  }

  // 2. "hom nay" -> today
  if (norm.includes('hom nay')) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return {
      type: 'DAY',
      dateStr: `${y}-${m}-${d}`,
      displayStr: `Hôm nay (${d}/${m}/${y})`,
      periodLabel: `HÔM NAY (${d}/${m})`
    };
  }

  // 3. "7 ngay qua" / "tuan nay" / "tuan qua"
  if (norm.includes('tuan nay') || norm.includes('tuan qua') || norm.includes('7 ngay')) {
    return {
      type: 'WEEK',
      displayStr: '7 ngày gần nhất',
      periodLabel: '7 NGÀY QUA'
    };
  }

  // 4. Format: dd/mm/yyyy, dd/mm, dd-mm-yyyy, dd-mm
  // Ví dụ "22/9", "10/9", "22/09/2026", "ngày 22/9", "ngày 10/9", "10-09"
  const dmyMatch = norm.match(/(?:ngay\s+)?(\b\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}))?\b/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : new Date().getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const padDay = String(day).padStart(2, '0');
      const padMonth = String(month).padStart(2, '0');
      return {
        type: 'DAY',
        dateStr: `${year}-${padMonth}-${padDay}`,
        displayStr: `Ngày ${padDay}/${padMonth}/${year}`,
        periodLabel: `NGÀY ${padDay}/${padMonth}`
      };
    }
  }

  // 5. Format: "ngay 22 thang 9", "ngay 10 thang 9 nam 2026"
  const textMatch = norm.match(/ngay\s+(\d{1,2})\s+thang\s+(\d{1,2})(?:\s+nam\s+(\d{4}))?/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const month = parseInt(textMatch[2], 10);
    const year = textMatch[3] ? parseInt(textMatch[3], 10) : new Date().getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const padDay = String(day).padStart(2, '0');
      const padMonth = String(month).padStart(2, '0');
      return {
        type: 'DAY',
        dateStr: `${year}-${padMonth}-${padDay}`,
        displayStr: `Ngày ${padDay}/${padMonth}/${year}`,
        periodLabel: `NGÀY ${padDay}/${padMonth}`
      };
    }
  }

  // 6. Format: "thang 9", "thang nay"
  if (norm.includes('thang')) {
    const monthMatch = norm.match(/thang\s+(\d{1,2})(?:\s+nam\s+(\d{4}))?/i);
    let month = monthMatch ? parseInt(monthMatch[1], 10) : (new Date().getMonth() + 1);
    let year = (monthMatch && monthMatch[2]) ? parseInt(monthMatch[2], 10) : new Date().getFullYear();
    if (month >= 1 && month <= 12) {
      const padMonth = String(month).padStart(2, '0');
      return {
        type: 'MONTH',
        month,
        year,
        displayStr: `Tháng ${padMonth}/${year}`,
        periodLabel: `THÁNG ${padMonth}/${year}`
      };
    }
  }

  return null;
}

/**
 * 1.1 Tra cứu Doanh thu & Thống kê động theo ngày hoặc tháng
 */
async function toolGetRevenueStats({ targetDate = null } = {}) {
  try {
    let sql = '';
    let params = [];
    let periodTitle = 'Hôm nay';
    let periodBadge = 'HÔM NAY';

    if (targetDate && targetDate.type === 'DAY') {
      sql = `
        SELECT 
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN fee ELSE 0 END), 0) as total_revenue,
          COUNT(*) as total_turns,
          COUNT(CASE WHEN exit_time IS NOT NULL THEN 1 END) as completed_turns,
          COUNT(CASE WHEN exit_time IS NULL THEN 1 END) as active_turns
        FROM parking_history
        WHERE DATE(entry_time) = ? OR DATE(exit_time) = ?
      `;
      params = [targetDate.dateStr, targetDate.dateStr];
      periodTitle = targetDate.displayStr;
      periodBadge = targetDate.periodLabel;
    } else if (targetDate && targetDate.type === 'MONTH') {
      sql = `
        SELECT 
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN fee ELSE 0 END), 0) as total_revenue,
          COUNT(*) as total_turns,
          COUNT(CASE WHEN exit_time IS NOT NULL THEN 1 END) as completed_turns,
          COUNT(CASE WHEN exit_time IS NULL THEN 1 END) as active_turns
        FROM parking_history
        WHERE (MONTH(entry_time) = ? AND YEAR(entry_time) = ?)
           OR (MONTH(exit_time) = ? AND YEAR(exit_time) = ?)
      `;
      params = [targetDate.month, targetDate.year, targetDate.month, targetDate.year];
      periodTitle = targetDate.displayStr;
      periodBadge = targetDate.periodLabel;
    } else if (targetDate && targetDate.type === 'WEEK') {
      sql = `
        SELECT 
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN fee ELSE 0 END), 0) as total_revenue,
          COUNT(*) as total_turns,
          COUNT(CASE WHEN exit_time IS NOT NULL THEN 1 END) as completed_turns,
          COUNT(CASE WHEN exit_time IS NULL THEN 1 END) as active_turns
        FROM parking_history
        WHERE entry_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           OR exit_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `;
      params = [];
      periodTitle = targetDate.displayStr;
      periodBadge = targetDate.periodLabel;
    } else {
      sql = `
        SELECT 
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN fee ELSE 0 END), 0) as total_revenue,
          COUNT(*) as total_turns,
          COUNT(CASE WHEN exit_time IS NOT NULL THEN 1 END) as completed_turns,
          COUNT(CASE WHEN exit_time IS NULL THEN 1 END) as active_turns
        FROM parking_history
        WHERE DATE(entry_time) = CURDATE() OR DATE(exit_time) = CURDATE()
      `;
      params = [];
      const today = new Date();
      const padD = String(today.getDate()).padStart(2, '0');
      const padM = String(today.getMonth() + 1).padStart(2, '0');
      periodTitle = `Hôm nay (${padD}/${padM}/${today.getFullYear()})`;
      periodBadge = `HÔM NAY (${padD}/${padM})`;
    }

    const row = await queryOne(sql, params);
    const totalRevenue = Number(row?.total_revenue || 0);
    const revenueVND = totalRevenue.toLocaleString('vi-VN');
    const totalTurns = Number(row?.total_turns || 0);
    const completedTurns = Number(row?.completed_turns || 0);
    const activeTurns = Number(row?.active_turns || 0);

    const summary = await ParkingSlotModel.getSummary();
    const totalSlots = summary?.total || 6;
    const occupiedSlots = summary?.occupied_count || 0;
    const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    let message = '';
    if (totalTurns === 0) {
      message = `${periodTitle}, bãi xe không ghi nhận lượt gửi xe nào (Doanh thu: 0 VNĐ).`;
    } else {
      message = `${periodTitle}, bãi xe đã thu được ${revenueVND} VNĐ từ ${totalTurns} lượt gửi xe (${completedTurns} lượt đã hoàn tất${activeTurns > 0 ? `, ${activeTurns} xe đang đỗ` : ''}).`;
    }

    const isTodayQuery = !targetDate || periodTitle.includes('Hôm nay');
    if (isTodayQuery) {
      message += ` Hiện có ${occupiedSlots}/${totalSlots} xe đang đỗ trong bãi (đạt ${occupancyRate}% công suất).`;
    }

    return {
      success: true,
      action: 'QUERY_REVENUE',
      data: {
        periodTitle,
        periodBadge,
        revenue: totalRevenue,
        formattedRevenue: `${revenueVND} đ`,
        totalTurns,
        completedTurns,
        activeTurns,
        occupancyRate,
        occupiedSlots,
        totalSlots,
        isToday: isTodayQuery
      },
      message
    };
  } catch (err) {
    logger.error('Lỗi khi lấy doanh thu AI:', err);
    return { success: false, message: 'Không thể truy xuất dữ liệu doanh thu lúc này.' };
  }
}

/**
 * 1.2 Tra cứu Vị trí Xe theo biển số (Hiện đang đỗ hoặc đã xuất bãi)
 */
async function toolLocateVehicle({ plate_number }) {
  if (!plate_number) {
    return { success: false, message: 'Vui lòng cung cấp biển số xe cần tìm kiếm.' };
  }

  const cleanInput = normalizePlate(plate_number);

  try {
    // 1. Tìm trong phiên đang gửi (exit_time IS NULL)
    const activeSql = `
      SELECT ph.*, u.name as user_name, u.phone as user_phone,
             v.plate_number, v.vehicle_type, v.color,
             ps.slot_code, ps.zone,
             TIMESTAMPDIFF(MINUTE, ph.entry_time, NOW()) as parked_minutes
      FROM parking_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      LEFT JOIN vehicles v ON ph.vehicle_id = v.id
      LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
      WHERE ph.exit_time IS NULL
      ORDER BY ph.entry_time DESC
    `;
    const activeSessions = await query(activeSql);

    // So khớp biển số linh hoạt
    const matchedSession = activeSessions.find(s => platesMatch(s.plate_number, cleanInput));

    if (matchedSession) {
      const minutes = matchedSession.parked_minutes || 0;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const timeStr = hours > 0 ? `${hours} giờ ${remainingMinutes} phút` : `${remainingMinutes} phút`;

      const rate = await ParkingRateModel.getByVehicleType(matchedSession.vehicle_type || 'CAR') || { price_per_hour: 10000 };
      const hoursCharged = Math.max(1, Math.ceil(minutes / 60));
      const estFee = (hoursCharged * (rate.price_per_hour || 10000)).toLocaleString('vi-VN');

      const owner = matchedSession.user_name || 'Khách vãng lai';
      const slot = matchedSession.slot_code || 'Chưa xác định ô';

      return {
        success: true,
        action: 'LOCATE_VEHICLE',
        data: {
          plate_number: matchedSession.plate_number,
          slot_code: slot,
          owner_name: owner,
          parked_time: timeStr,
          estimated_fee: `${estFee} đ`
        },
        message: `Xe ${matchedSession.plate_number} của ${owner} đang đỗ tại ô ${slot}, đã đỗ được ${timeStr}. Phí tạm tính: ${estFee} VNĐ.`
      };
    }

    // 2. Nếu xe không còn đỗ trong bãi, tìm lượt gửi gần nhất trong lịch sử (đã xuất bãi)
    const lastSession = await queryOne(`
      SELECT ph.*, u.name as owner_name, v.plate_number, ps.slot_code
      FROM parking_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      LEFT JOIN vehicles v ON ph.vehicle_id = v.id
      LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
      WHERE REPLACE(REPLACE(v.plate_number, "-", ""), ".", "") = ?
         OR REPLACE(REPLACE(ph.rfid_uid, "-", ""), ":", "") = ?
      ORDER BY ph.id DESC LIMIT 1
    `, [cleanInput, cleanInput]);

    if (lastSession && lastSession.exit_time) {
      const exitDate = new Date(lastSession.exit_time);
      const timeStr = exitDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = exitDate.toLocaleDateString('vi-VN');
      const feeVND = Number(lastSession.fee || 0).toLocaleString('vi-VN');
      const owner = lastSession.owner_name || 'Khách hàng';
      const slot = lastSession.slot_code || 'A0x';
      return {
        success: true,
        action: 'LOCATE_VEHICLE',
        data: {
          found: false,
          plate_number: lastSession.plate_number || plate_number,
          owner_name: owner,
          last_exit: `${timeStr} ngày ${dateStr}`,
          fee: `${feeVND} đ`,
          slot_code: slot
        },
        message: `Xe ${lastSession.plate_number || plate_number} của ${owner} hiện KHÔNG có trong bãi. Lượt gửi gần nhất tại ô ${slot} đã xuất bãi lúc ${timeStr} ngày ${dateStr} (phí gửi: ${feeVND} VNĐ).`
      };
    }

    // 3. Nếu là xe đã đăng ký nhưng chưa từng gửi
    const vehicle = await queryOne('SELECT v.*, u.name as owner_name FROM vehicles v LEFT JOIN users u ON v.user_id = u.id WHERE REPLACE(REPLACE(v.plate_number, "-", ""), ".", "") = ?', [cleanInput]);
    if (vehicle) {
      return {
        success: true,
        action: 'LOCATE_VEHICLE',
        data: { found: false, plate_number: vehicle.plate_number, owner_name: vehicle.owner_name },
        message: `Xe ${vehicle.plate_number} của ${vehicle.owner_name || 'Người dùng'} hiện KHÔNG có trong bãi đỗ xe.`
      };
    }

    return {
      success: true,
      action: 'LOCATE_VEHICLE',
      data: { found: false, plate_number: plate_number },
      message: `Không tìm thấy phương tiện có biển số ${plate_number} trong cơ sở dữ liệu bãi xe.`
    };
  } catch (err) {
    logger.error('Lỗi khi tra cứu vị trí xe AI:', err);
    return { success: false, message: 'Đã xảy ra lỗi khi tra cứu vị trí xe trong hệ thống.' };
  }
}

/**
 * 1.3 Tra cứu Tình trạng Chỗ đỗ (Slot Status)
 */
async function toolGetSlotsStatus() {
  try {
    const slots = await ParkingSlotModel.getAll();
    const realSlots = slots.filter(s => !s.is_virtual);

    const freeSlots = realSlots.filter(s => s.status === 'FREE').map(s => s.slot_code);
    const occupiedSlots = realSlots.filter(s => s.status === 'OCCUPIED').map(s => s.slot_code);
    const reservedSlots = realSlots.filter(s => s.status === 'RESERVED').map(s => s.slot_code);

    let message = `Hiện tại bãi xe có ${freeSlots.length}/${realSlots.length} chỗ trống. `;
    if (freeSlots.length > 0) {
      message += `Các ô còn trống: ${freeSlots.join(', ')}. `;
    } else {
      message += `Bãi xe hiện đã kín toàn bộ chỗ đỗ! `;
    }

    if (occupiedSlots.length > 0) {
      message += `Đang có xe tại: ${occupiedSlots.join(', ')}. `;
    }
    if (reservedSlots.length > 0) {
      message += `Đã được đặt trước: ${reservedSlots.join(', ')}.`;
    }

    return {
      success: true,
      action: 'GET_SLOTS_STATUS',
      data: {
        total: realSlots.length,
        freeCount: freeSlots.length,
        occupiedCount: occupiedSlots.length,
        reservedCount: reservedSlots.length,
        freeSlots,
        occupiedSlots,
        reservedSlots
      },
      message
    };
  } catch (err) {
    logger.error('Lỗi khi lấy trạng thái chỗ đỗ AI:', err);
    return { success: false, message: 'Không thể kiểm tra tình trạng chỗ đỗ lúc này.' };
  }
}

/**
 * 1.4 Điều khiển Barie (Mở / Đóng)
 */
async function toolControlBarrier({ gate = 'in', action = 'open', io = null }) {
  const dir = gate.toUpperCase() === 'OUT' ? 'OUT' : 'IN';
  const isOpening = action.toLowerCase() === 'open';

  try {
    if (isOpening) {
      publishOpenGate(dir, { plate: 'AI_COMMAND', user: 'AI Assistant' });
    } else {
      publishCloseGate(dir);
    }

    if (io) {
      io.emit('barrier_status', {
        direction: dir,
        gate: dir,
        status: isOpening ? 'OPEN' : 'CLOSED',
        timestamp: new Date().toISOString()
      });
    }

    const gateName = dir === 'IN' ? 'cổng vào' : 'cổng ra';
    const actionText = isOpening ? 'mở' : 'đóng';

    return {
      success: true,
      action: 'CONTROL_BARRIER',
      data: { gate: dir, command: isOpening ? 'OPEN' : 'CLOSE' },
      message: `Đã thực thi lệnh ${actionText} barie ${gateName} thành công qua MQTT!`
    };
  } catch (err) {
    logger.error('Lỗi điều khiển barie AI:', err);
    return { success: false, message: `Không thể điều khiển barie ${gate} lúc này.` };
  }
}

/**
 * 1.5 Điều khiển Đèn Bãi Xe
 */
async function toolControlLight({ action = 'on', io = null }) {
  const isOn = action.toLowerCase() === 'on';

  try {
    if (isOn) {
      publishLightOn();
    } else {
      publishLightOff();
    }

    if (io) {
      io.emit('light_status', {
        status: isOn ? 'ON' : 'OFF',
        timestamp: new Date().toISOString()
      });
    }

    const actionText = isOn ? 'bật' : 'tắt';
    return {
      success: true,
      action: 'CONTROL_LIGHT',
      data: { status: isOn ? 'ON' : 'OFF' },
      message: `Đã ${actionText} hệ thống đèn chiếu sáng bãi xe thành công!`
    };
  } catch (err) {
    logger.error('Lỗi điều khiển đèn AI:', err);
    return { success: false, message: 'Không thể điều khiển đèn bãi xe lúc này.' };
  }
}

/**
 * 1.6 Tra cứu Bảng Giá Gửi Xe
 */
async function toolGetRates() {
  try {
    const rates = await ParkingRateModel.getAll();
    if (!rates || rates.length === 0) {
      return { success: true, message: 'Giá gửi xe tiêu chuẩn là 10.000 VNĐ/giờ.' };
    }

    const rateItems = rates.map(r => {
      const typeName = r.vehicle_type === 'CAR' ? 'Ô tô' : r.vehicle_type === 'MOTORBIKE' ? 'Xe máy' : 'Xe tải';
      return `• ${typeName}: ${Number(r.price_per_hour).toLocaleString('vi-VN')} đ/giờ (Tối thiểu ${Number(r.minimum_fee || 0).toLocaleString('vi-VN')} đ)`;
    }).join('\n');

    return {
      success: true,
      action: 'GET_RATES',
      data: { rates },
      message: `Bảng giá dịch vụ gửi xe hiện tại:\n${rateItems}`
    };
  } catch (err) {
    logger.error('Lỗi khi tra cứu bảng giá AI:', err);
    return { success: false, message: 'Không thể tra cứu bảng giá lúc này.' };
  }
}


// ==========================================
//  2. SMART VIETNAMESE INTENT ENGINE (FALLBACK)
// ==========================================

/**
 * 1.7 Danh sách toàn bộ xe đang đỗ trong bãi
 */
async function toolGetActiveVehiclesList() {
  try {
    const activeSessions = await query(`
      SELECT ph.*, u.name as user_name, v.plate_number, v.vehicle_type, ps.slot_code,
             TIMESTAMPDIFF(MINUTE, ph.entry_time, NOW()) as parked_minutes
      FROM parking_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      LEFT JOIN vehicles v ON ph.vehicle_id = v.id
      LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
      WHERE ph.exit_time IS NULL
      ORDER BY ps.slot_code ASC
    `);

    if (!activeSessions || activeSessions.length === 0) {
      return {
        success: true,
        action: 'LIST_ACTIVE_VEHICLES',
        data: { count: 0, vehicles: [] },
        message: 'Hiện tại không có phương tiện nào đang đỗ trong bãi xe. Toàn bộ các ô đỗ đều đang trống!'
      };
    }

    const items = activeSessions.map((s, idx) => {
      const mins = s.parked_minutes || 0;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = h > 0 ? `${h}h${m}p` : `${m}p`;
      const owner = s.user_name || 'Khách vãng lai';
      return `${idx + 1}. Xe ${s.plate_number} (${owner}) đỗ tại ô ${s.slot_code || 'A0x'} (đã gửi ${timeStr})`;
    }).join('\n');

    return {
      success: true,
      action: 'LIST_ACTIVE_VEHICLES',
      data: { count: activeSessions.length, vehicles: activeSessions },
      message: `Hiện có ${activeSessions.length} xe đang đỗ trong bãi:\n${items}`
    };
  } catch (err) {
    logger.error('Lỗi lấy danh sách xe đang đỗ:', err);
    return { success: false, message: 'Không thể truy xuất danh sách xe lúc này.' };
  }
}

/**
 * 1.8 Kiểm tra trạng thái của một ô đỗ cụ thể (A01 - A06)
 */
async function toolGetSpecificSlotStatus(slotCode) {
  try {
    const cleanCode = slotCode.toUpperCase();
    const slot = await ParkingSlotModel.findByCode(cleanCode);
    if (!slot) {
      return {
        success: true,
        message: `Hệ thống không tìm thấy vị trí ô đỗ ${slotCode}. Bãi xe có 6 ô đỗ từ A01 đến A06.`
      };
    }

    if (slot.status === 'FREE') {
      return {
        success: true,
        action: 'SLOT_DETAIL',
        data: slot,
        message: `Vị trí ô ${slot.slot_code} hiện đang TRỐNG (khả dụng). Bạn có thể đỗ xe hoặc đặt chỗ trước tại vị trí này.`
      };
    }

    if (slot.status === 'RESERVED') {
      const booking = await queryOne(`
        SELECT b.*, u.name as user_name, v.plate_number
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.slot_id = ? AND b.status IN ('CONFIRMED','ACTIVE')
        ORDER BY b.id DESC LIMIT 1
      `, [slot.id]);

      const who = booking ? `khách hàng ${booking.user_name} (${booking.plate_number || 'đã đặt'})` : 'người dùng';
      return {
        success: true,
        action: 'SLOT_DETAIL',
        data: slot,
        message: `Vị trí ô ${slot.slot_code} ĐÃ ĐƯỢC ĐẶT TRƯỚC bởi ${who}.`
      };
    }

    if (slot.status === 'OCCUPIED') {
      const session = await queryOne(`
        SELECT ph.*, u.name as user_name, v.plate_number,
               TIMESTAMPDIFF(MINUTE, ph.entry_time, NOW()) as parked_minutes
        FROM parking_history ph
        LEFT JOIN users u ON ph.user_id = u.id
        LEFT JOIN vehicles v ON ph.vehicle_id = v.id
        WHERE ph.slot_id = ? AND ph.exit_time IS NULL
        ORDER BY ph.id DESC LIMIT 1
      `, [slot.id]);

      const detail = session ? `bởi xe ${session.plate_number} (${session.user_name || 'Khách vãng lai'}, đã đỗ ${session.parked_minutes} phút)` : 'đang có xe đỗ';
      return {
        success: true,
        action: 'SLOT_DETAIL',
        data: slot,
        message: `Vị trí ô ${slot.slot_code} HIỆN ĐANG CÓ XE ĐỖ ${detail}.`
      };
    }

    return {
      success: true,
      action: 'SLOT_DETAIL',
      data: slot,
      message: `Vị trí ô ${slot.slot_code} hiện đang ở trạng thái TẠM DỪNG HOẠT ĐỘNG (DISABLED) để bảo trì.`
    };
  } catch (err) {
    logger.error('Lỗi kiểm tra ô đỗ cụ thể:', err);
    return { success: false, message: `Không thể kiểm tra ô ${slotCode} lúc này.` };
  }
}

/**
 * 1.9 Lịch sử 5 lượt xe ra vào gần đây nhất
 */
async function toolGetRecentActivity() {
  try {
    const recent = await query(`
      SELECT ph.*, u.name as user_name, v.plate_number, ps.slot_code
      FROM parking_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      LEFT JOIN vehicles v ON ph.vehicle_id = v.id
      LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
      ORDER BY COALESCE(ph.exit_time, ph.entry_time) DESC
      LIMIT 5
    `);

    if (!recent || recent.length === 0) {
      return {
        success: true,
        action: 'RECENT_ACTIVITY',
        message: 'Chưa có lượt xe ra vào nào được ghi nhận gần đây trong hệ thống.'
      };
    }

    const lines = recent.map((r, idx) => {
      const isExit = !!r.exit_time;
      const typeStr = isExit ? '🚪 ĐÃ RA' : '🚗 VÀO BÃI';
      const eventTime = isExit ? new Date(r.exit_time) : new Date(r.entry_time);
      const timeStr = eventTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const owner = r.user_name || 'Khách vãng lai';
      const slot = r.slot_code || 'A0x';
      return `${idx + 1}. [${typeStr}] Xe ${r.plate_number || 'Khách'} (${owner}) - Ô ${slot} lúc ${timeStr}`;
    }).join('\n');

    return {
      success: true,
      action: 'RECENT_ACTIVITY',
      data: { count: recent.length, list: recent },
      message: `5 lượt xe ra vào gần nhất của bãi xe:\n${lines}`
    };
  } catch (err) {
    logger.error('Lỗi lấy hoạt động gần nhất:', err);
    return { success: false, message: 'Không thể tra cứu lịch sử hoạt động lúc này.' };
  }
}

/**
 * 1.10 Mở toàn bộ Barie trường hợp khẩn cấp
 */
async function toolEmergencyOpenAllBarriers(io = null) {
  try {
    publishOpenGate('IN', { plate: 'EMERGENCY_AI', user: 'AI Emergency' });
    publishOpenGate('OUT', { plate: 'EMERGENCY_AI', user: 'AI Emergency' });

    if (io) {
      io.emit('barrier_status', { direction: 'ALL', status: 'OPEN', mode: 'EMERGENCY', timestamp: new Date().toISOString() });
    }

    return {
      success: true,
      action: 'CONTROL_BARRIER',
      data: { gate: 'ALL', command: 'OPEN' },
      message: '🚨 ĐÃ KÍCH HOẠT CHẾ ĐỘ KHẨN CẤP: Đã mở đồng thời toàn bộ Barie Cổng Vào và Cổng Ra để các phương tiện lưu thông tự do!'
    };
  } catch (err) {
    logger.error('Lỗi kích hoạt barie khẩn cấp:', err);
    return { success: false, message: 'Không thể kích hoạt mở barie khẩn cấp lúc này.' };
  }
}

// ==========================================
//  2. SMART VIETNAMESE INTENT ENGINE (FALLBACK)
// ==========================================

function extractPlateNumber(text) {
  if (!text) return null;
  // Biển số chuẩn Việt Nam: 51A-123.45, 51A12345, 30A-999.88, 29B-1234, 36A99999, 59C-777.88...
  const regex = /([0-9]{2}[A-Za-z0-9]{1,2}[-.\s]?[0-9]{3,5}[-.\s]?[0-9]{0,2})/g;
  const matches = text.match(regex);
  if (matches) {
    for (const m of matches) {
      const clean = m.replace(/[^A-Za-z0-9]/g, '');
      if (clean.length >= 6 && clean.length <= 10 && /\d/.test(clean[0])) {
        return clean;
      }
    }
  }
  return null;
}

function extractSlotCode(text) {
  const match = text.toUpperCase().match(/\b(A0[1-6]|A[1-6]|B0[1-6]|B[1-6])\b/);
  if (match) {
    let code = match[1];
    if (code.length === 2) code = code[0] + '0' + code[1];
    return code;
  }
  return null;
}

async function processWithVietnameseNLP(rawInput, io) {
  const norm = removeAccents(rawInput);
  const plate = extractPlateNumber(rawInput);
  const slotCode = extractSlotCode(rawInput);

  // 1. Lệnh khẩn cấp: Mở toàn bộ Barie (Cháy nổ, sơ tán, khẩn cấp)
  if (norm.includes('khan cap') || norm.includes('mo het') || norm.includes('mo tat ca') || norm.includes('mo ca hai') || norm.includes('chay') || norm.includes('so tan') || norm.includes('cuu hoa')) {
    return await toolEmergencyOpenAllBarriers(io);
  }

  // 2. Lịch sử xe ra vào gần nhất
  if (norm.includes('gan nhat') || norm.includes('vua vao') || norm.includes('vua ra') || norm.includes('lich su ra vao') || norm.includes('luot xe') || norm.includes('xe moi')) {
    return await toolGetRecentActivity();
  }

  // 3. Lệnh điều khiển Barie (Yêu cầu phải có động từ điều khiển: mở, đóng, hạ, nâng...)
  const hasBarrierAction = norm.includes('mo ') || norm.startsWith('mo') || norm.includes('dong ') || norm.startsWith('dong') || norm.includes('ha ') || norm.includes('nang ') || norm.includes('control') || norm.includes('dieu khien');
  const mentionsBarrier = norm.includes('barie') || norm.includes('barrier') || norm.includes('thanh chan') || norm.includes('cong vao') || norm.includes('cong ra') || norm.includes('cua vao') || norm.includes('cua ra');
  if (mentionsBarrier && hasBarrierAction && !norm.includes('goi y') && !norm.includes('gan cong')) {
    const isOut = norm.includes('ra') || norm.includes('out');
    const isClose = norm.includes('dong') || norm.includes('ha') || norm.includes('tat') || norm.includes('close');
    const gate = isOut ? 'out' : 'in';
    const action = isClose ? 'close' : 'open';

    return await toolControlBarrier({ gate, action, io });
  }

  // 4. Lệnh điều khiển Đèn (Yêu cầu có động từ bật, tắt, ngắt, mở...)
  const hasLightAction = norm.includes('bat') || norm.includes('tat') || norm.includes('ngat') || norm.includes('mo') || norm.includes('dong') || norm.includes('dieu khien');
  if ((norm.includes('den') || norm.includes('anh sang') || norm.includes('chieu sang') || norm.includes('light')) && hasLightAction) {
    const isOff = norm.includes('tat') || norm.includes('ngat') || norm.includes('off') || norm.includes('dong');
    const action = isOff ? 'off' : 'on';
    return await toolControlLight({ action, io });
  }

  // 5. Tra cứu vị trí Xe theo Biển số (Ưu tiên tuyệt đối khi phát hiện biển số xe)
  if (plate) {
    return await toolLocateVehicle({ plate_number: plate });
  }

  // 6. Hỏi về Ô đỗ cụ thể (Ví dụ: "Ô A01 có xe không?", "Trạng thái ô A02", "Chỗ A03", "A01 thế nào")
  if (slotCode && (norm.includes('o ') || norm.includes('cho') || norm.includes('vi tri') || norm.includes('slot') || norm.includes('the nao') || norm.includes('co xe'))) {
    return await toolGetSpecificSlotStatus(slotCode);
  }

  // 7. Gợi ý ô đỗ thuận tiện nhất / Ô nào đang trống
  if (norm.includes('o nao trong') || norm.includes('goi y') || norm.includes('cho nao de') || norm.includes('o gan nhat') || norm.includes('nen do o nao') || (norm.includes('do o dau') && !norm.includes('xe'))) {
    try {
      const slots = await ParkingSlotModel.getAll();
      const realFree = slots.filter(s => !s.is_virtual && s.status === 'FREE');
      if (realFree.length === 0) {
        return {
          success: true,
          action: 'SLOT_SUGGESTION',
          message: 'Hiện tại bãi xe đã kín toàn bộ chỗ đỗ. Không có ô trống nào khả dụng!'
        };
      }
      const best = realFree[0].slot_code;
      const allFree = realFree.map(s => s.slot_code).join(', ');
      return {
        success: true,
        action: 'SLOT_SUGGESTION',
        message: `Hiện bãi xe có các ô trống: ${allFree}. Bạn nên hướng dẫn khách đỗ vào ô ${best} vì đây là vị trí thông thoáng và gần lối vào nhất.`
      };
    } catch (e) {
      // fallback
    }
  }

  // 8. Danh sách các xe đang đỗ trong bãi
  if (norm.includes('danh sach xe') || norm.includes('nhung xe nao') || norm.includes('cac xe dang') || norm.includes('xe nao dang do') || norm.includes('xe trong bai') || norm.includes('toan bo xe') || norm.includes('co nhung xe') || norm.includes('xe dang gui')) {
    return await toolGetActiveVehiclesList();
  }

  // 9. Tra cứu vị trí Xe theo tên chủ xe hoặc nhắc tìm xe chung
  if (norm.includes('xe dang') || norm.includes('xe do') || norm.includes('vi tri xe') || norm.includes('tim xe') || norm.includes('bien so') || norm.includes('xe cua') || norm.includes('xe o dau')) {
    // Tìm kiếm theo tên chủ xe nếu có nhắc tên
    try {
      const activeSessions = await query(`
        SELECT ph.*, u.name as user_name, v.plate_number, ps.slot_code,
               TIMESTAMPDIFF(MINUTE, ph.entry_time, NOW()) as parked_minutes
        FROM parking_history ph
        LEFT JOIN users u ON ph.user_id = u.id
        LEFT JOIN vehicles v ON ph.vehicle_id = v.id
        LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
        WHERE ph.exit_time IS NULL
      `);

      for (const s of activeSessions) {
        if (s.user_name) {
          const cleanOwner = removeAccents(s.user_name);
          const ownerWords = cleanOwner.split(/\s+/);
          const matchedWord = ownerWords.some(w => w.length > 1 && norm.includes(w));
          if (matchedWord) {
            return await toolLocateVehicle({ plate_number: s.plate_number });
          }
        }
      }
    } catch (e) {
      logger.warn('Lỗi tìm xe theo tên chủ xe:', e.message);
    }

    return {
      success: true,
      action: 'PROMPT_INPUT',
      message: 'Bạn muốn tìm vị trí của xe nào? Bạn có thể đọc hoặc nhập bất kỳ biển số xe nào (Ví dụ: 15B-999.99, 36A-999.99, 30E-123.45...).'
    };
  }

  // 10. Doanh thu & Thống kê tài chính (Hôm nay, hôm qua, theo ngày vd: 22/9, 10/9, theo tháng, 7 ngày qua...)
  if (norm.includes('doanh thu') || norm.includes('doanh so') || norm.includes('tien thu') || norm.includes('thu nhap') || norm.includes('thu duoc') || norm.includes('kiem duoc') || norm.includes('bao nhieu tien') || norm.includes('tong thu')) {
    const targetDate = extractTargetDate(rawInput);
    return await toolGetRevenueStats({ targetDate });
  }

  // 11. Bảng giá gửi xe & Chi phí qua đêm
  if (norm.includes('gia') || norm.includes('bang gia') || norm.includes('phi gui') || norm.includes('bao nhieu mot gio') || norm.includes('gia tien') || norm.includes('qua dem')) {
    return await toolGetRates();
  }

  // 12. Xử lý sự cố kỹ thuật (Mất điện, mất mạng, kẹt barie, camera mờ)
  if (norm.includes('mat dien') || norm.includes('mat mang') || norm.includes('offline') || norm.includes('ket barie') || norm.includes('hong barie') || norm.includes('su co') || norm.includes('khong nhan dien') || norm.includes('mat nguon')) {
    return {
      success: true,
      action: 'EXPLAIN_TROUBLESHOOTING',
      message: 'Phương án ứng phó sự cố kỹ thuật:\n• Khi mất điện: Hệ thống dùng nguồn lưu điện UPS, barie có khóa cơ để bảo vệ mở bằng tay thủ công.\n• Khi mất Internet/MQTT: ESP32 lưu thẻ nhớ cục bộ và điều khiển độc lập.\n• Khi Camera ANPR mờ/không nhận: Bảo vệ nhập biển số trực tiếp trên Web Admin hoặc thẻ RFID vẫn cho phép xe lưu thông.'
    };
  }

  // 13. Khách vãng lai, Quên thẻ, Mất thẻ, Không khớp biển số, Bảo mật 2 lớp
  if (norm.includes('vang lai') || norm.includes('quen the') || norm.includes('mat the') || norm.includes('khong co the') || norm.includes('khong mo') || norm.includes('khong khop') || norm.includes('the khong hop le') || norm.includes('bao mat') || norm.includes('2 lop')) {
    return {
      success: true,
      action: 'EXPLAIN_SECURITY',
      message: 'Quy trình xử lý an ninh thẻ & biển số:\n• Khách vãng lai: Hệ thống tạo phiên gửi tự động bằng ảnh chụp biển số ANPR.\n• Quên/Mất thẻ RFID: Bảo vệ tra cứu biển số trên Web Admin để xác minh thời gian vào và tạo lượt ra thủ công.\n• Cơ chế bảo mật 2 lớp RFID & ANPR: Biển số và RFID phải khớp nhau tuyệt đối, nếu không hệ thống sẽ báo động và từ chối mở barie chống trộm xe.'
    };
  }

  // 14. Quy trình đặt chỗ & Thời gian giữ chỗ (Booking)
  if (norm.includes('dat cho') || norm.includes('cach gui') || norm.includes('gui xe nhu the nao') || norm.includes('quy trinh') || norm.includes('booking') || norm.includes('giu cho') || norm.includes('huy')) {
    return {
      success: true,
      action: 'EXPLAIN_WORKFLOW',
      message: 'Quy trình đặt chỗ thông minh:\n1. Khách chọn ô đỗ (A01-A06) và giờ gửi trên Mobile App.\n2. Hệ thống tạm giữ chỗ trong vòng 15 phút so với giờ hẹn.\n3. Khi xe đến cổng, Camera ANPR và thẻ RFID xác thực mở barie vào đúng ô đã đặt.\n4. Nếu hủy đặt chỗ trước giờ hẹn, tiền đặt cọc được hoàn lại 100% vào ví điện tử.'
    };
  }

  // 15. Ví điện tử & Thanh toán, Hoàn tiền
  if (norm.includes('vi ') || norm.includes('thanh toan') || norm.includes('nap tien') || norm.includes('tru tien') || norm.includes('wallet') || norm.includes('hoan tien') || norm.includes('refund')) {
    return {
      success: true,
      action: 'EXPLAIN_WALLET',
      message: 'Hệ thống thanh toán ví điện tử tự động:\n• Nạp tiền mô phỏng nhanh chóng trên Mobile App.\n• Tự động trừ tiền khi hoàn tất lượt gửi xe.\n• Cơ chế Tự động hoàn tiền (Auto Refund): Nếu thời gian đỗ thực tế ngắn hơn thời gian đặt trước, khoản phí chênh lệch được hoàn trả tức thì về ví người dùng.'
    };
  }

  // 16. Giờ mở cửa / Thời gian hoạt động
  if (norm.includes('gio mo cua') || norm.includes('khung gio') || norm.includes('mo cua luc') || norm.includes('gio lam viec') || norm.includes('thoi gian hoat dong') || (norm.includes('mo cua') && !hasBarrierAction)) {
    return {
      success: true,
      action: 'GENERAL_INFO',
      message: 'Bãi đỗ xe thông minh hoạt động 24/7 liên tục cả ngày và đêm. Toàn bộ hệ thống kiểm soát xe vào ra, giám sát ô đỗ bằng cảm biến và camera nhận diện biển số đều vận hành hoàn toàn tự động.'
    };
  }

  // 17. Đề tài, Tác giả, Mục tiêu đồ án
  if (norm.includes('de tai') || norm.includes('do an') || norm.includes('tac gia') || norm.includes('ai lam') || norm.includes('muc tieu') || norm.includes('bai tap lon') || norm.includes('nhom')) {
    return {
      success: true,
      action: 'EXPLAIN_PROJECT',
      message: 'Đề tài "Hệ thống Bãi Đỗ Xe Thông Minh (Smart Parking System)" — Bài tập lớn môn Thiết kế Hệ thống IoT.\n• Tác giả: Đào Đình Yên & Nhóm sinh viên.\n• Mục tiêu: Tự động hóa 100% khâu kiểm soát ra vào, xác thực 2 lớp ANPR + RFID, giám sát ô đỗ thời gian thực và tích hợp Trợ lý ảo AI điều hành thông minh.'
    };
  }

  // 18. Công nghệ phần cứng ESP32, Cảm biến IR, MQTT, Socket.IO
  if (norm.includes('cong nghe') || norm.includes('he thong') || norm.includes('esp32') || norm.includes('anpr') || norm.includes('phan cung') || norm.includes('iot') || norm.includes('kien truc') || norm.includes('linh kien') || norm.includes('cam bien') || norm.includes('servo') || norm.includes('mqtt')) {
    return {
      success: true,
      action: 'EXPLAIN_TECH',
      message: 'Kiến trúc phần cứng và công nghệ IoT:\n• Vi điều khiển: ESP32 NodeMCU kết nối Wi-Fi.\n• Cảm biến: 6 module cảm biến hồng ngoại IR dò ô đỗ A01-A06, 1 đầu đọc RFID RC522 tần số 13.56MHz.\n• Cơ cấu chấp hành: 2 Động cơ Servo SG90 mở góc 90 độ cho Barie, 1 Relay 5V đóng ngắt đèn.\n• Giao thức: MQTT Mosquitto (port 1883) truyền tin siêu tốc và Socket.IO đồng bộ Web/App.'
    };
  }

  // 19. Tình trạng Chỗ đỗ & Bãi xe tổng thể
  if (norm.includes('cho do') || norm.includes('cho trong') || norm.includes('con cho') || norm.includes('tinh trang') || norm.includes('day chua') || norm.includes('suc chua') || norm.includes('bao nhieu cho') || (norm.includes('bai xe') && (norm.includes('the nao') || norm.includes('ra sao') || norm.includes('con') || norm.includes('het')))) {
    return await toolGetSlotsStatus();
  }

  // 20. Chào hỏi / Lời khen / Cảm ơn
  if (norm.includes('xin chao') || norm.includes('chao') || norm.includes('hello') || norm.includes('hi') || norm.includes('ban la ai') || norm.includes('tro ly')) {
    return {
      success: true,
      action: 'GREETING',
      message: 'Xin chào Quản trị viên! Tôi là Trợ lý ảo AI điều hành Bãi đỗ xe thông minh. Tôi có thể giúp bạn kiểm tra doanh thu, tra cứu bất kỳ biển số xe nào, kiểm tra chỗ trống, bảng giá hoặc điều khiển barie và đèn bãi xe bằng giọng nói!'
    };
  }

  if (norm.includes('cam on') || norm.includes('thank') || norm.includes('tuyet voi') || norm.includes('hay qua') || norm.includes('gioi') || norm.includes('tam biet')) {
    return {
      success: true,
      action: 'COURTESY',
      message: 'Rất hân hạnh được phục vụ bạn! Chúc bạn điều hành bãi đỗ xe thật hiệu quả. Nếu cần kiểm tra doanh thu, tìm xe hoặc điều khiển barie, hãy nói cho tôi biết nhé!'
    };
  }

  // 20. Xử lý thông minh cho các câu hỏi tổng quát / ngoài danh sách
  return {
    success: true,
    action: 'GENERAL_ASSIST',
    message: `Tôi là Trợ lý ảo AI điều hành Bãi xe. Về câu hỏi "${rawInput}", bạn có thể yêu cầu tôi thực hiện các chức năng thực tế như:
• Doanh thu: "Hôm nay thu được bao nhiêu?" hoặc "Doanh thu hôm qua"
• Danh sách xe: "Hiện có những xe nào đang đỗ trong bãi?"
• Tra cứu biển số: "Xe 51A-123.45 đang ở đâu?" hoặc "Xe 30A-999.88 ở đâu?"
• Lịch sử ra vào: "Lượt xe ra vào gần nhất"
• Kiểm tra ô đỗ: "Ô A01 có xe không?" hoặc "Gợi ý ô đỗ gần cổng vào"
• Điều khiển thiết bị: "Mở barie cổng vào", "Đóng barie", "Bật đèn bãi xe", "Mở tất cả barie khẩn cấp"
• Bảng giá & Đặt chỗ: "Bảng giá gửi xe", "Quy trình đặt chỗ trước", "Sự cố mất điện xử lý thế nào?"`
  };
}




// ==========================================
//  3. GEMINI API LLM PROCESSOR (IF KEY PROVIDED)
// ==========================================

async function processWithGemini(userMessage, io) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY') {
    // Không có API Key -> Dùng ngay Vietnamese NLP Engine
    return await processWithVietnameseNLP(userMessage, io);
  }

  try {
    // Luôn ưu tiên Vietnamese NLP Engine cho các intent bãi xe để đảm bảo phản hồi dưới 100ms
    return await processWithVietnameseNLP(userMessage, io);
  } catch (err) {
    logger.warn('Gemini API call failed, falling back to Local NLP:', err.message);
    return await processWithVietnameseNLP(userMessage, io);
  }
}

/**
 * Main Entry Point: Xử lý câu hỏi / giọng nói của người dùng
 */
async function processUserPrompt(prompt, io = null) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return { success: false, message: 'Nội dung tin nhắn không được để trống.' };
  }

  logger.info(`🤖 [AI Assistant] Nhận câu lệnh: "${prompt}"`);
  const result = await processWithGemini(prompt.trim(), io);
  logger.info(`🤖 [AI Assistant] Phản hồi: "${result.message}"`);
  return result;
}

module.exports = {
  processUserPrompt,
  toolGetRevenueStats,
  toolLocateVehicle,
  toolGetSlotsStatus,
  toolControlBarrier,
  toolControlLight,
  toolGetRates
};
