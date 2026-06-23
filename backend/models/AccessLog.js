const mongoose = require("mongoose");

const AccessLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },

  title: {
    type: String
  },

  filename: {
    type: String
  },

  blockchainPaperId: {
    type: String
  },

  status: {
    type: String
  },

  ipAddress: {
    type: String
  },

  userAgent: {
    type: String
  },

  details: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("AccessLog", AccessLogSchema);