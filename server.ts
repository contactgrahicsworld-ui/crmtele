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
      users: [],
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
  const { name, email, password, role, phone, department } = req.body;
  if (!name || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const db = readDB();
  
  // Check if name is already registered
  const existingName = db.users.find((u: any) => u.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existingName) {
    // If the role is main_admin and we are replacing the existing u-admin, we can proceed
    if (!(role === "main_admin" && existingName.id === "u-admin")) {
      return res.status(400).json({ error: "Username already registered" });
    }
  }

  if (email) {
    const existingEmail = db.users.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
      if (!(role === "main_admin" && existingEmail.id === "u-admin")) {
        return res.status(400).json({ error: "Email already registered" });
      }
    }
  }

  let userId = "u-" + Date.now();
  let assignedRole = role;

  if (role === "main_admin") {
    userId = "u-admin";
    assignedRole = "admin";
    // Overwrite the existing u-admin
    db.users = db.users.filter((u: any) => u.id !== "u-admin");
  }

  // Define salary base and commission rate based on role
  let salaryBase = 12000;
  let commissionRate = 100;
  if (assignedRole === "admin") {
    salaryBase = 18000;
    commissionRate = 150;
  } else if (assignedRole === "head") {
    salaryBase = 15000;
    commissionRate = 120;
  }

  const newUser = {
    id: userId,
    name,
    email: email || "",
    password, // Storing simply for demonstration/testing CRM
    phone: phone || "",
    role: assignedRole,
    department: department || "Sales",
    salaryBase,
    commissionRate,
    monthlyTarget: 5,
    status: "active"
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ 
    success: true, 
    user: { 
      id: newUser.id, 
      name: newUser.name, 
      email: newUser.email, 
      phone: newUser.phone, 
      role: newUser.role, 
      department: newUser.department 
    } 
  });
});

app.post("/api/auth/login", (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  const db = readDB();
  const user = db.users.find(
    (u: any) => u.name.trim().toLowerCase() === name.trim().toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(400).json({ error: "Invalid name or password" });
  }

  if (user.status === "suspended") {
    return res.status(403).json({ error: "Account suspended by admin" });
  }

  res.json({ 
    success: true, 
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email || "", 
      phone: user.phone || "",
      role: user.role,
      department: user.department || "Sales"
    } 
  });
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
  const { userId, salaryBase, commissionRate, monthlyTarget } = req.body;
  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    user.salaryBase = Number(salaryBase);
    user.commissionRate = Number(commissionRate);
    if (monthlyTarget !== undefined) {
      user.monthlyTarget = Number(monthlyTarget) || 5;
    }
    writeDB(db);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: "User not found" });
});

app.post("/api/users/admin-update-user", (req, res) => {
  if (req.headers["x-user-role"] !== "admin" || req.headers["x-user-id"] !== "u-admin") {
    return res.status(403).json({ error: "Access Denied: Only the Main Admin can modify user profiles and credentials." });
  }

  const { userId, name, email, password, phone, role, department, salaryBase, commissionRate, monthlyTarget } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const emailExists = db.users.some((u: any) => u.id !== userId && u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(400).json({ error: "Email already registered by another user" });
    }
    user.email = email;
  }

  if (name) user.name = name;
  if (password) user.password = password;
  if (phone !== undefined) user.phone = phone;
  if (role) user.role = role;
  if (department !== undefined) user.department = department;
  if (salaryBase !== undefined) user.salaryBase = Number(salaryBase);
  if (commissionRate !== undefined) user.commissionRate = Number(commissionRate);
  if (monthlyTarget !== undefined) user.monthlyTarget = Number(monthlyTarget);

  writeDB(db);
  res.json({ success: true, message: "User profile and credentials updated successfully!", user });
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
  const { leadId, status, notes, dealValue } = req.body;
  const db = readDB();
  const lead = db.leads.find((l: any) => l.id === leadId);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }

  lead.status = status;
  if (notes !== undefined) {
    lead.notes = notes;
  }
  if (dealValue !== undefined) {
    lead.dealValue = Number(dealValue) || 0;
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
  const { leadId, telecallerId, status, duration, notes, recordingBase64, dealValue } = req.body;
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
    recordingId: hasRecording ? callId : undefined,
    dealValue: Number(dealValue) || 0
  };

  db.callLogs.push(newLog);

  // Update lead status
  lead.status = status;
  if (dealValue !== undefined) {
    lead.dealValue = Number(dealValue) || 0;
  }
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
  if (userId === "u-admin") {
    return res.status(400).json({ error: "The primary/main administrator account cannot be deleted. (मुख्य एडमिन खाता हटाया नहीं जा सकता।)" });
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
    return res.json({ success: true, message: "User successfully removed from database." });
  }
  res.status(404).json({ error: "User not found" });
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

