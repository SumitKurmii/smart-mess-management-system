import React, { useState, useEffect } from 'react';
import {
  ratingsApi,
  complaintsApi,
  requestsApi,
  announcementsApi
} from '../../api/client';
import {
  Star,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Megaphone,
  CheckCircle2,
  Clock,
  Pin,
  Send,
  Calendar,
  Utensils,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';

const StudentFeedback = () => {
  const [activeTab, setActiveTab] = useState('announcements'); // announcements | ratings | complaints | requests

  // --- Announcements State ---
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  // --- Ratings State ---
  const [eligibleMeals, setEligibleMeals] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState('');
  const [ratingErrorMsg, setRatingErrorMsg] = useState('');

  // --- Complaints State ---
  const [myComplaints, setMyComplaints] = useState([]);
  const [complaintForm, setComplaintForm] = useState({
    category: 'Food Quality',
    description: '',
    mealDate: '',
    mealType: ''
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintMsg, setComplaintMsg] = useState({ text: '', type: '' });
  const [expandedComplaintId, setExpandedComplaintId] = useState(null);

  // --- Requests State ---
  const [myRequests, setMyRequests] = useState([]);
  const [requestForm, setRequestForm] = useState({
    category: 'Maintenance',
    title: '',
    description: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestMsg, setRequestMsg] = useState({ text: '', type: '' });

  // Initial Loaders
  useEffect(() => {
    loadAnnouncements();
    loadRatingsData();
    loadComplaints();
    loadRequests();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const res = await announcementsApi.getAnnouncements({ limit: 30 });
      setAnnouncements(res.data.data.announcements || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const loadRatingsData = async () => {
    try {
      const [eligibleRes, myRes] = await Promise.all([
        ratingsApi.getEligibleMeals(),
        ratingsApi.getMyRatings({ limit: 20 })
      ]);
      setEligibleMeals(eligibleRes.data.data || []);
      setMyRatings(myRes.data.data.ratings || []);
      if (eligibleRes.data.data && eligibleRes.data.data.length > 0) {
        setSelectedMeal(eligibleRes.data.data[0]);
      }
    } catch (err) {
      console.error('Failed to load ratings data:', err);
    }
  };

  const loadComplaints = async () => {
    try {
      const res = await complaintsApi.getMyComplaints({ limit: 20 });
      setMyComplaints(res.data.data.complaints || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await requestsApi.getMyRequests({ limit: 20 });
      setMyRequests(res.data.data.requests || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  // Submit Rating
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMeal) return;
    setSubmittingRating(true);
    setRatingErrorMsg('');
    setRatingSuccessMsg('');

    try {
      const res = await ratingsApi.submitRating({
        date: selectedMeal.date,
        mealType: selectedMeal.mealType,
        rating: Number(ratingScore),
        comment: ratingComment
      });

      setRatingSuccessMsg(res.data.message || 'Rating submitted successfully!');
      setRatingComment('');
      loadRatingsData();
    } catch (err) {
      setRatingErrorMsg(err.message || 'Failed to submit meal rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Submit Complaint
  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setSubmittingComplaint(true);
    setComplaintMsg({ text: '', type: '' });

    try {
      const payload = {
        category: complaintForm.category,
        description: complaintForm.description,
        mealDate: complaintForm.mealDate || null,
        mealType: complaintForm.mealType || null
      };

      const res = await complaintsApi.submitComplaint(payload);
      setComplaintMsg({ text: res.data.message || 'Complaint submitted successfully.', type: 'success' });
      setComplaintForm({
        category: 'Food Quality',
        description: '',
        mealDate: '',
        mealType: ''
      });
      loadComplaints();
    } catch (err) {
      setComplaintMsg({ text: err.message || 'Failed to submit complaint.', type: 'error' });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Submit Request
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setSubmittingRequest(true);
    setRequestMsg({ text: '', type: '' });

    try {
      const res = await requestsApi.submitRequest(requestForm);
      setRequestMsg({ text: res.data.message || 'Request submitted successfully.', type: 'success' });
      setRequestForm({
        category: 'Maintenance',
        title: '',
        description: ''
      });
      loadRequests();
    } catch (err) {
      setRequestMsg({ text: err.message || 'Failed to submit request.', type: 'error' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Feedback & Noticeboard</h1>
        <p className="text-slate-600 text-sm mt-1">
          Review official announcements, rate your attended meals, submit concerns, and track resolutions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'announcements'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Noticeboard ({announcements.length})
        </button>

        <button
          onClick={() => setActiveTab('ratings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'ratings'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Star className="w-4 h-4" />
          Meal Ratings ({eligibleMeals.length} eligible)
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'complaints'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Complaints ({myComplaints.length})
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
          Mess Requests ({myRequests.length})
        </button>
      </div>

      {/* TAB 1: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {loadingAnnouncements ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
              <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-slate-700">No announcements posted yet</p>
              <p className="text-xs text-slate-500 mt-1">Check back later for mess timings and special event notices.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann._id}
                className={`bg-white rounded-xl p-5 border transition-all shadow-sm ${
                  ann.pinned
                    ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.pinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      {ann.category}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2">{ann.title}</h3>
                <p className="text-sm text-slate-700 whitespace-pre-line mt-2 leading-relaxed">{ann.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: MEAL RATINGS */}
      {activeTab === 'ratings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rating Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              Rate Attended Meal
            </h2>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Attendance Verified:</strong> You can only rate meals for which your check-in was verified at the mess entrance.
              </span>
            </div>

            {eligibleMeals.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Utensils className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No unrated attended meals</p>
                <p className="text-xs text-slate-500 mt-1">
                  Once you attend a meal and check in, it will appear here for you to submit ratings.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Select Meal Session
                  </label>
                  <select
                    value={selectedMeal ? `${selectedMeal.date}_${selectedMeal.mealType}` : ''}
                    onChange={(e) => {
                      const found = eligibleMeals.find(
                        (m) => `${m.date}_${m.mealType}` === e.target.value
                      );
                      setSelectedMeal(found || null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {eligibleMeals.map((m) => (
                      <option key={`${m.date}_${m.mealType}`} value={`${m.date}_${m.mealType}`}>
                        {m.date} — {m.mealType.toUpperCase()} (Checked in:{' '}
                        {new Date(m.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Star Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Score (1 to 5 Stars)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingScore(star)}
                        className={`p-2 rounded-lg border transition-all ${
                          ratingScore >= star
                            ? 'bg-amber-500 border-amber-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-slate-800 ml-2">{ratingScore} / 5</span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Optional Comments (Dish quality, taste, temperature)
                  </label>
                  <textarea
                    rows={3}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Tell us what you loved or how the food could be improved..."
                    maxLength={500}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <div className="text-right text-[10px] text-slate-400">{ratingComment.length}/500</div>
                </div>

                {ratingErrorMsg && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                    {ratingErrorMsg}
                  </div>
                )}

                {ratingSuccessMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
                    {ratingSuccessMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingRating || !selectedMeal}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submittingRating ? 'Recording Rating...' : 'Submit Meal Rating'}
                </button>
              </form>
            )}
          </div>

          {/* Ratings History */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Your Rating History ({myRatings.length})
            </h2>

            {myRatings.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-sm font-medium">You haven't submitted any meal ratings yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {myRatings.map((r) => (
                  <div key={r._id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm capitalize">{r.mealType}</span>
                        <span className="text-xs text-slate-500">({r.date})</span>
                      </div>
                      <div className="flex items-center text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-slate-600 mt-2 italic bg-white p-2 rounded border border-slate-100">
                        "{r.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submit Complaint */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Submit a Complaint
            </h2>

            <form onSubmit={handleComplaintSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Category *
                </label>
                <select
                  value={complaintForm.category}
                  onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                >
                  <option value="Food Quality">Food Quality</option>
                  <option value="Hygiene">Hygiene</option>
                  <option value="Quantity">Quantity</option>
                  <option value="Service">Service</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Meal Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={complaintForm.mealDate}
                    onChange={(e) => setComplaintForm({ ...complaintForm, mealDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Meal Type (Optional)
                  </label>
                  <select
                    value={complaintForm.mealType}
                    onChange={(e) => setComplaintForm({ ...complaintForm, mealType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="">None / Any</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  maxLength={1000}
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  placeholder="Provide concrete details about the issue observed..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <div className="text-right text-[10px] text-slate-400">{complaintForm.description.length}/1000</div>
              </div>

              {complaintMsg.text && (
                <div
                  className={`p-3 text-xs rounded-lg border ${
                    complaintMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {complaintMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingComplaint}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submittingComplaint ? 'Submitting Complaint...' : 'Submit Complaint'}
              </button>
            </form>
          </div>

          {/* My Complaints List */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              My Complaints History ({myComplaints.length})
            </h2>

            {myComplaints.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No complaints logged</p>
                <p className="text-xs text-slate-500 mt-1">
                  You have not raised any active or past complaints.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {myComplaints.map((c) => (
                  <div key={c._id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                          {c.category}
                        </span>
                        {c.mealDate && (
                          <span className="text-xs text-slate-500">
                            {c.mealDate} {c.mealType && `(${c.mealType})`}
                          </span>
                        )}
                      </div>
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
                    </div>

                    <p className="text-xs text-slate-800 mt-2 font-medium">{c.description}</p>

                    {c.adminResponse && (
                      <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                        <p className="font-semibold text-blue-900">Administrator Response:</p>
                        <p className="text-blue-800 mt-0.5">{c.adminResponse}</p>
                      </div>
                    )}

                    {/* Status history dropdown */}
                    {c.statusHistory && c.statusHistory.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComplaintId(expandedComplaintId === c._id ? null : c._id)
                          }
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          {expandedComplaintId === c._id ? (
                            <>Hide Status Trail <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>View Status History ({c.statusHistory.length}) <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                        {expandedComplaintId === c._id && (
                          <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-slate-300">
                            {c.statusHistory.map((sh, idx) => (
                              <div key={idx} className="text-[11px] text-slate-600">
                                <span className="font-semibold">{sh.status}</span> —{' '}
                                {new Date(sh.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {sh.notes && <span className="italic block text-slate-500">{sh.notes}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REQUESTS */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submit Request */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              Submit Mess Request
            </h2>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Category *
                </label>
                <select
                  value={requestForm.category}
                  onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="Maintenance">Maintenance (e.g. Broken furniture, leaking taps)</option>
                  <option value="Facilities">Facilities (e.g. Water cooler, fans, seating)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  value={requestForm.title}
                  onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                  placeholder="e.g. Water cooler filter replacement"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Detailed Request *
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  maxLength={1000}
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  placeholder="Explain your facility or maintenance request..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="text-right text-[10px] text-slate-400">{requestForm.description.length}/1000</div>
              </div>

              {requestMsg.text && (
                <div
                  className={`p-3 text-xs rounded-lg border ${
                    requestMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {requestMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingRequest}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submittingRequest ? 'Submitting Request...' : 'Submit Request'}
              </button>
            </form>
          </div>

          {/* My Requests List */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              My Requests ({myRequests.length})
            </h2>

            {myRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No requests submitted</p>
                <p className="text-xs text-slate-500 mt-1">
                  Have a suggestion or need maintenance? Submit a request to the mess committee.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {myRequests.map((r) => (
                  <div key={r._id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {r.category}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
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

                    <h4 className="text-sm font-bold text-slate-900 mt-1.5">{r.title}</h4>
                    <p className="text-xs text-slate-700 mt-1">{r.description}</p>

                    {r.adminResponse && (
                      <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                        <p className="font-semibold text-blue-900">Administrator Response:</p>
                        <p className="text-blue-800 mt-0.5">{r.adminResponse}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFeedback;
