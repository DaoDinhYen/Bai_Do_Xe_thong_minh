/**
 * Admin Layout Template — Smart Parking System
 * Luxury Light Mode shell matching Admin_Dashboard.png
 * Injected dynamically across all 12 Admin Pages
 */

function createAdminPage(pageId, contentHTML, onReady) {
  if (!requireAdmin()) return;

  // Tự động nhúng stylesheet & script cho AI Assistant
  if (!document.getElementById('ai-assistant-css')) {
    const link = document.createElement('link');
    link.id = 'ai-assistant-css';
    link.rel = 'stylesheet';
    link.href = 'css/ai-assistant.css';
    document.head.appendChild(link);
  }
  if (!document.getElementById('ai-assistant-js')) {
    const script = document.createElement('script');
    script.id = 'ai-assistant-js';
    script.src = 'js/ai-assistant.js';
    document.body.appendChild(script);
  }

  const user = Auth.getUser();
  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'AD';

  const menu = [
    { id: 'dashboard',       icon: 'grid',       label: 'Dashboard',                    href: 'dashboard.html',  direct: true },
    { id: 'parking',         icon: 'car',        label: 'Bãi xe',                       children: [
        { id: 'parking-monitor', label: 'Giám sát bãi xe', href: 'parking.html' },
        { id: 'parking-control', label: 'Điều khiển (Barrier/Đèn)', href: 'control.html' },
        { id: 'parking-devices', label: 'Thiết bị IoT',     href: 'devices.html' },
    ]},
    { id: 'operations',      icon: 'file',       label: 'Vận hành',                     children: [
        { id: 'bookings',     label: 'Booking',           href: 'bookings.html' },
        { id: 'history',      label: 'Lịch sử gửi xe',    href: 'history.html' },
        { id: 'transactions', label: 'Giao dịch',         href: 'transactions.html' },
    ]},
    { id: 'camera',          icon: 'video',      label: 'Camera / ANPR',                href: 'camera.html',     direct: true },
    { id: 'users-group',     icon: 'users',      label: 'Người dùng & Phương tiện',     children: [
        { id: 'users-list', label: 'Người dùng',   href: 'users.html' },
        { id: 'vehicles',   label: 'Phương tiện',   href: 'vehicles.html' },
    ]},
    { id: 'reports',         icon: 'bar-chart',  label: 'Báo cáo',                      children: [
        { id: 'statistics', label: 'Thống kê',           href: 'statistics.html' },
        { id: 'logs',       label: 'Nhật ký hệ thống',  href: 'logs.html' },
    ]},
  ];

  const icons = {
    'grid':      `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    'car':       `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.5L8 4h8l1.5 3H19a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg>`,
    'file':      `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    'video':     `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2.5" ry="2.5"/></svg>`,
    'users':     `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'bar-chart': `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  };

  function renderMenu() {
    return menu.map(item => {
      if (item.direct) {
        const active = pageId === item.id;
        return `
          <div class="nav-group">
            <a href="${item.href}" class="nav-group-header ${active ? 'active' : ''}">
              ${icons[item.icon]}
              <span>${item.label}</span>
            </a>
          </div>`;
      }
      const hasActive = item.children?.some(c => c.id === pageId);
      const children = item.children?.map(c => `
        <a href="${c.href}" class="nav-item ${c.id === pageId ? 'active' : ''}">${c.label}</a>
      `).join('');
      return `
        <div class="nav-group">
          <div class="nav-group-header ${hasActive ? 'active' : ''} ${hasActive ? 'open' : ''}" onclick="this.classList.toggle('open');const sub=this.nextElementSibling;if(sub){sub.classList.toggle('open')}">
            ${icons[item.icon]}
            <span>${item.label}</span>
            <svg class="nav-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="nav-sub ${hasActive ? 'open' : ''}">${children}</div>
        </div>`;
    }).join('');
  }

  document.body.innerHTML = `
    <div style="display:flex;min-height:100vh">
      <!-- Sidebar -->
      <aside id="sidebar" class="sidebar" style="width:240px;background:#FFFFFF;border-right:1px solid #E2E8F0;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:100;display:flex;flex-direction:column;transition:transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);box-shadow: 2px 0 8px rgba(15, 23, 42, 0.03);">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">P</div>
          <div>
            <div class="sidebar-logo-text">Smart Parking System</div>
            <div class="sidebar-logo-sub">An toàn - Tiện lợi - Thông minh</div>
          </div>
        </div>
        <nav class="sidebar-nav">${renderMenu()}</nav>

        <!-- Mini AI Voice Assistant Card -->
        <div class="sidebar-ai-widget" onclick="window.openAiAssistant()" title="Nhấn để mở Trợ lý AI hoặc bấm Micro nói tiếng Việt">
          <div class="sidebar-ai-avatar">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><rect x="4" y="8" width="16" height="12" rx="4"/><circle cx="9" cy="13" r="1.5" fill="currentColor"/><circle cx="15" cy="13" r="1.5" fill="currentColor"/><path d="M9 17h6"/></svg>
          </div>
          <div class="sidebar-ai-info">
            <div class="sidebar-ai-title">
              <span>Trợ Lý AI</span>
              <span style="font-size:9px;background:linear-gradient(135deg, #6366F1, #9333EA);color:#fff;padding:1px 6px;border-radius:10px;font-weight:700">AI</span>
            </div>
            <div class="sidebar-ai-sub">Hỏi đáp & Bấm nói...</div>
          </div>
          <button class="sidebar-ai-mic-btn" onclick="event.stopPropagation(); window.toggleAiSpeech()" title="Bấm để nói tiếng Việt ngay">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </button>
        </div>

        <div style="padding:14px 20px;border-top:1px solid #F1F5F9;font-size:11px;color:#94A3B8;display:flex;align-items:center;justify-content:space-between">
          <span>Hệ thống IoT v1.0</span>
          <span class="badge badge-success" style="font-size:10px;padding:2px 8px">ONLINE</span>
        </div>
      </aside>


      <!-- Main Wrapper -->
      <div style="flex:1;margin-left:240px;display:flex;flex-direction:column;min-width:0" id="main-wrapper">
        <!-- Header -->
        <header id="header" class="header" style="position:fixed;top:0;left:240px;right:0;height:68px;background:rgba(255,255,255,0.96);backdrop-filter:blur(12px);border-bottom:1px solid #E2E8F0;display:flex;align-items:center;padding:0 28px;gap:16px;z-index:90;box-shadow:0 1px 3px rgba(15, 23, 42, 0.04);transition:left 0.3s">
          <button id="mobile-menu-btn" class="btn btn-icon btn-ghost" style="display:none;width:38px;height:38px;padding:0;border-radius:10px" onclick="document.getElementById('sidebar').classList.toggle('open')">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <!-- Hidden decoy inputs to prevent autofill -->
          <div style="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none" aria-hidden="true">
            <input type="text" name="chrome_fake_user" autocomplete="username" tabindex="-1">
            <input type="password" name="chrome_fake_pass" autocomplete="current-password" tabindex="-1">
          </div>

          <!-- Header Search -->
          <div class="header-search" style="flex:1;max-width:380px">
            <div class="header-search-wrap">
              <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" class="header-search-input" placeholder="Tìm kiếm..." autocomplete="chrome-off" readonly onfocus="this.removeAttribute('readonly')" onblur="this.setAttribute('readonly', 'readonly')">
            </div>
          </div>

          <!-- Header Right Actions -->
          <div class="header-actions">
            <!-- Real-time Date & Time Capsule -->
            <div class="datetime-pill" id="global-datetime">
              <div class="datetime-pill-item">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span id="header-date">Thứ Ba, 10/09/2026</span>
              </div>
              <div class="datetime-pill-item">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span id="header-time">10:24:32</span>
              </div>
            </div>

            <!-- Quick AI Assistant Trigger Button -->
            <button class="header-ai-btn" onclick="window.openAiAssistant()" title="Mở Trợ Lý Ảo AI (Phím tắt: Alt + A)">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><rect x="4" y="8" width="16" height="12" rx="4"/><circle cx="9" cy="13" r="1.5" fill="currentColor"/><circle cx="15" cy="13" r="1.5" fill="currentColor"/><path d="M9 17h6"/></svg>
              <span>Trợ lý AI</span>
            </button>

            <!-- Notifications Button -->
            <div class="relative">
              <button class="notif-btn" title="Thông báo" onclick="window.location.href='logs.html'">
                <svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span id="notif-count" class="notif-badge">3</span>
              </button>
            </div>

            <!-- User Menu -->
            <div class="user-menu" id="user-menu">
              <button class="user-menu-trigger" id="user-menu-trigger">
                <div class="avatar">${initials}</div>
                <span class="user-name">${user?.name || 'Admin'}</span>
                <svg class="user-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="dropdown" id="user-dropdown">
                <div class="dropdown-item" onclick="openSettingsModal()">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Cài đặt
                </div>
                <div class="dropdown-item" onclick="openChangePassword()">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Đổi mật khẩu
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item danger" onclick="handleLogout()">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Đăng xuất
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main style="margin-top:68px;padding:28px;flex:1;animation:fadeInUp 0.25s ease" class="page-enter">
          ${contentHTML}
        </main>
      </div>
    </div>

    <!-- Toast Container -->
    <div id="toast-container" class="toast-container"></div>

    <!-- Change Password Modal -->
    <div id="change-pw-modal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Đổi mật khẩu</span>
          <button class="modal-close" onclick="document.getElementById('change-pw-modal').classList.remove('open')">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Mật khẩu hiện tại</label><input type="password" id="pw-current" class="form-control" placeholder="••••••••"></div>
          <div class="form-group"><label class="form-label">Mật khẩu mới</label><input type="password" id="pw-new" class="form-control" placeholder="Ít nhất 6 ký tự"></div>
          <div class="form-group mb-0"><label class="form-label">Xác nhận mật khẩu mới</label><input type="password" id="pw-confirm" class="form-control" placeholder="Nhập lại mật khẩu"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('change-pw-modal').classList.remove('open')">Hủy</button>
          <button class="btn btn-primary" onclick="submitChangePw()">Lưu thay đổi</button>
        </div>
      </div>
    </div>

    <!-- Quick Settings Modal -->
    <div id="quick-settings-modal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Cài đặt hệ thống</span>
          <button class="modal-close" onclick="document.getElementById('quick-settings-modal').classList.remove('open')">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Tên bãi đỗ xe</label>
            <input type="text" class="form-control" value="Smart Parking System" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Đơn giá gửi xe mặc định</label>
            <input type="text" class="form-control" value="10.000 VNĐ / giờ" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Thời gian mở barrier tự động</label>
            <input type="text" class="form-control" value="15 giây" readonly>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Phiên bản giao diện</label>
            <div style="font-size:13px;color:var(--text-medium);padding:6px 0">Modern Light Edition 2.0 (Đã tối ưu hóa)</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="document.getElementById('quick-settings-modal').classList.remove('open')">Đóng</button>
        </div>
      </div>
    </div>
  `;

  // ── Header Realtime Clock ──
  function updateHeaderTime() {
    const now = new Date();
    const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    const d = days[now.getDay()];
    const dateStr = `${d}, ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
    const dateEl = document.getElementById('header-date');
    const timeEl = document.getElementById('header-time');
    if (dateEl) dateEl.textContent = dateStr;
    if (timeEl) timeEl.textContent = timeStr;
  }
  updateHeaderTime();
  setInterval(updateHeaderTime, 1000);

  // ── User menu toggle ──
  const trigger = document.getElementById('user-menu-trigger');
  const userMenuEl = document.getElementById('user-menu');
  const dropdownEl = document.getElementById('user-dropdown');
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenuEl?.classList.toggle('open');
    dropdownEl?.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    userMenuEl?.classList.remove('open');
    dropdownEl?.classList.remove('open');
  });

  // Load notif count
  if (window.NotifAPI) {
    NotifAPI.getMine().then(r => {
      const cnt = r?.data?.unread_count ?? 3;
      const badge = document.getElementById('notif-count');
      if (badge) {
        badge.textContent = cnt > 9 ? '9+' : cnt;
        badge.style.display = cnt > 0 ? 'flex' : 'none';
      }
    }).catch(() => {});
  }

  // Mobile responsive check
  const checkMobile = () => {
    const mb = document.getElementById('mobile-menu-btn');
    const mw = document.getElementById('main-wrapper');
    const hd = document.getElementById('header');
    if (window.innerWidth <= 768) {
      if (mb) mb.style.display = 'flex';
      if (mw) mw.style.marginLeft = '0';
      if (hd) hd.style.left = '0';
    } else {
      if (mb) mb.style.display = 'none';
      if (mw) mw.style.marginLeft = '240px';
      if (hd) hd.style.left = '240px';
    }
  };
  window.addEventListener('resize', checkMobile);
  checkMobile();

  // Prevent browser autofill from popping up credentials on search inputs
  function neutralizeSearchInputs() {
    document.querySelectorAll('input.search-input, input.header-search-input, input[type="search"]').forEach(input => {
      input.setAttribute('type', 'search');
      input.setAttribute('autocomplete', 'chrome-off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
      if (!input.hasAttribute('name')) {
        input.setAttribute('name', 'sp_query_' + Math.random().toString(36).slice(2, 7));
      }
      if (!input.hasAttribute('data-anti-autofill')) {
        input.setAttribute('data-anti-autofill', 'true');
        input.setAttribute('readonly', 'readonly');
        input.addEventListener('focus', function() {
          this.removeAttribute('readonly');
          if (this.value && (this.value.includes('@smartparking.com') || this.value === 'admin@smartparking.com')) {
            this.value = '';
            this.dispatchEvent(new Event('input'));
          }
        });
        input.addEventListener('pointerdown', function() {
          this.removeAttribute('readonly');
        });
        input.addEventListener('blur', function() {
          this.setAttribute('readonly', 'readonly');
        });
        input.addEventListener('input', function() {
          if (this.value && (this.value.includes('@smartparking.com') || this.value === 'admin@smartparking.com')) {
            this.value = '';
            this.dispatchEvent(new Event('input'));
          }
        });
      }
      if (input.value && (input.value.includes('@smartparking.com') || input.value === 'admin@smartparking.com')) {
        input.value = '';
      }
    });
  }

  neutralizeSearchInputs();

  if (typeof onReady === 'function') onReady();

  setTimeout(neutralizeSearchInputs, 50);
  setTimeout(neutralizeSearchInputs, 150);
  setTimeout(neutralizeSearchInputs, 350);
}

// ── Shared Helper Functions ──
async function handleLogout() {
  const ok = await showConfirm({
    title: 'Đăng xuất',
    message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý?',
    confirmText: 'Đăng xuất',
    danger: true
  });
  if (!ok) return;
  try { if (window.AuthAPI) await AuthAPI.logout(); } catch {}
  Auth.clear();
  window.location.href = 'index.html';
}

function openChangePassword() {
  document.getElementById('change-pw-modal')?.classList.add('open');
}

function openSettingsModal() {
  document.getElementById('quick-settings-modal')?.classList.add('open');
}

async function submitChangePw() {
  const cur  = document.getElementById('pw-current')?.value;
  const newP = document.getElementById('pw-new')?.value;
  const conf = document.getElementById('pw-confirm')?.value;
  if (!cur || !newP) return Toast.error('Lỗi', 'Vui lòng nhập đầy đủ các trường');
  if (newP.length < 6) return Toast.error('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
  if (newP !== conf) return Toast.error('Lỗi', 'Xác nhận mật khẩu mới không trùng khớp');
  try {
    await AuthAPI.changePassword({ current_password: cur, new_password: newP });
    document.getElementById('change-pw-modal')?.classList.remove('open');
    Toast.success('Thành công', 'Mật khẩu đã được thay đổi thành công');
  } catch (e) {
    Toast.error('Lỗi', e.message || 'Không thể đổi mật khẩu');
  }
}

window.createAdminPage = createAdminPage;
window.handleLogout = handleLogout;
window.openChangePassword = openChangePassword;
window.openSettingsModal = openSettingsModal;
window.submitChangePw = submitChangePw;
