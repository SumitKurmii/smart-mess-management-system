import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Utensils, LogOut, User as UserIcon, Shield, Sparkles, Calendar } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
                Smart Mess
              </span>
              <span className="text-xs text-emerald-600 font-semibold tracking-wide uppercase block">
                Food Waste Reduction
              </span>
            </div>
          </Link>

          {/* Navigation Links / User Controls */}
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {/* Role-specific shortcuts */}
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/dashboard"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      Dashboard
                    </Link>
                    <Link
                      to="/admin/menu"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                    >
                      <Utensils className="w-3.5 h-3.5 text-indigo-600" />
                      Menu & Headcount
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/student/dashboard"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Dashboard
                    </Link>
                    <Link
                      to="/student/planner"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      Weekly Planner
                    </Link>
                  </div>
                )}

                {/* User Info */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-slate-800 leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 uppercase mt-0.5 tracking-wider font-medium">
                      {user.role}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
