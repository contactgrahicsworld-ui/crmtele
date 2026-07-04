import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Upload, Database, Disc, Key, 
  DollarSign, HardDrive, Settings, LogOut, CheckCircle, 
  Trash2, Plus, Play, Pause, RefreshCw, ChevronRight, UserPlus, Shield,
  Briefcase, Calendar, Clock, Clipboard, FileText, Phone
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { User, Lead, CallLog, SupportTicket } from '../types';

interface AdminDashboardProps {
  user: { 
    id: string; 
    name: string; 
    email: string; 
    role: 'admin' | 'head' | 'staff' | 'telecaller';
    department?: 'Tech' | 'NonTech' | 'Sales';
    phone?: string;
  };
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  // Mount protection: Strictly block telecallers/unauthorized staff from operating the Admin/Head Panel
  if (user.role !== 'admin' && user.role !== 'head') {
    onLogout();
    return null;
  }

  const [activeTab, setActiveTab] = useState<'analytics' | 'telecallers' | 'upload' | 'leads' | 'recordings' | 'resets' | 'payroll' | 'backups' | 'autocall' | 'support' | 'hrm'>('analytics');
  
  // Data State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [editingFullUser, setEditingFullUser] = useState<any | null>(null);
  const [telecallers, setTelecallers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [autoCallDelay, setAutoCallDelay] = useState<number>(5);
  const [autoCallEnabled, setAutoCallEnabled] = useState<boolean>(true);

  // HRM Management States
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<any[]>([]);
  const [payrollReport, setPayrollReport] = useState<any[]>([]);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedSlipUser, setSelectedSlipUser] = useState<any | null>(null);
  const [hrmSubTab, setHrmSubTab] = useState<'leaves' | 'attendance' | 'payroll_audit' | 'tasks' | 'holidays'>('leaves');
  const [leaveStartDate, setLeaveStartDate] = useState<string>('');
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState<string>('');

