const mongoose = require('mongoose');

const mealRatingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student user reference is required'],
      index: true
    },
    date: {
      type: String, // Canonical YYYY-MM-DD
      required: [true, 'Meal date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must follow YYYY-MM-DD format'],
      index: true
    },
    mealType: {
      type: String,
      enum: {
        values: ['breakfast', 'lunch', 'dinner'],
        message: '{VALUE} is not a valid meal type'
      },
      required: [true, 'Meal type is required']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      default: ''
    },
    menu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu'
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: [true, 'Attendance verification reference is required']
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: guarantees a student can rate each meal session at most once
mealRatingSchema.index({ user: 1, date: 1, mealType: 1 }, { unique: true });

// Compound query indexes for analytics and session aggregation
mealRatingSchema.index({ date: 1, mealType: 1 });
mealRatingSchema.index({ user: 1, date: -1 });

const MealRating = mongoose.model('MealRating', mealRatingSchema);

module.exports = MealRating;
