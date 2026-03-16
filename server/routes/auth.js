const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const { authMiddleware, generateToken } = require("../middleware/auth");
const {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendLoginSuccessEmail,
    sendAccountDeletionEmail,
} = require("../utils/email");

const router = express.Router();

// ─── SIGNUP ──────────────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password, role, ...rest } = req.body;

        if (!name || !email || !password || !role) {
            return res
                .status(400)
                .json({ ok: false, error: "Name, email, password, and role are required" });
        }

        if (!["mother", "doctor", "asha", "partner"].includes(role)) {
            return res.status(400).json({ ok: false, error: "Invalid role" });
        }

        // Check if user already exists
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res
                .status(409)
                .json({ ok: false, error: "An account with this email already exists" });
        }

        // Generate verification token
        const emailVerificationToken = crypto.randomBytes(32).toString("hex");
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Build user data
        const userData = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role,
            emailVerificationToken,
            emailVerificationExpires,
        };

        // Mother-specific fields
        if (role === "mother") {
            if (rest.age) userData.age = Number(rest.age);
            if (rest.gestationWeek) userData.gestationWeek = Number(rest.gestationWeek);
            if (rest.bloodGroup) userData.bloodGroup = rest.bloodGroup;
            if (rest.pregnancyNumber) userData.pregnancyNumber = Number(rest.pregnancyNumber);
            if (rest.chronicConditions) userData.chronicConditions = rest.chronicConditions;
            if (rest.otherCondition) userData.otherCondition = rest.otherCondition;
            if (rest.onMedication !== undefined) userData.onMedication = rest.onMedication;
            if (rest.medicationNames) userData.medicationNames = rest.medicationNames;
        }

        const user = await User.create(userData);

        // Send verification email
        try {
            await sendVerificationEmail(user.email, emailVerificationToken);
        } catch (emailErr) {
            console.error("[Auth] Failed to send verification email:", emailErr.message);
        }

        // Generate JWT so user is logged in immediately
        const token = generateToken(user._id);

        res.status(201).json({
            ok: true,
            token,
            user: user.toSafeObject(),
            message: "Account created! Please check your email to verify your address.",
        });
    } catch (err) {
        console.error("[Auth] Signup error:", err);
        res.status(500).json({ ok: false, error: "Server error during signup" });
    }
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ ok: false, error: "Email and password are required" });
        }

        const query = { email: email.toLowerCase().trim() };
        // If role is specified, also match on role
        if (role && ["mother", "doctor", "asha", "partner"].includes(role)) {
            query.role = role;
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(401).json({ ok: false, error: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ ok: false, error: "Invalid email or password" });
        }

        const token = generateToken(user._id);

        // Send login success email asynchronously
        sendLoginSuccessEmail(user.email, user.name).catch((err) => {
            console.error("[Auth] Failed to send login email:", err.message);
        });

        res.json({
            ok: true,
            token,
            user: user.toSafeObject(),
            emailVerified: user.isEmailVerified,
        });
    } catch (err) {
        console.error("[Auth] Login error:", err);
        res.status(500).json({ ok: false, error: "Server error during login" });
    }
});

