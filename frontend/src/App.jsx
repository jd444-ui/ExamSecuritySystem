import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student"
  });

  const [uploadForm, setUploadForm] = useState({
    subjectName: "",
    courseCode: "",
    semester: "",
    examType: "",
    facultyName: "",
    duration: "",
    downloadLimit: "1",
    examStartTime: "",
    examEndTime: "",
    file: null
  });

  const [verifyFile, setVerifyFile] = useState(null);
  const [exams, setExams] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState("");

  const authHeaders = {
    Authorization: `Bearer ${token}`
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const extractArray = (data, keys) => {
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    if (Array.isArray(data)) return data;
    return [];
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || "Login failed");
        return;
      }

      const loginToken = data.token || data.accessToken;
      const loginUser = data.user || {
        email: authForm.email,
        role: data.role || "student"
      };

      localStorage.setItem("token", loginToken);
      localStorage.setItem("user", JSON.stringify(loginUser));

      setToken(loginToken);
      setUser(loginUser);
      showMessage("Login successful");
    } catch (error) {
      showMessage("Backend not reachable");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(authForm)
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || "Registration failed");
        return;
      }

      showMessage("Registration successful. Login now.");
      setMode("login");
    } catch (error) {
      showMessage("Backend not reachable");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setExams([]);
    setLogs([]);
    setAnalytics(null);
  };

  const fetchExams = async () => {
    try {
      const res = await fetch(`${API_URL}/exams`, {
        headers: authHeaders
      });

      const data = await res.json();
      const list = extractArray(data, ["exams", "papers", "data"]);

      setExams(list);
    } catch (error) {
      showMessage("Failed to fetch exams");
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/exams/logs`, {
        headers: authHeaders
      });

      const data = await res.json();
      const list = extractArray(data, ["logs", "data"]);

      setLogs(list);
    } catch (error) {
      showMessage("Failed to fetch logs");
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/exams/analytics`, {
        headers: authHeaders
      });

      const data = await res.json();
      setAnalytics(data.analytics || data.data || data);
    } catch (error) {
      showMessage("Failed to fetch analytics");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      showMessage("Please select PDF file");
      return;
    }

    const formData = new FormData();

    Object.keys(uploadForm).forEach((key) => {
      if (key !== "file" && uploadForm[key]) {
        if (key === "examStartTime" || key === "examEndTime") {
          formData.append(key, new Date(uploadForm[key]).toISOString());
        } else {
          formData.append(key, uploadForm[key]);
        }
      }
    });

    formData.append("file", uploadForm.file);

    try {
      showMessage("Uploading to blockchain... please wait");

      const res = await fetch(`${API_URL}/exams/upload`, {
        method: "POST",
        headers: authHeaders,
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || "Upload failed");
        return;
      }

      showMessage("Exam uploaded successfully");
      setUploadForm({
        subjectName: "",
        courseCode: "",
        semester: "",
        examType: "",
        facultyName: "",
        duration: "",
        downloadLimit: "1",
        examStartTime: "",
        examEndTime: "",
        file: null
      });

      fetchExams();
      fetchLogs();
      fetchAnalytics();
    } catch (error) {
      showMessage("Upload failed");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!verifyFile) {
      showMessage("Please select PDF to verify");
      return;
    }

    const formData = new FormData();
    formData.append("file", verifyFile);

    try {
      const res = await fetch(`${API_URL}/exams/verify`, {
        method: "POST",
        headers: authHeaders,
        body: formData
      });

      const data = await res.json();

      if (data.valid) {
        showMessage("PDF is valid. Hash matched.");
      } else {
        showMessage("PDF is invalid or tampered.");
      }
    } catch (error) {
      showMessage("Verification failed");
    }
  };

  const viewPdf = async (id) => {
    try {
      const res = await fetch(`${API_URL}/exams/view/${id}`, {
        headers: authHeaders
      });

      if (!res.ok) {
        const data = await res.json();
        showMessage(data.message || "Cannot view PDF");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      fetchLogs();
    } catch (error) {
      showMessage("View failed");
    }
  };

  const downloadPdf = async (id, filename) => {
    try {
      const res = await fetch(`${API_URL}/exams/download/${id}`, {
        headers: authHeaders
      });

      if (!res.ok) {
        const data = await res.json();
        showMessage(data.message || "Download failed");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `watermarked-${filename || "exam-paper.pdf"}`;
      a.click();

      fetchLogs();
    } catch (error) {
      showMessage("Download failed");
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  useEffect(() => {
    if (token) {
      fetchExams();
      fetchLogs();
      fetchAnalytics();
    }
  }, [token]);

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-left">
          <div className="brand-row">
            <div className="shield-logo">🔐</div>
            <div>
              <h1>Blockchain Exam Paper Security System</h1>
              <p>Secure • Verifiable • Controlled Access</p>
            </div>
          </div>

          <div className="exam-illustration">
            <div className="paper">
              <div className="paper-clip"></div>
              <h2>EXAM PAPER</h2>
              <div className="paper-line"></div>
              <div className="paper-line"></div>
              <div className="paper-line"></div>
              <div className="paper-line"></div>
              <div className="paper-line short"></div>
            </div>

            <div className="pencil">
              <div className="pencil-body"></div>
              <div className="pencil-tip"></div>
              <div className="pencil-eraser"></div>
            </div>

            <div className="blockchain-card">
              <span>Verified on</span>
              <strong>BLOCKCHAIN</strong>
            </div>
          </div>

          <div className="feature-row">
            <div className="feature-card">
              <span>🛡️</span>
              <h3>End-to-End Security</h3>
              <p>Protecting exam integrity with encrypted storage.</p>
            </div>

            <div className="feature-card">
              <span>⛓️</span>
              <h3>Blockchain Verified</h3>
              <p>Every paper hash is recorded on blockchain.</p>
            </div>

            <div className="feature-card">
              <span>👥</span>
              <h3>Controlled Access</h3>
              <p>Role-based access for admin and students.</p>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <div className="mini-shield">🔒</div>

            <h2>Blockchain Exam Paper Security System</h2>
            <p className="auth-subtitle">
              Secure exam upload, blockchain hash verification, and controlled
              student access.
            </p>

            <div className="tab-box">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Login
              </button>

              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

            <form
              onSubmit={mode === "login" ? handleLogin : handleRegister}
              className="auth-form"
            >
              {mode === "register" && (
                <>
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={authForm.name}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, name: e.target.value })
                    }
                    required
                  />

                  <label>Role</label>
                  <select
                    value={authForm.role}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, role: e.target.value })
                    }
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </>
              )}

              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                required
              />

              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                required
              />

              <button className="gold-btn" type="submit">
                {mode === "login" ? "Login" : "Register"}
              </button>
            </form>

            <p className="switch-text">
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Register" : "Login"}
              </button>
            </p>

            <div className="secure-note">
              🔐 Your data is encrypted and secured on the blockchain.
            </div>
          </div>
        </div>

        {message && <div className="toast">{message}</div>}
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Exam Paper Security Dashboard</h1>
          <p>
            Logged in as <b>{user?.email}</b> | Role: <b>{user?.role}</b>
          </p>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      {message && <div className="message-box">{message}</div>}

      {analytics && (
        <div className="analytics-grid">
          <div>
            <h3>Total Exams</h3>
            <p>{analytics.totalExams || 0}</p>
          </div>
          <div>
            <h3>Total Logs</h3>
            <p>{analytics.totalLogs || 0}</p>
          </div>
          <div>
            <h3>Uploads</h3>
            <p>{analytics.uploadSuccess || 0}</p>
          </div>
          <div>
            <h3>Views</h3>
            <p>{analytics.adminViews || 0}</p>
          </div>
        </div>
      )}

      {user?.role === "admin" && (
        <section className="panel">
          <h2>Upload Exam Paper</h2>

          <form className="upload-grid" onSubmit={handleUpload}>
            <input
              placeholder="Subject Name"
              value={uploadForm.subjectName}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, subjectName: e.target.value })
              }
            />

            <input
              placeholder="Course Code"
              value={uploadForm.courseCode}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, courseCode: e.target.value })
              }
            />

            <input
              placeholder="Semester"
              value={uploadForm.semester}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, semester: e.target.value })
              }
            />

            <input
              placeholder="Exam Type"
              value={uploadForm.examType}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, examType: e.target.value })
              }
            />

            <input
              placeholder="Faculty Name"
              value={uploadForm.facultyName}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, facultyName: e.target.value })
              }
            />

            <input
              placeholder="Duration"
              value={uploadForm.duration}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, duration: e.target.value })
              }
            />

            <input
              type="datetime-local"
              value={uploadForm.examStartTime}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, examStartTime: e.target.value })
              }
            />

            <input
              type="datetime-local"
              value={uploadForm.examEndTime}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, examEndTime: e.target.value })
              }
            />

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                setUploadForm({ ...uploadForm, file: e.target.files[0] })
              }
            />

            <button className="primary-btn" type="submit">
              Upload to Blockchain
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="section-title">
          <h2>All Exam Papers</h2>
          <button className="primary-btn" onClick={fetchExams}>
            Refresh Exams
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Course</th>
                <th>Semester</th>
                <th>Exam Type</th>
                <th>Faculty</th>
                <th>Blockchain ID</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Hash</th>
                <th>Tx Hash</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {exams.length === 0 ? (
                <tr>
                  <td colSpan="11">No exam papers found</td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam._id || exam.id}>
                    <td>{exam.subjectName || exam.title || "-"}</td>
                    <td>{exam.courseCode || "-"}</td>
                    <td>{exam.semester || "-"}</td>
                    <td>{exam.examType || "-"}</td>
                    <td>{exam.facultyName || "-"}</td>
                    <td>{exam.blockchainPaperId || "-"}</td>
                    <td>{formatDate(exam.examStartTime)}</td>
                    <td>{formatDate(exam.examEndTime)}</td>
                    <td>{exam.hash ? exam.hash.slice(0, 12) + "..." : "-"}</td>
                    <td>
                      {exam.blockchainTxHash
                        ? exam.blockchainTxHash.slice(0, 12) + "..."
                        : "-"}
                    </td>
                    <td>
                      <button
                        className="small-btn"
                        onClick={() => viewPdf(exam._id || exam.id)}
                      >
                        View
                      </button>

                      {user?.role === "admin" && (
                        <button
                          className="small-btn"
                          onClick={() =>
                            downloadPdf(exam._id || exam.id, exam.filename)
                          }
                        >
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Verify PDF</h2>

        <form className="verify-row" onSubmit={handleVerify}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setVerifyFile(e.target.files[0])}
          />

          <button className="primary-btn" type="submit">
            Verify PDF
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Access Logs</h2>
          <button className="primary-btn" onClick={fetchLogs}>
            Refresh Logs
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>File</th>
                <th>Status</th>
                <th>IP</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7">No logs found</td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log._id || index}>
                    <td>{log.userEmail || log.email || "-"}</td>
                    <td>{log.role || "-"}</td>
                    <td>{log.action || "-"}</td>
                    <td>{log.filename || log.fileName || "-"}</td>
                    <td>{log.status || "-"}</td>
                    <td>{log.ipAddress || log.ip || "-"}</td>
                    <td>{formatDate(log.timestamp || log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;