// Update Profile API (Name, Email, Password update for admins and users)
app.post("/api/users/update-profile", (req, res) => {
  const actorRole = req.headers["x-user-role"];
  const actorId = req.headers["x-user-id"];
  const { userId, name, email, password } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (actorId !== userId && actorRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Unauthorized to update this profile" });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const emailExists = db.users.some((u: any) => u.id !== userId && u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(400).json({ error: "Email already registered by another user" });
    }
    user.email = email;
  }

  if (name) user.name = name;
  if (password) user.password = password;

  writeDB(db);
  res.json({ success: true, message: "Profile updated successfully!", user: { id: user.id, name: user.name, email: user.email, role: user.role } });
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

// staff password recovery request to Main Admin
app.post("/api/auth/request-recovery", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Username/Name is required" });
  }
  const db = readDB();
  const user = db.users.find((u: any) => u.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "यह यूजरनेम पंजीकृत नहीं है (This username is not registered)." });
  }
  if (user.id === "u-admin" || user.role === "admin") {
    return res.status(400).json({ error: "कृपया मुख्य एडमिन रिकवरी विकल्प का उपयोग करें (Please use Main Admin recovery option)." });
  }

  db.recoveryRequests = db.recoveryRequests || [];
  // Prevent duplicate pending requests for the same user
  const existing = db.recoveryRequests.find((r: any) => r.userId === user.id && r.status === "pending");
  if (existing) {
    return res.json({ success: true, message: "अनुरोध पहले से ही मुख्य एडमिन के पास लंबित है! (Your request is already pending with the Main Admin!)" });
  }

  const newRequest = {
    id: "rec-" + Date.now(),
    name: user.name,
    userId: user.id,
    phone: user.phone || "",
    email: user.email || "",
    role: user.role,
    department: user.department || "Sales",
    timestamp: new Date().toISOString(),
    status: "pending"
  };

  db.recoveryRequests.push(newRequest);
  writeDB(db);

  res.json({ success: true, message: "पासवर्ड रिकवरी का अनुरोध मुख्य एडमिन को भेज दिया गया है! कृपया रीसेट के लिए एडमिन से संपर्क करें।" });
});

// Main Admin password recovery (sends password to Whatsapp and registered Email)
app.post("/api/auth/main-admin-recover", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and registered email are required" });
  }
  const db = readDB();
  const user = db.users.find((u: any) => u.id === "u-admin");
  if (!user) {
    return res.status(404).json({ error: "मुख्य एडमिन अकाउंट नहीं मिला।" });
  }

  // Check if name and email match the main admin's credentials
  const nameMatch = user.name.trim().toLowerCase() === name.trim().toLowerCase();
  const emailMatch = user.email && user.email.trim().toLowerCase() === email.trim().toLowerCase();

  if (!nameMatch || !emailMatch) {
    return res.status(400).json({ error: "दर्ज किया गया नाम या ईमेल मुख्य एडमिन के रिकॉर्ड से मेल नहीं खाता है।" });
  }

  const adminPassword = user.password;
  const adminPhone = user.phone || "No phone registered";

  // Simulate sending real SMS/WhatsApp/Email to the registered credentials
  console.log(`==========================================`);
  console.log(`[REAL-TIME DISPATCH - HUBSPHERE BRANDING]`);
  console.log(`[WhatsApp Delivery] Sent to ${adminPhone}: "Your HubSphere Main Admin password is: ${adminPassword}"`);
  console.log(`[Email Delivery] Dispatched to ${user.email}: "Your HubSphere Main Admin password is: ${adminPassword}"`);
  console.log(`==========================================`);

  res.json({
    success: true,
    password: adminPassword,
    phone: adminPhone,
    email: user.email,
    message: `पासवर्ड आपके पंजीकृत व्हाट्सएप (${adminPhone}) और ईमेल (${user.email}) पर भेज दिया गया है! \n\n🔑 आपका पासवर्ड है: "${adminPassword}"`
  });
});

