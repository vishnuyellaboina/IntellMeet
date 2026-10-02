import React, { useEffect, useState } from "react";

import {
  Video,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Play,
  CheckCircle2,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";

import "./Landing.css";

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    if (location.pathname === "/login") {
      setAuthMode("login");
    } else if (location.pathname === "/register") {
      setAuthMode("register");
    } else {
      setAuthMode(null);
    }
  }, [location.pathname]);

  const openAuth = (mode) => {
    setAuthMode(mode);

    navigate(
      mode === "login"
        ? "/login"
        : "/register"
    );
  };

  const closeAuth = () => {
    setAuthMode(null);
    navigate("/");
  };
  
  return (
    <div className="landing-page">

      {/* =========================
          NAVBAR
      ========================== */}

      <header className="landing-navbar">

        <a href="/" className="landing-logo">
          <span className="landing-logo-icon">
            <Video size={19} />
          </span>

          <span>IntellMeet</span>
        </a>

        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#security">Security</a>
        </nav>

        <div className="landing-nav-actions">

          <button
            className="landing-login-button"
            onClick={() => openAuth("login")}
          >
            Log in
          </button>

          <button
            className="landing-get-started"
            onClick={() => openAuth("register")}
          >
            Get Started
            <ArrowRight size={16} />
          </button>

        </div>

      </header>


      {/* =========================
          HERO
      ========================== */}

      <main>

        <section className="landing-hero">

          <div className="hero-content">

            <div className="hero-badge">
              <Sparkles size={15} />
              AI-powered collaboration
            </div>

            <h1>
              Meetings that turn
              <span> conversations into action.</span>
            </h1>

            <p>
              IntellMeet brings video meetings,
              real-time collaboration, transcription,
              and AI-powered insights together in
              one intelligent workspace.
            </p>

            <div className="hero-actions">

              <button
                className="hero-primary-button"
                onClick={() => openAuth("register")}
              >
                Start for free
                <ArrowRight size={18} />
              </button>

              <a
                href="#features"
                className="hero-secondary-button"
              >
                <Play size={16} />
                See how it works
              </a>

            </div>

            <div className="hero-trust">
              <CheckCircle2 size={16} />
              Built for modern remote and hybrid teams
            </div>

          </div>


          {/* =========================
              INTERACTIVE PREVIEW
          ========================== */}

          <div
            className="hero-preview-wrapper"
            id="hero-preview"
          >

            <div className="hero-glow"></div>

            <div className="meeting-preview">

              <div className="preview-header">

                <div>

                  <div className="preview-live">
                    <span></span>
                    Live Meeting
                  </div>

                  <strong>10:42 AM</strong>

                </div>

                <div className="preview-header-icon">
                  <Video size={18} />
                </div>

              </div>


              <div className="preview-video-area">

                <div className="preview-participant main">

                  <span>V</span>

                  <div>
                    <strong>Vishnu</strong>
                    <small>Host</small>
                  </div>

                </div>


                <div className="preview-participants">

                  <div className="preview-participant">
                    <span>A</span>
                    <strong>Alex</strong>
                  </div>

                  <div className="preview-participant">
                    <span>R</span>
                    <strong>Riya</strong>
                  </div>

                  <div className="preview-participant">
                    <span>C</span>
                    <strong>Chandan</strong>
                  </div>

                </div>

              </div>


              <div className="preview-footer">

                <div className="preview-footer-status">
                  <span></span>
                  Connected
                </div>

                <button
                  className="preview-leave"
                  onClick={() => openAuth("login")}
                >
                  Join
                </button>

              </div>

            </div>

          </div>

        </section>


        {/* =========================
            FEATURES
        ========================== */}

        <section
          id="features"
          className="landing-section features-section"
        >

          <div className="section-heading">

            <span className="section-eyebrow">
              ONE WORKSPACE
            </span>

            <h2>
              Everything your meetings need.
            </h2>

            <p>
              From the first conversation to the final
              action item, IntellMeet keeps your team
              connected and productive.
            </p>

          </div>


          <div className="features-grid">

            <FeatureCard
              icon={<Video />}
              title="HD Video Meetings"
              description="Reliable real-time video and audio powered by WebRTC."
            />

            <FeatureCard
              icon={<MessageSquare />}
              title="Real-Time Collaboration"
              description="Chat, share screens, and collaborate while your meeting is live."
            />

            <FeatureCard
              icon={<Sparkles />}
              title="AI Meeting Intelligence"
              description="Generate summaries, key points, decisions, and action items automatically."
            />

            <FeatureCard
              icon={<ShieldCheck />}
              title="Enterprise Security"
              description="Secure authentication and protected collaboration for your teams."
            />

          </div>

        </section>


        {/* =========================
            ABOUT
        ========================== */}

        <section
          id="about"
          className="landing-about"
        >

          <div className="about-card">

            <div className="about-content">

              <span className="section-eyebrow">
                BUILT FOR TEAMS
              </span>

              <h2>
                Less meeting overhead.
                <span> More meaningful work.</span>
              </h2>

              <p>
                IntellMeet combines the tools your team
                already needs into one focused meeting
                experience. Meet, collaborate, capture
                decisions, and turn conversations into
                actionable work.
              </p>


              <div className="about-points">

                <div>
                  <CheckCircle2 size={18} />
                  <span>
                    Everything stays in one workspace
                  </span>
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  <span>
                    AI turns conversations into useful
                    insights
                  </span>
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  <span>
                    Designed for modern distributed teams
                  </span>
                </div>

              </div>

            </div>


            <div className="about-visual">

              <div className="about-stat-card">
                <Sparkles size={20} />
                <strong>AI Insights</strong>
                <span>Meeting intelligence</span>
              </div>

              <div className="about-stat-card">
                <Video size={20} />
                <strong>Live Collaboration</strong>
                <span>Real-time meetings</span>
              </div>

            </div>

          </div>

        </section>


        {/* =========================
            SECURITY
        ========================== */}

        <section
          id="security"
          className="landing-security"
        >

          <div className="security-icon">
            <ShieldCheck size={30} />
          </div>

          <span className="section-eyebrow">
            SECURITY
          </span>

          <h2>
            Your meetings stay protected.
          </h2>

          <p>
            IntellMeet is designed with secure
            authentication, protected meeting access,
            and privacy-focused collaboration in mind.
          </p>


          <div className="security-items">

            <span>
              <CheckCircle2 size={16} />
              Secure authentication
            </span>

            <span>
              <CheckCircle2 size={16} />
              Protected meetings
            </span>

            <span>
              <CheckCircle2 size={16} />
              Private collaboration
            </span>

          </div>

        </section>


        {/* =========================
            CTA
        ========================== */}

        <section className="landing-cta">

          <span className="section-eyebrow">
            READY TO COLLABORATE?
          </span>

          <h2>
            Make every meeting count.
          </h2>

          <button
            className="cta-button"
            onClick={() => openAuth("register")}
          >
            Get Started
            <ArrowRight size={18} />
          </button>

        </section>

      </main>


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="landing-footer">

        <div className="landing-footer-logo">

          <span className="landing-logo-icon">
            <Video size={17} />
          </span>

          IntellMeet

        </div>

        <p>
          AI-powered meetings for modern teams.
        </p>

        <span className="landing-copyright">
          © {new Date().getFullYear()} IntellMeet
        </span>

      </footer>


      {/* =========================
          AUTH POPUP MODAL
      ========================== */}

      {authMode && (
        <div
          className="auth-modal-overlay"
          onClick={closeAuth}
        >

          <div
            className="auth-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {authMode === "login" ? (
              <Login
                embedded
                onSwitch={() => setAuthMode("register")}
              />
            ) : (
              <Register
                embedded
                onSwitch={() => setAuthMode("login")}
              />
            )}

          </div>

        </div>
      )}

    </div>
  );
}


/* ==========================================
   FEATURE CARD
========================================== */

function FeatureCard({
  icon,
  title,
  description,
}) {
  return (
    <article className="feature-card">

      <div className="feature-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <span className="feature-arrow">
        <ArrowRight size={17} />
      </span>

    </article>
  );
}

export default LandingPage;