const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/all", auth, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const collectionNames = [
      "exams",
      "exampapers",
      "examPapers",
      "exam_papers",
      "papers"
    ];

    let exams = [];

    for (const collectionName of collectionNames) {
      const exists = await db
        .listCollections({ name: collectionName })
        .hasNext();

      if (exists) {
        const docs = await db
          .collection(collectionName)
          .find({})
          .sort({ uploadedAt: -1, createdAt: -1, _id: -1 })
          .toArray();

        exams = exams.concat(docs);
      }
    }

    exams = exams.filter((exam) => {
      return (
        exam.filename ||
        exam.hash ||
        exam.blockchainTxHash ||
        exam.encryptedData ||
        exam.subjectName ||
        exam.title
      );
    });

    res.json({
      success: true,
      count: exams.length,
      exams
    });
  } catch (error) {
    console.log("DIRECT EXAM FETCH ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch exam papers",
      error: error.message
    });
  }
});

module.exports = router;