// GET pending recovery requests
app.get("/api/auth/recovery-requests", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const db = readDB();
  res.json(db.recoveryRequests || []);
});

// POST resolve pending recovery request
app.post("/api/auth/resolve-recovery", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied" });
  }
  const { requestId, newPassword, action } = req.body; // action: 'approve' | 'reject'
  if (!requestId) {
    return res.status(400).json({ error: "Request ID is required" });
  }

  const db = readDB();
  db.recoveryRequests = db.recoveryRequests || [];
  const request = db.recoveryRequests.find((r: any) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (action === "approve") {
    if (!newPassword) {
      return res.status(400).json({ error: "New password is required to approve" });
    }
    const user = db.users.find((u: any) => u.id === request.userId);
    if (user) {
      user.password = newPassword;
    }
    request.status = "approved";
    request.resolvedAt = new Date().toISOString();
    request.tempPassword = newPassword;
  } else {
    request.status = "rejected";
    request.resolvedAt = new Date().toISOString();
  }

  writeDB(db);
  res.json({ success: true, message: action === "approve" ? "Request approved and password reset successfully!" : "Request rejected" });
});

// HRM, Attendance and Leave Endpoints

// Helper to ensure lists exist
const getHRMLists = (db: any) => {
  if (!db.attendance) db.attendance = [];
  if (!db.leaves) db.leaves = [];
  if (!db.tasks) db.tasks = [];
  if (!db.companyHolidays) db.companyHolidays = [];
  if (!db.reports) db.reports = [];
  return db;
};

// Log login
app.post("/api/attendance/login", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (userId === "u-admin") {
    // Exclude main admin from attendance tracking
    return res.json({ success: true, ignored: true, message: "Main admin is excluded from attendance tracking" });
  }

  const db = readDB();
  getHRMLists(db);

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const existing = db.attendance.find((a: any) => a.userId === userId && a.date === today);

  if (existing) {
    return res.json({ success: true, attendance: existing, message: "Already logged in today" });
  }

  const newRecord = {
    id: "att-" + Date.now(),
    userId,
    userName: user.name,
    userRole: user.role,
    date: today,
    loginTime: new Date().toISOString(),
    logoutTime: null,
    status: "Present"
  };

  db.attendance.push(newRecord);
  writeDB(db);

  res.json({ success: true, attendance: newRecord, message: "Successfully logged in for today" });
});

// Log logout
app.post("/api/attendance/logout", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (userId === "u-admin") {
    return res.json({ success: true, ignored: true });
  }

  const db = readDB();
  getHRMLists(db);

  const today = new Date().toISOString().split("T")[0];
  const record = db.attendance.find((a: any) => a.userId === userId && a.date === today);

  if (record) {
    record.logoutTime = new Date().toISOString();
    writeDB(db);
    return res.json({ success: true, attendance: record, message: "Successfully logged out" });
  }

  // Fallback: search for latest active with null logoutTime
  const latestNull = [...db.attendance]
    .reverse()
    .find((a: any) => a.userId === userId && !a.logoutTime);

  if (latestNull) {
    latestNull.logoutTime = new Date().toISOString();
    writeDB(db);
    return res.json({ success: true, attendance: latestNull, message: "Successfully logged out from previous session" });
  }

  res.status(404).json({ error: "No active attendance record found for today to logout." });
});

// Get attendance logs
app.get("/api/attendance", (req, res) => {
  const db = readDB();
  getHRMLists(db);
  res.json(db.attendance);
});

// Get leave logs
app.get("/api/leaves", (req, res) => {
  const db = readDB();
  getHRMLists(db);
  res.json(db.leaves);
});

