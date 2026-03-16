const mongoose = require("mongoose");

const patientLinkSchema = new mongoose.Schema(
    {
        clinicianId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Prevent duplicate links
patientLinkSchema.index({ clinicianId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model("PatientLink", patientLinkSchema);
