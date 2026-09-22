/**
 * API Layer — Smart Parking System Admin Web
 * Connects to Node.js Backend (Prompt 1)
 */

// Tự động dùng cùng origin → không cần hardcode localhost:3000
// Khi chạy qua Express: http://localhost:3000/api
// Khi chạy qua Live Server: http://127.0.0.1:5500/api (CORS vẫn OK vì backend allow *)
const API_BASE  = (typeof window !== 'undefined' && window.location.hostname !== '127.0.0.1' && window.location.port !== '5500')
  ? `${window.location.origin}/api`   // cùng server Express → http://localhost:3000/api
  : 'http://localhost:3000/api';       // Live Server riêng → vẫn trỏ tới backend
const SOCKET_URL = 'http://localhost:3000';  // Socket.IO luôn trỏ về backend

// ── Token Management ──
const Auth = {
  getToken() { return localStorage.getItem('sp_token') || sessionStorage.getItem('sp_token'); },
  getRefreshToken() { return localStorage.getItem('sp_refresh') || sessionStorage.getItem('sp_refresh'); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('sp_user') || sessionStorage.getItem('sp_user') || 'null'); }
    catch { return null; }
  },
  save(token, refreshToken, user, remember = false) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem('sp_token', token);
    store.setItem('sp_refresh', refreshToken);
    store.setItem('sp_user', JSON.stringify(user));
    // Always keep in localStorage for cross-tab
    if (remember) {
      localStorage.setItem('sp_token', token);
      localStorage.setItem('sp_refresh', refreshToken);
      localStorage.setItem('sp_user', JSON.stringify(user));
    }
  },
  clear() {
    ['sp_token','sp_refresh','sp_user'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  },
  isAdmin() {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  },
  isLoggedIn() { return !!this.getToken(); }
};

// ── Base Request ──
async function request(method, path, body = null, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = {
    method,
    headers,
    ...options
  };
  if (body) config.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${path}`, config);

    // Handle 401 — try refresh
    if (res.status === 401 && path !== '/auth/login') {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${Auth.getToken()}`;
        const retryRes = await fetch(`${API_BASE}${path}`, { ...config, headers });
        return parseResponse(retryRes);
      } else {
        Auth.clear();
        window.location.href = '/index.html';
        return;
      }
    }

    return parseResponse(res);
  } catch (err) {
    throw { message: 'Không thể kết nối đến server. Kiểm tra backend đang chạy.', network: true };
  }
}

async function parseResponse(res) {
  let json;
  try { json = await res.json(); } catch { json = {}; }
  if (!res.ok) {
    throw { message: json.message || `Lỗi ${res.status}`, statusCode: res.status, data: json };
  }

  // Normalize: Backend trả { success, data, message, pagination }
  const total = json.pagination?.total ?? (Array.isArray(json.data) ? json.data.length : 0);
  const normalized = {
    success:    json.success ?? true,
    message:    json.message || '',
    data:       json.data,
    pagination: json.pagination || null,
    total:      total,
    _raw:       json,
  };

  // Tương thích cả 2 cách viết trên frontend:
  // Cách 1: res.data là mảng trực tiếp (res.data.map, Array.isArray(res.data))
  // Cách 2: const { data = [], total = 0, summary = {} } = res?.data || {}
  // Cách 3: res?.data?.data
  if (Array.isArray(json.data)) {
    json.data.data = json.data;
    json.data.total = total;
    json.data.pagination = json.pagination;
    json.data.summary = json.summary || {};
  } else if (json.data && typeof json.data === 'object') {
    if (!json.data.total && total) json.data.total = total;
  }

  return normalized;
}

async function tryRefreshToken() {
  const refreshToken = Auth.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (res.ok) {
      const data = await res.json();
      const user = Auth.getUser();
      const inLocal = !!localStorage.getItem('sp_token');
      Auth.save(data.data.token, refreshToken, user, inLocal);
      return true;
    }
    return false;
  } catch { return false; }
}

const api = {
  get:    (path, params) => {
    const url = params ? `${path}?${new URLSearchParams(params)}` : path;
    return request('GET', url);
  },
  post:   (path, body) => request('POST', path, body),
  put:    (path, body) => request('PUT', path, body),
  patch:  (path, body) => request('PATCH', path, body),
  delete: (path)       => request('DELETE', path),
};

// ── Auth API ──
const AuthAPI = {
  login:          (data)    => api.post('/auth/login', data),
  logout:         ()        => api.post('/auth/logout'),
  changePassword: (data)    => api.put('/auth/change-password', data),
  refreshToken:   (token)   => api.post('/auth/refresh-token', { refresh_token: token }),
};

