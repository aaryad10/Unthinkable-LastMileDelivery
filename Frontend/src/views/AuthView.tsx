import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Mail, Lock, User, Phone, UserCheck, ArrowRight, Truck } from 'lucide-react';

interface AuthViewProps {
  onSuccess: () => void;
  id?: string;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, id }) => {
  const { login, register } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'Customer' | 'Delivery Agent' | 'Admin'>('Customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email) {
      setError('Email address is required.');
      return;
    }

    if (isLogin) {
      // Allow any email for mock testing
      const success = login(email, role);
      if (success) {
        onSuccess();
      } else {
        setError('Invalid credentials or role mismatch.');
      }
    } else {
      if (!name || !phone) {
        setError('Please fill in all registration fields.');
        return;
      }
      const success = register(name, email, phone);
      if (success) {
        setSuccessMsg('Registration successful! Logging you in...');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setError('This email address is already registered.');
      }
    }
  };

  const handlePreFill = (demoEmail: string, demoRole: 'Customer' | 'Delivery Agent' | 'Admin') => {
    setEmail(demoEmail);
    setPassword('••••••••');
    setRole(demoRole);
    setIsLogin(true);
  };

  return (
    <div id={id || "auth-screen"} className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-md text-white flex items-center justify-center">
            <Truck className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 font-sans">
          SwiftLast Logistics
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Last-Mile Delivery Coordination Suite
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 rounded-2xl sm:px-10">
          
          {/* View Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${isLogin ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${!isLogin ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Create Customer Account
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-lg font-medium">
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg font-medium">
                {successMsg}
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Full Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Phone Number
                  </label>
                  <div className="mt-1 relative rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 0122"
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {isLogin && (
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Role Selector
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Customer', 'Delivery Agent', 'Admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-1 text-xs font-medium border rounded-lg transition ${role === r ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      {r === 'Delivery Agent' ? 'Agent' : r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition active:scale-98"
            >
              {isLogin ? 'Sign In to Tracker' : 'Register Customer Profile'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Pre-fills */}
          {isLogin && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Quick-test sandbox profiles
              </span>
              <div className="space-y-2">
                <button
                  onClick={() => handlePreFill('customer@tracker.com', 'Customer')}
                  className="w-full flex items-center justify-between text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition text-xs text-slate-600 group"
                >
                  <div>
                    <span className="font-semibold block text-slate-800">Test Customer Profile</span>
                    <span>customer@tracker.com</span>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                </button>
                <button
                  onClick={() => handlePreFill('agent1@tracker.com', 'Delivery Agent')}
                  className="w-full flex items-center justify-between text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition text-xs text-slate-600 group"
                >
                  <div>
                    <span className="font-semibold block text-slate-800">Test Agent Profile (Robert Chen)</span>
                    <span>agent1@tracker.com</span>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                </button>
                <button
                  onClick={() => handlePreFill('admin@tracker.com', 'Admin')}
                  className="w-full flex items-center justify-between text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition text-xs text-slate-600 group"
                >
                  <div>
                    <span className="font-semibold block text-slate-800">Test Admin Control Room</span>
                    <span>admin@tracker.com</span>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
