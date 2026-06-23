const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    default: "Blockchain Technology"
  },

  courseCode: {
    type: String,
    default: "CSE4001"
  },

  semester: {
    type: String,
    default: "6"
  },

  examType: {
    type: String,
    default: "FAT"
  },

  facultyName: {
    type: String,
    default: "Dr Faculty"
  },

  duration: {
    type: String,
    default: "2 Hours"
  },

  downloadLimit: {
    type: Number,
    default: 1
  },

  title: {
    type: String,
    required: true
  },

  filename: {
    type: String,
    required: true
  },

  hash: {
    type: String,
    required: true
  },

  encryptedData: {
    type: String,
    required: true
  },

  examStartTime: {
    type: Date,
    default: Date.now
  },

  examEndTime: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 2 * 60 * 60 * 1000);
    }
  },

  blockchainStored: {
    type: Boolean,
    default: false
  },

  blockchainTxHash: {
    type: String
  },

  blockchainPaperId: {
    type: String
  },

  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Exam", ExamSchema);