// Apply for leave
app.post("/api/leaves/apply", (req, res) => {
  const { userId, reason, startDate, endDate } = req.body;
  if (!userId || !reason || !startDate || !endDate) {
    return res.status(400).json({ error: "All fields are required to apply for leave" });
  }

  const db = readDB();
  getHRMLists(db);

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Compute number of days (inclusive)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const newLeave = {
    id: "leave-" + Date.now(),
    userId,
    userName: user.name,
    userRole: user.role,
    reason,
    startDate,
    endDate,
    daysCount,
    status: "Pending", // Pending, Approved, Rejected
    appliedAt: new Date().toISOString(),
    approvedBy: null
  };

  db.leaves.push(newLeave);
  writeDB(db);

  res.json({ success: true, leave: newLeave, message: "Leave applied successfully and is pending main admin approval." });
});

// Approve / Reject leave
app.post("/api/leaves/approve", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only main administrator can approve or reject leaves." });
  }

  const { leaveId, action, rejectionReason } = req.body; // action is "Approved" or "Rejected"
  if (!leaveId || !action) {
    return res.status(400).json({ error: "Leave ID and action are required" });
  }

  const db = readDB();
  getHRMLists(db);

  const leave = db.leaves.find((l: any) => l.id === leaveId);
  if (!leave) {
    return res.status(404).json({ error: "Leave application not found" });
  }

  leave.status = action;
  leave.approvedBy = "u-admin";
  if (action === "Rejected") {
    leave.rejectionReason = rejectionReason || "No reason specified";
  } else {
    leave.rejectionReason = null;
  }
  
  writeDB(db);
  res.json({ success: true, leave, message: `Leave has been successfully ${action.toLowerCase()}` });
});

// Raise a question/query about a rejected leave
app.post("/api/leaves/query", (req, res) => {
  const { leaveId, queryText, userId } = req.body;
  if (!leaveId || !queryText || !userId) {
    return res.status(400).json({ error: "Leave ID, query text, and user ID are required" });
  }

  const db = readDB();
  getHRMLists(db);

  const leave = db.leaves.find((l: any) => l.id === leaveId);
  if (!leave) {
    return res.status(404).json({ error: "Leave application not found" });
  }

  if (leave.userId !== userId) {
    return res.status(403).json({ error: "Access Denied: You cannot query this leave application" });
  }

  if (leave.status !== "Rejected" && leave.status !== "Queried") {
    return res.status(400).json({ error: "You can only raise questions on rejected leave applications." });
  }

  leave.query = queryText;
  leave.status = "Queried";
  leave.queryResponse = null; // Clear any old responses
  
  writeDB(db);
  res.json({ success: true, leave, message: "Question raised successfully. Awaiting admin response." });
});

// Respond to a queried leave (main admin)
app.post("/api/leaves/respond", (req, res) => {
  if (req.headers["x-user-role"] !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only main administrator can respond to queries." });
  }

  const { leaveId, response, action } = req.body; // action can be "Approved" or "Rejected"
  if (!leaveId || !response || !action) {
    return res.status(400).json({ error: "Leave ID, response, and action are required" });
  }

  const db = readDB();
  getHRMLists(db);

  const leave = db.leaves.find((l: any) => l.id === leaveId);
  if (!leave) {
    return res.status(404).json({ error: "Leave application not found" });
  }

  leave.queryResponse = response;
  leave.status = action;
  
  writeDB(db);
  res.json({ success: true, leave, message: `Response registered. Leave status is now ${action.toLowerCase()}` });
});

// ==========================================
// COMPANY HOLIDAYS ENDPOINTS
// ==========================================
app.get("/api/company-holidays", (req, res) => {
  const db = readDB();
  getHRMLists(db);
  res.json(db.companyHolidays || []);
});

app.post("/api/company-holidays", (req, res) => {
  if (req.headers["x-user-role"] !== "admin" || req.headers["x-user-id"] !== "u-admin") {
    return res.status(403).json({ error: "Access Denied: Only Main Admin can declare holidays." });
  }

  const { date, reason } = req.body;
  if (!date || !reason) {
    return res.status(400).json({ error: "Date and reason are required" });
  }

  const db = readDB();
  getHRMLists(db);

  const existing = db.companyHolidays.find((h: any) => h.date === date);
  if (existing) {
    existing.reason = reason;
  } else {
    db.companyHolidays.push({
      id: "hol-" + Date.now(),
      date,
      reason
    });
  }

  writeDB(db);
  res.json({ success: true, message: "Company Holiday declared successfully!" });
});

