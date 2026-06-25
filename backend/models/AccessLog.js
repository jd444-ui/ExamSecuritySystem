const mongoose = require("mongoose");

const AccessLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: "unknown-user"
    },

    userEmail: {
      type: String,
      default: "unknown-user"
    },

    email: {
      type: String,
      default: "unknown-user"
    },

    role: {
      type: String,
      enum: ["admin", "student", "unknown"],
      default: "unknown"
    },

    action: {
      type: String,
      required: true
    },

    filename: {
      type: String,
      default: "-"
    },

    status: {
      type: String,
      default: "SUCCESS"
    },

    ipAddress: {
      type: String,
      default: "-"
    },

    ip: {
      type: String,
      default: "-"
    },

    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("AccessLog", AccessLogSchema);