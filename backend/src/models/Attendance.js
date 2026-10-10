const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student user reference is required'],
      index: true
    },
    date: {
      type: String, // Canonical YYYY-MM-DD in mess timezone (Asia/Kolkata)
      required: [true, 'Attendance date is required (YYYY-MM-DD)'],
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
    checkInTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    verificationMethod: {
      type: String,
      enum: {
        values: ['self_service', 'admin_manual'],
        message: '{VALUE} is not a valid verification method'
      },
      default: 'self_service',
      required: true
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'cancelled'],
        message: '{VALUE} is not a valid attendance status'
      },
      default: 'present',
      required: true
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator or recording administrator reference is required']
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookingReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealBooking'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    auditLog: [
      {
        action: {
          type: String,
          required: true
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        details: {
          type: String,
          default: ''
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Compound unique index: guarantees a student has at most one attendance record per meal slot
attendanceSchema.index({ user: 1, date: 1, mealType: 1 }, { unique: true });

// Compound query indexes for headcount and analytics aggregation
attendanceSchema.index({ date: 1, mealType: 1, status: 1 });
attendanceSchema.index({ user: 1, date: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
