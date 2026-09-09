/**
 * Sidebar & Header Component
 * Shared across all admin pages
 */

// ── Sidebar HTML Template ──
function getSidebarHTML(activePage) {
  const user = window.Auth?.getUser();
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'AD';

  const menu = [
    {
      id: 'dashboard',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
      label: 'Dashboard',
      href: 'dashboard.html',
      direct: true,
    },
    {
      id: 'parking',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
      label: 'Bãi xe',
      children: [
        { id: 'parking-monitor', label: 'Giám sát bãi xe', href: 'parking.html' },
        { id: 'parking-control', label: 'Điều khiển', href: 'control.html' },
        { id: 'parking-devices', label: 'Thiết bị IoT', href: 'devices.html' },
      ]
    },
    {
      id: 'operations',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      label: 'Vận hành',
      children: [
        { id: 'bookings', label: 'Booking', href: 'bookings.html' },
        { id: 'history', label: 'Lịch sử gửi xe', href: 'history.html' },
        { id: 'transactions', label: 'Giao dịch', href: 'transactions.html' },
      ]
    },
    {
      id: 'camera',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
      label: 'Camera / ANPR',
      href: 'camera.html',
      direct: true,
    },
    {
      id: 'users',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      label: 'Người dùng & Phương tiện',
      children: [
        { id: 'users-list', label: 'Người dùng', href: 'users.html' },
        { id: 'vehicles', label: 'Phương tiện', href: 'vehicles.html' },
      ]
    },
    {
      id: 'reports',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      label: 'Báo cáo',
      children: [
        { id: 'statistics', label: 'Thống kê', href: 'statistics.html' },
        { id: 'logs', label: 'Nhật ký hệ thống', href: 'logs.html' },
      ]
    },
  ];

  function renderItem(item) {
    if (item.direct) {
      const isActive = activePage === item.id;
      return `
        <div class="nav-group">
          <a href="${item.href}" class="nav-group-header ${isActive ? 'active' : ''}">
            ${item.icon}
            <span>${item.label}</span>
          </a>
        </div>
      `;
    }

    const hasActive = item.children?.some(c => c.id === activePage);
    const isOpen = hasActive;

    const childrenHtml = item.children?.map(child => {
      const isActive = activePage === child.id;
      return `<a href="${child.href}" class="nav-item ${isActive ? 'active' : ''}">${child.label}</a>`;
    }).join('') || '';

    return `
      <div class="nav-group">
        <div class="nav-group-header ${hasActive ? 'active' : ''} ${isOpen ? 'open' : ''}" onclick="toggleNavGroup(this)">
          ${item.icon}
          <span>${item.label}</span>
          <svg class="nav-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="nav-sub ${isOpen ? 'open' : ''}">
          ${childrenHtml}
        </div>
      </div>
    `;
  }

  return `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">P</div>
      <div>
        <div class="sidebar-logo-text">Smart Parking</div>
        <div class="sidebar-logo-sub">An Toàn · Tiện Lợi · Thông Minh</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${menu.map(renderItem).join('')}
    </nav>
  `;
}

