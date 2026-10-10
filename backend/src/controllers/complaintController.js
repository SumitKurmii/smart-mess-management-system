const Complaint = require('../models/Complaint');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { z } = require('zod');

const submitComplaintSchema = z.object({
  category: z.enum(['Food Quality', 'Hygiene', 'Quantity', 'Service', 'Other']),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(1000, 'Description cannot exceed 1000 characters'),
  mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must follow YYYY-MM-DD').optional().nullable(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']).optional().nullable()
});

const updateComplaintSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Resolved']),
  adminResponse: z.string().trim().max(1000, 'Response cannot exceed 1000 characters').optional().default('')
});

/**
 * POST /api/complaints
 * Authenticated student submits a complaint
 */
const submitComplaint = async (req, res, next) => {
  try {
    const validated = submitComplaintSchema.parse(req.body);

    const complaint = await Complaint.create({
      user: req.user._id,
      category: validated.category,
      description: validated.description,
      mealDate: validated.mealDate || null,
      mealType: validated.mealType || null,
      status: 'Open',
      statusHistory: [
        {
          status: 'Open',
          changedBy: req.user._id,
          timestamp: new Date(),
          notes: 'Complaint submitted by student'
        }
      ]
    });

    return successResponse(
      res,
      complaint,
      'Your complaint has been submitted. Our mess management team will review and respond promptly.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/my
 * Student retrieves strictly their own complaints (Strict student isolation)
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('statusHistory.changedBy', 'name role')
        .populate('resolvedBy', 'name role'),
      Complaint.countDocuments(query)
    ]);

    return successResponse(
      res,
      {
        complaints,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'User complaints retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/admin
 * Administrator views all complaints with filters and student identity
 */
const getAdminComplaints = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const [complaints, total, openCount, inProgressCount, resolvedCount] = await Promise.all([
      Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email hostelRoom')
        .populate('resolvedBy', 'name role'),
      Complaint.countDocuments(query),
      Complaint.countDocuments({ status: 'Open' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Resolved' })
    ]);

    return successResponse(
      res,
      {
        complaints,
        counts: {
          total,
          open: openCount,
          inProgress: inProgressCount,
          resolved: resolvedCount
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'All complaints retrieved for administrative review'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/complaints/admin/:id
 * Administrator updates complaint status and provides official response
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = updateComplaintSchema.parse(req.body);

    const complaint = await Complaint.findById(id).populate('user', 'name email');
    if (!complaint) {
      return errorResponse(res, 'Complaint record not found', 404);
    }

    const previousStatus = complaint.status;
    complaint.status = validated.status;

    if (validated.adminResponse) {
      complaint.adminResponse = validated.adminResponse;
    }

    if (validated.status === 'Resolved') {
      complaint.resolvedBy = req.user._id;
      complaint.resolvedAt = new Date();
    }

    // Append to status history audit trail
    complaint.statusHistory.push({
      status: validated.status,
      changedBy: req.user._id,
      timestamp: new Date(),
      notes: validated.adminResponse
        ? `Status changed from '${previousStatus}' to '${validated.status}'. Response: ${validated.adminResponse}`
        : `Status changed from '${previousStatus}' to '${validated.status}'`
    });

    await complaint.save();

    return successResponse(
      res,
      complaint,
      `Complaint status updated to '${validated.status}' with official administrator response`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitComplaint,
  getMyComplaints,
  getAdminComplaints,
  updateComplaintStatus,
  submitComplaintSchema,
  updateComplaintSchema
};
