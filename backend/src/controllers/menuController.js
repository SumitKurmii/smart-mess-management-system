const Menu = require('../models/Menu');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  getCurrentOperationalDate,
  getWeekStart,
  getWeekDates
} = require('../utils/dateUtils');
const { DateTime } = require('luxon');
const config = require('../config/env');
const { z } = require('zod');

// Schema for menu item
const menuItemSchema = z.object({
  name: z.string().min(1, 'Dish name is required').trim(),
  category: z.enum(['main', 'curry', 'side', 'dessert', 'beverage']).default('main'),
  isVeg: z.boolean().default(true),
  description: z.string().optional().default(''),
  allergens: z.array(z.string()).optional().default([])
});

// Schema for create/update menu
const menuInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  items: z.array(menuItemSchema).min(1, 'At least one menu item is required'),
  notes: z.string().optional().default('')
});

/**
 * GET /api/menu/daily?date=YYYY-MM-DD
 * Retrieves menu for all meal types on a single calendar date
 */
const getDailyMenu = async (req, res, next) => {
  try {
    const targetDate = req.query.date || getCurrentOperationalDate();

    const menus = await Menu.find({ date: targetDate }).populate('createdBy', 'name email');

    const meals = {
      breakfast: null,
      lunch: null,
      dinner: null
    };

    menus.forEach(menu => {
      meals[menu.mealType] = menu;
    });

    return successResponse(
      res,
      {
        date: targetDate,
        meals
      },
      `Daily menu for ${targetDate} retrieved`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/menu/weekly?startDate=YYYY-MM-DD
 * Retrieves 7-day menu grid starting from startDate (or current week Monday)
 */
const getWeeklyMenu = async (req, res, next) => {
  try {
    const startDate = req.query.startDate || getWeekStart();
    const dates = getWeekDates(startDate);

    const menus = await Menu.find({
      date: { $in: dates }
    }).populate('createdBy', 'name email');

    // Group by date and mealType
    const menuMap = {};
    menus.forEach(m => {
      if (!menuMap[m.date]) {
        menuMap[m.date] = {};
      }
      menuMap[m.date][m.mealType] = m;
    });

    const days = dates.map(d => {
      const dt = DateTime.fromISO(d, { zone: config.messTimezone });
      return {
        date: d,
        dayOfWeek: dt.toFormat('cccc'), // e.g. Monday
        shortDay: dt.toFormat('ccc'),   // e.g. Mon
        formattedDate: dt.toFormat('LLL dd'),
        meals: {
          breakfast: menuMap[d]?.breakfast || null,
          lunch: menuMap[d]?.lunch || null,
          dinner: menuMap[d]?.dinner || null
        }
      };
    });

    return successResponse(
      res,
      {
        startDate: dates[0],
        endDate: dates[6],
        days
      },
      'Weekly menu retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/menu
 * Admin-only: Creates or replaces a menu entry for a specific date and mealType
 */
const createOrUpdateMenu = async (req, res, next) => {
  try {
    const validated = menuInputSchema.parse(req.body);

    const menu = await Menu.findOneAndUpdate(
      { date: validated.date, mealType: validated.mealType },
      {
        ...validated,
        createdBy: req.user._id
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return successResponse(res, menu, `Menu saved for ${validated.date} (${validated.mealType})`, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/menu/:id
 * Admin-only: Removes a menu entry
 */
const deleteMenu = async (req, res, next) => {
  try {
    const deleted = await Menu.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return errorResponse(res, 'Menu entry not found', 404);
    }
    return successResponse(res, null, 'Menu entry deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyMenu,
  getWeeklyMenu,
  createOrUpdateMenu,
  deleteMenu,
  menuInputSchema
};
