const express = require("express");
const router = express.Router();
const User = require("../models/User");
const PatientLink = require("../models/PatientLink");
const ProfileView = require("../models/ProfileView");
const { authMiddleware } = require("../middleware/auth");

// POST /api/patient/link
// Link a mother to a clinician (Doctor or Asha) via Email and Name
router.post("/link", async (req, res) => {
    try {
        const { clinicianId, email, name } = req.body;

        if (!clinicianId || !email || !name) {
            return res.status(400).json({ ok: false, error: "Clinician ID, Email, and Name are required" });
        }

        // Find the clinician (optional validation)
        const clinician = await User.findById(clinicianId);
        if (!clinician || (clinician.role !== "doctor" && clinician.role !== "asha")) {
            return res.status(403).json({ ok: false, error: "Invalid clinician" });
        }

        // Find the mother
        // We match by email as it's the unique identifier.
        const mother = await User.findOne({
            email: email.toLowerCase().trim(),
            role: "mother"
        });

        if (!mother) {
            return res.status(404).json({ ok: false, error: "Mother not found with the provided Email" });
        }

        // Check if already linked
        const existingLink = await PatientLink.findOne({
            clinicianId,
            patientId: mother._id
        });

        if (existingLink) {
            return res.status(400).json({ ok: false, error: "Patient is already linked to you" });
        }

        // Create link
        const newLink = new PatientLink({
            clinicianId,
            patientId: mother._id
        });

        await newLink.save();

        res.json({ ok: true, message: "Patient linked successfully", patient: mother.toSafeObject() });

    } catch (error) {
        console.error("[Patient API] Link error:", error);
        res.status(500).json({ ok: false, error: "Failed to link patient" });
    }
});

// GET /api/patient/linked/:clinicianId
// Get all linked mothers for a given clinician
router.get("/linked/:clinicianId", async (req, res) => {
    try {
        const { clinicianId } = req.params;

        const links = await PatientLink.find({ clinicianId }).populate("patientId", "-password");

        // Format the response to return the user objects safely, which dynamically
        // calculates their real-time gestationWeek
        const patients = links.map(link => {
            if (link.patientId && typeof link.patientId.toSafeObject === 'function') {
                return link.patientId.toSafeObject();
            }
            return link.patientId;
        });

        res.json({ ok: true, patients });

    } catch (error) {
        console.error("[Patient API] Get linked patients error:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch linked patients" });
    }
});

// POST /api/patient/:patientId/appointments
// Schedule a new visit for a patient
router.post("/:patientId/appointments", async (req, res) => {
    try {
        const { patientId } = req.params;
        const { date, purpose } = req.body;

        if (!date || !purpose) {
            return res.status(400).json({ ok: false, error: "Date and purpose are required" });
        }

        const mother = await User.findOne({ _id: patientId, role: "mother" });
        if (!mother) {
            return res.status(404).json({ ok: false, error: "Mother not found" });
        }

        mother.appointments.push({
            date: new Date(date),
            purpose
        });

        await mother.save();

        res.json({ ok: true, message: "Appointment scheduled successfully", appointment: mother.appointments[mother.appointments.length - 1] });
    } catch (error) {
        console.error("[Patient API] Schedule appointment error:", error);
        res.status(500).json({ ok: false, error: "Failed to schedule appointment" });
    }
});

// POST /api/patient/:id/view
// Record that a clinician or partner viewed a mother's profile
router.post("/:id/view", authMiddleware, async (req, res) => {
    try {
        const { id: motherId } = req.params;
        const viewer = req.user;

        // Don't record if the mother views her own profile
        if (viewer.role === "mother" && viewer._id.toString() === motherId) {
            return res.json({ ok: true, ignored: true });
        }

        // Validate viewer is allowed to view (must be an authorized role)
        if (!["doctor", "asha", "partner"].includes(viewer.role)) {
            return res.status(403).json({ ok: false, error: "Unauthorized role" });
        }

        const newView = new ProfileView({
            motherId,
            viewerId: viewer._id,
            viewerName: viewer.name,
            viewerAvatar: viewer.avatar,
            viewerRole: viewer.role,
        });

        await newView.save();
        res.json({ ok: true });
    } catch (error) {
        console.error("[Patient API] Record view error:", error);
        res.status(500).json({ ok: false, error: "Failed to record profile view" });
    }
});

