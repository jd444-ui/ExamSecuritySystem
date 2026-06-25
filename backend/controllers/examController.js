const crypto = require("crypto");
const fs = require("fs");

const Exam = require("../models/Exam");

let AccessLog = null;
let StudentPaperAccess = null;

try {
  AccessLog = require("../models/AccessLog");
} catch (error) {}

try {
  StudentPaperAccess = require("../models/StudentPaperAccess");
} catch (error) {}

const {
  storeHashOnBlockchain,
  verifyHashOnBlockchain
} = require("../blockchain");

const getUser = (req) => {
  return {
    id: req.user?.id || req.user?._id || req.user?.userId || "unknown",
    email: req.user?.email || req.user?.user?.email || "unknown",
    role: req.user?.role || req.user?.user?.role || "unknown"
  };
};

const createLog = async (req, action, filename, status) => {
  try {
    if (!AccessLog) return;

    const user = getUser(req);

    await AccessLog.create({
      userId: user.id,
      userEmail: user.email,
      email: user.email,
      role: user.role,
      action,
      filename,
      status,
      ipAddress: req.ip,
      ip: req.ip,
      timestamp: new Date()
    });
  } catch (error) {
    console.log("LOG ERROR:", error.message);
  }
};

const makeExamResponse = (exam) => {
  const obj = exam.toObject ? exam.toObject() : exam;

  return {
    ...obj,
    id: obj._id,
    _id: obj._id
  };
};

const uploadExam = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required"
      });
    }

    let fileBuffer;

    if (req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else if (req.file.path) {
      fileBuffer = fs.readFileSync(req.file.path);
    } else {
      return res.status(400).json({
        success: false,
        message: "Uploaded file could not be read"
      });
    }

    const filename =
      req.file.originalname ||
      req.file.filename ||
      `exam-paper-${Date.now()}.pdf`;

    const hash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const blockchainResult = await storeHashOnBlockchain(filename, hash);

    const exam = await Exam.create({
      title: req.body.title || req.body.subjectName || "Exam Paper",
      subjectName: req.body.subjectName || "Blockchain Technology",
      courseCode: req.body.courseCode || "CSE4001",
      semester: req.body.semester || "6",
      examType: req.body.examType || "FAT",
      facultyName: req.body.facultyName || "Dr. Faculty Name",
      duration: req.body.duration || "2 Hours",
      downloadLimit: Number(req.body.downloadLimit || 1),
      filename,
      hash,
      encryptedData: fileBuffer.toString("base64"),
      examStartTime: req.body.examStartTime
        ? new Date(req.body.examStartTime)
        : new Date(),
      examEndTime: req.body.examEndTime
        ? new Date(req.body.examEndTime)
        : new Date(Date.now() + 2 * 60 * 60 * 1000),
      blockchainStored: blockchainResult.blockchainStored === true,
      blockchainTxHash: blockchainResult.transactionHash,
      blockchainPaperId: blockchainResult.paperId,
      uploadedAt: new Date()
    });

    await createLog(req, "UPLOAD", filename, "SUCCESS");

    return res.status(201).json({
      success: true,
      message: "Exam paper uploaded successfully",
      exam: makeExamResponse(exam)
    });
  } catch (error) {
    console.log("UPLOAD ERROR:", error);

    await createLog(
      req,
      "UPLOAD",
      req.file?.originalname || req.file?.filename || "-",
      "FAILED"
    );

    return res.status(500).json({
      success: false,
      message: error.message || "Upload failed"
    });
  }
};

const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find({})
      .sort({
        uploadedAt: -1,
        createdAt: -1,
        _id: -1
      })
      .lean();

    return res.json({
      success: true,
      count: exams.length,
      exams
    });
  } catch (error) {
    console.log("GET EXAMS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam papers"
    });
  }
};

