const mongoose = require("mongoose");

const partnerLinkSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    motherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// One partner can only be linked to one mother (and vice versa)
partnerLinkSchema.index({ partnerId: 1 }, { unique: true });
partnerLinkSchema.index({ motherId: 1 }, { unique: true });

module.exports = mongoose.model("PartnerLink", partnerLinkSchema);
