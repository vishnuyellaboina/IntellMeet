import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Circle,
  Search,
  Filter,
  Calendar,
  Video,
  Trash2,
  Layers,
  ListChecks,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./ActionItems.css";

const API_URL = import.meta.env.VITE_API_URL;

function ActionItems() {
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // DELETE ACTION ITEM UI
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState(null);
  const [deletingActionItem, setDeletingActionItem] = useState(false);

  // ==========================================
  // LOAD ACTION ITEMS
  // ==========================================

  const loadActionItems = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      setError("");

      const meetingResponse = await axios.get(
        `${API_URL}/meetings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const userMeetings =
        meetingResponse.data.meetings || [];

      setMeetings(userMeetings);

      // ==========================================
      // LOAD ACTION ITEMS FROM EACH MEETING
      // ==========================================

      const allItems = [];

      for (const meeting of userMeetings) {
        try {
          const response = await axios.get(
            `${API_URL}/action-items/meeting/${meeting.roomId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.data.success) {
            const items =
              response.data.actionItems || [];

            items.forEach((item) => {
              allItems.push({
                ...item,
                meetingTitle:
                  meeting.title,
                meetingRoomId:
                  meeting.roomId,
              });
            });
          }
        } catch (itemError) {
          console.error(
            `Failed to load action items for ${meeting.roomId}:`,
            itemError.response?.data ||
            itemError.message
          );
        }
      }

      setActionItems(allItems);
    } catch (error) {
      console.error(
        "Load action items error:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
        return;
      }

      setError(
        error.response?.data?.message ||
        "Failed to load action items."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadActionItems();
  }, []);

  // ==========================================
  // UPDATE ACTION ITEM STATUS
  // ==========================================

  const updateStatus = async (
    actionItem,
    status
  ) => {
    try {
      const token =
        localStorage.getItem("token");

      const response = await axios.put(
        `${API_URL}/action-items/${actionItem._id}`,
        {
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setActionItems((previous) =>
          previous.map((item) =>
            item._id === actionItem._id
              ? {
                ...item,
                ...response.data.actionItem,
                status,
              }
              : item
          )
        );
      }
    } catch (error) {
      console.error(
        "Update action item error:",
        error
      );

      setError(
        error.response?.data?.message ||
        "Failed to update action item."
      );
    }
  };

  // ==========================================
  // DELETE ACTION ITEM
  // ==========================================

  const openDeleteModal = (actionItem) => {
    setSelectedActionItem(actionItem);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deletingActionItem) return;

    setShowDeleteModal(false);
    setSelectedActionItem(null);
  };

  const deleteActionItem = async () => {
    if (!selectedActionItem?._id) return;

    try {
      const token = localStorage.getItem("token");

      setDeletingActionItem(true);
      setError("");

      await axios.delete(
        `${API_URL}/action-items/${selectedActionItem._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setActionItems((previous) =>
        previous.filter(
          (item) => item._id !== selectedActionItem._id
        )
      );

      setShowDeleteModal(false);
      setSelectedActionItem(null);
    } catch (error) {
      console.error("Delete action item error:", error);

      setError(
        error.response?.data?.message ||
        "Failed to delete action item."
      );
    } finally {
      setDeletingActionItem(false);
    }
  };

  // ==========================================
  // STATUS ICON
  // ==========================================

  const getStatusIcon = (status) => {
    if (status === "completed") {
      return <CheckCircle2 size={18} />;
    }

    if (status === "in-progress") {
      return <Clock size={18} />;
    }

    return <Circle size={18} />;
  };

  // ==========================================
  // COUNTS
  // ==========================================

  const totalCount = actionItems.length;

  const pendingCount = actionItems.filter(
    (item) => item.status === "pending"
  ).length;

  const inProgressCount = actionItems.filter(
    (item) => item.status === "in-progress"
  ).length;

  const completedCount = actionItems.filter(
    (item) => item.status === "completed"
  ).length;

  // ==========================================
  // FILTER + SEARCH
  // ==========================================

  const filteredItems = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return actionItems.filter((item) => {
      const matchesStatus =
        activeFilter === "all" ||
        item.status === activeFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        item.task?.toLowerCase().includes(query) ||
        item.meetingTitle
          ?.toLowerCase()
          .includes(query) ||
        item.assignee
          ?.toLowerCase()
          .includes(query) ||
        item.priority
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [
    actionItems,
    activeFilter,
    searchQuery,
  ]);

  // ==========================================
  // DUE DATE
  // ==========================================

  const formatDueDate = (date) => {
    if (!date) {
      return "No due date";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const isOverdue = (item) => {
    if (
      !item.dueDate ||
      item.status === "completed"
    ) {
      return false;
    }

    return (
      new Date(item.dueDate) <
      new Date()
    );
  };

  return (
    <div className="action-items-page">

      {/* ==========================================
          PAGE HEADER
      ========================================== */}

      <header className="action-items-header">

        <div>
          <h1>Action Items</h1>

          <p>
            Manage tasks extracted from
            your meetings.
          </p>
        </div>

      </header>

      {/* ==========================================
          ERROR
      ========================================== */}

      {error && (
        <div className="action-items-error">
          {error}
        </div>
      )}

      {/* ==========================================
          LOADING
      ========================================== */}

      {loading ? (
        <div className="action-items-empty">
          <div className="action-items-empty-icon">
            <ListChecks size={28} />
          </div>

          <h2>
            Loading action items
          </h2>

          <p>
            Fetching tasks from your meetings...
          </p>
        </div>
      ) : (
        <>
          {/* ==========================================
              SUMMARY CARDS
          ========================================== */}

          <section className="action-summary-grid">

            <div className="action-summary-card total">
              <div className="summary-icon">
                <Layers size={23} />
              </div>

              <div>
                <span>Total Action Items</span>
                <strong>{totalCount}</strong>
              </div>
            </div>

            <div className="action-summary-card pending">
              <div className="summary-icon">
                <Clock size={23} />
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
            </div>

            <div className="action-summary-card progress">
              <div className="summary-icon">
                <CheckSquare size={23} />
              </div>

              <div>
                <span>In Progress</span>
                <strong>
                  {inProgressCount}
                </strong>
              </div>
            </div>

            <div className="action-summary-card completed">
              <div className="summary-icon">
                <CheckCircle2 size={23} />
              </div>

              <div>
                <span>Completed</span>
                <strong>
                  {completedCount}
                </strong>
              </div>
            </div>

          </section>

          {/* ==========================================
              FILTER TOOLBAR
          ========================================== */}

          <section className="action-toolbar">

            <div className="action-filter-tabs">

              <button
                className={
                  activeFilter === "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter("all")
                }
              >
                All ({totalCount})
              </button>

              <button
                className={
                  activeFilter === "pending"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter("pending")
                }
              >
                Pending ({pendingCount})
              </button>

              <button
                className={
                  activeFilter === "in-progress"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(
                    "in-progress"
                  )
                }
              >
                In Progress ({inProgressCount})
              </button>

              <button
                className={
                  activeFilter === "completed"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter("completed")
                }
              >
                Completed ({completedCount})
              </button>

            </div>

            <div className="action-toolbar-right">

              <div className="action-search">
                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search action items, assignees or meetings..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="action-filter-wrapper">

                <button
                  className="action-filter-button"
                  onClick={() =>
                    setShowFilterMenu(
                      (previous) =>
                        !previous
                    )
                  }
                >
                  <Filter size={17} />
                  Filter
                </button>

                {showFilterMenu && (
                  <div className="action-filter-menu">

                    <button
                      onClick={() => {
                        setActiveFilter(
                          "all"
                        );
                        setShowFilterMenu(
                          false
                        );
                      }}
                    >
                      All
                    </button>

                    <button
                      onClick={() => {
                        setActiveFilter(
                          "pending"
                        );
                        setShowFilterMenu(
                          false
                        );
                      }}
                    >
                      Pending
                    </button>

                    <button
                      onClick={() => {
                        setActiveFilter(
                          "in-progress"
                        );
                        setShowFilterMenu(
                          false
                        );
                      }}
                    >
                      In Progress
                    </button>

                    <button
                      onClick={() => {
                        setActiveFilter(
                          "completed"
                        );
                        setShowFilterMenu(
                          false
                        );
                      }}
                    >
                      Completed
                    </button>

                  </div>
                )}

              </div>

            </div>

          </section>

          {/* ==========================================
              ACTION ITEMS TABLE
          ========================================== */}

          {filteredItems.length === 0 ? (

            <div className="action-items-empty">
              <div className="action-items-empty-icon">
                <CheckSquare size={28} />
              </div>

              <h2>
                No action items found
              </h2>

              <p>
                {searchQuery
                  ? "Try changing your search."
                  : "Action items generated from your AI meeting summaries will appear here."}
              </p>
            </div>

          ) : (

            <div className="action-table-wrapper">

              <div className="action-table">

                {/* TABLE HEADER */}

                <div className="action-table-header">

                  <div className="action-check-column">

                  </div>

                  <div>Task</div>
                  <div>Meeting</div>
                  <div>Assignee</div>
                  <div>Priority</div>
                  <div>Due Date</div>
                  <div>Status</div>
                  <div>Actions</div>


                </div>

                {/* TABLE ROWS */}

                {filteredItems.map(
                  (item) => (

                    <div
                      className={`action-table-row ${item.status}`}
                      key={item._id}
                    >

                      {/* CHECKBOX */}

                      <div className="action-check-column">

                        <div
                          className={`task-checkbox ${item.status ===
                              "completed"
                              ? "checked"
                              : ""
                            }`}
                        >
                          {item.status ===
                            "completed" && (
                              <CheckSquare
                                size={17}
                              />
                            )}
                        </div>

                      </div>

                      {/* TASK */}

                      <div className="task-cell">

                        <strong>
                          {item.task ||
                            "Untitled task"}
                        </strong>

                        <span>
                          {item.description ||
                            "Action item from meeting"}
                        </span>

                      </div>

                      {/* MEETING */}

                      <div className="meeting-cell">

                        <div className="meeting-icon">
                          <Video size={17} />
                        </div>

                        <div>
                          <strong>
                            {item.meetingTitle ||
                              "Meeting"}
                          </strong>

                          {item.meetingRoomId && (
                            <span>
                              ID:{" "}
                              {item.meetingRoomId}
                            </span>
                          )}
                        </div>

                      </div>

                      {/* ASSIGNEE */}

                      <div className="assignee-cell">

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

                      {/* PRIORITY */}

                      <div>

                        <span
                          className={`priority-badge ${item.priority ||
                            "medium"
                            }`}
                        >
                          {item.priority ||
                            "medium"}
                        </span>

                      </div>

                      {/* DUE DATE */}

                      <div
                        className={`due-date ${isOverdue(item)
                            ? "overdue"
                            : ""
                          }`}
                      >

                        <Calendar
                          size={16}
                        />

                        <div>
                          <span>
                            {formatDueDate(
                              item.dueDate
                            )}
                          </span>

                          {isOverdue(
                            item
                          ) && (
                              <small>
                                Overdue
                              </small>
                            )}
                        </div>

                      </div>

                      {/* STATUS */}

                      <div>

                        <select
                          className={`action-status-select ${item.status
                            }`}
                          value={
                            item.status ||
                            "pending"
                          }
                          onChange={(e) =>
                            updateStatus(
                              item,
                              e.target.value
                            )
                          }
                        >

                          <option value="pending">
                            Pending
                          </option>

                          <option value="in-progress">
                            In Progress
                          </option>

                          <option value="completed">
                            Completed
                          </option>

                        </select>

                      </div>

                      {/* ACTIONS */}

                      <div className="action-row-actions">
                        <button
                          type="button"
                          className="delete-action-button"
                          title="Delete action item"
                          aria-label="Delete action item"
                          onClick={() => openDeleteModal(item)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          )}
        </>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && selectedActionItem && (
        <div
          className="delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="delete-modal-icon">
              <Trash2 size={24} />
            </div>

            <div className="delete-modal-content">
              <h2>Delete action item?</h2>

              <p>
                Are you sure you want to delete this
                action item?
              </p>

              <div className="delete-task-preview">
                <strong>
                  {selectedActionItem.task ||
                    "Untitled task"}
                </strong>

                <span>
                  This action cannot be undone.
                </span>
              </div>
            </div>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel-button"
                onClick={closeDeleteModal}
                disabled={deletingActionItem}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={deleteActionItem}
                disabled={deletingActionItem}
              >
                <Trash2 size={16} />
                {deletingActionItem
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionItems;