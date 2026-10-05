import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
const API_URL = import.meta.env.VITE_API_URL;
function Login({ embedded = false, onSwitch }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);

  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  // =========================
  // NORMAL LOGIN
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        formData
      );

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // OPEN FORGOT PASSWORD
  // =========================

  const openForgotPassword = () => {
    setForgotMode(true);
    setForgotStep(1);

    setForgotEmail(formData.email);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");

    setError("");
    setMessage("");
  };

  // =========================
  // SEND PASSWORD OTP
  // =========================

  const handleSendForgotOTP = async () => {
    setError("");
    setMessage("");

    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
  const response = await axios.post(
    `${API_URL}/auth/forgot-password`,
    {
      email: forgotEmail.trim(),
    }
  );
      setForgotStep(2);

      setMessage(
        response.data.message ||
          "Verification code sent to your email."
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // VERIFY OTP
  // =========================

  const handleVerifyForgotOTP = async () => {
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
try {
  const response = await axios.post(
    `${API_URL}/auth/verify-reset-otp`,
    {
      email: forgotEmail.trim(),
      otp,
    }
  );

      if (response.data.success) {
        setForgotStep(3);

        setMessage(
          "Email verified. Create your new password."
        );
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Invalid or expired verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // RESEND OTP
  // =========================

  const handleResendForgotOTP = async () => {
  setError("");
  setMessage("");
  setResending(true);

  // Clear the old OTP
  setOtp("");

  try {
  const response = await axios.post(
    `${API_URL}/auth/resend-reset-otp`,
    {
      email: forgotEmail.trim(),
    }
  );

    setMessage(
      response.data.message ||
        "A new verification code has been sent."
    );
  } catch (error) {
    setError(
      error.response?.data?.message ||
        "Unable to resend verification code."
    );
  } finally {
    setResending(false);
  }
};

  // =========================
  // RESET PASSWORD
  // =========================

  const handleResetPassword = async () => {
    setError("");
    setMessage("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/reset-password`,
        {
          email: forgotEmail.trim(),
          otp,
          password: newPassword,
        }
      );

      setMessage(
        response.data.message ||
          "Password reset successfully."
      );

      setTimeout(() => {
        setForgotMode(false);
        setForgotStep(1);
        setFormData({
          email: forgotEmail,
          password: "",
        });
        setMessage("");
      }, 1200);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FORGOT PASSWORD UI
  // =========================

  if (forgotMode) {
    return (
      <div
        className={
          embedded
            ? "auth-embedded-page"
            : "auth-page"
        }
      >
        <div
          className={
            embedded
              ? "auth-card auth-card-embedded"
              : "auth-card"
          }
        >
          <div className="auth-heading">
            <span className="auth-eyebrow">
              ACCOUNT RECOVERY
            </span>

            <h1>Forgot Password?</h1>

            <p className="auth-subtitle">
              Reset your IntellMeet password securely.
            </p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          {/* STEP 1 */}

          {forgotStep === 1 && (
            <div className="auth-form">

              <label htmlFor="forgot-email">
                Email Address
              </label>

              <input
                id="forgot-email"
                type="email"
                placeholder="Enter your registered email"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                className="auth-primary-button"
                onClick={handleSendForgotOTP}
                disabled={loading}
              >
                {loading
                  ? "Sending code..."
                  : "Send Verification Code"}
              </button>

            </div>
          )}

          {/* STEP 2 */}

          {forgotStep === 2 && (
            <div className="auth-form">

              <label htmlFor="forgot-otp">
                Verification Code
              </label>

              <p className="auth-step-description">
                Enter the 6-digit code sent to{" "}
                <strong>{forgotEmail}</strong>
              </p>

              <input
                id="forgot-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => {
                  setOtp(
                    e.target.value.replace(/\D/g, "")
                  );
                  setError("");
                }}
              />

              <button
                type="button"
                className="auth-primary-button"
                onClick={handleVerifyForgotOTP}
                disabled={loading || otp.length !== 6}
              >
                {loading
                  ? "Verifying..."
                  : "Verify OTP"}
              </button>

              <div className="otp-help">
                <span>Code expires in 10 minutes</span>

                <button
                  type="button"
                  onClick={handleResendForgotOTP}
                  disabled={resending}
                >
                  {resending
                    ? "Sending..."
                    : "Resend code"}
                </button>
              </div>

            </div>
          )}

          {/* STEP 3 */}

          {forgotStep === 3 && (
            <div className="auth-form">

              <label htmlFor="new-password">
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
              />

              <label htmlFor="confirm-password">
                Confirm Password
              </label>

              <input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                className="auth-primary-button"
                onClick={handleResetPassword}
                disabled={loading}
              >
                {loading
                  ? "Updating password..."
                  : "Reset Password"}
              </button>

            </div>
          )}

          <button
            type="button"
            className="auth-back-button"
            onClick={() => {
              setForgotMode(false);
              setForgotStep(1);
              setError("");
              setMessage("");
            }}
          >
            ← Back to Login
          </button>

        </div>
      </div>
    );
  }

  // =========================
  // NORMAL LOGIN UI
  // =========================

  return (
    <div
      className={
        embedded
          ? "auth-embedded-page"
          : "auth-page"
      }
    >
      <div
        className={
          embedded
            ? "auth-card auth-card-embedded"
            : "auth-card"
        }
      >
        <div className="auth-heading">
          <span className="auth-eyebrow">
            WELCOME BACK
          </span>

          <h1>Welcome Back</h1>

          <p className="auth-subtitle">
            Sign in to your IntellMeet workspace.
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="login-email">
            Email
          </label>

          <input
            id="login-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">
            Password
          </label>

          <div className="password-input-wrapper">
  <input
    id="login-password"
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="Enter your password"
    value={formData.password}
    onChange={handleChange}
    autoComplete="current-password"
    required
  />

  <button
    type="button"
    className="password-eye-button"
    onClick={() => setShowPassword(!showPassword)}
    title={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? (
      <EyeOff size={18} />
    ) : (
      <Eye size={18} />
    )}
  </button>
</div>

          <div className="forgot-password-row">
            <button
              type="button"
              className="forgot-password-button"
              onClick={openForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}

          {embedded ? (
            <button
              type="button"
              className="auth-switch-button"
              onClick={onSwitch}
            >
              Create an account
            </button>
          ) : (
            <Link to="/register">
              Create an account
            </Link>
          )}
        </p>

      </div>
    </div>
  );
}

export default Login;