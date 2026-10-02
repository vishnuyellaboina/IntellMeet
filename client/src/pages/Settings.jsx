import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { User, Lock, Bell, Palette, Video, Users, ShieldCheck, CircleHelp, KeyRound, Monitor, Check, Mail, LogOut, Moon, Sun, Trash2, Download, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const API_URL = import.meta.env.VITE_API_URL;
const SETTINGS_KEY = "intellmeet_settings";
const AVATAR_KEY = "intellmeet_profile_avatar";

const DEFAULT_SETTINGS = { notifications: { meetings: true, actionItems: true, workspace: true }, meetings: { microphoneOnJoin: true, cameraOnJoin: false }, appearance: { theme: "dark", compactMode: false } };

const sections = [
  ["account", "Account", "Security & login", Lock],
  ["notifications", "Notifications", "Notification controls", Bell],
  ["appearance", "Appearance", "Theme & display", Palette],
  ["meetings", "Meeting Preferences", "Meeting defaults", Video],
  ["workspace", "Workspace Preferences", "Collaboration", Users],
  ["privacy", "Privacy", "Data & privacy", ShieldCheck],
  ["help", "Help & Support", "Get help", CircleHelp],
];

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...stored, notifications: { ...DEFAULT_SETTINGS.notifications, ...(stored.notifications || {}) }, meetings: { ...DEFAULT_SETTINGS.meetings, ...(stored.meetings || {}) }, appearance: { ...DEFAULT_SETTINGS.appearance, ...(stored.appearance || {}) } };
  } catch { return DEFAULT_SETTINGS; }
}

function Settings() {
  const navigate = useNavigate();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activeSection, setActiveSection] = useState("account");
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [settings, setSettings] = useState(readSettings);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const token = localStorage.getItem("token");
  const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    root.setAttribute("data-theme", settings.appearance.theme);
    root.classList.toggle("light-theme", settings.appearance.theme === "light");
  }, [settings]);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) { navigate("/login"); return; }
      try {
        const response = await axios.get(`${API_URL}/auth/me`, authConfig);
        const currentUser = response.data;
        setProfile({ name: currentUser.name || "", email: currentUser.email || "" });
        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch (error) {
        console.error("Settings user load error:", error);
        if (error.response?.status === 401) { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/login"); }
      } finally { setLoading(false); }
    };
    loadUser();
  }, [authConfig, navigate, token]);

  const updateSetting = (group, key) => setSettings(previous => ({ ...previous, [group]: { ...previous[group], [key]: !previous[group][key] } }));
  const changeTheme = (theme) => setSettings(previous => ({ ...previous, appearance: { ...previous.appearance, theme } }));
  const updatePasswordField = (field, value) => { setPasswords(previous => ({ ...previous, [field]: value })); setPasswordMessage(""); setPasswordError(""); };

  const changePassword = async (event) => {
    event.preventDefault();
    const { current, next, confirm } = passwords;
    if (!current || !next || !confirm) { setPasswordError("Please fill all password fields."); return; }
    if (next.length < 6) { setPasswordError("New password must contain at least 6 characters."); return; }
    if (next !== confirm) { setPasswordError("New passwords do not match."); return; }
    if (next === current) { setPasswordError("New password must be different from the current password."); return; }
    try {
      setChangingPassword(true); setPasswordError(""); setPasswordMessage("");
      await axios.put(`${API_URL}/auth/change-password`, { currentPassword: current, newPassword: next }, authConfig);
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordMessage("Password changed successfully.");
    } catch (error) { setPasswordError(error.response?.data?.message || "Failed to change password."); } finally { setChangingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you sure you want to permanently delete your IntellMeet account?\n\nThis action cannot be undone.");
    if (!confirmed) return;
    try {
      setDeletingAccount(true);
      await axios.delete(`${API_URL}/auth/account`, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.removeItem("token"); localStorage.removeItem("user"); localStorage.removeItem(AVATAR_KEY); localStorage.removeItem(SETTINGS_KEY);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Delete account error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to delete your account. Please try again.");
    } finally { setDeletingAccount(false); }
  };

  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/"); };
  const resetPreferences = () => { if (window.confirm("Reset all Settings preferences to their default values?")) setSettings(DEFAULT_SETTINGS); };
  const downloadSettings = () => { const data = { exportedAt: new Date().toISOString(), user: { name: profile.name, email: profile.email }, settings }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "intellmeet-settings.json"; anchor.click(); URL.revokeObjectURL(url); };
  const renderSwitch = (checked, onChange) => <button type="button" className={`settings-switch ${checked ? "active" : ""}`} onClick={onChange} aria-pressed={checked}><span /></button>;

  if (loading) return <div className="settings-loading"><div className="settings-loading-spinner" /><span>Loading settings...</span></div>;

  return (
    <div className={`settings-page ${settings.appearance.theme === "light" ? "light-theme" : ""} ${settings.appearance.compactMode ? "compact-mode" : ""}`}>
      <div className="settings-main">
        <header className="settings-header"><div><span className="settings-eyebrow">ACCOUNT</span><h1>Settings</h1><p>Manage your account, preferences, and application settings.</p></div></header>
        <div className="settings-layout">
          <aside className="settings-sidebar">
            <div className="settings-sidebar-label">SETTINGS</div>
            {sections.map(([key, label, description, Icon]) => <button type="button" key={key} className={`settings-nav ${activeSection === key ? "active" : ""}`} onClick={() => setActiveSection(key)}><span className="settings-nav-icon"><Icon size={17} /></span><span><b>{label}</b><small>{description}</small></span></button>)}
            <button type="button" className="settings-back" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
          </aside>
          <main className="settings-content">
            {activeSection === "account" && <AccountSettings profile={profile} changePassword={changePassword} passwords={passwords} updatePasswordField={updatePasswordField} showPasswords={showPasswords} setShowPasswords={setShowPasswords} changingPassword={changingPassword} passwordMessage={passwordMessage} passwordError={passwordError} handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} deletingAccount={deletingAccount} />}
            {activeSection === "notifications" && <NotificationsSettings settings={settings} updateSetting={updateSetting} renderSwitch={renderSwitch} />}
            {activeSection === "appearance" && <AppearanceSettings settings={settings} updateSetting={updateSetting} changeTheme={changeTheme} renderSwitch={renderSwitch} />}
            {activeSection === "meetings" && <MeetingSettings settings={settings} updateSetting={updateSetting} renderSwitch={renderSwitch} />}
            {activeSection === "workspace" && <WorkspaceSettings settings={settings} updateSetting={updateSetting} renderSwitch={renderSwitch} />}
            {activeSection === "privacy" && <PrivacySettings profile={profile} downloadSettings={downloadSettings} resetPreferences={resetPreferences} />}
            {activeSection === "help" && <HelpSettings />}
          </main>
        </div>
      </div>
    </div>
  );
}

