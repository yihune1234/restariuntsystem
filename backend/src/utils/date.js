/**
 * Date and Business Day Utilities
 */

/**
 * Returns today's business date formatted as YYYY-MM-DD
 * @param {Date} [date] - Optional date object (defaults to current date)
 * @returns {string} e.g. "2026-08-30"
 */
const getTodayBusinessDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Checks if current time is within a time window "HH:mm" - "HH:mm"
 * @param {string} startTime - e.g. "07:00"
 * @param {string} endTime - e.g. "11:30"
 * @param {Date} [currentTime] - Optional date object
 * @returns {boolean}
 */
const isTimeWithinWindow = (startTime, endTime, currentTime = new Date()) => {
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = endTime.split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Handles overnight windows (e.g. 22:00 to 04:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
};

module.exports = {
  getTodayBusinessDate,
  isTimeWithinWindow,
};
