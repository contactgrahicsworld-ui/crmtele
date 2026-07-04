import React, { useState } from 'react';
import { Shield, Phone, Loader2, Key, HelpCircle, Mail, User } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { 
    id: string; 
    name: string; 
    email: string; 
    phone?: string;
    role: 'admin' | 'head' | 'staff' | 'telecaller';
    department?: 'Tech' | 'NonTech' | 'Sales';
  }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'recovery'>('signin');
  const [role, setRole] = useState<'main_admin' | 'admin' | 'head' | 'staff' | 'telecaller'>('admin');
  const [recoveryType, setRecoveryType] = useState<'staff' | 'main_admin'>('staff');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<'Tech' | 'NonTech' | 'Sales'>('Sales');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStaffRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('कृपया अपना पंजीकृत यूजरनेम दर्ज करें (Please enter your registered username).');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/request-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setSuccess(data.message || 'अनुरोध सफलतापूर्वक भेज दिया गया है!');
    } catch (err: any) {
      setError(err.message || 'रिकवरी अनुरोध भेजने में त्रुटि हुई।');
    } finally {
      setLoading(false);
    }
  };

  const handleMainAdminRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('नाम और पंजीकृत ईमेल दोनों दर्ज करें (Please enter both your name and registered email).');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/main-admin-recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setSuccess(data.message || 'पासवर्ड आपके व्हाट्सएप और ईमेल पर भेज दिया गया है!');
    } catch (err: any) {
      setError(err.message || 'मुख्य एडमिन रिकवरी में त्रुटि हुई।');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'recovery') {
      if (recoveryType === 'staff') {
        return handleStaffRecoverySubmit(e);
      } else {
        return handleMainAdminRecoverySubmit(e);
      }
    }
    setError('');
    setSuccess('');
    setLoading(true);

    const url = activeTab === 'signin' ? '/api/auth/login' : '/api/auth/register';
    const payload = activeTab === 'signin' 
      ? { name, password } 
      : { name, email, password, role, phone, department };

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
      {/* Logo & Header inside an elegant high-contrast white container */}
      <div className="flex flex-col items-center mb-8 text-center bg-white px-8 py-5 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full">
        <div className="flex items-center gap-3 bg-gradient-to-br from-orange-500 to-amber-500 p-3.5 rounded-2xl shadow-lg shadow-orange-500/20 mb-3">
          <Shield className="w-7 h-7 text-white fill-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-0">
          <span className="text-[#f97316]">Hub</span>
          <span className="text-black">Sphere</span>
        </h1>
        <p className="text-xs font-bold text-black mt-2 tracking-wide text-center">
          Your Team. Your Clients. One Sphere.
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
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg p-3 mb-4 font-medium whitespace-pre-line">
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recovery Type Toggle (Only shown in recovery tab) */}
          {activeTab === 'recovery' && (
            <div className="bg-[#1a202c] p-1.5 rounded-xl border border-[#2d3748] flex gap-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setRecoveryType('staff');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 text-center py-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                  recoveryType === 'staff'
                    ? 'bg-[#f97316] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👤 Staff Recovery (स्टाफ सदस्य)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryType('main_admin');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 text-center py-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                  recoveryType === 'main_admin'
                    ? 'bg-[#f97316] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👑 Main Admin Recovery (मुख्य एडमिन)
              </button>
            </div>
          )}

          {activeTab === 'register' && (
            <>
              {/* Account Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Account Role (खाते का प्रकार)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('main_admin')}
                    className={`flex items-center justify-center gap-1 py-2.5 rounded-xl border font-bold text-[10px] transition-all duration-150 ${
                      role === 'main_admin'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md shadow-orange-500/10'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Main Admin (मुख्य)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center justify-center gap-1 py-2.5 rounded-xl border font-bold text-[10px] transition-all duration-150 ${
                      role === 'admin'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md shadow-orange-500/10'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Sub-Admin (सहायक)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('head')}
                    className={`flex items-center justify-center gap-1 py-2.5 rounded-xl border font-bold text-[10px] transition-all duration-150 ${
                      role === 'head'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md shadow-orange-500/10'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Dept Head (प्रमुख)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`flex items-center justify-center gap-1 py-2.5 rounded-xl border font-bold text-[10px] transition-all duration-150 ${
                      role === 'staff' || role === 'telecaller'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md shadow-orange-500/10'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    Staff (स्टाफ सदस्य)
                  </button>
                </div>
              </div>

              {/* Department Segment Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Company Segment / Department (विभाग)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepartment('Tech')}
                    className={`py-2 rounded-xl border font-bold text-[10px] transition-all duration-150 ${
                      department === 'Tech'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    💻 Tech (तकनीकी)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepartment('NonTech')}
                    className={`py-2 rounded-xl border font-bold text-[10px] transition-all duration-150 ${
                      department === 'NonTech'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    ⚙️ Non-Tech (सामान्य)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepartment('Sales')}
                    className={`py-2 rounded-xl border font-bold text-[10px] transition-all duration-150 ${
                      department === 'Sales'
                        ? 'bg-[#f97316] border-[#f97316] text-white shadow-md'
                        : 'bg-[#151922] border-[#222b3c] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    📞 Sales (मार्केटिंग)
                  </button>
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Phone / WhatsApp Number (फ़ोन / व्हाट्सएप नंबर)
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
                />
              </div>
            </>
          )}

          {/* Name Field (shown in sign-in, register, and recovery tabs) */}
          {(activeTab === 'signin' || activeTab === 'register' || activeTab === 'recovery') && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-500" />
                {activeTab === 'recovery' && recoveryType === 'main_admin' 
                  ? 'Main Admin Name (मुख्य एडमिन का नाम)' 
                  : 'Your Name / Username (आपका नाम / यूजरनेम)'}
              </label>
              <input
                id="name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Suresh Gupta"
                className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
              />
            </div>
          )}

          {/* Email Field (shown in register and main_admin recovery) */}
          {(activeTab === 'register' || (activeTab === 'recovery' && recoveryType === 'main_admin')) && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                Email Address (पंजीकृत ईमेल पता)
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
          )}

          {/* Password Field (only shown in signin and register) */}
          {activeTab !== 'recovery' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Password (पासवर्ड)
                </label>
                {activeTab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('recovery');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-xs text-[#f97316] hover:underline font-medium cursor-pointer"
                  >
                    Forgot password? (पासवर्ड भूल गए?)
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
          )}

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
            ) : recoveryType === 'staff' ? (
              'Send Recovery Request to Main Admin'
            ) : (
              'Recover Password on Whatsapp & Email'
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
                : recoveryType === 'staff'
                  ? 'अपना पासवर्ड भूल जाने पर, यहाँ से पासवर्ड रीसेट का अनुरोध सीधे मुख्य एडमिन को भेजें।'
                  : 'यदि मुख्य एडमिन पासवर्ड भूल जाएं, तो पंजीकृत नाम और ईमेल भरकर व्हाट्सएप और ईमेल पर पुनः प्राप्त कर सकते हैं।'}
          </p>
        </div>
      </div>
    </div>
  );
}
