const express = require("express");
const multer = require("multer");

const router = express.Router();

const examController = require("../controllers/examController");
const authModule = require("../middleware/auth");

const protect =
  typeof authModule === "function"
    ? authModule
    : authModule.protect ||
      authModule.auth ||
      authModule.verifyToken ||
      authModule.authenticateToken;

if (typeof protect !== "function") {
  throw new Error("Auth middleware function not found in middleware/auth.js");
}

const getHandler = (...names) => {
  for (const name of names) {
    if (typeof examController[name] === "function") {
      return examController[name];
    }
  }

  return (req, res) => {
    res.status(500).json({
      success: false,
      message: `Controller function missing: ${names.join(" or ")}`
    });
  };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

const uploadExam = getHandler("uploadExam");
const getAllExams = getHandler("getAllExams", "getExams", "getExamPapers");
const viewExamPdf = getHandler("viewExamPdf", "viewPdf");
const downloadExamPdf = getHandler("downloadExamPdf", "downloadPdf");
const verifyPaper = getHandler("verifyPaper", "verifyExam");
const getAccessLogs = getHandler("getAccessLogs", "getLogs");
const getAnalytics = getHandler("getAnalytics", "analytics");

router.get("/", protect, getAllExams);
router.get("/all", protect, getAllExams);
router.get("/list", protect, getAllExams);
router.get("/logs", protect, getAccessLogs);
router.get("/analytics", protect, getAnalytics);

router.post("/upload", protect, upload.single("file"), uploadExam);
router.post("/verify", protect, upload.single("file"), verifyPaper);

router.get("/view/:id", protect, viewExamPdf);
router.get("/download/:id", protect, downloadExamPdf);

module.exports = router;