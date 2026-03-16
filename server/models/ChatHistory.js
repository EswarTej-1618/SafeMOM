const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        sessionId: { type: String, required: true, index: true },
        title: { type: String, required: true },
        mode: { type: String, enum: ["vitals", "chat"], default: "chat" },
        messages: [
            {
                id: { type: Number },
                text: { type: String, required: true },
                isBot: { type: Boolean, default: false },
                timestamp: { type: Date, default: Date.now },
                riskLevel: { type: String }, // 'risky', 'high', 'moderate', 'normal', or null
            },
        ],
        vitalsResult: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
