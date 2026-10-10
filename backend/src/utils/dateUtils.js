const { DateTime } = require('luxon');
const config = require('../config/env');

const DEFAULT_CUTOFFS = {
  breakfast: {
    daysOffset: -1, // previous day
    hour: 22,
    minute: 0,
    second: 0
  },
  lunch: {
    daysOffset: 0,  // same day
    hour: 9,
    minute: 0,
    second: 0
  },
  dinner: {
    daysOffset: 0,  // same day
    hour: 16,
    minute: 0,
    second: 0
  }
};

/**
 * Returns the current date in YYYY-MM-DD format based on operational timezone
 */
const getCurrentOperationalDate = (zone = config.messTimezone) => {
  return DateTime.now().setZone(zone).toISODate();
};

/**
 * Converts any ISO or Date object to a canonical YYYY-MM-DD string in the mess operational timezone
 */
const toOperationalDateString = (dateInput, zone = config.messTimezone) => {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const dt = dateInput instanceof Date
    ? DateTime.fromJSDate(dateInput)
    : DateTime.fromISO(String(dateInput));
  return dt.setZone(zone).toISODate();
};

/**
 * Calculates the exact cutoff instant for a meal on a specific canonical date
 */
const calculateMealCutoffInstant = (mealDateStr, mealType, customRules = {}, zone = config.messTimezone) => {
  const rule = customRules[mealType] || DEFAULT_CUTOFFS[mealType];
  if (!rule) {
    throw new Error(`Unsupported meal type for cutoff calculation: ${mealType}`);
  }

  // Parse target meal calendar date in the mess timezone
  const baseDate = DateTime.fromISO(mealDateStr, { zone }).startOf('day');
  if (!baseDate.isValid) {
    throw new Error(`Invalid meal date format: ${mealDateStr}. Expected YYYY-MM-DD.`);
  }

  // Apply day offset and time of day
  const cutoffInstant = baseDate
    .plus({ days: rule.daysOffset })
    .set({
      hour: rule.hour,
      minute: rule.minute,
      second: rule.second,
      millisecond: 0
    });

  return cutoffInstant;
};

/**
 * Validates whether booking/cancellation is currently permitted for a given meal slot
 */
const isBookingAllowed = (mealDateStr, mealType, currentInstantInput = new Date(), customRules = {}, zone = config.messTimezone) => {
  const currentDT = currentInstantInput instanceof Date
    ? DateTime.fromJSDate(currentInstantInput).setZone(zone)
    : DateTime.fromISO(String(currentInstantInput), { zone });

  const cutoffDT = calculateMealCutoffInstant(mealDateStr, mealType, customRules, zone);

  // Allowed strictly before cutoff instant; rejected at or after deadline
  const allowed = currentDT.toMillis() < cutoffDT.toMillis();

  return {
    allowed,
    currentInstant: currentDT.toISO(),
    cutoffInstant: cutoffDT.toISO(),
    cutoffHumanReadable: cutoffDT.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ'),
    message: allowed
      ? 'Booking allowed'
      : `Booking deadline passed for ${mealType} on ${mealDateStr}. Cutoff was ${cutoffDT.toFormat('yyyy-MM-dd HH:mm:ss')}`
  };
};

/**
 * Returns the start of the week (Monday) for a given date in the mess timezone
 */
const getWeekStart = (dateInput = new Date(), zone = config.messTimezone) => {
  const dt = dateInput instanceof Date
    ? DateTime.fromJSDate(dateInput).setZone(zone)
    : DateTime.fromISO(String(dateInput), { zone });
  return dt.startOf('week').toISODate(); // Monday
};

/**
 * Returns an array of 7 consecutive dates (YYYY-MM-DD) starting from startDate
 */
const getWeekDates = (startDateInput = null, zone = config.messTimezone) => {
  const start = startDateInput
    ? DateTime.fromISO(String(startDateInput), { zone }).startOf('day')
    : DateTime.now().setZone(zone).startOf('week');

  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(start.plus({ days: i }).toISODate());
  }
  return dates;
};

module.exports = {
  DEFAULT_CUTOFFS,
  getCurrentOperationalDate,
  toOperationalDateString,
  calculateMealCutoffInstant,
  isBookingAllowed,
  getWeekStart,
  getWeekDates
};
