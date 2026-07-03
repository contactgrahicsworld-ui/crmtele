import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Upload, Database, Disc, Key, 
  DollarSign, HardDrive, Settings, LogOut, CheckCircle, 
  Trash2, Plus, Play, Pause, RefreshCw, ChevronRight, UserPlus
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { User, Lead, CallLog, SupportTicket } from '../types';

interface AdminDashboardProps {
  user: { id: string; name: string; email: string; role: 'admin' | 'telecaller' };
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  // Mount protection: Strictly block telecallers from operating the Admin Panel
  if (user.role !== 'admin') {
    onLogout();
    return null;
  }

  const [activeTab, setActiveTab] = useState<'analytics' | 'telecallers' | 'upload' | 'leads' | 'recordings' | 'resets' | 'payroll' | 'backups' | 'autocall' | 'support'>('analytics');
  
  // Data State
  const [telecallers, setTelecallers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [autoCallDelay, setAutoCallDelay] = useState<number>(5);
  const [autoCallEnabled, setAutoCallEnabled] = useState<boolean>(true);

  // Form States
  const [singleLead, setSingleLead] = useState({ name: '', phone: '', email: '', requirements: '', assignedTo: '' });
  const [csvContent, setCsvContent] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkAssignUser, setBulkAssignUser] = useState('');
  
