const Announcement = require('../models/Announcement');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { z } = require('zod');

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title cannot exceed 150 characters'),
  content: z.string().trim().min(5, 'Content must be at least 5 characters').max(3000, 'Content cannot exceed 3000 characters'),
  category: z.enum(['General', 'Menu Change', 'Timing', 'Special Event']).optional().default('General'),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  pinned: z.boolean().optional().default(false)
});

const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title cannot exceed 150 characters').optional(),
  content: z.string().trim().min(5, 'Content must be at least 5 characters').max(3000, 'Content cannot exceed 3000 characters').optional(),
  category: z.enum(['General', 'Menu Change', 'Timing', 'Special Event']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  pinned: z.boolean().optional()
});

/**
 * GET /api/announcements
 * Authenticated users (students & staff) retrieve published announcements
 */
const getPublishedAnnouncements = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { status: 'published' };
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ pinned: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name role'),
      Announcement.countDocuments(query)
    ]);

    return successResponse(
      res,
      {
        announcements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'Published announcements retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/announcements/admin
 * Administrator views all announcements (drafts, published, archived)
 */
const getAdminAnnouncements = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name role')
        .populate('updatedBy', 'name role'),
      Announcement.countDocuments(query)
    ]);

    return successResponse(
      res,
      {
        announcements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'All announcements retrieved for administrative management'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/announcements
 * Administrator creates a new announcement
 */
const createAnnouncement = async (req, res, next) => {
  try {
    const validated = createAnnouncementSchema.parse(req.body);

    const announcement = await Announcement.create({
      title: validated.title,
      content: validated.content,
      category: validated.category,
      status: validated.status,
      pinned: validated.pinned,
      publishedAt: validated.status === 'published' ? new Date() : null,
      createdBy: req.user._id
    });

    return successResponse(
      res,
      announcement,
      `Announcement '${validated.title}' created successfully (${validated.status})`,
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/announcements/:id
 * Administrator edits or updates status of an announcement
 */
const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = updateAnnouncementSchema.parse(req.body);

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return errorResponse(res, 'Announcement not found', 404);
    }

    // If publishing for the first time
    if (validated.status === 'published' && announcement.status !== 'published') {
      announcement.publishedAt = new Date();
    }

    Object.assign(announcement, validated);
    announcement.updatedBy = req.user._id;

    await announcement.save();

    return successResponse(
      res,
      announcement,
      `Announcement '${announcement.title}' updated successfully`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/announcements/:id
 * Administrator deletes or archives an announcement
 */
const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      return errorResponse(res, 'Announcement not found', 404);
    }

    return successResponse(
      res,
      { id: announcement._id },
      'Announcement permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublishedAnnouncements,
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createAnnouncementSchema,
  updateAnnouncementSchema
};
