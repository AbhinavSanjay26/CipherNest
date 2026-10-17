import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, LockKeyhole, FileText, Upload, Download, Trash2,
  Activity, LogOut, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle,
  FolderLock, KeyRound, ArrowRight, Shield, Clock3, Files, Plus
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function api(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {
      try { message = (await response.text()) || message; } catch {}
    }
    throw new Error(message);
  }
  return response;
}

function readableSize(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function readableDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
function initials(value) {
  return (value || "U").slice(0, 1).toUpperCase();
}

function Notice({ notice, onClose }) {
  if (!notice) return null;
  const good = notice.type === "success";
  return (
    <div className={`notice ${good ? "notice-success" : "notice-error"}`} role="status">
      {good ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{notice.message}</span>
      <button className="icon-button notice-close" aria-label="Dismiss notification" onClick={onClose}>×</button>
    </div>
  );
}

function AuthScreen({ onAuth, setNotice }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        const response = await api("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), email: email.trim(), password })
        });
        let data = {};
        try { data = await response.json(); } catch {}
        setNotice({ type: "success", message: data.message || "Account created. Sign in to continue." });
        setMode("login");
        setPassword("");
      } else {
        const form = new URLSearchParams();
        form.set("username", username.trim());
        form.set("password", password);
        const response = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form
        });
        const data = await response.json();
        if (!data.access_token) throw new Error("Login response did not include an access token.");
        onAuth(data.access_token, username.trim());
      }
    } catch (error) {
      setNotice({ type: "error", message: `${error.message}${mode === "register" ? " If your backend expects a different registration schema, see README.md." : ""}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand brand-large"><span className="brand-mark"><ShieldCheck size={24} /></span><span>Secure<span className="brand-light">Vault</span></span></div>
        <div className="story-content">
          <div className="eyebrow"><span className="pulse-dot" /> YOUR PRIVATE DIGITAL SPACE</div>
          <h1>Your files.<br /><span>Your keys.</span><br />Your control.</h1>
          <p>Store sensitive files in an encrypted vault built around privacy, integrity, and controlled access.</p>
          <div className="story-points">
            <div><span className="point-icon"><LockKeyhole size={17} /></span><span><b>Encrypted storage</b><small>Files are encrypted by your backend before storage.</small></span></div>
            <div><span className="point-icon"><Shield size={17} /></span><span><b>Private by account</b><small>Access is checked against your authenticated account.</small></span></div>
            <div><span className="point-icon"><Activity size={17} /></span><span><b>Activity history</b><small>Keep track of uploads, downloads, and deletions.</small></span></div>
          </div>
        </div>
        <div className="story-footer"><span>●</span> Privacy-first file management <span className="footer-divider">/</span> AES-GCM backend encryption</div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand brand"><span className="brand-mark"><ShieldCheck size={22} /></span><span>Secure<span className="brand-light">Vault</span></span></div>
          <div className="auth-kicker">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</div>
          <h2>{mode === "login" ? "Sign in to your vault" : "Create your account"}</h2>
          <p className="auth-subtitle">{mode === "login" ? "Enter your credentials to access your secure files." : "Set up your account to start storing files securely."}</p>
          <form onSubmit={submit} className="auth-form">
            <label>Username or email
              <div className="input-wrap"><span className="input-symbol"><Eye size={17} /></span><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" required /></div>
            </label>
            {mode === "register" && <label>Email address
              <div className="input-wrap"><span className="input-symbol">@</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
            </label>}
            <label>Password
              <div className="input-wrap"><span className="input-symbol"><KeyRound size={17} /></span><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : undefined} /><button className="reveal-button" type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            </label>
            {mode === "register" && <p className="field-hint">Use at least 8 characters for your password.</p>}
            <button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "login" ? "Sign in securely" : "Create account"} <ArrowRight size={17} /></button>
          </form>
          <div className="auth-switch">{mode === "login" ? "New to SecureVault?" : "Already have an account?"} <button onClick={() => setMode(v => v === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Sign in"}</button></div>
          <div className="secure-note"><LockKeyhole size={14} /> Your connection uses the configured backend API.</div>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("sfv_access_token") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("sfv_username") || "User");
  const [activeTab, setActiveTab] = useState("overview");
  const [files, setFiles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPassword, setUploadPassword] = useState("");
  const [downloadPasswords, setDownloadPasswords] = useState({});
  const [showUploadPassword, setShowUploadPassword] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [query, setQuery] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("sfv_access_token");
    localStorage.removeItem("sfv_username");
    setToken("");
    setFiles([]);
    setActivity([]);
    setNotice({ type: "success", message: "You have been signed out." });
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [filesResponse, activityResponse] = await Promise.all([
        api("/files", { token }),
        api("/activity", { token })
      ]);
      const fileData = await filesResponse.json();
      const activityData = await activityResponse.json();
      setFiles(Array.isArray(fileData) ? fileData : (fileData.files || []));
      setActivity(Array.isArray(activityData) ? activityData : (activityData.activities || []));
    } catch (error) {
      if (/401|unauthorized|token/i.test(error.message)) {
        setNotice({ type: "error", message: "Your session may have expired. Please sign in again." });
      } else {
        setNotice({ type: "error", message: `Could not load vault data: ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 6500);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const filteredFiles = useMemo(() => files.filter(file => (file.filename || file.original_filename || file.name || "").toLowerCase().includes(query.toLowerCase())), [files, query]);
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || file.file_size || 0), 0);
  const recentActivity = activity.slice(0, 5);

  function handleAuth(accessToken, enteredUsername) {
    localStorage.setItem("sfv_access_token", accessToken);
    localStorage.setItem("sfv_username", enteredUsername);
    setToken(accessToken);
    setUsername(enteredUsername);
    setNotice({ type: "success", message: "Signed in successfully." });
  }

  async function upload(event) {
    event.preventDefault();
    if (!uploadFile || !uploadPassword) {
      setNotice({ type: "error", message: "Choose a file and enter its encryption password." });
      return;
    }
    if (uploadFile.size > 10 * 1024 * 1024) {
      setNotice({ type: "error", message: "The maximum upload size is 10 MB." });
      return;
    }
    setBusyAction("upload");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("password", uploadPassword);
      const response = await api("/files/upload", { method: "POST", token, body: form });
      await response.json().catch(() => ({}));
      setUploadFile(null);
      setUploadPassword("");
      const picker = document.getElementById("file-picker");
      if (picker) picker.value = "";
      setNotice({ type: "success", message: "File encrypted and uploaded to your vault." });
      setActiveTab("files");
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: `Upload failed: ${error.message}` });
    } finally {
      setBusyAction("");
    }
  }

  async function download(file) {
    const id = file.id;
    const password = downloadPasswords[id] || "";
    if (!password) {
      setNotice({ type: "error", message: "Enter the password used to encrypt this file." });
      return;
    }
    setBusyAction(`download-${id}`);
    try {
      const form = new FormData();
      form.append("password", password);
      const response = await api(`/files/${encodeURIComponent(id)}/download`, { method: "POST", token, body: form });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      const fallback = file.filename || file.original_filename || file.name || "download";
      let filename = fallback;
      if (match?.[1]) {
        try { filename = decodeURIComponent(match[1].replace(/^"|"$/g, "")); } catch { filename = match[1]; }
      }
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice({ type: "success", message: `${filename} downloaded and decrypted.` });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: `Download failed: ${error.message}` });
    } finally {
      setBusyAction("");
    }
  }

  async function deleteFile(file) {
    const filename = file.filename || file.original_filename || file.name || "this file";
    if (!window.confirm(`Delete "${filename}" from your vault? This cannot be undone.`)) return;
    setBusyAction(`delete-${file.id}`);
    try {
      await api(`/files/${encodeURIComponent(file.id)}`, { method: "DELETE", token });
      setNotice({ type: "success", message: `${filename} was deleted.` });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: `Delete failed: ${error.message}` });
    } finally {
      setBusyAction("");
    }
  }

  if (!token) return <><Notice notice={notice} onClose={() => setNotice(null)} /><AuthScreen onAuth={handleAuth} setNotice={setNotice} /></>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand sidebar-brand"><span className="brand-mark"><ShieldCheck size={22} /></span><span>Secure<span className="brand-light">Vault</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={activeTab === "overview" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("overview")}><span><Activity size={18} /></span> Overview</button>
          <button className={activeTab === "files" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("files")}><span><Files size={18} /></span> My files <span className="nav-count">{files.length}</span></button>
          <button className={activeTab === "upload" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("upload")}><span><Upload size={18} /></span> Upload file</button>
          <button className={activeTab === "activity" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("activity")}><span><Clock3 size={18} /></span> Activity log</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="encrypted-card"><div className="encrypted-icon"><LockKeyhole size={17} /></div><b>Your vault is protected</b><p>Encryption and access controls are handled by your backend.</p><div className="encrypted-status"><span /> API configured</div></div>
          <button className="user-row" onClick={logout} title="Sign out"><span className="avatar">{initials(username)}</span><span className="user-meta"><b>{username}</b><small>Personal vault</small></span><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{({ overview: "Overview", files: "My files", upload: "Upload file", activity: "Activity log" })[activeTab]}</b></div>
          <div className="topbar-actions"><span className="api-status"><span /> Connected UI</span><button className="icon-button refresh-button" onClick={loadData} disabled={loading} aria-label="Refresh data" title="Refresh data"><RefreshCw size={17} className={loading ? "spin" : ""} /></button><button className="top-avatar" title={`Signed in as ${username}`}>{initials(username)}</button></div>
        </header>

        <div className="page-content">
          <Notice notice={notice} onClose={() => setNotice(null)} />
          {activeTab === "overview" && <>
            <section className="page-heading"><div><div className="eyebrow">YOUR PRIVATE WORKSPACE</div><h1>Good to see you, {username}.</h1><p>Here’s what’s happening inside your secure vault.</p></div><button className="primary-button" onClick={() => setActiveTab("upload")}><Plus size={17} /> Upload a file</button></section>
            <section className="stat-grid">
              <div className="stat-card"><div className="stat-top"><span className="stat-icon purple"><Files size={19} /></span><span className="stat-label">STORED FILES</span></div><div className="stat-number">{files.length}</div><div className="stat-foot">Files in your personal vault</div></div>
              <div className="stat-card"><div className="stat-top"><span className="stat-icon blue"><FolderLock size={19} /></span><span className="stat-label">TOTAL FILE SIZE</span></div><div className="stat-number">{readableSize(totalBytes)}</div><div className="stat-foot">Combined original file sizes</div></div>
              <div className="stat-card"><div className="stat-top"><span className="stat-icon green"><ShieldCheck size={19} /></span><span className="stat-label">PROTECTION</span></div><div className="stat-number stat-word">Encrypted</div><div className="stat-foot"><span className="tiny-green-dot" /> Encryption handled by backend</div></div>
            </section>
            <section className="content-grid">
              <div className="panel files-panel"><div className="panel-heading"><div><h2>Recent files</h2><p>Your latest stored documents</p></div><button className="text-button" onClick={() => setActiveTab("files")}>View all <ArrowRight size={15} /></button></div>
                {loading ? <div className="empty-state"><RefreshCw className="spin" size={22} /> Loading your files…</div> : files.length === 0 ? <EmptyState title="Your vault is empty" body="Upload your first file to start building your secure workspace." action="Upload a file" onAction={() => setActiveTab("upload")} /> : <FileTable files={files.slice(0, 5)} downloadPasswords={downloadPasswords} setDownloadPasswords={setDownloadPasswords} download={download} deleteFile={deleteFile} busyAction={busyAction} compact />}
              </div>
              <div className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest actions in your vault</p></div><button className="icon-button subtle" onClick={() => setActiveTab("activity")} aria-label="View activity"><ArrowRight size={17} /></button></div>
                {recentActivity.length === 0 ? <div className="empty-mini"><Activity size={22} /><p>No activity yet.</p><small>Uploads and downloads will appear here.</small></div> : <ActivityList items={recentActivity} />}
              </div>
            </section>
            <section className="security-banner"><div className="banner-icon"><ShieldCheck size={22} /></div><div><b>Security is built into the workflow</b><p>Files are encrypted by the backend, and actions are restricted to your authenticated account.</p></div><span className="banner-pill"><LockKeyhole size={13} /> Protected</span></section>
          </>}

          {activeTab === "files" && <>
            <section className="page-heading"><div><div className="eyebrow">FILE MANAGEMENT</div><h1>My files</h1><p>Browse, download, or remove files from your encrypted vault.</p></div><button className="primary-button" onClick={() => setActiveTab("upload")}><Upload size={17} /> Upload file</button></section>
            <div className="toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search files by name…" /></div><span className="results-count">{filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}</span></div>
            <section className="panel full-panel">{loading ? <div className="empty-state"><RefreshCw className="spin" size={22} /> Loading your files…</div> : filteredFiles.length === 0 ? <EmptyState title={query ? "No matching files" : "Your vault is empty"} body={query ? "Try another search term." : "Upload a file to see it listed here."} action={query ? "Clear search" : "Upload a file"} onAction={() => query ? setQuery("") : setActiveTab("upload")} /> : <FileTable files={filteredFiles} downloadPasswords={downloadPasswords} setDownloadPasswords={setDownloadPasswords} download={download} deleteFile={deleteFile} busyAction={busyAction} />}</section>
          </>}

          {activeTab === "upload" && <>
            <section className="page-heading"><div><div className="eyebrow">ADD TO YOUR VAULT</div><h1>Upload a file</h1><p>Your backend encrypts the file before saving it to storage.</p></div></section>
            <div className="upload-layout">
              <form className="panel upload-panel" onSubmit={upload}>
                <div className="panel-heading"><div><h2>New secure upload</h2><p>Select a file and set its encryption password.</p></div><span className="upload-heading-icon"><Upload size={20} /></span></div>
                <label className="dropzone" htmlFor="file-picker"><input id="file-picker" type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} /><span className="drop-icon"><Upload size={22} /></span><b>{uploadFile ? uploadFile.name : "Choose a file to upload"}</b><small>{uploadFile ? `${readableSize(uploadFile.size)} · Selected` : "Click to browse files on your device"}</small><span className="browse-label">Browse files</span></label>
                <div className="upload-limit"><span><ShieldCheck size={15} /> Maximum file size: 10 MB</span><span>Any file type</span></div>
                <label className="form-label">File encryption password <span className="required">*</span><div className="input-wrap"><span className="input-symbol"><KeyRound size={17} /></span><input type={showUploadPassword ? "text" : "password"} value={uploadPassword} onChange={e => setUploadPassword(e.target.value)} placeholder="Create a password for this file" required /><button type="button" className="reveal-button" onClick={() => setShowUploadPassword(v => !v)} aria-label="Toggle password visibility">{showUploadPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
                <div className="password-warning"><LockKeyhole size={16} /><span><b>Remember this password.</b> You’ll need the same password to decrypt and download the file later.</span></div>
                <button type="submit" className="primary-button upload-submit" disabled={busyAction === "upload"}>{busyAction === "upload" ? "Encrypting and uploading…" : "Encrypt & upload file"} <ArrowRight size={17} /></button>
              </form>
              <aside className="upload-side"><div className="upload-side-icon"><ShieldCheck size={25} /></div><h3>What happens next?</h3><div className="process-step"><span>01</span><div><b>Choose your file</b><p>Select a document or file up to 10 MB.</p></div></div><div className="process-step"><span>02</span><div><b>Set a password</b><p>Your backend derives an encryption key from this password.</p></div></div><div className="process-step"><span>03</span><div><b>Store securely</b><p>The encrypted file is saved and an activity entry is recorded.</p></div></div><div className="side-note"><LockKeyhole size={15} /> Your file password is sent to your configured backend over the API. Use HTTPS in production.</div></aside>
            </div>
          </>}

          {activeTab === "activity" && <>
            <section className="page-heading"><div><div className="eyebrow">AUDIT TRAIL</div><h1>Activity log</h1><p>Review recent file actions associated with your account.</p></div><button className="secondary-button" onClick={loadData} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button></section>
            <section className="panel full-panel activity-full-panel"><div className="panel-heading"><div><h2>Recent events</h2><p>Showing up to the latest 100 events returned by your backend.</p></div><span className="event-count">{activity.length} events</span></div>{activity.length === 0 ? <EmptyState title="No activity recorded" body="Upload, download, or delete a file to see events here." /> : <ActivityList items={activity} detailed />}</section>
          </>}
          <footer className="page-footer"><span>SecureVault <span className="footer-dot">•</span> Personal file security</span><span><span className="tiny-green-dot" /> Backend API: {API_BASE}</span></footer>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ title, body, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><FolderLock size={25} /></span><h3>{title}</h3><p>{body}</p>{action && <button className="secondary-button" onClick={onAction}>{action}</button>}</div>;
}

