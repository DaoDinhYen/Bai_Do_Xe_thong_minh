const logger = require('../utils/logger');
const { MQTT_TOPICS, MQTT_MESSAGES } = require('../config/mqtt');
const ParkingSlotModel = require('../models/parkingSlotModel');
const DeviceModel = require('../models/deviceModel');
const SystemLogModel = require('../models/systemLogModel');
const NotificationModel = require('../models/notificationModel');
const CameraModel = require('../models/cameraModel');
const RfidModel = require('../models/rfidModel');
const ParkingHistoryModel = require('../models/parkingHistoryModel');
const AccessService = require('../services/accessService');
const BookingModel = require('../models/bookingModel');
const UserModel = require('../models/userModel');
const VehicleModel = require('../models/vehicleModel');
const { publishAlert } = require('./mqttPublisher');
const { query, queryOne } = require('../config/db');

/**
 * Route incoming MQTT messages to the correct handler
 */
async function handleMqttMessage(topic, message, io) {
  try {
    // Slot sensor: parking/esp32_1/slot/A01
    if (topic.startsWith(MQTT_TOPICS.SLOT_PREFIX)) {
      const slotCode = topic.split('/').pop();
      await handleSlotUpdate(slotCode, message, io);
      return;
    }

    switch (topic) {
      case MQTT_TOPICS.RFID:
        await handleSingleRfidScan(message, io);
        break;
      case MQTT_TOPICS.RFID_IN:
        await handleRfidScan(message, 'IN', io);
        break;
      case MQTT_TOPICS.RFID_OUT:
        await handleRfidScan(message, 'OUT', io);
        break;
      case MQTT_TOPICS.GATE_IN:
        await handleGateStatus(message, 'IN', io);
        break;
      case MQTT_TOPICS.GATE_OUT:
        await handleGateStatus(message, 'OUT', io);
        break;
      case MQTT_TOPICS.LIGHT:
        await handleLightStatus(message, io);
        break;
      case MQTT_TOPICS.DEVICE_STATUS:
        await handleDeviceStatus(message, io);
        break;
      default:
        logger.debug(`Unhandled MQTT topic: ${topic}`);
    }
  } catch (err) {
    logger.error(`MQTT handler error [${topic}]:`, err.message);
  }
}

// Lưu trữ các ô đang bị đỗ sai vị trí trong bộ nhớ:
// { [slotCode]: { slot_id, slot_code, wrong_plate, wrong_driver, booked_user_name, booked_plate, timestamp } }
const conflictSlots = {};

function getConflictSlots() {
  return { ...conflictSlots };
}

