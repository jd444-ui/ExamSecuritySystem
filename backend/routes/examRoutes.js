const express = require("express");

const router = express.Router();

const {
  uploadExam,
  getAllExams,
  verifyExam,
  viewExamPdf,
  downloadExamPdf,
  getAccessLogs,
  getAnalytics
} = require("../controllers/examController");

const {
  auth,
  allowRoles
} = require("../middleware/auth");

// Test route
router.get("/test", (req, res) => {
  res.json({
    message: "Exam route working"
  });
});

// Upload PDF - admin only
router.post(
  "/upload",
  auth,
  allowRoles("admin"),
  express.raw({
    type: "*/*",
    limit: "50mb"
  }),
  uploadExam
);

// Get exams - admin and student
router.get(
  "/all",
  auth,
  allowRoles("admin", "student"),
  getAllExams
);

// Get analytics - admin and student
router.get(
  "/analytics",
  auth,
  allowRoles("admin", "student"),
  getAnalytics
);

// Get logs - admin only
router.get(
  "/logs",
  auth,
  allowRoles("admin"),
  getAccessLogs
);

// Verify paper - admin only
router.post(
  "/verify/:paperId",
  auth,
  allowRoles("admin"),
  express.raw({
    type: "*/*",
    limit: "50mb"
  }),
  verifyExam
);

// View paper - admin and student
router.get(
  "/view/:filename",
  auth,
  allowRoles("admin", "student"),
  viewExamPdf
);

// Download paper - admin and student
router.get(
  "/download/:filename",
  auth,
  allowRoles("admin", "student"),
  downloadExamPdf
);

module.exports = router;