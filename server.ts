import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for call recordings (base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database filepath
const DB_FILE = path.join(process.cwd(), "db.json");
const RECORDINGS_DIR = path.join(process.cwd(), "recordings");

// Ensure recordings directory exists
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Serve recordings statically
app.use("/recordings", express.static(RECORDINGS_DIR));

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to read database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        {
          id: "u-admin",
          name: "Admin",
          email: "contact.grahicsworld@gmail.com",
          password: "admin",
          role: "admin",
          salaryBase: 18000,
          commissionRate: 150,
          status: "active"
        }
      ],
      leads: [],
      callLogs: [],
      supportTickets: [],
      autoCallingConfig: {
        delaySeconds: 5,
        enabled: true
      },
      backups: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting to empty", err);
    return { users: [], leads: [], callLogs: [], supportTickets: [], autoCallingConfig: { delaySeconds: 5, enabled: true }, backups: [] };
  }
}

// Helper to write database
function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ==========================================
// API ROUTES
// ==========================================

// Auth Routes
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const db = readDB();
  const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const newUser = {
    id: "u-" + Date.now(),
    name,
    email,
    password, // Storing simply for demonstration/testing CRM
    role,
    salaryBase: role === "admin" ? 18000 : 12000,
    commissionRate: role === "admin" ? 150 : 100,
    status: "active"
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(
    (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  if (user.status === "suspended") {
    return res.status(403).json({ error: "Account suspended by admin" });
  }

  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Users management (Admin Only)
app.get("/api/users", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can access this panel." });
  }
  const db = readDB();
  res.json(db.users);
});

app.post("/api/users/update-rates", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can update payroll rates." });
  }
  const { userId, salaryBase, commissionRate } = req.body;
  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    user.salaryBase = Number(salaryBase);
    user.commissionRate = Number(commissionRate);
    writeDB(db);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: "User not found" });
});

app.post("/api/users/toggle-status", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can toggle staff accounts." });
  }
  const { userId } = req.body;
  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    user.status = user.status === "active" ? "suspended" : "active";
    writeDB(db);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: "User not found" });
});

// Lead Routes
app.get("/api/leads", (req, res) => {
  const db = readDB();
  const userRole = req.headers["x-user-role"];
  const userId = req.headers["x-user-id"];

  if (userRole === "telecaller") {
    // Strict isolation: Telecaller only sees their own assigned leads
    const filtered = db.leads.filter((l: any) => l.assignedTo === userId);
    return res.json(filtered);
  }

  // Admins see all leads
  res.json(db.leads);
});

app.post("/api/leads/add", (req, res) => {
  const { name, phone, email, requirements, assignedTo } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone number are required" });
  }

  const db = readDB();
  let assignedName = null;
  let finalAssignedTo = assignedTo || null;

  // If a telecaller is adding, assign it directly to themselves by default
  const userRole = req.headers["x-user-role"];
  const userId = req.headers["x-user-id"] as string;
  if (userRole === "telecaller" && userId) {
    finalAssignedTo = userId;
  }

  if (finalAssignedTo) {
    const caller = db.users.find((u: any) => u.id === finalAssignedTo);
    if (caller) assignedName = caller.name;
  }

  const newLead = {
    id: "lead-" + Date.now(),
    name,
    phone,
    email: email || "",
    requirements: requirements || "No specific details provided.",
    status: "New",
    assignedTo: finalAssignedTo,
    assignedName,
    assignedByAdminId: userRole === "admin" ? userId : null,
    assignedByAdminName: userRole === "admin" ? "Direct Add" : null,
    assignedAt: userRole === "admin" ? new Date().toISOString() : null,
    notes: "",
    createdAt: new Date().toISOString()
  };

  db.leads.push(newLead);
  writeDB(db);

  res.json({ success: true, lead: newLead });
});

