import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, LogOut, CheckCircle, XCircle, Clock, Plus, 
  Search, Mic, MicOff, Volume2, Sparkles, Loader2, Play, AlertCircle, Trash2,
  MessageSquare, Send, ExternalLink
} from 'lucide-react';
import { Lead, CallLog, AutoCallingConfig, SupportTicket } from '../types';

interface TelecallerDashboardProps {
  user: { id: string; name: string; email: string; role: 'admin' | 'telecaller' };
  onLogout: () => void;
}

export default function TelecallerDashboard({ user, onLogout }: TelecallerDashboardProps) {
  // Database States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [autoCallingMode, setAutoCallingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'New' | 'Interested' | 'Spoke'>('All');

  // Submitting Support Query
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Feedback State & Custom Notifications
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'success' });

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: 'success' }), 4000);
  };

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

  // Add Customer modal state (telecallers adding clients)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', requirements: '' });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Calling & Virtual Dialer States
  const [activeCallLead, setActiveCallLead] = useState<Lead | null>(null);
  const [callState, setCallState] = useState<'disconnected' | 'ringing' | 'connected' | 'ended'>('disconnected');
  const [callTimer, setCallTimer] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<'Interested' | 'Spoke' | 'Not Interested'>('Interested');

  // Countdown State for Auto Calling Mode
  const [autoCallCountdown, setAutoCallCountdown] = useState<number | null>(null);
  const [nextAutoCallLeadId, setNextAutoCallLeadId] = useState<string | null>(null);

  // MediaRecorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingBase64, setRecordingBase64] = useState<string | null>(null);

  // Ringing Synthesizer Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);
  const ringIntervalRef = useRef<any>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync Timer for active call
  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Load leads and personal logs from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, callsRes, supportRes] = await Promise.all([
          fetch('/api/leads', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/calls', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } }),
          fetch('/api/support', { headers: { 'x-user-role': user.role, 'x-user-id': user.id } })
        ]);

        if (leadsRes.ok) {
          const lds = await leadsRes.json();
          // Filter to only those assigned to this telecaller
          setLeads(lds.filter((l: Lead) => l.assignedTo === user.id));
        }
        if (callsRes.ok) {
          const cls = await callsRes.json();
          // Filter to caller's own logs
          setCallLogs(cls.filter((c: CallLog) => c.telecallerId === user.id));
        }
        if (supportRes.ok) {
          const tkts = await supportRes.json();
          setSupportTickets(tkts.filter((t: SupportTicket) => t.userEmail === user.email));
        }
      } catch (err) {
        console.error('Failed to load portal metrics', err);
      }
    };
    fetchData();
  }, [refreshTrigger, user.role, user.id, user.email]);

  const handleDeleteLead = (leadId: string) => {
    showConfirm(
      "Delete Lead (लीड हटाएं)",
      "Are you sure you want to delete this customer lead? (क्या आप इस कस्टमर लीड को हटाना चाहते हैं?)",
      async () => {
        try {
          const res = await fetch('/api/leads/delete', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-role': user.role,
              'x-user-id': user.id
            },
            body: JSON.stringify({ leadId }),
          });
          if (res.ok) {
            showNotification('Lead deleted successfully!');
            triggerRefresh();
          } else {
            const data = await res.json();
            showNotification(data.error || 'Failed to delete lead.', 'error');
          }
        } catch (err) {
          showNotification('Network error.', 'error');
        }
      }
    );
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Web Audio Ringing Synthesizer (Zero external dependencies, 100% free sound)
  const startRingingSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const playRingPair = () => {
        if (ctx.state === 'closed') return;
        
        // Indian phone ringing standard double ring
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.frequency.setValueAtTime(400, ctx.currentTime);
        osc2.frequency.setValueAtTime(450, ctx.currentTime);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        osc1.start();
        osc2.start();

        // Dual beep ring sound
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime + 0.9);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 1.4);

        // Stop oscillators after the dual beep ring duration
        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
          } catch(e) {}
        }, 1500);
      };

      // Play initially and then repeat every 3 seconds
      playRingPair();
      ringIntervalRef.current = setInterval(playRingPair, 3000);
    } catch (err) {
      console.warn('Web Audio Context not supported or blocked by user', err);
    }
  };

  const stopRingingSound = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  // Helper to format clean phone numbers for WhatsApp API links
  const getCleanWhatsAppPhone = (phone: string) => {
    let cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned; // default country code for India
    }
    return cleaned;
  };

  // 1. PLACE CALL TRIGGER (ACTUAL PHONE OUTBOUND DIALER)
  const handlePlaceCall = async (lead: Lead) => {
    setActiveCallLead(lead);
    setCallState('connected'); // Immediately connected state to run the live timer
    setCallNotes('');
    setCallOutcome('Interested');
    setRecordingBase64(null);

    // Cancel any active Auto-Calling timer
    setAutoCallCountdown(null);

    // Set the default pre-filled template message for WhatsApp Quick-Sender
    const defaultMsg = `नमस्ते ${lead.name} जी, मैं TeleCRM से बात कर रहा हूँ। आपने ${lead.requirements || 'हमारी सेवाओं'} में रुचि दिखाई थी। क्या हम इस बारे में बात कर सकते हैं?`;
    setWhatsappMessage(defaultMsg);

    // OPEN REAL PHONE DIALER: Immediate device tel trigger
    try {
      window.location.href = `tel:${lead.phone}`;
    } catch (err) {
      console.warn('Device calling protocol error', err);
    }

    // Capture standard local browser microphone recording to log in the CRM if user accepts
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to Base64 to upload and archive call recording
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setRecordingBase64(base64String);
        };
      };

      recorder.start();
    } catch (err) {
      console.warn('Microphone recording not allowed by browser. Logging call details manually.', err);
    }
  };

  // Stop current active local CRM voice recording upon call finish
  const handleEndCall = () => {
    stopRingingSound();
    setCallState('ended');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } catch (e) {}
    }
  };

  // 3. SUBMIT OUTCOME AND AUTOMATICALLY SAVE AUDIO CALL RECORDING
  const handleSaveCallLog = async () => {
    if (!activeCallLead) return;

    try {
      const res = await fetch('/api/calls/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          leadId: activeCallLead.id,
          telecallerId: user.id,
          status: callOutcome,
          duration: callTimer,
          notes: callNotes,
          recordingBase64 // The recorded mic audio saved on cloud!
        }),
      });

      if (res.ok) {
        triggerRefresh();
        
        // Auto Calling Mode trigger
        if (autoCallingMode) {
          // Identify the next lead in the filtered listing
          const currentIndex = filteredLeads.findIndex(l => l.id === activeCallLead.id);
          const nextLead = filteredLeads[currentIndex + 1];

          if (nextLead) {
            setNextAutoCallLeadId(nextLead.id);
            setAutoCallCountdown(5);
          } else {
            showNotification('Auto-Calling finished! No more leads in your queue.', 'success');
          }
        }

        // Reset
        setCallState('disconnected');
        setActiveCallLead(null);
      } else {
        showNotification('Failed to save call session.', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error connecting to Server.', 'error');
    }
  };

  // Countdown timer effect for Auto Calling Mode
  useEffect(() => {
    if (autoCallCountdown === null) return;
    if (autoCallCountdown === 0) {
      setAutoCallCountdown(null);
      const leadToCall = leads.find(l => l.id === nextAutoCallLeadId);
      if (leadToCall) {
        handlePlaceCall(leadToCall);
      }
      return;
    }

    const timer = setTimeout(() => {
      setAutoCallCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoCallCountdown, nextAutoCallLeadId]);

  // Submit new Customer (added by Telecaller themselves)
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      showNotification('Name and Phone are required.', 'error');
      return;
    }
    setIsSavingCustomer(true);

    try {
      const res = await fetch('/api/leads/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          ...newCustomer,
          assignedTo: user.id // Assign directly to this telecaller
        }),
      });

      if (res.ok) {
        setShowAddCustomerModal(false);
        setNewCustomer({ name: '', phone: '', email: '', requirements: '' });
        showNotification('Customer added successfully!', 'success');
        triggerRefresh();
      } else {
        const d = await res.json();
        showNotification(d.error || 'Failed to add customer.', 'error');
      }
    } catch (err) {
      showNotification('Network error.', 'error');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Submit Support Ticket Ticket
  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMsg) return;
    setIsSubmittingSupport(true);

    try {
      const res = await fetch('/api/support/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          subject: supportSubject,
          message: supportMsg
        })
      });

      if (res.ok) {
        showNotification('Your support query submitted successfully! Support staff will answer in 24/7 technical assistance portal.', 'success');
        setSupportSubject('');
        setSupportMsg('');
        triggerRefresh();
      }
    } catch (err) {
      showNotification('Failed submitting ticket.', 'error');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // COMPUTE DIALER PERFORMANCE TARGET METRICS (Screenshot 4: 0/40 target calls)
  const dailyTargetTotal = 40;
  const monthlyTargetTotal = 1000;

  const dailyCallsCompleted = callLogs.length; // Simulated daily total
  const dailyAchievedPct = Math.min(Math.round((dailyCallsCompleted / dailyTargetTotal) * 100), 100);

  const monthlyCallsCompleted = callLogs.length; // Simple mapping
  const monthlyAchievedPct = Math.min(Math.round((monthlyCallsCompleted / monthlyTargetTotal) * 100), 100);

  // Filter leads based on search query and status tab selection
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.phone.includes(searchQuery);
    
    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'New') return l.status === 'New';
    if (activeFilter === 'Interested') return l.status === 'Interested';
    if (activeFilter === 'Spoke') return l.status === 'Spoke';
    return true;
  });

  // Count sub metrics
  const interestedCount = callLogs.filter(c => c.status === 'Interested').length;
  const callbackCount = callLogs.filter(c => c.status === 'Spoke').length;
  const notInterestedCount = callLogs.filter(c => c.status === 'Not Interested').length;

  return (
    <div className="min-h-screen bg-[#090b11] text-gray-100 flex flex-col font-sans relative">
      
      {/* HEADER SECTION (BILINGUAL) */}
      <header className="bg-[#10141e] border-b border-[#1f2635] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2.5 rounded-2xl shadow-md shadow-orange-500/10">
            <Phone className="w-5 h-5 text-white fill-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5">
              Tele-CRM <span className="text-[#f97316]">Dialer Portal</span>
            </h1>
            <p className="text-xs text-gray-400">
              Welcome, <span className="text-gray-300 font-bold">{user.name}</span> (ID: {user.id})
            </p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full flex-1">
        
        {/* ROW 1: PERFORMANCE TARGET MODULES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* DAILY CALL TARGETS PROGRESS */}
          <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#f97316] rounded-full"></span>
                <span className="text-sm font-bold text-white uppercase tracking-wider">Daily Call Target (दैनिक लक्ष्य)</span>
              </div>
              <strong className="text-sm font-black text-gray-300">{dailyCallsCompleted} / {dailyTargetTotal} calls</strong>
            </div>
            
            <div className="w-full bg-[#0d1017] rounded-full h-3 overflow-hidden border border-[#1a212e]">
              <div 
                className="bg-gradient-to-r from-[#f97316] to-amber-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${dailyAchievedPct}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">{dailyAchievedPct}% achieved</span>
              <button onClick={triggerRefresh} className="text-[#f97316] hover:underline cursor-pointer font-bold">Reset daily progress</button>
            </div>
          </div>

          {/* MONTHLY target volume */}
          <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                <span className="text-sm font-bold text-white uppercase tracking-wider">Monthly target volume (मासिक लक्ष्य)</span>
              </div>
              <strong className="text-sm font-black text-gray-300">{monthlyCallsCompleted} / {monthlyTargetTotal} calls</strong>
            </div>

            <div className="w-full bg-[#0d1017] rounded-full h-3 overflow-hidden border border-[#1a212e]">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${monthlyAchievedPct}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">{monthlyAchievedPct}% achieved</span>
              <span className="text-gray-500">Bonus target scale</span>
            </div>
          </div>
        </div>

        {/* ROW 2: DETAILED LIVE PERFORMANCE COUNTS */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-emerald-400 block mb-1">INTERESTED (रुचि है)</span>
            <div className="text-3xl font-black text-emerald-400">{interestedCount}</div>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 p-5 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-orange-400 block mb-1">SPOKE / CALLBACK (फिर बात करें)</span>
            <div className="text-3xl font-black text-orange-400">{callbackCount}</div>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-red-400 block mb-1">NOT INTERESTED (रुचि नहीं है)</span>
            <div className="text-3xl font-black text-red-400">{notInterestedCount}</div>
          </div>
        </div>

        {/* ROW 3: AUTO-CALL SWITCH CONTROLS */}
        <div className="bg-[#111622] border border-[#1f2635] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${autoCallingMode ? 'bg-emerald-500 animate-ping' : 'bg-gray-600'}`}></span>
              <h3 className="font-extrabold text-sm text-white">Auto-Calling Mode (ऑटो-डायल मोड)</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              When active, completing a call logs triggers a 5s delay before initiating the next dial automatically.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-xs font-black uppercase tracking-wider ${autoCallingMode ? 'text-emerald-400' : 'text-gray-500'}`}>
              {autoCallingMode ? 'ACTIVE (चालू)' : 'INACTIVE (बंद)'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoCallingMode}
                onChange={(e) => setAutoCallingMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#222b3c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f97316]"></div>
            </label>
          </div>
        </div>

        {/* AUTO CALLING COUNTDOWN BANNER */}
        {autoCallCountdown !== null && (
          <div className="bg-[#1a2030] border border-orange-500/50 p-5 rounded-2xl text-center space-y-3 animate-pulse">
            <h4 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <Volume2 className="w-5 h-5 text-[#f97316] animate-bounce" />
              Automated dialer initiating next call in{' '}
              <span className="text-[#f97316] text-xl font-black">{autoCallCountdown}</span> seconds...
            </h4>
            <div className="w-64 mx-auto bg-[#0d1017] h-2 rounded-full overflow-hidden border border-[#1f2635]">
              <div 
                className="bg-orange-500 h-full transition-all duration-1000"
                style={{ width: `${(autoCallCountdown / 5) * 100}%` }}
              ></div>
            </div>
            <button 
              onClick={() => setAutoCallCountdown(null)}
              className="text-xs text-red-400 hover:underline font-bold"
            >
              Cancel Auto-Calling Timer
            </button>
          </div>
        )}

        {/* MAIN CORES BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1: MY ASSIGNED LEADS DESK */}
          <div className="lg:col-span-2 bg-[#111622] border border-[#1f2635] p-6 rounded-3xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">My Assigned Leads Desk</h3>
                <p className="text-xs text-gray-400 mt-1">Pick a customer contact to launch virtual dialer</p>
              </div>

              {/* TELECALLERS ADDING CUSTOMER CLIENT BUTTON */}
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Customer (ग्राहक जोड़ें)
              </button>
            </div>

            {/* SEACH BAR & TABS */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lead by name or phone..."
                  className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none pl-10 pr-4 py-2.5 rounded-xl text-xs placeholder:text-gray-600"
                />
              </div>

              <div className="flex bg-[#0e121a] border border-[#1f2635] p-1 rounded-xl">
                {(['All', 'New', 'Interested', 'Spoke'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeFilter === tab 
                        ? 'bg-[#1e2535] text-white border border-[#2d3953]' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* CLIENT CARDS MAPS */}
            <div className="space-y-4">
              {filteredLeads.map(lead => {
                return (
                  <div key={lead.id} className="bg-[#0e121a] border border-[#1e2635] p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-700 transition">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-white text-base">{lead.name}</h4>
                        <span className="bg-orange-500/15 text-[#f97316] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {lead.status}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>📱 {lead.phone}</span>
                        {lead.email && <span>📧 {lead.email}</span>}
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed italic bg-[#111622] p-2.5 rounded-xl border border-[#1e2535]">
                        "{lead.requirements}"
                      </p>
                    </div>

                    <div className="flex gap-2 self-stretch md:self-auto justify-end w-full md:w-auto">
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 p-3 rounded-xl transition cursor-pointer flex items-center justify-center"
                        title="Delete Customer Lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handlePlaceCall(lead)}
                        className="bg-[#f97316] hover:bg-orange-600 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition cursor-pointer flex items-center gap-2 flex-1 md:flex-initial justify-center"
                      >
                        <Phone className="w-4 h-4 fill-white" />
                        Place Free Call
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredLeads.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-xs">
                  No assigned leads matching criteria found.
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: CALL LOGS HISTORY & 24/7 SUPPORT REQUESTS */}
          <div className="space-y-6">
            
            {/* CALL DIAL LOGS HISTORY */}
            <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-3xl space-y-4">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">My Dial Logs History</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {callLogs.map(log => (
                  <div key={log.id} className="bg-[#0e121a] border border-[#1e2635] p-4 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-white">{log.leadName}</h4>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        log.status === 'Interested' ? 'bg-emerald-500/10 text-emerald-400' :
                        log.status === 'Spoke' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span>Duration: {log.duration}s</span>
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                    {log.notes && <p className="text-[11px] text-gray-400 italic">"{log.notes}"</p>}
                    
                    {/* DAILY ADMIN FEEDBACK SEGMENT */}
                    {log.adminFeedback && (
                      <div className="mt-2 p-2 bg-[#f97316]/5 border border-[#f97316]/20 rounded-lg text-[10px]">
                        <span className="font-bold text-[#f97316] block uppercase tracking-wider text-[8px] mb-0.5">
                          Admin Feedback (एडमिन फीडबैक):
                        </span>
                        <p className="text-gray-300 italic">"{log.adminFeedback}"</p>
                      </div>
                    )}
                  </div>
                ))}

                {callLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-xs italic">
                    No call sessions logged today yet.
                  </div>
                )}
              </div>
            </div>

            {/* 24/7 TECHNICAL ASSISTANCE TICKETS */}
            <div className="bg-[#111622] border border-[#1f2635] p-6 rounded-3xl space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#f97316] animate-pulse" />
                24/7 Support Assistance
              </h3>
              
              <form onSubmit={handleSubmitSupport} className="space-y-3">
                <input 
                  type="text" 
                  required
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  placeholder="Query Topic (e.g., Calling lag)"
                  className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none px-3 py-2 rounded-lg text-xs"
                />
                <textarea 
                  required
                  value={supportMsg}
                  onChange={(e) => setSupportMsg(e.target.value)}
                  placeholder="Describe technical issue in detail..."
                  rows={2}
                  className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none px-3 py-2 rounded-lg text-xs resize-none"
                />
                <button 
                  type="submit"
                  disabled={isSubmittingSupport}
                  className="w-full bg-[#151922] border border-[#222b3c] hover:border-gray-500 text-gray-300 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSupport ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Raise Urgent Support Ticket'}
                </button>
              </form>

              {/* RECENT TICKETS INBOX */}
              {supportTickets.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#1f2635]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Recent Ticket status:</span>
                  {supportTickets.slice(0, 2).map(tk => (
                    <div key={tk.id} className="bg-[#0e121a] border border-[#1e2635] p-3 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between">
                        <strong className="text-gray-300 truncate w-32">{tk.subject}</strong>
                        <span className={`text-[9px] font-bold uppercase ${tk.status === 'open' ? 'text-red-400' : 'text-emerald-400'}`}>
                          {tk.status}
                        </span>
                      </div>
                      {tk.reply && <p className="text-gray-400 italic bg-[#111622] p-1.5 rounded mt-1">Reply: "{tk.reply}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* MODAL 1: ADD CUSTOMER DIALOG (TELECALLER CLIENT INSERT) */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111622] border border-[#1f2635] rounded-3xl p-6 w-full max-w-md relative">
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
              <Plus className="w-5 h-5 text-[#f97316]" /> Add New Customer Lead
            </h3>
            <p className="text-xs text-gray-400 mb-6">Create and assign a client lead immediately to yourself</p>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">CLIENT NAME *</label>
                <input 
                  type="text" 
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Anand Sharma"
                  className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">PHONE NUMBER *</label>
                <input 
                  type="text" 
                  required
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +919012345678"
                  className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. anand@company.com"
                  className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">CLIENT REQUIREMENTS / PRODUCTS</label>
                <textarea 
                  value={newCustomer.requirements}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="e.g. Wants eco custom packaging"
                  rows={3}
                  className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-4 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1f2635]">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2.5 bg-[#151922] border border-[#222b3c] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-5 py-2.5 bg-[#f97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTUAL TELECALL CONTROLLER & WHATSAPP TEMPLATES CONSOLE */}
      {activeCallLead && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111622] border border-[#1f2635] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row h-[550px]">
            
            {/* LEFT HALF: STATUS, METRICS AND MANUAL TRIGGER ACTIONS */}
            <div className="flex-1 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#1f2635] bg-[#0c0f16]">
              <div className="space-y-4">
                {/* Caller Profile Card */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#f97316] tracking-wider uppercase">REAL CALL & WHATSAPP DESK</span>
                  <h3 className="text-xl font-black text-white">{activeCallLead.name}</h3>
                  <p className="text-xs text-gray-400">{activeCallLead.phone}</p>
                </div>

                <div className="bg-[#111622] border border-[#1e2635] p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">CLIENT REQUIREMENTS</span>
                  <p className="text-xs text-gray-300 italic">"{activeCallLead.requirements}"</p>
                </div>
              </div>

              {/* CALLING ACTION PROTOCOLS */}
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                
                {callState === 'connected' ? (
                  <div className="flex flex-col items-center space-y-3 w-full">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">CALL TIMING RUNNING</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">कॉल चल रही है / सिम/डायल ऐप पर बात करें</p>
                    </div>
                    
                    {/* Stopwatch */}
                    <div className="text-3xl font-black text-white font-mono flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#f97316]" />
                      {Math.floor(callTimer / 60).toString().padStart(2, '0')}:
                      {(callTimer % 60).toString().padStart(2, '0')}
                    </div>

                    {/* Manual Triggers in active console */}
                    <div className="flex gap-2 w-full pt-2">
                      <button
                        onClick={() => { window.location.href = `tel:${activeCallLead.phone}`; }}
                        className="flex-1 bg-[#f97316]/10 hover:bg-[#f97316]/20 border border-[#f97316]/30 text-[#f97316] py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Again
                      </button>
                      <button
                        onClick={() => {
                          const clean = getCleanWhatsAppPhone(activeCallLead.phone);
                          window.open(`https://wa.me/${clean}`, '_blank');
                        }}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Chat
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-red-400">Call Finished</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">कॉल समाप्त हुई, अब परिणाम दर्ज करें</p>
                    </div>
                  </div>
                )}

                {/* Local microphone visualizers */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${callState === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`}></div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Timer Active</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' ? 'bg-red-500 animate-ping' : 'bg-gray-600'}`}></div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Local Voice Rec</span>
                  </div>
                </div>
              </div>

              {/* CALL END BUTTON */}
              {callState !== 'ended' ? (
                <button
                  onClick={handleEndCall}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-500/15"
                >
                  <XCircle className="w-4 h-4" />
                  Disconnect Call (कॉल काटें)
                </button>
              ) : (
                <div className="text-center text-[10px] text-gray-400 font-bold uppercase py-3 border border-dashed border-gray-700 rounded-xl bg-[#080b10]">
                  📝 Please log Call outcome on right →
                </div>
              )}
            </div>

            {/* RIGHT HALF: DYNAMIC WHATSAPP MESSENGER & CAMPAIGN TEMPLATES */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto max-h-[550px] md:max-h-full bg-[#111622]">
              
              {callState !== 'ended' ? (
                <div className="flex-1 flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-3">
                    <div className="text-[10px] text-[#f97316] font-bold uppercase tracking-wider block border-b border-[#1f2635] pb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Direct Dispatch Templates
                    </div>
                    
                    <p className="text-[10px] text-gray-400">
                      Select any template below to load, customize, and immediately open in real WhatsApp Web/App:
                    </p>

                    {/* Pre-filled Templates */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          title: '👋 Welcome Intro',
                          desc: 'परिचय व स्वागत संदेश',
                          text: `नमस्ते ${activeCallLead.name} जी, मैं Graphics World से बात कर रहा हूँ। आपने बॉक्स डिजाइनिंग / पैकेजिंग में रुचि दिखाई थी। क्या हम इसके बारे में बात कर सकते हैं?`
                        },
                        {
                          title: '📵 Not Reachable',
                          desc: 'कॉल न उठाने पर सन्देश',
                          text: `नमस्ते ${activeCallLead.name} जी, मैंने आपको कॉल करने का प्रयास किया था लेकिन आपका नंबर व्यस्त/अनलपलब्ध था। कृपया फ्री होकर हमें मैसेज करें।`
                        },
                        {
                          title: '📦 Catalogue Sent',
                          desc: 'कैटलॉग और प्राइस लिस्ट',
                          text: `नमस्ते ${activeCallLead.name} जी, आपकी रिक्वायरमेंट: "${activeCallLead.requirements || 'कस्टम पैकेजिंग'}" के संबंध में हमारा कैटलॉग यहाँ देखें।`
                        },
                        {
                          title: '🙏 Thank You Notes',
                          desc: 'बातचीत के बाद आभार',
                          text: `नमस्ते ${activeCallLead.name} जी, आपसे बातचीत करके बहुत ख़ुशी हुई। हम जल्द ही आपकी रिक्वायरमेंट पर प्रोसेस शुरू करेंगे। धन्यवाद!`
                        }
                      ].map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setWhatsappMessage(tmpl.text)}
                          className="p-2.5 bg-[#0c0f16] border border-[#1f2635] hover:border-emerald-500 hover:bg-emerald-500/5 text-left rounded-xl transition cursor-pointer"
                        >
                          <span className="text-[11px] font-bold text-white block">{tmpl.title}</span>
                          <span className="text-[9px] text-gray-500 block">{tmpl.desc}</span>
                        </button>
                      ))}
                    </div>

                    {/* Composer input preview */}
                    <div className="pt-1.5">
                      <label className="text-[9px] font-extrabold text-gray-500 block mb-1 uppercase tracking-wider">
                        Custom Message Preview (संदेश का प्रीव्यू)
                      </label>
                      <textarea
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        rows={4}
                        className="w-full bg-[#0c0f16] text-white border border-[#1f2635] focus:border-emerald-500 outline-none rounded-xl px-3 py-2 text-xs resize-none"
                        placeholder="Select a template above or type your text..."
                      />
                    </div>
                  </div>

                  {/* WhatsApp send dispatch */}
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPhone = getCleanWhatsAppPhone(activeCallLead.phone);
                      const encodedText = encodeURIComponent(whatsappMessage);
                      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                  >
                    <MessageSquare className="w-4 h-4 fill-white text-emerald-600" />
                    Send Custom Message via Real WhatsApp
                  </button>

                  <div className="border-t border-[#1f2635] pt-2 flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-bold">Real CRM Operations</span>
                    <button
                      type="button"
                      onClick={handleEndCall}
                      className="text-[#f97316] font-bold hover:underline"
                    >
                      Skip & Log Outcome →
                    </button>
                  </div>
                </div>
              ) : (
                /* OUTCOME SAVING PORTAL ONCE DISCONNECTED */
                <div className="flex-1 flex flex-col justify-between h-full space-y-4 animate-fade-in">
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Call Log Outcome (कॉल परिणाम)</h4>
                    
                    {/* Log Outcome Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase">Select status outcome</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Interested', 'Spoke', 'Not Interested'] as const).map(out => (
                          <button
                            key={out}
                            type="button"
                            onClick={() => setCallOutcome(out)}
                            className={`py-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                              callOutcome === out 
                                ? 'bg-[#f97316] border-[#f97316] text-white shadow' 
                                : 'bg-[#0e121a] border-[#222b3c] text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            {out === 'Interested' ? 'Interested' :
                             out === 'Spoke' ? 'Follow Up' : 'Rejected'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes text area */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Call notes / Customer feedback</label>
                      <textarea 
                        required
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        placeholder="Provide details of conversation (e.g. Anand wants 500 customised corrugated boxes, quotation details to follow on Monday)..."
                        rows={6}
                        className="w-full bg-[#0e121a] text-white border border-[#222b3c] focus:border-[#f97316] outline-none rounded-xl px-3.5 py-2.5 text-xs resize-none"
                      />
                    </div>
                  </div>

                  {/* Submission and file-save trigger */}
                  <button
                    onClick={handleSaveCallLog}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 mt-auto"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save Call Log & Update Registry (कॉल विवरण सहेजें)
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Status message banners / Toast notification */}
      {statusMessage.text && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <div className={`p-4 rounded-xl border shadow-lg text-xs font-bold flex items-center gap-2 max-w-sm ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {statusMessage.type === 'success' ? '✅' : '⚠️'} {statusMessage.text}
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