function CardTitle({
  icon,
  title,
  description,
  right,
}) {
  return (
    <div className="settings-card-head">
      <div className="settings-card-title">
        {icon}
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {right}
    </div>
  );
}


function AccountSettings({
  profile,
  changePassword,
  passwords,
  updatePasswordField,
  showPasswords,
  setShowPasswords,
  changingPassword,
  passwordMessage,
  passwordError,
  handleLogout,
  handleDeleteAccount,
  deletingAccount,
}) {
  return (
    <>
      <section className="settings-card">
        <CardTitle
          icon={<Lock size={19} />}
          title="Account & Security"
          description="Manage your login and account security."
        />

        <div className="account-summary">
          <div className="account-summary-icon">
            <User size={18} />
          </div>
          <div>
            <strong>{profile.name || "User"}</strong>
            <span>{profile.email}</span>
          </div>
        </div>

        <PasswordCard
          passwords={passwords}
          updatePasswordField={updatePasswordField}
          showPasswords={showPasswords}
          setShowPasswords={setShowPasswords}
          changePassword={changePassword}
          changingPassword={changingPassword}
          passwordMessage={passwordMessage}
          passwordError={passwordError}
        />
      </section>

      <section className="settings-card">
        <CardTitle
          icon={<Monitor size={19} />}
          title="Current Session"
          description="This browser is currently signed in to your IntellMeet account."
        />

        <div className="session-row">
          <div className="session-icon">
            <Monitor size={18} />
          </div>
          <div>
            <strong>Current browser session</strong>
            <span>Authenticated with your current account.</span>
          </div>
          <span className="session-active">
            Active
          </span>
        </div>

        <div className="account-actions">

  <button
    type="button"
    className="settings-danger"
    onClick={handleLogout}
  >
    <LogOut size={15} />
    Sign Out
  </button>

  <button
    type="button"
    className="settings-delete-account"
    onClick={handleDeleteAccount}
    disabled={deletingAccount}
  >
    <Trash2 size={15} />

    {deletingAccount
      ? "Deleting..."
      : "Delete Account"}
  </button>

</div>
      </section>
    </>
  );
}


