import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Calendar,
  Clock,
  Download,
  Search,
  Users,
  Video,
  ChevronDown,
  Trash2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./MeetingHistory.css";
const API_URL = import.meta.env.VITE_API_URL;

const MeetingHistory = () => {
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  // DELETE MODAL
  const [deleteMeeting, setDeleteMeeting] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // ==========================================
  // LOAD MEETING HISTORY
  // ==========================================

  useEffect(() => {
    const loadMeetingHistory = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/meetings/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          setMeetings(response.data.meetings || []);
        }
      } catch (error) {
        console.error(
          "Load meeting history error:",
          error.response?.data || error.message
        );

        setError(
          error.response?.data?.message ||
            "Failed to load meeting history."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMeetingHistory();
  }, [navigate]);

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // FORMAT TIME
  // ==========================================

  const formatTime = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==========================================
  // GET DURATION
  // ==========================================

  const getDuration = (meeting) => {
    if (meeting.durationMinutes !== undefined) {
      return meeting.durationMinutes;
    }

    if (meeting.startTime && meeting.endTime) {
      return Math.max(
        0,
        Math.round(
          (new Date(meeting.endTime) -
            new Date(meeting.startTime)) /
            (1000 * 60)
        )
      );
    }

    return 0;
  };

  // ==========================================
  // GET STATUS
  // ==========================================

  const getStatus = (meeting) => {
    return (meeting.status || "completed").toLowerCase();
  };

  // ==========================================
  // COUNTS
  // ==========================================

  const counts = useMemo(() => {
    return {
      all: meetings.length,

      completed: meetings.filter(
        (meeting) =>
          getStatus(meeting) === "completed"
      ).length,

      cancelled: meetings.filter(
        (meeting) =>
          getStatus(meeting) === "cancelled"
      ).length,

      noShow: meetings.filter(
        (meeting) =>
          getStatus(meeting) === "no-show" ||
          getStatus(meeting) === "noshow"
      ).length,
    };
  }, [meetings]);

  // ==========================================
  // FILTER MEETINGS
  // ==========================================

  const filteredMeetings = useMemo(() => {
    let result = [...meetings];

    // STATUS FILTER
    if (activeFilter !== "all") {
      if (activeFilter === "no-show") {
        result = result.filter((meeting) => {
          const status = getStatus(meeting);

          return (
            status === "no-show" ||
            status === "noshow"
          );
        });
      } else {
        result = result.filter(
          (meeting) =>
            getStatus(meeting) === activeFilter
        );
      }
    }

    // SEARCH
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();

      result = result.filter((meeting) => {
        const title = meeting.title || "";
        const description =
          meeting.description || "";

        const participantNames =
          meeting.participants
            ?.map(
              (participant) =>
                participant?.name || ""
            )
            .join(" ") || "";

        return (
          title.toLowerCase().includes(query) ||
          description
            .toLowerCase()
            .includes(query) ||
          participantNames
            .toLowerCase()
            .includes(query)
        );
      });
    }

    // DATE FILTER
    if (dateFilter !== "all") {
      const now = new Date();

      result = result.filter((meeting) => {
        if (!meeting.startTime) return false;

        const meetingDate = new Date(
          meeting.startTime
        );

        if (dateFilter === "7") {
          const sevenDaysAgo = new Date(now);

          sevenDaysAgo.setDate(
            now.getDate() - 7
          );

          return meetingDate >= sevenDaysAgo;
        }

        if (dateFilter === "30") {
          const thirtyDaysAgo = new Date(now);

          thirtyDaysAgo.setDate(
            now.getDate() - 30
          );

          return meetingDate >= thirtyDaysAgo;
        }

        if (dateFilter === "90") {
          const ninetyDaysAgo = new Date(now);

          ninetyDaysAgo.setDate(
            now.getDate() - 90
          );

          return meetingDate >= ninetyDaysAgo;
        }

        return true;
      });
    }

    // SORT
    result.sort((a, b) => {
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);

      return sortOrder === "newest"
        ? dateB - dateA
        : dateA - dateB;
    });

    return result;
  }, [
    meetings,
    activeFilter,
    searchTerm,
    dateFilter,
    sortOrder,
  ]);

  // ==========================================
  // PARTICIPANT INITIAL
  // ==========================================

  const getParticipantInitial = (
    participant,
    index
  ) => {
    if (participant?.name) {
      return participant.name
        .charAt(0)
        .toUpperCase();
    }

    if (index === 0 && user?.name) {
      return user.name
        .charAt(0)
        .toUpperCase();
    }

    return String.fromCharCode(65 + index);
  };

  // ==========================================
  // EXPORT HISTORY
  // ==========================================

  const exportHistory = () => {
    if (!filteredMeetings.length) {
      return;
    }

    const headers = [
      "Meeting",
      "Description",
      "Date",
      "Time",
      "Participants",
      "Duration",
      "Status",
      "Room ID",
    ];

    const rows = filteredMeetings.map(
      (meeting) => [
        meeting.title || "",
        meeting.description || "",
        formatDate(meeting.startTime),
        formatTime(meeting.startTime),
        meeting.participants?.length || 0,
        `${getDuration(meeting)} min`,
        getStatus(meeting),
        meeting.roomId || "",
      ]
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "intellmeet-history.csv";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // ==========================================
  // DELETE MEETING
  // ==========================================

  const handleDeleteMeeting = async () => {
    if (!deleteMeeting) {
      return;
    }

    try {
      setDeleting(true);

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      await axios.delete(
        `${API_URL}/meetings/${deleteMeeting._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMeetings((prevMeetings) =>
        prevMeetings.filter(
          (item) =>
            item._id !== deleteMeeting._id
        )
      );

      setDeleteMeeting(null);
    } catch (error) {
      console.error(
        "Delete meeting error:",
        error.response?.data ||
          error.message
      );

      alert(
        error.response?.data?.message ||
          "Failed to delete meeting. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="meeting-history-page">

      {/* TOP BAR */}

      {/* PAGE */}

      <main className="meeting-history-content">

        {/* PAGE HEADER */}

        <div className="history-page-header">

          <div>
            <h1>Meeting History</h1>

            <p>
              View your previous meetings,
              participants and duration.
            </p>
          </div>

          <button
            className="export-history-button"
            onClick={exportHistory}
          >
            <Download size={17} />
            Export History
          </button>

        </div>

        {/* FILTER AREA */}

        <div className="history-filter-row">

          <div className="history-status-filters">

            <button
              className={
                activeFilter === "all"
                  ? "history-filter active"
                  : "history-filter"
              }
              onClick={() =>
                setActiveFilter("all")
              }
            >
              <span className="filter-dot blue" />
              All ({counts.all})
            </button>

            <button
              className={
                activeFilter === "completed"
                  ? "history-filter active"
                  : "history-filter"
              }
              onClick={() =>
                setActiveFilter("completed")
              }
            >
              <span className="filter-dot green" />
              Completed ({counts.completed})
            </button>

            <button
              className={
                activeFilter === "cancelled"
                  ? "history-filter active"
                  : "history-filter"
              }
              onClick={() =>
                setActiveFilter("cancelled")
              }
            >
              <span className="filter-dot red" />
              Cancelled ({counts.cancelled})
            </button>

            <button
              className={
                activeFilter === "no-show"
                  ? "history-filter active"
                  : "history-filter"
              }
              onClick={() =>
                setActiveFilter("no-show")
              }
            >
              <span className="filter-dot gray" />
              No Show ({counts.noShow})
            </button>

          </div>

          <div className="history-selects">

            <label className="history-select">

              <Calendar size={17} />

              <select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value)
                }
              >
                <option value="all">
                  All Time
                </option>

                <option value="7">
                  Last 7 Days
                </option>

                <option value="30">
                  Last 30 Days
                </option>

                <option value="90">
                  Last 90 Days
                </option>
              </select>

              <ChevronDown size={15} />

            </label>

            <label className="history-select">

              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value)
                }
              >
                <option value="newest">
                  Newest First
                </option>

                <option value="oldest">
                  Oldest First
                </option>
              </select>

              <ChevronDown size={15} />

            </label>

          </div>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="history-message">
            Loading meeting history...
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="history-error">
            {error}
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredMeetings.length === 0 && (
            <div className="history-empty">

              <Video size={42} />

              <h2>
                No meeting history
              </h2>

              <p>
                No meetings match your
                current filters.
              </p>

            </div>
          )}

        {/* TABLE */}

        {!loading &&
          !error &&
          filteredMeetings.length > 0 && (

            <div className="history-table-wrapper">

              {/* TABLE HEADER */}

              <div className="history-table-header">

                <div>Meeting</div>
                <div>Date & Time</div>
                <div>Participants</div>
                <div>Duration</div>
                <div>Status</div>
                <div>Actions</div>

              </div>

              {/* ROWS */}

              <div className="history-table-body">

                {filteredMeetings.map(
                  (meeting) => {

                    const participants =
                      meeting.participants || [];

                    const status =
                      getStatus(meeting);

                    return (
                      <div
                        className="history-table-row"
                        key={meeting._id}
                      >

                        {/* MEETING */}

                        <div className="history-meeting-cell">

                          <div className="history-meeting-icon">
                            <Video size={19} />
                          </div>

                          <div className="history-meeting-info">

                            <h3>
                              {meeting.title ||
                                "Untitled Meeting"}
                            </h3>

                            <p>
                              {meeting.description ||
                                "No description provided"}
                            </p>

                          </div>

                        </div>

                        {/* DATE & TIME */}

                        <div className="history-date-cell">

                          <span>
                            <Calendar
                              size={16}
                            />

                            {formatDate(
                              meeting.startTime
                            )}
                          </span>

                          <span>
                            <Clock size={16} />

                            {formatTime(
                              meeting.startTime
                            )}
                          </span>

                        </div>

                        {/* PARTICIPANTS */}

                        <div className="history-participants-cell">

                          <div className="participants-count">

                            <Users size={17} />

                            <span>
                              {participants.length}{" "}
                              participant
                              {participants.length ===
                              1
                                ? ""
                                : "s"}
                            </span>

                          </div>

                          <div className="participant-avatars">

                            {participants
                              .slice(0, 4)
                              .map(
                                (
                                  participant,
                                  index
                                ) => (
                                  <span
                                    className={"participant-avatar"}
                                    key={
                                      participant._id ||
                                      index
                                    }
                                    title={
                                      participant.name ||
                                      "Participant"
                                    }
                                  >
                                    {getParticipantInitial(
                                      participant,
                                      index
                                    )}
                                  </span>
                                )
                              )}

                          </div>

                        </div>

                        {/* DURATION */}

                        <div className="history-duration-cell">

                          {getDuration(
                            meeting
                          )}{" "}
                          min

                        </div>

                        {/* STATUS */}

                        <div className="history-status-cell">

                          <span
                            className={`meeting-status ${status}`}
                          >
                            {status ===
                            "no-show"
                              ? "No Show"
                              : status
                                  .charAt(0)
                                  .toUpperCase() +
                                status.slice(1)}
                          </span>

                        </div>

                        {/* ACTIONS */}

                        <div className="history-actions-cell">

                          <button
                            className="view-meeting-button"
                            onClick={() =>
                              navigate(
                                `/dashboard/meetings/${meeting.roomId}`
                              )
                            }
                          >
                            View Details
                          </button>

                          <button
                            className="history-delete-button"
                            title="Delete meeting"
                            onClick={() =>
                              setDeleteMeeting(
                                meeting
                              )
                            }
                          >
                            <Trash2 size={18} />
                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>
          )}

        {/* ==========================================
            DELETE CONFIRMATION MODAL
        ========================================== */}

        {deleteMeeting && (
          <div
            className="delete-modal-overlay"
            onClick={() => {
              if (!deleting) {
                setDeleteMeeting(null);
              }
            }}
          >

            <div
              className="delete-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="delete-modal-icon">
                <Trash2 size={23} />
              </div>

              <div className="delete-modal-content">

                <h3>
                  Delete Meeting?
                </h3>

                <p>
                  Are you sure you want to
                  delete{" "}
                  <strong>
                    "{deleteMeeting.title}"
                  </strong>
                  ?
                </p>

                <span>
                  This action cannot be undone.
                </span>

              </div>

              <div className="delete-modal-actions">

                <button
                  className="delete-cancel-button"
                  onClick={() =>
                    setDeleteMeeting(null)
                  }
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  className="delete-confirm-button"
                  onClick={handleDeleteMeeting}
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Meeting"}
                </button>

              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
};

export default MeetingHistory;