import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { User, Lock, Camera, KeyRound, Check, Save, Mail, Trash2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const API_URL = import.meta.env.VITE_API_URL;
const SETTINGS_KEY = "intellmeet_settings";

function getSavedTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return saved?.appearance?.theme || "dark";
  } catch {
    return "dark";
  }
}

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [avatar, setAvatar] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const token = localStorage.getItem("token");
  const authConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    const theme = getSavedTheme();
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("light-theme", theme === "light");
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) { navigate("/login"); return; }
      try {
        const response = await axios.get(`${API_URL}/auth/me`, authConfig);
        const currentUser = response.data;
        setProfile({ name: currentUser.name || "", email: currentUser.email || "" });
        setAvatar(currentUser.avatar || "");
        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch (error) {
        console.error("Profile load error:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        }
      } finally { setLoading(false); }
    };
    loadUser();
  }, [authConfig, navigate, token]);

  const initials = profile.name?.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "U";

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Profile photo must be smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    try {
      setAvatarUploading(true);

      const reader = new FileReader();

      const base64Image = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image."));
        reader.readAsDataURL(file);
      });

      const response = await axios.put(
        `${API_URL}/auth/profile`,
        {
          avatar: base64Image,
        },
        authConfig
      );

      const updatedUser = response.data.user;

      setAvatar(updatedUser.avatar || "");
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Profile photo upload error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      alert(
        error.response?.data?.message ||
        "Failed to update profile photo."
      );
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const removeAvatar = async () => {
    try {
      setAvatarUploading(true);

      const response = await axios.put(
        `${API_URL}/auth/profile`,
        {
          avatar: "",
        },
        authConfig
      );

      const updatedUser = response.data.user;

      setAvatar("");
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Remove profile photo error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      alert(
        error.response?.data?.message ||
        "Failed to remove profile photo."
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const name = profile.name.trim();
    if (!name) { setProfileError("Name is required."); setProfileMessage(""); return; }
    try {
      setSavingProfile(true); setProfileError(""); setProfileMessage("");
      const response = await axios.put(`${API_URL}/auth/profile`, { name }, authConfig);
      const updatedUser = response.data.user;
      setProfile({ name: updatedUser.name || "", email: updatedUser.email || profile.email });
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Update profile error:", error);
      if (error.response?.status === 401) { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/login"); return; }
      setProfileError(error.response?.data?.message || "Failed to update your profile.");
    } finally { setSavingProfile(false); }
  };

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
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordError(error.response?.data?.message || "Failed to change password.");
    } finally { setChangingPassword(false); }
  };

  if (loading) return <div className="settings-loading"><div className="settings-loading-spinner" /><span>Loading profile...</span></div>;

  return (
    <div className="settings-page">
      <div className="settings-main">
        <header className="settings-header"><div><span className="settings-eyebrow">ACCOUNT</span><h1>Profile</h1><p>Manage your personal information and account security.</p></div></header>
        <main className="settings-content profile-page-content">
          <ProfileSettings profile={profile} setProfile={setProfile} avatar={avatar} avatarUploading={avatarUploading} initials={initials} handleAvatarChange={handleAvatarChange} removeAvatar={removeAvatar} saveProfile={saveProfile} savingProfile={savingProfile} profileMessage={profileMessage} profileError={profileError} passwords={passwords} updatePasswordField={updatePasswordField} showPasswords={showPasswords} setShowPasswords={setShowPasswords} changePassword={changePassword} changingPassword={changingPassword} passwordMessage={passwordMessage} passwordError={passwordError} />
        </main>
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


function ProfileSettings({
  profile,
  setProfile,
  avatar,
  avatarUploading,
  initials,
  handleAvatarChange,
  removeAvatar,
  saveProfile,
  savingProfile,
  profileMessage,
  profileError,
  passwords,
  updatePasswordField,
  showPasswords,
  setShowPasswords,
  changePassword,
  changingPassword,
  passwordMessage,
  passwordError,
}) {
  return (
    <>
      <section className="settings-profile-banner">
        <div className="settings-avatar">
          {avatar ? (
            <img src={avatar} alt="Profile" />
          ) : (
            initials
          )}

          <label
            className="settings-avatar-button"
            title="Change profile photo"
          >
            <Camera size={13} />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
          </label>
        </div>

        <div className="settings-identity">
          <h2>{profile.name || "User"}</h2>
          <p>{profile.email || "No email"}</p>
          <span>IntellMeet User</span>
        </div>

        {avatar && (
          <button
            type="button"
            className="settings-remove-photo"
            onClick={removeAvatar}
          >
            <Trash2 size={14} />
            Remove photo
          </button>
        )}
      </section>

      <section className="settings-card">
        <CardTitle
          icon={<User size={19} />}
          title="Personal Information"
          description="Update your basic account information."
          right={
            profileMessage ? (
              <span className="settings-success">
                <Check size={14} />
                {profileMessage}
              </span>
            ) : null
          }
        />

        <form
          className="settings-form"
          onSubmit={saveProfile}
        >
          <label className="settings-field">
            <span>Full Name</span>
            <div className="settings-input">
              <User size={15} />
              <input
                value={profile.name}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    name: event.target.value,
                  })
                }
                placeholder="Enter your name"
              />
            </div>
          </label>

          <label className="settings-field">
            <span>Email Address</span>
            <div className="settings-input disabled">
              <Mail size={15} />
              <input
                value={profile.email}
                disabled
                readOnly
              />
            </div>
            <small>
              Email address cannot be changed here.
            </small>
          </label>

          {profileError && (
            <div className="settings-error">
              {profileError}
            </div>
          )}

          <div className="settings-footer">
            <button
              type="submit"
              className="settings-primary"
              disabled={savingProfile}
            >
              <Save size={15} />
              {savingProfile
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

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


export default Profile;
