const MessRequest = require('../models/MessRequest');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { z } = require('zod');

const submitRequestSchema = z.object({
  category: z.enum(['Maintenance', 'Facilities', 'Other']),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(1000, 'Description cannot exceed 1000 characters')
});

const updateRequestSchema = z.object({
  status: z.enum(['Pending', 'In Progress', 'Resolved', 'Rejected']),
  adminResponse: z.string().trim().max(1000, 'Response cannot exceed 1000 characters').optional().default('')
});

/**
 * POST /api/requests
 * Authenticated student submits a mess/facilities request
 */
const submitRequest = async (req, res, next) => {
  try {
    const validated = submitRequestSchema.parse(req.body);

    const newRequest = await MessRequest.create({
      user: req.user._id,
      category: validated.category,
      title: validated.title,
      description: validated.description,
      status: 'Pending',
      statusHistory: [
        {
          status: 'Pending',
          changedBy: req.user._id,
          timestamp: new Date(),
          notes: 'Request submitted by student'
        }
      ]
    });

    return successResponse(
      res,
      newRequest,
      'Your request has been submitted to mess management.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/requests/my
 * Student retrieves strictly their own requests
 */
const getMyRequests = async (req, res, next) => {
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

    const [requests, total] = await Promise.all([
      MessRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('statusHistory.changedBy', 'name role')
        .populate('handledBy', 'name role'),
      MessRequest.countDocuments(query)
    ]);

    return successResponse(
      res,
      {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'User requests retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/requests/admin
 * Administrator views all requests with filters and student identity
 */
const getAdminRequests = async (req, res, next) => {
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

    const [requests, total, pendingCount, inProgressCount, resolvedCount, rejectedCount] = await Promise.all([
      MessRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email hostelRoom')
        .populate('handledBy', 'name role'),
      MessRequest.countDocuments(query),
      MessRequest.countDocuments({ status: 'Pending' }),
      MessRequest.countDocuments({ status: 'In Progress' }),
      MessRequest.countDocuments({ status: 'Resolved' }),
      MessRequest.countDocuments({ status: 'Rejected' })
    ]);

    return successResponse(
      res,
      {
        requests,
        counts: {
          total,
          pending: pendingCount,
          inProgress: inProgressCount,
          resolved: resolvedCount,
          rejected: rejectedCount
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      'All requests retrieved for administrative review'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/requests/admin/:id
 * Administrator updates request status and provides response
 */
const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = updateRequestSchema.parse(req.body);

    const requestDoc = await MessRequest.findById(id).populate('user', 'name email');
    if (!requestDoc) {
      return errorResponse(res, 'Request record not found', 404);
    }

    const previousStatus = requestDoc.status;
    requestDoc.status = validated.status;

    if (validated.adminResponse) {
      requestDoc.adminResponse = validated.adminResponse;
    }

    requestDoc.handledBy = req.user._id;

    // Append to status history
    requestDoc.statusHistory.push({
      status: validated.status,
      changedBy: req.user._id,
      timestamp: new Date(),
      notes: validated.adminResponse
        ? `Status updated from '${previousStatus}' to '${validated.status}'. Response: ${validated.adminResponse}`
        : `Status updated from '${previousStatus}' to '${validated.status}'`
    });

    await requestDoc.save();

    return successResponse(
      res,
      requestDoc,
      `Request status updated to '${validated.status}'`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRequest,
  getMyRequests,
  getAdminRequests,
  updateRequestStatus,
  submitRequestSchema,
  updateRequestSchema
};
