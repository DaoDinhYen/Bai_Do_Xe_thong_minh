/**
 * Admin Layout Template — used by all admin pages
 * Call: AdminPage.init('page-id') at bottom of each page script
 */

/**
 * Inject the full admin shell into body
 * @param {string} pageId - active page identifier
 * @param {string} contentHTML - page content HTML
 * @param {Function} onReady - callback after layout is ready
 */
function createAdminPage(pageId, contentHTML, onReady) {
  if (!requireAdmin()) return;

  const user = Auth.getUser();
  const initials = user?.name
    ? user.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'AD';

  const menu = [
    { id: 'dashboard',       icon: 'grid',       label: 'Dashboard',                    href: 'dashboard.html',  direct: true },
    { id: 'parking',         icon: 'car',        label: 'Bãi xe',                       children: [
        { id: 'parking-monitor', label: 'Giám sát bãi xe', href: 'parking.html' },
        { id: 'parking-control', label: 'Điều khiển',       href: 'control.html' },
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
    'grid':      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    'car':       `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    'file':      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    'video':     `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    'users':     `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'bar-chart': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
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
      <aside id="sidebar" style="width:220px;background:white;border-right:1px solid #E2E8F0;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:100;display:flex;flex-direction:column;transition:transform 0.3s">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">P</div>
          <div><div class="sidebar-logo-text">Smart Parking</div><div class="sidebar-logo-sub">An Toàn · Tiện Lợi · Thông Minh</div></div>
        </div>
        <nav class="sidebar-nav">${renderMenu()}</nav>
      </aside>

      <!-- Main Wrapper -->
      <div style="flex:1;margin-left:220px;display:flex;flex-direction:column">
        <!-- Header -->
        <header id="header" style="position:fixed;top:0;left:220px;right:0;height:64px;background:white;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;padding:0 24px;gap:16px;z-index:90;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
          <button id="mobile-menu-btn" class="btn btn-icon btn-ghost" style="display:none" onclick="document.getElementById('sidebar').classList.toggle('open')">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <!-- Hidden decoy to prevent Chrome/Edge from autofilling admin credentials into search fields -->
          <div style="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none" aria-hidden="true">
            <input type="text" name="chrome_fake_user" autocomplete="username" tabindex="-1">
            <input type="password" name="chrome_fake_pass" autocomplete="current-password" tabindex="-1">
          </div>
          <div class="header-search" style="flex:1;max-width:380px">
            <div class="header-search-wrap">
              <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" class="header-search-input" placeholder="Tìm kiếm..." autocomplete="chrome-off" readonly onfocus="this.removeAttribute('readonly')" onblur="this.setAttribute('readonly', 'readonly')">
            </div>
          </div>
          <div class="header-actions">
            <div class="relative">
              <button class="notif-btn" title="Thông báo">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span id="notif-count" class="notif-badge" style="display:none">0</span>
              </button>
            </div>
            <div class="user-menu" id="user-menu">
              <button class="user-menu-trigger" id="user-menu-trigger">
                <div class="avatar">${initials}</div>
                <span class="user-name">${user?.name || 'Admin'}</span>
                <svg class="user-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="dropdown" id="user-dropdown">
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
        </header>

        <!-- Page Content -->
        <main style="margin-top:64px;padding:24px;flex:1;animation:fadeIn 0.25s ease" class="page-enter">
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
          <button class="btn btn-ghost" onclick="document.getElementById('change-pw-modal').classList.remove('open')">Hủy</button>
          <button class="btn btn-primary" onclick="submitChangePw()">Lưu thay đổi</button>
        </div>
      </div>
    </div>
  `;

  // ── User menu toggle ──
  const trigger = document.getElementById('user-menu-trigger');
  const userMenuEl = document.getElementById('user-menu');
  const dropdownEl = document.getElementById('user-dropdown');
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenuEl.classList.toggle('open');
    dropdownEl.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    userMenuEl?.classList.remove('open');
    dropdownEl?.classList.remove('open');
  });

  // Load notif count
  NotifAPI.getMine().then(r => {
    const cnt = r?.data?.unread_count || 0;
    const badge = document.getElementById('notif-count');
    if (badge) { badge.textContent = cnt > 9 ? '9+' : cnt; badge.style.display = cnt > 0 ? 'flex' : 'none'; }
  }).catch(() => {});

  // Mobile responsive
  const checkMobile = () => {
    const mb = document.getElementById('mobile-menu-btn');
    if (mb) mb.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  };
  checkMobile();
  // Prevent browser autofilling credentials or suggesting 'admin@smartparking.com'
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
      // Readonly trick: Prevents Chrome credential popup on focus
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

  // Call page init
  if (typeof onReady === 'function') onReady();

  // Run cleanup at intervals to catch late browser autofills
  setTimeout(neutralizeSearchInputs, 50);
  setTimeout(neutralizeSearchInputs, 150);
  setTimeout(neutralizeSearchInputs, 350);
  setTimeout(neutralizeSearchInputs, 700);
}

// Shared functions
async function handleLogout() {
  const ok = await showConfirm({ title: 'Đăng xuất', message: 'Bạn có chắc muốn đăng xuất?', confirmText: 'Đăng xuất', danger: true });
  if (!ok) return;
  try { await AuthAPI.logout(); } catch {}
  Auth.clear();
  window.location.href = 'index.html';
}
function openChangePassword() {
  document.getElementById('change-pw-modal').classList.add('open');
}
async function submitChangePw() {
  const cur  = document.getElementById('pw-current')?.value;
  const newP = document.getElementById('pw-new')?.value;
  const conf = document.getElementById('pw-confirm')?.value;
  if (!cur || !newP) return Toast.error('Lỗi', 'Vui lòng nhập đầy đủ');
  if (newP.length < 6) return Toast.error('Lỗi', 'Mật khẩu mới phải ít nhất 6 ký tự');
  if (newP !== conf) return Toast.error('Lỗi', 'Xác nhận mật khẩu không khớp');
  try {
    await AuthAPI.changePassword({ current_password: cur, new_password: newP });
    document.getElementById('change-pw-modal').classList.remove('open');
    Toast.success('Thành công', 'Đã đổi mật khẩu thành công');
  } catch (e) { Toast.error('Lỗi', e.message); }
}

window.createAdminPage = createAdminPage;
window.handleLogout = handleLogout;
window.openChangePassword = openChangePassword;
window.submitChangePw = submitChangePw;