app.delete("/api/company-holidays/:id", (req, res) => {
  if (req.headers["x-user-role"] !== "admin" || req.headers["x-user-id"] !== "u-admin") {
    return res.status(403).json({ error: "Access Denied: Only Main Admin can delete holidays." });
  }

  const { id } = req.params;
  const db = readDB();
  getHRMLists(db);

  db.companyHolidays = db.companyHolidays.filter((h: any) => h.id !== id);
  writeDB(db);
  res.json({ success: true, message: "Company Holiday deleted successfully." });
});

// ==========================================
// SUB-ADMIN WORK / TASK ENDPOINTS
// ==========================================
// ==========================================
// WORK / TASK ENDPOINTS FOR SYSTEM WORKFLOW
// ==========================================
app.get("/api/tasks", (req, res) => {
  const db = readDB();
  getHRMLists(db);

  const { adminId, assignedTo, assignedBy, department } = req.query;
  let userTasks = db.tasks || [];

  // Backward compatibility support for adminId parameter
  if (adminId) {
    userTasks = userTasks.filter((t: any) => t.adminId === adminId || t.assignedTo === adminId);
    return res.json(userTasks);
  }

  if (assignedTo) {
    userTasks = userTasks.filter((t: any) => t.assignedTo === assignedTo || t.adminId === assignedTo);
  }
  if (assignedBy) {
    userTasks = userTasks.filter((t: any) => t.assignedBy === assignedBy);
  }
  if (department) {
    userTasks = userTasks.filter((t: any) => t.department === department);
  }

  res.json(userTasks);
});

app.post("/api/tasks", (req, res) => {
  const { adminId, adminName, title, date, assignedTo, assignedToName, assignedBy, assignedByName, department } = req.body;
  
  const finalAssignedTo = assignedTo || adminId;
  const finalAssignedToName = assignedToName || adminName;
  const finalAssignedBy = assignedBy || req.headers["x-user-id"] || "u-admin";
  const finalAssignedByName = assignedByName || "Administrator";

  if (!finalAssignedTo || !finalAssignedToName || !title || !date) {
    return res.status(400).json({ error: "Assignee details, task Title, and Date are required." });
  }

  const db = readDB();
  getHRMLists(db);

  const newTask = {
    id: "task-" + Date.now(),
    adminId: finalAssignedTo, // backward compatibility
    adminName: finalAssignedToName, // backward compatibility
    assignedTo: finalAssignedTo,
    assignedToName: finalAssignedToName,
    assignedBy: finalAssignedBy,
    assignedByName: finalAssignedByName,
    department: department || null,
    title,
    date,
    status: "Pending", // Pending, Submitted, Approved, Denied, Appealed
    remark: null,
    adminReply: null,
    appeal: null,
    appealReply: null
  };

  db.tasks.push(newTask);
  writeDB(db);
  res.json({ success: true, task: newTask, message: "Task assigned successfully!" });
});

app.post("/api/tasks/submit", (req, res) => {
  const { taskId, status, remark } = req.body;
  if (!taskId || !status || !remark) {
    return res.status(400).json({ error: "Task ID, status, and genuine remark are required." });
  }

  const db = readDB();
  getHRMLists(db);

  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  task.status = status === "Completed" ? "Submitted" : "Pending";
  task.remark = remark;
  task.adminReply = null;
  task.appeal = null;
  task.appealReply = null;

  writeDB(db);
  res.json({ success: true, task, message: "Task update submitted successfully!" });
});

app.post("/api/tasks/evaluate", (req, res) => {
  const { taskId, action, adminReply } = req.body;
  const actorId = req.headers["x-user-id"];
  const actorRole = req.headers["x-user-role"];

  if (!taskId || !action || !adminReply) {
    return res.status(400).json({ error: "Task ID, evaluation action, and reply are required." });
  }

  const db = readDB();
  getHRMLists(db);

  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  // Allow evaluation if caller is Main Admin, or if they are the task assigner, or if they are an admin
  const isAllowed = actorId === "u-admin" || task.assignedBy === actorId || actorRole === "admin";
  if (!isAllowed) {
    return res.status(403).json({ error: "Access Denied: You cannot evaluate this task." });
  }

  task.status = action;
  task.adminReply = adminReply;

  writeDB(db);
  res.json({ success: true, task, message: `Task has been ${action.toLowerCase()} successfully.` });
});

