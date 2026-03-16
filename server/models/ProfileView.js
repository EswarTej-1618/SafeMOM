const mongoose = require("mongoose");

const profileViewSchema = new mongoose.Schema({
    motherId: {
        type: String,
        required: true
    },
    viewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    viewerName: {
        type: String,
        required: true
    },
    viewerAvatar: {
        type: String
    },
    viewerRole: {
        type: String,
        enum: ["doctor", "asha", "partner"],
        required: true
    },
    viewedAt: {
        type: Date,
        default: Date.now
    }
});

// Create a compound index so we can retrieve a mother's views quickly, sorted by newest first
profileViewSchema.index({ motherId: 1, viewedAt: -1 });

module.exports = mongoose.model("ProfileView", profileViewSchema);