app.post("/api/leads/assign", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can assign leads." });
  }

  const { leadId, userId, adminId, adminName } = req.body;
  const db = readDB();
  const lead = db.leads.find((l: any) => l.id === leadId);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }

  if (userId) {
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    lead.assignedTo = user.id;
    lead.assignedName = user.name;
    lead.assignedByAdminId = adminId || req.headers["x-user-id"] || "u-admin";
    lead.assignedByAdminName = adminName || "Administrator";
    lead.assignedAt = new Date().toISOString();
  } else {
    lead.assignedTo = null;
    lead.assignedName = null;
    lead.assignedByAdminId = null;
    lead.assignedByAdminName = null;
    lead.assignedAt = null;
  }

  writeDB(db);
  res.json({ success: true, lead });
});

app.post("/api/leads/bulk-assign", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can bulk-assign leads." });
  }

  const { leadIds, userId, adminId, adminName } = req.body;
  if (!leadIds || !Array.isArray(leadIds)) {
    return res.status(400).json({ error: "Invalid lead IDs" });
  }

  const db = readDB();
  let assignedName: string | null = null;
  if (userId) {
    const user = db.users.find((u: any) => u.id === userId);
    if (user) assignedName = user.name;
  }

  db.leads.forEach((l: any) => {
    if (leadIds.includes(l.id)) {
      if (userId) {
        l.assignedTo = userId;
        l.assignedName = assignedName;
        l.assignedByAdminId = adminId || req.headers["x-user-id"] || "u-admin";
        l.assignedByAdminName = adminName || "Administrator";
        l.assignedAt = new Date().toISOString();
      } else {
        l.assignedTo = null;
        l.assignedName = null;
        l.assignedByAdminId = null;
        l.assignedByAdminName = null;
        l.assignedAt = null;
      }
    }
  });

  writeDB(db);
  res.json({ success: true });
});

// Delete lead route (both telecallers and admins can delete client leads)
app.post("/api/leads/delete", (req, res) => {
  const { leadId } = req.body;
  if (!leadId) {
    return res.status(400).json({ error: "Lead ID is required" });
  }

  const db = readDB();
  const leadIndex = db.leads.findIndex((l: any) => l.id === leadId);
  if (leadIndex === -1) {
    return res.status(404).json({ error: "Lead not found" });
  }

  // Handle headers with case-insensitivity
  const userRole = (req.headers["x-user-role"] || req.headers["X-User-Role"] || "").toString().toLowerCase();
  const userId = (req.headers["x-user-id"] || req.headers["X-User-Id"] || "").toString();
  const lead = db.leads[leadIndex];

  if (userRole === "telecaller" && lead.assignedTo !== userId) {
    console.warn(`Unauthorized delete attempt: telecaller ${userId} tried to delete lead owned by ${lead.assignedTo}`);
    return res.status(403).json({ error: "Access Denied: You can only delete your own assigned leads." });
  }

  db.leads.splice(leadIndex, 1);
  writeDB(db);
  res.json({ success: true, message: "Lead successfully deleted." });
});

app.post("/api/leads/update-status", (req, res) => {
  const { leadId, status, notes } = req.body;
  const db = readDB();
  const lead = db.leads.find((l: any) => l.id === leadId);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }

  lead.status = status;
  if (notes !== undefined) {
    lead.notes = notes;
  }
  lead.lastCalled = new Date().toISOString();

  writeDB(db);
  res.json({ success: true, lead });
});

// CSV Import
app.post("/api/leads/import", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can import CSV data." });
  }

  const { leads } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: "Invalid leads format" });
  }

  const db = readDB();
  const importedLeads = leads.map((l: any, idx: number) => ({
    id: "lead-" + (Date.now() + idx),
    name: l.name || "Unknown client",
    phone: l.phone || "No phone",
    email: l.email || "",
    requirements: l.requirements || "Imported lead details.",
    status: "New",
    assignedTo: null,
    assignedName: null,
    assignedByAdminId: null,
    assignedByAdminName: null,
    assignedAt: null,
    notes: l.notes || "",
    createdAt: new Date().toISOString()
  }));

  db.leads.push(...importedLeads);
  writeDB(db);

  res.json({ success: true, count: importedLeads.length });
});

