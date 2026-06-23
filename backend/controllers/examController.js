const fs = require("fs");
const path = require("path");

const {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees
} = require("pdf-lib");

const Exam = require("../models/Exam");
const AccessLog = require("../models/AccessLog");
const User = require("../models/User");
const StudentPaperAccess = require("../models/StudentPaperAccess");

const generateHash = require("../utils/hash");
const { encrypt } = require("../utils/encryption");

const {
  storeHashOnBlockchain,
  verifyHashOnBlockchain,
  getPaperFromBlockchain
} = require("../blockchain");

const STUDENT_VIEW_LIMIT = 1;

// ===============================
// SAVE ACCESS LOG
// ===============================
const saveAccessLog = async (req, data) => {
  try {
    await AccessLog.create({
      action: data.action,
      title: data.title || "",
      filename: data.filename || "",
      blockchainPaperId: data.blockchainPaperId || "",
      status: data.status || "",
      userId: req.user ? String(req.user.id) : "",
      userRole: req.user ? req.user.role : "",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
      details: data.details || ""
    });
  } catch (error) {
    console.log("ACCESS LOG ERROR:", error.message);
  }
};

// ===============================
// EXAM STATUS CHECK
// ===============================
const getExamStatus = (exam) => {
  const now = new Date();

  if (!exam.examStartTime || !exam.examEndTime) {
    return "UNKNOWN";
  }

  const startTime = new Date(exam.examStartTime);
  const endTime = new Date(exam.examEndTime);

  if (now < startTime) {
    return "LOCKED";
  }

  if (now > endTime) {
    return "CLOSED";
  }

  return "OPEN";
};

