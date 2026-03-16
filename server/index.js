require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env.local"),
});
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const notificationHistory = require("./notificationHistory");
const authRoutes = require("./routes/auth");
const { seedDemoAccounts } = require("./seed");
const User = require("./models/User");
const PatientLink = require("./models/PatientLink");
const PartnerLink = require("./models/PartnerLink");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;

// 1. Initialize WebSocket Server with CORS enabled for the React app
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
let currentSteps = 0;
// 2. Function to emit the 'stepsUpdate' event to all connected clients
function broadcastVitals(data) {
  io.emit('stepsUpdate', data);
}

app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


// ─── MongoDB Connection ──────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGODB_URI) {
    console.error("[DB] MONGODB_URI not set in .env.local — auth features will not work!");
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[DB] Connected to MongoDB Atlas ✓");
    // Seed demo accounts
    await seedDemoAccounts();
  } catch (err) {
    console.error("[DB] MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

connectDB();

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ─── Chat & Patient Routes ───────────────────────────────────────────────────
app.use("/api/chat", require("./routes/chat"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/partner", require("./routes/partner"));

// ─── Risk Alert Email (existing) ─────────────────────────────────────────────
const RISK_ALERT_EMAIL = "safemom.support@gmail.com";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return null;
  }
  // Use custom host/port if set (Outlook, Yahoo, etc.) – then you can often use normal password
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  if (host) {
    return nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }
  // For Gmail, explicitly use port 587 with STARTTLS to avoid IPv6/SSL issues
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use STARTTLS
    auth: { user, pass },
    // Force IPv4 to avoid IPv6 connection issues
    family: 4,
  });
}

app.post("/api/send-risk-alert", async (req, res) => {
  const { riskLevel, summary, message, patientId } = req.body || {};
  console.log(
    "[Risk alert] Received:",
    riskLevel ? "riskLevel=" + riskLevel : "missing riskLevel",
  );
  console.log("[Risk alert] Body:", JSON.stringify(req.body || {}));
  if (!riskLevel) {
    return res.status(400).json({ ok: false, error: "riskLevel is required" });
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      "[Risk alert] Email not configured (SMTP_USER/SMTP_PASS missing)",
    );
    return res.status(503).json({
      ok: false,
      error: "Email not configured. Set SMTP_USER and SMTP_PASS in .env.local",
    });
  }

  // Verify transporter before attempting to send mail so failures are explicit in logs
  try {
    await transporter.verify();
    console.log("[Risk alert] SMTP transporter verified");
  } catch (verifyErr) {
    console.error(
      "[Risk alert] Transporter verify failed:",
      verifyErr && (verifyErr.message || verifyErr),
    );
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "SMTP transporter verify failed: " +
          (verifyErr && verifyErr.message
            ? verifyErr.message
            : String(verifyErr)),
      });
  }

  // 1. Fetch patient and linked doctors
  let patient = null;
  let linkedClinicians = [];

  if (patientId) {
    try {
      patient = await User.findById(patientId);
      if (patient) {
        const links = await PatientLink.find({ patientId }).populate("clinicianId");
        linkedClinicians = links.map(link => link.clinicianId).filter(Boolean);
      }
    } catch (e) {
      console.error("[Risk alert] Error fetching patient/links:", e);
    }
  }

  // 2. Determine recipients
  const emailTargets = [];
  if (patient && patient.email) {
    emailTargets.push({
      email: patient.email,
      name: patient.name,
      isDoctor: false
    });
  }

  linkedClinicians.forEach(doc => {
    if (doc.email) {
      emailTargets.push({
        email: doc.email,
        name: doc.name,
        isDoctor: true
      });
    }
  });

  // Also look up any partner linked to this mother and add them as a recipient
  if (patientId && patient) {
    try {
      const partnerLink = await PartnerLink.findOne({ motherId: patientId }).populate("partnerId");
      if (partnerLink && partnerLink.partnerId && partnerLink.partnerId.email) {
        const partnerUser = partnerLink.partnerId;
        emailTargets.push({
          email: partnerUser.email,
          name: partnerUser.name,
          isDoctor: false,
          isPartner: true
        });
      }
    } catch (pErr) {
      console.error("[Risk alert] Error fetching partner link:", pErr);
    }
  }

  // Fallback to default if no valid targets found
  if (emailTargets.length === 0) {
    emailTargets.push({
      email: RISK_ALERT_EMAIL,
      name: "Admin",
      isDoctor: true
    });
  }

  let successCount = 0;
  let lastInfo = null;
  let firstError = null;

  for (const target of emailTargets) {
    // Subject could include the patient name if it's sent to doctor
    const subject = target.isDoctor && patient
        ? `[SafeMom] High risk identified for your patient: ${patient.name}`
        : `[SafeMom] High risk identified: ${riskLevel}`;

    // Customize message for doctor or patient
    let emailMessage = message;
    if (message) {
      const greetingRegex = /^(hello|hi|dear)\s+[^,\n]+,/i;
      
      if (target.isDoctor && patient) {
        const docGreeting = `Hi ${target.name} and your patient ${patient.name},`;
        if (greetingRegex.test(message)) {
          emailMessage = message.replace(greetingRegex, docGreeting);
        } else {
          emailMessage = `${docGreeting}\n\n${message}`;
        }
      } else if (!target.isDoctor) {
        const patientGreeting = `Hi ${target.name},`;
        if (greetingRegex.test(message)) {
          emailMessage = message.replace(greetingRegex, patientGreeting);
        } else {
          emailMessage = `${patientGreeting}\n\n${message}`;
        }
      }
    }

    const text = [
      `Risk level: ${riskLevel}`,
      summary ? `Vitals summary: ${summary}` : "",
      emailMessage ? `\nAI assessment:\n${emailMessage}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <h2>SafeMom – High risk identified</h2>
      <p><strong>Risk level:</strong> ${riskLevel}</p>
      ${summary ? `<p><strong>Vitals summary:</strong> ${summary}</p>` : ""}
      ${emailMessage ? `<h3>AI assessment</h3><pre style="white-space:pre-wrap;">${escapeHtml(emailMessage)}</pre>` : ""}
      <p><em>This is an automated alert from SafeMom. Please follow up with the mother/patient.</em></p>
    `.trim();

    try {
      const info = await transporter.sendMail({
        from: '"SafeMom Support" <safemom.support@gmail.com>',
        to: target.email,
        subject,
        text,
        html,
      });
      console.log("[Risk alert] Email sent to", target.email, "info:", info);
      successCount++;
      lastInfo = info;

      // Record successful notification
      notificationHistory.addNotification({
        status: 'success',
        riskLevel,
        recipient: target.email, // save actual recipient email
        summary,
        messagePreview: emailMessage ? emailMessage.substring(0, 100) + '...' : '',
        messageId: info.messageId,
        response: info.response
      });

    } catch (err) {
      console.error("[Risk alert] Email failed to", target.email, ":", err && (err.message || err));
      if (!firstError) firstError = err;

      // Record failed notification
      notificationHistory.addNotification({
        status: 'failed',
        riskLevel,
        recipient: target.email,
        summary,
        messagePreview: emailMessage ? emailMessage.substring(0, 100) + '...' : '',
        error: err.message || 'Unknown error'
      });
    }
  }

  if (successCount > 0) {
    res.json({ ok: true, info: lastInfo, sentCount: successCount });
  } else {
    res.status(500).json({ ok: false, error: firstError ? firstError.message : "Failed to send any emails" });
  }
});