// Call Log & Recording
app.get("/api/calls", (req, res) => {
  const db = readDB();
  const userRole = req.headers["x-user-role"];
  const userId = req.headers["x-user-id"];

  if (userRole === "telecaller") {
    // Isolated calling sessions
    const filtered = db.callLogs.filter((c: any) => c.telecallerId === userId);
    return res.json(filtered);
  }

  res.json(db.callLogs);
});

app.post("/api/calls/save", (req, res) => {
  const { leadId, telecallerId, status, duration, notes, recordingBase64 } = req.body;
  const db = readDB();

  const lead = db.leads.find((l: any) => l.id === leadId);
  const telecaller = db.users.find((u: any) => u.id === telecallerId);

  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }

  const callId = "call-" + Date.now();
  let hasRecording = false;

  if (recordingBase64) {
    try {
      // Decode base64 to Buffer and save file
      const base64Data = recordingBase64.replace(/^data:audio\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(path.join(RECORDINGS_DIR, `${callId}.webm`), buffer);
      hasRecording = true;
    } catch (err) {
      console.error("Failed to save audio recording file", err);
    }
  }

  // Save the call log
  const newLog = {
    id: callId,
    leadId,
    leadName: lead.name,
    leadPhone: lead.phone,
    telecallerId,
    telecallerName: telecaller ? telecaller.name : "Unknown",
    status,
    duration: Number(duration) || 0,
    timestamp: new Date().toISOString(),
    notes: notes || "",
    hasRecording,
    recordingId: hasRecording ? callId : undefined
  };

  db.callLogs.push(newLog);

  // Update lead status
  lead.status = status;
  lead.lastCalled = newLog.timestamp;
  if (notes) {
    lead.notes = notes;
  }

  writeDB(db);
  res.json({ success: true, callLog: newLog, lead });
});

// Stream Call Recording Audio
app.get("/api/calls/recording/:id", (req, res) => {
  const file = path.join(RECORDINGS_DIR, `${req.params.id}.webm`);
  if (fs.existsSync(file)) {
    res.setHeader("Content-Type", "audio/webm");
    return res.sendFile(file);
  }
  res.status(404).json({ error: "Recording file not found" });
});

// AI Simulated Calling Dialogues powered by Gemini
app.post("/api/gemini/simulate-call", async (req, res) => {
  const { leadName, leadRequirements, currentPitch, chatHistory } = req.body;

  if (!aiClient) {
    return res.json({
      reply: `[Simulated Response] Hi, this is ${leadName}. I am interested, but can you please mail me the pricing catalog and call me back tomorrow? Thank you!`
    });
  }

  try {
    const formattedHistory = (chatHistory || []).map((msg: any) => 
      `${msg.role === "user" ? "Telecaller (You)" : leadName}: ${msg.text}`
    ).join("\n");

    const systemPrompt = `You are a potential client named ${leadName}. 
The telecaller is pitching a product/service to you.
Your profile/needs are: "${leadRequirements}".
Behave like a realistic Indian business owner/client. Speak naturally, a mix of Hindi and English (Hinglish). 
Your responses should be brief, standard phone conversational dialogues (1-3 sentences maximum). 
Respond in character, do not break character. Do not reply as an assistant. Respond directly to the telecaller's pitch.`;

    const prompt = `Here is the current conversation history so far:
${formattedHistory}

Telecaller pitch just now: "${currentPitch}"

Respond back as ${leadName} on the phone:`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Gemini call simulation failed", err);
    res.json({
      reply: `Acha, main samajh gaya. Aap mujhe iski details email par bhej dijiye, phir hum baat karte hain. Dhanyawad!`
    });
  }
});

// Technical Support Tickets (24/7 technical support feature)
app.get("/api/support", (req, res) => {
  const db = readDB();
  res.json(db.supportTickets);
});

