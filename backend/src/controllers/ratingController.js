const MealRating = require('../models/MealRating');
const Attendance = require('../models/Attendance');
const Menu = require('../models/Menu');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { z } = require('zod');

const submitRatingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must follow YYYY-MM-DD'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(500, 'Comment cannot exceed 500 characters').optional().default('')
});

/**
 * POST /api/ratings
 * Student submits a rating for an attended meal session
 */
const submitRating = async (req, res, next) => {
  try {
    const validated = submitRatingSchema.parse(req.body);

    // 1. Verify that the student actually attended the meal session
    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: validated.date,
      mealType: validated.mealType,
      status: 'present'
    });

    if (!attendance) {
      return errorResponse(
        res,
        `Attendance verification required: You can only rate meals you have actually attended. No verified check-in found for ${validated.mealType} on ${validated.date}.`,
        403
      );
    }

    // 2. Prevent duplicate rating by the student for this meal
    const existingRating = await MealRating.findOne({
      user: req.user._id,
      date: validated.date,
      mealType: validated.mealType
    });

    if (existingRating) {
      return errorResponse(
        res,
        `Duplicate rating: You have already submitted a rating for ${validated.mealType} on ${validated.date}.`,
        409,
        { existingRatingId: existingRating._id }
      );
    }

    // 3. Associate with the day's Menu if configured
    const menu = await Menu.findOne({
      date: validated.date,
      mealType: validated.mealType
    });

    // 4. Create and save rating
    const ratingRecord = await MealRating.create({
      user: req.user._id,
      date: validated.date,
      mealType: validated.mealType,
      rating: validated.rating,
      comment: validated.comment,
      menu: menu ? menu._id : null,
      attendance: attendance._id
    });

    return successResponse(
      res,
      ratingRecord,
      `Thank you! Your ${validated.rating}-star rating for ${validated.mealType} has been recorded.`,
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(
        res,
        'Duplicate rating: You have already submitted a rating for this meal session.',
        409
      );
    }
    next(error);
  }
};

/**
 * GET /api/ratings/my
 * Student views their own rating history
 */
const getMyRatings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    if (req.query.date) {
      query.date = req.query.date;
    }
    if (req.query.mealType) {
      query.mealType = req.query.mealType;
    }

    const [ratings, total] = await Promise.all([
      MealRating.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('menu', 'items notes'),
      MealRating.countDocuments(query)
    ]);

    return successResponse(
      res,
      {
        ratings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'User ratings retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ratings/eligible
 * Returns meals the student has attended in the past 7 days that haven't been rated yet
 */
const getEligibleMealsToRate = async (req, res, next) => {
  try {
    const attendances = await Attendance.find({
      user: req.user._id,
      status: 'present'
    })
      .sort({ date: -1, checkInTime: -1 })
      .limit(30);

    const existingRatings = await MealRating.find({
      user: req.user._id
    }).select('date mealType');

    const ratedSet = new Set(existingRatings.map(r => `${r.date}_${r.mealType}`));

    const eligible = [];
    for (const att of attendances) {
      const key = `${att.date}_${att.mealType}`;
      if (!ratedSet.has(key)) {
        eligible.push({
          date: att.date,
          mealType: att.mealType,
          checkInTime: att.checkInTime,
          attendanceId: att._id
        });
      }
    }

    return successResponse(res, eligible, 'Eligible unrated meals retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ratings/admin
 * Administrator views meal ratings with aggregate statistics
 */
const getAdminRatings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.date) query.date = req.query.date;
    if (req.query.mealType && req.query.mealType !== 'all') query.mealType = req.query.mealType;
    if (req.query.rating) query.rating = parseInt(req.query.rating, 10);

    const [ratings, total, aggregation] = await Promise.all([
      MealRating.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email hostelRoom dietaryPreference')
        .populate('menu', 'items notes'),
      MealRating.countDocuments(query),
      MealRating.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
            count1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            count2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            count3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            count4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            count5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
          }
        }
      ])
    ]);

    const stats = aggregation[0]
      ? {
          averageRating: parseFloat(aggregation[0].averageRating.toFixed(1)),
          totalRatings: aggregation[0].totalRatings,
          distribution: {
            1: aggregation[0].count1,
            2: aggregation[0].count2,
            3: aggregation[0].count3,
            4: aggregation[0].count4,
            5: aggregation[0].count5
          }
        }
      : {
          averageRating: 0,
          totalRatings: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };

    return successResponse(
      res,
      {
        ratings,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'Meal ratings and aggregate analytics retrieved'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRating,
  getMyRatings,
  getEligibleMealsToRate,
  getAdminRatings,
  submitRatingSchema
};
