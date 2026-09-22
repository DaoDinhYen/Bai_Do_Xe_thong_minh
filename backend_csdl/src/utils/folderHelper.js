/**
 * Helper to generate safe folder names for parking sessions
 * Format:
 * - Registered user: <user_slug>_<hour>h[minute]_<day>-<month>-<year>
 *   Example: nguoi_demo_1_12h_17-9-2026 or nguoi_demo_1_12h30_17-9-2026
 * - Guest / Walk-in: <plate_number>_<hour>h[minute]_<day>-<month>-<year>
 *   Example: 36A99999_12h_17-9-2026
 * Safe for Windows & Linux filesystems (no slashes, no colons).
 */

function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str;
}

function generateSessionFolderName({ userName, plateNumber, date = new Date() }) {
  let prefix = '';

  if (userName) {
    const cleanName = removeVietnameseTones(userName).toLowerCase().trim();
    if (/nguoi\s*dung\s*demo/i.test(cleanName) || /demo/i.test(cleanName) || /user\s*1/i.test(cleanName)) {
      prefix = 'nguoi_demo_1';
    } else {
      prefix = cleanName.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
  }

  if (!prefix && plateNumber) {
    prefix = plateNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  if (!prefix) {
    prefix = 'khach_vang_lai';
  }

  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const h = date.getHours();
  const min = date.getMinutes();

  // If minute > 0: 12h30, otherwise: 12h
  const timePart = min > 0 ? `${h}h${min < 10 ? '0' + min : min}` : `${h}h`;
  const datePart = `${d}-${m}-${y}`;

  return `${prefix}_${timePart}_${datePart}`;
}

function extractFolderName(imagePath) {
  if (!imagePath) return null;
  // e.g. /captures/nguoi_demo_1_12h_17-9-2026/anh_vao.jpg -> nguoi_demo_1_12h_17-9-2026
  const parts = imagePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const captureIdx = parts.indexOf('captures');
  if (captureIdx !== -1 && parts[captureIdx + 1] && parts[captureIdx + 2]) {
    return parts[captureIdx + 1];
  }
  return null;
}

module.exports = {
  removeVietnameseTones,
  generateSessionFolderName,
  extractFolderName
};