app.post("/api/support/add", (req, res) => {
  const { userName, userEmail, subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: "Subject and Message are required" });
  }

  const db = readDB();
  const newTicket = {
    id: "ticket-" + Date.now(),
    userName: userName || "Anonymous Caller",
    userEmail: userEmail || "support@telecrm.com",
    subject,
    message,
    status: "open",
    timestamp: new Date().toISOString()
  };

  db.supportTickets.push(newTicket);
  writeDB(db);

  res.json({ success: true, ticket: newTicket });
});

app.post("/api/support/reply", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can answer support tickets." });
  }

  const { ticketId, reply } = req.body;
  const db = readDB();
  const ticket = db.supportTickets.find((t: any) => t.id === ticketId);
  if (ticket) {
    ticket.reply = reply;
    ticket.status = "resolved";
    writeDB(db);
    return res.json({ success: true, ticket });
  }
  res.status(404).json({ error: "Ticket not found" });
});

// Admin API: Reset Interactive Analytics & All Call Logs/Performance metrics to zero
app.post("/api/admin/reset-all", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const db = readDB();
  db.callLogs = [];
  writeDB(db);
  res.json({ success: true, message: "Interactive Analytics & Call Logs successfully reset to zero!" });
});

// Admin API: Delete a specific Call Log Recording (Dustbin feature)
app.post("/api/calls/delete", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const { callId } = req.body;
  if (!callId) {
    return res.status(400).json({ error: "Call ID is required" });
  }
  const db = readDB();
  const idx = db.callLogs.findIndex((c: any) => c.id === callId);
  if (idx !== -1) {
    const callLog = db.callLogs[idx];
    if (callLog.recordingId) {
      const file = path.join(RECORDINGS_DIR, `${callLog.recordingId}.webm`);
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch(e) {}
      }
    }
    db.callLogs.splice(idx, 1);
    writeDB(db);
    return res.json({ success: true, message: "Recorded call log successfully deleted." });
  }
  res.status(404).json({ error: "Call log not found" });
});

// Admin API: Delete a Telecaller from the database (Dustbin feature)
app.post("/api/users/delete", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  const db = readDB();
  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx !== -1) {
    db.users.splice(idx, 1);
    db.leads.forEach((l: any) => {
      if (l.assignedTo === userId) {
        l.assignedTo = null;
        l.assignedName = null;
      }
    });
    writeDB(db);
    return res.json({ success: true, message: "Telecaller successfully removed from database." });
  }
  res.status(404).json({ error: "Telecaller not found" });
});

// Admin API: Reset a Telecaller's Conversions & Performance Logs (Reset to zero feature)
app.post("/api/users/reset-performance", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  const db = readDB();
  db.callLogs = db.callLogs.filter((c: any) => c.telecallerId !== userId);
  writeDB(db);
  res.json({ success: true, message: "Telecaller calling history and performance payroll reset to zero." });
});

// Admin API: Add Feedback comments on a Call Recording
app.post("/api/calls/feedback", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const { callId, feedback } = req.body;
  if (!callId) {
    return res.status(400).json({ error: "Call ID is required" });
  }
  const db = readDB();
  const callLog = db.callLogs.find((c: any) => c.id === callId);
  if (callLog) {
    callLog.adminFeedback = feedback;
    writeDB(db);
    return res.json({ success: true, message: "Admin feedback saved successfully.", callLog });
  }
  res.status(404).json({ error: "Call log not found" });
});

// Admin API: Delete a Support Ticket (Dustbin feature)
app.post("/api/support/delete", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const { ticketId } = req.body;
  if (!ticketId) {
    return res.status(400).json({ error: "Ticket ID is required" });
  }
  const db = readDB();
  const idx = db.supportTickets.findIndex((t: any) => t.id === ticketId);
  if (idx !== -1) {
    db.supportTickets.splice(idx, 1);
    writeDB(db);
    return res.json({ success: true, message: "Support ticket deleted." });
  }
  res.status(404).json({ error: "Ticket not found" });
});

