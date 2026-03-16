const express = require("express");
const User = require("../models/User");
const PartnerLink = require("../models/PartnerLink");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ─── MOTHER: Link a partner by their registered email ─────────────────────────
// POST /api/partner/link
// Mother must be authenticated, finds partner by email, creates PartnerLink
router.post("/link", authMiddleware, async (req, res) => {
  try {
    const mother = req.user;
    if (mother.role !== "mother") {
      return res.status(403).json({ ok: false, error: "Only mothers can link a partner" });
    }

    const { partnerEmail } = req.body;
    if (!partnerEmail) {
      return res.status(400).json({ ok: false, error: "Partner email is required" });
    }

    // Find the partner account
    const partner = await User.findOne({
      email: partnerEmail.toLowerCase().trim(),
      role: "partner",
    });
    if (!partner) {
      return res.status(404).json({
        ok: false,
        error: "No partner account found with this email. Please ask your partner to create a Partner account first.",
      });
    }

    // Check if mother already has a partner linked
    const existingLink = await PartnerLink.findOne({ motherId: mother._id });
    if (existingLink) {
      return res.status(409).json({ ok: false, error: "You already have a partner linked. Remove the current partner first." });
    }

    // Check if this partner is already linked to someone else
    const partnerAlreadyLinked = await PartnerLink.findOne({ partnerId: partner._id });
    if (partnerAlreadyLinked) {
      return res.status(409).json({ ok: false, error: "This partner account is already linked to another mother." });
    }

    const link = await PartnerLink.create({
      partnerId: partner._id,
      motherId: mother._id,
    });

    res.json({
      ok: true,
      message: `${partner.name} has been linked as your partner.`,
      partner: { id: partner._id, name: partner.name, email: partner.email, avatar: partner.avatar },
    });
  } catch (err) {
    console.error("[Partner] Link error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─── MOTHER: Remove the partner link ─────────────────────────────────────────
// DELETE /api/partner/remove
router.delete("/remove", authMiddleware, async (req, res) => {
  try {
    const mother = req.user;
    if (mother.role !== "mother") {
      return res.status(403).json({ ok: false, error: "Only mothers can remove a partner link" });
    }

    const deleted = await PartnerLink.findOneAndDelete({ motherId: mother._id });
    if (!deleted) {
      return res.status(404).json({ ok: false, error: "No partner link found" });
    }

    res.json({ ok: true, message: "Partner link removed." });
  } catch (err) {
    console.error("[Partner] Remove error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─── MOTHER: Get status of partner link ──────────────────────────────────────
// GET /api/partner/status
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const mother = req.user;
    if (mother.role !== "mother") {
      return res.status(403).json({ ok: false, error: "Only mothers can check partner status" });
    }

    const link = await PartnerLink.findOne({ motherId: mother._id }).populate("partnerId", "name email avatar");
    if (!link) {
      return res.json({ ok: true, linked: false, partner: null });
    }

    const p = link.partnerId;
    res.json({
      ok: true,
      linked: true,
      partner: { id: p._id, name: p.name, email: p.email, avatar: p.avatar },
    });
  } catch (err) {
    console.error("[Partner] Status error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─── PARTNER: Get the linked mother's full profile (read-only) ────────────────
// GET /api/partner/mother-data
router.get("/mother-data", authMiddleware, async (req, res) => {
  try {
    const partner = req.user;
    if (partner.role !== "partner") {
      return res.status(403).json({ ok: false, error: "Only partners can access this endpoint" });
    }

    const link = await PartnerLink.findOne({ partnerId: partner._id }).populate("motherId");
    if (!link || !link.motherId) {
      return res.json({ ok: true, linked: false, mother: null });
    }

    const mother = link.motherId;
    res.json({
      ok: true,
      linked: true,
      mother: mother.toSafeObject(),
    });
  } catch (err) {
    console.error("[Partner] Mother data error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─── PARTNER: Get the linked mother's full AI chat history (read-only) ─────────
// GET /api/partner/chat-history
router.get("/chat-history", authMiddleware, async (req, res) => {
  try {
    const partner = req.user;
    if (partner.role !== "partner") {
      return res.status(403).json({ ok: false, error: "Only partners can access this endpoint" });
    }

    const link = await PartnerLink.findOne({ partnerId: partner._id });
    if (!link) {
      return res.json({ ok: true, linked: false, history: [] });
    }

    const ChatHistory = require("../models/ChatHistory");
    const history = await ChatHistory.find({ userId: link.motherId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ ok: true, linked: true, history });
  } catch (err) {
    console.error("[Partner] Chat history error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;

