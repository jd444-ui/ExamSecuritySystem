const express = require("express");
const Exam = require("../models/Exam");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all uploaded exam papers directly from MongoDB
router.get("/all", auth, async (req, res) => {
  try {
    const exams = await Exam.find({})
      .sort({ uploadedAt: -1, createdAt: -1 });

    res.json({
      success: true,
      count: exams.length,
      exams: exams
    });
  } catch (error) {
    console.log("GET ALL EXAMS DIRECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch exam papers",
      error: error.message
    });
  }
});

module.exports = router;