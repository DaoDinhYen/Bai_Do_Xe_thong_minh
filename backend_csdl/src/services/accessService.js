/**
 * Access Service
 * Core RFID + ANPR verification logic for gate IN/OUT
 */
const RfidModel = require('../models/rfidModel');
const VehicleModel = require('../models/vehicleModel');
const BookingModel = require('../models/bookingModel');
const ParkingSlotModel = require('../models/parkingSlotModel');
const ParkingHistoryModel = require('../models/parkingHistoryModel');
const CameraModel = require('../models/cameraModel');
const NotificationModel = require('../models/notificationModel');
const SystemLogModel = require('../models/systemLogModel');
const { publishOpenGate } = require('../mqtt/mqttPublisher');
const { emitToRoom, emitSlotUpdate } = require('../socket/socketHandler');
const { calculateFeeFromTimes } = require('./feeCalculator');
const { handleParkingCheckout } = require('./paymentService');
const { platesMatch } = require('../utils/plateNormalizer');
const logger = require('../utils/logger');

const UserModel = require('../models/userModel');
const { generateSessionFolderName, extractFolderName } = require('../utils/folderHelper');
const fs = require('fs');
const path = require('path');
const CAPTURE_DIR = path.join(__dirname, '../../../anpr-service/captures');
const TIME_WINDOW_SECONDS = parseInt(process.env.ANPR_TIME_WINDOW_SECONDS) || 60;

function normalizeImageUrl(imgPath) {
  if (!imgPath) return null;
  if (imgPath.startsWith('http://') || imgPath.startsWith('https://') || imgPath.startsWith('/')) {
    return imgPath;
  }
  return `/captures/${path.basename(imgPath)}`;
}

function syncCaptureFile(sourceImgPath, targetDir, targetFilename) {
  if (!sourceImgPath) return;
  try {
    const relPart = sourceImgPath.replace(/^\/?captures\/?/, '');
    const sourceFull = path.join(CAPTURE_DIR, relPart);
    const targetFull = path.join(targetDir, targetFilename);

    if (fs.existsSync(sourceFull) && !fs.existsSync(targetFull)) {
      fs.copyFileSync(sourceFull, targetFull);
      logger.info(`📸 [Sync Capture] Đã sao chép ảnh từ ${sourceFull} -> ${targetFull}`);
    }
  } catch (err) {
    logger.warn('Lỗi khi sao chép ảnh đối chiếu:', err.message);
  }
}

// Pending RFID scans awaiting camera detection (key: 'IN' or 'OUT')
const pendingRfidScans = {
  IN: null,
  OUT: null
};

/**
 * Called when RFID is scanned at gate
 * Pairs with recent camera detection or buffers pending scan
 */