  // State for Company Holidays
  const [companyHolidays, setCompanyHolidays] = useState<any[]>([]);
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayReason, setHolidayReason] = useState<string>('');

  // State for Tasks
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDate, setTaskDate] = useState<string>('');

  // Sub-admin submission / edit states
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [submitTaskRemark, setSubmitTaskRemark] = useState<string>('');
  const [submitTaskStatus, setSubmitTaskStatus] = useState<'Completed' | 'Pending'>('Completed');

  // Admin evaluation state
  const [evaluatingTaskId, setEvaluatingTaskId] = useState<string | null>(null);
  const [evaluateAction, setEvaluateAction] = useState<'Approved' | 'Denied'>('Approved');
  const [evaluateFeedback, setEvaluateFeedback] = useState<string>('');

  // Sub-admin appeal states
  const [appealingTaskId, setAppealingTaskId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState<string>('');

  // Admin appeal response states
  const [respondingAppealTaskId, setRespondingAppealTaskId] = useState<string | null>(null);
  const [appealReplyText, setAppealReplyText] = useState<string>('');
  const [appealReplyAction, setAppealReplyAction] = useState<'Approved' | 'Denied'>('Approved');

  // Leave Rejection & Response States
  const [rejectionModalLeaveId, setRejectionModalLeaveId] = useState<string | null>(null);
  const [rejectionInputReason, setRejectionInputReason] = useState<string>('');
  const [queryResponseLeaveId, setQueryResponseLeaveId] = useState<string | null>(null);
  const [queryResponseText, setQueryResponseText] = useState<string>('');
  const [queryResponseAction, setQueryResponseAction] = useState<'Approved' | 'Rejected'>('Approved');
  
  // Form States
  const [singleLead, setSingleLead] = useState({ name: '', phone: '', email: '', requirements: '', assignedTo: '' });
  const [csvContent, setCsvContent] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkAssignUser, setBulkAssignUser] = useState('');
  
  // User Management Forms
  const [editingUserRates, setEditingUserRates] = useState<string | null>(null);
  const [newRates, setNewRates] = useState({ salaryBase: 12000, commissionRate: 100, monthlyTarget: 5 });
  const [pwdResetUser, setPwdResetUser] = useState('');
  const [newPwd, setNewPwd] = useState('');

  // Staff Directory Search/Filter states
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSegmentFilter, setStaffSegmentFilter] = useState<'All' | 'Tech' | 'NonTech' | 'Sales'>('All');

  // Main Admin profile fields
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  // Password Recovery Requests State
  const [recoveryRequests, setRecoveryRequests] = useState<any[]>([]);

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
          setAllUsers(usersData);
          setTelecallers(usersData.filter((u: any) => u.role === 'telecaller' || u.role === 'staff'));
          setAdmins(usersData.filter((u: any) => u.role === 'admin' || u.role === 'head'));
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

        // Fetch recovery requests if admin
        if (user.role === 'admin' || user.role === 'head') {
          const recRes = await fetch('/api/auth/recovery-requests', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } });
          if (recRes.ok) {
            setRecoveryRequests(await recRes.json());
          }
        }
      } catch (err) {
        console.error('Failed to fetch CRM data', err);
      }
    };
    fetchData();
  }, [refreshTrigger, user.role, user.id]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Load HRM Data
  useEffect(() => {
    const fetchHRMData = async () => {
      try {
        const urlParams = user.id !== 'u-admin' ? `?adminId=${user.id}` : '';
        const [attRes, leavesRes, payrollRes, holidaysRes, tasksRes] = await Promise.all([
          fetch('/api/attendance', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/leaves', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch(`/api/payroll/report?month=${selectedPayrollMonth}`, { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/company-holidays', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch(`/api/tasks${urlParams}`, { headers: { 'x-user-role': user.role, 'x-user-id': user.id } })
        ]);

        if (attRes.ok) setAttendanceLogs(await attRes.json());
        if (leavesRes.ok) setLeaveApplications(await leavesRes.json());
        if (holidaysRes.ok) setCompanyHolidays(await holidaysRes.json());
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (payrollRes.ok) {
          const prData = await payrollRes.json();
          if (prData.success) {
            setPayrollReport(prData.report);
          }
        }
      } catch (err) {
        console.error("Failed to load HRM records", err);
      }
    };
    if (activeTab === 'hrm' || activeTab === 'payroll') {
      fetchHRMData();
    }
  }, [activeTab, selectedPayrollMonth, refreshTrigger, user.role, user.id]);

  const handleDeclareHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayReason) {
      showNotification("Please provide both Date and Reason for holiday", "error");
      return;
    }
    try {
      const res = await fetch('/api/company-holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ date: holidayDate, reason: holidayReason })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Company Holiday declared successfully!");
        setHolidayDate('');
        setHolidayReason('');
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to declare holiday", "error");
      }
    } catch (err) {
      showNotification("Connection error", "error");
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/company-holidays/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': user.role,
          'x-user-id': user.id
        }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Holiday deleted successfully");
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to delete holiday", "error");
      }
    } catch (err) {
      showNotification("Connection error", "error");
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskAssigneeId || !taskTitle || !taskDate) {
      showNotification("Please select employee, enter Title and Date", "error");
      return;
    }
    const assignee = allUsers.find(a => a.id === taskAssigneeId);
    if (!assignee) return;
 
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          adminId: taskAssigneeId,
          adminName: assignee.name,
          title: taskTitle,
          date: taskDate,
          assignedTo: taskAssigneeId,
          assignedToName: assignee.name,
          assignedBy: user.id,
          assignedByName: user.name,
          department: assignee.department || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Task assigned successfully!");
        setTaskTitle('');
        setTaskDate('');
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to assign task", "error");
      }
    } catch (err) {
      showNotification("Connection error", "error");
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTaskRemark.trim()) {
      showNotification("Please provide a genuine remark/reason", "error");
      return;
    }
    try {
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId: submittingTaskId,
          status: submitTaskStatus,
          remark: submitTaskRemark
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Task submission sent to Main Admin!");
        setSubmittingTaskId(null);
        setSubmitTaskRemark('');
        triggerRefresh();
      } else {
        showNotification(data.error || "Submission failed", "error");
      }
    } catch (err) {
      showNotification("Connection error", "error");
    }
  };

  const handleEvaluateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateFeedback.trim()) {
      showNotification("Please write evaluation feedback", "error");
      return;
    }
    try {
      const res = await fetch('/api/tasks/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId: evaluatingTaskId,
          action: evaluateAction,
          adminReply: evaluateFeedback
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Task marked as ${evaluateAction}!`);
        setEvaluatingTaskId(null);
        setEvaluateFeedback('');
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to evaluate task", "error");
      }
    } catch (err) {
      showNotification("Connection error", "error");
    }
  };

  const handleAppealTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim()) {
      showNotification("Please type your question/appeal", "error");
      return;
    }
    try {
      const res = await fetch('/api/tasks/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId: appealingTaskId,
          appeal: appealText
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Appeal submitted successfully to Main Admin!");
        setAppealingTaskId(null);
        setAppealText('');
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to submit appeal", "error");
      }
    } catch (err) {
      showNotification("Connection error", "error");
    }
  };

  const handleRespondAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReplyText.trim()) {
      showNotification("Please write instructions/reply", "error");
      return;
    }
    try {
      const res = await fetch('/api/tasks/appeal-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId: respondingAppealTaskId,
          appealReply: appealReplyText,
          action: appealReplyAction
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Response to appeal submitted successfully!");
        setRespondingAppealTaskId(null);
        setAppealReplyText('');
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to submit appeal response", "error");
      }
    } catch (err) {
      showNotification("Connection error", "error");
    }
  };

  const handleApproveLeave = async (leaveId: string, action: 'Approved' | 'Rejected', rejectionReason?: string) => {
    try {
      const res = await fetch('/api/leaves/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ leaveId, action, rejectionReason }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Leave application ${action.toLowerCase()} successfully!`);
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to process leave", "error");
      }
    } catch (err) {
      showNotification("Error connecting to server", "error");
    }
  };

  const handleRespondToQuery = async (leaveId: string, response: string, action: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch('/api/leaves/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({ leaveId, response, action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Response registered and leave status updated to ${action}!`);
        triggerRefresh();
      } else {
        showNotification(data.error || "Failed to submit response", "error");
      }
    } catch (err) {
      showNotification("Error connecting to server", "error");
    }
  };

  // Sync main admin's profile state
  useEffect(() => {
    const mainAdmin = admins.find(a => a.id === 'u-admin');
    if (mainAdmin) {
      setProfileName(mainAdmin.name);
      setProfileEmail(mainAdmin.email);
      setProfilePassword(mainAdmin.password || '');
    } else if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [admins, user]);

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

  const handleFullUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFullUser) return;
    try {
      const res = await fetch('/api/users/admin-update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userId: editingFullUser.id,
          name: editingFullUser.name,
          email: editingFullUser.email,
          password: editingFullUser.password || undefined,
          phone: editingFullUser.phone,
          role: editingFullUser.role,
          department: editingFullUser.department,
          salaryBase: Number(editingFullUser.salaryBase),
          commissionRate: Number(editingFullUser.commissionRate),
          monthlyTarget: Number(editingFullUser.monthlyTarget)
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("User credentials and contract updated successfully!");
        setEditingFullUser(null);
        triggerRefresh();
      } else {
        showNotification(data.error || "Update failed", "error");
      }
    } catch (err) {
      showNotification("Network error", "error");
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

  // Update Main Admin profile handler
  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profileEmail) {
      showNotification('Name and Email are required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userId: 'u-admin',
          name: profileName,
          email: profileEmail,
          password: profilePassword || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Main Admin details updated successfully!');
        triggerRefresh();
      } else {
        showNotification(data.error || 'Failed to update admin profile', 'error');
      }
    } catch (err) {
      showNotification('Network connection error', 'error');
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
                Staff & Admins ({telecallers.length + admins.length})
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
                id="tab-hrm"
                onClick={() => setActiveTab('hrm')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'hrm'
                    ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#151922]'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                HRM Management (एचआरएम)
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

          {/* TAB 2: STAFF & ADMINISTRATORS DATABASE */}
          {activeTab === 'telecallers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Staff & Administrators Console (स्टाफ और एडमिन)</h2>
                  <p className="text-xs text-gray-400 mt-1">Configure base salaries, track performance, and manage active system administrators securely.</p>
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

              {/* Dynamic User Counts Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#111622] border border-[#1f2635] p-5 rounded-2xl">
                <div className="p-3 bg-[#151922] border border-[#1f2635] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Administrators</span>
                    <span className="text-xl font-black text-white">{admins.length} Admins</span>
                  </div>
                  <Shield className="w-7 h-7 text-orange-500 opacity-80" />
                </div>
                <div className="p-3 bg-[#151922] border border-[#1f2635] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Telecallers</span>
                    <span className="text-xl font-black text-white">{telecallers.length} Callers</span>
                  </div>
                  <Users className="w-7 h-7 text-[#f97316] opacity-80" />
                </div>
                <div className="p-3 bg-[#151922] border border-[#1f2635] rounded-xl flex items-center justify-between col-span-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Main Admin Status (मुख्य एडमिन)</span>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded mt-1 inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> u-admin (Protected / सुरक्षित)
                    </span>
                  </div>
                  <Shield className="w-7 h-7 text-indigo-500 opacity-80" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CONSOLIDATED DIRECTORY COLUMN */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2635] pb-4">
                      <div>
                        <h3 className="font-extrabold text-white text-base">Consolidated Directory (स्टाफ और प्रबंधक)</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Filter by departments (Tech, Sales, NonTech)</p>
                      </div>
                      
                      {/* Segment Filter buttons */}
                      <div className="flex flex-wrap gap-1">
                        {(['All', 'Tech', 'NonTech', 'Sales'] as const).map(seg => (
                          <button
                            key={seg}
                            onClick={() => setStaffSegmentFilter(seg)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              staffSegmentFilter === seg
                                ? 'bg-[#f97316] text-white'
                                : 'bg-[#151922] border border-[#222b3c] text-gray-400 hover:text-white'
                            }`}
                          >
                            {seg === 'All' ? 'All' : seg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <input
                        type="text"
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        placeholder="🔍 Search staff by name, email, credentials..."
                        className="w-full bg-[#0d1017] border border-[#1f2635] focus:border-[#f97316] text-xs px-3 py-2 rounded-xl text-white outline-none"
                      />
                    </div>

                    {/* Staff List */}
                    <div className="space-y-3">
                      {allUsers.filter(u => {
                        const matchesSearch = u.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(staffSearchQuery.toLowerCase());
                        const matchesSegment = staffSegmentFilter === 'All' ? true : u.department === staffSegmentFilter;
                        return matchesSearch && matchesSegment;
                      }).length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-6 text-center">No staff found matching search criteria.</p>
                      ) : (
                        allUsers.filter(u => {
                          const matchesSearch = u.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(staffSearchQuery.toLowerCase());
                          const matchesSegment = staffSegmentFilter === 'All' ? true : u.department === staffSegmentFilter;
                          return matchesSearch && matchesSegment;
                        }).map(emp => {
                          const isMainAdmin = emp.id === 'u-admin';
                          const cleanWhatsApp = emp.phone ? emp.phone.replace(/[^0-9]/g, '') : '';
                          return (
                            <div key={emp.id} className="bg-[#0e121a] border border-[#1e2635] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-white text-sm">{emp.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    emp.role === 'admin' ? 'bg-indigo-500/15 text-indigo-400' :
                                    emp.role === 'head' ? 'bg-orange-500/15 text-orange-400' :
                                    emp.role === 'staff' ? 'bg-blue-500/15 text-blue-400' :
                                    'bg-emerald-500/15 text-emerald-400'
                                  }`}>
                                    {emp.role === 'admin' ? (isMainAdmin ? 'Main Admin' : 'Sub Admin') : emp.role === 'head' ? 'Dept Head' : emp.role}
                                  </span>
                                  {emp.department && (
                                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-500/15 text-purple-400">
                                      {emp.department}
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${
                                    emp.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                  }`}>
                                    {emp.status}
                                  </span>
                                </div>
                                <div className="text-gray-400 space-y-0.5">
                                  <p><span className="text-gray-500">Email:</span> {emp.email}</p>
                                  {emp.phone && <p><span className="text-gray-500">Phone:</span> {emp.phone}</p>}
                                  <p><span className="text-gray-500">Salary Contract:</span> ₹{Number(emp.salaryBase || 0).toLocaleString()} base / ₹{emp.commissionRate || 0} comm / Target: {emp.monthlyTarget || 5} sales</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {emp.phone && (
                                  <>
                                    <a
                                      href={`https://wa.me/${cleanWhatsApp}`}
                                      target="_blank"
                                      referrerPolicy="no-referrer"
                                      className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 p-2 rounded-lg transition"
                                      title="WhatsApp Chat"
                                    >
                                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.755.002-2.61-1.01-5.063-2.85-6.906C16.628 2.1 14.183 1.082 12.01 1.082 6.57 1.082 2.146 5.51 2.143 10.894c-.001 1.702.469 3.361 1.361 4.8l-.995 3.637 3.543-.983z"/></svg>
                                    </a>
                                    <a
                                      href={`tel:${emp.phone}`}
                                      className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 p-2 rounded-lg transition"
                                      title="Phone Call"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  </>
                                )}

                                {user.id === 'u-admin' && (
                                  <button
                                    onClick={() => setEditingFullUser(emp)}
                                    className="bg-[#f97316]/10 hover:bg-[#f97316] border border-[#f97316]/20 text-[#f97316] hover:text-white px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                )}

                                {!isMainAdmin && user.id === 'u-admin' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch('/api/users/toggle-status', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId: emp.id }),
                                          });
                                          if (res.ok) {
                                            showNotification('User status toggled!');
                                            triggerRefresh();
                                          }
                                        } catch (err) {
                                          showNotification('Failed to toggle status', 'error');
                                        }
                                      }}
                                      className={`px-2 py-1.5 rounded-lg font-bold cursor-pointer ${
                                        emp.status === 'active'
                                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      }`}
                                    >
                                      {emp.status === 'active' ? 'Suspend' : 'Active'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(emp.id)}
                                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-1.5 border border-red-500/20 hover:border-red-500/40 rounded-lg transition duration-150 cursor-pointer"
                                      title="Delete Entirely"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* HELP CARD */}
                <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl h-fit space-y-4">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <UserPlus className="w-5 h-5 text-[#f97316]" />
                    Managing Users & Staff
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Telecallers can register accounts independently from the login portal. By default, new telecallers are active and assigned standard basic salary options. Use this screen to override pricing contracts.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Suspended telecallers are immediately blocked from dialing leads or accessing the CRM portal.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <strong>Administrators</strong> have complete access to database operations, configuration, call recordings, reset utilities, backups, and user access. The main admin account <code className="text-orange-400 font-mono">u-admin</code> is permanently protected from deletion.
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
                <h2 className="text-2xl font-black text-white">Security & Password Administration (सुरक्षा एवं पासवर्ड)</h2>
                <p className="text-xs text-gray-400 mt-1">Reset staff passwords or manage main administrator credentials securely.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* FORM 1: RESET PASSWORDS FOR ANY USER */}
                <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#f97316]" /> Reset User Password (स्टाफ पासवर्ड रीसेट)
                  </h3>
                  
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">SELECT REGISTERED USER (यूजर चुनें)</label>
                      <select 
                        value={pwdResetUser}
                        onChange={(e) => setPwdResetUser(e.target.value)}
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] rounded-xl px-4 py-2 text-sm outline-none"
                      >
                        <option value="">Choose user...</option>
                        <optgroup label="Administrators (सिस्टम एडमिन)">
                          {admins.map(a => (
                            <option key={a.id} value={a.id}>Admin: {a.name} ({a.email}) {a.id === 'u-admin' ? '⭐️ [Main Admin]' : ''}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Telecallers (टेलीकॉलर स्टाफ)">
                          {telecallers.map(c => (
                            <option key={c.id} value={c.id}>Caller: {c.name} ({c.email})</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">SET NEW PASSWORD (नया पासवर्ड)</label>
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

                {/* FORM 2: UPDATE MAIN ADMIN PROFILE */}
                <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#f97316]" /> Update Main Admin Profile (मुख्य एडमिन प्रोफाइल)
                  </h3>
                  
                  <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">ADMIN NAME (एडमिन का नाम)</label>
                      <input 
                        type="text" 
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Admin name"
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">ADMIN EMAIL (ईमेल पता)</label>
                      <input 
                        type="email" 
                        required
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">UPDATE PASSWORD (पासवर्ड बदलें)</label>
                      <input 
                        type="password" 
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder="Type secure new password"
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Save Admin Profile
                    </button>
                  </form>
                </div>

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

          {/* TAB: HRM MANAGEMENT */}
          {activeTab === 'hrm' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white">HRM Management (एचआरएम)</h2>
                <p className="text-xs text-gray-400 mt-1">Manage employee attendance, leave permissions, and detailed salary structures</p>
              </div>

              {/* Sub tabs */}
              <div className="flex flex-wrap border-b border-[#1f2635] gap-6">
                <button
                  onClick={() => setHrmSubTab('leaves')}
                  className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                    hrmSubTab === 'leaves' ? 'text-[#f97316]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Leave Requests (छुट्टियां)
                  {hrmSubTab === 'leaves' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316]"></span>}
                </button>
                <button
                  onClick={() => setHrmSubTab('attendance')}
                  className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                    hrmSubTab === 'attendance' ? 'text-[#f97316]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Attendance Logs (हाजिरी रजिस्टर)
                  {hrmSubTab === 'attendance' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316]"></span>}
                </button>
                <button
                  onClick={() => setHrmSubTab('tasks')}
                  className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                    hrmSubTab === 'tasks' ? 'text-[#f97316]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Daily Work Tasks (दैनिक कार्य)
                  {hrmSubTab === 'tasks' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316]"></span>}
                </button>
                <button
                  onClick={() => setHrmSubTab('holidays')}
                  className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                    hrmSubTab === 'holidays' ? 'text-[#f97316]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Company Holidays (सार्वजनिक अवकाश)
                  {hrmSubTab === 'holidays' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316]"></span>}
                </button>
                <button
                  onClick={() => setHrmSubTab('payroll_audit')}
                  className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                    hrmSubTab === 'payroll_audit' ? 'text-[#f97316]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Attendance-Based Payroll Audits (सैलरी गणना)
                  {hrmSubTab === 'payroll_audit' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316]"></span>}
                </button>
                {user.id !== 'u-admin' && (
                  <button
                    onClick={() => setHrmSubTab('my_salary_slip')}
                    className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                      hrmSubTab === 'my_salary_slip' ? 'text-[#f97316]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    My Salary Slip (मेरा सैलरी स्लिप)
                    {hrmSubTab === 'my_salary_slip' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316]"></span>}
                  </button>
                )}
              </div>

              {/* HRM Sub-tab content */}
              {hrmSubTab === 'leaves' && (
                <div className="space-y-6">
                  {/* Leave Application form for secondary admins */}
                  {user.id !== 'u-admin' && (
                    <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Apply for Leave (छुट्टी के लिए आवेदन करें)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={leaveStartDate}
                            onChange={(e) => setLeaveStartDate(e.target.value)}
                            className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">End Date</label>
                          <input
                            type="date"
                            value={leaveEndDate}
                            onChange={(e) => setLeaveEndDate(e.target.value)}
                            className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Reason for Leave (स्पष्ट कारण लिखें)</label>
                        <textarea
                          rows={3}
                          value={leaveReason}
                          onChange={(e) => setLeaveReason(e.target.value)}
                          placeholder="Please mention the exact reason for leave..."
                          className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl p-4 text-xs text-white outline-none focus:border-[#f97316]"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!leaveReason || !leaveStartDate || !leaveEndDate) {
                            showNotification("Please fill in all leave form parameters", "error");
                            return;
                          }
                          try {
                            const res = await fetch('/api/leaves/apply', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.id, reason: leaveReason, startDate: leaveStartDate, endDate: leaveEndDate })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              showNotification("Leave request submitted! Pending main admin approval.");
                              setLeaveReason('');
                              setLeaveStartDate('');
                              setLeaveEndDate('');
                              triggerRefresh();
                            } else {
                              showNotification(data.error || "Failed to apply", "error");
                            }
                          } catch (err) {
                            showNotification("Server communication error", "error");
                          }
                        }}
                        className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer"
                      >
                        Submit Leave Application (आवेदन भेजें)
                      </button>
                    </div>
                  )}

                  {/* Leave approval board (visible to main admin or as summary for secondary) */}
                  <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">
                      {user.id === 'u-admin' ? "Leave Applications Board" : "Your Leave Statuses"}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[#1f2635] text-xs text-gray-400">
                            <th className="pb-3">APPLICANT</th>
                            <th className="pb-3">ROLE</th>
                            <th className="pb-3">DATES</th>
                            <th className="pb-3">DAYS</th>
                            <th className="pb-3">REASON</th>
                            <th className="pb-3 text-center">STATUS</th>
                            {user.id === 'u-admin' && <th className="pb-3 text-center">ACTIONS</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2635] text-xs text-gray-300">
                          {leaveApplications
                            .filter(l => user.id === 'u-admin' || l.userId === user.id)
                            .map(leave => (
                              <tr key={leave.id} className="hover:bg-[#151922] align-top">
                                <td className="py-3 font-bold text-white">{leave.userName}</td>
                                <td className="py-3 uppercase text-[10px] text-gray-400">{leave.userRole}</td>
                                <td className="py-3">{leave.startDate} to {leave.endDate}</td>
                                <td className="py-3 font-bold text-orange-400">{leave.daysCount} days</td>
                                <td className="py-3 max-w-sm">
                                  <div className="font-medium text-gray-300 mb-1" title={leave.reason}>{leave.reason}</div>
                                  {leave.rejectionReason && (
                                    <div className="text-[10px] text-red-400 mt-1.5 bg-red-950/20 px-2 py-1.5 rounded border border-red-500/10 text-left leading-relaxed">
                                      <strong>अस्वीकृति का कारण:</strong> {leave.rejectionReason}
                                    </div>
                                  )}
                                  {leave.query && (
                                    <div className="text-[10px] text-purple-400 mt-1.5 bg-purple-950/20 px-2 py-1.5 rounded border border-purple-500/10 text-left leading-relaxed animate-pulse">
                                      <strong>कर्मचारी का सवाल (Query):</strong> {leave.query}
                                    </div>
                                  )}
                                  {leave.queryResponse && (
                                    <div className="text-[10px] text-emerald-400 mt-1.5 bg-emerald-950/20 px-2 py-1.5 rounded border border-emerald-500/10 text-left leading-relaxed">
                                      <strong>एडमिन का जवाब (Response):</strong> {leave.queryResponse}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase block w-max mx-auto border ${
                                    leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    leave.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    leave.status === 'Queried' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  }`}>
                                    {leave.status === 'Queried' ? 'Queried 💬' : leave.status}
                                  </span>
                                </td>
                                {user.id === 'u-admin' && (
                                  <td className="py-3 text-center">
                                    {leave.status === 'Pending' ? (
                                      <div className="flex gap-1.5 justify-center">
                                        <button
                                          onClick={() => handleApproveLeave(leave.id, 'Approved')}
                                          className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => {
                                            setRejectionModalLeaveId(leave.id);
                                            setRejectionInputReason('');
                                          }}
                                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    ) : leave.status === 'Queried' ? (
                                      <div className="flex justify-center">
                                        <button
                                          onClick={() => {
                                            setQueryResponseLeaveId(leave.id);
                                            setQueryResponseText('');
                                            setQueryResponseAction('Approved');
                                          }}
                                          className="bg-purple-500 hover:bg-purple-600 text-white border border-purple-600 px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                                        >
                                          Respond & Resolve
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-500 text-[10px]">Audited by {leave.approvedBy || 'Admin'}</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          {leaveApplications.filter(l => user.id === 'u-admin' || l.userId === user.id).length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-500">No leave applications registered.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {hrmSubTab === 'attendance' && (
                <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Daily Attendance Register</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#1f2635] text-xs text-gray-400">
                          <th className="pb-3">STAFF NAME</th>
                          <th className="pb-3">ROLE</th>
                          <th className="pb-3">DATE</th>
                          <th className="pb-3">CHECK-IN TIME</th>
                          <th className="pb-3">CHECK-OUT TIME</th>
                          <th className="pb-3 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2635] text-xs text-gray-300">
                        {attendanceLogs.map(log => (
                          <tr key={log.id} className="hover:bg-[#151922]">
                            <td className="py-3 font-bold text-white">{log.userName}</td>
                            <td className="py-3 uppercase text-[10px] text-gray-400">{log.userRole}</td>
                            <td className="py-3">{log.date}</td>
                            <td className="py-3 text-emerald-400 font-mono">{log.loginTime ? new Date(log.loginTime).toLocaleTimeString() : 'N/A'}</td>
                            <td className="py-3 text-orange-400 font-mono">{log.logoutTime ? new Date(log.logoutTime).toLocaleTimeString() : 'Active Session'}</td>
                            <td className="py-3 text-center">
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {attendanceLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500">No attendance logs logged yet today.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hrmSubTab === 'tasks' && (
                <div className="space-y-6">
                  {/* MAIN ADMIN / SUB-ADMIN / HEAD: Assign Task Form */}
                  {(user.role === 'admin' || user.role === 'head') && (
                    <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Assign Daily Task (दैनिक कार्य सौंपें)</h3>
                      <form onSubmit={handleAssignTask} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Select Assignee (कर्मचारी चुनें)</label>
                          <select
                            value={taskAssigneeId}
                            onChange={(e) => setTaskAssigneeId(e.target.value)}
                            className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-xs text-white"
                          >
                            <option value="">-- Select Employee --</option>
                            {(user.id === 'u-admin'
                              ? allUsers.filter(u => u.id !== 'u-admin')
                              : user.role === 'admin'
                              ? allUsers.filter(u => u.role === 'head' || u.role === 'staff' || u.role === 'telecaller')
                              : allUsers.filter(u => (u.role === 'staff' || u.role === 'telecaller') && u.department === user.department)
                            ).map(a => (
                              <option key={a.id} value={a.id}>{a.name} [{a.role.toUpperCase()}] {a.department ? `(${a.department})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Task Title / Assignment</label>
                          <input
                            type="text"
                            placeholder="e.g. Audit yesterday's sales logs"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Target Date</label>
                          <input
                            type="date"
                            value={taskDate}
                            onChange={(e) => setTaskDate(e.target.value)}
                            className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>
                        <div className="md:col-span-3 flex justify-end">
                          <button
                            type="submit"
                            className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer"
                          >
                            Assign Task (कार्य असाइन करें)
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Sub-Admin Task Actions: Submission & Appeal Forms */}
                  {user.id !== 'u-admin' && (
                    <div className="space-y-6">
                      {/* Submission Form */}
                      {submittingTaskId && (
                        <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 space-y-4">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider text-orange-500">Submit Daily Work Completion (कार्य पूरा होने की रिपोर्ट)</h3>
                          <form onSubmit={handleSubmitTask} className="space-y-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Task Details</label>
                              <div className="bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-3 text-xs text-white">
                                {tasks.find(t => t.id === submittingTaskId)?.title}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-2">Status</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={submitTaskStatus === 'Completed'}
                                    onChange={() => setSubmitTaskStatus('Completed')}
                                    className="accent-orange-500"
                                  />
                                  Completed (पूर्ण हुआ)
                                </label>
                                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={submitTaskStatus === 'Pending'}
                                    onChange={() => setSubmitTaskStatus('Pending')}
                                    className="accent-orange-500"
                                  />
                                  Still Pending (लंबित)
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Genuine Completion Remark / Reason (स्पष्ट टिप्पणी/कारण लिखें)</label>
                              <textarea
                                rows={3}
                                placeholder="Write exactly what you did or why it wasn't fully completed..."
                                value={submitTaskRemark}
                                onChange={(e) => setSubmitTaskRemark(e.target.value)}
                                className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl p-4 text-xs text-white outline-none focus:border-[#f97316]"
                              />
                            </div>
                            <div className="flex gap-3 justify-end">
                              <button
                                type="button"
                                onClick={() => setSubmittingTaskId(null)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Submit Task
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Appeal / Raise Question Form */}
                      {appealingTaskId && (
                        <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 space-y-4">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider text-[#f97316]">Appeal / Raise Question (अपील करें या प्रश्न पूछें)</h3>
                          <form onSubmit={handleAppealTask} className="space-y-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Task Title</label>
                              <div className="bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-3 text-xs text-white font-bold">
                                {tasks.find(t => t.id === appealingTaskId)?.title}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Main Admin Rejection Reason</label>
                              <div className="bg-[#0d1017] border border-[#1f2635] text-red-400 rounded-xl px-4 py-3 text-xs">
                                {tasks.find(t => t.id === appealingTaskId)?.adminReply}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Your Appeal / Question / Remarks (अपना प्रश्न या समाधान के लिए अपील लिखें)</label>
                              <textarea
                                rows={3}
                                placeholder="Explain your situation or request a clear solution from the main admin..."
                                value={appealText}
                                onChange={(e) => setAppealText(e.target.value)}
                                className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl p-4 text-xs text-white outline-none focus:border-[#f97316]"
                              />
                            </div>
                            <div className="flex gap-3 justify-end">
                              <button
                                type="button"
                                onClick={() => setAppealingTaskId(null)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Submit Appeal
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MAIN ADMIN: Evaluation & Appeal Response forms */}
                  {user.id === 'u-admin' && (
                    <div className="space-y-6">
                      {evaluatingTaskId && (
                        <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 space-y-4">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider text-orange-400">Evaluate Sub-Admin Task (कार्य मूल्यांकन)</h3>
                          <form onSubmit={handleEvaluateTask} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Task Title</label>
                                <div className="bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-3 text-xs text-white font-bold">
                                  {tasks.find(t => t.id === evaluatingTaskId)?.title}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Sub-Admin Remark</label>
                                <div className="bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-3 text-xs text-white">
                                  {tasks.find(t => t.id === evaluatingTaskId)?.remark || "No remark provided."}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-2 font-bold font-sans">Evaluation Action</label>
                              <div className="flex gap-4">
                                <button
                                  type="button"
                                  onClick={() => setEvaluateAction('Approved')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    evaluateAction === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#0d1017] text-gray-400 border-[#1f2635]'
                                  }`}
                                >
                                  Approve & Give Performance Incentive
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEvaluateAction('Denied')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    evaluateAction === 'Denied' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-[#0d1017] text-gray-400 border-[#1f2635]'
                                  }`}
                                >
                                  Deny / Reject with Reason
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Evaluation Feedback / Reason for Denial (मूल्यांकन टिप्पणी लिखें)</label>
                              <textarea
                                rows={3}
                                placeholder="Explain why this task is approved or denied..."
                                value={evaluateFeedback}
                                onChange={(e) => setEvaluateFeedback(e.target.value)}
                                className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl p-4 text-xs text-white outline-none focus:border-[#f97316]"
                              />
                            </div>
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => setEvaluatingTaskId(null)}
                                className="bg-[#0d1017] border border-[#1f2635] text-gray-400 px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Submit Evaluation
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {respondingAppealTaskId && (
                        <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 space-y-4">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider text-orange-400">Respond to Appeal & Instruct Sub-Admin (अपील का उत्तर और निर्देश)</h3>
                          <form onSubmit={handleRespondAppeal} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Sub-Admin Appeal / Question</label>
                                <div className="bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-3 text-xs text-orange-400 font-bold">
                                  {tasks.find(t => t.id === respondingAppealTaskId)?.appeal}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Original Denial Reason</label>
                                <div className="bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-3 text-xs text-gray-400">
                                  {tasks.find(t => t.id === respondingAppealTaskId)?.adminReply}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-2 font-bold font-sans">Updated Decision</label>
                              <div className="flex gap-4">
                                <button
                                  type="button"
                                  onClick={() => setAppealReplyAction('Approved')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    appealReplyAction === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#0d1017] text-gray-400 border-[#1f2635]'
                                  }`}
                                >
                                  Satisfactory Response: Approve & Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAppealReplyAction('Denied')}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    appealReplyAction === 'Denied' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-[#0d1017] text-gray-400 border-[#1f2635]'
                                  }`}
                                >
                                  Unsatisfactory: Keep Denied with further Instructions
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Reply Instructions / Resolution Details (निर्णय और निर्देश लिखें)</label>
                              <textarea
                                rows={3}
                                placeholder="Provide your detailed explanation, resolution steps, or feedback..."
                                value={appealReplyText}
                                onChange={(e) => setAppealReplyText(e.target.value)}
                                className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl p-4 text-xs text-white outline-none focus:border-[#f97316]"
                              />
                            </div>
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => setRespondingAppealTaskId(null)}
                                className="bg-[#0d1017] border border-[#1f2635] text-gray-400 px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                              >
                                Submit Response
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">
                      Hierarchical Tasks & Progress Register (दैनिक कार्य एवं प्रगति सूची)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans">
                        <thead>
                          <tr className="border-b border-[#1f2635] text-xs text-gray-400">
                            <th className="pb-3">ASSIGNED TO</th>
                            <th className="pb-3">ASSIGNED BY</th>
                            <th className="pb-3">DATE</th>
                            <th className="pb-3">TASK ASSIGNMENT</th>
                            <th className="pb-3">STATUS</th>
                            <th className="pb-3">REMARK / PROGRESS</th>
                            <th className="pb-3">FEEDBACK / REPLY</th>
                            <th className="pb-3 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2635] text-xs text-gray-300">
                          {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-[#151922]">
                              <td className="py-3 font-bold text-white">
                                {task.assignedToName || task.adminName || 'Sub-Admin'}
                                {task.department ? <span className="block text-[10px] text-gray-400 font-normal">Dept: {task.department}</span> : null}
                              </td>
                              <td className="py-3 text-gray-400">{task.assignedByName || 'Administrator'}</td>
                              <td className="py-3 font-mono">{task.date}</td>
                              <td className="py-3 font-bold text-white max-w-xs truncate">{task.title}</td>
                              <td className="py-3">
                                {task.status === 'Pending' && (
                                  <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Pending
                                  </span>
                                )}
                                {task.status === 'Submitted' && (
                                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Submitted (Evaluating)
                                  </span>
                                )}
                                {task.status === 'Approved' && (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Approved (Satisfied)
                                  </span>
                                )}
                                {task.status === 'Denied' && (
                                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Denied (Action Required)
                                  </span>
                                )}
                                {task.status === 'Appealed' && (
                                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Appealed (Under Discussion)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-gray-400 max-w-xs">
                                {task.remark ? (
                                  <div>
                                    <p className="text-white italic">"{task.remark}"</p>
                                    {task.appeal && (
                                      <p className="text-purple-400 text-[10px] mt-1 font-bold">Question: {task.appeal}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-600">No report yet</span>
                                )}
                              </td>
                              <td className="py-3 text-gray-400 max-w-xs font-sans">
                                {task.adminReply ? (
                                  <div>
                                    <p className="text-orange-400 font-bold">Feedback: {task.adminReply}</p>
                                    {task.appealReply && (
                                      <p className="text-emerald-400 text-[10px] mt-1 font-bold font-sans">Reply: {task.appealReply}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-600">No feedback yet</span>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                {/* Sub-admin / Staff / Head: Report Completion */}
                                {user.id === task.assignedTo && task.status === 'Pending' && (
                                  <button
                                    onClick={() => {
                                      setSubmittingTaskId(task.id);
                                      setSubmitTaskStatus('Completed');
                                      setSubmitTaskRemark('');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1 rounded text-[10px] cursor-pointer"
                                  >
                                    Report Progress / Submit
                                  </button>
                                )}

                                {/* Sub-admin / Staff / Head: Appeal Denied Task */}
                                {user.id === task.assignedTo && task.status === 'Denied' && (
                                  <button
                                    onClick={() => {
                                      setAppealingTaskId(task.id);
                                      setAppealText('');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1 rounded text-[10px] cursor-pointer"
                                  >
                                    Raise Question / Appeal
                                  </button>
                                )}

                                {/* Main Admin / Assigner: Evaluate Task */}
                                {(user.id === 'u-admin' || user.id === task.assignedBy) && task.status === 'Submitted' && (
                                  <button
                                    onClick={() => {
                                      setEvaluatingTaskId(task.id);
                                      setEvaluateAction('Approved');
                                      setEvaluateFeedback('');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1 rounded text-[10px] cursor-pointer"
                                  >
                                    Evaluate Work
                                  </button>
                                )}

                                {/* Main Admin / Assigner: Respond to Appeal */}
                                {(user.id === 'u-admin' || user.id === task.assignedBy) && task.status === 'Appealed' && (
                                  <button
                                    onClick={() => {
                                      setRespondingAppealTaskId(task.id);
                                      setAppealReplyAction('Approved');
                                      setAppealReplyText('');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1 rounded text-[10px] cursor-pointer"
                                  >
                                    Reply & Instruct
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {tasks.length === 0 && (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-gray-500">
                                No assigned daily tasks recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {hrmSubTab === 'holidays' && (
                <div className="space-y-6">
                  {/* MAIN ADMIN: Declare Company-wide Holiday Form */}
                  {user.id === 'u-admin' && (
                    <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Declare Company-Wide Holiday (सार्वजनिक अवकाश घोषित करें)</h3>
                      <form onSubmit={handleDeclareHoliday} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Holiday Date</label>
                          <input
                            type="date"
                            value={holidayDate}
                            onChange={(e) => setHolidayDate(e.target.value)}
                            className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Reason / Occasion Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Independence Day / Diwali"
                            value={holidayReason}
                            onChange={(e) => setHolidayReason(e.target.value)}
                            className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="submit"
                            className="bg-[#f97316] hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer"
                          >
                            Declare Holiday (सार्वजनिक छुट्टी घोषित करें)
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Holidays Display Board */}
                  <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Declared Company Holidays</h3>
                    <p className="text-xs text-gray-400 mb-4">Note: All declared company-wide holidays are fully-paid days for all staff members, including telecallers and administrators.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[#1f2635] text-xs text-gray-400">
                            <th className="pb-3">HOLIDAY DATE</th>
                            <th className="pb-3">REASON / OCCASION</th>
                            <th className="pb-3">PAY STATUS</th>
                            {user.id === 'u-admin' && <th className="pb-3 text-right">ACTION</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2635] text-xs text-gray-300">
                          {companyHolidays.map(holiday => (
                            <tr key={holiday.id} className="hover:bg-[#151922]">
                              <td className="py-3 font-mono font-bold text-white">{holiday.date}</td>
                              <td className="py-3 font-bold text-white">{holiday.reason}</td>
                              <td className="py-3">
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Fully Paid (100% सैलरी)
                                </span>
                              </td>
                              {user.id === 'u-admin' && (
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => handleDeleteHoliday(holiday.id)}
                                    className="text-red-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                    title="Delete Holiday"
                                  >
                                    <Trash2 className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {companyHolidays.length === 0 && (
                            <tr>
                              <td colSpan={user.id === 'u-admin' ? 4 : 3} className="py-8 text-center text-gray-500">
                                No company holidays declared yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {hrmSubTab === 'payroll_audit' && (
                <div className="space-y-6">
                  {/* Payroll Month Selection */}
                  <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Payroll Calculation Period</h3>
                      <p className="text-xs text-gray-400 mt-1">Select month range to audit attendance-based salary calculations & incentives</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400">Target Period:</label>
                      <input
                        type="month"
                        value={selectedPayrollMonth}
                        onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                        className="bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Payroll Report Grid */}
                  <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[#1f2635] text-xs text-gray-400">
                            <th className="pb-3">EMPLOYEE NAME</th>
                            <th className="pb-3">BASE PAY</th>
                            <th className="pb-3">DAYS WORKED (PRESENT)</th>
                            <th className="pb-3">LEAVES/ABSENCES (DEDUCTED)</th>
                            <th className="pb-3">PERFORMANCE METRICS (SALES / TASKS)</th>
                            <th className="pb-3">PERFORMANCE %</th>
                            <th className="pb-3">INCENTIVE GAINED</th>
                            <th className="pb-3 font-bold text-orange-400">FINAL NET PAYABLE</th>
                            <th className="pb-3 text-center">PAYSLIP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2635] text-xs text-gray-300">
                          {payrollReport.map(rep => (
                            <tr key={rep.userId} className="hover:bg-[#151922]">
                              <td className="py-4">
                                <div className="font-bold text-white text-sm">{rep.name}</div>
                                <div className="text-[10px] text-gray-500 uppercase">{rep.role}</div>
                              </td>
                              <td className="py-4 font-mono">₹{rep.salaryBase}</td>
                              <td className="py-4">
                                <span className="text-emerald-400 font-bold">{rep.presentDays} Days</span>
                                <span className="text-gray-500 text-[10px] ml-1">({rep.sundayPaidCount} paid Sundays)</span>
                              </td>
                              <td className="py-4 text-red-400 font-bold">
                                {rep.leaveDays + rep.absentDays + rep.sundayDeductedCount} Days
                                <span className="text-gray-500 text-[10px] ml-1">({rep.sundayDeductedCount} deducted Sun)</span>
                              </td>
                              <td className="py-4">
                                {rep.role === 'admin' ? (
                                  <div>
                                    <span className="text-[#f97316] font-bold">{rep.approvedTasks} of {rep.totalTasks} tasks approved</span>
                                    <div className="text-[10px] text-gray-500">Incentive Rate: ₹{rep.commissionRate} per task</div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-[#f97316] font-bold">{rep.salesDoneCount} sales done</span>
                                    <div className="text-[10px] text-emerald-400 font-bold">₹{rep.businessRevenue?.toLocaleString() || 0} business</div>
                                  </div>
                                )}
                              </td>
                              <td className="py-4 font-mono">
                                {rep.performancePct}%
                                <div className="text-[10px] text-gray-500">
                                  {rep.role === 'admin' ? 'Task Ratio' : `Target: ${rep.monthlyTarget}`}
                                </div>
                              </td>
                              <td className="py-4 text-emerald-400 font-bold">
                                ₹{rep.incentiveAmount}
                                <div className="text-[10px] text-gray-500">
                                  {rep.role === 'admin' ? `+₹${rep.commissionRate}/approved task` : `+${rep.incentivePct}% added`}
                                </div>
                              </td>
                              <td className="py-4 font-black text-white text-sm">₹{rep.finalSalary}</td>
                              <td className="py-4 text-center">
                                <button
                                  onClick={() => setSelectedSlipUser(rep)}
                                  className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-[#f97316] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  View Slip
                                </button>
                              </td>
                            </tr>
                          ))}
                          {payrollReport.length === 0 && (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-gray-500">No staff members listed in the audited report.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {hrmSubTab === 'my_salary_slip' && (
                <div className="space-y-6 max-w-xl mx-auto text-left">
                  <div className="bg-[#111622] border border-[#1f2635] rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">My Monthly Payslip (मेरा सैलरी स्लिप)</h3>
                    <p className="text-xs text-gray-400 mb-6">Audited monthly payroll summary with detailed incentive and attendance reports.</p>
                    
                    {(() => {
                      const rep = payrollReport.find(r => r.userId === user.id);
                      if (!rep) {
                        return (
                          <div className="text-center py-8 text-gray-500 text-xs">
                            No payroll records found for you in the target period of {selectedPayrollMonth}. Please ensure your attendance has been logged!
                          </div>
                        );
                      }
                      return (
                        <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-2xl border-2 border-gray-200 space-y-6 font-sans">
                          {/* Slip Header */}
                          <div className="text-center border-b pb-4 border-gray-200">
                            <h4 className="text-lg font-black tracking-tight text-orange-600 uppercase">Graphics World Pvt. Ltd.</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5 font-sans">Corporate HRM Center &bull; Salary Slip</p>
                            <span className="inline-block mt-2 bg-orange-100 text-orange-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                              Period: {selectedPayrollMonth}
                            </span>
                          </div>

                          {/* Employee Meta */}
                          <div className="grid grid-cols-2 gap-y-2 text-xs border-b pb-4 border-gray-100">
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase font-bold block font-sans">Employee Name</span>
                              <span className="font-extrabold text-gray-800">{rep.name}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase font-bold block font-sans">Designation</span>
                              <span className="font-bold text-gray-800 uppercase font-sans">{rep.role}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase font-bold block font-sans">Department Segment</span>
                              <span className="font-semibold text-gray-700">{user.department || 'Sales'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase font-bold block font-sans">Email & Phone</span>
                              <span className="text-gray-600 block">{user.email}</span>
                              <span className="text-gray-600 block font-mono">{user.phone || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Earnings & Deductions Tables */}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {/* Earnings column */}
                            <div className="space-y-2 border-r pr-4 border-gray-200">
                              <span className="text-[10px] font-bold text-emerald-600 block border-b pb-1 font-sans">EARNINGS / ALLOWANCES</span>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Base Contract Pay:</span>
                                <span className="font-mono font-bold text-gray-800">₹{rep.salaryBase}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Incentive Reward:</span>
                                <span className="font-mono font-bold text-emerald-600">+₹{rep.incentiveAmount}</span>
                              </div>
                              <p className="text-[9px] text-gray-400 leading-tight">
                                {rep.role === 'admin' ? `${rep.approvedTasks} of ${rep.totalTasks} approved tasks` : `${rep.salesDoneCount} sales logged`}
                              </p>
                            </div>

                            {/* Attendance / Deductions column */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-red-600 block border-b pb-1 font-sans">ATTENDANCE DEDUCTIONS</span>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Worked Present:</span>
                                <span className="font-bold text-gray-800">{rep.presentDays} Days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Leaves / Absences:</span>
                                <span className="font-bold text-red-600">{rep.leaveDays + rep.absentDays} Days</span>
                              </div>
                              <p className="text-[9px] text-gray-400 leading-tight">
                                Pro-rata deductions applied based on daily clock-out records.
                              </p>
                            </div>
                          </div>

                          {/* Net Payable block */}
                          <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-200">
                            <div>
                              <span className="text-[9px] font-bold text-gray-500 block uppercase font-sans">Total Net Payable</span>
                              <span className="text-xs text-gray-400">Paid securely into registered credentials</span>
                            </div>
                            <span className="text-2xl font-black text-gray-900 font-mono">
                              ₹{rep.finalSalary}
                            </span>
                          </div>

                          {/* Footer details */}
                          <div className="text-center pt-2 text-[9px] text-gray-400 leading-normal border-t border-gray-100 font-sans">
                            Graphics World Private Limited Systems CRM • 100% Digital Audited Ledger
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="mt-4 w-full bg-gray-900 hover:bg-black text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              🖨️ Print Payslip Receipt
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
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

      {/* DETAILED EMPLOYEE PAYSLIP (सैलरी स्लिप) MODAL */}
      {selectedSlipUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111622] border border-[#1f2635] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[#1f2635] bg-[#0d1017] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-white">Employee Payslip (सैलरी स्लिप)</h3>
                <p className="text-xs text-gray-400">Statement of Earnings and Deductions for {selectedPayrollMonth}</p>
              </div>
              <button 
                onClick={() => setSelectedSlipUser(null)}
                className="text-gray-400 hover:text-white font-bold text-sm bg-[#1a202c] px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            {/* Slip Body */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Corporate Header */}
              <div className="border-b border-[#1f2635] pb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-[#f97316] tracking-tight text-left">GRAHICS WORLD</h2>
                  <p className="text-xs text-gray-400 mt-1 text-left">HRM & Payroll Operations Center</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                    PAID & AUDITED
                  </span>
                  <p className="text-[10px] text-gray-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Employee Info Block */}
              <div className="grid grid-cols-2 gap-4 text-xs text-left">
                <div>
                  <p className="text-gray-500">Employee Name:</p>
                  <p className="font-bold text-white text-sm">{selectedSlipUser.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Employee Role:</p>
                  <p className="font-bold text-[#f97316] uppercase">{selectedSlipUser.role}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email Address:</p>
                  <p className="text-gray-300">{selectedSlipUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Monthly Target:</p>
                  <p className="text-gray-300 font-bold">{selectedSlipUser.monthlyTarget} Sales</p>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-[#1f2635] rounded-xl overflow-hidden text-xs text-left">
                <div className="grid grid-cols-2 bg-[#0d1017] border-b border-[#1f2635] p-3 font-bold text-gray-400">
                  <div>Description</div>
                  <div className="text-right">Amount (₹)</div>
                </div>
                
                <div className="divide-y divide-[#1f2635]">
                  <div className="grid grid-cols-2 p-3 text-gray-300">
                    <div>Basic Base Salary (महीने की बेसिक सैलरी)</div>
                    <div className="text-right">₹{selectedSlipUser.salaryBase.toLocaleString()}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 p-3 text-gray-300">
                    <div>
                      Deductions (Approved Leaves + Absences + Sunday Deductions)
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {selectedSlipUser.leaveDays} Leaves, {selectedSlipUser.absentDays} Absences, {selectedSlipUser.sundayDeductedCount} Sun Deductions
                      </p>
                    </div>
                    <div className="text-right text-red-400">-₹{selectedSlipUser.totalDeductions.toLocaleString()}</div>
                  </div>

                  <div className="grid grid-cols-2 p-3 text-gray-300 bg-[#161d2b]/30">
                    <div className="font-semibold text-white">Net Basic Earned (दर्ज हाजिरी के हिसाब से बेसिक)</div>
                    <div className="text-right font-semibold text-white">₹{selectedSlipUser.finalBasicSalary.toLocaleString()}</div>
                  </div>

                  {selectedSlipUser.role === 'telecaller' && (
                    <div className="grid grid-cols-2 p-3 text-gray-300">
                      <div>
                        Incentive Earned (इंसेंटिव)
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Conversion Pct: {selectedSlipUser.performancePct}% ({selectedSlipUser.salesDoneCount} Sales) | Exceeded: +{selectedSlipUser.incentivePct}%
                        </p>
                      </div>
                      <div className="text-right text-emerald-400">+₹{selectedSlipUser.incentiveAmount.toLocaleString()}</div>
                    </div>
                  )}

                  {selectedSlipUser.role === 'admin' && (
                    <div className="grid grid-cols-2 p-3 text-gray-300 font-sans">
                      <div>
                        Task Performance Incentive (इंसेंटिव)
                        <p className="text-[10px] text-gray-500 mt-0.5 font-sans">
                          Approved Tasks: {selectedSlipUser.approvedTasks} of {selectedSlipUser.totalTasks} ({selectedSlipUser.performancePct}%) | Rate: ₹{selectedSlipUser.commissionRate} per task
                        </p>
                      </div>
                      <div className="text-right text-emerald-400 font-bold">+₹{selectedSlipUser.incentiveAmount.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Payable */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex justify-between items-center">
                <div className="text-left">
                  <p className="text-xs text-gray-400">Total Net Payable (कुल प्राप्त सैलरी)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Basic Earned + Performance Incentive</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#f97316]">₹{selectedSlipUser.finalSalary.toLocaleString()}</span>
                </div>
              </div>

              {/* Calendario details of current month */}
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance Breakdown ({selectedPayrollMonth})</h4>
                <div className="grid grid-cols-7 gap-1 bg-[#0d1017] p-2 rounded-xl border border-[#1f2635] text-center text-[10px]">
                  {selectedSlipUser.detailDays && selectedSlipUser.detailDays.map((day: any) => {
                    let bg = "bg-[#1f2635]/20 text-gray-500";
                    if (day.type === "Present") bg = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
                    if (day.type === "Leave") bg = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
                    if (day.type === "Absent") bg = "bg-red-500/20 text-red-400 border border-red-500/30";
                    if (day.type === "Sunday-Paid") bg = "bg-blue-500/20 text-blue-400 border border-blue-500/30";
                    if (day.type === "Sunday-Deducted") bg = "bg-orange-500/20 text-orange-400 border border-orange-500/30";

                    return (
                      <div key={day.day} className={`p-1.5 rounded-md flex flex-col justify-between h-10 ${bg}`} title={day.label}>
                        <span className="font-bold">{day.day}</span>
                        <span className="text-[7px] truncate font-medium uppercase">{day.type.split("-")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center pt-4">
                <button 
                  onClick={() => window.print()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 mx-auto cursor-pointer"
                >
                  Print Salary Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE REJECTION REASON MODAL */}
      {rejectionModalLeaveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111622] border border-[#1f2635] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
            <div className="text-left">
              <h3 className="text-base font-black text-white">Leave Reject Reason (अस्वीकृति का कारण)</h3>
              <p className="text-xs text-gray-400 mt-1">Please enter why this leave is being rejected so the employee can view and reply.</p>
            </div>
            
            <textarea
              value={rejectionInputReason}
              onChange={(e) => setRejectionInputReason(e.target.value)}
              placeholder="e.g., Shortage of team members on these dates..."
              className="w-full bg-[#0d1017] text-white border border-[#222b3c] rounded-xl px-3 py-2 text-xs focus:border-[#f97316] outline-none h-24 resize-none"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectionModalLeaveId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 bg-[#1e2635] rounded-xl hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectionInputReason.trim()) {
                    showNotification("Please specify a reason for rejection", "error");
                    return;
                  }
                  handleApproveLeave(rejectionModalLeaveId, 'Rejected', rejectionInputReason);
                  setRejectionModalLeaveId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN QUERY RESPONSE MODAL */}
      {queryResponseLeaveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111622] border border-[#1f2635] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
            <div className="text-left">
              <h3 className="text-base font-black text-white">Respond to Employee Question (सवाल का जवाब दें)</h3>
              <p className="text-xs text-gray-400 mt-1">Type your official response. Once answered, you can change the status back to Approved or keep it Rejected.</p>
            </div>

            <textarea
              value={queryResponseText}
              onChange={(e) => setQueryResponseText(e.target.value)}
              placeholder="Write response..."
              className="w-full bg-[#0d1017] text-white border border-[#222b3c] rounded-xl px-3 py-2 text-xs focus:border-[#f97316] outline-none h-24 resize-none"
            />

            <div className="text-left space-y-2">
              <label className="text-[10px] text-gray-400 uppercase font-bold block">Final Action (अंतिम निर्णय)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQueryResponseAction('Approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    queryResponseAction === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-transparent text-gray-400 border-[#222b3c] hover:text-white'
                  }`}
                >
                  Approve (Pass)
                </button>
                <button
                  type="button"
                  onClick={() => setQueryResponseAction('Rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    queryResponseAction === 'Rejected'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-transparent text-gray-400 border-[#222b3c] hover:text-white'
                  }`}
                >
                  Keep Rejected
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setQueryResponseLeaveId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 bg-[#1e2635] rounded-xl hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!queryResponseText.trim()) {
                    showNotification("Please enter your response text", "error");
                    return;
                  }
                  handleRespondToQuery(queryResponseLeaveId, queryResponseText, queryResponseAction);
                  setQueryResponseLeaveId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#f97316] hover:bg-orange-600 rounded-xl cursor-pointer"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* MAIN ADMIN: FULL EDIT CREDENTIALS & CONTRACT MODAL */}
      {/* ============================================== */}
      {editingFullUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111622] border border-[#1f2635] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#1f2635] bg-[#0c0f16] flex justify-between items-center">
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#f97316] uppercase tracking-wider block">MAIN POWER CONTROL PANEL</span>
                <h3 className="text-lg font-black text-white">Edit Credentials & Salary Contract</h3>
              </div>
              <button 
                onClick={() => setEditingFullUser(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFullUpdateUser} className="p-6 overflow-y-auto space-y-4 text-xs text-left">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">EMPLOYEE NAME *</label>
                <input
                  type="text"
                  required
                  value={editingFullUser.name || ''}
                  onChange={(e) => setEditingFullUser({ ...editingFullUser, name: e.target.value })}
                  className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">EMAIL ADDRESS (LOGIN USERNAME) *</label>
                <input
                  type="email"
                  required
                  value={editingFullUser.email || ''}
                  onChange={(e) => setEditingFullUser({ ...editingFullUser, email: e.target.value })}
                  className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">PASSWORD (LEAVE BLANK TO KEEP CURRENT)</label>
                <input
                  type="password"
                  placeholder="Type new secure password if updating..."
                  value={editingFullUser.password || ''}
                  onChange={(e) => setEditingFullUser({ ...editingFullUser, password: e.target.value })}
                  className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">PHONE NUMBER (FOR WHATSAPP & CALLS) *</label>
                <input
                  type="text"
                  required
                  value={editingFullUser.phone || ''}
                  onChange={(e) => setEditingFullUser({ ...editingFullUser, phone: e.target.value })}
                  className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">ORGANIZATIONAL ROLE</label>
                  <select
                    value={editingFullUser.role || 'staff'}
                    onChange={(e) => setEditingFullUser({ ...editingFullUser, role: e.target.value })}
                    className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="telecaller">Telecaller (टेलीकॉलर)</option>
                    <option value="staff">Staff Member (कर्मचारी)</option>
                    <option value="head">Department Head (विभाग अध्यक्ष)</option>
                    <option value="admin">Sub-Admin (सब-एडमिन)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">DEPARTMENT SEGMENT</label>
                  <select
                    value={editingFullUser.department || 'Sales'}
                    onChange={(e) => setEditingFullUser({ ...editingFullUser, department: e.target.value })}
                    className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="Tech">Tech Segment</option>
                    <option value="NonTech">NonTech Segment</option>
                    <option value="Sales">Sales Segment</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[#1f2635] pt-4 space-y-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CONTRACT & PAYROLL OPTIONS</span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">BASE SALARY (₹)</label>
                    <input
                      type="number"
                      required
                      value={editingFullUser.salaryBase || 0}
                      onChange={(e) => setEditingFullUser({ ...editingFullUser, salaryBase: Number(e.target.value) })}
                      className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">COMMISSION/SALE (₹)</label>
                    <input
                      type="number"
                      required
                      value={editingFullUser.commissionRate || 0}
                      onChange={(e) => setEditingFullUser({ ...editingFullUser, commissionRate: Number(e.target.value) })}
                      className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">MONTHLY TARGET</label>
                    <input
                      type="number"
                      required
                      value={editingFullUser.monthlyTarget || 5}
                      onChange={(e) => setEditingFullUser({ ...editingFullUser, monthlyTarget: Number(e.target.value) })}
                      className="w-full bg-[#0d1017] border border-[#1f2635] rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingFullUser(null)}
                  className="bg-[#151922] border border-[#222b3c] text-gray-400 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#f97316] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-orange-500/10"
                >
                  Apply & Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
