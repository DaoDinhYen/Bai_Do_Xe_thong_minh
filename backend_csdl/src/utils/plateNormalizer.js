/**
 * Plate Number Normalizer
 * Chuẩn hóa biển số xe về dạng: 51A12345 (không dấu gạch, không dấu chấm, không khoảng trắng, uppercase)
 */

/**
 * Normalize a license plate string
 * "51A-123.45" → "51A12345"
 * "51A 123 45" → "51A12345"
 * "51a12345"   → "51A12345"
 */
function normalizePlate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw
    .toUpperCase()
    .replace(/[\s\-\.]/g, '')   // Remove spaces, dashes, dots
    .replace(/[^A-Z0-9]/g, ''); // Remove any remaining special chars
}

/**
 * Compare two plate numbers after normalization
 */
function platesMatch(plate1, plate2) {
  if (!plate1 || !plate2) return false;
  return normalizePlate(plate1) === normalizePlate(plate2);
}

/**
 * Check if a plate number format looks valid (basic Vietnamese plate)
 * Examples: 51A12345, 30H12345, 29A12345
 */
function isValidPlateFormat(plate) {
  if (!plate) return false;
  const normalized = normalizePlate(plate);
  // Vietnamese plate pattern: 2 digits + 1 letter + 4-5 digits
  return /^\d{2}[A-Z]\d{4,5}$/.test(normalized);
}

module.exports = { normalizePlate, platesMatch, isValidPlateFormat };
