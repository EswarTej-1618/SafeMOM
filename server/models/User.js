const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["mother", "doctor", "asha", "partner"],
      required: true,
    },

    // Profile avatar (base64 data-URL, max ~2 MB recommended)
    avatar: { type: String, default: null },

    // Mother-specific fields
    age: { type: Number },
    gestationWeek: { type: Number }, // The initial input value at signup
    pregnancyStartDate: { type: Date }, // Computes current weeks pregnant
    bloodGroup: { type: String },
    pregnancyNumber: { type: Number },
    chronicConditions: [{ type: String }],
    otherCondition: { type: String },
    onMedication: { type: Boolean, default: false },
    medicationNames: { type: String },
    vitals: {
      weightKg: { type: Number },
      bloodPressureSystolic: { type: Number },
      bloodPressureDiastolic: { type: Number },
      hemoglobin: { type: Number },
      bloodSugarMgDl: { type: Number },
      heartRateBpm: { type: Number },
      spo2Percent: { type: Number },
    },

    // Calendar & Doctor visits
    appointments: [
      {
        date: { type: Date, required: true },
        purpose: { type: String, required: true },
        status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },

    // Password reset
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

// Initialize pregnancyStartDate or simply hash password before saving
userSchema.pre("save", async function () {
  // 1) Initialize pregnancyStartDate once, based on their initial gestationWeek
  //    (if they provided one and it's not set yet).
  if (this.role === "mother" && this.gestationWeek != null && !this.pregnancyStartDate) {
    // Current time minus (gestationWeek * 7 days in ms)
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    this.pregnancyStartDate = new Date(Date.now() - this.gestationWeek * msInWeek);
  }

  // 2) Hash password
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Return user object without sensitive fields and with dynamically calculated gestation
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  // Dynamically calculate current gestation week if it's a mother
  if (this.role === "mother" && this.pregnancyStartDate) {
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const elapsedWeeks = Math.floor((Date.now() - new Date(this.pregnancyStartDate).getTime()) / msInWeek);
    // Cap gestation week at 40
    obj.gestationWeek = Math.min(40, elapsedWeeks);
  }

  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
