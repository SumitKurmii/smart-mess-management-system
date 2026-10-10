import React, { useState, useEffect, useCallback } from 'react';
import { menuApi, bookingApi } from '../../api/client';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Utensils,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner'
};

const WeeklyMealPlanner = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [bookingMap, setBookingMap] = useState({});
  const [cutoffStatus, setCutoffStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Load weekly menu & student bookings
  const loadWeekData = useCallback(async (startDate = '') => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const [menuRes, bookingRes] = await Promise.all([
        menuApi.getWeeklyMenu(startDate),
        bookingApi.getMyBookings(startDate)
      ]);

      if (menuRes.data?.success) {
        setWeeklyMenu(menuRes.data.data);
        setCurrentWeekStart(menuRes.data.data.startDate);
      }
      if (bookingRes.data?.success) {
        setBookingMap(bookingRes.data.data.bookingMap || {});
        setCutoffStatus(bookingRes.data.data.cutoffStatus || {});
      }
    } catch (err) {
      console.error('Failed to load week data:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load menu or booking schedule.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  // Navigate week
  const handleShiftWeek = (daysOffset) => {
    if (!currentWeekStart) return;
    const current = new Date(currentWeekStart);
    current.setDate(current.getDate() + daysOffset);
    const newStart = current.toISOString().split('T')[0];
    loadWeekData(newStart);
  };

  // Toggle single meal status
  const handleToggleMeal = async (date, mealType) => {
    const isAllowed = cutoffStatus[date]?.[mealType]?.allowed;
    if (isAllowed === false) {
      setFeedbackMsg({
        type: 'error',
        text: `Booking deadline passed for ${MEAL_LABELS[mealType]} on ${date}.`
      });
      return;
    }

    const currentStatus = bookingMap[date]?.[mealType]?.status || 'booked';
    const newStatus = currentStatus === 'booked' ? 'skipped' : 'booked';

    // Optimistic UI update
    setBookingMap(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [mealType]: {
          ...(prev[date]?.[mealType] || {}),
          status: newStatus
        }
      }
    }));

    try {
      await bookingApi.saveBooking({
        date,
        mealType,
        status: newStatus
      });
      setFeedbackMsg({
        type: 'success',
        text: `${MEAL_LABELS[mealType]} on ${date} marked as '${newStatus === 'booked' ? 'Attending' : 'Skipping'}'.`
      });
    } catch (err) {
      // Revert on error
      setBookingMap(prev => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [mealType]: {
            ...(prev[date]?.[mealType] || {}),
            status: currentStatus
          }
        }
      }));
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to save booking intention.'
      });
    }
  };

  // Save all days with bulk API
  const handleSaveAllWeek = async () => {
    if (!weeklyMenu?.days) return;
    setSaving(true);
    setFeedbackMsg(null);

    const bulkPayload = [];
    weeklyMenu.days.forEach(day => {
      MEAL_TYPES.forEach(meal => {
        const isAllowed = cutoffStatus[day.date]?.[meal]?.allowed;
        if (isAllowed !== false) {
          const status = bookingMap[day.date]?.[meal]?.status || 'booked';
          bulkPayload.push({
            date: day.date,
            mealType: meal,
            status
          });
        }
      });
    });

    try {
      const res = await bookingApi.saveBulkBookings(bulkPayload);
      setFeedbackMsg({
        type: 'success',
        text: `Weekly schedule saved: ${res.data.data.updatedCount} meals confirmed.`
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Error saving weekly intentions.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate statistics for the active week
  let bookedCount = 0;
  let skippedCount = 0;
  if (weeklyMenu?.days) {
    weeklyMenu.days.forEach(day => {
      MEAL_TYPES.forEach(meal => {
        const status = bookingMap[day.date]?.[meal]?.status || 'booked';
        if (status === 'booked') bookedCount++;
        else skippedCount++;
      });
    });
  }

  const activeDay = weeklyMenu?.days?.[selectedDayIndex] || weeklyMenu?.days?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Weekly Meal Intention Planner
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hostel Mess Schedule & Pre-Booking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Let the kitchen know if you are attending each meal to prevent food waste. Changes lock automatically at the deadline.
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleShiftWeek(-7)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[170px]">
            <span className="text-xs text-slate-400 block font-medium">Active Week</span>
            <span className="text-sm font-bold text-slate-800">
              {weeklyMenu ? `${weeklyMenu.startDate} to ${weeklyMenu.endDate}` : 'Loading...'}
            </span>
          </div>
          <button
            onClick={() => handleShiftWeek(7)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleSaveAllWeek}
            disabled={saving || loading}
            className="ml-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm All Preferences'}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Week Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Meals Attending</span>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{bookedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Meals Skipped</span>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{skippedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Operational Timezone</span>
            <p className="text-sm font-bold text-slate-800 mt-1">Asia/Kolkata (IST)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {weeklyMenu?.days?.map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex-1 min-w-[120px] p-3 rounded-2xl border text-center transition-all ${
                isSelected
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs uppercase tracking-wider font-semibold opacity-75">
                {day.shortDay}
              </span>
              <span className="block text-base font-bold mt-0.5">
                {day.formattedDate}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Meal Slots */}
      {activeDay && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MEAL_TYPES.map(meal => {
            const menuData = activeDay.meals[meal];
            const booking = bookingMap[activeDay.date]?.[meal];
            const isBooked = booking ? booking.status === 'booked' : true; // Default is booked
            const cutoffInfo = cutoffStatus[activeDay.date]?.[meal];
            const isCutoffPassed = cutoffInfo?.allowed === false;

            return (
              <div
                key={meal}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden"
              >
                {/* Meal Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {MEAL_LABELS[meal]}
                    </span>
                    {/* Cutoff Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        isCutoffPassed
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                      title={cutoffInfo?.cutoffHumanReadable}
                    >
                      <Clock className="w-3 h-3" />
                      {isCutoffPassed ? 'Booking Closed' : 'Booking Open'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-emerald-600" />
                    {MEAL_LABELS[meal]} Menu
                  </h3>
                </div>

                {/* Dishes List */}
                <div className="p-5 flex-1 space-y-3">
                  {menuData?.items && menuData.items.length > 0 ? (
                    <div className="space-y-2">
                      {menuData.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-start justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                              />
                              {item.name}
                            </span>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                            {item.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <Utensils className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                      <p className="text-xs font-medium">Regular Mess Menu Scheduled</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Specific dish list pending admin update
                      </p>
                    </div>
                  )}

                  {menuData?.notes && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                      <span>{menuData.notes}</span>
                    </div>
                  )}
                </div>

                {/* Preference Toggle Footer */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[11px]">Your Status</span>
                    <span className={`font-bold ${isBooked ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isBooked ? 'Attending' : 'Skipped'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleMeal(activeDay.date, meal)}
                    disabled={isCutoffPassed}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isCutoffPassed
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : isBooked
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                  >
                    {isBooked ? (
                      <>
                        <X className="w-3.5 h-3.5" /> Skip Meal
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Attend Meal
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeeklyMealPlanner;
