import React, { useState, useEffect } from 'react';
import {
  complaintsApi,
  requestsApi,
  ratingsApi
} from '../../api/client';
import {
  AlertCircle,
  HelpCircle,
  Star,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  MessageSquare,
  User,
  Send,
  BarChart2,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';

const AdminFeedback = () => {
  const [activeTab, setActiveTab] = useState('complaints'); // complaints | requests | ratings

  // --- Complaints State ---
  const [complaints, setComplaints] = useState([]);
  const [complaintCounts, setComplaintCounts] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [complaintFilterStatus, setComplaintFilterStatus] = useState('all');
  const [complaintFilterCategory, setComplaintFilterCategory] = useState('all');
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [updatingComplaintId, setUpdatingComplaintId] = useState(null);
  const [complaintResponseDrafts, setComplaintResponseDrafts] = useState({});
  const [complaintStatusDrafts, setComplaintStatusDrafts] = useState({});
  const [complaintActionMsg, setComplaintActionMsg] = useState({});

  // --- Requests State ---
  const [requests, setRequests] = useState([]);
  const [requestFilterStatus, setRequestFilterStatus] = useState('all');
  const [requestFilterCategory, setRequestFilterCategory] = useState('all');
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [requestResponseDrafts, setRequestResponseDrafts] = useState({});
  const [requestStatusDrafts, setRequestStatusDrafts] = useState({});
  const [requestActionMsg, setRequestActionMsg] = useState({});

  // --- Ratings State ---
  const [ratings, setRatings] = useState([]);
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    totalRatings: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [ratingFilterMeal, setRatingFilterMeal] = useState('all');
  const [ratingFilterScore, setRatingFilterScore] = useState('all');
  const [loadingRatings, setLoadingRatings] = useState(false);

  useEffect(() => {
    if (activeTab === 'complaints') {
      loadComplaints();
    } else if (activeTab === 'requests') {
      loadRequests();
    } else if (activeTab === 'ratings') {
      loadRatings();
    }
  }, [
    activeTab,
    complaintFilterStatus,
    complaintFilterCategory,
    requestFilterStatus,
    requestFilterCategory,
    ratingFilterMeal,
    ratingFilterScore
  ]);

  // Load Complaints
  const loadComplaints = async () => {
    try {
      setLoadingComplaints(true);
      const res = await complaintsApi.getAdminComplaints({
        status: complaintFilterStatus,
        category: complaintFilterCategory,
        limit: 50
      });
      setComplaints(res.data.data.complaints || []);
      setComplaintCounts(res.data.data.counts || { total: 0, open: 0, inProgress: 0, resolved: 0 });
    } catch (err) {
      console.error('Failed to load admin complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Load Requests
  const loadRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await requestsApi.getAdminRequests({
        status: requestFilterStatus,
        category: requestFilterCategory,
        limit: 50
      });
      setRequests(res.data.data.requests || []);
    } catch (err) {
      console.error('Failed to load admin requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Load Ratings
  const loadRatings = async () => {
    try {
      setLoadingRatings(true);
      const params = { limit: 50 };
      if (ratingFilterMeal !== 'all') params.mealType = ratingFilterMeal;
      if (ratingFilterScore !== 'all') params.rating = ratingFilterScore;

      const res = await ratingsApi.getAdminRatings(params);
      setRatings(res.data.data.ratings || []);
      setRatingStats(
        res.data.data.stats || {
          averageRating: 0,
          totalRatings: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      );
    } catch (err) {
      console.error('Failed to load admin ratings:', err);
    } finally {
      setLoadingRatings(false);
    }
  };

  // Update Complaint Status & Response
  const handleUpdateComplaint = async (complaintId) => {
    const newStatus = complaintStatusDrafts[complaintId] || 'In Progress';
    const responseText = complaintResponseDrafts[complaintId] || '';

    try {
      setUpdatingComplaintId(complaintId);
      await complaintsApi.updateComplaintStatus(complaintId, {
        status: newStatus,
        adminResponse: responseText
      });

      setComplaintActionMsg({
        [complaintId]: { text: `Status updated to '${newStatus}'!`, type: 'success' }
      });
      loadComplaints();
    } catch (err) {
      setComplaintActionMsg({
        [complaintId]: { text: err.message || 'Failed to update complaint', type: 'error' }
      });
    } finally {
      setUpdatingComplaintId(null);
    }
  };

  // Update Request Status & Response
  const handleUpdateRequest = async (requestId) => {
    const newStatus = requestStatusDrafts[requestId] || 'In Progress';
    const responseText = requestResponseDrafts[requestId] || '';

    try {
      setUpdatingRequestId(requestId);
      await requestsApi.updateRequestStatus(requestId, {
        status: newStatus,
        adminResponse: responseText
      });

      setRequestActionMsg({
        [requestId]: { text: `Status updated to '${newStatus}'!`, type: 'success' }
      });
      loadRequests();
    } catch (err) {
      setRequestActionMsg({
        [requestId]: { text: err.message || 'Failed to update request', type: 'error' }
      });
    } finally {
      setUpdatingRequestId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Complaints & Feedback Oversight</h1>
        <p className="text-slate-600 text-sm mt-1">
          Review student complaints, action maintenance requests, and analyze aggregate meal ratings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'complaints'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Complaints ({complaintCounts.open} Open / {complaintCounts.total} Total)
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Special Requests ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab('ratings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'ratings'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Meal Ratings & Analytics ({ratingStats.totalRatings})
        </button>
      </div>

      {/* TAB 1: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Logged</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{complaintCounts.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
              <p className="text-xs font-semibold text-rose-600 uppercase">Open / Pending</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">{complaintCounts.open}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
              <p className="text-xs font-semibold text-amber-600 uppercase">In Progress</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{complaintCounts.inProgress}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
              <p className="text-xs font-semibold text-emerald-600 uppercase">Resolved</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{complaintCounts.resolved}</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 uppercase">Filters:</span>

              <select
                value={complaintFilterStatus}
                onChange={(e) => setComplaintFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={complaintFilterCategory}
                onChange={(e) => setComplaintFilterCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">All Categories</option>
                <option value="Food Quality">Food Quality</option>
                <option value="Hygiene">Hygiene</option>
                <option value="Quantity">Quantity</option>
                <option value="Service">Service</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Complaints List */}
          {loadingComplaints ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : complaints.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
              <p className="font-semibold text-slate-800">No complaints match criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((c) => (
                <div key={c._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          {c.category}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            c.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'In Progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.status}
                        </span>
                        {c.mealDate && (
                          <span className="text-xs text-slate-500">
                            Meal: {c.mealDate} {c.mealType && `(${c.mealType})`}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{c.user?.name || 'Student'}</span>
                        <span>•</span>
                        <span>{c.user?.email}</span>
                        {c.user?.hostelRoom && (
                          <>
                            <span>•</span>
                            <span>Room: {c.user?.hostelRoom}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Complaint Description */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-800">
                    <p className="font-semibold text-slate-900 mb-1">Student Issue:</p>
                    <p className="leading-relaxed">{c.description}</p>
                  </div>

                  {/* Current Admin Response if any */}
                  {c.adminResponse && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                      <p className="font-semibold text-blue-900">Recorded Official Response:</p>
                      <p className="text-blue-800 mt-0.5 leading-relaxed">{c.adminResponse}</p>
                    </div>
                  )}

                  {/* Resolution Controls */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Update Status
                      </label>
                      <select
                        value={complaintStatusDrafts[c._id] || c.status}
                        onChange={(e) =>
                          setComplaintStatusDrafts({
                            ...complaintStatusDrafts,
                            [c._id]: e.target.value
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>

                    <div className="md:col-span-7">
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Official Response / Action Taken
                      </label>
                      <input
                        type="text"
                        placeholder="Provide resolution details or action taken..."
                        value={
                          complaintResponseDrafts[c._id] !== undefined
                            ? complaintResponseDrafts[c._id]
                            : c.adminResponse || ''
                        }
                        onChange={(e) =>
                          setComplaintResponseDrafts({
                            ...complaintResponseDrafts,
                            [c._id]: e.target.value
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        onClick={() => handleUpdateComplaint(c._id)}
                        disabled={updatingComplaintId === c._id}
                        className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>

                  {complaintActionMsg[c._id] && (
                    <p
                      className={`text-[11px] font-semibold ${
                        complaintActionMsg[c._id].type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {complaintActionMsg[c._id].text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 uppercase">Filters:</span>

              <select
                value={requestFilterStatus}
                onChange={(e) => setRequestFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={requestFilterCategory}
                onChange={(e) => setRequestFilterCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Facilities">Facilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Requests List */}
          {loadingRequests ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-blue-400 mb-2" />
              <p className="font-semibold text-slate-800">No requests match criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {r.category}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'In Progress'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{r.title}</h3>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{r.user?.name || 'Student'}</span>
                        <span>•</span>
                        <span>{r.user?.email}</span>
                        {r.user?.hostelRoom && (
                          <>
                            <span>•</span>
                            <span>Room: {r.user?.hostelRoom}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-800">
                    <p className="leading-relaxed">{r.description}</p>
                  </div>

                  {r.adminResponse && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                      <p className="font-semibold text-blue-900">Recorded Official Response:</p>
                      <p className="text-blue-800 mt-0.5 leading-relaxed">{r.adminResponse}</p>
                    </div>
                  )}

                  {/* Resolution Controls */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Update Status
                      </label>
                      <select
                        value={requestStatusDrafts[r._id] || r.status}
                        onChange={(e) =>
                          setRequestStatusDrafts({
                            ...requestStatusDrafts,
                            [r._id]: e.target.value
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="md:col-span-7">
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Admin Note / Response
                      </label>
                      <input
                        type="text"
                        placeholder="Provide details or expected resolution date..."
                        value={
                          requestResponseDrafts[r._id] !== undefined
                            ? requestResponseDrafts[r._id]
                            : r.adminResponse || ''
                        }
                        onChange={(e) =>
                          setRequestResponseDrafts({
                            ...requestResponseDrafts,
                            [r._id]: e.target.value
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        onClick={() => handleUpdateRequest(r._id)}
                        disabled={updatingRequestId === r._id}
                        className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>

                  {requestActionMsg[r._id] && (
                    <p
                      className={`text-[11px] font-semibold ${
                        requestActionMsg[r._id].type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {requestActionMsg[r._id].text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RATINGS & ANALYTICS */}
      {activeTab === 'ratings' && (
        <div className="space-y-6">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Average Meal Satisfaction
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-4xl font-extrabold text-amber-500">
                  {ratingStats.averageRating}
                </span>
                <div className="flex text-amber-400">
                  <Star className="w-8 h-8 fill-current" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Based on {ratingStats.totalRatings} verified attendance ratings
              </p>
            </div>

            {/* Distribution Bars */}
            <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Rating Breakdown (1 to 5 Stars)</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingStats.distribution[star] || 0;
                  const pct =
                    ratingStats.totalRatings > 0
                      ? Math.round((count / ratingStats.totalRatings) * 100)
                      : 0;

                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <div className="w-12 font-bold text-slate-700 flex items-center gap-1">
                        {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-slate-600 font-semibold">
                        {count} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 uppercase">Filters:</span>

              <select
                value={ratingFilterMeal}
                onChange={(e) => setRatingFilterMeal(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>

              <select
                value={ratingFilterScore}
                onChange={(e) => setRatingFilterScore(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Scores</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          {/* Ratings List */}
          {loadingRatings ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : ratings.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
              <Star className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-800">No ratings submitted matching criteria</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Date & Meal</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Feedback / Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ratings.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800 capitalize">{r.mealType}</p>
                          <p className="text-slate-500 text-[11px]">{r.date}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{r.user?.name || 'Student'}</p>
                          <p className="text-slate-500 text-[11px]">
                            {r.user?.hostelRoom ? `Room: ${r.user?.hostelRoom}` : r.user?.email}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                }`}
                              />
                            ))}
                            <span className="ml-1.5 font-bold text-slate-800">{r.rating}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {r.comment ? (
                            <p className="text-slate-700 italic">"{r.comment}"</p>
                          ) : (
                            <span className="text-slate-400 italic">No comment provided</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