const viewExamPdf = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam paper not found"
      });
    }

    const user = getUser(req);

    if (user.role === "student") {
      const now = new Date();

      if (exam.examStartTime && now < new Date(exam.examStartTime)) {
        return res.status(403).json({
          success: false,
          message: "Exam paper is not open yet"
        });
      }

      if (exam.examEndTime && now > new Date(exam.examEndTime)) {
        return res.status(403).json({
          success: false,
          message: "Exam time is over"
        });
      }

      if (StudentPaperAccess) {
        const alreadyViewed = await StudentPaperAccess.findOne({
          userId: user.id,
          examId: exam._id
        });

        if (alreadyViewed) {
          await createLog(req, "VIEW", exam.filename, "BLOCKED");

          return res.status(403).json({
            success: false,
            message: "You have already viewed this paper once"
          });
        }

        await StudentPaperAccess.create({
          userId: user.id,
          examId: exam._id,
          filename: exam.filename,
          viewed: true,
          viewedAt: new Date()
        });
      }
    }

    const pdfBuffer = Buffer.from(exam.encryptedData, "base64");

    await createLog(req, "VIEW", exam.filename, "SUCCESS");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${exam.filename || "exam-paper.pdf"}"`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.log("VIEW ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to view PDF"
    });
  }
};

const downloadExamPdf = async (req, res) => {
  try {
    const user = getUser(req);

    if (user.role === "student") {
      return res.status(403).json({
        success: false,
        message: "Student download is disabled"
      });
    }

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam paper not found"
      });
    }

    const pdfBuffer = Buffer.from(exam.encryptedData, "base64");

    await createLog(req, "DOWNLOAD", exam.filename, "SUCCESS");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exam.filename || "exam-paper.pdf"}"`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.log("DOWNLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Download failed"
    });
  }
};

const verifyPaper = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required"
      });
    }

    let fileBuffer;

    if (req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else {
      fileBuffer = fs.readFileSync(req.file.path);
    }

    const hash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const exam = await Exam.findOne({ hash }).lean();

    if (!exam) {
      return res.json({
        success: true,
        valid: false,
        message: "PDF is not matching any uploaded exam paper",
        hash
      });
    }

    let blockchainValid = false;

    try {
      if (exam.blockchainPaperId) {
        blockchainValid = await verifyHashOnBlockchain(
          exam.blockchainPaperId,
          hash
        );
      }
    } catch (error) {
      blockchainValid = false;
    }

    return res.json({
      success: true,
      valid: true,
      blockchainValid,
      message: "PDF hash matched with uploaded exam paper",
      hash,
      exam
    });
  } catch (error) {
    console.log("VERIFY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed"
    });
  }
};

const getAccessLogs = async (req, res) => {
  try {
    if (!AccessLog) {
      return res.json({
        success: true,
        logs: []
      });
    }

    const logs = await AccessLog.find({})
      .sort({
        createdAt: -1,
        timestamp: -1,
        _id: -1
      })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      logs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch logs"
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments();

    let totalLogs = 0;
    let uploadSuccess = 0;
    let views = 0;
    let downloads = 0;

    if (AccessLog) {
      totalLogs = await AccessLog.countDocuments();
      uploadSuccess = await AccessLog.countDocuments({
        action: "UPLOAD",
        status: "SUCCESS"
      });
      views = await AccessLog.countDocuments({
        action: "VIEW",
        status: "SUCCESS"
      });
      downloads = await AccessLog.countDocuments({
        action: "DOWNLOAD",
        status: "SUCCESS"
      });
    }

    return res.json({
      success: true,
      analytics: {
        totalExams,
        totalLogs,
        uploadSuccess,
        adminViews: views,
        adminDownloads: downloads
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics"
    });
  }
};

module.exports = {
  uploadExam,
  getAllExams,
  getExams: getAllExams,
  getExamPapers: getAllExams,
  viewExamPdf,
  viewPdf: viewExamPdf,
  downloadExamPdf,
  downloadPdf: downloadExamPdf,
  verifyPaper,
  verifyExam: verifyPaper,
  getAccessLogs,
  getLogs: getAccessLogs,
  getAnalytics,
  analytics: getAnalytics
};