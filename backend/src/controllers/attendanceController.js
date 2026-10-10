const Attendance = require('../models/Attendance');
const MealBooking = require('../models/MealBooking');
const SystemRule = require('../models/SystemRule');
const User = require('../models/User');
const config = require('../config/env');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  getCurrentOperationalDate,
  isWithinMealWindow,
  getMealSessionLifecycle,
  DEFAULT_SERVICE_WINDOWS
} = require('../utils/dateUtils');
const { z } = require('zod');

// Helper to determine effective current instant (permits deterministic instant injection during tests)
const getEffectiveCurrentTime = (req) => {
  if (config.nodeEnv === 'test' && req.headers['x-test-current-time']) {
    return new Date(req.headers['x-test-current-time']);
  }
  return new Date();
};

// Validation Schemas
const checkInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must follow YYYY-MM-DD').optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner'])
});

const adminRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must follow YYYY-MM-DD'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default('')
});

const correctAttendanceSchema = z.object({
  status: z.enum(['present', 'cancelled']),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default('')
});

/**
 * POST /api/attendance/check-in
 * Student self-service check-in for an eligible meal session
 */
const checkIn = async (req, res, next) => {
  try {
    const validated = checkInSchema.parse(req.body);
    const now = getEffectiveCurrentTime(req);
    const targetDate = validated.date || getCurrentOperationalDate();
    const mealType = validated.mealType;

    // 1. Load active rule or fallback to defaults
    const rule = await SystemRule.findOne({ mealType });

    // 2. Enforce meal service window in Asia/Kolkata timezone
    const windowCheck = isWithinMealWindow(targetDate, mealType, now, rule);
    if (!windowCheck.allowed) {
      return errorResponse(res, windowCheck.message, 400, {
        reason: windowCheck.reason,
        startInstant: windowCheck.startInstant,
        endInstant: windowCheck.endInstant,
        windowStart: windowCheck.windowStartStr,
        windowEnd: windowCheck.windowEndStr
      });
    }

    // 3. Check existing booking policy for the student
    const existingBooking = await MealBooking.findOne({
      user: req.user._id,
      date: targetDate,
      mealType
    });

    if (existingBooking && existingBooking.status === 'skipped') {
      return errorResponse(
        res,
        `Check-in not permitted: You marked this meal as skipped. Please speak with mess staff for walk-in assistance.`,
        400,
        { bookingStatus: 'skipped' }
      );
    }

    if (!existingBooking && rule?.requireBookingForCheckIn === true) {
      return errorResponse(
        res,
        `Check-in not permitted: Active pre-booking is required for ${mealType} on ${targetDate}.`,
        400,
        { bookingRequired: true }
      );
    }

    // 4. Duplicate attendance prevention (check existing record)
    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      date: targetDate,
      mealType
    });

    if (existingAttendance) {
      if (existingAttendance.status === 'present') {
        return errorResponse(
          res,
          `Attendance has already been recorded for ${mealType} on ${targetDate}.`,
          409,
          {
            attendanceId: existingAttendance._id,
            checkInTime: existingAttendance.checkInTime,
            status: existingAttendance.status
          }
        );
      } else {
        return errorResponse(
          res,
          `Attendance for this slot was previously cancelled by staff. Please contact mess administrator.`,
          409,
          {
            attendanceId: existingAttendance._id,
            status: existingAttendance.status
          }
        );
      }
    }

    // 5. Create new attendance record
    const attendance = await Attendance.create({
      user: req.user._id,
      date: targetDate,
      mealType,
      checkInTime: now,
      verificationMethod: 'self_service',
      status: 'present',
      recordedBy: req.user._id,
      bookingReference: existingBooking ? existingBooking._id : null,
      notes: existingBooking ? 'Pre-booked diner check-in' : 'Walk-in diner check-in',
      auditLog: [
        {
          action: 'created',
          performedBy: req.user._id,
          timestamp: now,
          details: `Self-service check-in recorded via web application`
        }
      ]
    });

    return successResponse(
      res,
      attendance,
      `Check-in recorded successfully for ${mealType} on ${targetDate}! Welcome to the mess.`,
      201
    );
  } catch (error) {
    // Handle concurrent duplicate key exception from compound unique index
    if (error.code === 11000) {
      return errorResponse(
        res,
        'Attendance has already been recorded for this meal slot.',
        409
      );
    }
    next(error);
  }
};

/**
 * POST /api/attendance/admin/record
 * Administrator records attendance for a specific student
 */
