const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
      minlength: [5, 'Content must be at least 5 characters'],
      maxlength: [3000, 'Content cannot exceed 3000 characters']
    },
    category: {
      type: String,
      enum: {
        values: ['General', 'Menu Change', 'Timing', 'Special Event'],
        message: '{VALUE} is not a valid announcement category'
      },
      default: 'General'
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      required: true,
      index: true
    },
    pinned: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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

announcementSchema.index({ status: 1, pinned: -1, publishedAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
