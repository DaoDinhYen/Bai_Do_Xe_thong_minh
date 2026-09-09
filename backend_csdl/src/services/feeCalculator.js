/**
 * Fee Calculator Service
 * Tính phí gửi xe dựa trên thời gian thực tế và bảng giá
 */
const ParkingRateModel = require('../models/parkingRateModel');

/**
 * Calculate fee for a given duration and vehicle type
 * @param {number} durationMinutes - actual parking duration in minutes
 * @param {string} vehicleType - 'CAR', 'MOTORBIKE', etc.
 * @returns {Promise<{fee, pricePerHour, minimum_fee, maximum_fee}>}
 */
async function calculateFee(durationMinutes, vehicleType = 'CAR') {
  let rate = await ParkingRateModel.getByVehicleType(vehicleType);
  if (!rate) {
    rate = await ParkingRateModel.getDefault();
  }

  const pricePerHour = rate ? parseFloat(rate.price_per_hour) : parseFloat(process.env.DEFAULT_PRICE_PER_HOUR) || 10000;
  const minimumFee  = rate ? parseFloat(rate.minimum_fee) : parseFloat(process.env.MINIMUM_FEE) || 10000;
  const maximumFee  = rate ? (rate.maximum_fee ? parseFloat(rate.maximum_fee) : null) : null;

  // Calculate: ceil to nearest 30 mins or full hour depending on config
  const durationHours = durationMinutes / 60;
  let fee = durationHours * pricePerHour;

  // Round up to nearest 1000 VND
  fee = Math.ceil(fee / 1000) * 1000;

  // Apply minimum fee
  fee = Math.max(fee, minimumFee);

  // Apply maximum fee if set
  if (maximumFee && fee > maximumFee) {
    fee = maximumFee;
  }

  return {
    fee,
    price_per_hour: pricePerHour,
    minimum_fee: minimumFee,
    maximum_fee: maximumFee,
    duration_minutes: durationMinutes,
    duration_hours: Math.round(durationHours * 100) / 100
  };
}

/**
 * Calculate fee from entry/exit times
 */
async function calculateFeeFromTimes(entryTime, exitTime, vehicleType = 'CAR') {
  const entryMs = new Date(entryTime).getTime();
  const exitMs  = new Date(exitTime).getTime();
  const durationMinutes = Math.max(0, Math.round((exitMs - entryMs) / 60000));
  return calculateFee(durationMinutes, vehicleType);
}

/**
 * Calculate estimated fee for booking
 * @param {number} hours - number of hours booked
 * @param {string} vehicleType
 */
async function calculateBookingFee(hours, vehicleType = 'CAR') {
  const durationMinutes = hours * 60;
  return calculateFee(durationMinutes, vehicleType);
}

module.exports = { calculateFee, calculateFeeFromTimes, calculateBookingFee };
