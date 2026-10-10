const MealBooking = require('../models/MealBooking');
const SystemRule = require('../models/SystemRule');
const config = require('../config/env');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  getCurrentOperationalDate,
  getWeekStart,
  getWeekDates,
  isBookingAllowed
} = require('../utils/dateUtils');
const { z } = require('zod');

// Helper to determine effective current instant (permits deterministic instant injection during tests)
const getEffectiveCurrentTime = (req) => {
  if (config.nodeEnv === 'test' && req.headers['x-test-current-time']) {
    return new Date(req.headers['x-test-current-time']);
  }
  return new Date();
};

// Helper to load cutoff rules from database or use defaults
const getRulesMap = async () => {
  const dbRules = await SystemRule.find();
  const rulesMap = {};
  dbRules.forEach(r => {
    rulesMap[r.mealType] = {
      daysOffset: r.daysOffset,
      hour: r.cutoffHour,
      minute: r.cutoffMinute,
      second: 0,
      isBookingEnabled: r.isBookingEnabled
    };
  });
  return rulesMap;
};

// Single booking validation schema
const singleBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  status: z.enum(['booked', 'skipped'])
});

// Bulk weekly booking validation schema
const bulkBookingSchema = z.object({
  bookings: z.array(singleBookingSchema).min(1, 'At least one booking is required')
});

/**
 * GET /api/bookings/my?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Retrieves student's meal intentions and cutoff status for a date range
 */
const getMyBookings = async (req, res, next) => {
  try {
    const startDate = req.query.startDate || getWeekStart();
    const dates = getWeekDates(startDate);
    const endDate = req.query.endDate || dates[6];

    const [bookings, rulesMap] = await Promise.all([
      MealBooking.find({
        user: req.user._id,
        date: { $gte: startDate, $lte: endDate }
      }),
      getRulesMap()
    ]);

    // Build map for easy client lookup: { "2026-10-10": { breakfast: "booked", lunch: "skipped" } }
    const bookingMap = {};
    bookings.forEach(b => {
      if (!bookingMap[b.date]) {
        bookingMap[b.date] = {};
      }
      bookingMap[b.date][b.mealType] = {
        id: b._id,
        status: b.status,
        bookedAt: b.bookedAt
      };
    });

    // Attach real-time cutoff status for each slot
    const now = getEffectiveCurrentTime(req);
    const cutoffStatus = {};
    dates.forEach(d => {
      cutoffStatus[d] = {};
      ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        cutoffStatus[d][meal] = isBookingAllowed(d, meal, now, rulesMap);
      });
    });

    return successResponse(
      res,
      {
        startDate,
        endDate,
        bookingMap,
        cutoffStatus,
        rawBookings: bookings
      },
      'User meal bookings retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bookings
 * Saves or updates a single meal booking intention (enforcing cutoff rules)
 */
const saveBooking = async (req, res, next) => {
  try {
    const validated = singleBookingSchema.parse(req.body);
    const rulesMap = await getRulesMap();

    // Check if rule has disabled booking
    if (rulesMap[validated.mealType]?.isBookingEnabled === false) {
      return errorResponse(res, `Booking is currently suspended for ${validated.mealType}`, 400);
    }

    const now = getEffectiveCurrentTime(req);

    // Verify cutoff deadline in mess operational timezone
    const check = isBookingAllowed(validated.date, validated.mealType, now, rulesMap);
    if (!check.allowed) {
      return errorResponse(res, check.message, 400, {
        cutoffInstant: check.cutoffInstant,
        currentInstant: check.currentInstant
      });
    }

    // Atomically upsert booking record to prevent duplicate entries
    const booking = await MealBooking.findOneAndUpdate(
      {
        user: req.user._id,
        date: validated.date,
        mealType: validated.mealType
      },
      {
        status: validated.status,
        bookedAt: now
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return successResponse(
      res,
      booking,
      `Preference for ${validated.mealType} on ${validated.date} set to '${validated.status}'`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/bookings/bulk
 * Saves weekly intentions, validating cutoff rules for each slot
 */
const saveBulkBookings = async (req, res, next) => {
  try {
    const { bookings } = bulkBookingSchema.parse(req.body);
    const rulesMap = await getRulesMap();
    const now = getEffectiveCurrentTime(req);

    const results = [];
    let updatedCount = 0;
    let rejectedCount = 0;

    for (const item of bookings) {
      const check = isBookingAllowed(item.date, item.mealType, now, rulesMap);

      if (!check.allowed) {
        results.push({
          date: item.date,
          mealType: item.mealType,
          status: 'rejected',
          reason: check.message
        });
        rejectedCount++;
        continue;
      }

      const booking = await MealBooking.findOneAndUpdate(
        {
          user: req.user._id,
          date: item.date,
          mealType: item.mealType
        },
        {
          status: item.status,
          bookedAt: now
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      results.push({
        date: item.date,
        mealType: item.mealType,
        status: 'saved',
        preference: item.status,
        id: booking._id
      });
      updatedCount++;
    }

    return successResponse(
      res,
      {
        updatedCount,
        rejectedCount,
        results
      },
      `Bulk preferences processed: ${updatedCount} saved, ${rejectedCount} rejected due to deadlines`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/headcount?date=YYYY-MM-DD
 * Admin-only: Aggregates expected headcount of diners for a specific date
 */
const getHeadcount = async (req, res, next) => {
  try {
    const targetDate = req.query.date || getCurrentOperationalDate();

    const aggregateCounts = await MealBooking.aggregate([
      { $match: { date: targetDate } },
      {
        $group: {
          _id: { mealType: '$mealType', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Format into structured response
    const headcount = {
      breakfast: { booked: 0, skipped: 0, total: 0 },
      lunch: { booked: 0, skipped: 0, total: 0 },
      dinner: { booked: 0, skipped: 0, total: 0 }
    };

    aggregateCounts.forEach(item => {
      const meal = item._id.mealType;
      const status = item._id.status;
      if (headcount[meal]) {
        headcount[meal][status] = item.count;
        headcount[meal].total = headcount[meal].booked + headcount[meal].skipped;
      }
    });

    return successResponse(
      res,
      {
        date: targetDate,
        headcount
      },
      `Expected diner headcount for ${targetDate} retrieved`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBookings,
  saveBooking,
  saveBulkBookings,
  getHeadcount,
  singleBookingSchema,
  bulkBookingSchema
};