// GET /api/patient/profile-views
// Fetch the authenticated mother's profile views
router.get("/profile-views", authMiddleware, async (req, res) => {
    try {
        const mother = req.user;
        
        if (mother.role !== "mother") {
            return res.status(403).json({ ok: false, error: "Only mothers can view their profile views" });
        }

        // Fetch views sorted by newest first, limited to last 100 to ensure we have enough buffer for deduplication
        const views = await ProfileView.find({ motherId: mother._id })
            .sort({ viewedAt: -1 })
            .limit(100)
            .select("-__v");

        // Deduplicate to show only the most recent view per person
        const uniqueViews = [];
        const seenViewers = new Set();

        for (const view of views) {
            const key = `${view.viewerId}-${view.viewerRole}`;
            if (!seenViewers.has(key)) {
                seenViewers.add(key);
                uniqueViews.push(view);
            }
        }

        res.json({ ok: true, views: uniqueViews.slice(0, 50) });
    } catch (error) {
        console.error("[Patient API] Get views error:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch profile views" });
    }
});

// PUT /api/patient/:patientId/pregnancy-start-date
// Set the pregnancy start date for a mother (Doctor/Asha only)
router.put("/:patientId/pregnancy-start-date", authMiddleware, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { pregnancyStartDate } = req.body;
        const clinician = req.user;

        if (!["doctor", "asha"].includes(clinician.role)) {
            return res.status(403).json({ ok: false, error: "Only doctors or ASHAs can set pregnancy start dates" });
        }

        if (!pregnancyStartDate) {
            return res.status(400).json({ ok: false, error: "Pregnancy start date is required" });
        }

        const mother = await User.findOne({ _id: patientId, role: "mother" });
        if (!mother) {
            return res.status(404).json({ ok: false, error: "Mother not found" });
        }

        mother.pregnancyStartDate = new Date(pregnancyStartDate);
        
        // Optionally update gestationWeek initial field if needed, but toSafeObject recomputes it dynamically anyway
        // For consistency during registration logic:
        const msInWeek = 7 * 24 * 60 * 60 * 1000;
        mother.gestationWeek = Math.floor((Date.now() - mother.pregnancyStartDate.getTime()) / msInWeek);

        await mother.save();

        res.json({ 
            ok: true, 
            message: "Pregnancy start date updated successfully", 
            patient: mother.toSafeObject() 
        });
    } catch (error) {
        console.error("[Patient API] Update pregnancy start date error:", error);
        res.status(500).json({ ok: false, error: "Failed to update pregnancy start date" });
    }
});

// DELETE /api/patient/unlink
// Unlink a patient from a clinician (doctor only). Patient account remains intact.
router.delete("/unlink", authMiddleware, async (req, res) => {
    try {
        const { patientId } = req.body;
        const clinician = req.user;

        if (!["doctor", "asha"].includes(clinician.role)) {
            return res.status(403).json({ ok: false, error: "Only doctors or ASHAs can unlink patients" });
        }

        if (!patientId) {
            return res.status(400).json({ ok: false, error: "Patient ID is required" });
        }

        const result = await PatientLink.findOneAndDelete({
            clinicianId: clinician._id,
            patientId,
        });

        if (!result) {
            return res.status(404).json({ ok: false, error: "Link not found" });
        }

        res.json({ ok: true, message: "Patient unlinked successfully" });
    } catch (error) {
        console.error("[Patient API] Unlink error:", error);
        res.status(500).json({ ok: false, error: "Failed to unlink patient" });
    }
});

module.exports = router;