// ── Dashboard / Statistics ──
const StatsAPI = {
  dashboard:    ()       => api.get('/statistics/dashboard'),
  revenue:      (days)   => api.get('/statistics/revenue', { days: days || 30 }),
  peakHours:    ()       => api.get('/statistics/peak-hours'),
  slotsUsage:   ()       => api.get('/statistics/slots-usage'),
  monthly:      (year)   => api.get('/statistics/monthly', { year }),
  bookingStats: ()       => api.get('/statistics/bookings'),
  adminOverview:()       => api.get('/admin/overview'),
};

// ── Parking ──
const ParkingAPI = {
  getSlots:     ()       => api.get('/parking/slots'),
  getSummary:   ()       => api.get('/parking/slots/summary'),
  getAvailable: ()       => api.get('/parking/slots/available'),
  createSlot:   (d)      => api.post('/parking/slots', d),
  updateSlot:   (id, d)  => api.put(`/parking/slots/${id}`, d),
  getRates:     ()       => api.get('/parking/rates'),
  updateRate:   (id, d)  => api.put(`/parking/rates/${id}`, d),
  batchUpdateRates: (rates) => api.put('/parking/rates/batch', { rates }),
};

// ── Bookings ──
const BookingAPI = {
  getAll:  (params) => api.get('/bookings/all', params),
  getById: (id)     => api.get(`/bookings/${id}`),
  cancel:  (id)     => api.put(`/bookings/${id}/cancel`),
};

// ── History ──
const HistoryAPI = {
  getAll:         (params) => api.get('/history/admin/all', params),
  getGuestSessions:(params)=> api.get('/history/admin/guest-sessions', params),
  getActiveGuests: ()      => api.get('/history/admin/guest-sessions/active'),
};

// ── Payment ──
const PaymentAPI = {
  getAllTransactions: (params) => api.get('/payment/transactions/all', params),
  adjustWallet:       (data)   => api.post('/payment/adjust-wallet', data),
};

// ── Users ──
const UserAPI = {
  getAll:      (params) => api.get('/users', params),
  getById:     (id)     => api.get(`/users/${id}`),
  create:      (data)   => api.post('/users', data),
  update:      (id, d)  => api.put(`/users/${id}`, d),
  setStatus:   (id, s)  => api.put(`/users/${id}/status`, { status: s }),
  resetPass:   (id, p)  => api.post(`/users/${id}/reset-password`, { new_password: p }),
};

// ── Vehicles ──
const VehicleAPI = {
  getAll:   (params) => api.get('/vehicles/admin/all', params),
  getMine:  (params) => api.get('/vehicles', params),
  getById:  (id)     => api.get(`/vehicles/${id}`),
  create:   (data)   => api.post('/vehicles', data),
  update:   (id, d)  => api.put(`/vehicles/${id}`, d),
  delete:   (id)     => api.delete(`/vehicles/${id}`),
};

// ── RFID ──
const RfidAPI = {
  getAll:      (params) => api.get('/rfid/cards', params),
  register:    (data)   => api.post('/rfid/register', data),
  setStatus:   (id, s)  => api.put(`/rfid/cards/${id}/status`, { status: s }),
  simulateScan:(data)   => api.post('/rfid/simulate-scan', data),
};

// ── Devices ──
const DeviceAPI = {
  getAll:     ()      => api.get('/devices'),
  getById:    (id)    => api.get(`/devices/${id}`),
  getLogs:    (id)    => api.get(`/devices/${id}/logs`),
  getAllLogs: ()       => api.get('/devices/logs/all'),
  controlBarrier: (d) => api.post('/devices/barrier/control', d),
  controlLight:   (d) => api.post('/devices/light/control', d),
};

// ── Camera ──
const CameraAPI = {
  getAll:          ()       => api.get('/camera'),
  getRecords:      (params) => api.get('/camera/records', params),
  getLatest:       ()       => api.get('/camera/records/latest'),
};

// ── Notifications ──
const NotifAPI = {
  getMine:      ()     => api.get('/notifications'),
  markRead:     (id)   => api.put(`/notifications/${id}/read`),
  markAllRead:  ()     => api.put('/notifications/read-all'),
  push:         (data) => api.post('/notifications/push', data),
};

// ── System Logs ──
const LogAPI = {
  getAll: (params) => api.get('/admin/system-logs', params),
  getAlerts: ()    => api.get('/admin/alerts'),
};

// Export everything
window.Auth = Auth;
window.api = api;
window.AuthAPI = AuthAPI;
window.StatsAPI = StatsAPI;
window.ParkingAPI = ParkingAPI;
window.BookingAPI = BookingAPI;
window.HistoryAPI = HistoryAPI;
window.PaymentAPI = PaymentAPI;
window.UserAPI = UserAPI;
window.VehicleAPI = VehicleAPI;
window.RfidAPI = RfidAPI;
window.DeviceAPI = DeviceAPI;
window.CameraAPI = CameraAPI;
window.NotifAPI = NotifAPI;
window.LogAPI = LogAPI;
window.SOCKET_URL = SOCKET_URL;
