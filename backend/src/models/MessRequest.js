const mongoose = require('mongoose');

const requestHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const messRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student creator reference is required'],
      index: true
    },
    category: {
      type: String,
      enum: {
        values: ['Maintenance', 'Facilities', 'Other'],
        message: '{VALUE} is not a valid request category'
      },
      required: [true, 'Request category is required']
    },
    title: {
      type: String,
      required: [true, 'Request title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Request description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
      required: true,
      index: true
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [1000, 'Response cannot exceed 1000 characters'],
      default: ''
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statusHistory: {
      type: [requestHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

messRequestSchema.index({ user: 1, createdAt: -1 });
messRequestSchema.index({ status: 1, createdAt: -1 });

const MessRequest = mongoose.model('MessRequest', messRequestSchema);

module.exports = MessRequest;