// ── Header HTML Template ──
function getHeaderHTML() {
  const user = window.Auth?.getUser();
  const initials = user?.name ? user.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() : 'AD';
  const name = user?.name || 'Admin';

  return `
    <button class="mobile-menu-btn btn btn-icon btn-ghost" id="mobile-menu-btn" style="display:none;margin-right:8px">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div class="header-search">
      <div class="header-search-wrap">
        <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="search" class="header-search-input" placeholder="Tìm kiếm..." id="header-search" autocomplete="chrome-off" readonly onfocus="this.removeAttribute('readonly')" onblur="this.setAttribute('readonly', 'readonly')">
      </div>
    </div>
    <div class="header-actions">
      <div class="relative">
        <button class="notif-btn" id="notif-btn" title="Thông báo">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notif-count" style="display:none">0</span>
        </button>
      </div>
      <div class="user-menu" id="user-menu">
        <button class="user-menu-trigger" id="user-menu-trigger">
          <div class="avatar" id="header-avatar" style="background:var(--primary)">${initials}</div>
          <span class="user-name">${name}</span>
          <svg class="user-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="dropdown" id="user-dropdown">
          <div class="dropdown-item" onclick="openSettings()">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07"/></svg>
            Cài đặt
          </div>
          <div class="dropdown-item" onclick="openChangePassword()">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Đổi mật khẩu
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item danger" onclick="handleLogout()">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Đăng xuất
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Init Layout ──
function initLayout(activePage) {
  // Inject sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = getSidebarHTML(activePage);

  // Inject header
  const header = document.getElementById('header');
  if (header) header.innerHTML = getHeaderHTML();

  // Load notification count
  loadNotifCount();

  // User menu toggle
  const trigger = document.getElementById('user-menu-trigger');
  const userMenu = document.getElementById('user-menu');
  const dropdown = document.getElementById('user-dropdown');

  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('open');
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      userMenu?.classList.remove('open');
      dropdown?.classList.remove('open');
    });
  }

  // Mobile menu
  const mobileBtn = document.getElementById('mobile-menu-btn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });
    // Show button on small screen
    if (window.innerWidth <= 768) mobileBtn.style.display = 'flex';
  }

  window.addEventListener('resize', () => {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) mobileBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  });
}

// ── Toggle nav group ──
function toggleNavGroup(header) {
  const sub = header.nextElementSibling;
  if (!sub) return;
  const isOpen = header.classList.contains('open');
  // Close all others
  document.querySelectorAll('.nav-group-header.open').forEach(h => {
    if (h !== header) {
      h.classList.remove('open');
      h.nextElementSibling?.classList.remove('open');
    }
  });
  header.classList.toggle('open', !isOpen);
  sub.classList.toggle('open', !isOpen);
}

// ── Load Notification Count ──
async function loadNotifCount() {
  try {
    const res = await window.NotifAPI?.getMine();
    const count = res?.data?.unread_count || 0;
    const badge = document.getElementById('notif-count');
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch {}
}

// ── Logout ──
async function handleLogout() {
  const ok = await window.showConfirm({ title: 'Đăng xuất', message: 'Bạn có chắc muốn đăng xuất?', confirmText: 'Đăng xuất', danger: true });
  if (!ok) return;
  try { await window.AuthAPI?.logout(); } catch {}
  window.Auth?.clear();
  window.location.href = 'index.html';
}

// ── Change Password Modal ──
function openChangePassword() {
  let modal = document.getElementById('change-pw-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'change-pw-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Đổi mật khẩu</span>
          <button class="modal-close" onclick="document.getElementById('change-pw-modal').classList.remove('open')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Mật khẩu hiện tại</label>
            <input type="password" id="pw-current" class="form-control" placeholder="••••••••">
          </div>
          <div class="form-group">
            <label class="form-label">Mật khẩu mới</label>
            <input type="password" id="pw-new" class="form-control" placeholder="Ít nhất 6 ký tự">
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Xác nhận mật khẩu mới</label>
            <input type="password" id="pw-confirm" class="form-control" placeholder="Nhập lại mật khẩu">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('change-pw-modal').classList.remove('open')">Hủy</button>
          <button class="btn btn-primary" onclick="submitChangePassword()">Lưu thay đổi</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById('change-pw-modal').classList.add('open');
}

async function submitChangePassword() {
  const current = document.getElementById('pw-current')?.value;
  const newPw = document.getElementById('pw-new')?.value;
  const confirm = document.getElementById('pw-confirm')?.value;
  if (!current || !newPw) return Toast.error('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
  if (newPw.length < 6) return Toast.error('Lỗi', 'Mật khẩu mới phải ít nhất 6 ký tự');
  if (newPw !== confirm) return Toast.error('Lỗi', 'Mật khẩu xác nhận không khớp');
  try {
    await window.AuthAPI.changePassword({ current_password: current, new_password: newPw });
    document.getElementById('change-pw-modal')?.classList.remove('open');
    Toast.success('Thành công', 'Đã đổi mật khẩu thành công');
  } catch (err) {
    Toast.error('Lỗi', err.message || 'Không thể đổi mật khẩu');
  }
}

function openSettings() {
  Toast.info('Cài đặt', 'Tính năng đang được phát triển');
}

window.initLayout = initLayout;
window.toggleNavGroup = toggleNavGroup;
window.handleLogout = handleLogout;
window.openChangePassword = openChangePassword;
window.submitChangePassword = submitChangePassword;
window.openSettings = openSettings;