function FileTable({ files, downloadPasswords, setDownloadPasswords, download, deleteFile, busyAction, compact = false }) {
  return <div className="table-scroll"><table className="file-table"><thead><tr><th>FILE</th><th>SIZE</th><th>ADDED</th><th>DOWNLOAD PASSWORD</th><th>ACTIONS</th></tr></thead><tbody>{files.map((file, index) => {
    const id = file.id || file.file_id || `file-${index}`;
    const filename = file.filename || file.original_filename || file.name || "Untitled file";
    const size = file.size ?? file.file_size ?? 0;
    const date = file.uploaded_at || file.created_at || file.date;
    return <tr key={id}><td><div className="file-cell"><span className="file-icon"><FileText size={18} /></span><span className="file-name"><b title={filename}>{filename}</b><small>Encrypted file</small></span></div></td><td className="muted-cell">{readableSize(size)}</td><td className="muted-cell">{readableDate(date)}</td><td><input className="table-password" type="password" placeholder="File password" aria-label={`Password for ${filename}`} value={downloadPasswords[id] || ""} onChange={e => setDownloadPasswords(prev => ({ ...prev, [id]: e.target.value }))} /></td><td><div className="table-actions"><button className="action-button download-action" onClick={() => download({ ...file, id })} disabled={busyAction === `download-${id}`} title="Download and decrypt" aria-label={`Download ${filename}`}><Download size={16} /></button><button className="action-button delete-action" onClick={() => deleteFile({ ...file, id })} disabled={busyAction === `delete-${id}`} title="Delete file" aria-label={`Delete ${filename}`}><Trash2 size={16} /></button></div></td></tr>;
  })}</tbody></table></div>;
}

function ActivityList({ items, detailed = false }) {
  return <div className={`activity-list ${detailed ? "activity-detailed" : ""}`}>{items.map((item, index) => {
    const action = String(item.action || item.event || "ACTIVITY").toUpperCase();
    const style = action === "UPLOAD" ? "event-upload" : action === "DOWNLOAD" ? "event-download" : action === "DELETE" ? "event-delete" : "event-other";
    return <div className="activity-row" key={item.id || `${action}-${index}`}><span className={`event-icon ${style}`}>{action === "UPLOAD" ? <Upload size={16} /> : action === "DOWNLOAD" ? <Download size={16} /> : action === "DELETE" ? <Trash2 size={16} /> : <Activity size={16} />}</span><span className="event-content"><b>{action.charAt(0) + action.slice(1).toLowerCase()}</b><span>{item.details || item.description || "Vault activity"}</span></span><time>{readableDate(item.created_at || item.timestamp || item.date)}</time></div>;
  })}</div>;
}