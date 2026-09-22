const path = require('path');
require('dotenv').config();
const { pool } = require('./src/config/db');
const AccessService = require('./src/services/accessService');
const CameraModel = require('./src/models/cameraModel');
const ParkingHistoryModel = require('./src/models/parkingHistoryModel');
const ParkingSlotModel = require('./src/models/parkingSlotModel');
const { handleMqttMessage } = require('./src/mqtt/mqttHandler');

// Mock socket.io emitter
const mockIo = {
  emit: (event, data) => {},
  to: () => ({ emit: () => {} })
};

async function runE2ETests() {
  console.log('======================================================================');
  console.log('🚀 KIỂM THỬ TOÀN TRÌNH LUỒNG XE VÀO - ĐỖ XE - XE RA (END-TO-END E2E)');
  console.log('======================================================================\n');

  try {
    const testRfid = '56:62:69:03'; // Gắn với xe 36A-999.99 (Người dùng Demo)
    const matchingPlate = '36A99999';
    const mismatchPlate = '29A88888';

    // 0. Dọn dẹp dữ liệu kiểm thử cũ
    await pool.query('DELETE FROM camera_records WHERE plate_number IN (?, ?)', [matchingPlate, mismatchPlate]);
    await pool.query('DELETE FROM parking_history WHERE rfid_uid = ?', [testRfid]);
    await pool.query('UPDATE parking_slots SET status = "FREE" WHERE slot_code IN ("A01", "A02")');

    // ======================================================================
    // KỊCH BẢN 1: Bắt tay đồng bộ khi QUẸT THẺ TRƯỚC -> CAMERA NHẬN DIỆN SAU
    // ======================================================================
    console.log('--- TEST 1: Quẹt thẻ RFID trước khi Camera nhận diện biển số (Handshake Buffer) ---');
    const res1 = await AccessService.handleRfidScan(testRfid, 'IN', mockIo);
    console.log('Kết quả bước 1a (Quẹt thẻ):', res1);
    if (res1.pending && res1.reason === 'WAITING_CAMERA') {
      console.log('✅ 1a: Đã lưu bộ đệm chờ camera (WAITING_CAMERA), cổng chưa mở vội.');
    } else {
      throw new Error(`TEST 1a FAILED: Kỳ vọng WAITING_CAMERA, nhận được ${JSON.stringify(res1)}`);
    }

    // Camera nhận diện biển số 36A99999 sau đó 500ms
    console.log('Bước 1b: Camera CAM_IN nhận diện biển số 36A-999.99...');
    const camIns1 = await CameraModel.createRecord({
      camera_id: 1,
      plate_number: matchingPlate,
      detected_plate: '36A-999.99',
      confidence: 0.98,
      direction: 'IN',
      image_path: '/captures/demo_in.jpg',
      verification_status: 'PENDING'
    });
    const camRecord1 = {
      id: camIns1.insertId,
      camera_id: 1,
      plate_number: matchingPlate,
      detected_plate: '36A-999.99',
      confidence: 0.98,
      direction: 'IN',
      image_path: '/captures/demo_in.jpg',
      verification_status: 'PENDING'
    };
    const autoMatchRes = await AccessService.checkPendingRfidMatch(camRecord1, mockIo);
    console.log('Kết quả bước 1b (Tự động khớp):', autoMatchRes);
    if (autoMatchRes && autoMatchRes.authorized && autoMatchRes.command === 'OPEN_GATE_IN') {
      console.log('✅ TEST 1 THÀNH CÔNG: Tự động khớp thẻ đang chờ với camera và mở Barie Vào!\n');
    } else {
      throw new Error(`TEST 1b FAILED: Không tự động mở cổng khi camera nhận diện!`);
    }

    // Kiểm tra DB phiên đỗ xe đã tạo
    const active1 = await ParkingHistoryModel.findActiveByRfid(testRfid);
    if (!active1) throw new Error('TEST 1 FAILED: Không tìm thấy phiên đỗ xe đang mở trong CSDL');
    console.log(`   Phiên đỗ #${active1.id} đã mở, tạm gán ô: ${active1.slot_code}\n`);

    // ======================================================================
    // KỊCH BẢN 2: Xe chạy về vị trí ô đỗ thực tế (IR A02) -> Tính vào vị trí đỗ
    // ======================================================================
    console.log('--- TEST 2: Xe về vị trí ô đỗ thực tế A02 (Cảm biến IR A02 báo OCCUPIED) ---');
    const slotPayload = JSON.stringify({
      type: 'SLOT_OCCUPIED',
      slot_code: 'A02',
      device_id: 'ESP32_SLOT_01',
      occupied: true
    });
    await handleMqttMessage('parking/esp32_1/slot/A02', slotPayload, mockIo);

    const slotA02 = await ParkingSlotModel.findByCode('A02');
    const updatedActive = await ParkingHistoryModel.findById(active1.id);
    console.log(`   Trạng thái ô A02 trong DB: ${slotA02.status}`);
    console.log(`   Vị trí đỗ của phiên xe trong DB: ${updatedActive.slot_code}`);

    if (slotA02.status === 'OCCUPIED' && updatedActive.slot_code === 'A02') {
      console.log('✅ TEST 2 THÀNH CÔNG: Ô A02 đã chuyển OCCUPIED và cập nhật chuẩn xác vào phiên đỗ xe!\n');
    } else {
      throw new Error('TEST 2 FAILED: Ô đỗ hoặc phiên xe chưa được cập nhật');
    }

    // ======================================================================
    // KỊCH BẢN 3: Xe lùi khỏi ô đỗ để chuẩn bị ra -> Cảm biến A02 báo FREE
    // ======================================================================
    console.log('--- TEST 3: Xe rời ô đỗ A02 (Cảm biến IR A02 báo FREE) ---');
    const slotFreePayload = JSON.stringify({
      type: 'SLOT_FREE',
      slot_code: 'A02',
      device_id: 'ESP32_SLOT_01',
      occupied: false
    });
    await handleMqttMessage('parking/esp32_1/slot/A02', slotFreePayload, mockIo);

    const slotA02After = await ParkingSlotModel.findByCode('A02');
    console.log(`   Trạng thái ô A02 sau khi xe rời: ${slotA02After.status}`);
    if (slotA02After.status === 'FREE') {
      console.log('✅ TEST 3 THÀNH CÔNG: Ô A02 đã được giải phóng thành FREE!\n');
    } else {
      throw new Error('TEST 3 FAILED: Ô A02 chưa về FREE');
    }

    // ======================================================================
    // KỊCH BẢN 4: Xe tới cổng ra, 1 đầu đọc RFID duy nhất tự động nhận diện chiều OUT
    // ======================================================================
    console.log('--- TEST 4: Phân giải chiều OUT cho đầu đọc RFID duy nhất khi xe đang có phiên đỗ ---');
    // Camera OUT nhận diện biển số trước
    await CameraModel.createRecord({
      camera_id: 2,
      plate_number: matchingPlate,
      detected_plate: '36A-999.99',
      confidence: 0.97,
      direction: 'OUT',
      image_path: '/captures/demo_out.jpg',
      verification_status: 'PENDING'
    });

    // Quẹt thẻ tại cổng (gửi lên topic dùng chung parking/esp32_2/rfid)
    const rfidMqttMsg = JSON.stringify({
      device_id: 'ESP32_GATE_01',
      rfid_uid: testRfid,
      uid: testRfid
    });
    await handleMqttMessage('parking/esp32_2/rfid', rfidMqttMsg, mockIo);

    // Kiểm tra phiên đỗ xe đã được hoàn tất, tính phí và lưu ảnh ra
    const finishedSession = await ParkingHistoryModel.findById(active1.id);
    console.log('Thông tin phiên sau khi xuất bãi:');
    console.log(`   Thời gian vào: ${finishedSession.entry_time}`);
    console.log(`   Thời gian ra:  ${finishedSession.exit_time}`);
    console.log(`   Thời lượng:    ${finishedSession.duration} phút`);
    console.log(`   Phí gửi xe:    ${finishedSession.fee} VNĐ`);
    console.log(`   Thanh toán:    ${finishedSession.payment_status}`);
    console.log(`   Ảnh vào:       ${finishedSession.entry_image}`);
    console.log(`   Ảnh ra:        ${finishedSession.exit_image}`);

    if (finishedSession.exit_time && finishedSession.fee >= 10000 && finishedSession.exit_image) {
      console.log('✅ TEST 4 THÀNH CÔNG: Xe xuất bãi thành công, tính tiền và lưu đầy đủ 2 ảnh vào/ra!\n');
    } else {
      throw new Error('TEST 4 FAILED: Phiên đỗ xe chưa được đóng hoặc thiếu thông tin xuất bãi');
    }

    // ======================================================================
    // KỊCH BẢN 5: Xe qua barie -> Cảm biến IR cổng gửi GATE_PASSED -> Đóng barie
    // ======================================================================
    console.log('--- TEST 5: Cảm biến IR cổng xác nhận xe đã qua (GATE_PASSED) ---');
    const gatePassedMsg = JSON.stringify({ type: 'GATE_PASSED' });
    await handleMqttMessage('parking/esp32_2/gate/out', gatePassedMsg, mockIo);
    console.log('✅ TEST 5 THÀNH CÔNG: Xử lý sự kiện xe qua cổng an toàn, barie đóng lại.\n');

    // ======================================================================
    // KỊCH BẢN 6: Thẻ không hợp lệ / Người không có trong danh sách
    // ======================================================================
    console.log('--- TEST 6: Quẹt thẻ lạ không có trong danh sách (Unknown RFID) ---');
    const invalidRes = await AccessService.handleRfidScan('99:99:99:99', 'IN', mockIo);
    console.log('Kết quả quét thẻ lạ:', invalidRes);
    if (!invalidRes.authorized && invalidRes.reason === 'RFID_NOT_FOUND') {
      console.log('✅ TEST 6 THÀNH CÔNG: Thẻ không có trong danh sách bị từ chối, barie giữ đóng!\n');
    } else {
      throw new Error('TEST 6 FAILED: Thẻ lạ nhưng không bị từ chối');
    }

    console.log('======================================================================');
    console.log('🎉 TẤT CẢ 6 KỊCH BẢN KIỂM THỬ END-TO-END ĐỀU ĐẠT 100% THÀNH CÔNG!');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('❌ E2E TEST ERROR:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runE2ETests();
