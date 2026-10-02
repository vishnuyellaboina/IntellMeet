import { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  Sparkles,
  CheckSquare,
  Copy,
  Check,
  Video,
  MoreVertical,
  UserCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "./MeetingDetails.css";

const API_URL = import.meta.env.VITE_API_URL;
const MeetingDetails = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [actionItems, setActionItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadMeetingDetails = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          meetingResponse,
          transcriptResponse,
          insightsResponse,
          actionItemsResponse,
        ] = await Promise.allSettled([
          axios.get(`${API_URL}/meetings/history/${roomId}`, {
            headers,
          }),

          axios.get(`${API_URL}/transcripts/${roomId}`, {
            headers,
          }),

          axios.get(`${API_URL}/ai/meeting/${roomId}/saved`, {
            headers,
          }),

          axios.get(`${API_URL}/action-items/meeting/${roomId}`, {
            headers,
          }),
        ]);

        if (
          meetingResponse.status === "fulfilled" &&
          meetingResponse.value.data.success
        ) {
          setMeeting(meetingResponse.value.data.meeting);
        }

        if (
          transcriptResponse.status === "fulfilled" &&
          transcriptResponse.value.data.success
        ) {
          setTranscripts(
            transcriptResponse.value.data.transcripts || []
          );
        }

        if (
          insightsResponse.status === "fulfilled" &&
          insightsResponse.value.data.success
        ) {
          setInsights(insightsResponse.value.data.insights);
        }

        if (
          actionItemsResponse.status === "fulfilled" &&
          actionItemsResponse.value.data.success
        ) {
          setActionItems(
            actionItemsResponse.value.data.actionItems || []
          );
        }

        if (meetingResponse.status === "rejected") {
          setError("Failed to load meeting details.");
        }
      } catch (error) {
        console.error("Load meeting details error:", error);
        setError("Failed to load meeting details.");
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      loadMeetingDetails();
    }
  }, [roomId, navigate]);

  const formatDate = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFullDateTime = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = () => {
    if (!meeting?.startTime || !meeting?.endTime) {
      return 0;
    }

    return Math.max(
      0,
      Math.round(
        (new Date(meeting.endTime) -
          new Date(meeting.startTime)) /
          (1000 * 60)
      )
    );
  };

  const getStatus = () => {
    if (meeting?.status === "cancelled") {
      return "Cancelled";
    }

    if (meeting?.status === "completed") {
      return "Completed";
    }

    if (
      meeting?.endTime &&
      new Date() >= new Date(meeting.endTime)
    ) {
      return "Completed";
    }

    if (
      meeting?.startTime &&
      new Date() >= new Date(meeting.startTime)
    ) {
      return "Live";
    }

    return "Scheduled";
  };

  const handleCopyMeetingId = async () => {
    if (!meeting?.roomId) return;

    try {
      await navigator.clipboard.writeText(meeting.roomId);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy Meeting ID error:", error);
    }
  };

  const handleViewTranscript = () => {
    document
      .getElementById("transcript-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const handleViewActionItems = () => {
    navigate("/dashboard/action-items");
  };

  const generateAIInsights = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (!roomId) {
        setAiError("Meeting room ID is missing.");
        return;
      }

      setGeneratingAI(true);
      setAiError("");

      const response = await axios.get(
        `${API_URL}/ai/meeting/${roomId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setInsights(response.data.insights);

        try {
          const actionResponse = await axios.get(
            `${API_URL}/action-items/meeting/${roomId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (actionResponse.data.success) {
            setActionItems(
              actionResponse.data.actionItems || []
            );
          }
        } catch (actionError) {
          console.error(
            "Refresh action items error:",
            actionError.response?.data ||
              actionError.message
          );
        }
      }
    } catch (error) {
      console.error(
        "Generate AI insights error:",
        error.response?.data ||
          error.message
      );

      setAiError(
        error.response?.data?.message ||
          "Failed to generate AI insights."
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="meeting-details-page">
        <div className="details-message">
          <div className="loading-spinner"></div>
          <span>Loading meeting details...</span>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="meeting-details-page">
        <div className="details-error">
          <FileText size={32} />
          <h2>Meeting Not Found</h2>
          <p>{error || "Meeting not found."}</p>

          <button
            className="primary-details-button"
            onClick={() => navigate("/dashboard/meetings")}
          >
            <ArrowLeft size={17} />
            Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  const status = getStatus();

  return (
    <div className="meeting-details-page">

      {/* ==============================
          HEADER
      =============================== */}

      <header className="meeting-details-header">

        <div className="details-header-left">

          <button
            className="details-back-button"
            onClick={() =>
              navigate("/dashboard/meetings")
            }
          >
            <ArrowLeft size={18} />
          
          </button>

          <div className="details-header-divider"></div>

          <div className="meeting-title-block">

  <div className="meeting-title-row">

    <h1>{meeting.title}</h1>

    <div className="meeting-id-row">

      <span>Meeting ID:</span>

      <strong>
        {meeting.roomId}
      </strong>

      <button
        className="mini-copy-button"
        onClick={handleCopyMeetingId}
        title="Copy Meeting ID"
      >
        {copied ? (
          <Check size={14} />
        ) : (
          <Copy size={14} />
        )}
      </button>

      <span
        className={`meeting-status-badge ${status.toLowerCase()}`}
      >
        <Video size={13} />
        {status}
      </span>

    </div>

  </div>

  <p>
    {meeting.description || "Meeting details"}
  </p>

</div>

        </div>

        <div className="details-header-actions">
           {/* AI REFRESH */}

      {insights && (
        <div className="ai-refresh-row">

          <button
            className="refresh-ai-button"
            onClick={generateAIInsights}
            disabled={generatingAI}
          >

            <RefreshCw
              size={15}
              className={
                generatingAI
                  ? "spinning"
                  : ""
              }
            />

            {generatingAI
              ? "Generating..."
              : "Refresh AI Insights"}

          </button>

        </div>
      )}
        </div>

      </header>


      {/* ==============================
          MEETING INFO
      =============================== */}

      <section className="meeting-info-card">

        <div className="meeting-info-item">

          <div className="meeting-info-icon blue">
            <Calendar size={20} />
          </div>

          <div>
            <span>Date</span>

            <strong>
              {formatDate(meeting.startTime)}
            </strong>

            <small>
              {new Date(
                meeting.startTime
              ).toLocaleDateString("en-IN", {
                weekday: "long",
              })}
            </small>
          </div>

        </div>


        <div className="meeting-info-item">

          <div className="meeting-info-icon purple">
            <Clock size={20} />
          </div>

          <div>
            <span>Time</span>

            <strong>
              {formatTime(meeting.startTime)}
            </strong>

            <small>
              IST (GMT+5:30)
            </small>
          </div>

        </div>


        <div className="meeting-info-item">

          <div className="meeting-info-icon violet">
            <Clock size={20} />
          </div>

          <div>
            <span>Duration</span>

            <strong>
              {getDuration()} min
            </strong>

            <small>
              Meeting duration
            </small>
          </div>

        </div>


        <div className="meeting-info-item">

          <div className="meeting-info-icon cyan">
            <Users size={20} />
          </div>

          <div>
            <span>Participants</span>

            <strong>
              {meeting.participants?.length ||
                0}
            </strong>

            <small>
              Meeting participants
            </small>
          </div>

        </div>

      </section>


      {/* ==============================
          AI SUMMARY
      =============================== */}

      {insights && (
        <section className="details-section ai-summary-section">

          <div className="section-header">

            <div className="section-heading">

              <div className="section-icon ai-icon">
                <Sparkles size={19} />
              </div>

              <div>
                <h2>AI Meeting Summary</h2>
                <p>
                  Key insights generated from
                  your meeting
                </p>
              </div>

            </div>

            <button
              className="outline-section-button"
              onClick={handleViewTranscript}
            >
              <FileText size={16} />
              View Transcript
            </button>

          </div>


          {aiError && (
            <div className="ai-error">
              {aiError}
            </div>
          )}


          <div className="summary-grid">

            {/* OVERVIEW */}

            <div className="summary-column">

              <div className="summary-column-heading">

                <div className="summary-icon blue">
                  <FileText size={17} />
                </div>

                <h3>Overview</h3>

              </div>

              <p>
                {insights.summary ||
                  "No summary available."}
              </p>

            </div>


            {/* KEY POINTS */}

            <div className="summary-column">

              <div className="summary-column-heading">

                <div className="summary-icon purple">
                  <CheckSquare size={17} />
                </div>

                <h3>Key Points</h3>

              </div>

              {insights.keyPoints?.length > 0 ? (
                <ul>
                  {insights.keyPoints.map(
                    (point, index) => (
                      <li key={index}>
                        {point}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p>
                  No key points identified.
                </p>
              )}

            </div>


            {/* DECISIONS */}

            <div className="summary-column">

              <div className="summary-column-heading">

                <div className="summary-icon green">
                  <Check size={17} />
                </div>

                <h3>Decisions</h3>

              </div>

              {insights.decisions?.length > 0 ? (
                <ul>
                  {insights.decisions.map(
                    (decision, index) => (
                      <li key={index}>
                        {decision}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p>
                  No decisions identified.
                </p>
              )}

            </div>

          </div>

        </section>
      )}


      {/* ==============================
          MAIN CONTENT GRID
      =============================== */}

      <div className="details-main-grid">

        {/* ============================
            ACTION ITEMS
        ============================= */}

        <section className="details-section action-items-section">

          <div className="section-header">

            <div className="section-heading">

              <div className="section-icon action-icon">
                <CheckSquare size={19} />
              </div>

              <div>
                <h2>Action Items</h2>
                <p>
                  Tasks identified from this meeting
                </p>
              </div>

            </div>

            {actionItems.length > 0 && (
              <button
                className="outline-section-button"
                onClick={handleViewActionItems}
              >
                View all
                <ExternalLink size={15} />
              </button>
            )}

          </div>


          {actionItems.length > 0 ? (

            <div className="action-table">

              <div className="action-table-header">
                <span>Task</span>
                <span>Assignee</span>
                <span>Priority</span>
                <span>Status</span>
              </div>

              {actionItems.map((item) => (

                <div
                  className="action-table-row"
                  key={item._id}
                >

                  <div className="action-task">

                    <span className="action-checkbox">
                      <CheckSquare size={16} />
                    </span>

                    <strong>
                      {item.task}
                    </strong>

                  </div>


                  <div className="action-assignee">

                    <div className="assignee-avatar">
                      {(
                        item.assignee ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <span>
                      {item.assignee ||
                        "Unassigned"}
                    </span>

                  </div>


                  <span
                    className={`priority-badge ${
                      (
                        item.priority ||
                        "medium"
                      ).toLowerCase()
                    }`}
                  >
                    {item.priority ||
                      "medium"}
                  </span>


                  <span
                    className={`action-status ${
                      (
                        item.status ||
                        "pending"
                      ).toLowerCase().replace(
                        /\s+/g,
                        "-"
                      )
                    }`}
                  >
                    {item.status ||
                      "pending"}
                  </span>

                </div>

              ))}

            </div>

          ) : (

            <div className="details-empty compact-empty">
              <CheckSquare size={28} />
              <span>
                No action items available.
              </span>
            </div>

          )}

        </section>


        {/* ============================
            PARTICIPANTS
        ============================= */}

        <section className="details-section participants-section">

          <div className="section-header">

            <div className="section-heading">

              <div className="section-icon participant-icon">
                <Users size={19} />
              </div>

              <div>
                <h2>Participants</h2>
                <p>
                  {meeting.participants?.length ||
                    0} participant
                  {meeting.participants?.length ===
                  1
                    ? ""
                    : "s"}
                </p>
              </div>

            </div>

            <span className="participant-count">
              {meeting.participants?.length ||
                0}
            </span>

          </div>


          <div className="participants-list">

            {meeting.participants?.length > 0 ? (

              meeting.participants.map(
                (participant) => (

                  <div
                    className="participant-row"
                    key={
                      participant._id ||
                      participant.email
                    }
                  >

                    <div className="participant-avatar">

                      {(
                        participant.name ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}

                    </div>

                    <div className="participant-info">

                      <strong>
                        {participant.name ||
                          "Unknown User"}
                      </strong>

                      <span>
                        {participant.email ||
                          ""}
                      </span>

                    </div>

                    {meeting.host?._id ===
                      participant._id && (
                      <span className="host-badge">
                        Host
                      </span>
                    )}

                  </div>

                )
              )

            ) : (

              <div className="participant-empty">
                <UserCircle size={30} />
                <span>
                  No participant information.
                </span>
              </div>

            )}

          </div>

        </section>

      </div>


      {/* ==============================
          TRANSCRIPT
      =============================== */}

      <section
        className="details-section transcript-section"
        id="transcript-section"
      >

        <div className="section-header">

          <div className="section-heading">

            <div className="section-icon transcript-icon">
              <FileText size={19} />
            </div>

            <div>
              <h2>Transcript</h2>
              <p>
                Conversation recorded during
                the meeting
              </p>
            </div>

          </div>

          <span className="transcript-count">
            {transcripts.length} entries
          </span>

        </div>


        {transcripts.length > 0 ? (

          <div className="transcript-history">

            {transcripts.map((item) => (

              <div
                className="transcript-history-item"
                key={item._id}
              >

                <div className="transcript-avatar">
                  {(item.speaker || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="transcript-content">

                  <div className="transcript-meta">

                    <strong>
                      {item.speaker ||
                        "Unknown"}
                    </strong>

                    <small>
                      {formatTime(
                        item.timestamp
                      )}
                    </small>

                  </div>

                  <p>
                    {item.text}
                  </p>

                </div>

              </div>

            ))}

          </div>

        ) : (

          <div className="details-empty">
            <FileText size={30} />
            <span>
              No transcript available.
            </span>
          </div>

        )}

      </section>


      {/* ==============================
          MEETING DETAILS
      =============================== */}

      <section className="details-section meeting-meta-section">

        <div className="section-header">

          <div className="section-heading">

            <div className="section-icon details-icon">
              <FileText size={19} />
            </div>

            <div>
              <h2>Meeting Details</h2>
              <p>
                Information about this meeting
              </p>
            </div>

          </div>

        </div>


        <div className="meeting-meta-grid">

          <div>
            <span>Title</span>
            <strong>{meeting.title}</strong>
          </div>

          <div>
            <span>Meeting ID</span>
            <strong>{meeting.roomId}</strong>
          </div>

          <div>
            <span>Date & Time</span>
            <strong>
              {formatFullDateTime(
                meeting.startTime
              )}
            </strong>
          </div>

          <div>
            <span>Duration</span>
            <strong>
              {getDuration()} min
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong
              className={`meta-status ${status.toLowerCase()}`}
            >
              {status}
            </strong>
          </div>

          <div>
            <span>Created By</span>
            <strong>
              {meeting.host?.name ||
                "Unknown"}
            </strong>
          </div>

        </div>

      </section>


     
    </div>
  );
};

export default MeetingDetails;