// Admin API: Delete a Backup snapshot (Dustbin feature)
app.post("/api/backups/delete", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const { backupId } = req.body;
  if (!backupId) {
    return res.status(400).json({ error: "Backup ID is required" });
  }
  const db = readDB();
  const idx = db.backups.findIndex((b: any) => b.id === backupId);
  if (idx !== -1) {
    db.backups.splice(idx, 1);
    writeDB(db);
    return res.json({ success: true, message: "Backup snapshot deleted." });
  }
  res.status(404).json({ error: "Backup not found" });
});

// Backup & Cloud Auto Backup Features (Daily excel backups / restore)
app.get("/api/backups", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can list database backups." });
  }
  const db = readDB();
  res.json(db.backups || []);
});

app.post("/api/backups/create", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can initiate database backups." });
  }

  const db = readDB();
  const timestamp = new Date().toISOString();
  const backupId = "backup-" + Date.now();
  
  const newBackup = {
    id: backupId,
    name: `Daily Auto Backup - ${new Date().toLocaleDateString()}`,
    timestamp,
    leadsCount: db.leads.length,
    callsCount: db.callLogs.length
  };

  db.backups = db.backups || [];
  db.backups.unshift(newBackup);
  writeDB(db);

  res.json({ success: true, backup: newBackup });
});

// Download CSV of all leads (Simulating "Daily Excel Backups" and lead data backup)
app.get("/api/backups/download", (req, res) => {
  const db = readDB();
  
  // Create CSV format
  const headers = "Lead ID,Name,Phone,Email,Requirements,Status,Assigned To,Assigned Name,Assigned By Admin ID,Assigned By Admin Name,Assigned At,Notes,Created At\n";
  const rows = db.leads.map((l: any) => {
    return `"${l.id}","${l.name.replace(/"/g, '""')}","${l.phone}","${l.email}","${l.requirements.replace(/"/g, '""')}","${l.status}","${l.assignedTo || ''}","${l.assignedName || 'Unassigned'}","${l.assignedByAdminId || ''}","${l.assignedByAdminName || ''}","${l.assignedAt || ''}","${(l.notes || '').replace(/"/g, '""')}","${l.createdAt}"`;
  }).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=telecrm_leads_backup.csv");
  res.send(headers + rows);
});

// Share Backup via Email or WhatsApp Share (Pre-filled links & simulated dispatch)
app.post("/api/backups/share", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can share backup data." });
  }

  const { channel, destination, notes } = req.body;
  if (!channel || !destination) {
    return res.status(400).json({ error: "Sharing channel and destination contact info are required." });
  }

  const db = readDB();
  const leadsCount = db.leads.length;
  const callsCount = db.callLogs.length;

  if (channel === "whatsapp") {
    const text = `*System CRM Database Backup* \n` +
      `📅 Date: ${new Date().toLocaleDateString()}\n` +
      `👥 Total Active Leads Preserved: ${leadsCount}\n` +
      `📞 Simulated Call Sessions: ${callsCount}\n` +
      `📥 Download Excel Sheet: https://telecrm.com/api/backups/download\n` +
      `📝 Note: ${notes || 'No extra notes.'}`;

    const encodedText = encodeURIComponent(text);
    const link = `https://api.whatsapp.com/send?phone=${encodeURIComponent(destination)}&text=${encodedText}`;

    return res.json({ success: true, channel: "whatsapp", link, text });
  } else if (channel === "email") {
    console.log(`==========================================`);
    console.log(`[SIMULATED BACKUP EMAIL TRANSMISSION]`);
    console.log(`To: ${destination}`);
    console.log(`Subject: Tele-CRM Full Data Backup`);
    console.log(`Body: Admin has initiated a data backup. Attached: telecrm_leads_backup.csv (${leadsCount} Leads).`);
    console.log(`System logs: ${callsCount} Call sessions and audio files are preserved.`);
    console.log(`==========================================`);

    return res.json({ 
      success: true, 
      channel: "email", 
      message: `[SIMULATED MAIL DISPATCHED] Backup details successfully dispatched to your email address: ${destination}! Please check your Inbox and Spam folders.`
    });
  }

  res.status(400).json({ error: "Unsupported backup sharing channel." });
});

