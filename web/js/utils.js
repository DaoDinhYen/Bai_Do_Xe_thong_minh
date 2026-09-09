/**
 * Utilities — Toast, Pagination, Format, Confirm Dialog
 */

// ── Toast System ──
const Toast = (() => {
  let container;
  function getContainer() {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
    }
    return container;
  }

  const icons = {
    success: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  function show(type, title, message, duration = 4000) {
    const c = getContainer();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="flex-1">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    c.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('show')); });
    if (duration > 0) {
      setTimeout(() => {
        el.classList.add('hide');
        setTimeout(() => el.remove(), 300);
      }, duration);
    }
    return el;
  }

  return {
    success: (title, msg, dur) => show('success', title, msg, dur),
    error:   (title, msg, dur) => show('error',   title, msg, dur),
    warning: (title, msg, dur) => show('warning', title, msg, dur),
    info:    (title, msg, dur) => show('info',    title, msg, dur),
  };
})();

// ── Confirm Dialog ──
function showConfirm({ title = 'Xác nhận', message, confirmText = 'Xác nhận', cancelText = 'Hủy', danger = false } = {}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirm-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:400px">
          <div class="modal-header">
            <span class="modal-title" id="confirm-title"></span>
          </div>
          <div class="modal-body">
            <p id="confirm-message" style="font-size:14px;color:var(--text-medium);line-height:1.6"></p>
          </div>
          <div class="modal-footer">
            <button id="confirm-cancel" class="btn btn-ghost">${cancelText}</button>
            <button id="confirm-ok" class="btn btn-primary">${confirmText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.querySelector('#confirm-title').textContent = title;
    overlay.querySelector('#confirm-message').textContent = message;
    overlay.querySelector('#confirm-cancel').textContent = cancelText;
    const okBtn = overlay.querySelector('#confirm-ok');
    okBtn.textContent = confirmText;
    okBtn.className = `btn ${danger ? 'btn-error' : 'btn-primary'}`;

    overlay.classList.add('open');

    const cleanup = () => overlay.classList.remove('open');
    const onOk  = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    okBtn.onclick = onOk;
    overlay.querySelector('#confirm-cancel').onclick = onCancel;
    overlay.onclick = (e) => { if (e.target === overlay) onCancel(); };
  });
}

// ── Pagination Builder ──
class Pagination {
  constructor({ container, total, page, limit, onChange }) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.onChange = onChange;
    this.totalPages = Math.ceil(total / limit);
  }

  render() {
    if (!this.container) return;
    const { page, totalPages, total, limit } = this;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    let pagesHtml = '';
    const range = this._getRange(page, totalPages);
    range.forEach(p => {
      if (p === '...') {
        pagesHtml += `<span class="page-btn" style="border:none;cursor:default">…</span>`;
      } else {
        pagesHtml += `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
    });

    this.container.innerHTML = `
      <div class="pagination">
        <span class="pagination-info">Hiển thị ${start}–${end} / ${total}</span>
        <button class="page-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>
        ${pagesHtml}
        <button class="page-btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>›</button>
      </div>
    `;

    this.container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (p >= 1 && p <= totalPages && p !== this.page) {
          this.page = p;
          this.onChange(p);
          this.render();
        }
      });
    });
  }

  _getRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  }
}

// ── Format Helpers ──
const Format = {
  money(amount) {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  },
  date(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  datetime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  time(d) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(d) {
    if (!d) return '—';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return this.date(d);
  },
  duration(minutes) {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} phút`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}g ${m}p` : `${h} giờ`;
  },
  confidence(c) {
    if (c === null || c === undefined) return '—';
    return `${Math.round(parseFloat(c) * 100)}%`;
  },
  slotStatus(s) {
    const map = { FREE: 'Trống', OCCUPIED: 'Có xe', RESERVED: 'Đặt trước', DISABLED: 'Vô hiệu' };
    return map[s] || s;
  },
  bookingStatus(s) {
    const map = { CONFIRMED: 'Đã xác nhận', ACTIVE: 'Đang dùng', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn', PENDING: 'Chờ xử lý' };
    return map[s] || s;
  },
  vehicleType(t) {
    const map = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy', TRUCK: 'Xe tải', OTHER: 'Khác' };
    return map[t] || t;
  },
  userRole(r) { return r === 'ADMIN' ? 'Quản trị' : 'Người dùng'; },
  paymentStatus(s) {
    const map = { PAID: 'Đã thanh toán', PENDING: 'Chưa thanh toán', FAILED: 'Thất bại', REFUNDED: 'Hoàn tiền' };
    return map[s] || s;
  },
  userStatus(s) { return s === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'; },
  txType(t) {
    const map = { TOP_UP: 'Nạp tiền', BOOKING_PAYMENT: 'Đặt chỗ', PARKING_PAYMENT: 'Phí gửi xe', REFUND: 'Hoàn tiền' };
    return map[t] || t;
  },
};

// ── Slot Status Badge ──
function slotBadge(status) {
  const map = {
    FREE:     'badge-success',
    OCCUPIED: 'badge-error',
    RESERVED: 'badge-warning',
    DISABLED: 'badge-gray',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${Format.slotStatus(status)}</span>`;
}
function bookingBadge(status) {
  const map = {
    CONFIRMED: 'badge-primary',
    ACTIVE:    'badge-success',
    COMPLETED: 'badge-teal',
    CANCELLED: 'badge-error',
    EXPIRED:   'badge-gray',
    PENDING:   'badge-warning',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${Format.bookingStatus(status)}</span>`;
}
function userStatusBadge(status) {
  return status === 'ACTIVE'
    ? `<span class="badge badge-success">Hoạt động</span>`
    : `<span class="badge badge-error">Bị khóa</span>`;
}
function payBadge(status) {
  const map = { PAID: 'badge-success', PENDING: 'badge-warning', FAILED: 'badge-error', REFUNDED: 'badge-teal' };
  return `<span class="badge ${map[status] || 'badge-gray'}">${Format.paymentStatus(status)}</span>`;
}
function txBadge(status) {
  const map = { SUCCESS: 'badge-success', FAILED: 'badge-error', PENDING: 'badge-warning' };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status === 'SUCCESS' ? 'Thành công' : status === 'FAILED' ? 'Thất bại' : 'Đang xử lý'}</span>`;
}

// ── Loading Skeleton HTML ──
function skeletonRows(n = 5) {
  return Array.from({ length: n }, () => `
    <tr>
      ${Array.from({ length: 6 }, () => `
        <td><div class="skeleton skeleton-text" style="width:${60 + Math.random() * 40}%;height:14px"></div></td>
      `).join('')}
    </tr>
  `).join('');
}

// ── Guard ── (redirect if not admin)
function requireAdmin() {
  if (!window.Auth || !window.Auth.isLoggedIn()) {
    window.location.href = '/index.html';
    return false;
  }
  if (!window.Auth.isAdmin()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// ── Count-up Animation ──
function animateCount(el, target, duration = 600) {
  const start = 0;
  const step = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString('vi-VN');
  }, 16);
}

// ── Debounce ──
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ── Export ──
window.Toast = Toast;
window.showConfirm = showConfirm;
window.Pagination = Pagination;
window.Format = Format;
window.slotBadge = slotBadge;
window.bookingBadge = bookingBadge;
window.userStatusBadge = userStatusBadge;
window.payBadge = payBadge;
window.txBadge = txBadge;
window.skeletonRows = skeletonRows;
window.requireAdmin = requireAdmin;
window.animateCount = animateCount;
window.debounce = debounce;