// ===============================
// CREATE WATERMARKED PDF
// ===============================
const createWatermarkedPdf = async (filePath, req, exam, actionName) => {
  const existingPdfBytes = fs.readFileSync(filePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const pages = pdfDoc.getPages();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const userEmail = req.user.email || "unknown-user";
  const userRole = req.user.role || "unknown-role";
  const blockchainPaperId = exam.blockchainPaperId || "N/A";
  const accessTime = new Date().toLocaleString();
  const ipAddress = req.ip || "unknown-ip";

  const footerText =
    `User: ${userEmail} | Role: ${userRole} | Action: ${actionName} | Time: ${accessTime} | IP: ${ipAddress} | Blockchain ID: ${blockchainPaperId}`;

  pages.forEach((page) => {
    const { width, height } = page.getSize();

    page.drawText("CONFIDENTIAL - STUDENT COPY", {
      x: 60,
      y: height / 2,
      size: 36,
      font: boldFont,
      color: rgb(0.9, 0.1, 0.1),
      opacity: 0.18,
      rotate: degrees(-35)
    });

    page.drawText("Blockchain Exam Paper Security System", {
      x: 40,
      y: height - 35,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
      opacity: 0.8
    });

    page.drawRectangle({
      x: 25,
      y: 20,
      width: width - 50,
      height: 45,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.9
    });

    page.drawText(footerText, {
      x: 35,
      y: 43,
      size: 7,
      font: font,
      color: rgb(0, 0, 0)
    });

    page.drawText(
      "This PDF copy is traceable. Unauthorized sharing is prohibited.",
      {
        x: 35,
        y: 28,
        size: 7,
        font: boldFont,
        color: rgb(0.8, 0, 0)
      }
    );
  });

  const watermarkedPdfBytes = await pdfDoc.save();

  return Buffer.from(watermarkedPdfBytes);
};

// ===============================
// UPLOAD EXAM PDF - ADMIN ONLY
// ===============================
const uploadExam = async (req, res) => {
  try {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({
        msg: "No file received."
      });
    }

    const examStartHeader = req.headers["x-exam-time"];
    const examEndHeader = req.headers["x-exam-end-time"];

    const subjectName =
      req.headers["x-subject-name"] || "Blockchain Technology";

    const courseCode =
      req.headers["x-course-code"] || "CSE4001";

    const semester =
      req.headers["x-semester"] || "6";

    const examType =
      req.headers["x-exam-type"] || "FAT";

    const facultyName =
      req.headers["x-faculty-name"] || "Dr Faculty";

    const duration =
      req.headers["x-duration"] || "2 Hours";

    const examStartTime = examStartHeader
      ? new Date(examStartHeader)
      : new Date();

    const examEndTime = examEndHeader
      ? new Date(examEndHeader)
      : new Date(Date.now() + 2 * 60 * 60 * 1000);

    if (isNaN(examStartTime.getTime())) {
      return res.status(400).json({
        msg: "Invalid exam start time."
      });
    }

    if (isNaN(examEndTime.getTime())) {
      return res.status(400).json({
        msg: "Invalid exam end time."
      });
    }

    if (examEndTime <= examStartTime) {
      return res.status(400).json({
        msg: "Exam end time must be after exam start time."
      });
    }

    const uploadDir = path.join(__dirname, "../../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {
        recursive: true
      });
    }

    const originalName = req.headers["x-filename"] || "exam-paper.pdf";

    const safeFileName =
      Date.now() + "-" + originalName.replace(/\s+/g, "-");

    const filePath = path.join(uploadDir, safeFileName);

    fs.writeFileSync(filePath, req.body);

    const fileBase64 = req.body.toString("base64");

    const hash = generateHash(fileBase64);

    const encryptedData = encrypt(fileBase64);

    const blockchainResult = await storeHashOnBlockchain(
      safeFileName,
      hash
    );

    const exam = new Exam({
      subjectName: subjectName,
      courseCode: courseCode,
      semester: semester,
      examType: examType,
      facultyName: facultyName,
      duration: duration,
      downloadLimit: 1,
      title: originalName,
      filename: safeFileName,
      hash: hash,
      encryptedData: encryptedData,
      examStartTime: examStartTime,
      examEndTime: examEndTime,
      blockchainStored: true,
      blockchainTxHash: blockchainResult.transactionHash,
      blockchainPaperId: blockchainResult.paperId
    });

    await exam.save();

    await saveAccessLog(req, {
      action: "UPLOAD",
      title: exam.subjectName,
      filename: exam.filename,
      blockchainPaperId: exam.blockchainPaperId,
      status: "SUCCESS",
      details: "Admin uploaded exam paper. Student can view only once. Student download disabled."
    });

    res.json({
      message: "Exam Uploaded and Stored on Blockchain Successfully",
      subjectName: exam.subjectName,
      courseCode: exam.courseCode,
      semester: exam.semester,
      examType: exam.examType,
      facultyName: exam.facultyName,
      duration: exam.duration,
      studentViewLimit: STUDENT_VIEW_LIMIT,
      studentDownload: "Disabled",
      filename: exam.filename,
      hash: exam.hash,
      examStartTime: exam.examStartTime,
      examEndTime: exam.examEndTime,
      blockchainStored: exam.blockchainStored,
      blockchainTxHash: exam.blockchainTxHash,
      blockchainPaperId: exam.blockchainPaperId
    });

  } catch (error) {
    console.log("UPLOAD ERROR:", error);

    res.status(500).json({
      msg: "Upload Error",
      error: error.message
    });
  }
};

// ===============================
// GET ALL EXAMS
// ===============================
const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .select("-encryptedData")
      .sort({ uploadedAt: -1 });

    res.json({
      message: "All Exams",
      count: exams.length,
      userRole: req.user.role,
      studentViewLimit: STUDENT_VIEW_LIMIT,
      studentDownload: "Disabled",
      exams: exams
    });

  } catch (error) {
    console.log("FETCH ERROR:", error);

    res.status(500).json({
      msg: "Fetch Error",
      error: error.message
    });
  }
};

