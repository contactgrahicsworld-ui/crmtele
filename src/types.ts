export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'head' | 'staff' | 'telecaller';
  department?: 'Tech' | 'NonTech' | 'Sales';
  salaryBase: number;
  commissionRate: number; // commission per qualified lead or per task
  monthlyTarget?: number;
  status: 'active' | 'suspended';
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  requirements: string;
  status: 'New' | 'Interested' | 'Spoke' | 'Not Interested';
  assignedTo: string | null; // User ID
  assignedName: string | null; // User Name
  assignedByAdminId?: string | null;
  assignedByAdminName?: string | null;
  assignedAt?: string | null;
  notes: string;
  lastCalled?: string;
  createdAt: string;
}

export interface CallLog {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  telecallerId: string;
  telecallerName: string;
  status: 'Interested' | 'Spoke' | 'Not Interested';
  duration: number; // in seconds
  timestamp: string;
  notes: string;
  hasRecording: boolean;
  recordingId?: string;
  adminFeedback?: string;
}

export interface SupportTicket {
  id: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  reply?: string;
  timestamp: string;
}

export interface AutoCallingConfig {
  delaySeconds: number;
  enabled: boolean;
}