  // User Management Forms
  const [editingUserRates, setEditingUserRates] = useState<string | null>(null);
  const [newRates, setNewRates] = useState({ salaryBase: 12000, commissionRate: 100 });
  const [pwdResetUser, setPwdResetUser] = useState('');
  const [newPwd, setNewPwd] = useState('');

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Custom Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Feedback State
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'success' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load All CRM Data from Backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, leadsRes, callsRes, supportRes, backupsRes, configRes] = await Promise.all([
          fetch('/api/users', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/leads', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/calls', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/support', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/backups', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/config', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } })
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setTelecallers(usersData.filter((u: User) => u.role === 'telecaller'));
        }
        if (leadsRes.ok) setLeads(await leadsRes.json());
        if (callsRes.ok) setCallLogs(await callsRes.json());
        if (supportRes.ok) setSupportTickets(await supportRes.json());
        if (backupsRes.ok) setBackups(await backupsRes.json());
        if (configRes.ok) {
          const cfg = await configRes.json();
          setAutoCallDelay(cfg.delaySeconds || 5);
          setAutoCallEnabled(cfg.enabled !== false);
        }
      } catch (err) {
        console.error('Failed to fetch CRM data', err);
      }
    };
    fetchData();
  }, [refreshTrigger, user.role, user.id]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: 'success' }), 4000);
  };

  // Add a Single Lead
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleLead.name || !singleLead.phone) {
      showNotification('Name and Phone number are required', 'error');
      return;
    }

    try {
      const res = await fetch('/api/leads/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify(singleLead),
      });
      if (res.ok) {
        showNotification('Lead successfully added!');
        setSingleLead({ name: '', phone: '', email: '', requirements: '', assignedTo: '' });
        triggerRefresh();
      } else {
        const d = await res.json();
        showNotification(d.error || 'Failed to add lead', 'error');
      }
    } catch (err) {
      showNotification('Connection error', 'error');
    }
  };

  // Assign lead
  const handleAssignLead = async (leadId: string, userId: string) => {
    try {
      const res = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ 
          leadId, 
          userId: userId || null,
          adminId: user.id,
          adminName: user.name
        }),
      });
      if (res.ok) {
        showNotification('Lead assigned successfully!');
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Failed to assign lead', 'error');
    }
  };

  // Bulk Assign selected leads
  const handleBulkAssign = async () => {
    if (selectedLeads.length === 0) {
      showNotification('No leads selected', 'error');
      return;
    }
    try {
      const res = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ 
          leadIds: selectedLeads, 
          userId: bulkAssignUser || null,
          adminId: user.id,
          adminName: user.name
        }),
      });
      if (res.ok) {
        showNotification(`Assigned ${selectedLeads.length} leads successfully!`);
        setSelectedLeads([]);
        setBulkAssignUser('');
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Failed bulk assignment', 'error');
    }
  };

  // Toggle Bulk Selection
  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // CSV Lead Upload Parser
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      showNotification('Please paste CSV data first', 'error');
      return;
    }

    // Simple CSV parser
    const lines = csvContent.split('\n');
    const parsedLeads: any[] = [];
    
    // Expect Header: name, phone, email, requirements, notes
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const leadObj: any = {};
      
      headers.forEach((h, idx) => {
        if (values[idx]) {
          leadObj[h] = values[idx];
        }
      });

      if (leadObj.name && leadObj.phone) {
        parsedLeads.push(leadObj);
      }
    }

    if (parsedLeads.length === 0) {
      showNotification('Could not parse any valid leads. Double-check headers.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ leads: parsedLeads }),
      });
      if (res.ok) {
        showNotification(`Successfully imported ${parsedLeads.length} leads!`);
        setCsvContent('');
        triggerRefresh();
      } else {
        showNotification('Import failed', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    }
  };

  // Play call recording audio saved on server
  const handlePlayRecording = (recordingId: string) => {
    if (playingAudioId === recordingId) {
      audioElement?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const newAudio = new Audio(`/api/calls/recording/${recordingId}`);
    newAudio.onended = () => setPlayingAudioId(null);
    newAudio.onerror = () => {
      showNotification('Recording failed to load or does not exist', 'error');
      setPlayingAudioId(null);
    };
    newAudio.play();
    
    setAudioElement(newAudio);
    setPlayingAudioId(recordingId);
  };

  // Update rates for telecaller
  const handleUpdateRates = async (userId: string) => {
    try {
      const res = await fetch('/api/users/update-rates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ userId, ...newRates }),
      });
      if (res.ok) {
        showNotification('Rates updated successfully!');
        setEditingUserRates(null);
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Failed to update rates', 'error');
    }
  };

  // Reset User Password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdResetUser || !newPwd) {
      showNotification('Please select a user and type new password', 'error');
      return;
    }
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ userId: pwdResetUser, newPassword: newPwd }),
      });
      if (res.ok) {
        showNotification('User password updated successfully!');
        setPwdResetUser('');
        setNewPwd('');
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Password reset failed', 'error');
    }
  };

  // Save Config Changes
  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/config/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ delaySeconds: autoCallDelay, enabled: autoCallEnabled }),
      });
      if (res.ok) {
        showNotification('Configurations saved successfully!');
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Failed to save config', 'error');
    }
  };

  // Trigger manual Daily cloud backup
  const handleManualBackup = async () => {
    try {
      const res = await fetch('/api/backups/create', { 
        method: 'POST',
        headers: {
          'x-user-role': user.role,
          'x-user-id': user.id
        }
      });
      if (res.ok) {
        showNotification('Durable auto-backup created successfully!');
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Failed to generate backup', 'error');
    }
  };

  // Backup Share States & Handler
  const [shareChannel, setShareChannel] = useState<'download' | 'whatsapp' | 'email'>('download');
  const [shareDestination, setShareDestination] = useState('+91');
  const [shareEmail, setShareEmail] = useState('contact.grahicsworld@gmail.com');
  const [shareNotes, setShareNotes] = useState('');
  const [sharingBackup, setSharingBackup] = useState(false);

  const handleShareBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSharingBackup(true);
    const destination = shareChannel === 'whatsapp' ? shareDestination : shareEmail;
    try {
      const res = await fetch('/api/backups/share', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ 
          channel: shareChannel, 
          destination, 
          notes: shareNotes 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (shareChannel === 'whatsapp' && data.link) {
          window.open(data.link, '_blank');
          showNotification('WhatsApp share initialized! Opening in new tab.');
        } else {
          showNotification(data.message || 'Backup successfully dispatched!');
        }
        setShareNotes('');
      } else {
        showNotification(data.error || 'Failed to dispatch backup', 'error');
      }
    } catch (err) {
      showNotification('Network connection error', 'error');
    } finally {
      setSharingBackup(false);
    }
  };

  // Support Reply Submission
  const handleResolveTicket = async (ticketId: string, replyText: string) => {
    try {
      const res = await fetch('/api/support/reply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ ticketId, reply: replyText }),
      });
      if (res.ok) {
        showNotification('Ticket resolved with reply!');
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Failed to reply', 'error');
    }
  };

  // Admin feature: Global Reset to Zero (for analytics & call logs)
  const handleResetAll = () => {
    showConfirm(
      "Reset Analytics (रीसेट करें)",
      "WARNING: Are you sure you want to reset ALL call logs & analytics metrics to zero? This will clean up all dial logs! (क्या आप सभी एनालिटिक्स और कॉल लॉग्स को जीरो पर रीसेट करना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/admin/reset-all', {
            method: 'POST',
            headers: {
              'x-user-role': user.role,
              'x-user-id': user.id
            }
          });
          if (res.ok) {
            showNotification('Analytics reset to zero successfully!');
            triggerRefresh();
          } else {
            showNotification('Reset failed', 'error');
          }
        } catch (err) {
          showNotification('Network error', 'error');
        }
      }
    );
  };

  // Admin feature: Delete Lead
  const handleDeleteLead = (leadId: string) => {
    showConfirm(
      "Delete Lead (लीड हटाएं)",
      "Are you sure you want to delete this lead from the database? (क्या आप इस लीड को हटाना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/leads/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': user.role,
              'x-user-id': user.id
            },
            body: JSON.stringify({ leadId })
          });
          if (res.ok) {
            showNotification('Lead successfully deleted!');
            triggerRefresh();
          } else {
            showNotification('Failed to delete lead', 'error');
          }
        } catch (err) {
          showNotification('Network error', 'error');
        }
      }
    );
  };

  // Admin feature: Delete Call Log Recording (Dustbin feature)
  const handleDeleteCallLog = (callId: string) => {
    showConfirm(
      "Delete Call Log (कॉल लॉग हटाएं)",
      "Are you sure you want to delete this recorded call log? (क्या आप इस कॉल लॉग को हटाना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/calls/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': user.role,
              'x-user-id': user.id
            },
            body: JSON.stringify({ callId })
          });
          if (res.ok) {
            showNotification('Call log deleted successfully!');
            triggerRefresh();
          } else {
            showNotification('Failed to delete call log', 'error');
          }
        } catch (err) {
          showNotification('Network error', 'error');
        }
      }
    );
  };

  // Admin feature: Save Admin Feedback on a call session
  const handleSaveCallFeedback = async (callId: string, feedback: string) => {
    try {
      const res = await fetch('/api/calls/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ callId, feedback })
      });
      if (res.ok) {
        showNotification('Feedback saved successfully!');
        triggerRefresh();
      } else {
        showNotification('Failed to save feedback', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    }
  };

  // Admin feature: Delete support ticket (Dustbin feature)
  const handleDeleteTicket = (ticketId: string) => {
    showConfirm(
      "Delete Ticket (टिकट हटाएं)",
      "Are you sure you want to delete this support ticket? (क्या आप इस टिकट को हटाना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/support/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': user.role,
              'x-user-id': user.id
            },
            body: JSON.stringify({ ticketId })
          });
          if (res.ok) {
            showNotification('Support ticket successfully deleted!');
            triggerRefresh();
          } else {
            showNotification('Failed to delete ticket', 'error');
          }
        } catch (err) {
          showNotification('Network error', 'error');
        }
      }
    );
  };

  // Admin feature: Delete a backup snapshot (Dustbin feature)
  const handleDeleteBackup = (backupId: string) => {
    showConfirm(
      "Delete Backup (बैकअप हटाएं)",
      "Are you sure you want to delete this backup snapshot? (क्या आप इस बैकअप को हटाना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/backups/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': user.role,
              'x-user-id': user.id
            },
            body: JSON.stringify({ backupId })
          });
          if (res.ok) {
            showNotification('Backup deleted successfully!');
            triggerRefresh();
          } else {
            showNotification('Failed to delete backup', 'error');
          }
        } catch (err) {
          showNotification('Network error', 'error');
        }
      }
    );
  };

  // Admin feature: Delete telecaller user (Dustbin feature)
  const handleDeleteUser = (userId: string) => {
    showConfirm(
      "Delete User (यूजर हटाएं)",
      "WARNING: Are you sure you want to delete this telecaller user entirely from the system? (क्या आप इस टेलीकॉलर यूजर को हटाना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/users/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': user.role,
              'x-user-id': user.id
            },
            body: JSON.stringify({ userId })
          });
          if (res.ok) {
            showNotification('Telecaller deleted successfully!');
            triggerRefresh();
          } else {
            showNotification('Failed to delete telecaller', 'error');
          }
        } catch (err) {
          showNotification('Network error', 'error');
        }
      }
    );
  };

  // Admin feature: Reset performance metrics / payroll commissions for a telecaller
  const handleResetPerformance = (userId: string) => {
    showConfirm(
      "Reset Performance (परफॉरमेंस रीसेट करें)",
      "Are you sure you want to reset this telecaller's calling performance and payroll commissions to zero? (क्या आप इस टेलीकॉलर का परफॉरमेंस जीरो करना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/users/reset-performance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': user.role,
              'x-user-id': user.id
            },
            body: JSON.stringify({ userId })
          });
          if (res.ok) {
            showNotification('Telecaller performance reset to zero!');
            triggerRefresh();
          } else {
            showNotification('Failed performance reset', 'error');
          }
        } catch (err) {
          showNotification('Network error', 'error');
        }
      }
    );
  };

  // CALCULATE METRICS
  const totalCalls = callLogs.length;
  const interestedCalls = callLogs.filter(c => c.status === 'Interested').length;
  const callbackCalls = callLogs.filter(c => c.status === 'Spoke').length;
  const conversionRate = totalCalls > 0 ? Math.round((interestedCalls / totalCalls) * 100) : 0;

  // Generate chart data based on logs
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dayKey = d.toISOString().split('T')[0];

    const dayCalls = callLogs.filter(c => c.timestamp.startsWith(dayKey));
    const dayInterested = dayCalls.filter(c => c.status === 'Interested');

    return {
      name: dayStr,
      'Total Calls Connected': dayCalls.length,
      'Interested (Conversion Pitch)': dayInterested.length,
    };
  });

  return (
    <div className="min-h-screen bg-[#090b11] text-gray-100 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-[#10141e] border-b border-[#1f2635] px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 p-2.5 rounded-2xl border border-orange-500/30">
            <Users className="w-6 h-6 text-[#f97316]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">Tele-CRM</h1>
              <span className="bg-orange-500/10 border border-orange-500/30 text-[#f97316] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin Center
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Logged as <span className="text-gray-300 font-semibold">{user.name}</span> ({user.email})
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={triggerRefresh}
            className="p-2.5 bg-[#151922] hover:bg-[#1e2432] border border-[#222b3c] rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Database Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Exit Panel
          </button>
        </div>
      </header>

      {/* MAIN SCREEN GRID */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className="w-full md:w-64 bg-[#0d1017] border-r border-[#1f2635] p-4 flex flex-col gap-6">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3 px-2">
              OPERATIONAL TASKS
            </span>
            <nav className="flex flex-col gap-1.5">
              <button
                id="tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Interactive Analytics
              </button>
              
              <button
                id="tab-telecallers"
                onClick={() => setActiveTab('telecallers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'telecallers'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <Users className="w-4 h-4" />
                Telecallers (100+ DB)
              </button>

              <button
                id="tab-upload"
                onClick={() => setActiveTab('upload')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <Upload className="w-4 h-4" />
                Leads Upload Center
              </button>

              <button
                id="tab-leads"
                onClick={() => setActiveTab('leads')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'leads'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <Database className="w-4 h-4" />
                Active Leads Database (लीड लिस्ट)
              </button>

              <button
                id="tab-recordings"
                onClick={() => setActiveTab('recordings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'recordings'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <Disc className="w-4 h-4" />
                Recorded Call Logs
              </button>

              <button
                id="tab-resets"
                onClick={() => setActiveTab('resets')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'resets'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <Key className="w-4 h-4" />
                Password Resets
              </button>
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3 px-2">
              FINANCE & AUDITING
            </span>
            <nav className="flex flex-col gap-1.5">
              <button
                id="tab-payroll"
                onClick={() => setActiveTab('payroll')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'payroll'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Payroll Integration
              </button>

              <button
                id="tab-backups"
                onClick={() => setActiveTab('backups')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'backups'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                Daily Excel Backups
              </button>

              <button
                id="tab-autocall"
                onClick={() => setActiveTab('autocall')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'autocall'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <Settings className="w-4 h-4" />
                Auto-Calling Setup
              </button>

              <button
                id="tab-support"
                onClick={() => setActiveTab('support')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'support'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                24/7 Tech Support
              </button>
            </nav>
          </div>
          
          <div className="mt-auto p-3 bg-[#111622] border border-[#1e2635] rounded-2xl">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              CLOUD HOSTING STATUS
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-[#f97316]">Active & Secure</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">24/7 automated backups enabled.</p>
          </div>
        </aside>

        {/* WORKSPACE VIEWPORT CONTENT */}
        <main className="flex-1 p-6 overflow-y-auto">
          
          {/* Status message banners */}
          {statusMessage.text && (
            <div className={`p-4 rounded-xl border mb-6 text-sm flex items-center gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {statusMessage.type === 'success' ? '✅' : '⚠️'} {statusMessage.text}
            </div>
          )}

          {/* TAB 1: INTERACTIVE ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">General Dashboard Summary</h2>
                  <p className="text-xs text-gray-400 mt-1">Past performance graphs and daily metrics</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetAll}
                    className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition duration-200 cursor-pointer"
                    title="Reset all call log analytics to zero"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Analytics to Zero
                  </button>
                  <div className="flex bg-[#111622] border border-[#1f2635] rounded-xl p-1">
                    <button className="px-4 py-2 bg-[#f97316] text-white text-xs font-bold rounded-lg shadow-md">
                      Daily View
                    </button>
                    <button className="px-4 py-2 text-gray-400 text-xs font-bold rounded-lg hover:text-white">
                      Monthly View
                    </button>
                  </div>
                </div>
              </div>

              {/* METRIC CARD WIDGETS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl">
                  <span className="text-[10px] font-extrabold tracking-widest text-gray-400 block mb-1">
                    TOTAL CONNECTED CALLS
                  </span>
                  <div className="text-4xl font-black text-white">{totalCalls}</div>
                </div>
                <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl border-l-4 border-l-emerald-500">
                  <span className="text-[10px] font-extrabold tracking-widest text-emerald-400 block mb-1">
                    INTERESTED / QUALIFIED
                  </span>
                  <div className="text-4xl font-black text-emerald-400">{interestedCalls}</div>
                </div>
                <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl border-l-4 border-l-orange-500">
                  <span className="text-[10px] font-extrabold tracking-widest text-orange-400 block mb-1">
                    SPOKE / CALLBACKS
                  </span>
                  <div className="text-4xl font-black text-orange-400">{callbackCalls}</div>
                </div>
                <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl">
                  <span className="text-[10px] font-extrabold tracking-widest text-gray-400 block mb-1">
                    CONVERSION RATE
                  </span>
                  <div className="text-4xl font-black text-white flex items-center gap-2">
                    {conversionRate}%
                    <span className="text-emerald-500 text-sm font-bold flex items-center">↗</span>
                  </div>
                </div>
              </div>

              {/* RECHARTS CHANNELS & TRENDS */}
              <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#f97316] rounded-full"></span>
                  Call Volume & Performance Analytics (Hindi & English Stats)
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorInterested" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2635" />
                      <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 11 }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#131924', borderColor: '#1f2635', borderRadius: 12 }} 
                        labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="Total Calls Connected" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                      <Area type="monotone" dataKey="Interested (Conversion Pitch)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInterested)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TELECALLERS DATABASE */}
          {activeTab === 'telecallers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Active Telecallers Console</h2>
                  <p className="text-xs text-gray-400 mt-1">Configure base salaries, tracking, and access rules</p>
                </div>
                <button
                  onClick={handleResetAll}
                  className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition duration-200 cursor-pointer"
                  title="Reset all active telecaller call performance counts to zero"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Console to Zero
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* LIST TELECALLERS */}
                <div className="md:col-span-2 space-y-4">
                  {telecallers.map(caller => {
                    // Calc their performance
                    const callsAssigned = leads.filter(l => l.assignedTo === caller.id).length;
                    const interestedCount = callLogs.filter(c => c.telecallerId === caller.id && c.status === 'Interested').length;
                    
                    return (
                      <div key={caller.id} className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">{caller.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              caller.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {caller.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{caller.email}</p>
                          
                          <div className="flex gap-4 mt-3 text-xs">
                            <div>
                              <span className="text-gray-500">Leads Assigned:</span>{' '}
                              <strong className="text-white">{callsAssigned}</strong>
                            </div>
                            <div>
                              <span className="text-gray-500">Conversions:</span>{' '}
                              <strong className="text-emerald-400">{interestedCount}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-t md:border-t-0 border-[#1f2635] pt-3 md:pt-0">
                          {editingUserRates === caller.id ? (
                            <div className="flex flex-col gap-2 bg-[#0e121a] p-3 rounded-xl border border-[#1f2635]">
                              <div className="flex gap-2">
                                <div className="w-24">
                                  <label className="text-[10px] text-gray-400 block">Base Salary</label>
                                  <input 
                                    type="number" 
                                    value={newRates.salaryBase}
                                    onChange={(e) => setNewRates(prev => ({ ...prev, salaryBase: Number(e.target.value) }))}
                                    className="w-full bg-[#151922] text-white border border-[#222b3c] rounded px-2 py-1 text-xs"
                                  />
                                </div>
                                <div className="w-24">
                                  <label className="text-[10px] text-gray-400 block">Commission</label>
                                  <input 
                                    type="number" 
                                    value={newRates.commissionRate}
                                    onChange={(e) => setNewRates(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                                    className="w-full bg-[#151922] text-white border border-[#222b3c] rounded px-2 py-1 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end mt-1">
                                <button 
                                  onClick={() => setEditingUserRates(null)}
                                  className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleUpdateRates(caller.id)}
                                  className="px-2 py-1 text-[10px] bg-[#f97316] text-white rounded font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-xs text-gray-400">
                                Pay Rates: <strong className="text-white">₹{caller.salaryBase}</strong> base / <strong className="text-emerald-400">₹{caller.commissionRate}</strong> comm
                              </p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    setEditingUserRates(caller.id);
                                    setNewRates({ salaryBase: caller.salaryBase, commissionRate: caller.commissionRate });
                                  }}
                                  className="text-xs bg-[#151922] border border-[#222b3c] px-3 py-1.5 rounded-lg text-gray-300 hover:text-white transition cursor-pointer"
                                >
                                  Edit Rates
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch('/api/users/toggle-status', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: caller.id }),
                                      });
                                      if (res.ok) {
                                        showNotification('User status toggled!');
                                        triggerRefresh();
                                      }
                                    } catch (err) {
                                      showNotification('Failed to toggle status', 'error');
                                    }
                                  }}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                                    caller.status === 'active'
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}
                                >
                                  {caller.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* HELP CARD */}
                <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl h-fit space-y-4">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <UserPlus className="w-5 h-5 text-[#f97316]" />
                    Managing Callers
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Telecallers can register accounts independently from the login portal. By default, new telecallers are active and assigned standard basic salary options. Use this screen to override pricing contracts.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Suspended telecallers are immediately blocked from dialing leads or accessing the CRM portal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEADS UPLOAD CENTER */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white">Leads Upload & Entry Desk</h2>
                <p className="text-xs text-gray-400 mt-1">Upload client sheets via paste CSV or manual input entry</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* MANUAL SINGLE ENTRY */}
                <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#f97316]" /> Single Client Lead Entry
                  </h3>
                  <form onSubmit={handleAddLead} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">NAME *</label>
                      <input 
                        type="text" 
                        required
                        value={singleLead.name}
                        onChange={(e) => setSingleLead(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">PHONE NUMBER (WITH COUNTRY CODE) *</label>
                      <input 
                        type="text" 
                        required
                        value={singleLead.phone}
                        onChange={(e) => setSingleLead(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="e.g. +919876543210"
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">EMAIL ADDRESS</label>
                      <input 
                        type="email" 
                        value={singleLead.email}
                        onChange={(e) => setSingleLead(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. ramesh@example.com"
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">REQUIREMENTS / PRODUCTS</label>
                      <textarea 
                        value={singleLead.requirements}
                        onChange={(e) => setSingleLead(prev => ({ ...prev, requirements: e.target.value }))}
                        placeholder="e.g. Wants catalog of wedding cardboard templates"
                        rows={3}
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">ASSIGN IMMEDIATE TO TELECALLER</label>
                      <select 
                        value={singleLead.assignedTo}
                        onChange={(e) => setSingleLead(prev => ({ ...prev, assignedTo: e.target.value }))}
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] rounded-xl px-4 py-2 text-sm outline-none"
                      >
                        <option value="">Leave Unassigned</option>
                        {telecallers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Add & Save Client Lead
                    </button>
                  </form>
                </div>

                {/* CSV MASS IMPORT WITH REAL FILE SELECTOR */}
                <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#f97316]" /> Bulk Excel / CSV Upload Desk
                  </h3>
                  <div className="space-y-4">
                    {/* Visual File Selector */}
                    <div className="border-2 border-dashed border-[#1f2635] hover:border-[#f97316] bg-[#0e121a] rounded-2xl p-6 text-center transition cursor-pointer relative group">
                      <input
                        type="file"
                        accept=".csv"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const text = evt.target?.result as string;
                            setCsvContent(text);
                            showNotification('Excel CSV File loaded! Click Parse below to import.');
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <Upload className="w-8 h-8 text-[#f97316] mx-auto mb-2 animate-pulse group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-white block mb-1">Select / Drag .CSV Lead Sheet File</span>
                      <span className="text-[10px] text-gray-500">Supports standard UTF-8 Microsoft Excel saved .CSV sheets</span>
                    </div>

                    <form onSubmit={handleCsvImport} className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">
                        CSV Preview / Paste Editor
                      </label>
                      <textarea 
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                        placeholder="name, phone, email, requirements&#10;Suresh Kumar, +919876543210, suresh@gmail.com, Needs cardboard boxes&#10;Deepak Dev, +918123456789, deepak@gmail.com, Inquiring printing prices"
                        rows={5}
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-3 text-xs font-mono resize-none"
                      />

                      <button 
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                      >
                        Parse & Import Uploaded Leads
                      </button>
                    </form>
                  </div>
                </div>

              </div>

              {/* CLEAR EXPLICIT UPLOAD INSTRUCTIONS */}
              <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl space-y-3">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  ℹ️ CSV / Excel Lead Upload Instruction Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400 leading-relaxed">
                  <div className="bg-[#0e121a] p-4 rounded-xl border border-[#1f2635] space-y-1.5">
                    <span className="font-extrabold text-white block text-xs">1. Setup Column Headers</span>
                    <p>The first line of your CSV sheet must contain column names. The headers are case-insensitive and can be placed in any order:</p>
                    <code className="text-orange-400 block mt-1 font-mono text-[10px] bg-[#111622] p-1 rounded">name, phone, email, requirements</code>
                  </div>
                  <div className="bg-[#0e121a] p-4 rounded-xl border border-[#1f2635] space-y-1.5">
                    <span className="font-extrabold text-white block text-xs">2. Format Rules</span>
                    <p>Ensure that phone numbers contain proper country codes (e.g. +91 or 91 for India). Avoid inserting special symbol brackets or spaces inside numbers to ensure WhatsApp dialers trigger seamlessly.</p>
                  </div>
                  <div className="bg-[#0e121a] p-4 rounded-xl border border-[#1f2635] space-y-1.5">
                    <span className="font-extrabold text-white block text-xs">3. Download Template</span>
                    <p>For immediate testing, download our compliant spreadsheet layout. Simply save your Excel workbook as an ".CSV" format before uploading.</p>
                    <a
                      href="/api/backups/download"
                      className="text-[#f97316] hover:underline block font-bold mt-1 text-[11px]"
                    >
                      Download Compliant Demo CSV Template ➡️
                    </a>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ACTIVE LEADS DATABASE */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Active Leads Central Registry</h2>
                  <p className="text-xs text-gray-400 mt-1">Assign unallocated client leads to telecallers singly or in bulk</p>
                </div>
                
                {/* BULK ACTIONS PANEL */}
                {selectedLeads.length > 0 && (
                  <div className="bg-[#111622] border border-orange-500/30 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                    <span className="text-xs text-orange-400 font-bold">
                      {selectedLeads.length} Selected
                    </span>
                    <select 
                      value={bulkAssignUser}
                      onChange={(e) => setBulkAssignUser(e.target.value)}
                      className="bg-[#0e121a] text-white border border-[#222b3c] rounded px-3 py-1.5 text-xs outline-none"
                    >
                      <option value="">Choose Telecaller...</option>
                      <option value="unassign">Unassign leads</option>
                      {telecallers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleBulkAssign}
                      className="bg-[#f97316] hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Execute Assignment
                    </button>
                  </div>
                )}
              </div>

              {/* LEADS LIST REGISTRY */}
              <div className="bg-[#111622] border border-[#1f2635] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1f2635] bg-[#0d1017]">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 w-12">
                          <input 
                            type="checkbox"
                            checked={selectedLeads.length === leads.length && leads.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedLeads(leads.map(l => l.id));
                              else setSelectedLeads([]);
                            }}
                            className="rounded accent-orange-500"
                          />
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">CLIENT INFO</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">CONTACT DETAILS</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">STATUS</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">ASSIGNED CALLER</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">LATEST CALL STATUS</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2635]">
                      {leads.map(lead => (
                        <tr key={lead.id} className="hover:bg-[#151922] transition-colors text-sm">
                          <td className="px-6 py-4 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => toggleSelectLead(lead.id)}
                              className="rounded accent-orange-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{lead.name}</div>
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={lead.requirements}>
                              {lead.requirements}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="text-gray-200 font-medium">{lead.phone}</div>
                            {lead.email && <div className="text-gray-500 mt-0.5">{lead.email}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              lead.status === 'New' ? 'bg-blue-500/10 text-blue-400' :
                              lead.status === 'Interested' ? 'bg-emerald-500/10 text-emerald-400' :
                              lead.status === 'Spoke' ? 'bg-orange-500/10 text-orange-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={lead.assignedTo || ''}
                              onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                              className="bg-[#0e121a] text-white border border-[#222b3c] rounded px-2 py-1 text-xs outline-none w-full max-w-[150px]"
                            >
                              <option value="">-- Unassigned --</option>
                              {telecallers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            {lead.assignedByAdminName && (
                              <div className="text-[10px] text-[#f97316] font-semibold mt-1 leading-tight">
                                By: {lead.assignedByAdminName}
                                {lead.assignedAt && (
                                  <span className="text-[9px] text-gray-500 font-normal block mt-0.5">
                                    on {new Date(lead.assignedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            {lead.lastCalled ? new Date(lead.lastCalled).toLocaleString() : 'Never Called'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 p-2 rounded-xl transition cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {leads.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-xs">
                            No client leads found in registry database. Use Leads Upload Center to add some!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RECORDED CALL LOGS */}
          {activeTab === 'recordings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white">Call Recording Logs</h2>
                <p className="text-xs text-gray-400 mt-1">Listen to automatic speech audio saved securely on the cloud server</p>
              </div>

              <div className="bg-[#111622] border border-[#1f2635] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1f2635] bg-[#0d1017]">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">CLIENT INFO</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">TELECALLER</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">CALL STATUS</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">DURATION</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">TIMESTAMP</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 text-center">PLAYBACK & ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2635] text-sm">
                      {callLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#151922] transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{log.leadName}</div>
                            <div className="text-xs text-gray-500 mt-1">{log.leadPhone}</div>
                            {log.notes && (
                              <div className="mt-1 bg-[#0e121a] text-gray-400 text-xs px-2.5 py-1.5 rounded-lg italic">
                                "{log.notes}"
                              </div>
                            )}

                            {/* Admin feedback input / display segment */}
                            <div className="mt-2.5 p-3 rounded-xl bg-[#0b0e14] border border-[#1f2635] space-y-2">
                              <label className="text-[9px] font-bold text-gray-500 block uppercase tracking-wider">
                                Daily Feedback Segment (फीडबैक Segment)
                              </label>
                              {log.adminFeedback ? (
                                <div className="text-xs text-[#f97316] font-medium bg-orange-500/5 px-2 py-1.5 rounded border border-orange-500/10 italic">
                                  "{log.adminFeedback}"
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 italic">No feedback submitted yet.</div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Advice, e.g. Call again tomorrow at 5pm..."
                                  id={`feedback-input-${log.id}`}
                                  defaultValue={log.adminFeedback || ''}
                                  className="bg-[#111622] text-white border border-[#222b3c] focus:border-[#f97316] text-xs px-2.5 py-1 rounded-lg outline-none flex-1"
                                />
                                <button
                                  onClick={() => {
                                    const val = (document.getElementById(`feedback-input-${log.id}`) as HTMLInputElement)?.value;
                                    handleSaveCallFeedback(log.id, val);
                                  }}
                                  className="bg-[#f97316] hover:bg-orange-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-lg transition cursor-pointer"
                                >
                                  Save Feedback
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-200">{log.telecallerName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.status === 'Interested' ? 'bg-emerald-500/10 text-emerald-400' :
                              log.status === 'Spoke' ? 'bg-orange-500/10 text-orange-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-300">
                            {log.duration}s
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              {log.hasRecording ? (
                                <button
                                  onClick={() => handlePlayRecording(log.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                    playingAudioId === log.id 
                                      ? 'bg-orange-500 text-white' 
                                      : 'bg-[#1e2535] text-[#f97316] hover:bg-[#28324a]'
                                  }`}
                                >
                                  {playingAudioId === log.id ? (
                                    <>
                                      <Pause className="w-3.5 h-3.5 fill-white" />
                                      Playing
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3.5 h-3.5 fill-[#f97316]" />
                                      Play
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-600 font-medium italic">No Audio</span>
                              )}

                              <button
                                onClick={() => handleDeleteCallLog(log.id)}
                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 p-2 rounded-lg transition cursor-pointer"
                                title="Delete call log (Dustbin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {callLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-xs">
                            No call logs have been recorded in this session yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PASSWORD RESETS */}
          {activeTab === 'resets' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white">Security & Password Administration</h2>
                <p className="text-xs text-gray-400 mt-1">Reset staff passwords or manage system access credentials</p>
              </div>

              <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl max-w-lg space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#f97316]" /> Instant Password override
                </h3>
                
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">SELECT STAFF TELECALLER</label>
                    <select 
                      value={pwdResetUser}
                      onChange={(e) => setPwdResetUser(e.target.value)}
                      className="w-full bg-[#0e121a] text-white border border-[#222b3c] rounded-xl px-4 py-2 text-sm outline-none"
                    >
                      <option value="">Choose caller...</option>
                      {telecallers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">SET NEW PASSWORD</label>
                    <input 
                      type="password" 
                      required
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Type secure new password"
                      className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Reset & Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 7: PAYROLL INTEGRATION */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white">Staff Payroll & Auditing</h2>
                <p className="text-xs text-gray-400 mt-1">Calculate real-time monthly payout totals based on calling achievements</p>
              </div>

              <div className="bg-[#111622] border border-[#1f2635] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1f2635] bg-[#0d1017]">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">TELECALLER NAME</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">BASE MONTHLY SALARY</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">COMMISSION CONTRACT RATE</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">INTERESTED CONVERSIONS</th>
                        <th className="px-6 py-4 text-xs font-bold text-orange-400">TOTAL MONTHLY SALARY OUTSTANDING</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400">PAYOUT ACCURACY</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 text-center">PAYROLL ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2635] text-sm">
                      {telecallers.map(caller => {
                        const interestedCount = callLogs.filter(c => c.telecallerId === caller.id && c.status === 'Interested').length;
                        const commissionEarned = interestedCount * caller.commissionRate;
                        const totalPayroll = caller.salaryBase + commissionEarned;
                        
                        return (
                          <tr key={caller.id} className="hover:bg-[#151922]">
                            <td className="px-6 py-4">
                              <div className="font-bold text-white">{caller.name}</div>
                              <div className="text-xs text-gray-500">{caller.email}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-300">₹{caller.salaryBase}</td>
                            <td className="px-6 py-4 text-gray-300">₹{caller.commissionRate} / lead</td>
                            <td className="px-6 py-4 text-emerald-400 font-bold">{interestedCount} leads</td>
                            <td className="px-6 py-4 font-black text-[#f97316] text-base">₹{totalPayroll}</td>
                            <td className="px-6 py-4">
                              <span className="text-emerald-500 font-semibold text-xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                100% Audited
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex gap-2 justify-center items-center">
                                <button
                                  onClick={() => handleResetPerformance(caller.id)}
                                  className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-[#f97316] font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                  title="Reset performance data to zero"
                                >
                                  Reset to Zero
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(caller.id)}
                                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 p-2 rounded-lg transition cursor-pointer"
                                  title="Delete Telecaller Entirely"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {telecallers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-xs">
                            No telecallers in registry to compute payroll calculations.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DAILY EXCEL BACKUPS */}
          {activeTab === 'backups' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-white">Daily Excel & CSV Backups</h2>
                  <p className="text-xs text-gray-400 mt-1">Secure cloud backup registry and manual storage extraction tools</p>
                </div>
                <button
                  onClick={handleManualBackup}
                  className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Initiate Cloud Backup
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* BACKUP EXPORT & CHANNEL DISPATCH PANEL */}
                <div className="md:col-span-2 bg-[#111622] border border-[#1f2635] p-6 rounded-2xl">
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-[#f97316]" /> Excel Backups & Dispatch Console
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Extract and download the entire current Active Leads Registry directly as a standard, universally readable Microsoft Excel compatible CSV sheet, or automatically route it via direct WhatsApp/email dispatch channels.
                    </p>
                  </div>

                  {/* Channel Tabs Selector */}
                  <div className="grid grid-cols-3 gap-2 bg-[#0d1017] p-1 rounded-xl border border-[#1f2635] mb-5 font-sans">
                    <button
                      type="button"
                      onClick={() => setShareChannel('download')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        shareChannel === 'download'
                          ? 'bg-[#f97316] text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📥 Excel CSV Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareChannel('whatsapp')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        shareChannel === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      💬 WhatsApp Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareChannel('email')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        shareChannel === 'email'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ✉️ Email Dispatch
                    </button>
                  </div>

                  {/* Form Content */}
                  <form onSubmit={handleShareBackup} className="space-y-4">
                    {shareChannel === 'download' && (
                      <div className="bg-[#151922] p-4 rounded-xl border border-[#1f2635] flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-gray-300">
                          <span className="font-bold text-white block mb-0.5">Ready for Local Save</span>
                          Download complete registry of leads and telecallers containing all status parameters.
                        </div>
                        <a
                          href="/api/backups/download"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-lg shadow transition cursor-pointer text-center block w-full sm:w-auto"
                        >
                          ⬇️ Download CSV File
                        </a>
                      </div>
                    )}

                    {shareChannel === 'whatsapp' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">RECIPIENT WHATSAPP NUMBER</label>
                            <input
                              type="text"
                              required
                              value={shareDestination}
                              onChange={(e) => setShareDestination(e.target.value)}
                              placeholder="e.g. +919876543210"
                              className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-emerald-500 outline-none rounded-xl px-4 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">CUSTOM MEMO / MESSAGE</label>
                            <input
                              type="text"
                              value={shareNotes}
                              onChange={(e) => setShareNotes(e.target.value)}
                              placeholder="e.g. Daily sales lead backup"
                              className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-emerald-500 outline-none rounded-xl px-4 py-2 text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={sharingBackup}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          💬 Send Data Backup via WhatsApp
                        </button>
                      </div>
                    )}

                    {shareChannel === 'email' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">RECIPIENT EMAIL ADDRESS</label>
                            <input
                              type="email"
                              required
                              value={shareEmail}
                              onChange={(e) => setShareEmail(e.target.value)}
                              placeholder="e.g. admin@company.com"
                              className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-blue-500 outline-none rounded-xl px-4 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-1">CUSTOM MEMO / MESSAGE</label>
                            <input
                              type="text"
                              value={shareNotes}
                              onChange={(e) => setShareNotes(e.target.value)}
                              placeholder="e.g. CRM database secure backup"
                              className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-blue-500 outline-none rounded-xl px-4 py-2 text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={sharingBackup}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          ✉️ Dispatch Backup to Email
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* AUTOBACKUP STATUS CARD */}
                <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">Automatic Backup Service</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                      Our servers perform scheduled database state preservation cycles every 24 hours automatically. All leads, calling logs, audio files, and user commissions are encrypted and archived safely.
                    </p>
                  </div>
                  <div className="bg-[#151922] border border-emerald-500/10 px-4 py-3 rounded-xl text-[11px] text-emerald-400 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    Auto Backup Service Running: OK
                  </div>
                </div>
              </div>

              {/* BACKUPS HISTORY LOGS */}
              <div className="bg-[#111622] border border-[#1f2635] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f2635] bg-[#0d1017]">
                  <h3 className="text-sm font-bold text-white">Backups Log Records</h3>
                </div>
                <div className="divide-y divide-[#1f2635]">
                  {backups.map(bk => (
                    <div key={bk.id} className="p-4 flex justify-between items-center hover:bg-[#151922]">
                      <div>
                        <h4 className="font-bold text-sm text-white">{bk.name}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">{new Date(bk.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs">
                          <span className="text-gray-400 block">{bk.leadsCount} leads preserved</span>
                          <span className="text-[#f97316] font-bold block mt-0.5">{bk.callsCount} call sessions</span>
                        </div>
                        <button
                          onClick={() => handleDeleteBackup(bk.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg transition duration-150 cursor-pointer"
                          title="Delete Backup snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {backups.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500">
                      No system backups manually created in this workspace yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 9: AUTO-CALLING DELAY SETUP */}
          {activeTab === 'autocall' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white">Dialer Console Settings</h2>
                <p className="text-xs text-gray-400 mt-1">Configure global automated dialer delay settings and auto-calling policies</p>
              </div>

              <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl max-w-lg space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Auto-Dialing Modes Policy</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    When telecallers activate Auto-Calling mode, completing a call log triggers an automatic countdown timer before dial-calling the next allocated customer lead.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300 font-bold">Default Dial Countdown Timer</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1"
                        max="60"
                        value={autoCallDelay}
                        onChange={(e) => setAutoCallDelay(Number(e.target.value))}
                        className="bg-[#0e121a] text-white border border-[#222b3c] rounded px-3 py-1 text-center font-bold text-sm w-16 outline-none"
                      />
                      <span className="text-xs text-gray-400">Seconds</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300 font-bold">Enable Global Auto-Calling System</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoCallEnabled}
                        onChange={(e) => setAutoCallEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#222b3c] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f97316]"></div>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handleSaveConfig}
                  className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Save Global Configurations
                </button>
              </div>
            </div>
          )}

          {/* TAB 10: 24/7 TECHNICAL SUPPORT TICKETS */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white">24/7 Technical Support Registry</h2>
                <p className="text-xs text-gray-400 mt-1">Audit and resolve telecaller technical support queries instantly</p>
              </div>

              <div className="bg-[#111622] border border-[#1f2635] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f2635] bg-[#0d1017]">
                  <h3 className="text-sm font-bold text-white">Active Support Query Tickets</h3>
                </div>
                <div className="divide-y divide-[#1f2635]">
                  {supportTickets.map(tk => {
                    return (
                      <div key={tk.id} className="p-6 space-y-4 hover:bg-[#151922] transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mr-2 ${
                              tk.status === 'open' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {tk.status}
                            </span>
                            <span className="text-xs text-gray-500">{new Date(tk.timestamp).toLocaleString()}</span>
                            <h4 className="font-extrabold text-base text-white mt-1.5">{tk.subject}</h4>
                            <p className="text-xs text-gray-400 mt-1">
                              From: <strong className="text-gray-300">{tk.userName}</strong> ({tk.userEmail})
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteTicket(tk.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg transition duration-150 cursor-pointer"
                            title="Delete Support Ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="bg-[#0e121a] border border-[#1f2635] p-4 rounded-xl text-sm text-gray-300 whitespace-pre-wrap">
                          {tk.message}
                        </div>

                        {tk.reply ? (
                          <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-[#f97316] uppercase tracking-wider">ADMINISTRATOR REPLY:</span>
                            <p className="text-sm text-gray-300 italic">"{tk.reply}"</p>
                          </div>
                        ) : (
                          <div className="bg-[#0c0f16] border border-[#1f2635] p-4 rounded-xl space-y-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Write Reply Resolution:</span>
                            <textarea 
                              placeholder="Type support reply or troubleshooting steps..."
                              rows={2}
                              id={`reply-text-${tk.id}`}
                              className="w-full bg-[#111622] border border-[#1f2635] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                            />
                            <div className="text-right">
                              <button
                                onClick={() => {
                                  const textVal = (document.getElementById(`reply-text-${tk.id}`) as HTMLTextAreaElement)?.value;
                                  if (!textVal) return showNotification('Reply content is required', 'error');
                                  handleResolveTicket(tk.id, textVal);
                                }}
                                className="bg-[#f97316] hover:bg-orange-600 text-white font-bold text-[11px] px-4 py-2 rounded-lg cursor-pointer"
                              >
                                Submit Support Reply & Resolve
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {supportTickets.length === 0 && (
                    <div className="p-12 text-center text-xs text-gray-500">
                      No customer/caller technical support tickets generated yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <h4 className="text-base font-extrabold text-white uppercase tracking-wider">{confirmState.title}</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{confirmState.message}</p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-[#151922] border border-[#222b3c] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel (रद्द करें)
              </button>
              <button
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Confirm (हाँ)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
