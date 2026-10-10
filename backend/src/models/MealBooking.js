const mongoose = require('mongoose');

const mealBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    date: {
      type: String, // Canonical YYYY-MM-DD
      required: [true, 'Booking date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must follow YYYY-MM-DD format'],
      index: true
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner'],
      required: [true, 'Meal type is required']
    },
    status: {
      type: String,
      enum: ['booked', 'skipped'],
      default: 'booked',
      required: true
    },
    bookedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: guarantees a student can have at most one booking preference per meal slot
mealBookingSchema.index({ user: 1, date: 1, mealType: 1 }, { unique: true });

// Compound index for fast aggregation of expected headcount
mealBookingSchema.index({ date: 1, mealType: 1, status: 1 });

const MealBooking = mongoose.model('MealBooking', mealBookingSchema);

module.exports = MealBooking;
