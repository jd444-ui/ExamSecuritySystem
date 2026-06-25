const express = require("express");
const multer = require("multer");

const auth = require("../middleware/auth");

const {
  uploadExam,
  getAllExams,
  viewExamPdf,
  downloadExamPdf,
  verifyExamPdf,
  getLogs,
  getAnalytics
} = require("../controllers/examController");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  }
});

router.get("/", auth, getAllExams);
router.get("/all", auth, getAllExams);
router.get("/list", auth, getAllExams);

router.get("/logs", auth, getLogs);
router.get("/analytics", auth, getAnalytics);

router.post("/upload", auth, upload.single("file"), uploadExam);
router.post("/verify", auth, upload.single("file"), verifyExamPdf);

router.get("/view/:id", auth, viewExamPdf);
router.get("/access/:id", auth, viewExamPdf);
router.get("/download/:id", auth, downloadExamPdf);

module.exports = router;