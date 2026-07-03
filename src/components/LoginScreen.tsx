import React, { useState } from 'react';
import { Shield, Phone, Loader2, Key } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: 'admin' | 'telecaller' }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'recovery'>('signin');
  const [role, setRole] = useState<'admin' | 'telecaller'>('admin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingKey, setSendingKey] = useState(false);

  const handleSendRecoveryEmail = async () => {
    if (!email) {
      setError('कृपया पहले अपना पंजीकृत ईमेल पता दर्ज करें (Please enter your registered email first).');
      return;
    }
    setError('');
    setSuccess('');
    setSendingKey(true);
    try {
      const res = await fetch('/api/auth/send-recovery-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setSuccess(data.message || 'रिकवरी की आपके पंजीकृत ईमेल पर भेज दी गई है!');
    } catch (err: any) {
      setError(err.message || 'रिकवरी की भेजने में त्रुटि हुई।');
    } finally {
      setSendingKey(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-by-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, masterKey, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess('पासवर्ड सफलतापूर्वक बदल गया है! अब नए पासवर्ड से लॉग इन करें।');
      setActiveTab('signin');
      setMasterKey('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Error updating password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'recovery') {
      return handleRecoverySubmit(e);
    }
    setError('');
    setSuccess('');
    setLoading(true);

    const url = activeTab === 'signin' ? '/api/auth/login' : '/api/auth/register';
    const payload = activeTab === 'signin' 
      ? { email, password } 
      : { name, email, password, role };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (activeTab === 'signin') {
        onLoginSuccess(data.user);
      } else {
        setSuccess('Account created successfully! Please Sign In.');
        setActiveTab('signin');
        setName('');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b11] text-gray-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-orange-500 selection:text-white">
      {/* Logo & Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="flex items-center gap-3 bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-3xl shadow-lg shadow-orange-500/20 mb-3 animate-fade-in">
          <Phone className="w-8 h-8 text-white fill-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1">
          Tele-<span className="text-[#f97316]">CRM</span>
        </h1>
        <p className="text-sm font-medium text-gray-400 mt-2 tracking-wide">
          Zero-Cost Operational CRM & Dialer Console
        </p>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-md bg-[#131924] border border-[#1e2635] rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>

        {/* Form Selection Tabs */}
        {activeTab !== 'recovery' ? (
          <div className="flex border-b border-[#1f2635] mb-6">
            <button
              id="tab-signin-btn"
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 pb-3 text-center font-bold text-sm tracking-wide transition-all duration-200 border-b-2 ${
                activeTab === 'signin'
                  ? 'border-[#f97316] text-[#f97316]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In (लॉग इन)
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 pb-3 text-center font-bold text-sm tracking-wide transition-all duration-200 border-b-2 ${
                activeTab === 'register'
                  ? 'border-[#f97316] text-[#f97316]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Register (नया अकाउंट)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-[#1f2635] pb-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError('');
                setSuccess('');
              }}
              className="text-xs font-bold text-[#f97316] hover:underline"
            >
              ← Back to Sign In (लॉग इन पर वापस जाएं)
            </button>
            <span className="text-gray-400 text-xs font-medium ml-auto">
              Password Recovery (रिकवरी)
            </span>
          </div>
        )}

        {/* Display Error / Success Notifications */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 mb-4 font-medium animate-shake">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg p-3 mb-4 font-medium">
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <>
              {/* Account Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Account Role (खाते का प्रकार)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="role-admin-btn"
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-xs transition-all duration-150 ${
                      role === 'admin'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md shadow-orange-500/10'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin (प्रबंधक)
                  </button>
                  <button
                    id="role-caller-btn"
                    type="button"
                    onClick={() => setRole('telecaller')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-xs transition-all duration-150 ${
                      role === 'telecaller'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md shadow-orange-500/10'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    Telecaller (कॉलर)
                  </button>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Your Name (आपका नाम)
                </label>
                <input
                  id="reg-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Suresh Gupta"
                  className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
                />
              </div>
            </>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Email Address (ईमेल पता)
            </label>
            <input
              id="email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@company.com"
              className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
            />
          </div>

          {/* Master Key Field (Only shown in recovery mode) */}
          {activeTab === 'recovery' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#f97316]" />
                  Master Recovery Key (मास्टर रिकवरी की)
                </label>
                <button
                  type="button"
                  disabled={sendingKey}
                  onClick={handleSendRecoveryEmail}
                  className="text-xs text-[#f97316] hover:underline cursor-pointer disabled:opacity-50"
                >
                  {sendingKey ? 'भेज रहे हैं...' : 'Send to Email (ईमेल पर भेजें)'}
                </button>
              </div>
              <input
                id="master-key-input"
                type="password"
                required
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="डिफ़ॉल्ट कोड दर्ज करें (उदा. 0000)"
                className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250 font-mono"
              />
            </div>
          )}

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {activeTab === 'signin' 
                  ? 'Password (पासवर्ड)' 
                  : activeTab === 'register' 
                    ? 'Password (पासवर्ड सेट करें)' 
                    : 'Choose New Password (नया पासवर्ड चुनें)'}
              </label>
              {activeTab === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('recovery');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-[#f97316] hover:underline font-medium"
                >
                  Forgot your password? (पासवर्ड भूल गए?)
                </button>
              )}
            </div>
            <input
              id="password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
            />
          </div>

          {/* Submit Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/25 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-sm cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : activeTab === 'signin' ? (
              'Sign In to Workspace'
            ) : activeTab === 'register' ? (
              'Create Account (खाता बनाएं)'
            ) : (
              'Reset Password (पासवर्ड बदलें)'
            )}
          </button>
        </form>

        {/* Help Tip */}
        <div className="mt-6 pt-4 border-t border-[#1f2635] text-center">
          <p className="text-[11px] text-gray-500">
            {activeTab === 'signin' 
              ? 'अपना स्वयं का पासवर्ड और खाता सेट करने के लिए ऊपर Register बटन दबाएं।' 
              : activeTab === 'register'
                ? 'Already have an account? Press Sign In above.'
                : 'मास्टर रिकवरी कोड का उपयोग करके एडमिन का भी नया पासवर्ड सेट किया जा सकता है।'}
          </p>
        </div>
      </div>
    </div>
  );
}