// ─── Contact Form ────────────────────────────────────────────────────────────
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Name, email, and message are required" });
  }

  try {
    const { sendContactEmailToSupport, sendContactAutoReply } = require("./utils/email");

    // Send message to support inbox
    await sendContactEmailToSupport(name, email, message);

    // Send auto-reply to user
    await sendContactAutoReply(name, email);

    res.json({ ok: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("[Contact] Error processing contact form:", err);
    res.status(500).json({ ok: false, error: "Failed to send message. Please try again later." });
  }
});

const { authMiddleware } = require("./middleware/auth");

// Get notification history
app.get("/api/notification-history", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = notificationHistory.getHistory().notifications;
    const user = req.user;

    // Allowed emails: the user's own email + all linked patients
    const allowedEmails = new Set();
    if (user.email) allowedEmails.add(user.email.toLowerCase().trim());

    if (user.role === 'doctor' || user.role === 'asha') {
      const links = await PatientLink.find({ clinicianId: user._id }).populate("patientId");
      links.forEach(link => {
        if (link.patientId && link.patientId.email) {
          allowedEmails.add(link.patientId.email.toLowerCase().trim());
        }
      });
    }

    const filteredNotifications = history.filter(n =>
      n.recipient && allowedEmails.has(n.recipient.toLowerCase().trim())
    );

    res.json({ ok: true, notifications: filteredNotifications.slice(0, limit) });
  } catch (error) {
    console.error("Error fetching notification history:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch history" });
  }
});

// Get notification statistics
app.get("/api/notification-stats", authMiddleware, async (req, res) => {
  try {
    const history = notificationHistory.getHistory().notifications;
    const user = req.user;

    const allowedEmails = new Set();
    if (user.email) allowedEmails.add(user.email.toLowerCase().trim());

    if (user.role === 'doctor' || user.role === 'asha') {
      const links = await PatientLink.find({ clinicianId: user._id }).populate("patientId");
      links.forEach(link => {
        if (link.patientId && link.patientId.email) {
          allowedEmails.add(link.patientId.email.toLowerCase().trim());
        }
      });
    }

    const filteredNotifications = history.filter(n =>
      n.recipient && allowedEmails.has(n.recipient.toLowerCase().trim())
    );

    const total = filteredNotifications.length;
    let successful = 0;
    let failed = 0;
    const riskLevelCounts = {};

    filteredNotifications.forEach(n => {
      if (n.status === 'success') successful++;
      if (n.status === 'failed') failed++;
      riskLevelCounts[n.riskLevel] = (riskLevelCounts[n.riskLevel] || 0) + 1;
    });

    const stats = {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
      riskLevelCounts
    };

    res.json({ ok: true, stats });
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch stats" });
  }
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 3. The API Endpoint where the wearable device POSTs sensor data
app.post("/api/steps/update", (req, res) => {
  const { 
    steps, heartRate, spo2, temperature, bloodPressure, glucose, gsr, hrv, latitude, longitude, source 
  } = req.body || {};
  if (steps !== undefined) {
    currentSteps = steps;
  }
  // 4. Construct the payload and Broadcast it via WebSockets!
  broadcastVitals({
    steps: currentSteps,
    vitals: {
      heartRate, spo2, temperature, bloodPressure, glucose, gsr, hrv,
      gps: latitude !== undefined ? { latitude, longitude, source: source || 'hardware' } : undefined
    }
  });
  res.json({ status: "success", steps: currentSteps, logged: true });
});


httpServer.listen(PORT, '0.0.0.0', () => {
  const os = require("os");
  const nets = os.networkInterfaces();
  let localIp = "localhost";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        localIp = net.address;
        break;
      }
    }
    if (localIp !== "localhost") break;
  }
  console.log(`🚀 SafeMom server running at http://localhost:${PORT}`);
  console.log(`📲 ESP32 should send data to: http://${localIp}:${PORT}/api/steps/update`);
});
