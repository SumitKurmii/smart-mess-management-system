import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Sparkles, Calendar, CheckSquare, MessageSquare, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState(null);
  const [rbacTestResult, setRbacTestResult] = useState(null);
  const [testingRbac, setTestingRbac] = useState(false);

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

  const testAdminAccess = async () => {
    setTestingRbac(true);
    setRbacTestResult(null);
    try {
      const res = await authApi.testAdminAccess();
      setRbacTestResult({
        success: true,
        message: 'Unexpected: Access granted to admin endpoint',
        data: res.data
      });
    } catch (err) {
      // Expected behavior: 403 Forbidden
      setRbacTestResult({
        success: false,
        status: err.status,
        message: err.message || 'Server rejected request with 403 Forbidden'
      });
    } finally {
      setTestingRbac(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Student Portal
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}!</h1>
          <p className="mt-1 text-emerald-100 text-sm max-w-xl">
            You are logged into the student portal. Your session is protected with secure httpOnly cookies.
          </p>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-xs space-y-2 min-w-[240px]">
          <div className="flex justify-between">
            <span className="text-emerald-200">Role:</span>
            <span className="font-semibold uppercase bg-emerald-500/40 px-2 py-0.5 rounded text-white">
              {user?.role}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-200">Hostel Room:</span>
            <span className="font-medium">{user?.hostelRoom || 'Not assigned'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-200">Diet Preference:</span>
            <span className="font-medium capitalize">{user?.dietaryPreference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-200">Session Status:</span>
            <span className="font-medium text-emerald-300 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Active (Cookie)
            </span>
          </div>
        </div>
      </div>

      {/* Backend & Security Verification Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Health Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" /> System & Timezone Status
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              healthStatus?.status === 'healthy' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {healthStatus?.status || 'Connecting...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Database Status</span>
              <span className="font-semibold text-slate-800 text-sm capitalize">
                {healthStatus?.database || 'Checking...'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Operational Timezone</span>
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
              <span className="text-slate-500 block">Server Uptime</span>
              <span className="font-semibold text-slate-800 text-sm">
                {healthStatus ? `${healthStatus.uptimeSeconds}s` : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Server-Side RBAC Enforcement Test Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" /> Server-Side RBAC Verification
            </h2>
            <span className="text-xs text-slate-500">Live Boundary Test</span>
          </div>

          <p className="text-xs text-slate-600">
            Click below to execute an authenticated request from your student account to the protected endpoint <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">/api/auth/admin-only-test</code>. The backend must enforce HTTP 403 Forbidden.
          </p>

          <button
            onClick={testAdminAccess}
            disabled={testingRbac}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
          >
            {testingRbac ? 'Testing Endpoint...' : 'Trigger Admin Route Test (Assert 403)'}
          </button>

          {rbacTestResult && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border ${
              !rbacTestResult.success && rbacTestResult.status === 403
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="font-bold mb-1">
                {!rbacTestResult.success && rbacTestResult.status === 403
                  ? 'Server-Side Authorization Enforced (HTTP 403 Forbidden)'
                  : 'Test Check Result:'}
              </div>
              <p>{rbacTestResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Feature Preview Cards (Phase 2 Roadmap) */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Milestone Roadmap Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            to="/student/planner"
            className="bg-white p-5 rounded-2xl border-2 border-emerald-500/40 shadow-sm hover:border-emerald-500 transition-all group block"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
              Weekly Meal Planner →
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select your attendance intentions for breakfast, lunch, and dinner to help the kitchen minimize waste.
            </p>
          </Link>

          <Link
            to="/student/attendance"
            className="bg-white p-5 rounded-2xl border-2 border-teal-500/40 shadow-sm hover:border-teal-500 transition-all group block"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
              Meal Attendance & Check-in →
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Check in during meal service windows and review your complete dining attendance history.
            </p>
          </Link>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 opacity-75">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Feedback & Complaints</h3>
            <p className="text-xs text-slate-500 mt-1">
              Rate daily dishes, share suggestions, and submit complaints tracked through to administrative resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