function PasswordCard({
  passwords,
  updatePasswordField,
  showPasswords,
  setShowPasswords,
  changePassword,
  changingPassword,
  passwordMessage,
  passwordError,
}) {
  const PasswordInput = ({
    label,
    field,
    placeholder,
  }) => {
    const visible = showPasswords[field];

    return (
      <label className="settings-field">
        <span>{label}</span>
        <div className="settings-input">
          <Lock size={15} />
          <input
            type={visible ? "text" : "password"}
            value={passwords[field]}
            onChange={(event) =>
              updatePasswordField(
                field,
                event.target.value
              )
            }
            placeholder={placeholder}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="settings-eye"
            onClick={() =>
              setShowPasswords((previous) => ({
                ...previous,
                [field]: !previous[field],
              }))
            }
            title={
              visible ? "Hide password" : "Show password"
            }
          >
            {visible ? (
              <EyeOff size={15} />
            ) : (
              <Eye size={15} />
            )}
          </button>
        </div>
      </label>
    );
  };

  return (
    <section className="settings-card">
      <CardTitle
        icon={<Lock size={19} />}
        title="Change Password"
        description="Keep your IntellMeet account secure."
      />

      <form
        className="settings-form"
        onSubmit={changePassword}
      >
        <PasswordInput
          label="Current Password"
          field="current"
          placeholder="Enter current password"
        />

        <div className="settings-password-grid">
          <PasswordInput
            label="New Password"
            field="next"
            placeholder="Enter new password"
          />
          <PasswordInput
            label="Confirm New Password"
            field="confirm"
            placeholder="Confirm new password"
          />
        </div>

        <small className="settings-password-hint">
          Use at least 6 characters. A longer password
          is recommended.
        </small>

        {passwordError && (
          <div className="settings-error">
            {passwordError}
          </div>
        )}

        {passwordMessage && (
          <div className="settings-success-box">
            <Check size={15} />
            {passwordMessage}
          </div>
        )}

        <div className="settings-footer">
          <button
            type="submit"
            className="settings-primary"
            disabled={changingPassword}
          >
            <KeyRound size={15} />
            {changingPassword
              ? "Updating..."
              : "Change Password"}
          </button>
        </div>
      </form>
    </section>
  );
}


function NotificationsSettings({
  settings,
  updateSetting,
  renderSwitch,
}) {
  return (
    <section className="settings-card">
      <CardTitle
        icon={<Bell size={19} />}
        title="Notifications"
        description="Choose what IntellMeet can notify you about."
      />

      <Preference
        title="Meeting Notifications"
        description="Invites, updates, cancellations and reminders."
        checked={settings.notifications.meetings}
        onChange={() =>
          updateSetting(
            "notifications",
            "meetings"
          )
        }
        renderSwitch={renderSwitch}
      />

      <Preference
        title="Action Item Notifications"
        description="New action items and changes assigned to you."
        checked={settings.notifications.actionItems}
        onChange={() =>
          updateSetting(
            "notifications",
            "actionItems"
          )
        }
        renderSwitch={renderSwitch}
      />

      <Preference
        title="Workspace Notifications"
        description="Workspace activity and member updates."
        checked={settings.notifications.workspace}
        onChange={() =>
          updateSetting(
            "notifications",
            "workspace"
          )
        }
        renderSwitch={renderSwitch}
      />

      <div className="settings-info-box">
        <Bell size={17} />
        <p>
          These preferences are stored locally in this
          browser. Notification records generated by
          IntellMeet are managed separately by the
          notification system.
        </p>
      </div>
    </section>
  );
}


function AppearanceSettings({
  settings,
  updateSetting,
  changeTheme,
  renderSwitch,
}) {
  return (
    <section className="settings-card">
      <CardTitle
        icon={<Palette size={19} />}
        title="Appearance"
        description="Customize the look and density of IntellMeet."
      />

      <div className="theme-grid">
        <button
          type="button"
          className={`theme-card ${
            settings.appearance.theme === "dark"
              ? "selected"
              : ""
          }`}
          onClick={() => changeTheme("dark")}
        >
          <Moon size={19} />
          <div>
            <strong>Dark</strong>
            <span>Focused dark workspace.</span>
          </div>
          {settings.appearance.theme === "dark" && (
            <Check size={16} />
          )}
        </button>

        <button
          type="button"
          className={`theme-card ${
            settings.appearance.theme === "light"
              ? "selected"
              : ""
          }`}
          onClick={() => changeTheme("light")}
        >
          <Sun size={19} />
          <div>
            <strong>Light</strong>
            <span>Brighter workspace appearance.</span>
          </div>
          {settings.appearance.theme === "light" && (
            <Check size={16} />
          )}
        </button>
      </div>

      <Preference
        title="Compact Mode"
        description="Reduce spacing across settings cards."
        checked={settings.appearance.compactMode}
        onChange={() =>
          updateSetting(
            "appearance",
            "compactMode"
          )
        }
        renderSwitch={renderSwitch}
      />
    </section>
  );
}


