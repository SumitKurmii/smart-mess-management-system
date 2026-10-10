const SystemRule = require('../models/SystemRule');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { z } = require('zod');

// Default rule blueprints
const DEFAULT_RULES = [
  {
    mealType: 'breakfast',
    daysOffset: -1,
    cutoffHour: 22,
    cutoffMinute: 0,
    windowStart: '07:30',
    windowEnd: '09:30',
    isBookingEnabled: true,
    requireBookingForCheckIn: false
  },
  {
    mealType: 'lunch',
    daysOffset: 0,
    cutoffHour: 9,
    cutoffMinute: 0,
    windowStart: '12:30',
    windowEnd: '14:30',
    isBookingEnabled: true,
    requireBookingForCheckIn: false
  },
  {
    mealType: 'dinner',
    daysOffset: 0,
    cutoffHour: 16,
    cutoffMinute: 0,
    windowStart: '19:30',
    windowEnd: '21:30',
    isBookingEnabled: true,
    requireBookingForCheckIn: false
  }
];

/**
 * Ensures system rules exist in the database, seeding defaults if missing
 */
const ensureSystemRules = async () => {
  const existing = await SystemRule.find();
  if (existing.length < 3) {
    for (const def of DEFAULT_RULES) {
      const exists = existing.find(r => r.mealType === def.mealType);
      if (!exists) {
        await SystemRule.create(def);
      }
    }
  }
  return SystemRule.find().sort({ mealType: 1 });
};

/**
 * GET /api/config/rules
 * Returns active mess booking deadlines and meal windows
 */
const getRules = async (req, res, next) => {
  try {
    const rules = await ensureSystemRules();
    return successResponse(res, rules, 'System booking rules retrieved');
  } catch (error) {
    next(error);
  }
};

const updateRuleSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  daysOffset: z.number().int().min(-2).max(1),
  cutoffHour: z.number().int().min(0).max(23),
  cutoffMinute: z.number().int().min(0).max(59),
  windowStart: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  windowEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  isBookingEnabled: z.boolean().optional().default(true),
  requireBookingForCheckIn: z.boolean().optional().default(false)
});

/**
 * PUT /api/config/rules
 * Admin-only: Update booking rules and meal cutoff parameters
 */
const updateRules = async (req, res, next) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const item of updates) {
      const validated = updateRuleSchema.parse(item);
      const updated = await SystemRule.findOneAndUpdate(
        { mealType: validated.mealType },
        { ...validated, updatedBy: req.user._id },
        { upsert: true, new: true, runValidators: true }
      );
      results.push(updated);
    }

    return successResponse(res, results, 'Booking rules updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRules,
  updateRules,
  ensureSystemRules
};
