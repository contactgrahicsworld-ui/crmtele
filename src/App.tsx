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
  role: 'admin' | 'head' | 'staff' | 'telecaller';
  department?: 'Tech' | 'NonTech' | 'Sales';
  phone?: string;
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);

  // Restore session from localStorage on load
  useEffect(() => {
    const savedUser = localStorage.getItem('telecrm_user_session');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        
        // Auto check-in on reload if user is not main admin
        if (u && u.id !== 'u-admin') {
          fetch('/api/attendance/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id })
          }).catch(err => console.error("Auto check-in failed", err));
        }
      } catch (err) {
        localStorage.removeItem('telecrm_user_session');
      }
    }
  }, []);

  const handleLoginSuccess = async (userSession: UserSession) => {
    setUser(userSession);
    localStorage.setItem('telecrm_user_session', JSON.stringify(userSession));
    
    // Auto check-in on successful login
    if (userSession.id !== 'u-admin') {
      try {
        await fetch('/api/attendance/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userSession.id })
        });
      } catch (err) {
        console.error("Attendance login failed", err);
      }
    }
  };

  const handleLogout = async () => {
    if (user && user.id !== 'u-admin') {
      try {
        await fetch('/api/attendance/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
      } catch (err) {
        console.error("Attendance logout failed", err);
      }
    }
    setUser(null);
    localStorage.removeItem('telecrm_user_session');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans selection:bg-orange-500 selection:text-white">
      {!user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (user.role === 'admin' || user.role === 'head') ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <TelecallerDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