async function handleRfidScan(rfidUid, direction, io) {
  // Get RFID card info
  const rfidCard = await RfidModel.findByUid(rfidUid);
  if (!rfidCard || rfidCard.status !== 'ACTIVE') {
    await handleInvalidRfid(rfidUid, direction, io, rfidCard ? 'RFID_BLOCKED' : 'RFID_NOT_FOUND');
    return { authorized: false, reason: rfidCard ? 'RFID_BLOCKED' : 'RFID_NOT_FOUND' };
  }

  const vehicle = await VehicleModel.findById(rfidCard.vehicle_id);
  if (!vehicle || vehicle.status !== 'ACTIVE') {
    const msg = `Thẻ RFID ${rfidUid} chưa được gán cho phương tiện hợp lệ hoặc xe bị khóa.`;
    logger.warn(`[Access Denied] ${msg}`);
    await handleInvalidRfid(rfidUid, direction, io, 'VEHICLE_NOT_FOUND');
    return { authorized: false, reason: 'VEHICLE_NOT_FOUND' };
  }

  // 1. Check for specific matching detection for this vehicle's plate
  let recentDetection = await CameraModel.findMatchingDetection(direction, vehicle.plate_number, TIME_WINDOW_SECONDS);

  // 2. Fallback: check recent unconsumed detection (status = PENDING)
  if (!recentDetection) {
    recentDetection = await CameraModel.getRecentUnconsumedDetection(direction, TIME_WINDOW_SECONDS);
  }

  // 3. Fallback: any recent detection within time window
  if (!recentDetection) {
    recentDetection = await CameraModel.getRecentDetection(direction, TIME_WINDOW_SECONDS);
  }

  // If still no detection: buffer the scan for 6 seconds awaiting camera
  if (!recentDetection) {
    logger.info(`[Handshake Buffer] Thẻ RFID ${rfidUid} (${vehicle.plate_number}) quẹt trước — đang chờ nhận diện Camera ${direction}...`);
    
    // Clear previous timeout if any
    if (pendingRfidScans[direction]?.timeout) {
      clearTimeout(pendingRfidScans[direction].timeout);
    }

    const timeout = setTimeout(async () => {
      if (pendingRfidScans[direction]?.rfidCard?.uid === rfidUid) {
        logger.warn(`[Handshake Timeout] Hết thời gian chờ Camera ${direction} cho thẻ ${rfidUid} (${vehicle.plate_number})`);
        pendingRfidScans[direction] = null;
        
        const msg = `Chưa phát hiện biển số xe từ Camera Cổng ${direction}. Vui lòng dừng xe trước camera rồi quẹt thẻ lại.`;
        if (io) {
          io.emit('rfid_event', {
            rfid_uid: rfidUid,
            direction,
            status: 'NO_CAMERA_DETECTION',
            message: msg
          });
        }
        emitToRoom('admin', 'access_denied', {
          reason: 'NO_CAMERA_DETECTION',
          rfid_uid: rfidUid,
          direction,
          registered_plate: vehicle.plate_number,
          message: msg,
          timestamp: new Date().toISOString()
        });
      }
    }, 6000);

    pendingRfidScans[direction] = {
      rfidCard,
      vehicle,
      timestamp: Date.now(),
      timeout,
      io
    };

    if (io) {
      io.emit('rfid_event', {
        rfid_uid: rfidUid,
        direction,
        status: 'WAITING_CAMERA',
        registered_plate: vehicle.plate_number,
        message: `Đã quẹt thẻ xe ${vehicle.plate_number}, đang chờ nhận diện biển số...`
      });
    }

    return { authorized: false, pending: true, reason: 'WAITING_CAMERA' };
  }

  // Clear any pending scan for this direction if we found a detection
  if (pendingRfidScans[direction]?.timeout) {
    clearTimeout(pendingRfidScans[direction].timeout);
  }
  pendingRfidScans[direction] = null;

  // Verify RFID + plate match
  return verifyAccess({
    rfidCard,
    cameraRecord: recentDetection,
    direction,
    io
  });
}

/**
 * Called when Camera detects a plate
 * Checks if a pending RFID scan is waiting for this plate/direction
 */
async function checkPendingRfidMatch(cameraRecord, io) {
  const direction = cameraRecord.direction || 'IN';
  const pending = pendingRfidScans[direction];
  if (!pending) return null;

  // Check if plate matches pending scan's vehicle
  const plateMatch = platesMatch(pending.vehicle.plate_number, cameraRecord.plate_number);
  if (plateMatch) {
    logger.info(`🎯 [Handshake Auto-Match] Tự động kích hoạt mở cổng ${direction} cho xe ${pending.vehicle.plate_number} (Thẻ ${pending.rfidCard.uid})!`);
    
    if (pending.timeout) clearTimeout(pending.timeout);
    pendingRfidScans[direction] = null;

    return verifyAccess({
      rfidCard: pending.rfidCard,
      cameraRecord,
      direction,
      io: io || pending.io
    });
  }
  return null;
}

/**
 * Full verification: RFID + camera plate
 */
async function verifyAccess({ rfidCard, cameraRecord, direction, io }) {
  const rfidUid = rfidCard.uid;
  const vehicle = await VehicleModel.findById(rfidCard.vehicle_id);

  // Check plate match
  const plateMatch = platesMatch(vehicle?.plate_number, cameraRecord?.plate_number);

  if (!plateMatch) {
    // MISMATCH — KHÔNG MỞ CỔNG!
    await CameraModel.updateRecordVerification(cameraRecord.id, {
      user_id: rfidCard.user_id,
      vehicle_id: rfidCard.vehicle_id,
      rfid_uid: rfidUid,
      verification_status: 'MISMATCH'
    });

    const msg = `Cảnh báo: Biển số camera (${cameraRecord.plate_number}) không khớp với thẻ RFID (${vehicle?.plate_number || 'N/A'})`;
    logger.warn(`[Access Denied] ${msg}`);
    await NotificationModel.createForAdmins('Cảnh báo: RFID và biển số không khớp', msg, 'ALERT');
    await SystemLogModel.create({ action: SystemLogModel.ACTIONS.ALERT, description: msg });

    emitToRoom('admin', 'access_denied', {
      reason: 'PLATE_RFID_MISMATCH',
      rfid_uid: rfidUid,
      detected_plate: cameraRecord.plate_number,
      registered_plate: vehicle?.plate_number,
      direction,
      message: msg,
      timestamp: new Date().toISOString()
    });
    if (io) io.emit('rfid_event', { rfid_uid: rfidUid, direction, status: 'MISMATCH', message: msg });
    return { authorized: false, reason: 'PLATE_RFID_MISMATCH' };
  }

  // Proceed with direction-specific logic
  if (direction === 'IN') {
    return handleVehicleEntry({ rfidCard, vehicle, cameraRecord, io });
  } else {
    return handleVehicleExit({ rfidCard, vehicle, cameraRecord, io });
  }
}

