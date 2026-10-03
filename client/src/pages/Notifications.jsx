import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bell,
  RefreshCw,
  Search,
  CheckCheck,
  Video,
  ListChecks,
  Users,
  Settings2,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Inbox,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./Notifications.css";

const API_URL = import.meta.env.VITE_API_URL;

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const loadNotifications = async (isRefresh = false) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await axios.get(
        `${API_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error("Load notifications error:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Failed to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const isToday = (date) => {
    if (!date) return false;

    const value = new Date(date);
    const now = new Date();

    return (
      value.getFullYear() === now.getFullYear() &&
      value.getMonth() === now.getMonth() &&
      value.getDate() === now.getDate()
    );
  };

  const todayCount = notifications.filter((item) =>
    isToday(item.createdAt)
  ).length;

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: unreadCount,
      today: todayCount,
      meeting: notifications.filter(
        (item) => item.type === "meeting"
      ).length,
      action: notifications.filter(
        (item) => item.type === "action-item"
      ).length,
      workspace: notifications.filter(
        (item) => item.type === "workspace"
      ).length,
    };
  }, [notifications, unreadCount, todayCount]);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      let filterMatches = true;

      if (activeFilter === "today") {
        filterMatches = isToday(notification.createdAt);
      } else if (activeFilter === "unread") {
        filterMatches = !notification.read;
      } else if (activeFilter !== "all") {
        filterMatches =
          notification.type === activeFilter;
      }

      if (!filterMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query)
      );
    });
  }, [
    notifications,
    activeFilter,
    searchQuery,
  ]);

  const markNotificationRead = (id) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification._id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };
  window.dispatchEvent(
  new Event("notificationsUpdated")
);

  const markAllAsRead = async () => {
  try {
    const token = localStorage.getItem("token");

    await axios.put(
      `${API_URL}/notifications/read-all`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Update UI immediately
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  } catch (err) {
    console.error("Mark all notifications as read error:", err);
  }
};

  const getNotificationMeta = (type) => {
    switch (type) {
      case "action-item":
        return {
          label: "Action Item",
          icon: <ListChecks size={19} />,
          className: "action",
        };

      case "workspace":
        return {
          label: "Workspace",
          icon: <Users size={19} />,
          className: "workspace",
        };

      case "system":
        return {
          label: "System",
          icon: <Settings2 size={19} />,
          className: "system",
        };

      default:
        return {
          label: "Meeting",
          icon: <Video size={19} />,
          className: "meeting",
        };
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return value.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (date) => {
    if (!date) return "";

    const timestamp = new Date(date).getTime();

    if (Number.isNaN(timestamp)) {
      return "";
    }

    const difference = Date.now() - timestamp;
    const minutes = Math.floor(difference / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleNotificationClick = (notification) => {
    markNotificationRead(notification._id);

    const notificationState = {
      from: "/dashboard/notifications",
    };

    if (
      notification.type === "meeting" &&
      notification.relatedId
    ) {
      navigate(`/meeting/${notification.relatedId}`, {
        state: notificationState,
      });
      return;
    }

    if (
      notification.type === "action-item" &&
      notification.relatedId
    ) {
      navigate("/dashboard/action-items", {
        state: notificationState,
      });
      return;
    }

    if (
      notification.type === "workspace" &&
      notification.relatedId
    ) {
      navigate("/dashboard/workspace", {
        state: notificationState,
      });
    }
  };

  const filters = [
    {
      key: "all",
      label: "All Notifications",
      count: counts.all,
      icon: <Inbox size={18} />,
    },
    {
      key: "meeting",
      label: "Meetings",
      count: counts.meeting,
      icon: <Video size={18} />,
    },
    {
      key: "action-item",
      label: "Action Items",
      count: counts.action,
      icon: <ListChecks size={18} />,
    },
    {
      key: "workspace",
      label: "Workspace",
      count: counts.workspace,
      icon: <Users size={18} />,
    },
    {
      key: "today",
      label: "Today",
      count: counts.today,
      icon: <Calendar size={18} />,
    },
  ];

  return (
    <div className="notifications-page">
      <section className="notifications-header">
        <div className="notifications-title-wrap">
          <div className="notifications-title-icon">
            <Bell size={23} />
          </div>

          <div>
            <h1>Notifications</h1>
            <p>
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount === 1 ? "" : "s"
                  }`
                : "You're all caught up"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`notifications-refresh ${
            refreshing ? "spinning" : ""
          }`}
          onClick={() => loadNotifications(true)}
          disabled={refreshing}
          title="Refresh notifications"
        >
          <RefreshCw size={19} />
        </button>
      </section>

      <section className="notifications-toolbar">
        <div className="notifications-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
          />
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-all-read-button"
            onClick={markAllAsRead}
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </section>

      <div className="notifications-layout">
        <aside className="notification-filters">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`notification-filter ${
                activeFilter === filter.key ? "active" : ""
              }`}
              onClick={() => setActiveFilter(filter.key)}
            >
              <span className="notification-filter-icon">
                {filter.icon}
              </span>

              <span className="notification-filter-label">
                {filter.label}
              </span>

              <span className="notification-filter-count">
                {filter.count}
              </span>
            </button>
          ))}
        </aside>

        <main className="notifications-content">
          <div className="notifications-tabs">
            <button
              type="button"
              className={
                activeFilter === "all" ? "active" : ""
              }
              onClick={() => setActiveFilter("all")}
            >
              All
            </button>

            <button
              type="button"
              className={
                activeFilter === "unread" ? "active" : ""
              }
              onClick={() => setActiveFilter("unread")}
            >
              Unread
            </button>

            <button
              type="button"
              className={
                activeFilter === "today" ? "active" : ""
              }
              onClick={() => setActiveFilter("today")}
            >
              Today
            </button>
          </div>

          {error && (
            <div className="notifications-error">
              {error}
              <button
                type="button"
                onClick={() => loadNotifications()}
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="notifications-state">
              <RefreshCw className="state-spinner" size={28} />
              <h2>Loading notifications</h2>
              <p>Fetching your latest activity...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notifications-state">
              <div className="notifications-empty-icon">
                <Bell size={28} />
              </div>
              <h2>
                {searchQuery
                  ? "No notifications found"
                  : "You're all caught up"}
              </h2>
              <p>
                {searchQuery
                  ? "Try a different search term."
                  : "New meeting, action-item and workspace updates will appear here."}
              </p>
            </div>
          ) : (
            <div className="notification-list">
              {filteredNotifications.map((notification) => {
                const meta = getNotificationMeta(
                  notification.type
                );

                return (
                  <article
                    key={notification._id}
                    className={`notification-card ${
                      notification.read ? "read" : "unread"
                    }`}
                    onClick={() =>
                      handleNotificationClick(notification)
                    }
                  >
                    {!notification.read && (
                      <span className="notification-unread-dot" />
                    )}

                    <div
                      className={`notification-type-icon ${meta.className}`}
                    >
                      {meta.icon}
                    </div>

                    <div className="notification-card-content">
                      <div className="notification-card-top">
                        <h3>{notification.title}</h3>

                        <div className="notification-card-actions">
                          <time
                            title={formatDate(
                              notification.createdAt
                            )}
                          >
                            {formatRelativeTime(
                              notification.createdAt
                            )}
                          </time>

                          <button
                            type="button"
                            className="notification-more"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            title="More options"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          <ChevronRight size={17} />
                        </div>
                      </div>

                      <p>{notification.message}</p>

                      <div className="notification-card-meta">
                        <span
                          className={`notification-type-badge ${meta.className}`}
                        >
                          {meta.label}
                        </span>

                        <span className="notification-date">
                          <Calendar size={13} />
                          {formatDate(
                            notification.createdAt
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Notifications;
