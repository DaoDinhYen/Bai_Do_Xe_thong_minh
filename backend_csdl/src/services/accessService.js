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

const TIME_WINDOW_SECONDS = parseInt(process.env.ANPR_TIME_WINDOW_SECONDS) || 30;

/**
 * Called when RFID is scanned at gate
 * Will attempt to pair with recent camera detection within time window
 */
async function handleRfidScan(rfidUid, direction, io) {
  // Get RFID card info
  const rfidCard = await RfidModel.findByUid(rfidUid);
  if (!rfidCard || rfidCard.status !== 'ACTIVE') {
    await handleInvalidRfid(rfidUid, direction, io, rfidCard ? 'RFID_BLOCKED' : 'RFID_NOT_FOUND');
    return;
  }

  // Get recent camera detection
  const recentDetection = await CameraModel.getRecentDetection(direction, TIME_WINDOW_SECONDS);

  if (!recentDetection) {
    // No camera detection — RFID only (no plate to verify)
    await handleRfidOnly(rfidCard, direction, io);
    return;
  }

  // Verify RFID + plate match
  await verifyAccess({
    rfidCard,
    cameraRecord: recentDetection,
    direction,
    io
  });
}

/**
 * Full verification: RFID + camera plate
 */
async function verifyAccess({ rfidCard, cameraRecord, direction, io }) {
  const rfidUid = rfidCard.uid;
  const vehicle = await VehicleModel.findById(rfidCard.vehicle_id);

  // Check plate match
  const plateMatch = platesMatch(vehicle?.plate_number, cameraRecord?.plate_number);
  const confidence = cameraRecord?.confidence || 0;
  const confidenceOk = confidence >= parseFloat(process.env.ANPR_CONFIDENCE_THRESHOLD || 0.7);

  if (!plateMatch && confidenceOk) {
    // MISMATCH
    await CameraModel.updateRecordVerification(cameraRecord.id, {
      user_id: rfidCard.user_id,
      vehicle_id: rfidCard.vehicle_id,
      rfid_uid: rfidUid,
      verification_status: 'MISMATCH'
    });

    const msg = `RFID và biển số không khớp. RFID → ${vehicle?.plate_number}, Camera → ${cameraRecord.plate_number}`;
    await NotificationModel.createForAdmins('Cảnh báo: RFID và biển số không khớp', msg, 'ALERT');
    await SystemLogModel.create({ action: SystemLogModel.ACTIONS.ALERT, description: msg });

    emitToRoom('admin', 'access_denied', {
      reason: 'PLATE_RFID_MISMATCH',
      rfid_uid: rfidUid,
      detected_plate: cameraRecord.plate_number,
      registered_plate: vehicle?.plate_number,
      direction,
      timestamp: new Date().toISOString()
    });
    if (io) io.emit('rfid_event', { rfid_uid: rfidUid, direction, status: 'MISMATCH' });
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

  // Open gate
  publishOpenGate('IN');

  // Create parking history entry
  const historyResult = await ParkingHistoryModel.createEntry({
    user_id: rfidCard.user_id,
    vehicle_id: vehicle.id,
    slot_id: slot.id,
    rfid_uid: rfidCard.uid,
    booking_id: booking?.id
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

  // Record exit
  await ParkingHistoryModel.recordExit(history.id, {
    exit_time: exitTime,
    duration: durationMinutes,
    fee: feeInfo.fee,
    payment_status: 'PAID'
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

  publishOpenGate('OUT');

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
  }

  return { authorized: true, command: 'OPEN_GATE_OUT', fee: feeInfo.fee, payment: paymentResult };
}

async function handleInvalidRfid(rfidUid, direction, io, reason) {
  const msg = `RFID không hợp lệ tại cổng ${direction}: ${rfidUid} (${reason})`;
  await NotificationModel.createForAdmins('Cảnh báo: RFID không hợp lệ', msg, 'ALERT');
  await SystemLogModel.create({ action: SystemLogModel.ACTIONS.RFID_INVALID, description: msg });
  if (io) io.emit('rfid_event', { rfid_uid: rfidUid, direction, status: reason });
}

async function handleRfidOnly(rfidCard, direction, io) {
  // No camera — proceed with RFID-only (lower security mode if configured)
  if (direction === 'IN') {
    return handleVehicleEntry({ rfidCard, vehicle: await VehicleModel.findById(rfidCard.vehicle_id), cameraRecord: null, io });
  } else {
    return handleVehicleExit({ rfidCard, vehicle: await VehicleModel.findById(rfidCard.vehicle_id), cameraRecord: null, io });
  }
}

module.exports = { handleRfidScan, verifyAccess, handleVehicleEntry, handleVehicleExit };
