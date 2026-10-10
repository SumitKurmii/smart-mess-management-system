const mongoose = require('mongoose');

const systemRuleSchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner'],
      required: true,
      unique: true
    },
    // Cutoff rule: offset in days relative to meal date (-1 = previous day, 0 = same day)
    daysOffset: {
      type: Number,
      required: true,
      default: function () {
        return this.mealType === 'breakfast' ? -1 : 0;
      }
    },
    // Cutoff hour (24-hour format in mess timezone)
    cutoffHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
      default: function () {
        if (this.mealType === 'breakfast') return 22;
        if (this.mealType === 'lunch') return 9;
        return 16; // dinner
      }
    },
    // Cutoff minute
    cutoffMinute: {
      type: Number,
      required: true,
      min: 0,
      max: 59,
      default: 0
    },
    // Meal service window for check-ins
    windowStart: {
      type: String,
      required: true,
      default: function () {
        if (this.mealType === 'breakfast') return '07:30';
        if (this.mealType === 'lunch') return '12:30';
        return '19:30'; // dinner
      }
    },
    windowEnd: {
      type: String,
      required: true,
      default: function () {
        if (this.mealType === 'breakfast') return '09:30';
        if (this.mealType === 'lunch') return '14:30';
        return '21:30'; // dinner
      }
    },
    isBookingEnabled: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const SystemRule = mongoose.model('SystemRule', systemRuleSchema);

module.exports = SystemRule;
