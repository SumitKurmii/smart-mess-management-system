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

const DEFAULT_SERVICE_WINDOWS = {
  breakfast: {
    start: '07:30',
    end: '09:30'
  },
  lunch: {
    start: '12:30',
    end: '14:30'
  },
  dinner: {
    start: '19:30',
    end: '21:30'
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

/**
 * Calculates start and end instants for a meal service window on a given date
 */
const getMealWindowInstants = (mealDateStr, mealType, customRule = null, zone = config.messTimezone) => {
  const windowConfig = customRule || DEFAULT_SERVICE_WINDOWS[mealType];
  if (!windowConfig) {
    throw new Error(`Unsupported meal type for service window: ${mealType}`);
  }

  const windowStartStr = windowConfig.windowStart || windowConfig.start || DEFAULT_SERVICE_WINDOWS[mealType]?.start;
  const windowEndStr = windowConfig.windowEnd || windowConfig.end || DEFAULT_SERVICE_WINDOWS[mealType]?.end;

  if (!windowStartStr || !windowEndStr) {
    throw new Error(`Incomplete service window configuration for meal type: ${mealType}`);
  }

  const [startHour, startMin] = windowStartStr.split(':').map(Number);
  const [endHour, endMin] = windowEndStr.split(':').map(Number);

  const baseDate = DateTime.fromISO(mealDateStr, { zone }).startOf('day');
  if (!baseDate.isValid) {
    throw new Error(`Invalid meal date format: ${mealDateStr}. Expected YYYY-MM-DD.`);
  }

  const startInstant = baseDate.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
  const endInstant = baseDate.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });

  return {
    startInstant,
    endInstant,
    windowStartStr,
    windowEndStr
  };
};

/**
 * Validates whether the current instant is within the permitted service window for check-in
 */
const isWithinMealWindow = (mealDateStr, mealType, currentInstantInput = new Date(), customRule = null, zone = config.messTimezone) => {
  const currentDT = currentInstantInput instanceof Date
    ? DateTime.fromJSDate(currentInstantInput).setZone(zone)
    : DateTime.fromISO(String(currentInstantInput), { zone });

  const { startInstant, endInstant, windowStartStr, windowEndStr } = getMealWindowInstants(mealDateStr, mealType, customRule, zone);

  const currentMs = currentDT.toMillis();
  const startMs = startInstant.toMillis();
  const endMs = endInstant.toMillis();

  if (currentMs < startMs) {
    return {
      allowed: false,
      reason: 'too_early',
      currentInstant: currentDT.toISO(),
      startInstant: startInstant.toISO(),
      endInstant: endInstant.toISO(),
      windowStartStr,
      windowEndStr,
      message: `Meal service for ${mealType} has not started yet. Service opens at ${windowStartStr} IST on ${mealDateStr}.`
    };
  }

  if (currentMs > endMs) {
    return {
      allowed: false,
      reason: 'too_late',
      currentInstant: currentDT.toISO(),
      startInstant: startInstant.toISO(),
      endInstant: endInstant.toISO(),
      windowStartStr,
      windowEndStr,
      message: `Meal service for ${mealType} has closed. Service ended at ${windowEndStr} IST on ${mealDateStr}.`
    };
  }

  return {
    allowed: true,
    reason: 'within_window',
    currentInstant: currentDT.toISO(),
    startInstant: startInstant.toISO(),
    endInstant: endInstant.toISO(),
    windowStartStr,
    windowEndStr,
    message: `Meal service for ${mealType} is currently active.`
  };
};

/**
 * Determines the operational lifecycle state of a meal session on a canonical date
 * relative to the provided operational instant (Asia/Kolkata).
 *
 * States:
 * - 'upcoming': Current instant is strictly before windowStart (T < T_start)
 * - 'in_progress': Current instant is within the active service window (T_start <= T <= T_end)
 * - 'completed': Current instant is strictly after windowEnd (T > T_end)
 */
const getMealSessionLifecycle = (mealDateStr, mealType, currentInstantInput = new Date(), customRule = null, zone = config.messTimezone) => {
  const currentDT = currentInstantInput instanceof Date
    ? DateTime.fromJSDate(currentInstantInput).setZone(zone)
    : DateTime.fromISO(String(currentInstantInput), { zone });

  const { startInstant, endInstant, windowStartStr, windowEndStr } = getMealWindowInstants(mealDateStr, mealType, customRule, zone);

  const currentMs = currentDT.toMillis();
  const startMs = startInstant.toMillis();
  const endMs = endInstant.toMillis();

  if (currentMs < startMs) {
    return {
      status: 'upcoming',
      label: 'Upcoming',
      windowStartStr,
      windowEndStr,
      startInstant: startInstant.toISO(),
      endInstant: endInstant.toISO()
    };
  }

  if (currentMs > endMs) {
    return {
      status: 'completed',
      label: 'Completed',
      windowStartStr,
      windowEndStr,
      startInstant: startInstant.toISO(),
      endInstant: endInstant.toISO()
    };
  }

  return {
    status: 'in_progress',
    label: 'In progress',
    windowStartStr,
    windowEndStr,
    startInstant: startInstant.toISO(),
    endInstant: endInstant.toISO()
  };
};

module.exports = {
  DEFAULT_CUTOFFS,
  DEFAULT_SERVICE_WINDOWS,
  getCurrentOperationalDate,
  toOperationalDateString,
  calculateMealCutoffInstant,
  isBookingAllowed,
  getMealWindowInstants,
  isWithinMealWindow,
  getMealSessionLifecycle,
  getWeekStart,
  getWeekDates
};