// ===============================
// VERIFY EXAM PDF - ADMIN ONLY
// ===============================
const verifyExam = async (req, res) => {
  try {
    const paperId = req.params.paperId;

    if (!req.body || req.body.length === 0) {
      return res.status(400).json({
        msg: "No file received."
      });
    }

    const fileBase64 = req.body.toString("base64");

    const newHash = generateHash(fileBase64);

    const isVerified = await verifyHashOnBlockchain(
      paperId,
      newHash
    );

    const blockchainPaper = await getPaperFromBlockchain(paperId);

    const exam = await Exam.findOne({
      blockchainPaperId: paperId
    });

    await saveAccessLog(req, {
      action: "VERIFY",
      title: exam ? exam.subjectName : "Unknown",
      filename: exam ? exam.filename : "Unknown",
      blockchainPaperId: paperId,
      status: isVerified ? "ORIGINAL" : "TAMPERED",
      details: isVerified
        ? "Admin verified file matched blockchain hash"
        : "Admin verified file did not match blockchain hash"
    });

    res.json({
      message: isVerified
        ? "Paper Verified: Original Exam Paper"
        : "Paper Verification Failed: File May Be Tampered",
      verified: isVerified,
      uploadedHashFromBlockchain: blockchainPaper.paperHash,
      newlyGeneratedHash: newHash,
      blockchainPaper: blockchainPaper
    });

  } catch (error) {
    console.log("VERIFY ERROR:", error);

    res.status(500).json({
      msg: "Verify Error",
      error: error.message
    });
  }
};

// ===============================
// VIEW PDF
// ADMIN: UNLIMITED ORIGINAL VIEW
// STUDENT: WATERMARKED VIEW ONLY ONCE
// ===============================
const viewExamPdf = async (req, res) => {
  try {
    console.log("VIEW REQUEST RECEIVED");

    const filename = path.basename(req.params.filename);

    const exam = await Exam.findOne({
      filename: filename
    });

    if (!exam) {
      return res.status(404).json({
        msg: "Exam record not found"
      });
    }

    const userRole = req.user.role;
    const examStatus = getExamStatus(exam);

    await saveAccessLog(req, {
      action: userRole === "admin" ? "ADMIN_VIEW_REQUEST" : "STUDENT_VIEW_REQUEST",
      title: exam.subjectName || exam.title,
      filename: exam.filename,
      blockchainPaperId: exam.blockchainPaperId,
      status: "REQUESTED",
      details: "View button/API was clicked"
    });

    if (userRole === "student" && examStatus === "LOCKED") {
      await saveAccessLog(req, {
        action: "BLOCKED_STUDENT_VIEW_BEFORE_EXAM",
        title: exam.subjectName || exam.title,
        filename: exam.filename,
        blockchainPaperId: exam.blockchainPaperId,
        status: "BLOCKED",
        details: "Student tried to view paper before exam start time"
      });

      return res.status(403).json({
        msg: "Access Denied. Exam paper is locked before exam start time."
      });
    }

    if (userRole === "student" && examStatus === "CLOSED") {
      await saveAccessLog(req, {
        action: "BLOCKED_STUDENT_VIEW_AFTER_EXAM",
        title: exam.subjectName || exam.title,
        filename: exam.filename,
        blockchainPaperId: exam.blockchainPaperId,
        status: "CLOSED",
        details: "Student tried to view paper after exam end time"
      });

      return res.status(403).json({
        msg: "Access Denied. Exam paper is closed after exam end time."
      });
    }

    if (userRole === "student") {
      const alreadyViewed = await StudentPaperAccess.findOne({
        userId: String(req.user.id),
        examId: exam._id,
        viewed: true
      });

      console.log("STUDENT VIEW ONCE CHECK:", {
        studentId: String(req.user.id),
        examId: String(exam._id),
        filename: exam.filename,
        alreadyViewed: alreadyViewed ? true : false
      });

      if (alreadyViewed) {
        await saveAccessLog(req, {
          action: "BLOCKED_STUDENT_VIEW_LIMIT_REACHED",
          title: exam.subjectName || exam.title,
          filename: exam.filename,
          blockchainPaperId: exam.blockchainPaperId,
          status: "BLOCKED",
          details: "Student already viewed this exam paper once"
        });

        return res.status(403).json({
          msg: "View limit reached. You can view this exam paper only one time."
        });
      }
    }

    const filePath = path.join(__dirname, "../../uploads", filename);

    if (!fs.existsSync(filePath)) {
      await saveAccessLog(req, {
        action: "VIEW_FILE_NOT_FOUND",
        title: exam.subjectName || exam.title,
        filename: exam.filename,
        blockchainPaperId: exam.blockchainPaperId,
        status: "FAILED",
        details: "PDF file missing from uploads folder"
      });

      return res.status(404).json({
        msg: "PDF file not found"
      });
    }

    let pdfToSend = null;

    if (userRole === "student") {
      pdfToSend = await createWatermarkedPdf(
        filePath,
        req,
        exam,
        "VIEW"
      );

      try {
        await StudentPaperAccess.create({
          userId: String(req.user.id),
          examId: exam._id,
          filename: exam.filename,
          viewed: true,
          viewedAt: new Date()
        });
      } catch (accessError) {
        if (accessError.code === 11000) {
          await saveAccessLog(req, {
            action: "BLOCKED_STUDENT_VIEW_LIMIT_REACHED",
            title: exam.subjectName || exam.title,
            filename: exam.filename,
            blockchainPaperId: exam.blockchainPaperId,
            status: "BLOCKED",
            details: "Duplicate student view prevented by unique index"
          });

          return res.status(403).json({
            msg: "View limit reached. You can view this exam paper only one time."
          });
        }

        throw accessError;
      }
    }

    await saveAccessLog(req, {
      action: userRole === "admin" ? "ADMIN_VIEW" : "STUDENT_VIEW_WATERMARKED",
      title: exam.subjectName || exam.title,
      filename: exam.filename,
      blockchainPaperId: exam.blockchainPaperId,
      status: "SUCCESS",
      details:
        userRole === "admin"
          ? "Admin viewed original exam paper"
          : "Student viewed watermarked paper. View limit used."
    });

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/pdf");

    if (userRole === "student") {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="watermarked-${filename}"`
      );

      return res.send(pdfToSend);
    }

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename}"`
    );

    return res.sendFile(filePath);

  } catch (error) {
    console.log("VIEW PDF ERROR:", error);

    res.status(500).json({
      msg: "View PDF Error",
      error: error.message
    });
  }
};

