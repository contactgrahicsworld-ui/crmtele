/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import TelecallerDashboard from './components/TelecallerDashboard';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'telecaller';
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);

  // Restore session from localStorage on load
  useEffect(() => {
    const savedUser = localStorage.getItem('telecrm_user_session');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('telecrm_user_session');
      }
    }
  }, []);

  const handleLoginSuccess = (userSession: UserSession) => {
    setUser(userSession);
    localStorage.setItem('telecrm_user_session', JSON.stringify(userSession));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('telecrm_user_session');
  };

  return (
    <div className="bg-[#090b11] min-h-screen text-gray-100 font-sans selection:bg-orange-500 selection:text-white">
      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : user.role === 'admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <TelecallerDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