app.post("/api/tasks/appeal", (req, res) => {
  const { taskId, appeal } = req.body;
  if (!taskId || !appeal) {
    return res.status(400).json({ error: "Task ID and appeal question are required." });
  }

  const db = readDB();
  getHRMLists(db);

  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  task.status = "Appealed";
  task.appeal = appeal;
  task.appealReply = null;

  writeDB(db);
  res.json({ success: true, task, message: "Appeal/Question raised successfully!" });
});

app.post("/api/tasks/appeal-reply", (req, res) => {
  const { taskId, appealReply, action } = req.body;
  const actorId = req.headers["x-user-id"];
  const actorRole = req.headers["x-user-role"];

  if (!taskId || !appealReply || !action) {
    return res.status(400).json({ error: "Task ID, reply instruction, and final action are required." });
  }

  const db = readDB();
  getHRMLists(db);

  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  // Allow appeal reply if Main Admin or task creator
  const isAllowed = actorId === "u-admin" || task.assignedBy === actorId || actorRole === "admin";
  if (!isAllowed) {
    return res.status(403).json({ error: "Access Denied: You cannot answer this appeal." });
  }

  task.appealReply = appealReply;
  task.status = action;

  writeDB(db);
  res.json({ success: true, task, message: `Response registered. Task status updated to ${action}.` });
});

// ==========================================
// DEPARTMENTAL WORKFLOW REPORTING ENDPOINTS
// ==========================================
app.get("/api/reports", (req, res) => {
  const db = readDB();
  getHRMLists(db);
  res.json(db.reports || []);
});

app.post("/api/reports/submit", (req, res) => {
  const { type, senderId, senderName, senderRole, department, reportText, date } = req.body;
  if (!senderId || !senderName || !reportText || !date) {
    return res.status(400).json({ error: "Sender details, reportText, and date are required." });
  }

  const db = readDB();
  getHRMLists(db);

  const newReport = {
    id: "rep-" + Date.now(),
    type: type || "department", // department (Head -> Sub-Admin) or consolidated (Sub-Admin -> Main Admin)
    senderId,
    senderName,
    senderRole: senderRole || "head",
    department: department || "Sales",
    reportText,
    date,
    status: "Pending", // Pending, Reviewed
    reviewedBy: null,
    reviewedByName: null,
    feedback: null,
    reviewedAt: null
  };

  db.reports.push(newReport);
  writeDB(db);
  res.json({ success: true, report: newReport, message: "Department work report submitted successfully!" });
});

app.post("/api/reports/review", (req, res) => {
  const { reportId, reviewerId, reviewerName, feedback } = req.body;
  if (!reportId || !reviewerId || !reviewerName || !feedback) {
    return res.status(400).json({ error: "Report ID, reviewer details, and feedback are required." });
  }

  const db = readDB();
  getHRMLists(db);

  const report = db.reports.find((r: any) => r.id === reportId);
  if (!report) {
    return res.status(404).json({ error: "Report not found." });
  }

  report.status = "Reviewed";
  report.reviewedBy = reviewerId;
  report.reviewedByName = reviewerName;
  report.feedback = feedback;
  report.reviewedAt = new Date().toISOString();

  writeDB(db);
  res.json({ success: true, report, message: "Report reviewed and feedback sent successfully!" });
});

