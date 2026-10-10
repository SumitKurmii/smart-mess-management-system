import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/client';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  Search,
  Filter,
  PlusCircle,
  Edit3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner'
};

const AttendanceManagement = () => {
  // Today's canonical date in Asia/Kolkata
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [mealFilter, setMealFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Analytics & records state
  const [analytics, setAnalytics] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Manual record form
  const [studentsList, setStudentsList] = useState([]);
  const [manualForm, setManualForm] = useState({
    studentId: '',
    mealType: 'lunch',
    notes: ''
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  // Correction form
  const [correctionForm, setCorrectionForm] = useState({
    status: 'present',
    notes: ''
  });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const [analyticsRes, recordsRes] = await Promise.all([
        attendanceApi.getAnalytics(selectedDate),
        attendanceApi.getAdminAttendance({
          date: selectedDate,
          mealType: mealFilter !== 'all' ? mealFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
          page,
          limit: pagination.limit
        })
      ]);

      setAnalytics(analyticsRes.data.data);
      setRecords(recordsRes.data.data.records || []);
      setPagination(recordsRes.data.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch attendance data.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [selectedDate, mealFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData(1);
  };

  // Open manual record modal and load eligible students
  const openManualModal = async () => {
    setIsManualModalOpen(true);
    setManualForm({ studentId: '', mealType: 'lunch', notes: '' });
    try {
      const res = await attendanceApi.getStudentsList();
      setStudentsList(res.data.data || []);
      if (res.data.data && res.data.data.length > 0) {
        setManualForm(prev => ({ ...prev, studentId: res.data.data[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.studentId) return;

    setSubmittingManual(true);
    try {
      await attendanceApi.recordAdminAttendance({
        studentId: manualForm.studentId,
        date: selectedDate,
        mealType: manualForm.mealType,
        notes: manualForm.notes
      });

      setFeedback({
        type: 'success',
        message: 'Attendance recorded successfully for student!'
      });
      setIsManualModalOpen(false);
      fetchData(pagination.page);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to record manual attendance.'
      });
    } finally {
      setSubmittingManual(false);
    }
  };

  // Open correction modal
  const openCorrectionModal = (record) => {
    setSelectedRecord(record);
    setCorrectionForm({
      status: record.status,
      notes: record.notes || ''
    });
    setIsCorrectionModalOpen(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setSubmittingCorrection(true);
    try {
      await attendanceApi.correctAttendance(selectedRecord._id, {
        status: correctionForm.status,
        notes: correctionForm.notes
      });

      setFeedback({
        type: 'success',
        message: 'Attendance record updated and audit trail logged.'
      });
      setIsCorrectionModalOpen(false);
      fetchData(pagination.page);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update attendance record.'
      });
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" /> Administrative Attendance Oversight
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Actual Attendance & Headcount</h1>
          <p className="mt-1 text-slate-300 text-sm max-w-xl">
            Monitor real diner turnout against pre-booked numbers, log manual check-ins, resolve discrepancy audits, and evaluate session attendance rates.
          </p>
        </div>

        {/* Date Selector & Manual Entry Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 px-3.5 border border-white/20 flex items-center gap-2 text-white">
            <Calendar className="w-4 h-4 text-indigo-300 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={openManualModal}
            className="py-2.5 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Record Walk-in / Manual
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-semibold">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Expected vs Actual Analytics Summary Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" /> Expected vs Actual Headcount ({selectedDate})
          </h2>
          <button
            onClick={() => fetchData(pagination.page)}
            className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {['breakfast', 'lunch', 'dinner'].map((meal) => {
            const session = analytics?.sessions?.[meal];
            const diff = session?.difference || 0;

            return (
              <div
                key={meal}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{MEAL_LABELS[meal]}</span>
                      {session?.windowStatus && (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            session.windowStatus === 'in_progress'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                              : session.windowStatus === 'upcoming'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {session.windowStatusLabel || (session.windowStatus === 'in_progress' ? 'In progress' : session.windowStatus === 'upcoming' ? 'Upcoming' : 'Completed')}
                        </span>
                      )}
                    </div>
                    {session?.isRateAvailable ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {session.attendanceRate}% Rate
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Rate N/A
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Expected (Booked)</span>
                      <span className="text-lg font-bold text-slate-800 font-mono">
                        {session?.expectedDiners ?? 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Actual (Present)</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">
                        {session?.actualDiners ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Difference:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 ${
                      session?.differenceType === 'pending'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : session?.differenceType === 'no_shows'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : session?.differenceType === 'walk_ins'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : session?.differenceType === 'exact'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {session?.differenceLabel || (diff > 0 ? `+${diff}` : `${diff}`)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Daily Aggregate Summary Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl p-5 border border-indigo-100 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-indigo-950 text-base">Full Day Aggregate</span>
                {analytics?.summary?.isTotalRateAvailable ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {analytics.summary.totalAttendanceRate}% Overall
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    Rate N/A
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-slate-400 block text-[11px]">Total Expected</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">
                    {analytics?.summary?.totalExpected ?? 0}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-slate-400 block text-[11px]">Total Actual</span>
                  <span className="text-lg font-bold text-emerald-600 font-mono">
                    {analytics?.summary?.totalActual ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Net Discrepancy:</span>
              <span className="font-mono font-bold text-slate-800">
                {analytics?.summary?.totalDifference > 0
                  ? `+${analytics.summary.totalDifference}`
                  : analytics?.summary?.totalDifference ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Attendance Records Table & Filter Controls */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Controls Toolbar */}
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search student name, email or hostel room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Meal Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Meal:</span>
              <select
                value={mealFilter}
                onChange={(e) => setMealFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">All Meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records Table */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading attendee records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">No Attendance Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No check-ins have been recorded for {selectedDate} matching the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Student Details</th>
                  <th className="px-6 py-3.5">Hostel Room</th>
                  <th className="px-6 py-3.5">Meal Slot</th>
                  <th className="px-6 py-3.5">Check-In Time (IST)</th>
                  <th className="px-6 py-3.5">Verification Method</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Recorded / Updated By</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.user?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{rec.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {rec.user?.hostelRoom || '—'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 capitalize">
                      {rec.mealType}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {new Date(rec.checkInTime).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize">
                        {rec.verificationMethod === 'admin_manual' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-indigo-600" /> Admin Manual
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 text-emerald-600" /> Self Service
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          rec.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-slate-500">
                      <div>Rec: {rec.recordedBy?.name || 'Self'}</div>
                      {rec.updatedBy && <div>Upd: {rec.updatedBy?.name}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openCorrectionModal(rec)}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Correct
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
            <span>
              Showing {records.length} of {pagination.total} records (Page {pagination.page} of {pagination.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Manual Check-in Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Record Manual Attendance</h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Student</label>
                <select
                  value={manualForm.studentId}
                  onChange={(e) => setManualForm(prev => ({ ...prev, studentId: e.target.value }))}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {studentsList.map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.name} ({st.hostelRoom ? `Room ${st.hostelRoom}` : st.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Meal Session</label>
                <select
                  value={manualForm.mealType}
                  onChange={(e) => setManualForm(prev => ({ ...prev, mealType: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date</label>
                <input
                  type="text"
                  disabled
                  value={selectedDate}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Card scanner failure, unbooked walk-in entry"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingManual ? 'Saving...' : 'Record Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {isCorrectionModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Correct Attendance Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Student: {selectedRecord.user?.name} ({selectedRecord.mealType})
                </p>
              </div>
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status</label>
                <select
                  value={correctionForm.status}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="present">Present</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Correction Notes / Reason</label>
                <textarea
                  rows="3"
                  placeholder="State the reason for this administrative correction..."
                  value={correctionForm.notes}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, notes: e.target.value }))}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Existing Audit History Display */}
              {selectedRecord.auditLog && selectedRecord.auditLog.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1.5">
                  <span className="font-bold text-slate-700 block">Audit Log History:</span>
                  {selectedRecord.auditLog.map((log, idx) => (
                    <div key={idx} className="border-b border-slate-200/50 pb-1 last:border-none">
                      <span className="font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}:
                      </span>{' '}
                      <span className="text-slate-700">{log.details}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingCorrection ? 'Updating...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