// ─── VERIFY EMAIL ────────────────────────────────────────────────────────────
router.get("/verify-email/:token", async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: new Date() },
        });

        if (!user) {
            return res
                .status(400)
                .json({ ok: false, error: "Invalid or expired verification link" });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        // Return a fresh JWT + user object so the frontend can auto-login
        // and redirect to the correct role-based dashboard
        const token = generateToken(user._id);
        res.json({ ok: true, message: "Email verified successfully!", token, user: user.toSafeObject() });
    } catch (err) {
        console.error("[Auth] Verify email error:", err);
        res.status(500).json({ ok: false, error: "Server error during verification" });
    }
});

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ ok: false, error: "Email is required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Always return success to avoid email enumeration
        if (!user) {
            console.log("[Auth] Forgot password: no user found for email:", email);
            return res.json({
                ok: true,
                message: "If an account exists with this email, a reset link has been sent.",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();
        console.log("[Auth] Password reset token saved for:", user.email);

        let emailSent = false;
        try {
            emailSent = await sendPasswordResetEmail(user.email, resetToken);
            if (emailSent === false) {
                // SMTP not configured
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
                console.warn("[Auth] SMTP not configured — password reset email NOT sent to:", user.email);
                console.warn("[Auth] ⚠️  Check SMTP_USER and SMTP_PASS in .env.local");
                console.warn(`[Auth] 🔗 DEBUG reset link: ${frontendUrl}/reset-password?token=${resetToken}`);
            } else {
                console.log("[Auth] Password reset email sent successfully to:", user.email);
            }
        } catch (emailErr) {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            console.error("[Auth] ❌ SMTP error — failed to send reset email to:", user.email);
            console.error("[Auth] SMTP error details:", emailErr.message);
            console.error(`[Auth] 🔗 DEBUG reset link (use this manually): ${frontendUrl}/reset-password?token=${resetToken}`);
        }

        res.json({
            ok: true,
            message: "If an account exists with this email, a reset link has been sent.",
        });
    } catch (err) {
        console.error("[Auth] Forgot password error:", err);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

// ─── TEST SMTP ───────────────────────────────────────────────────────────────
router.get("/test-smtp", async (req, res) => {
    const { getTransporter } = require("../utils/email");
    const transporter = getTransporter();
    if (!transporter) {
        return res.status(503).json({
            ok: false,
            error: "SMTP not configured. SMTP_USER and/or SMTP_PASS are missing in .env.local",
            smtpUser: process.env.SMTP_USER ? "set" : "MISSING",
            smtpPass: process.env.SMTP_PASS ? "set" : "MISSING",
        });
    }
    try {
        await transporter.verify();
        res.json({
            ok: true,
            message: "SMTP connection verified successfully!",
            smtpUser: process.env.SMTP_USER,
        });
    } catch (err) {
        res.status(500).json({
            ok: false,
            error: "SMTP verify failed: " + err.message,
            smtpUser: process.env.SMTP_USER ? "set" : "MISSING",
            smtpPass: process.env.SMTP_PASS ? "set" : "MISSING",
        });
    }
});

// ─── RESET PASSWORD ──────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res
                .status(400)
                .json({ ok: false, error: "Token and new password are required" });
        }

        if (password.length < 6) {
            return res
                .status(400)
                .json({ ok: false, error: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() },
        });

        if (!user) {
            return res
                .status(400)
                .json({ ok: false, error: "Invalid or expired reset link" });
        }

        user.password = password; // Will be hashed by pre-save hook
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        // Also verify email if not already
        user.isEmailVerified = true;
        await user.save();

        res.json({ ok: true, message: "Password reset successfully! You can now log in." });
    } catch (err) {
        console.error("[Auth] Reset password error:", err);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

// ─── GET CURRENT USER ────────────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
    res.json({ ok: true, user: req.user.toSafeObject() });
});

// ─── RESEND VERIFICATION EMAIL ──────────────────────────────────────────────
router.post("/resend-verification", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ ok: false, error: "User not found" });
        }

        if (user.isEmailVerified) {
            return res.json({ ok: true, message: "Email is already verified" });
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.emailVerificationToken = token;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        try {
            await sendVerificationEmail(user.email, token);
        } catch (emailErr) {
            console.error("[Auth] Failed to resend verification:", emailErr.message);
            return res.status(500).json({ ok: false, error: "Failed to send email" });
        }

        res.json({ ok: true, message: "Verification email resent!" });
    } catch (err) {
        console.error("[Auth] Resend verification error:", err);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

// ─── UPDATE CURRENT USER PROFILE ───────────────────────────────────────────────
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const updateData = { ...req.body };
        // Do not allow updating sensitive fields here
        delete updateData.password;
        delete updateData.email;
        delete updateData.role;
        delete updateData.isEmailVerified;
        delete updateData.emailVerificationToken;
        delete updateData.emailVerificationExpires;
        delete updateData.passwordResetToken;
        delete updateData.passwordResetExpires;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { returnDocument: "after", runValidators: true }
        );

        res.json({ ok: true, user: user.toSafeObject() });
    } catch (err) {
        console.error("[Auth] Update profile error:", err);
        res.status(500).json({ ok: false, error: "Failed to update profile" });
    }
});

// ─── CHANGE PASSWORD ────────────────────────────────────────────────────────
router.post("/change-password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ ok: false, error: "Current password and new password are required" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ ok: false, error: "New password must be at least 6 characters" });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) return res.status(404).json({ ok: false, error: "User not found" });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ ok: false, error: "Incorrect current password" });
        }

        user.password = newPassword; // pre-save hook will re-hash
        await user.save();

        res.json({ ok: true, message: "Password changed successfully!" });
    } catch (err) {
        console.error("[Auth] Change password error:", err);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

// ─── DELETE ACCOUNT ──────────────────────────────────────────────────────────
router.delete("/account", authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ ok: false, error: "Password is required to delete your account" });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) return res.status(404).json({ ok: false, error: "User not found" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ ok: false, error: "Incorrect password" });
        }

        // Capture details before deletion (we can't read from a deleted doc)
        const { email, name } = user;

        await User.findByIdAndDelete(req.user._id);
        console.log("[Auth] Account deleted for user:", email);

        // Send goodbye / confirmation email asynchronously
        sendAccountDeletionEmail(email, name).catch((err) => {
            console.error("[Auth] Failed to send deletion email:", err.message);
        });

        res.json({ ok: true, message: "Account deleted successfully" });
    } catch (err) {
        console.error("[Auth] Delete account error:", err);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

module.exports = router;