// Reset Password API (as shown in image - "Password Resets")
app.post("/api/users/reset-password", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can reset passwords." });
  }

  const { userId, newPassword } = req.body;
  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    user.password = newPassword;
    writeDB(db);
    return res.json({ success: true, message: "Password updated successfully" });
  }
  res.status(404).json({ error: "User not found" });
});

// Send Master Recovery Key to Admin's Email
app.post("/api/auth/send-recovery-email", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "इस ईमेल पते के साथ कोई यूजर नहीं मिला।" });
  }

  // RESTRICTION: Only Admin can use this feature
  if (user.role !== "admin") {
    return res.status(403).json({ error: "यह पासवर्ड रिकवरी विकल्प केवल एडमिन (Admin) के लिए ही आरक्षित है।" });
  }

  const masterKey = process.env.ADMIN_RECOVERY_CODE || "0000";

  console.log(`==========================================`);
  console.log(`[SIMULATED EMAIL DISPATCH TO ADMIN]`);
  console.log(`To: ${email}`);
  console.log(`Subject: Secure Master Recovery Code`);
  console.log(`Message: Dear Admin, your secure Master Recovery Key is: "${masterKey}".`);
  console.log(`==========================================`);

  res.json({
    success: true,
    message: `रिकवरी की आपके पंजीकृत एडमिन ईमेल (${email}) पर सुरक्षित भेज दी गई है! (Simulated recovery key has been dispatched to: ${email})`
  });
});

// Master Key Password Reset API (जब कोई एडमिन या यूजर अपना पासवर्ड भूल जाए)
app.post("/api/auth/reset-by-key", (req, res) => {
  const { email, masterKey, newPassword } = req.body;
  
  if (!email || !masterKey || !newPassword) {
    return res.status(400).json({ error: "सभी फ़ील्ड्स (Email, Master Key, New Password) अनिवार्य हैं।" });
  }

  // Set default master key as "0000" or from environment variable
  const expectedKey = process.env.ADMIN_RECOVERY_CODE || "0000";

  if (masterKey !== expectedKey) {
    return res.status(400).json({ error: "गलत मास्टर की (Invalid Recovery Code)!" });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "इस ईमेल पते के साथ कोई यूजर नहीं मिला।" });
  }

  // Double-protecting so telecallers cannot reset passwords this way
  if (user.role !== "admin") {
    return res.status(403).json({ error: "यह पासवर्ड रिकवरी विकल्प केवल एडमिन (Admin) के लिए ही आरक्षित है।" });
  }

  user.password = newPassword;
  writeDB(db);

  res.json({ success: true, message: "पासवर्ड सफलतापूर्वक बदल गया है! अब नए पासवर्ड से लॉग इन करें।" });
});

// Auto-calling configuration
app.get("/api/config", (req, res) => {
  const db = readDB();
  res.json(db.autoCallingConfig || { delaySeconds: 5, enabled: true });
});

app.post("/api/config/update", (req, res) => {
  const { delaySeconds, enabled } = req.body;
  const db = readDB();
  db.autoCallingConfig = {
    delaySeconds: Number(delaySeconds) || 5,
    enabled: !!enabled
  };
  writeDB(db);
  res.json({ success: true, config: db.autoCallingConfig });
});

// Vite middleware setup
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite development middleware loaded.");
    } catch (err) {
      console.error("Failed to load Vite dev middleware, falling back to static files", err);
      serveStaticFiles();
    }
  } else {
    serveStaticFiles();
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tele-CRM full-stack server running on http://localhost:${PORT}`);
  });
}

function serveStaticFiles() {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  console.log("Static production files serving loaded.");
}

startServer();
