import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
const API_URL = import.meta.env.VITE_API_URL;
function Register({ embedded = false, onSwitch }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState("");

  // registration steps:
  // 1 = name + email
  // 2 = OTP verification
  // 3 = create password
  const [step, setStep] = useState(1);

  const [verified, setVerified] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
    setMessage("");
  };

  // ==========================================
  // STEP 1 - SEND OTP
  // ==========================================

  const handleSendOTP = async () => {
    setError("");
    setMessage("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
          {
         name: formData.name,
         email: formData.email,
       }
      );

      setStep(2);

      setMessage(
        response.data.message ||
          "Verification code sent to your email."
      );
    } catch (error) {
      console.error(
        "Register error:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          "Unable to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2 - VERIFY OTP
  // ==========================================

  const handleVerifyOTP = async () => {
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/verify-email`,
        {
          email: formData.email,
          otp,
        }
      );

      if (response.data.success) {
        setVerified(true);
        setStep(3);

        setMessage(
          "Email verified successfully. Now create your password."
        );
      }
    } catch (error) {
      console.error(
        "OTP verification error:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          "Invalid verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RESEND OTP
  // ==========================================

  const handleResendOTP = async () => {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/resend-verification`,
        {
          email: formData.email,
        }
      );

      setMessage(
        response.data.message ||
          "A new verification code has been sent."
      );
    } catch (error) {
      console.error(
        "Resend OTP error:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          "Failed to resend verification code."
      );
    } finally {
      setResending(false);
    }
  };

  // ==========================================
  // STEP 3 - CREATE PASSWORD
  // ==========================================

  const handleCreateAccount = async () => {
    setError("");
    setMessage("");

    if (!formData.password) {
      setError("Please create a password.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (!formData.confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/complete-registration`,
        {
          email: formData.email,
          password: formData.password,
        }
      );

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setMessage("Account created successfully.");

      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      console.error(
        "Complete registration error:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GO BACK
  // ==========================================

  const handleBack = () => {
    setError("");
    setMessage("");

    if (step === 2) {
      setStep(1);
      setOtp("");
    } else if (step === 3) {
      setStep(2);
      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
    }
  };

  return (
    <div
      className={
        embedded ? "auth-embedded-page" : "auth-page"
      }
    >
      <div
        className={
          embedded
            ? "auth-card auth-card-embedded"
            : "auth-card"
        }
      >
        {/* =========================
            HEADER
        ========================== */}

        <div className="auth-heading">
          <span className="auth-eyebrow">
            GET STARTED
          </span>

          <h1>Join IntellMeet</h1>

          <p className="auth-subtitle">
            Create your account and start collaborating.
          </p>
        </div>

        {/* =========================
            STEP INDICATOR
        ========================== */}

        <div className="register-steps">
          <div
            className={`register-step ${
              step >= 1 ? "active" : ""
            }`}
          >
            <span>1</span>
            <small>Details</small>
          </div>

          <div
            className={`register-step ${
              step >= 2 ? "active" : ""
            }`}
          >
            <span>2</span>
            <small>Verify</small>
          </div>

          <div
            className={`register-step ${
              step >= 3 ? "active" : ""
            }`}
          >
            <span>3</span>
            <small>Password</small>
          </div>
        </div>

        {/* =========================
            ERROR
        ========================== */}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* =========================
            SUCCESS
        ========================== */}

        {message && (
          <div
            className={
              verified
                ? "auth-success auth-verified"
                : "auth-success"
            }
          >
            {message}
          </div>
        )}

        {/* =========================
            STEP 1
        ========================== */}

        {step === 1 && (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendOTP();
            }}
          >
            <label htmlFor="register-name">
              Full Name
            </label>

            <input
              id="register-name"
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />

            <label htmlFor="register-email">
              Email
            </label>

            <input
              id="register-email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

            <button
              className="auth-primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Sending code..."
                : "Continue"}
            </button>
          </form>
        )}

        {/* =========================
            STEP 2 - OTP
        ========================== */}

        {step === 2 && (
          <div className="auth-form">

            <label htmlFor="register-otp">
              Verification Code
            </label>

            <p className="auth-step-description">
              Enter the 6-digit code sent to{" "}
              <strong>{formData.email}</strong>
            </p>

            <div className="otp-row">
              <input
                id="register-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => {
                  const value =
                    e.target.value.replace(/\D/g, "");

                  setOtp(value);
                  setError("");
                }}
                autoComplete="one-time-code"
              />

              <button
                type="button"
                className="otp-verify-button"
                onClick={handleVerifyOTP}
                disabled={
                  loading ||
                  otp.length !== 6
                }
              >
                {loading ? "..." : "Verify"}
              </button>
            </div>

            <div className="otp-help">
              <span>
                Code expires in 10 minutes
              </span>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resending}
              >
                {resending
                  ? "Sending..."
                  : "Resend code"}
              </button>
            </div>

            <button
              type="button"
              className="auth-back-button"
              onClick={handleBack}
            >
              ← Change email
            </button>

          </div>
        )}

        {/* =========================
            STEP 3 - PASSWORD
        ========================== */}

        {step === 3 && (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateAccount();
            }}
          >
            <label htmlFor="register-password">
              Create Password
            </label>

            <div className="password-input-wrapper">
  <input
    id="register-password"
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="Minimum 6 characters"
    value={formData.password}
    onChange={handleChange}
    autoComplete="new-password"
    minLength={6}
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

            <label htmlFor="register-confirm-password">
              Confirm Password
            </label>

            <input
              id="register-confirm-password"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={6}
              required
            />

            <button
              className="auth-primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create Account"}
            </button>

            <button
              type="button"
              className="auth-back-button"
              onClick={handleBack}
            >
              ← Back to verification
            </button>
          </form>
        )}

        {/* =========================
            LOGIN SWITCH
        ========================== */}

        <p className="auth-footer">
          Already have an account?{" "}

          {embedded ? (
            <button
              type="button"
              className="auth-switch-button"
              onClick={onSwitch}
            >
              Log in
            </button>
          ) : (
            <Link to="/login">
              Log in
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}

export default Register;