/**
 * Vehicle entry logic (direction = IN)
 */
async function handleVehicleEntry({ rfidCard, vehicle, cameraRecord, io }) {
  // Find active booking for this vehicle
  const booking = await BookingModel.findActiveByVehicle(vehicle.id);

  let slot = null;
  if (booking) {
    slot = await ParkingSlotModel.findById(booking.slot_id);
    if (slot.status === 'OCCUPIED') {
      const msg = `Chỗ ${slot.slot_code} đã bị xe khác chiếm. Booking #${booking.id}`;
      await NotificationModel.createForAdmins('Xung đột chỗ đỗ', msg, 'ALERT');
      return { authorized: false, reason: 'SLOT_OCCUPIED' };
    }
  } else {
    // Walk-in: check if allowed
    const walkInAllowed = (process.env.WALK_IN_ALLOWED || 'true') === 'true';
    if (!walkInAllowed) return { authorized: false, reason: 'NO_BOOKING' };

    const availableSlots = await ParkingSlotModel.getAvailable();
    if (!availableSlots.length) return { authorized: false, reason: 'NO_SLOT_AVAILABLE' };
    slot = availableSlots[0];
  }

  let entryImage = normalizeImageUrl(cameraRecord?.image_path);
  let folderName = extractFolderName(entryImage);
  if (!folderName) {
    const user = rfidCard.user_id ? await UserModel.findById(rfidCard.user_id) : null;
    folderName = generateSessionFolderName({ userName: user?.name, plateNumber: vehicle.plate_number });
    entryImage = `/captures/${folderName}/anh_vao.jpg`;
  }

  try {
    const sessionDir = path.join(CAPTURE_DIR, folderName);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    syncCaptureFile(cameraRecord?.image_path, sessionDir, 'anh_vao.jpg');
  } catch (dirErr) {
    logger.error('Failed to create session folder:', dirErr.message);
  }

  // Create parking history entry with entry image
  const historyResult = await ParkingHistoryModel.createEntry({
    user_id: rfidCard.user_id,
    vehicle_id: vehicle.id,
    slot_id: slot.id,
    rfid_uid: rfidCard.uid,
    booking_id: booking?.id,
    entry_image: entryImage
  });

  // Open gate with details for ESP32 OLED
  publishOpenGate('IN', {
    plate: vehicle.plate_number,
    user: rfidCard.owner_name || vehicle.owner_name,
    slot_code: slot.slot_code
  });

  // Update booking to ACTIVE
  if (booking) await BookingModel.updateStatus(booking.id, 'ACTIVE');

  // Update camera record
  if (cameraRecord) {
    await CameraModel.updateRecordVerification(cameraRecord.id, {
      user_id: rfidCard.user_id,
      vehicle_id: vehicle.id,
      rfid_uid: rfidCard.uid,
      verification_status: 'ACCEPTED'
    });
  }

  await SystemLogModel.create({
    user_id: rfidCard.user_id,
    action: SystemLogModel.ACTIONS.VEHICLE_ENTRY,
    description: `Vehicle ${vehicle.plate_number} entered, slot ${slot.slot_code}`
  });

  await NotificationModel.create({
    user_id: rfidCard.user_id,
    title: 'Xe đã vào bãi',
    message: `Xe ${vehicle.plate_number} đã vào chỗ ${slot.slot_code}.`,
    type: 'SUCCESS'
  });

  if (io) {
    io.emit('rfid_event', { rfid_uid: rfidCard.uid, direction: 'IN', status: 'ACCEPTED', slot_code: slot.slot_code });
    emitToRoom('admin', 'access_granted', {
      direction: 'IN', vehicle: vehicle.plate_number, slot: slot.slot_code,
      user: rfidCard.owner_name, timestamp: new Date().toISOString()
    });
  }

  return { authorized: true, command: 'OPEN_GATE_IN', slot_code: slot.slot_code };
}

/**
 * Vehicle exit logic (direction = OUT)
 */