// ===============================
// DOWNLOAD PDF
// ADMIN ONLY
// STUDENT DOWNLOAD BLOCKED
// ===============================
const downloadExamPdf = async (req, res) => {
  try {
    console.log("DOWNLOAD REQUEST RECEIVED");

    const filename = path.basename(req.params.filename);

    const exam = await Exam.findOne({
      filename: filename
    });

    if (!exam) {
      return res.status(404).json({
        msg: "Exam record not found"
      });
    }

    const userRole = req.user.role;

    if (userRole === "student") {
      await saveAccessLog(req, {
        action: "BLOCKED_STUDENT_DOWNLOAD_DISABLED",
        title: exam.subjectName || exam.title,
        filename: exam.filename,
        blockchainPaperId: exam.blockchainPaperId,
        status: "BLOCKED",
        details: "Student tried to download PDF. Student download is disabled."
      });

      return res.status(403).json({
        msg: "Student download is disabled. You can only view the exam paper once."
      });
    }

    const filePath = path.join(__dirname, "../../uploads", filename);

    if (!fs.existsSync(filePath)) {
      await saveAccessLog(req, {
        action: "DOWNLOAD_FILE_NOT_FOUND",
        title: exam.subjectName || exam.title,
        filename: exam.filename,
        blockchainPaperId: exam.blockchainPaperId,
        status: "FAILED",
        details: "PDF file missing from uploads folder"
      });

      return res.status(404).json({
        msg: "PDF file not found"
      });
    }

    await saveAccessLog(req, {
      action: "ADMIN_DOWNLOAD",
      title: exam.subjectName || exam.title,
      filename: exam.filename,
      blockchainPaperId: exam.blockchainPaperId,
      status: "SUCCESS",
      details: "Admin downloaded original exam paper"
    });

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.download(filePath, filename);

  } catch (error) {
    console.log("DOWNLOAD PDF ERROR:", error);

    res.status(500).json({
      msg: "Download PDF Error",
      error: error.message
    });
  }
};

