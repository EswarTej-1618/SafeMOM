const express = require("express");
const router = express.Router();
const ChatHistory = require("../models/ChatHistory");

// Middleware to protect routes (assuming simple token or checking body/query for now, 
// since the frontend passes user data. Ideally we'd use JWT middleware. 
// For this app, we will rely on a userId passed in the body or query for simplicity, 
// aligned with existing auth flow.)

// GET /api/chat/history/:userId
// Fetch chat history for a given user (mother)
router.get("/history/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await ChatHistory.find({ userId }).sort({ createdAt: -1 }).limit(50);
        res.json({ ok: true, history });
    } catch (error) {
        console.error("[Chat API] Get history error:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch chat history" });
    }
});

// POST /api/chat/save
// Save a new chat session or update an existing one
router.post("/save/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { id, title, mode, messages, vitalsResult, createdAt } = req.body;

        // We will use the provided `id` as `sessionId` to update existing sessions
        const updateData = {
            userId,
            sessionId: id,
            title,
            mode,
            messages,
            vitalsResult,
        };

        // Upsert by sessionId so we update the same chat session instead of creating duplicates
        const updatedSession = await ChatHistory.findOneAndUpdate(
            { sessionId: id, userId },
            { $set: updateData },
            { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ ok: true, session: updatedSession });
    } catch (error) {
        console.error("[Chat API] Save chat error:", error);
        res.status(500).json({ ok: false, error: "Failed to save chat history" });
    }
});

// DELETE /api/chat/session/:sessionId
// Delete a specific chat session
router.delete("/session/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await ChatHistory.findByIdAndDelete(sessionId);

        if (!result) {
            return res.status(404).json({ ok: false, error: "Session not found" });
        }
        res.json({ ok: true, message: "Session deleted successfully" });
    } catch (error) {
        console.error("[Chat API] Delete chat error:", error);
        res.status(500).json({ ok: false, error: "Failed to delete chat history" });
    }
});

// GET /api/chat/patient/:userId
// Fetch only HIGH RISK or RISKY chat events for a patient (used by clinicians)
router.get("/patient/:userId/risks", async (req, res) => {
    try {
        const { userId } = req.params;
        // Find sessions that contain at least one message with a riskLevel
        // that is 'high' or 'risky'
        const history = await ChatHistory.find({
            userId,
            "messages.riskLevel": { $in: ["high", "risky"] }
        }).sort({ createdAt: -1 });

        res.json({ ok: true, history });
    } catch (error) {
        console.error("[Chat API] Get patient risk history error:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch risk history for patient" });
    }
});

module.exports = router;
