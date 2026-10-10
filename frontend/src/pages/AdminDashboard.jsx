import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Shield, CheckCircle, Scale, Utensils, Cpu, BarChart3, Clock, AlertCircle, MessageSquare, Megaphone } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState(null);
  const [adminTestResult, setAdminTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await authApi.healthCheck();
        setHealthStatus(res.data?.data);
      } catch (err) {
        console.error('Health fetch failed:', err);
      }
    };
    fetchHealth();
  }, []);

  const testAdminPrivileges = async () => {
    setTestingEndpoint(true);
    setAdminTestResult(null);
    try {
      const res = await authApi.testAdminAccess();
      setAdminTestResult({
        success: true,
        message: res.data?.message || 'Server-side authorization confirmed',
        data: res.data?.data
      });
    } catch (err) {
      setAdminTestResult({
        success: false,
        message: err.message || 'Authorization failed'
      });
    } finally {
      setTestingEndpoint(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" /> Mess Administrator Console
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Administrator Control Center</h1>
          <p className="mt-1 text-slate-300 text-sm max-w-xl">
            Logged in as <strong className="text-white">{user?.name}</strong>. Full authorization active for menu configuration, waste telemetry, and system analytics.
          </p>
        </div>

        {/* Admin Session Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-xs space-y-2 min-w-[240px]">
          <div className="flex justify-between">
            <span className="text-slate-300">Role:</span>
            <span className="font-semibold uppercase bg-indigo-500/50 px-2 py-0.5 rounded text-white">
              {user?.role}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Admin Email:</span>
            <span className="font-medium text-slate-100">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Session Type:</span>
            <span className="font-medium text-emerald-300 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> httpOnly Secure Cookie
            </span>
          </div>
        </div>
      </div>

      {/* Backend Status & RBAC Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System & DB Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" /> Operational & Database Status
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              healthStatus?.status === 'healthy' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {healthStatus?.status || 'Checking...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Database State</span>
              <span className="font-semibold text-slate-800 text-sm capitalize">
                {healthStatus?.database || 'Connecting...'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Operational Zone</span>
              <span className="font-semibold text-slate-800 text-sm">
                {healthStatus?.timezone || 'Asia/Kolkata'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Current Mess Date</span>
              <span className="font-semibold text-slate-800 text-sm">
                {healthStatus?.operationalDate || 'YYYY-MM-DD'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Process Uptime</span>
              <span className="font-semibold text-slate-800 text-sm">
                {healthStatus ? `${healthStatus.uptimeSeconds}s` : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Admin RBAC Test Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" /> Server-Side Admin Authorization
            </h2>
            <span className="text-xs text-slate-500">Live Boundary Test</span>
          </div>

          <p className="text-xs text-slate-600">
            Click below to execute an authenticated request to <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">/api/auth/admin-only-test</code>. The backend verifies your administrator role and returns HTTP 200 OK.
          </p>

          <button
            onClick={testAdminPrivileges}
            disabled={testingEndpoint}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {testingEndpoint ? 'Verifying Authorization...' : 'Verify Admin Role with Server (Assert 200 OK)'}
          </button>

          {adminTestResult && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border ${
              adminTestResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="font-bold mb-1">
                {adminTestResult.success ? 'Authorization Verified (HTTP 200 OK)' : 'Authorization Error:'}
              </div>
              <p>{adminTestResult.message}</p>
              {adminTestResult.data && (
                <div className="mt-2 text-[11px] font-mono bg-white/70 p-2 rounded border border-emerald-300">
                  Confirmed Role: {adminTestResult.data.confirmedRole} | ID: {adminTestResult.data.adminId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Administration Modules (Roadmap Preview) */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Core Administration Systems</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <Link
            to="/admin/menu"
            className="bg-white p-5 rounded-2xl border-2 border-indigo-500/40 shadow-sm hover:border-indigo-600 transition-all group block"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
              Menu & Headcount →
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure daily/weekly menus, monitor student diner headcount, and lock booking deadlines.
            </p>
          </Link>

          <Link
            to="/admin/attendance"
            className="bg-white p-5 rounded-2xl border-2 border-purple-500/40 shadow-sm hover:border-purple-600 transition-all group block"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
              Attendance & Analytics →
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Evaluate expected vs actual attendance, audit walk-ins and no-shows, and record manual check-ins.
            </p>
          </Link>

          <Link
            to="/admin/feedback"
            className="bg-white p-5 rounded-2xl border-2 border-rose-500/40 shadow-sm hover:border-rose-600 transition-all group block"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-rose-700 transition-colors">
              Complaints & Ratings →
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Action student complaints, fulfill special mess requests, and review dish satisfaction ratings.
            </p>
          </Link>

          <Link
            to="/admin/announcements"
            className="bg-white p-5 rounded-2xl border-2 border-amber-500/40 shadow-sm hover:border-amber-600 transition-all group block"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
              Noticeboard & Notices →
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Broadcast announcements, pin urgent schedule changes, and maintain notice records.
            </p>
          </Link>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">IoT Aggregate Scale</h3>
            <p className="text-xs text-slate-500 mt-1">
              Monitor incoming aggregate bin leftovers streamed by the ESP32 load cell scale after each meal.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Gemini AI Recommendations</h3>
            <p className="text-xs text-slate-500 mt-1">
              Backend AI interpreter that provides actionable preparation quantity adjustments and reduces food waste.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
