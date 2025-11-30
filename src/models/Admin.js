const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { FRONTEND_HASH_PEPPER } = require("../utils/cryptoConfig");

const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["super-admin", "admin"],
      default: "super-admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

AdminSchema.statics.hashPassword = async function (plainPassword) {
  if (!plainPassword) {
    throw new Error("Password is required");
  }

  const sha = crypto
    .createHash("sha256")
    .update(plainPassword + FRONTEND_HASH_PEPPER)
    .digest("hex");

  const saltRounds = 12;
  const bcryptHash = await bcrypt.hash(sha, saltRounds);
  return bcryptHash;
};

AdminSchema.methods.verifyPassword = async function (plainPassword) {
  const sha = crypto
    .createHash("sha256")
    .update(plainPassword + FRONTEND_HASH_PEPPER)
    .digest("hex");

  return bcrypt.compare(sha, this.passwordHash);
};

module.exports = mongoose.model("Admin", AdminSchema);