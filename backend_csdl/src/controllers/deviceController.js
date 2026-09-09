const DeviceModel = require('../models/deviceModel');
const { publishOpenGate, publishCloseGate, publishLightOn, publishLightOff } = require('../mqtt/mqttPublisher');
const SystemLogModel = require('../models/systemLogModel');
const { success, created, badRequest, notFound, paginated } = require('../utils/response');

const deviceController = {
  // GET /api/devices
  async getAllDevices(req, res, next) {
    try {
      const devices = await DeviceModel.getAll();
      return success(res, devices);
    } catch (err) { next(err); }
  },

  // GET /api/devices/:id
  async getDeviceById(req, res, next) {
    try {
      const device = await DeviceModel.findById(req.params.id);
      if (!device) return notFound(res, 'Thiết bị không tồn tại');
      return success(res, device);
    } catch (err) { next(err); }
  },

  // POST /api/admin/devices
  async createDevice(req, res, next) {
    try {
      const { device_code, device_type, name, location, ip_address, firmware_version } = req.body;
      if (!device_code || !device_type || !name) return badRequest(res, 'device_code, device_type, name là bắt buộc');
      const result = await DeviceModel.create({ device_code, device_type, name, location, ip_address, firmware_version });
      const device = await DeviceModel.findById(result.insertId);
      return created(res, device);
    } catch (err) { next(err); }
  },

  // PUT /api/admin/devices/:id
  async updateDevice(req, res, next) {
    try {
      const device = await DeviceModel.findById(req.params.id);
      if (!device) return notFound(res, 'Thiết bị không tồn tại');
      const { name, location, ip_address, firmware_version } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (location) updates.location = location;
      if (ip_address) updates.ip_address = ip_address;
      if (firmware_version) updates.firmware_version = firmware_version;
      await DeviceModel.updateById(req.params.id, updates);
      return success(res, null, 'Cập nhật thiết bị thành công');
    } catch (err) { next(err); }
  },

  // POST /api/admin/devices/barrier/control — Open/close barrier
  async controlBarrier(req, res, next) {
    try {
      let { direction, target, action } = req.body;
      if (!direction && target) {
        direction = target.toLowerCase().includes('in') ? 'IN' : target.toLowerCase().includes('out') ? 'OUT' : null;
      }
      if (!['IN','OUT'].includes(direction)) return badRequest(res, 'direction phải là IN hoặc OUT');
      if (!['OPEN','CLOSE'].includes(action)) return badRequest(res, 'action phải là OPEN hoặc CLOSE');

      let published = false;
      if (action === 'OPEN') {
        published = publishOpenGate(direction);
      } else {
        published = publishCloseGate(direction);
      }

      await SystemLogModel.create({
        user_id: req.user.id,
        action: action === 'OPEN' ? SystemLogModel.ACTIONS.BARRIER_OPEN : SystemLogModel.ACTIONS.BARRIER_CLOSE,
        description: `Admin manually ${action} barrier ${direction}`
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('barrier_status', { direction, action, source: 'ADMIN', timestamp: new Date().toISOString() });
      }

      return success(res, { published, direction, action }, `Barrier ${direction} đã được ${action === 'OPEN' ? 'mở' : 'đóng'}`);
    } catch (err) { next(err); }
  },

  // POST /api/admin/devices/light/control — Light control
  async controlLight(req, res, next) {
    try {
      const { action } = req.body;
      if (!['ON','OFF'].includes(action)) return badRequest(res, 'action phải là ON hoặc OFF');

      let published = false;
      if (action === 'ON') published = publishLightOn();
      else published = publishLightOff();

      await SystemLogModel.create({
        user_id: req.user.id,
        action: action === 'ON' ? SystemLogModel.ACTIONS.LIGHT_ON : SystemLogModel.ACTIONS.LIGHT_OFF,
        description: `Admin turned light ${action}`
      });

      const io = req.app.get('io');
      if (io) io.emit('light_status', { status: action, source: 'ADMIN', timestamp: new Date().toISOString() });

      return success(res, { published, action }, `Đèn đã được ${action === 'ON' ? 'bật' : 'tắt'}`);
    } catch (err) { next(err); }
  },

  // GET /api/devices/:id/logs
  async getDeviceLogs(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const logs = await DeviceModel.getLogs({ deviceId: req.params.id, page: +page, limit: +limit });
      return success(res, logs);
    } catch (err) { next(err); }
  },

  // GET /api/admin/devices/logs/all
  async getAllDeviceLogs(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const logs = await DeviceModel.getAllLogs({ page: +page, limit: +limit });
      return success(res, logs);
    } catch (err) { next(err); }
  }
};

module.exports = deviceController;