// GET payroll and attendance report
app.get("/api/payroll/report", (req, res) => {
  const db = readDB();
  getHRMLists(db);

  const targetMonth = (req.query.month as string) || new Date().toISOString().slice(0, 7); // YYYY-MM
  const [yr, mn] = targetMonth.split("-").map(Number);

  if (!yr || !mn || mn < 1 || mn > 12) {
    return res.status(400).json({ error: "Invalid month format. Expected YYYY-MM" });
  }

  const daysInMonth = new Date(yr, mn, 0).getDate();
  const isFeb = mn === 2;

  // Filter out the main admin u-admin
  const eligibleUsers = db.users.filter((u: any) => u.id !== "u-admin" && u.email !== "contact.grahicsworld@gmail.com");

  const report = eligibleUsers.map((user: any) => {
    const salaryBase = user.salaryBase || 12000;
    const commissionRate = user.commissionRate || 100;
    const monthlyTarget = user.monthlyTarget || 5;
    const perDaySalary = Number((salaryBase / daysInMonth).toFixed(2));

    let totalDeductions = 0;
    let presentDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let sundayPaidCount = 0;
    let sundayDeductedCount = 0;
    let companyHolidaysCount = 0;

    const detailDays: any[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Loop through each day of the target month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, "0");
      const dateStr = `${yr}-${String(mn).padStart(2, "0")}-${dayStr}`;
      
      const dayOfWeek = new Date(yr, mn - 1, d).getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Check if user was present
      const attRecord = db.attendance.find((a: any) => a.userId === user.id && a.date === dateStr);
      
      // Check if user has an approved leave
      const isApprovedLeave = db.leaves.some(
        (l: any) => l.userId === user.id && l.status === "Approved" && l.startDate <= dateStr && l.endDate >= dateStr
      );

      // Check if declared as Company-wide Holiday by Main Admin
      const isCompanyHoliday = db.companyHolidays.some((h: any) => h.date === dateStr);

      if (isCompanyHoliday) {
        // Puree staff ko main admin leave de -> fully paid leave! (No deduction)
        companyHolidaysCount++;
        detailDays.push({ 
          date: dateStr, 
          day: d, 
          type: "CompanyHoliday", 
          label: "Company Holiday (Paid)", 
          deductionFraction: 0 
        });
      } else if (dayOfWeek === 0) {
        // It is Sunday!
        if (isFeb) {
          sundayPaidCount++;
          detailDays.push({ 
            date: dateStr, 
            day: d, 
            type: "Sunday-Paid", 
            label: "Sunday (Paid)", 
            deductionFraction: 0 
          });
        } else {
          // Rule: Sunday is paid if NOT on leave or absent on BOTH Saturday and Monday
          const satDate = new Date(yr, mn - 1, d - 1);
          const satStr = satDate.toISOString().split("T")[0];
          const monDate = new Date(yr, mn - 1, d + 1);
          const monStr = monDate.toISOString().split("T")[0];

          const satLeaveOrAbsent = db.leaves.some((l: any) => l.userId === user.id && l.status === "Approved" && l.startDate <= satStr && l.endDate >= satStr) 
            || !db.attendance.some((a: any) => a.userId === user.id && a.date === satStr);
            
          const monLeaveOrAbsent = db.leaves.some((l: any) => l.userId === user.id && l.status === "Approved" && l.startDate <= monStr && l.endDate >= monStr) 
            || !db.attendance.some((a: any) => a.userId === user.id && a.date === monStr);

          if (satLeaveOrAbsent || monLeaveOrAbsent) {
            sundayDeductedCount++;
            detailDays.push({ 
              date: dateStr, 
              day: d, 
              type: "Sunday-Deducted", 
              label: "Sunday (Deducted - Sat/Mon Leave)", 
              deductionFraction: 1.0 
            });
            totalDeductions += perDaySalary;
          } else {
            sundayPaidCount++;
            detailDays.push({ 
              date: dateStr, 
              day: d, 
              type: "Sunday-Paid", 
              label: "Sunday (Paid)", 
              deductionFraction: 0 
            });
          }
        }
      } else {
        // Regular weekday/Saturday
        if (attRecord) {
          let workHours = 0;
          if (attRecord.loginTime && attRecord.logoutTime) {
            const diffMs = new Date(attRecord.logoutTime).getTime() - new Date(attRecord.loginTime).getTime();
            workHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
          } else if (attRecord.loginTime && dateStr === todayStr) {
            workHours = 9.0;
          } else {
            workHours = 4.0; // Past day forgotten logout
          }

          if (workHours >= 9.0) {
            presentDays++;
            detailDays.push({ 
              date: dateStr, 
              day: d, 
              type: "Present", 
              label: `Present (${workHours} hrs - Full Day)`, 
              deductionFraction: 0 
            });
          } else if (workHours >= 4.0) {
            presentDays += 0.5;
            detailDays.push({ 
              date: dateStr, 
              day: d, 
              type: "Present-Half", 
              label: `Present (${workHours} hrs - Half Day)`, 
              deductionFraction: 0.5 
            });
            totalDeductions += 0.5 * perDaySalary;
          } else {
            absentDays++;
            detailDays.push({ 
              date: dateStr, 
              day: d, 
              type: "Absent", 
              label: `Present (${workHours} hrs - Short Logout < 4 hrs)`, 
              deductionFraction: 1.0 
            });
            totalDeductions += perDaySalary;
          }
        } else if (isApprovedLeave) {
          // Approved leave passed by main admin counts as payed half salary! (Deducted 50%)
          leaveDays++;
          detailDays.push({ 
            date: dateStr, 
            day: d, 
            type: "Leave-Approved", 
            label: "Approved Leave (Half Pay)", 
            deductionFraction: 0.5 
          });
          totalDeductions += 0.5 * perDaySalary;
        } else {
          absentDays++;
          detailDays.push({ 
            date: dateStr, 
            day: d, 
            type: "Absent", 
            label: "Absent (Deducted)", 
            deductionFraction: 1.0 
          });
          totalDeductions += perDaySalary;
        }
      }
    }

    const finalBasicSalary = Number(Math.max(0, salaryBase - totalDeductions).toFixed(2));

    // Calculate calling metrics in the target month (only applicable/relevant to telecallers, but calculated for overview)
    const userLogs = db.callLogs.filter(
      (c: any) => c.telecallerId === user.id && c.timestamp && c.timestamp.startsWith(targetMonth)
    );

    const totalCalls = userLogs.length;
    const interestedCount = userLogs.filter((c: any) => c.status === "Interested").length;
    const salesDoneCount = userLogs.filter((c: any) => c.status === "Sales Done").length;
    
    const businessRevenue = userLogs
      .filter((c: any) => c.status === "Sales Done")
      .reduce((sum: number, c: any) => sum + (Number(c.dealValue) || 0), 0);

    // Performance Pct and Incentive
    let performancePct = 0;
    let incentivePct = 0;
    let incentiveAmount = 0;

    const isSalesRole = user.role === "telecaller" || (user.role === "staff" && user.department === "Sales");

    if (isSalesRole) {
      performancePct = monthlyTarget > 0 ? Number(((salesDoneCount / monthlyTarget) * 100).toFixed(2)) : 0;
      if (performancePct > 100) {
        incentivePct = Number((performancePct - 100).toFixed(2));
        incentiveAmount = Number(((incentivePct / 100) * salaryBase).toFixed(2));
      }
    } else {
      // Sub-admin, department head, or Tech/NonTech staff tasks performance and incentive
      const monthTasks = db.tasks.filter((t: any) => (t.adminId === user.id || t.assignedTo === user.id) && t.date && t.date.startsWith(targetMonth));
      const totalTasks = monthTasks.length;
      const approvedTasks = monthTasks.filter((t: any) => t.status === "Approved").length;
      
      performancePct = totalTasks > 0 ? Number(((approvedTasks / totalTasks) * 100).toFixed(2)) : 100;
      incentiveAmount = approvedTasks * commissionRate; // Commission/Incentive per approved task
    }

    const finalSalary = Number((finalBasicSalary + incentiveAmount).toFixed(2));

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      department: user.department || "Sales",
      salaryBase,
      commissionRate,
      monthlyTarget,
      daysInMonth,
      perDaySalary,
      presentDays,
      leaveDays,
      absentDays,
      sundayPaidCount,
      sundayDeductedCount,
      companyHolidaysCount,
      totalDeductions: Number(totalDeductions.toFixed(2)),
      finalBasicSalary,
      totalCalls,
      interestedCount,
      salesDoneCount,
      businessRevenue,
      performancePct,
      incentivePct,
      incentiveAmount,
      finalSalary,
      detailDays,
      totalTasks: isSalesRole ? 0 : db.tasks.filter((t: any) => (t.adminId === user.id || t.assignedTo === user.id) && t.date && t.date.startsWith(targetMonth)).length,
      approvedTasks: isSalesRole ? 0 : db.tasks.filter((t: any) => (t.adminId === user.id || t.assignedTo === user.id) && t.date && t.date.startsWith(targetMonth) && t.status === "Approved").length
    };
  });

  res.json({ success: true, month: targetMonth, report });
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