function MeetingSettings({
  settings,
  updateSetting,
  renderSwitch,
}) {
  return (
    <section className="settings-card">
      <CardTitle
        icon={<Video size={19} />}
        title="Meeting Preferences"
        description="Choose your default meeting behavior."
      />

      <Preference
        title="Join with microphone enabled"
        description="Start meetings with your microphone enabled."
        checked={settings.meetings.microphoneOnJoin}
        onChange={() =>
          updateSetting(
            "meetings",
            "microphoneOnJoin"
          )
        }
        renderSwitch={renderSwitch}
      />

      <Preference
        title="Join with camera enabled"
        description="Start meetings with your camera enabled."
        checked={settings.meetings.cameraOnJoin}
        onChange={() =>
          updateSetting(
            "meetings",
            "cameraOnJoin"
          )
        }
        renderSwitch={renderSwitch}
      />

      <div className="settings-info-box">
        <Video size={17} />
        <p>
          These preferences are saved locally and can
          be used by the meeting room when its join
          behavior is connected to settings.
        </p>
      </div>
    </section>
  );
}


function WorkspaceSettings({
  settings,
  updateSetting,
  renderSwitch,
}) {
  return (
    <section className="settings-card">
      <CardTitle
        icon={<Users size={19} />}
        title="Workspace Preferences"
        description="Manage collaboration-related preferences."
      />

      <Preference
        title="Workspace Activity"
        description="Receive updates about workspace activity."
        checked={settings.notifications.workspace}
        onChange={() =>
          updateSetting(
            "notifications",
            "workspace"
          )
        }
        renderSwitch={renderSwitch}
      />

      <Preference
        title="Action Item Updates"
        description="Receive updates about assigned action items."
        checked={settings.notifications.actionItems}
        onChange={() =>
          updateSetting(
            "notifications",
            "actionItems"
          )
        }
        renderSwitch={renderSwitch}
      />

      <div className="settings-info-box">
        <Users size={17} />
        <p>
          Workspace membership, roles and team members
          remain managed by the Workspace module.
        </p>
      </div>
    </section>
  );
}


function PrivacySettings({
  profile,
  downloadSettings,
  resetPreferences,
}) {
  return (
    <>
      <section className="settings-card">
        <CardTitle
          icon={<ShieldCheck size={19} />}
          title="Privacy"
          description="Review your account data and browser-stored preferences."
        />

        <div className="privacy-box">
          <ShieldCheck size={21} />
          <div>
            <strong>Your account is protected</strong>
            <p>
              Your authenticated account data is handled
              through the IntellMeet API. Keep your
              credentials private.
            </p>
          </div>
        </div>

        <div className="privacy-detail">
          <span>Account</span>
          <strong>{profile.email}</strong>
        </div>

        <div className="privacy-detail">
          <span>Local preferences</span>
          <strong>Stored in this browser</strong>
        </div>
      </section>

      <section className="settings-card">
        <CardTitle
          icon={<Download size={19} />}
          title="Your Data"
          description="Export the settings currently stored in this browser."
        />

        <div className="data-actions">
          <button
            type="button"
            className="settings-outline"
            onClick={downloadSettings}
          >
            <Download size={15} />
            Export Settings
          </button>

          <button
            type="button"
            className="settings-danger-outline"
            onClick={resetPreferences}
          >
            <Trash2 size={15} />
            Reset Preferences
          </button>
        </div>
      </section>
    </>
  );
}


function HelpSettings() {
  const openSupport = () => {
    window.location.href =
      "mailto:support@intellmeet.com?subject=IntellMeet%20Support";
  };

  return (
    <section className="settings-card">
      <CardTitle
        icon={<CircleHelp size={19} />}
        title="Help & Support"
        description="Get help with your IntellMeet account."
      />

      <div className="help-grid">
        <button
          type="button"
          className="help-card"
          onClick={() =>
            window.open(
              "https://github.com",
              "_blank",
              "noopener,noreferrer"
            )
          }
        >
          <CircleHelp size={20} />
          <strong>Documentation</strong>
          <span>
            Open project documentation and resources.
          </span>
          <ExternalLink size={14} />
        </button>

        <button
          type="button"
          className="help-card"
          onClick={openSupport}
        >
          <Mail size={20} />
          <strong>Contact Support</strong>
          <span>
            Send a support request by email.
          </span>
          <ExternalLink size={14} />
        </button>
      </div>
    </section>
  );
}


function Preference({
  title,
  description,
  checked,
  onChange,
  renderSwitch,
}) {
  return (
    <div className="settings-preference">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      {renderSwitch(checked, onChange)}
    </div>
  );
}
export default Settings;