async function handleVehicleExit({ rfidCard, vehicle, cameraRecord, io }) {
  // Find active parking session
  const history = await ParkingHistoryModel.findActiveByVehicle(vehicle.id);
  if (!history) return { authorized: false, reason: 'NO_ACTIVE_SESSION' };

  const exitTime = new Date();
  const entryTime = new Date(history.entry_time);
  const durationMinutes = Math.round((exitTime - entryTime) / 60000);

  // Calculate fee
  const feeInfo = await calculateFeeFromTimes(entryTime, exitTime, vehicle.vehicle_type);

  // Handle payment difference vs what was pre-paid
  const booking = history.booking_id ? await BookingModel.findById(history.booking_id) : null;
  const paidFee = booking ? parseFloat(booking.total_price) : 0;

  let paymentResult = { action: 'NONE', amount: 0 };
  try {
    paymentResult = await handleParkingCheckout({
      userId: rfidCard.user_id,
      actualFee: feeInfo.fee,
      paidFee,
      historyId: history.id,
      vehicleId: vehicle.id
    });
  } catch (payErr) {
    // Insufficient balance — still let out but log
    await NotificationModel.create({ user_id: rfidCard.user_id, title: 'Lỗi thanh toán', message: payErr.message, type: 'ERROR' });
  }

  let folderName = extractFolderName(history.entry_image);
  if (!folderName) {
    folderName = extractFolderName(cameraRecord?.image_path);
  }
  if (!folderName) {
    const user = rfidCard.user_id ? await UserModel.findById(rfidCard.user_id) : null;
    folderName = generateSessionFolderName({ userName: user?.name, plateNumber: vehicle.plate_number });
  }

  const exitImage = `/captures/${folderName}/anh_ra.jpg`;

  try {
    const sessionDir = path.join(CAPTURE_DIR, folderName);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    syncCaptureFile(cameraRecord?.image_path, sessionDir, 'anh_ra.jpg');
  } catch (dirErr) {
    logger.error('Failed to create session folder:', dirErr.message);
  }

  // Record exit with exit image
  await ParkingHistoryModel.recordExit(history.id, {
    exit_time: exitTime,
    duration: durationMinutes,
    fee: feeInfo.fee,
    payment_status: 'PAID',
    exit_image: exitImage
  });

  // Free slot
  const slot = await ParkingSlotModel.findById(history.slot_id);
  await ParkingSlotModel.updateStatus(history.slot_id, 'FREE');
  emitSlotUpdate({ slot_code: slot?.slot_code, slot_id: history.slot_id, new_status: 'FREE', timestamp: exitTime.toISOString() });

  // Complete booking
  if (booking) await BookingModel.updateStatus(booking.id, 'COMPLETED');

  // Update camera record
  if (cameraRecord) {
    await CameraModel.updateRecordVerification(cameraRecord.id, {
      user_id: rfidCard.user_id, vehicle_id: vehicle.id, rfid_uid: rfidCard.uid, verification_status: 'ACCEPTED'
    });
  }

  // Open gate with details for ESP32 OLED
  publishOpenGate('OUT', {
    plate: vehicle.plate_number,
    user: rfidCard.owner_name || vehicle.owner_name,
    slot_code: slot?.slot_code || null,
    fee: feeInfo.fee
  });

  await SystemLogModel.create({
    user_id: rfidCard.user_id,
    action: SystemLogModel.ACTIONS.VEHICLE_EXIT,
    description: `Vehicle ${vehicle.plate_number} exited. Fee: ${feeInfo.fee}`
  });

  await NotificationModel.create({
    user_id: rfidCard.user_id,
    title: 'Xe đã ra khỏi bãi',
    message: `Xe ${vehicle.plate_number} đã ra. Phí: ${feeInfo.fee.toLocaleString('vi-VN')} VNĐ.`,
    type: 'INFO'
  });

  if (io) {
    io.emit('rfid_event', { rfid_uid: rfidCard.uid, direction: 'OUT', status: 'ACCEPTED' });
    emitToRoom('admin', 'access_granted', {
      direction: 'OUT',
      vehicle: vehicle.plate_number,
      slot: history.slot_code || null,
      user: rfidCard.owner_name,
      fee: feeInfo.fee,
      timestamp: new Date().toISOString()
    });
  }

  return { authorized: true, command: 'OPEN_GATE_OUT', fee: feeInfo.fee, payment: paymentResult };
}

async function handleInvalidRfid(rfidUid, direction, io, reason) {
  const msg = `RFID không hợp lệ tại cổng ${direction}: ${rfidUid} (${reason})`;
  await NotificationModel.createForAdmins('Cảnh báo: RFID không hợp lệ', msg, 'ALERT');
  await SystemLogModel.create({ action: SystemLogModel.ACTIONS.RFID_INVALID, description: msg });
  if (io) io.emit('rfid_event', { rfid_uid: rfidUid, direction, status: reason });
}

module.exports = { handleRfidScan, verifyAccess, handleVehicleEntry, handleVehicleExit, checkPendingRfidMatch };