// ===============================
// GET ACCESS LOGS
// ===============================
const getAccessLogs = async (req, res) => {
  try {
    const logs = await AccessLog.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      message: "Access Logs",
      count: logs.length,
      logs: logs
    });

  } catch (error) {
    console.log("LOG FETCH ERROR:", error);

    res.status(500).json({
      msg: "Log Fetch Error",
      error: error.message
    });
  }
};

// ===============================
// GET ANALYTICS
// ===============================
const getAnalytics = async (req, res) => {
  try {
    const exams = await Exam.find();

    let openExams = 0;
    let lockedExams = 0;
    let closedExams = 0;
    let unknownExams = 0;

    exams.forEach((exam) => {
      const status = getExamStatus(exam);

      if (status === "OPEN") {
        openExams++;
      } else if (status === "LOCKED") {
        lockedExams++;
      } else if (status === "CLOSED") {
        closedExams++;
      } else {
        unknownExams++;
      }
    });

    const baseAnalytics = {
      totalExams: exams.length,
      openExams: openExams,
      lockedExams: lockedExams,
      closedExams: closedExams,
      unknownExams: unknownExams
    };

    if (req.user.role === "student") {
      return res.json({
        message: "Student Analytics",
        role: "student",
        analytics: baseAnalytics
      });
    }

    const totalUsers = await User.countDocuments();

    const totalStudents = await User.countDocuments({
      role: "student"
    });

    const totalAdmins = await User.countDocuments({
      role: "admin"
    });

    const totalAccessLogs = await AccessLog.countDocuments();

    const uploadCount = await AccessLog.countDocuments({
      action: "UPLOAD"
    });

    const blockedAttempts = await AccessLog.countDocuments({
      action: {
        $regex: "BLOCKED"
      }
    });

    const tamperedAttempts = await AccessLog.countDocuments({
      status: "TAMPERED"
    });

    const totalViews = await AccessLog.countDocuments({
      action: {
        $regex: "VIEW"
      }
    });

    const totalDownloads = await AccessLog.countDocuments({
      action: {
        $regex: "DOWNLOAD"
      }
    });

    const studentViews = await AccessLog.countDocuments({
      action: "STUDENT_VIEW_WATERMARKED"
    });

    const studentDownloads = await AccessLog.countDocuments({
      action: "STUDENT_DOWNLOAD_WATERMARKED"
    });

    const adminViews = await AccessLog.countDocuments({
      action: "ADMIN_VIEW"
    });

    const adminDownloads = await AccessLog.countDocuments({
      action: "ADMIN_DOWNLOAD"
    });

    res.json({
      message: "Admin Analytics",
      role: "admin",
      analytics: {
        ...baseAnalytics,
        totalUsers: totalUsers,
        totalStudents: totalStudents,
        totalAdmins: totalAdmins,
        totalAccessLogs: totalAccessLogs,
        uploadCount: uploadCount,
        blockedAttempts: blockedAttempts,
        tamperedAttempts: tamperedAttempts,
        totalViews: totalViews,
        totalDownloads: totalDownloads,
        studentViews: studentViews,
        studentDownloads: studentDownloads,
        adminViews: adminViews,
        adminDownloads: adminDownloads
      }
    });

  } catch (error) {
    console.log("ANALYTICS ERROR:", error);

    res.status(500).json({
      msg: "Analytics Error",
      error: error.message
    });
  }
};

module.exports = {
  uploadExam,
  getAllExams,
  verifyExam,
  viewExamPdf,
  downloadExamPdf,
  getAccessLogs,
  getAnalytics
};