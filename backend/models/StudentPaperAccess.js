const mongoose = require("mongoose");

const StudentPaperAccessSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },

  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true
  },

  filename: {
    type: String,
    required: true
  },

  viewed: {
    type: Boolean,
    default: true
  },

  viewedAt: {
    type: Date,
    default: Date.now
  }
});

StudentPaperAccessSchema.index(
  {
    userId: 1,
    examId: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "StudentPaperAccess",
  StudentPaperAccessSchema
);