const recordAdminAttendance = async (req, res, next) => {
  try {
    const validated = adminRecordSchema.parse(req.body);
    const now = getEffectiveCurrentTime(req);

    // 1. Verify target student exists and has 'student' role
    const student = await User.findById(validated.studentId);
    if (!student || student.role !== 'student') {
      return errorResponse(res, 'Valid student record not found for attendance recording.', 400);
    }

    // 2. Prevent duplicate attendance
    const existing = await Attendance.findOne({
      user: student._id,
      date: validated.date,
      mealType: validated.mealType
    });

    if (existing) {
      return errorResponse(
        res,
        `Attendance already exists for ${student.name} on ${validated.date} (${validated.mealType}). Current status: '${existing.status}'.`,
        409,
        { existingId: existing._id, status: existing.status }
      );
    }

    // 3. Link booking if one exists
    const booking = await MealBooking.findOne({
      user: student._id,
      date: validated.date,
      mealType: validated.mealType
    });

    // 4. Create manual attendance record
    const attendance = await Attendance.create({
      user: student._id,
      date: validated.date,
      mealType: validated.mealType,
      checkInTime: now,
      verificationMethod: 'admin_manual',
      status: 'present',
      recordedBy: req.user._id,
      bookingReference: booking ? booking._id : null,
      notes: validated.notes || 'Recorded manually by administrator',
      auditLog: [
        {
          action: 'created',
          performedBy: req.user._id,
          timestamp: now,
          details: `Manual attendance recorded by admin (${req.user.name}) with notes: '${validated.notes || 'None'}'`
        }
      ]
    });

    return successResponse(
      res,
      attendance,
      `Attendance manually recorded for ${student.name} (${validated.mealType})`,
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(
        res,
        'Attendance has already been recorded for this student and meal slot.',
        409
      );
    }
    next(error);
  }
};

/**
 * PUT /api/attendance/admin/:id
 * Administrator corrects attendance status or notes with complete audit trail
 */
const correctAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = correctAttendanceSchema.parse(req.body);
    const now = getEffectiveCurrentTime(req);

    const attendance = await Attendance.findById(id).populate('user', 'name email hostelRoom');
    if (!attendance) {
      return errorResponse(res, 'Attendance record not found', 404);
    }

    const previousStatus = attendance.status;
    const previousNotes = attendance.notes;

    attendance.status = validated.status;
    attendance.updatedBy = req.user._id;
    if (validated.notes !== undefined) {
      attendance.notes = validated.notes;
    }

    // Append to audit trail
    attendance.auditLog.push({
      action: 'correction',
      performedBy: req.user._id,
      timestamp: now,
      details: `Status changed from '${previousStatus}' to '${validated.status}'. Notes updated: '${validated.notes || previousNotes}'. Performed by admin: ${req.user.name}`
    });

    await attendance.save();

    return successResponse(
      res,
      attendance,
      `Attendance record for ${attendance.user?.name || 'student'} updated to '${validated.status}'`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/my
 * Student retrieves their personal attendance history with pagination
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    if (req.query.startDate && req.query.endDate) {
      query.date = { $gte: req.query.startDate, $lte: req.query.endDate };
    } else if (req.query.date) {
      query.date = req.query.date;
    }

    if (req.query.mealType) {
      query.mealType = req.query.mealType;
    }

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recordedBy', 'name role')
        .populate('updatedBy', 'name role'),
      Attendance.countDocuments(query)
    ]);

    return successResponse(
      res,
      {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'User attendance history retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/admin/list
 * Admin views attendance records for a selected date and meal type with search/filter
 */
const getAdminAttendance = async (req, res, next) => {
  try {
    const targetDate = req.query.date || getCurrentOperationalDate();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const query = { date: targetDate };

    if (req.query.mealType && req.query.mealType !== 'all') {
      query.mealType = req.query.mealType;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    // Optional student search by name, email, or room number
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }, { hostelRoom: searchRegex }]
      }).select('_id');
      query.user = { $in: matchingUsers.map(u => u._id) };
    }

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email hostelRoom dietaryPreference')
        .populate('recordedBy', 'name role')
        .populate('updatedBy', 'name role'),
      Attendance.countDocuments(query)
    ]);

    return successResponse(
      res,
      {
        date: targetDate,
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      `Attendance records for ${targetDate} retrieved`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/admin/analytics
 * Aggregates expected diners, actual diners, difference, and attendance rate per meal session
 */
const getAttendanceAnalytics = async (req, res, next) => {
  try {
    const targetDate = req.query.date || getCurrentOperationalDate();
    const now = getEffectiveCurrentTime(req);
    const meals = ['breakfast', 'lunch', 'dinner'];

    // 1. Fetch expected bookings, actual attendances, cancelled records, and active system rules in parallel
    const [bookingsAggregation, attendanceAggregation, cancelledAggregation, dbRules] = await Promise.all([
      MealBooking.aggregate([
        { $match: { date: targetDate, status: 'booked' } },
        { $group: { _id: '$mealType', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: { date: targetDate, status: 'present' } },
        { $group: { _id: '$mealType', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: { date: targetDate, status: 'cancelled' } },
        { $group: { _id: '$mealType', count: { $sum: 1 } } }
      ]),
      SystemRule.find()
    ]);

    const rulesMap = {};
    dbRules.forEach(r => {
      rulesMap[r.mealType] = r;
    });

    const expectedMap = {};
    bookingsAggregation.forEach(item => {
      expectedMap[item._id] = item.count;
    });

    const actualMap = {};
    attendanceAggregation.forEach(item => {
      actualMap[item._id] = item.count;
    });

    const cancelledMap = {};
    cancelledAggregation.forEach(item => {
      cancelledMap[item._id] = item.count;
    });

    // 2. Compute session metrics
    const sessions = {};
    let totalExpected = 0;
    let totalActual = 0;
    let totalCancelled = 0;
    let totalPending = 0;
    let totalNoShows = 0;
    let totalWalkIns = 0;

    meals.forEach(meal => {
      const expected = expectedMap[meal] || 0;
      const actual = actualMap[meal] || 0;
      const cancelled = cancelledMap[meal] || 0;
      const difference = actual - expected;

      // Rate is only defined when expected > 0
      const isRateAvailable = expected > 0;
      const attendanceRate = isRateAvailable
        ? parseFloat(((actual / expected) * 100).toFixed(1))
        : null;

      // Derive meal lifecycle state based on configured SystemRule window and operational time
      const rule = rulesMap[meal];
      const lifecycle = getMealSessionLifecycle(targetDate, meal, now, rule);

      // Classify difference semantically according to window completion
      let differenceType;
      let differenceLabel;
      let pendingCount = 0;
      let noShowCount = 0;
      let walkInCount = 0;

      if (expected === 0) {
        if (actual === 0) {
          differenceType = 'no_bookings';
          differenceLabel = '0 (No bookings)';
        } else {
          differenceType = 'walk_ins';
          differenceLabel = `+${actual} (Walk-ins)`;
          walkInCount = actual;
        }
      } else {
        if (actual > expected) {
          walkInCount = actual - expected;
          differenceType = 'walk_ins';
          differenceLabel = `+${walkInCount} (Walk-ins)`;
        } else if (actual === expected) {
          differenceType = 'exact';
          differenceLabel = '0 (Exact)';
        } else {
          // Deficit: expected > actual
          const deficit = expected - actual;
          if (lifecycle.status === 'completed') {
            noShowCount = deficit;
            differenceType = 'no_shows';
            differenceLabel = `-${deficit} (No-shows)`;
          } else {
            // Service window has not ended yet: 'upcoming' or 'in_progress'
            pendingCount = deficit;
            differenceType = 'pending';
            differenceLabel = `-${deficit} (Attendance pending)`;
          }
        }
      }

      sessions[meal] = {
        mealType: meal,
        expectedDiners: expected,
        actualDiners: actual,
        cancelledDiners: cancelled,
        difference,
        attendanceRate,
        isRateAvailable,
        windowStatus: lifecycle.status, // 'upcoming' | 'in_progress' | 'completed'
        windowStatusLabel: lifecycle.label, // 'Upcoming' | 'In progress' | 'Completed'
        windowStart: lifecycle.windowStartStr,
        windowEnd: lifecycle.windowEndStr,
        differenceType,
        differenceLabel,
        pendingCount,
        noShowCount,
        walkInCount,
        statusLabel: isRateAvailable ? `${attendanceRate}%` : (actual > 0 ? 'Walk-ins Only (No Bookings)' : 'No Bookings Recorded')
      };

      totalExpected += expected;
      totalActual += actual;
      totalCancelled += cancelled;
      totalPending += pendingCount;
      totalNoShows += noShowCount;
      totalWalkIns += walkInCount;
    });

    // 3. Compute overall day aggregate
    const totalDifference = totalActual - totalExpected;
    const isTotalRateAvailable = totalExpected > 0;
    const totalAttendanceRate = isTotalRateAvailable
      ? parseFloat(((totalActual / totalExpected) * 100).toFixed(1))
      : null;

    const summary = {
      date: targetDate,
      totalExpected,
      totalActual,
      totalCancelled,
      totalDifference,
      totalPending,
      totalNoShows,
      totalWalkIns,
      totalAttendanceRate,
      isTotalRateAvailable,
      overallStatusLabel: isTotalRateAvailable
        ? `${totalAttendanceRate}%`
        : (totalActual > 0 ? 'Walk-ins Only' : 'No Bookings Recorded')
    };

    return successResponse(
      res,
      {
        date: targetDate,
        sessions,
        summary
      },
      `Meal attendance and waste analytics for ${targetDate} retrieved`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/admin/students
 * Admin helper to search/list students for manual check-in
 */
const getStudentsList = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const query = { role: 'student', isActive: true };
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { hostelRoom: regex }];
    }
    const students = await User.find(query)
      .select('_id name email hostelRoom dietaryPreference')
      .sort({ name: 1 })
      .limit(50);

    return successResponse(res, students, 'Students list retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  recordAdminAttendance,
  correctAttendance,
  getMyAttendance,
  getAdminAttendance,
  getAttendanceAnalytics,
  getStudentsList,
  checkInSchema,
  adminRecordSchema,
  correctAttendanceSchema
};
