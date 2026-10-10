import React, { useState, useEffect, useCallback } from 'react';
import { menuApi, bookingApi, rulesApi } from '../../api/client';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Clock,
  Users,
  Settings,
  Check,
  X,
  AlertCircle,
  Utensils,
  Save
} from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner'
};

const MenuManagement = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Expected Headcount State
  const [headcountDate, setHeadcountDate] = useState(new Date().toISOString().split('T')[0]);
  const [headcountData, setHeadcountData] = useState(null);
  const [loadingHeadcount, setLoadingHeadcount] = useState(false);

  // Edit Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState({
    date: '',
    mealType: 'breakfast',
    items: [{ name: '', category: 'main', isVeg: true, description: '' }],
    notes: ''
  });
  const [savingMenu, setSavingMenu] = useState(false);

  // Cutoff Rules Modal State
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [savingRules, setSavingRules] = useState(false);

  // Load week menus
  const loadWeekData = useCallback(async (startDate = '') => {
    setLoading(true);
    try {
      const res = await menuApi.getWeeklyMenu(startDate);
      if (res.data?.success) {
        setWeeklyMenu(res.data.data);
        setCurrentWeekStart(res.data.data.startDate);
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Failed to load weekly menu.' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load headcount for specific date
  const loadHeadcount = useCallback(async (date) => {
    setLoadingHeadcount(true);
    try {
      const res = await bookingApi.getHeadcount(date);
      if (res.data?.success) {
        setHeadcountData(res.data.data.headcount);
      }
    } catch (err) {
      console.error('Headcount error:', err);
    } finally {
      setLoadingHeadcount(false);
    }
  }, []);

  // Load cutoff rules
  const loadRules = useCallback(async () => {
    try {
      const res = await rulesApi.getRules();
      if (res.data?.success) {
        setRules(res.data.data);
      }
    } catch (err) {
      console.error('Rules error:', err);
    }
  }, []);

  useEffect(() => {
    loadWeekData();
    loadHeadcount(headcountDate);
    loadRules();
  }, [loadWeekData, loadHeadcount, loadRules, headcountDate]);

  const handleShiftWeek = (daysOffset) => {
    if (!currentWeekStart) return;
    const current = new Date(currentWeekStart);
    current.setDate(current.getDate() + daysOffset);
    loadWeekData(current.toISOString().split('T')[0]);
  };

  // Open Edit Menu Modal
  const openEditModal = (date, mealType, existingMenu) => {
    if (existingMenu?.items && existingMenu.items.length > 0) {
      setEditingSlot({
        date,
        mealType,
        items: existingMenu.items.map(it => ({
          name: it.name,
          category: it.category || 'main',
          isVeg: it.isVeg !== undefined ? it.isVeg : true,
          description: it.description || ''
        })),
        notes: existingMenu.notes || ''
      });
    } else {
      setEditingSlot({
        date,
        mealType,
        items: [{ name: '', category: 'main', isVeg: true, description: '' }],
        notes: ''
      });
    }
    setIsMenuModalOpen(true);
  };

  const handleAddItem = () => {
    setEditingSlot(prev => ({
      ...prev,
      items: [...prev.items, { name: '', category: 'main', isVeg: true, description: '' }]
    }));
  };

  const handleRemoveItem = (index) => {
    setEditingSlot(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setEditingSlot(prev => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    setSavingMenu(true);
    setFeedbackMsg(null);

    // Filter out blank items
    const validItems = editingSlot.items.filter(it => it.name.trim().length > 0);
    if (validItems.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'At least one dish name is required.' });
      setSavingMenu(false);
      return;
    }

    try {
      await menuApi.saveMenu({
        date: editingSlot.date,
        mealType: editingSlot.mealType,
        items: validItems,
        notes: editingSlot.notes
      });
      setFeedbackMsg({
        type: 'success',
        text: `Menu updated for ${editingSlot.date} (${MEAL_LABELS[editingSlot.mealType]}).`
      });
      setIsMenuModalOpen(false);
      loadWeekData(currentWeekStart);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save menu.' });
    } finally {
      setSavingMenu(false);
    }
  };

  // Save Cutoff Rules
  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await rulesApi.updateRules(rules);
      setFeedbackMsg({ type: 'success', text: 'Booking cutoff rules updated successfully.' });
      setIsRulesModalOpen(false);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update rules.' });
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Utensils className="w-3.5 h-3.5" /> Kitchen & Menu Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Menu Management & Cutoff Scheduling
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure daily/weekly menus, monitor student diner headcount, and adjust booking cutoff deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Booking Cutoff Rules
          </button>

          {/* Week Shift */}
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl p-1 bg-slate-50">
            <button
              onClick={() => handleShiftWeek(-7)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2">
              {weeklyMenu ? `${weeklyMenu.startDate} to ${weeklyMenu.endDate}` : '...'}
            </span>
            <button
              onClick={() => handleShiftWeek(7)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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

      {/* Expected Headcount Dashboard Bar */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Expected Diner Headcount Summary</h2>
              <p className="text-xs text-slate-400">Pre-booked student attendance counts for kitchen batch preparation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium">Select Date:</span>
            <input
              type="date"
              value={headcountDate}
              onChange={(e) => setHeadcountDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Headcount Stat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {MEAL_TYPES.map(meal => {
            const data = headcountData?.[meal] || { booked: 0, skipped: 0, total: 0 };
            return (
              <div key={meal} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                  {MEAL_LABELS[meal]} Headcount
                </span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-3xl font-extrabold text-emerald-400">
                    {loadingHeadcount ? '...' : data.booked}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">attending</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-700">
                  <span>Skipped: <strong className="text-amber-400">{data.skipped}</strong></span>
                  <span>Total Responses: {data.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Menu Table Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-sm">7-Day Weekly Menu Plan</h2>
          <span className="text-xs text-slate-500 font-medium">Click "Edit Menu" on any meal slot to update dishes</span>
        </div>

        <div className="divide-y divide-slate-100">
          {weeklyMenu?.days?.map(day => (
            <div key={day.date} className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {/* Day info column */}
              <div className="md:border-r md:border-slate-100 md:pr-4">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                  {day.dayOfWeek}
                </span>
                <span className="text-lg font-extrabold text-slate-900 block mt-0.5">
                  {day.formattedDate}
                </span>
                <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                  {day.date}
                </span>
              </div>

              {/* Breakfast, Lunch, Dinner Columns */}
              {MEAL_TYPES.map(meal => {
                const menu = day.meals[meal];
                return (
                  <div key={meal} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 relative group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {MEAL_LABELS[meal]}
                      </span>
                      <button
                        onClick={() => openEditModal(day.date, meal, menu)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                    </div>

                    {menu?.items && menu.items.length > 0 ? (
                      <ul className="space-y-1 text-xs">
                        {menu.items.map((it, i) => (
                          <li key={i} className="text-slate-800 font-medium flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${it.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            />
                            {it.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No custom dishes added</span>
                    )}

                    {menu?.notes && (
                      <p className="text-[10px] text-amber-700 mt-2 bg-amber-50 p-1.5 rounded">
                        Note: {menu.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Menu Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Edit Menu for {MEAL_LABELS[editingSlot.mealType]}
                </h3>
                <p className="text-xs text-slate-500">Date: {editingSlot.date}</p>
              </div>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Dishes</label>
                <div className="space-y-2.5">
                  {editingSlot.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Dish name (e.g. Dal Makhani)"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <select
                        value={item.category}
                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                        className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="main">Main</option>
                        <option value="curry">Curry</option>
                        <option value="side">Side</option>
                        <option value="dessert">Dessert</option>
                        <option value="beverage">Beverage</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isVeg}
                          onChange={(e) => handleItemChange(index, 'isVeg', e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>Veg</span>
                      </label>
                      {editingSlot.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Dish
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kitchen Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={editingSlot.notes}
                  onChange={(e) => setEditingSlot(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Festival special, mild spice level..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMenu}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingMenu ? 'Saving...' : 'Save Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cutoff Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Configurable Booking Cutoff Deadlines</h3>
                <p className="text-xs text-slate-500">Operating in Asia/Kolkata timezone</p>
              </div>
              <button onClick={() => setIsRulesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div key={rule.mealType} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase text-slate-800">
                      {MEAL_LABELS[rule.mealType]} Cutoff
                    </span>
                    <label className="text-xs text-slate-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.isBookingEnabled}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[idx].isBookingEnabled = e.target.checked;
                          setRules(updated);
                        }}
                      />
                      <span>Booking Enabled</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Days Offset</span>
                      <select
                        value={rule.daysOffset}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[idx].daysOffset = parseInt(e.target.value);
                          setRules(updated);
                        }}
                        className="w-full mt-1 p-1.5 border border-slate-300 rounded bg-white text-xs"
                      >
                        <option value="-1">Previous Day (-1)</option>
                        <option value="0">Same Day (0)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Cutoff Hour (0-23)</span>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={rule.cutoffHour}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[idx].cutoffHour = parseInt(e.target.value);
                          setRules(updated);
                        }}
                        className="w-full mt-1 p-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsRulesModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRules}
                disabled={savingRules}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingRules ? 'Updating...' : 'Save Cutoff Rules'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
