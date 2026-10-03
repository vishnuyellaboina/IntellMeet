import { useEffect, useState } from "react";
import axios from "axios";

import {
  Video,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  CheckSquare,
  X,
  Link,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./Dashboard.css";
const API_URL = import.meta.env.VITE_API_URL;
function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const [meetings, setMeetings] = useState([]);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showJoinModal, setShowJoinModal] =
    useState(false);

  const [meetingId, setMeetingId] =
    useState("");

  const [joinError, setJoinError] =
    useState("");

  const [joiningMeeting, setJoiningMeeting] =
    useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meetingDate: "",
    meetingTime: "",
    meetingEndTime: "",
  });

  const [loading, setLoading] =
    useState(false);

  const [loadingMeetings, setLoadingMeetings] =
    useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [notificationCount, setNotificationCount] =
    useState(0);

  // ==========================================
  // DASHBOARD ANALYTICS
  // ==========================================

  const [analytics, setAnalytics] =
    useState(null);

  const [loadingAnalytics, setLoadingAnalytics] =
    useState(true);

  const [analyticsError, setAnalyticsError] =
    useState("");

  // ==========================================
  // FETCH MEETINGS
  // ==========================================

  const fetchMeetings = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

        const response = await axios.get(
    `${API_URL}/meetings`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

      setMeetings(
        response.data.meetings || []
      );
    } catch (error) {
      console.error(
        "Failed to fetch meetings:",
        error
      );

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to load your meetings. Please check your connection and try again."
      );
    } finally {
      setLoadingMeetings(false);
    }
  };

  // ==========================================
  // LOAD NOTIFICATION COUNT
  // ==========================================

  const loadNotificationCount = async () => {
    try {
      const token =
        localStorage.getItem("token");

      const response = await axios.get(
  `${API_URL}/notifications`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      const notifications =
        response.data.notifications || [];

      const unread = notifications.filter(
        (notification) =>
          !notification.read
      ).length;

      setNotificationCount(unread);
    } catch (error) {
      console.error(
        "Failed to load notification count:",
        error
      );
    }
  };

  // ==========================================
  // LOAD DASHBOARD ANALYTICS
  // ==========================================

  const loadDashboardAnalytics =
    async () => {
      try {
        const token =
          localStorage.getItem("token");

        if (!token) {
          return;
        }

        setLoadingAnalytics(true);
        setAnalyticsError("");

        const response = await axios.get(
  `${API_URL}/analytics/dashboard`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

        if (response.data.success) {
          setAnalytics(
            response.data.analytics
          );
        }
      } catch (error) {
        console.error(
          "Load dashboard analytics error:",
          error.response?.data ||
            error.message
        );

        setAnalyticsError(
          error.response?.data?.message ||
            "Failed to load analytics."
        );
      } finally {
        setLoadingAnalytics(false);
      }
    };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchMeetings();
    loadDashboardAnalytics();
    loadNotificationCount();
  }, []);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  // ==========================================
  // OPEN CREATE MEETING
  // ==========================================

  const openCreateMeeting = () => {
    setError("");
    setSuccess("");

    setFormData({
      title: "",
      description: "",
      meetingDate: "",
      meetingTime: "",
      meetingEndTime: "",
    });

    setShowCreateModal(true);
  };

  // ==========================================
  // CLOSE CREATE MEETING
  // ==========================================

  const closeCreateMeeting = () => {
    if (!loading) {
      setShowCreateModal(false);
      setError("");
      setSuccess("");
    }
  };

  // ==========================================
  // OPEN JOIN MEETING
  // ==========================================

  const openJoinMeeting = () => {
    setMeetingId("");
    setJoinError("");
    setError("");
    setSuccess("");
    setShowJoinModal(true);
  };

  // ==========================================
  // CLOSE JOIN MEETING
  // ==========================================

  const closeJoinMeeting = () => {
    if (joiningMeeting) {
      return;
    }

    setShowJoinModal(false);
    setMeetingId("");
    setJoinError("");
  };

  // ==========================================
  // JOIN MEETING
  // ==========================================

  const handleJoinMeeting = async (roomId) => {
    const trimmedMeetingId =
      roomId?.trim();

    if (!trimmedMeetingId) {
      setJoinError(
        "Please enter a Meeting ID."
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setJoiningMeeting(true);
    setJoinError("");

    try {
      await axios.get(
  `${API_URL}/meetings/${trimmedMeetingId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      setShowJoinModal(false);
      setMeetingId("");
      setJoinError("");

      navigate(
        `/meeting/${trimmedMeetingId}`
      );
    } catch (error) {
      console.error(
        "Join meeting validation error:",
        error.response?.data ||
          error.message
      );

      const status =
        error.response?.status;

      const message =
        error.response?.data?.message;

      if (status === 410) {
        setJoinError(
          message ||
            "This meeting has already ended. The Meeting ID is no longer active."
        );
      } else if (status === 404) {
        setJoinError(
          message ||
            "This Meeting ID is invalid or does not exist."
        );
      } else {
        setJoinError(
          message ||
            "Unable to access this meeting. Please try again."
        );
      }
    } finally {
      setJoiningMeeting(false);
    }
  };

  // ==========================================
  // JOIN MEETING FROM INPUT
  // ==========================================

  const handleJoinFromInput = () => {
    handleJoinMeeting(meetingId);
  };

  // ==========================================
  // HANDLE FORM CHANGE
  // ==========================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // CREATE MEETING
  // ==========================================

  const handleCreateMeeting = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError(
        "Please enter a meeting title."
      );
      return;
    }

    if (!formData.meetingDate) {
      setError(
        "Please select a meeting date."
      );
      return;
    }

    if (!formData.meetingTime) {
      setError(
        "Please select a start time."
      );
      return;
    }

    if (!formData.meetingEndTime) {
      setError(
        "Please select an end time."
      );
      return;
    }

  const [year, month, day] =
  formData.meetingDate.split("-").map(Number);

const [startHour, startMinute] =
  formData.meetingTime.split(":").map(Number);

const [endHour, endMinute] =
  formData.meetingEndTime.split(":").map(Number);

const startDate = new Date(
  year,
  month - 1,
  day,
  startHour,
  startMinute,
  0
);

const endDate = new Date(
  year,
  month - 1,
  day,
  endHour,
  endMinute,
  0
);

if (startDate <= new Date()) {
  setError(
    "Meeting start time must be in the future."
  );
  return;
}

if (endDate <= startDate) {
  setError(
    "End time must be after start time."
  );
  return;
}

setLoading(true);

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const meetingData = {
  title: formData.title.trim(),
  description: formData.description.trim(),
  startTime: startDate.toISOString(),
  endTime: endDate.toISOString(),
};

      await axios.post(
  `${API_URL}/meetings`,
  meetingData,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type":
        "application/json",
    },
  }
);

      setSuccess(
        "Meeting created successfully!"
      );

      await fetchMeetings();
      await loadDashboardAnalytics();

      setFormData({
        title: "",
        description: "",
        meetingDate: "",
        meetingTime: "",
        meetingEndTime: "",
      });

      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess("");
      }, 1000);
    } catch (error) {
      console.error(
        "Create meeting error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to create meeting. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CANCEL MEETING
  // ==========================================

  const handleCancelMeeting = async (
    roomId
  ) => {
    const confirmCancel =
      window.confirm(
        "Are you sure you want to cancel this meeting?"
      );

    if (!confirmCancel) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      await axios.put(
  `${API_URL}/meetings/${roomId}/cancel`,
  {},
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      setSuccess(
        "Meeting cancelled successfully."
      );

      await fetchMeetings();
      await loadDashboardAnalytics();

      setTimeout(() => {
        setSuccess("");
      }, 2000);
    } catch (error) {
      console.error(
        "Cancel meeting error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to cancel meeting."
      );
    }
  };

  // ==========================================
  // FORMAT MEETING HOURS
  // ==========================================

  const formatDuration = (
    totalMinutes = 0
  ) => {
    const hours = Math.floor(
      totalMinutes / 60
    );

    const minutes =
      totalMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="dashboard-home">

      {/* ==========================================
          MAIN
      ========================================== */}

      <main className="dashboard-home-content">

        {/* ==========================================
            HEADER
        ========================================== */}

        {/* ==========================================
            QUICK ACTIONS
        ========================================== */}

        <section className="quick-actions">

          <button
            className="create-meeting"
            onClick={openCreateMeeting}
          >

            <div>
              <Plus size={22} />
            </div>

            <span>

              <strong>
                Create Meeting
              </strong>

              <small>
                Start a new meeting
              </small>

            </span>

          </button>

          <button
            className="join-meeting"
            onClick={openJoinMeeting}
          >

            <div>
              <Video size={20} />
            </div>

            <span>

              <strong>
                Join Meeting
              </strong>

              <small>
                Enter a meeting room
              </small>

            </span>

          </button>

        </section>

        {/* ==========================================
            GLOBAL SUCCESS / ERROR
        ========================================== */}

        {error &&
          !showCreateModal && (
            <div className="dashboard-error">
              {error}
            </div>
          )}

        {success &&
          !showCreateModal && (
            <div className="dashboard-success">
              {success}
            </div>
          )}

        {/* ==========================================
            STATS
        ========================================== */}

        <section className="stats-grid">

          <StatCard
            icon={<Video />}
            title="Total Meetings"
            value={
              loadingAnalytics
                ? "..."
                : analytics?.totalMeetings ??
                  0
            }
            description="Your meetings"
          />

          <StatCard
            icon={<CheckSquare />}
            title="Completed Meetings"
            value={
              loadingAnalytics
                ? "..."
                : analytics?.completedMeetings ??
                  0
            }
            description="Completed"
          />

          <StatCard
            icon={<Clock />}
            title="Meeting Hours"
            value={
              loadingAnalytics
                ? "..."
                : formatDuration(
                    analytics?.totalDurationMinutes ??
                      0
                  )
            }
            description="Total duration"
          />

          <StatCard
            icon={<CheckSquare />}
            title="Action Items"
            value={
              loadingAnalytics
                ? "..."
                : analytics?.totalActionItems ??
                  0
            }
            description="Total tasks"
          />

        </section>

        {analyticsError && (
          <div className="dashboard-error">
            {analyticsError}
          </div>
        )}

        {/* ==========================================
            RECENT MEETINGS
        ========================================== */}

        <section className="meetings-section">

          <div className="section-title">

            <div>

              <h2>
                Recent Meetings
              </h2>

              <p>
                Your latest meetings will
                appear here.
              </p>

            </div>

            <button
              onClick={() =>
                navigate(
                  "/meeting-history"
                )
              }
            >
              View all
              <ArrowRight size={16} />
            </button>

          </div>

          {loadingMeetings ? (

            <div className="empty-meetings">

              <p>
                Loading meetings...
              </p>

            </div>

          ) : error &&
            meetings.length === 0 ? (

            <div className="empty-meetings">

              <div className="empty-icon">
                <Video size={25} />
              </div>

              <h3>
                Unable to load meetings
              </h3>

              <p>
                {error}
              </p>

              <button
                onClick={() => {
                  setError("");
                  setLoadingMeetings(true);
                  fetchMeetings();
                }}
              >
                Try Again
              </button>

            </div>

          ) : meetings.length === 0 ? (

            <div className="empty-meetings">

              <div className="empty-icon">
                <Calendar size={25} />
              </div>

              <h3>
                No meetings yet
              </h3>

              <p>
                Create your first meeting
                and start collaborating
                with your team.
              </p>

              <button
                onClick={
                  openCreateMeeting
                }
              >
                <Plus size={17} />
                Create Meeting
              </button>

            </div>

          ) : (

            <div className="meetings-list">

              {meetings
                .slice(0, 5)
                .map((meeting) => (

                  <div
                    className="meeting-card"
                    key={meeting._id}
                  >

                    <div className="meeting-card-icon">
                      <Video size={20} />
                    </div>

                    <div className="meeting-card-info">

                      <h3>
                        {meeting.title}
                      </h3>

                      <p>
                        {meeting.description ||
                          "No description provided"}
                      </p>

                      <span>
                        <Calendar size={14} />

                        {new Date(
                          meeting.startTime
                        ).toLocaleString([], {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {meeting.endTime && (
                        <span className="meeting-end-time">

                          <Clock size={14} />

                          Ends:{" "}

                          {new Date(
                            meeting.endTime
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}

                        </span>
                      )}

                      {meeting.roomId && (
                        <small className="meeting-room-id">
                          Room ID:{" "}
                          {meeting.roomId}
                        </small>
                      )}

                    </div>

                    <div className="meeting-card-actions">

                      <span
                        className={`meeting-status ${meeting.status}`}
                      >
                        {meeting.status}
                      </span>

                      {(meeting.status ===
                        "scheduled" ||
                        meeting.status ===
                          "live") && (

                        <button
                          className="meeting-join-button"
                          onClick={() =>
                            handleJoinMeeting(
                              meeting.roomId
                            )
                          }
                        >
                          Join
                        </button>

                      )}

                  {meeting.host?._id === user?.id &&
  (meeting.status === "scheduled" ||
   meeting.status === "live") && (

  <button
    className="meeting-cancel-button"
    onClick={() =>
      handleCancelMeeting(meeting.roomId)
    }
  >
    Cancel
  </button>

)}

                    </div>

                  </div>

                ))}

            </div>

          )}

        </section>

      </main>

      {/* ==========================================
          JOIN MEETING MODAL
      ========================================== */}

      {showJoinModal && (

        <div
          className="modal-overlay join-modal-overlay"
          onClick={closeJoinMeeting}
        >

          <div
            className="meeting-modal join-meeting-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div className="join-modal-title">

                <div className="join-modal-icon">
                  <Video size={20} />
                </div>

                <div>

                  <h2>
                    Join Meeting
                  </h2>

                  <p>
                    Enter the Meeting ID to continue.
                  </p>

                </div>

              </div>

              <button
                className="modal-close"
                onClick={closeJoinMeeting}
                disabled={joiningMeeting}
                type="button"
              >
                <X size={20} />
              </button>

            </div>

            {joinError && (
              <div className="join-error-box">

                <div className="join-error-icon">
                  !
                </div>

                <div>

                  <strong>
                    {joinError.includes(
                      "ended"
                    ) ||
                    joinError.includes(
                      "no longer active"
                    )
                      ? "Meeting Completed"
                      : joinError.includes(
                          "cancelled"
                        )
                      ? "Meeting Cancelled"
                      : "Unable to Join Meeting"}
                  </strong>

                  <p>
                    {joinError}
                  </p>

                  {joinError.includes(
                    "ended"
                  ) ||
                  joinError.includes(
                    "no longer active"
                  ) ? (
                    <span>
                      Don’t miss your next meeting!
                      Check your dashboard for
                      upcoming meetings.
                    </span>
                  ) : null}

                </div>

              </div>
            )}

            <form
              className="join-meeting-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleJoinFromInput();
              }}
            >

              <label htmlFor="meetingId">
                Meeting ID
              </label>

              <div className="meeting-id-input-wrap">

                <Video size={18} />

                <input
                  id="meetingId"
                  type="text"
                  placeholder="Enter meeting room ID"
                  value={meetingId}
                  onChange={(e) => {
                    setMeetingId(
                      e.target.value
                    );

                    if (joinError) {
                      setJoinError("");
                    }
                  }}
                  autoFocus
                  disabled={joiningMeeting}
                />

              </div>

              <div className="join-modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeJoinMeeting}
                  disabled={joiningMeeting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-meeting-button"
                  disabled={
                    joiningMeeting ||
                    !meetingId.trim()
                  }
                >
                  {joiningMeeting
                    ? "Checking..."
                    : "Join Meeting"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ==========================================
          CREATE MEETING MODAL
      ========================================== */}

      {showCreateModal && (

        <div className="modal-overlay">

          <div
            className="meeting-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <h2>
                  Create Meeting
                </h2>

                <p>
                  Schedule a new IntellMeet
                  session.
                </p>

              </div>

              <button
                className="modal-close"
                onClick={
                  closeCreateMeeting
                }
                disabled={loading}
              >
                <X size={20} />
              </button>

            </div>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}

            {success && (
              <div className="modal-success">
                {success}
              </div>
            )}

            <form
              className="meeting-form"
              onSubmit={
                handleCreateMeeting
              }
            >

              <label htmlFor="title">
                Meeting Title
              </label>

              <input
                id="title"
                type="text"
                name="title"
                placeholder="e.g. Team Standup"
                value={formData.title}
                onChange={handleChange}
                required
              />

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                placeholder="What is this meeting about?"
                value={
                  formData.description
                }
                onChange={handleChange}
                rows="3"
              />

              <label htmlFor="meetingDate">
                Meeting Date
              </label>

              <input
                id="meetingDate"
                type="date"
                name="meetingDate"
                value={
                  formData.meetingDate
                }
                onChange={handleChange}
                required
              />

              <label htmlFor="meetingTime">
                Start Time
              </label>

              <input
                id="meetingTime"
                type="time"
                name="meetingTime"
                value={
                  formData.meetingTime
                }
                onChange={handleChange}
                required
              />

              <label htmlFor="meetingEndTime">
                End Time
              </label>

              <input
                id="meetingEndTime"
                type="time"
                name="meetingEndTime"
                value={
                  formData.meetingEndTime
                }
                onChange={handleChange}
                required
              />

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeCreateMeeting
                  }
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-meeting-button"
                  disabled={loading}
                >
                  {loading
                    ? "Creating..."
                    : "Create Meeting"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================

function StatCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <p>
          {title}
        </p>

        <h3>
          {value}
        </h3>

        <span>
          {description}
        </span>

      </div>

    </div>
  );
}

export default Dashboard;