import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function getLocalDateTimeValue(addMinutes = 0) {
  const date = new Date(Date.now() + addMinutes * 60000);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

function App() {
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("123456");

  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");

  const [uploadFile, setUploadFile] = useState(null);

  const [subjectName, setSubjectName] = useState("Blockchain Technology");
  const [courseCode, setCourseCode] = useState("CSE4001");
  const [semester, setSemester] = useState("6");
  const [examType, setExamType] = useState("FAT");
  const [facultyName, setFacultyName] = useState("Dr. Faculty Name");
  const [duration, setDuration] = useState("2 Hours");

  const [examStartTime, setExamStartTime] = useState(
    getLocalDateTimeValue(0)
  );

  const [examEndTime, setExamEndTime] = useState(
    getLocalDateTimeValue(120)
  );

  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyPaperId, setVerifyPaperId] = useState("");

  const [exams, setExams] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [message, setMessage] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  const authHeader = (authToken = token) => {
    return {
      Authorization: `Bearer ${authToken}`
    };
  };

  const copyToClipboard = async (text, label = "Value") => {
    try {
      if (!text) {
        setMessage(`${label} is empty`);
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setMessage(`${label} copied to clipboard`);
    } catch (error) {
      console.log("COPY ERROR:", error);
      setMessage("Clipboard copy failed");
    }
  };

  const getAllExams = async (authToken = token) => {
    try {
      if (!authToken) {
        return;
      }

      const res = await axios.get(`${API_URL}/exams/all`, {
        headers: authHeader(authToken)
      });

      setExams(res.data.exams || []);

    } catch (error) {
      console.log("GET EXAMS ERROR:", error);
      setMessage(error.response?.data?.msg || "Could not fetch exams");
    }
  };

  const getAccessLogs = async (authToken = token) => {
    try {
      if (!authToken) {
        return;
      }

      const res = await axios.get(`${API_URL}/exams/logs`, {
        headers: authHeader(authToken)
      });

      setLogs(res.data.logs || []);

    } catch (error) {
      console.log("GET LOGS ERROR:", error);
      setMessage(error.response?.data?.msg || "Could not fetch access logs");
    }
  };

  const getAnalytics = async (authToken = token) => {
    try {
      if (!authToken) {
        return;
      }

      const res = await axios.get(`${API_URL}/exams/analytics`, {
        headers: authHeader(authToken)
      });

      setAnalytics(res.data.analytics || null);

    } catch (error) {
      console.log("GET ANALYTICS ERROR:", error);
      setMessage(error.response?.data?.msg || "Could not fetch analytics");
    }
  };

  const refreshDashboard = async () => {
    await getAllExams();
    await getAnalytics();

    if (role === "admin") {
      await getAccessLogs();
    }

    setMessage("Dashboard refreshed");
  };

  const login = async () => {
    try {
      setMessage("Logging in...");

      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const loginToken = res.data.token;

      setToken(loginToken);
      setRole(res.data.role);
      setName(res.data.name);
      setMessage(`Login successful as ${res.data.role}`);

      await getAllExams(loginToken);
      await getAnalytics(loginToken);

      if (res.data.role === "admin") {
        await getAccessLogs(loginToken);
      }

    } catch (error) {
      console.log("LOGIN ERROR:", error);
      setMessage(error.response?.data?.msg || "Login failed");
    }
  };

  const logout = () => {
    setToken("");
    setRole("");
    setName("");
    setExams([]);
    setLogs([]);
    setAnalytics(null);
    setUploadResult(null);
    setVerifyResult(null);
    setMessage("Logged out");
  };

  const uploadExam = async () => {
    if (!uploadFile) {
      setMessage("Please choose a PDF file first");
      return;
    }

    if (
      !subjectName ||
      !courseCode ||
      !semester ||
      !examType ||
      !facultyName ||
      !duration
    ) {
      setMessage("Please fill all exam details");
      return;
    }

    if (!examStartTime) {
      setMessage("Please select exam start time");
      return;
    }

    if (!examEndTime) {
      setMessage("Please select exam end time");
      return;
    }

    const start = new Date(examStartTime);
    const end = new Date(examEndTime);

    if (end <= start) {
      setMessage("Exam end time must be after exam start time");
      return;
    }

    try {
      setMessage("Uploading exam paper...");

      const examStartISO = start.toISOString();
      const examEndISO = end.toISOString();

      const res = await axios.post(
        `${API_URL}/exams/upload`,
        uploadFile,
        {
          headers: {
            ...authHeader(),
            "Content-Type": uploadFile.type || "application/pdf",
            "x-filename": uploadFile.name,
            "x-exam-time": examStartISO,
            "x-exam-end-time": examEndISO,
            "x-subject-name": subjectName,
            "x-course-code": courseCode,
            "x-semester": semester,
            "x-exam-type": examType,
            "x-faculty-name": facultyName,
            "x-duration": duration,
            "x-download-limit": 1
          }
        }
      );

      setUploadResult(res.data);
      setMessage("Exam uploaded successfully");

      await getAllExams();
      await getAnalytics();

      if (role === "admin") {
        await getAccessLogs();
      }

    } catch (error) {
      console.log("UPLOAD FRONTEND ERROR:", error);

      setMessage(
        error.response?.data?.msg ||
        error.response?.data?.error ||
        "Upload failed. Check backend terminal."
      );
    }
  };

  const verifyExam = async () => {
    try {
      if (!verifyPaperId) {
        setMessage("Please enter blockchain paper ID");
        return;
      }

      if (!verifyFile) {
        setMessage("Please choose PDF file for verification");
        return;
      }

      setMessage("Verifying exam paper...");

      const res = await axios.post(
        `${API_URL}/exams/verify/${verifyPaperId}`,
        verifyFile,
        {
          headers: {
            ...authHeader(),
            "Content-Type": verifyFile.type || "application/pdf",
            "x-filename": verifyFile.name
          }
        }
      );

      setVerifyResult(res.data);
      setMessage("Verification completed");

      await getAllExams();
      await getAnalytics();

      if (role === "admin") {
        await getAccessLogs();
      }

    } catch (error) {
      console.log("VERIFY ERROR:", error);
      setMessage(error.response?.data?.msg || "Verification failed");
    }
  };

  const viewPdf = async (filename) => {
    try {
      setMessage("Opening PDF securely...");

      const res = await axios.get(
        `${API_URL}/exams/view/${encodeURIComponent(filename)}?t=${Date.now()}`,
        {
          headers: {
            ...authHeader(),
            "Cache-Control": "no-cache"
          },
          responseType: "blob"
        }
      );

      const pdfBlob = new Blob([res.data], {
        type: "application/pdf"
      });

      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      window.open(pdfUrl, "_blank");

      setMessage(
        role === "student"
          ? "PDF opened successfully. Student view limit is now used."
          : "PDF opened successfully"
      );

      setTimeout(() => {
        getAnalytics();

        if (role === "admin") {
          getAccessLogs();
        }
      }, 1000);

      setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl);
      }, 15000);

    } catch (error) {
      console.log("VIEW FRONTEND ERROR:", error);

      let errorMessage = "PDF view failed";

      if (error.response && error.response.data instanceof Blob) {
        const errorText = await error.response.data.text();

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.msg || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
      } else {
        errorMessage =
          error.response?.data?.msg ||
          error.response?.data?.error ||
          "PDF view failed";
      }

      setMessage(errorMessage);

      setTimeout(() => {
        getAnalytics();

        if (role === "admin") {
          getAccessLogs();
        }
      }, 1000);
    }
  };

  const downloadPdf = async (filename) => {
    try {
      if (role === "student") {
        setMessage("Student download is disabled. You can only view once.");
        return;
      }

      setMessage("Downloading PDF...");

      const res = await axios.get(
        `${API_URL}/exams/download/${encodeURIComponent(filename)}?t=${Date.now()}`,
        {
          headers: {
            ...authHeader(),
            "Cache-Control": "no-cache"
          },
          responseType: "blob"
        }
      );

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setMessage("Download successful");

      setTimeout(() => {
        getAnalytics();

        if (role === "admin") {
          getAccessLogs();
        }
      }, 1000);

    } catch (error) {
      console.log("DOWNLOAD FRONTEND ERROR:", error);

      let errorMessage = "Download failed";

      if (error.response && error.response.data instanceof Blob) {
        const errorText = await error.response.data.text();

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.msg || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
      } else {
        errorMessage =
          error.response?.data?.msg ||
          error.response?.data?.error ||
          "Download failed";
      }

      setMessage(errorMessage);

      setTimeout(() => {
        getAnalytics();

        if (role === "admin") {
          getAccessLogs();
        }
      }, 1000);
    }
  };

  const getExamStatus = (exam) => {
    if (!exam.examStartTime || !exam.examEndTime) {
      return "UNKNOWN";
    }

    const now = new Date();
    const start = new Date(exam.examStartTime);
    const end = new Date(exam.examEndTime);

    if (now < start) {
      return "LOCKED";
    }

    if (now > end) {
      return "CLOSED";
    }

    return "OPEN";
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return "Not set";
    }

    return new Date(dateValue).toLocaleString();
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Exam Paper Security System</h1>
          <p>Admin + Student + Blockchain + Analytics</p>
        </div>

        <div className="statusBox">
          <span>Status</span>
          <b>{token ? `Logged in as ${role}` : "Not Logged In"}</b>

          {token && (
            <button onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </header>

      {!token && (
        <main className="loginOnly">
          <section className="card loginBox">
            <h2>Login</h2>

            <p className="hint">
              Login as admin or student.
            </p>

            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={login}>
              Login
            </button>

            <div className="demoUsers">
              <p><b>Admin:</b> admin@test.com / 123456</p>
              <p><b>Student:</b> student@test.com / 123456</p>
            </div>
          </section>
        </main>
      )}

      {token && role === "admin" && (
        <main className="grid">
          <section className="card fullWidth">
            <h2>Admin Dashboard</h2>

            <p className="success">
              Welcome {name}. Admin can upload, view, download, verify, and copy blockchain data.
            </p>

            <button onClick={refreshDashboard}>
              Refresh Dashboard
            </button>
          </section>

          <AnalyticsCards analytics={analytics} role={role} />

          <section className="card">
            <h2>Upload Exam Paper</h2>

            <p className="hint">
              Student can view once only. Student download is disabled.
            </p>

            <label>Subject Name</label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />

            <label>Course Code</label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />

            <label>Semester</label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />

            <label>Exam Type</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              <option value="CAT">CAT</option>
              <option value="FAT">FAT</option>
              <option value="Mid Term">Mid Term</option>
              <option value="Final Exam">Final Exam</option>
              <option value="Lab Exam">Lab Exam</option>
            </select>

            <label>Faculty Name</label>
            <input
              type="text"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
            />

            <label>Duration</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />

            <label>Student View Limit</label>
            <input
              type="text"
              value="1 time"
              disabled
            />

            <label>Student Download</label>
            <input
              type="text"
              value="Disabled"
              disabled
            />

            <label>Select PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />

            <label>Exam Start Time</label>
            <input
              type="datetime-local"
              value={examStartTime}
              onChange={(e) => setExamStartTime(e.target.value)}
            />

            <label>Exam End Time</label>
            <input
              type="datetime-local"
              value={examEndTime}
              onChange={(e) => setExamEndTime(e.target.value)}
            />

            <button onClick={uploadExam}>
              Upload to Blockchain
            </button>

            {uploadResult && (
              <div className="resultBox">
                <h3>Upload Result</h3>
                <p><b>Subject:</b> {uploadResult.subjectName}</p>
                <p><b>Course Code:</b> {uploadResult.courseCode}</p>
                <p><b>Semester:</b> {uploadResult.semester}</p>
                <p><b>Exam Type:</b> {uploadResult.examType}</p>
                <p><b>Faculty:</b> {uploadResult.facultyName}</p>
                <p><b>Duration:</b> {uploadResult.duration}</p>
                <p><b>Student View Limit:</b> 1 time</p>
                <p><b>Student Download:</b> Disabled</p>
                <p><b>File:</b> {uploadResult.filename}</p>

                <p>
                  <b>Blockchain ID:</b> {uploadResult.blockchainPaperId}
                  <button onClick={() => copyToClipboard(uploadResult.blockchainPaperId, "Blockchain ID")}>
                    Copy
                  </button>
                </p>

                <p><b>Start:</b> {formatDateTime(uploadResult.examStartTime)}</p>
                <p><b>End:</b> {formatDateTime(uploadResult.examEndTime)}</p>

                <p>
                  <b>Hash:</b> {uploadResult.hash}
                  <button onClick={() => copyToClipboard(uploadResult.hash, "Hash")}>
                    Copy
                  </button>
                </p>

                <p>
                  <b>Tx Hash:</b> {uploadResult.blockchainTxHash}
                  <button onClick={() => copyToClipboard(uploadResult.blockchainTxHash, "Transaction Hash")}>
                    Copy
                  </button>
                </p>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Verify Leaked/Tampered Paper</h2>

            <p className="hint">
              Check if leaked PDF matches original blockchain hash.
            </p>

            <label>Blockchain Paper ID</label>
            <input
              type="text"
              placeholder="Example: 1"
              value={verifyPaperId}
              onChange={(e) => setVerifyPaperId(e.target.value)}
            />

            <button onClick={() => copyToClipboard(verifyPaperId, "Blockchain Paper ID")}>
              Copy Paper ID
            </button>

            <label>Select PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setVerifyFile(e.target.files[0])}
            />

            <button onClick={verifyExam}>
              Verify Paper
            </button>

            {verifyResult && (
              <div
                className={
                  verifyResult.verified ? "verifiedBox" : "tamperedBox"
                }
              >
                <h3>{verifyResult.message}</h3>
                <p><b>Verified:</b> {String(verifyResult.verified)}</p>

                <p>
                  <b>Blockchain Hash:</b> {verifyResult.uploadedHashFromBlockchain}
                  <button onClick={() => copyToClipboard(verifyResult.uploadedHashFromBlockchain, "Blockchain Hash")}>
                    Copy
                  </button>
                </p>

                <p>
                  <b>New File Hash:</b> {verifyResult.newlyGeneratedHash}
                  <button onClick={() => copyToClipboard(verifyResult.newlyGeneratedHash, "New File Hash")}>
                    Copy
                  </button>
                </p>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Admin Controls</h2>

            <p className="hint">
              Refresh exams, logs, and analytics.
            </p>

            <button onClick={refreshDashboard}>
              Refresh All
            </button>
          </section>

          <ExamTable
            exams={exams}
            role={role}
            viewPdf={viewPdf}
            downloadPdf={downloadPdf}
            copyToClipboard={copyToClipboard}
            formatDateTime={formatDateTime}
            getExamStatus={getExamStatus}
          />

          <LogsTable
            logs={logs}
            formatDateTime={formatDateTime}
          />
        </main>
      )}

      {token && role === "student" && (
        <main className="grid">
          <section className="card fullWidth">
            <h2>Student Dashboard</h2>

            <p className="success">
              Welcome {name}. You can view the exam paper only once during exam time. Download is disabled.
            </p>

            <button onClick={refreshDashboard}>
              Refresh Dashboard
            </button>
          </section>

          <AnalyticsCards analytics={analytics} role={role} />

          <ExamTable
            exams={exams}
            role={role}
            viewPdf={viewPdf}
            downloadPdf={downloadPdf}
            copyToClipboard={copyToClipboard}
            formatDateTime={formatDateTime}
            getExamStatus={getExamStatus}
          />
        </main>
      )}

      {message && (
        <div className="toast">
          {message}
        </div>
      )}
    </div>
  );
}

function AnalyticsCards({ analytics, role }) {
  if (!analytics) {
    return (
      <section className="card fullWidth">
        <h2>Analytics</h2>
        <p className="hint">Login and refresh to see analytics.</p>
      </section>
    );
  }

  if (role === "student") {
    return (
      <section className="card fullWidth">
        <h2>Student Exam Status</h2>

        <div className="analyticsGrid">
          <div className="analyticsCard">
            <span>Total Exams</span>
            <b>{analytics.totalExams}</b>
          </div>

          <div className="analyticsCard greenCard">
            <span>Open Exams</span>
            <b>{analytics.openExams}</b>
          </div>

          <div className="analyticsCard redCard">
            <span>Locked Exams</span>
            <b>{analytics.lockedExams}</b>
          </div>

          <div className="analyticsCard greyCard">
            <span>Closed Exams</span>
            <b>{analytics.closedExams}</b>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card fullWidth">
      <h2>Admin Security Analytics</h2>

      <div className="analyticsGrid">
        <div className="analyticsCard">
          <span>Total Exams</span>
          <b>{analytics.totalExams}</b>
        </div>

        <div className="analyticsCard">
          <span>Total Users</span>
          <b>{analytics.totalUsers}</b>
        </div>

        <div className="analyticsCard">
          <span>Total Students</span>
          <b>{analytics.totalStudents}</b>
        </div>

        <div className="analyticsCard">
          <span>Access Logs</span>
          <b>{analytics.totalAccessLogs}</b>
        </div>

        <div className="analyticsCard greenCard">
          <span>Open Exams</span>
          <b>{analytics.openExams}</b>
        </div>

        <div className="analyticsCard redCard">
          <span>Locked Exams</span>
          <b>{analytics.lockedExams}</b>
        </div>

        <div className="analyticsCard greyCard">
          <span>Closed Exams</span>
          <b>{analytics.closedExams}</b>
        </div>

        <div className="analyticsCard redCard">
          <span>Blocked Attempts</span>
          <b>{analytics.blockedAttempts}</b>
        </div>

        <div className="analyticsCard redCard">
          <span>Tampered Attempts</span>
          <b>{analytics.tamperedAttempts}</b>
        </div>

        <div className="analyticsCard">
          <span>Total Views</span>
          <b>{analytics.totalViews}</b>
        </div>

        <div className="analyticsCard">
          <span>Total Downloads</span>
          <b>{analytics.totalDownloads}</b>
        </div>

        <div className="analyticsCard">
          <span>Uploads</span>
          <b>{analytics.uploadCount}</b>
        </div>
      </div>
    </section>
  );
}

function ExamTable({
  exams,
  role,
  viewPdf,
  downloadPdf,
  copyToClipboard,
  formatDateTime,
  getExamStatus
}) {
  return (
    <section className="card fullWidth">
      <h2>{role === "admin" ? "All Exam Papers" : "Available Exams"}</h2>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Course</th>
              <th>Semester</th>
              <th>Exam Type</th>
              <th>Faculty</th>
              <th>Duration</th>
              <th>View Limit</th>
              <th>Student Download</th>
              <th>Blockchain ID</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Hash</th>
              <th>Tx Hash</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {exams.map((exam) => {
              const status = getExamStatus(exam);
              const studentCanAccess = role === "student" && status === "OPEN";

              return (
                <tr key={exam._id}>
                  <td>{exam.subjectName || exam.title}</td>
                  <td>{exam.courseCode || "Old Record"}</td>
                  <td>{exam.semester || "Old Record"}</td>
                  <td>{exam.examType || "Old Record"}</td>
                  <td>{exam.facultyName || "Old Record"}</td>
                  <td>{exam.duration || "Old Record"}</td>
                  <td>1 time</td>
                  <td>Disabled</td>

                  <td>
                    {exam.blockchainPaperId || "Not stored"}
                    {role === "admin" && exam.blockchainPaperId && (
                      <button onClick={() => copyToClipboard(exam.blockchainPaperId, "Blockchain ID")}>
                        Copy
                      </button>
                    )}
                  </td>

                  <td>{formatDateTime(exam.examStartTime)}</td>
                  <td>{formatDateTime(exam.examEndTime)}</td>

                  <td>
                    {status === "LOCKED" && (
                      <span className="lockedBadge">
                        Locked
                      </span>
                    )}

                    {status === "OPEN" && (
                      <span className="openBadge">
                        Open
                      </span>
                    )}

                    {status === "CLOSED" && (
                      <span className="closedBadge">
                        Closed
                      </span>
                    )}

                    {status === "UNKNOWN" && (
                      <span className="closedBadge">
                        Old Record
                      </span>
                    )}
                  </td>

                  <td className="hashCell">
                    {role === "admin" ? (
                      <>
                        {exam.hash}
                        {exam.hash && (
                          <button onClick={() => copyToClipboard(exam.hash, "Hash")}>
                            Copy
                          </button>
                        )}
                      </>
                    ) : (
                      "Hidden"
                    )}
                  </td>

                  <td className="hashCell">
                    {role === "admin" ? (
                      <>
                        {exam.blockchainTxHash || "No tx"}
                        {exam.blockchainTxHash && (
                          <button onClick={() => copyToClipboard(exam.blockchainTxHash, "Transaction Hash")}>
                            Copy
                          </button>
                        )}
                      </>
                    ) : (
                      "Hidden"
                    )}
                  </td>

                  <td>
                    {role === "admin" && (
                      <>
                        <button onClick={() => viewPdf(exam.filename)}>
                          View PDF
                        </button>

                        <button onClick={() => downloadPdf(exam.filename)}>
                          Download
                        </button>
                      </>
                    )}

                    {role === "student" && studentCanAccess && (
                      <button onClick={() => viewPdf(exam.filename)}>
                        View Once
                      </button>
                    )}

                    {role === "student" && status === "LOCKED" && (
                      <span className="waitText">
                        Wait until exam starts
                      </span>
                    )}

                    {role === "student" && status === "CLOSED" && (
                      <span className="waitText">
                        Exam closed
                      </span>
                    )}

                    {role === "student" && status === "UNKNOWN" && (
                      <span className="waitText">
                        Old record
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {exams.length === 0 && (
              <tr>
                <td colSpan="15">
                  No exams available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LogsTable({ logs, formatDateTime }) {
  return (
    <section className="card fullWidth">
      <h2>Access Logs</h2>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Status</th>
              <th>User Role</th>
              <th>Paper</th>
              <th>Blockchain ID</th>
              <th>IP</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td>{formatDateTime(log.createdAt)}</td>
                <td>{log.action}</td>
                <td>{log.status}</td>
                <td>{log.userRole}</td>
                <td>{log.title}</td>
                <td>{log.blockchainPaperId}</td>
                <td>{log.ipAddress}</td>
                <td>{log.details}</td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan="8">
                  No logs available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default App;