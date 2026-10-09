import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX, ArrowLeft } from 'lucide-react';

const UnauthorizedPage = () => {
  const { user } = useAuth();

  const destination = user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldX className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">403 - Access Forbidden</h1>
          <p className="text-sm text-slate-500 mt-2">
            You do not have administrative privileges to access this area. Access is restricted by server-side authorization controls.
          </p>
        </div>

        {user && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            Currently logged in as <strong>{user.name}</strong> with role{' '}
            <span className="font-semibold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
              {user.role}
            </span>.
          </div>
        )}

        <Link
          to={destination}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to My Dashboard
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
