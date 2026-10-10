import React, { useState, useEffect } from 'react';
import { attendanceApi, rulesApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Utensils,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const MEAL_TIMES = {
  breakfast: { label: 'Breakfast', defaultWindow: '07:30 - 09:30 IST' },
  lunch: { label: 'Lunch', defaultWindow: '12:30 - 14:30 IST' },
  dinner: { label: 'Dinner', defaultWindow: '19:30 - 21:30 IST' }
};

const StudentAttendance = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingInMeal, setCheckingInMeal] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [mealFilter, setMealFilter] = useState('all');

  // Today's canonical date in Asia/Kolkata
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const loadData = async (page = 1, meal = mealFilter) => {
    setLoading(true);
    try {
      const [historyRes, rulesRes] = await Promise.all([
        attendanceApi.getMyAttendance({
          page,
          limit: pagination.limit,
          mealType: meal !== 'all' ? meal : undefined
        }),
        rulesApi.getRules().catch(() => ({ data: { data: [] } }))
      ]);

      setHistory(historyRes.data.data.records || []);
      setPagination(historyRes.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setRules(rulesRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load attendance history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, mealFilter);
  }, [mealFilter]);

  const handleCheckIn = async (mealType) => {
    setCheckingInMeal(mealType);
    setFeedback(null);
    try {
      const res = await attendanceApi.checkIn({
        date: todayStr,
        mealType
      });

      setFeedback({
        type: 'success',
        message: res.data.message || `Check-in recorded for ${MEAL_TIMES[mealType].label}!`
      });

      // Reload history to reflect newly recorded attendance
      loadData(pagination.page, mealFilter);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Check-in failed. Please verify your service window or meal booking.'
      });
    } finally {
      setCheckingInMeal(null);
    }
  };

  // Find if student has already checked in today for a meal slot
  const getTodayAttendanceForMeal = (mealType) => {
    return history.find(h => h.date === todayStr && h.mealType === mealType && h.status === 'present');
  };

  // Get active window string from system rules
  const getWindowDisplay = (mealType) => {
    const r = rules.find(item => item.mealType === mealType);
    if (r?.windowStart && r?.windowEnd) {
      return `${r.windowStart} - ${r.windowEnd} IST`;
    }
    return MEAL_TIMES[mealType].defaultWindow;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-3">
            <UserCheck className="w-3.5 h-3.5" /> Self-Service Dining Check-in
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Meal Attendance & Check-in</h1>
          <p className="mt-1 text-emerald-100 text-sm max-w-xl">
            Confirm your presence for active dining sessions. Timely check-ins help our mess staff prepare exact quantities and eliminate preventable food waste.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right shrink-0">
          <span className="text-emerald-200 text-xs block uppercase font-medium">Operational Date</span>
          <span className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2 justify-end">
            <Calendar className="w-5 h-5 text-emerald-300" /> {todayStr}
          </span>
          <span className="text-emerald-200 text-xs mt-1 block">Asia/Kolkata (IST)</span>
        </div>
      </div>

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
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
          <div className="flex-1">
            <p className="text-sm font-semibold">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Today's Meal Check-in Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-600" /> Today's Dining Sessions ({todayStr})
          </h2>
          <button
            onClick={() => loadData(pagination.page, mealFilter)}
            className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(MEAL_TIMES).map(([mealKey, mealInfo]) => {
            const todayAttendance = getTodayAttendanceForMeal(mealKey);
            const windowDisplay = getWindowDisplay(mealKey);
            const isCheckingIn = checkingInMeal === mealKey;

            return (
              <div
                key={mealKey}
                className={`bg-white rounded-2xl border p-6 shadow-sm transition-all flex flex-col justify-between ${
                  todayAttendance
                    ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg capitalize">{mealInfo.label}</h3>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {windowDisplay}
                      </span>
                    </div>
                    {todayAttendance ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Pending Check-in
                      </span>
                    )}
                  </div>

                  {todayAttendance && (
                    <div className="p-3 rounded-xl bg-white border border-emerald-100 text-xs text-slate-600 space-y-1">
                      <p className="flex justify-between">
                        <span className="text-slate-400">Timestamp:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {new Date(todayAttendance.checkInTime).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })} IST
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Method:</span>
                        <span className="font-medium capitalize text-emerald-700">
                          {todayAttendance.verificationMethod.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100">
                  {todayAttendance ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-default flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Presence Confirmed
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(mealKey)}
                      disabled={isCheckingIn}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCheckingIn ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Check In for {mealInfo.label}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Personal Attendance History Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Attendance History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified dining sessions recorded under your student account.
            </p>
          </div>

          {/* Filter By Meal */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Meal Slot:</span>
            <select
              value={mealFilter}
              onChange={(e) => setMealFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Meals</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading your attendance records...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">No Attendance Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't checked in for any meals yet. As you check in for dining sessions, your history will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Meal Date</th>
                  <th className="px-6 py-3.5">Meal Session</th>
                  <th className="px-6 py-3.5">Check-In Time (IST)</th>
                  <th className="px-6 py-3.5">Verification</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      {record.date}
                    </td>
                    <td className="px-6 py-4 capitalize font-semibold text-slate-900">
                      {record.mealType}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {new Date(record.checkInTime).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {record.verificationMethod === 'admin_manual' ? (
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
                          record.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={record.notes}>
                      {record.notes || '—'}
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
              Showing {history.length} of {pagination.total} records (Page {pagination.page} of {pagination.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentAttendance;