// ========================
//  Slot sensor update (Tính vào vị trí đỗ khi xe vào ô & Kiểm tra đỗ nhầm)
// ========================
async function handleSlotUpdate(slotCode, message, io) {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch {
    payload = { type: message.trim() };
  }

  const isOccupied = payload.type === MQTT_MESSAGES.SLOT_OCCUPIED || message.trim() === MQTT_MESSAGES.SLOT_OCCUPIED;

  const slot = await ParkingSlotModel.findByCode(slotCode);
  if (!slot) {
    logger.warn(`MQTT: Unknown slot code: ${slotCode}`);
    return;
  }

  // 1. TRƯỜNG HỢP CÓ XE ĐỖ VÀO Ô (isOccupied = true)
  if (isOccupied) {
    // A. Kiểm tra xem ô này có đang được User khác đặt trước không
    const activeBooking = await BookingModel.findActiveBySlot(slot.id);

    // B. Lấy phiên gửi xe đang hoạt động gần nhất (hệ thống 1 xe vào tại 1 thời điểm)
    const recentSession = await queryOne(`
      SELECT ph.*, v.plate_number, v.id as vehicle_id, u.name as user_name
      FROM parking_history ph
      JOIN vehicles v ON ph.vehicle_id = v.id
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE ph.exit_time IS NULL
      ORDER BY ph.entry_time DESC LIMIT 1
    `);

    // C. Kiểm tra xung đột: Nếu ô đã được đặt trước nhưng xe đỗ vào KHÔNG PHẢI xe đã đặt
    const isConflict = activeBooking && (!recentSession || activeBooking.vehicle_id !== recentSession.vehicle_id);

    if (isConflict) {
      // === PHÁT HIỆN ĐỖ NHẦM Ô ĐÃ ĐẶT TRƯỚC ===
      const wrongPlate = recentSession ? recentSession.plate_number : 'Không rõ';
      const wrongDriver = recentSession?.user_name || 'Khách vãng lai';

      let bookedUser = null;
      let bookedVehicle = null;
      if (activeBooking.user_id) bookedUser = await UserModel.findById(activeBooking.user_id);
      if (activeBooking.vehicle_id) bookedVehicle = await VehicleModel.findById(activeBooking.vehicle_id);

      const bookedUserName = bookedUser?.name || 'Khách đã đặt';
      const bookedPlate = bookedVehicle?.plate_number || 'Xe đã đặt';

      conflictSlots[slotCode] = {
        slot_id: slot.id,
        slot_code: slotCode,
        wrong_plate: wrongPlate,
        wrong_driver: wrongDriver,
        booked_user_name: bookedUserName,
        booked_plate: bookedPlate,
        timestamp: new Date().toISOString()
      };

      logger.warn(`⚠️ [ĐỖ NHẦM Ô] Xe ${wrongPlate} đỗ NHẦM vào ô ${slotCode} (Đã đặt cho: ${bookedUserName} - ${bookedPlate})!`);

      // Cập nhật trạng thái slot trong DB
      await ParkingSlotModel.updateStatusByCode(slotCode, 'OCCUPIED');

      // Thông báo Admin
      await NotificationModel.createForAdmins(
        '⚠️ CẢNH BÁO ĐỖ SAI VỊ TRÍ',
        `Xe ${wrongPlate} (${wrongDriver}) đỗ NHẦM vào ô ${slotCode} (đã đặt trước cho ${bookedUserName} - ${bookedPlate}).`,
        'ALERT'
      );
      await SystemLogModel.create({
        action: SystemLogModel.ACTIONS.ALERT,
        description: `Xe ${wrongPlate} đỗ nhầm vào ô ${slotCode} đã được đặt trước.`
      });

      // Thông báo tài xế đỗ nhầm (nếu có tài khoản)
      if (recentSession?.user_id) {
        await NotificationModel.create({
          user_id: recentSession.user_id,
          title: '⚠️ BẠN ĐÃ ĐỖ SAI VỊ TRÍ!',
          content: `Ô ${slotCode} đã có người đặt trước (${bookedPlate}). Vui lòng di chuyển xe ${wrongPlate} sang vị trí khác!`,
          type: 'ALERT'
        });
      }

      // Phát lệnh cảnh báo MQTT tới ESP32 hiển thị OLED
      publishAlert({
        command: 'ALERT_WRONG_SLOT',
        slot: slotCode,
        plate: wrongPlate,
        message: `DO NHAM! O ${slotCode} DA DAT`
      });

      // Bắn sự kiện Socket.IO để Dashboard hiển thị hiệu ứng nhấp nháy cảnh báo
      io.emit('slot_conflict_detected', {
        slot_code: slotCode,
        slot_id: slot.id,
        wrong_plate: wrongPlate,
        wrong_driver: wrongDriver,
        booked_user_name: bookedUserName,
        booked_plate: bookedPlate,
        message: `Xe ${wrongPlate} đang đỗ NHẦM vào ô ${slotCode} (Đã đặt trước)!`,
        timestamp: new Date().toISOString()
      });

      io.emit('slot_status_changed', {
        slot_code: slotCode,
        slot_id: slot.id,
        old_status: slot.status,
        new_status: 'OCCUPIED',
        is_conflict: true,
        wrong_plate: wrongPlate,
        timestamp: new Date().toISOString()
      });

      // KHÔNG gán slot.id này vào parking_history của xe đỗ nhầm!
    } else {
      // === ĐỖ ĐÚNG Ô (Ô TRỐNG HOẶC ĐÚNG XE ĐÃ ĐẶT) ===
      delete conflictSlots[slotCode];

      await ParkingSlotModel.updateStatusByCode(slotCode, 'OCCUPIED');
      logger.info(`[IR SLOT] Ô ${slotCode}: ${slot.status} → OCCUPIED`);

      if (recentSession) {
        if (recentSession.slot_id !== slot.id) {
          await query('UPDATE parking_history SET slot_id = ? WHERE id = ?', [slot.id, recentSession.id]);
          logger.info(`📍 [Gán vị trí đỗ] Xe ${recentSession.plate_number} đã vào đỗ hợp lệ tại ô: ${slotCode}`);
        }
        io.emit('vehicle_parked', {
          history_id: recentSession.id,
          plate_number: recentSession.plate_number,
          slot_code: slotCode,
          slot_id: slot.id,
          timestamp: new Date().toISOString()
        });
      }

      if (activeBooking && activeBooking.status === 'CONFIRMED') {
        await BookingModel.updateStatus(activeBooking.id, 'ACTIVE');
      }

      io.emit('slot_status_changed', {
        slot_code: slotCode,
        slot_id: slot.id,
        old_status: slot.status,
        new_status: 'OCCUPIED',
        is_conflict: false,
        vehicle_plate: recentSession?.plate_number,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. TRƯỜNG HỢP XE RỜI KHỎI Ô (isOccupied = false)
  else {
    const wasInConflict = !!conflictSlots[slotCode];
    delete conflictSlots[slotCode];

    // Kiểm tra xem ô này có booking đặt trước đang chờ không
    const activeBooking = await BookingModel.findActiveBySlot(slot.id);

    if (wasInConflict || activeBooking) {
      // Xe đỗ nhầm đã rời đi -> chuyển ô về lại màu đặt chỗ (RESERVED) đến khi xe đặt chỗ tới!
      await ParkingSlotModel.updateStatusByCode(slotCode, 'RESERVED');
      logger.info(`🔄 [Khôi phục ô đặt trước] Xe đã rời ô ${slotCode}. Ô chuyển lại màu đặt chỗ: RESERVED`);

      await SystemLogModel.create({
        action: SystemLogModel.ACTIONS.ALERT,
        description: `Xe rời khỏi ô ${slotCode}. Khôi phục trạng thái RESERVED cho khách đặt trước.`
      });

      if (wasInConflict) {
        io.emit('slot_conflict_resolved', {
          slot_code: slotCode,
          slot_id: slot.id,
          new_status: 'RESERVED',
          timestamp: new Date().toISOString()
        });
      }

      io.emit('slot_status_changed', {
        slot_code: slotCode,
        slot_id: slot.id,
        old_status: slot.status,
        new_status: 'RESERVED',
        is_conflict: false,
        timestamp: new Date().toISOString()
      });
    } else {
      // Ô bình thường không có đặt trước -> chuyển về FREE
      await ParkingSlotModel.updateStatusByCode(slotCode, 'FREE');
      logger.info(`[IR SLOT] Ô ${slotCode}: ${slot.status} → FREE`);

      io.emit('slot_status_changed', {
        slot_code: slotCode,
        slot_id: slot.id,
        old_status: slot.status,
        new_status: 'FREE',
        is_conflict: false,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// ========================
//  Single RFID reader (Dùng chung cho cả Cổng Vào và Cổng Ra)
// ========================
async function handleSingleRfidScan(message, io) {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch {
    payload = { uid: message.trim() };
  }

  const rfidUid = payload.uid || payload.rfid_uid;
  if (!rfidUid) return;

  // 1. Phân giải chiều IN hay OUT dựa vào trạng thái thực tế của xe trong bãi:
  let direction = null;
  const rfidCard = await RfidModel.findByUid(rfidUid);

  if (rfidCard && rfidCard.vehicle_id) {
    const activeSession = await ParkingHistoryModel.findActiveByVehicle(rfidCard.vehicle_id);
    // NGUYÊN TẮC VẬT LÝ BẤT BIẾN:
    // - Nếu xe đang có phiên gửi xe chưa thanh toán (đang trong bãi) -> Quẹt thẻ DUY NHẤT để RA (OUT)!
    // - Nếu xe chưa vào bãi (hoặc đã hoàn thành phiên trước) -> Quẹt thẻ DUY NHẤT để VÀO (IN)!
    direction = activeSession ? 'OUT' : 'IN';
    logger.info(`[Single RFID Resolver] Xe ${rfidCard.vehicle_id} (Thẻ ${rfidUid}) có activeSession: ${!!activeSession} -> Chiều: ${direction}`);
  } else {
    // Thẻ chưa đăng ký xe hoặc khách vãng lai: xét theo nhận diện camera gần nhất
    const [recentIn, recentOut] = await Promise.all([
      CameraModel.getRecentDetection('IN', 30),
      CameraModel.getRecentDetection('OUT', 30)
    ]);

    if (recentOut && (!recentIn || new Date(recentOut.captured_at) > new Date(recentIn.captured_at))) {
      direction = 'OUT';
    } else {
      direction = 'IN';
    }
  }

  logger.info(`[Single RFID Resolver] Xác định thẻ ${rfidUid} thuộc cổng: ${direction}`);
  await handleRfidScan(message, direction, io);
}

// ========================
//  RFID scan at gate
// ========================
async function handleRfidScan(message, direction, io) {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch {
    payload = { uid: message.trim() };
  }

  const rfidUid = payload.uid || payload.rfid_uid;
  if (!rfidUid) return;

  logger.info(`RFID ${direction}: ${rfidUid}`);

  await SystemLogModel.create({
    action: SystemLogModel.ACTIONS.RFID_SCAN,
    description: `RFID scanned at gate ${direction}: ${rfidUid}`
  });

  // Emit to admin dashboard
  io.emit('rfid_event', {
    rfid_uid: rfidUid,
    direction,
    timestamp: new Date().toISOString(),
    status: 'DETECTED'
  });

  // Trigger access check with RFID only (plate will be paired separately)
  await AccessService.handleRfidScan(rfidUid, direction, io);
}

// ========================
//  Gate IR sensor (car passed)
// ========================
async function handleGateStatus(message, direction, io) {
  let payload;
  try { payload = JSON.parse(message); } catch { payload = { type: message.trim() }; }

  logger.info(`Gate ${direction} event: ${JSON.stringify(payload)}`);

  io.emit('barrier_status', {
    direction,
    event: payload.type || message.trim(),
    timestamp: new Date().toISOString()
  });

  // If car passed, trigger gate close command
  if (payload.type === MQTT_MESSAGES.GATE_PASSED) {
    const { publishCloseGate } = require('./mqttPublisher');
    await publishCloseGate(direction);
    logger.info(`Auto-close gate ${direction} after car passed`);
  }
}

// ========================
//  Light relay status
// ========================
async function handleLightStatus(message, io) {
  let payload;
  try { payload = JSON.parse(message); } catch { payload = { status: message.trim() }; }

  logger.info(`Light status: ${payload.status}`);
  io.emit('light_status', { status: payload.status, timestamp: new Date().toISOString() });
}

// ========================
//  Device heartbeat
// ========================
async function handleDeviceStatus(message, io) {
  let payload;
  try { payload = JSON.parse(message); } catch {
    logger.warn('Invalid device status payload:', message);
    return;
  }

  let { device_code, status, ip_address, firmware_version } = payload;
  if (!device_code) return;

  // Chuẩn hóa mã thiết bị: ánh xạ giữa tên alias và tên định danh trong CSDL
  if (device_code === 'ESP32_SLOT_01') device_code = 'ESP32_1';
  if (device_code === 'ESP32_GATE_01') device_code = 'ESP32_2';

  await DeviceModel.updateStatusByCode(device_code, status || 'ONLINE', { ip_address, firmware_version });

  const device = await DeviceModel.findByCode(device_code);

  io.emit('device_status', {
    device_code,
    device_id: device?.id,
    status: status || 'ONLINE',
    timestamp: new Date().toISOString()
  });

  await SystemLogModel.create({
    device_id: device?.id,
    action: status === 'ONLINE' ? SystemLogModel.ACTIONS.DEVICE_ONLINE : SystemLogModel.ACTIONS.DEVICE_OFFLINE,
    description: `Device ${device_code} reported status: ${status}`
  });
}

module.exports = { handleMqttMessage, getConflictSlots };
