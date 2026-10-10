const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Dish name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['main', 'curry', 'side', 'dessert', 'beverage'],
      default: 'main'
    },
    isVeg: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    allergens: {
      type: [String],
      default: []
    }
  },
  { _id: true }
);

const menuSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Canonical YYYY-MM-DD string in mess operational timezone
      required: [true, 'Menu date is required (YYYY-MM-DD)'],
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
    items: {
      type: [menuItemSchema],
      default: []
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: exactly one menu per meal type on any given date
menuSchema.index({ date: 1, mealType: 1 }, { unique: true });

const Menu = mongoose.model('Menu', menuSchema);

module.exports = Menu;
