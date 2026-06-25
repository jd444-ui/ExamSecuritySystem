import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  const [mode, setMode] = useState("login");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [userName, setUserName] = useState(localStorage.getItem("name") || "");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student"
  });

  const [uploadForm, setUploadForm] = useState({
    subjectName: "Blockchain Technology",
    courseCode: "CSE4001",
    semester: "6",
    examType: "FAT",
    facultyName: "Dr. Faculty Name",
    duration: "2 Hours",
    downloadLimit: "1",
    examStartTime: "",
    examEndTime: ""
  });

  const [file, setFile] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);

  const [exams, setExams] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [uploadResult, setUploadResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`
  });

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 5000);
  };

  const getExamId = (exam) => {
    return exam?._id || exam?.id;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      showMessage("Copied successfully");
    } catch {
      showMessage("Copy failed");
    }
  };

  const apiJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Request failed");
    }

    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data = await apiJson(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginForm)
      });

      const userToken = data.token;
      const userRole = data.role || data.user?.role;
      const name = data.name || data.user?.name || loginForm.email;

      if (!userToken) {
        throw new Error("Token not received from backend");
      }

      localStorage.setItem("token", userToken);
      localStorage.setItem("role", userRole || "");
      localStorage.setItem("name", name || "");

      setToken(userToken);
      setRole(userRole || "");
      setUserName(name || "");

      showMessage("Login successful");
    } catch (error) {
      showMessage(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await apiJson(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registerForm)
      });

      showMessage("Registration successful. Now login.");
      setMode("login");
    } catch (error) {
      showMessage(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");

    setToken("");
    setRole("");
    setUserName("");
    setExams([]);
    setLogs([]);
    setAnalytics(null);
    setUploadResult(null);
    setVerifyResult(null);
  };

  const fetchExams = async () => {
    try {
      const data = await apiJson(`${API_URL}/exams`, {
        headers: authHeaders()
      });

      console.log("EXAMS RESPONSE:", data);

      if (Array.isArray(data)) {
        setExams(data);
      } else if (Array.isArray(data.exams)) {
        setExams(data.exams);
      } else if (Array.isArray(data.data)) {
        setExams(data.data);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.log("FETCH EXAMS ERROR:", error);
      showMessage(error.message || "Failed to fetch exam papers");
      setExams([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await apiJson(`${API_URL}/exams/logs`, {
        headers: authHeaders()
      });

      if (Array.isArray(data)) {
        setLogs(data);
      } else if (Array.isArray(data.logs)) {
        setLogs(data.logs);
      } else if (Array.isArray(data.data)) {
        setLogs(data.data);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await apiJson(`${API_URL}/exams/analytics`, {
        headers: authHeaders()
      });

      setAnalytics(data.analytics || data);
    } catch {
      setAnalytics(null);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExams();

      if (role === "admin") {
        fetchLogs();
        fetchAnalytics();
      }
    }
  }, [token, role]);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      showMessage("Please choose a PDF file");
      return;
    }

    try {
      setLoading(true);
      setUploadResult(null);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("title", uploadForm.subjectName);
      formData.append("subjectName", uploadForm.subjectName);
      formData.append("courseCode", uploadForm.courseCode);
      formData.append("semester", uploadForm.semester);
      formData.append("examType", uploadForm.examType);
      formData.append("facultyName", uploadForm.facultyName);
      formData.append("duration", uploadForm.duration);
      formData.append("downloadLimit", uploadForm.downloadLimit);

      if (uploadForm.examStartTime) {
        formData.append("examStartTime", uploadForm.examStartTime);
      }

      if (uploadForm.examEndTime) {
        formData.append("examEndTime", uploadForm.examEndTime);
      }

      const response = await fetch(`${API_URL}/exams/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || "Upload failed");
      }

      const uploadedExam = data.exam || data.data || data;

      setUploadResult(uploadedExam);

      if (uploadedExam && (uploadedExam._id || uploadedExam.id)) {
        setExams((old) => [uploadedExam, ...old]);
      }

      showMessage("Exam paper uploaded successfully");
      setFile(null);

      await fetchExams();

      if (role === "admin") {
        fetchLogs();
        fetchAnalytics();
      }
    } catch (error) {
      showMessage(error.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const openPdfFromRoutes = async (exam, shouldDownload = false) => {
    const id = getExamId(exam);

    if (!id) {
      showMessage("Exam ID missing");
      return;
    }

    const routesToTry = shouldDownload
      ? [
          `${API_URL}/exams/download/${id}`,
          `${API_URL}/exams/view/${id}`,
          `${API_URL}/exams/access/${id}`
        ]
      : [
          `${API_URL}/exams/view/${id}`,
          `${API_URL}/exams/access/${id}`,
          `${API_URL}/exams/download/${id}`
        ];

    let lastError = "PDF request failed";

    for (const url of routesToTry) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: authHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError =
            errorData.message ||
            errorData.error ||
            `Failed at route: ${url}`;
          continue;
        }

        const blob = await response.blob();

        if (blob.size === 0) {
          lastError = "Empty PDF received";
          continue;
        }

        const fileURL = URL.createObjectURL(blob);

        if (shouldDownload) {
          const a = document.createElement("a");
          a.href = fileURL;
          a.download = exam.filename || "exam-paper.pdf";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(fileURL);
        } else {
          window.open(fileURL, "_blank");
        }

        await fetchExams();

        if (role === "admin") {
          fetchLogs();
          fetchAnalytics();
        }

        return;
      } catch (error) {
        lastError = error.message;
      }
    }

    showMessage(lastError);
  };

  const viewPdf = async (exam) => {
    await openPdfFromRoutes(exam, false);
  };

  const downloadPdf = async (exam) => {
    if (role === "student") {
      showMessage("Student download is disabled");
      return;
    }

    await openPdfFromRoutes(exam, true);
  };

  const verifyPaper = async (e) => {
    e.preventDefault();

    if (!verifyFile) {
      showMessage("Choose a PDF to verify");
      return;
    }

    try {
      setLoading(true);
      setVerifyResult(null);

      const formData = new FormData();
      formData.append("file", verifyFile);

      const response = await fetch(`${API_URL}/exams/verify`, {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || "Verification failed");
      }

      setVerifyResult(data);
      showMessage("Verification completed");
    } catch (error) {
      showMessage(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const shortText = (text, length = 18) => {
    if (!text) return "-";

    return String(text).length > length
      ? `${String(text).slice(0, length)}...`
      : text;
  };

  if (!token) {
    return (
      <div className="app">
        <div className="auth-container">
          <h1>Blockchain Exam Paper Security System</h1>
          <p>
            Secure exam upload, blockchain hash verification, and controlled
            student access.
          </p>

          {message && <div className="message">{message}</div>}

          <div className="auth-tabs">
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

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="card">
              <h2>Login</h2>

              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                required
              />

              <button disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="card">
              <h2>Register</h2>

              <input
                type="text"
                placeholder="Name"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, name: e.target.value })
                }
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, email: e.target.value })
                }
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    password: e.target.value
                  })
                }
                required
              />

              <select
                value={registerForm.role}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, role: e.target.value })
                }
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>

              <button disabled={loading}>
                {loading ? "Please wait..." : "Register"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Exam Paper Security Dashboard</h1>
          <p>
            Logged in as <b>{userName}</b> | Role: <b>{role}</b>
          </p>
        </div>

        <button onClick={logout}>Logout</button>
      </header>

      {message && <div className="message">{message}</div>}

      {role === "admin" && (
        <>
          <section className="card">
            <h2>Upload Exam Paper</h2>

            <form onSubmit={handleUpload} className="grid-form">
              <input
                type="text"
                placeholder="Subject Name"
                value={uploadForm.subjectName}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    subjectName: e.target.value
                  })
                }
                required
              />

              <input
                type="text"
                placeholder="Course Code"
                value={uploadForm.courseCode}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    courseCode: e.target.value
                  })
                }
                required
              />

              <input
                type="text"
                placeholder="Semester"
                value={uploadForm.semester}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    semester: e.target.value
                  })
                }
                required
              />

              <input
                type="text"
                placeholder="Exam Type"
                value={uploadForm.examType}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    examType: e.target.value
                  })
                }
                required
              />

              <input
                type="text"
                placeholder="Faculty Name"
                value={uploadForm.facultyName}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    facultyName: e.target.value
                  })
                }
                required
              />

              <input
                type="text"
                placeholder="Duration"
                value={uploadForm.duration}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    duration: e.target.value
                  })
                }
                required
              />

              <input
                type="number"
                placeholder="Student View Limit"
                value={uploadForm.downloadLimit}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    downloadLimit: e.target.value
                  })
                }
                required
              />

              <label>
                Start Time
                <input
                  type="datetime-local"
                  value={uploadForm.examStartTime}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      examStartTime: e.target.value
                    })
                  }
                />
              </label>

              <label>
                End Time
                <input
                  type="datetime-local"
                  value={uploadForm.examEndTime}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      examEndTime: e.target.value
                    })
                  }
                />
              </label>

              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />

              <button disabled={loading}>
                {loading ? "Uploading to Blockchain..." : "Upload Exam Paper"}
              </button>
            </form>
          </section>

          {uploadResult && (
            <section className="card">
              <h2>Upload Result</h2>

              <p>
                <b>Subject:</b> {uploadResult.subjectName}
              </p>
              <p>
                <b>Course Code:</b> {uploadResult.courseCode}
              </p>
              <p>
                <b>Semester:</b> {uploadResult.semester}
              </p>
              <p>
                <b>Exam Type:</b> {uploadResult.examType}
              </p>
              <p>
                <b>Faculty:</b> {uploadResult.facultyName}
              </p>
              <p>
                <b>Duration:</b> {uploadResult.duration}
              </p>
              <p>
                <b>Student View Limit:</b>{" "}
                {uploadResult.downloadLimit || 1} time
              </p>
              <p>
                <b>Student Download:</b> Disabled
              </p>
              <p>
                <b>File:</b> {uploadResult.filename}
              </p>
              <p>
                <b>Blockchain ID:</b> {uploadResult.blockchainPaperId}
              </p>
              <p>
                <b>Hash:</b> {uploadResult.hash}
              </p>
              <p>
                <b>Tx Hash:</b> {uploadResult.blockchainTxHash}
              </p>

              {uploadResult.blockchainTxHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${uploadResult.blockchainTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Transaction on Sepolia Etherscan
                </a>
              )}
            </section>
          )}

          <section className="card">
            <h2>Verify Suspicious PDF</h2>

            <form onSubmit={verifyPaper} className="grid-form">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setVerifyFile(e.target.files[0])}
              />

              <button disabled={loading}>
                {loading ? "Verifying..." : "Verify PDF"}
              </button>
            </form>

            {verifyResult && (
              <div className="verify-box">
                <h3>Verification Result</h3>
                <pre>{JSON.stringify(verifyResult, null, 2)}</pre>
              </div>
            )}
          </section>

          {analytics && (
            <section className="card">
              <h2>Analytics</h2>

              <div className="analytics-grid">
                {Object.entries(analytics).map(([key, value]) => (
                  <div className="analytics-box" key={key}>
                    <h3>{String(value)}</h3>
                    <p>{key}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="card">
        <h2>All Exam Papers</h2>

        <button onClick={fetchExams}>Refresh Exams</button>

        <div className="table-wrapper">
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
              {exams.length === 0 ? (
                <tr>
                  <td colSpan="15">No exam papers found</td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={getExamId(exam) || exam.filename}>
                    <td>{exam.subjectName || exam.title || "-"}</td>
                    <td>{exam.courseCode || "-"}</td>
                    <td>{exam.semester || "-"}</td>
                    <td>{exam.examType || "-"}</td>
                    <td>{exam.facultyName || "-"}</td>
                    <td>{exam.duration || "-"}</td>
                    <td>{exam.downloadLimit || 1} time</td>
                    <td>{role === "student" ? "Disabled" : "Admin Only"}</td>

                    <td>
                      {exam.blockchainPaperId || "-"}
                      <br />
                      <button
                        onClick={() => copyToClipboard(exam.blockchainPaperId)}
                      >
                        Copy
                      </button>
                    </td>

                    <td>{formatDate(exam.examStartTime)}</td>
                    <td>{formatDate(exam.examEndTime)}</td>

                    <td>
                      <span className="status-open">Open</span>
                    </td>

                    <td>
                      {shortText(exam.hash, 20)}
                      <br />
                      <button onClick={() => copyToClipboard(exam.hash)}>
                        Copy
                      </button>
                    </td>

                    <td>
                      {shortText(exam.blockchainTxHash, 20)}
                      <br />
                      <button
                        onClick={() => copyToClipboard(exam.blockchainTxHash)}
                      >
                        Copy
                      </button>
                    </td>

                    <td>
                      <button onClick={() => viewPdf(exam)}>
                        {role === "student" ? "View Paper" : "View PDF"}
                      </button>

                      {role === "admin" && (
                        <button onClick={() => downloadPdf(exam)}>
                          Download
                        </button>
                      )}

                      {exam.blockchainTxHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${exam.blockchainTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Etherscan
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {role === "admin" && (
        <section className="card">
          <h2>Access Logs</h2>

          <button onClick={fetchLogs}>Refresh Logs</button>

          <div className="table-wrapper">
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
                      <td>{log.userEmail || log.email || log.userId || "-"}</td>
                      <td>{log.role || "-"}</td>
                      <td>{log.action || "-"}</td>
                      <td>{log.filename || "-"}</td>
                      <td>{log.status || "-"}</td>
                      <td>{log.ipAddress || log.ip || "-"}</td>
                      <td>
                        {formatDate(log.createdAt || log.time || log.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;