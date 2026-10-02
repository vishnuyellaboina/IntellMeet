import { useEffect, useState } from "react";
import axios from "axios";
import {
  Bell,
  CheckSquare,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./DashboardLayout.css";

const API_URL = import.meta.env.VITE_API_URL;

const DashboardLayout = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error(
          "Load user error:",
          error.response?.data || error.message
        );
      }
    };

    loadUser();
  }, [navigate]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) return;

        const response = await axios.get(
          `${API_URL}/notifications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const notifications =
          response.data?.notifications || [];

        const unreadCount = notifications.filter(
          (notification) => !notification.read
        ).length;

        setNotificationCount(unreadCount);
      } catch (error) {
        console.error(
          "Load notifications error:",
          error.response?.data || error.message
        );
      }
    };

    loadNotifications();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/", {
      replace: true,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();

    const value = searchText.trim();

    if (!value) return;

    navigate(
      `/dashboard/meetings?search=${encodeURIComponent(value)}`
    );
  };

  const getInitial = () => {
    return (
      user?.name?.charAt(0).toUpperCase() ||
      "U"
    );
  };

 return (
  <div className="dashboard-layout">

    {/* ==========================================
        GLOBAL TOP NAVBAR
    ========================================== */}

    <header className="dashboard-topbar">

      {/* BRAND */}
      <div className="dashboard-brand">

        <div className="dashboard-brand-icon">
          <Video size={20} />
        </div>

        <span>IntellMeet</span>

      </div>

      <div className="dashboard-brand-divider" />


      {/* SEARCH */}
      <form
        className="dashboard-search"
        onSubmit={handleSearch}
      >
        <Search size={18} />

        <input
          type="text"
          placeholder="Search meetings..."
          value={searchText}
          onChange={(e) =>
            setSearchText(e.target.value)
          }
        />
      </form>


      {/* RIGHT SIDE */}
      <div className="dashboard-topbar-right">

        {/* NOTIFICATION */}
        <button
          className="dashboard-notification"
          type="button"
          onClick={() =>
            navigate("/dashboard/notifications")
          }
          title="Notifications"
        >
          <Bell size={20} />

          {notificationCount > 0 && (
            <span className="dashboard-notification-badge">
              {notificationCount > 99
                ? "99+"
                : notificationCount}
            </span>
          )}
        </button>


        {/* PROFILE */}
        <button
          className="dashboard-profile"
          type="button"
          onClick={() =>
            navigate("/dashboard/profile")
          }
        >

          <div className="dashboard-profile-avatar">
            {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>

          <div className="dashboard-profile-info">

            <strong>
              {user?.name || "User"}
            </strong>

            <span>
              {user?.email || ""}
            </span>

          </div>

          <ChevronDown size={16} />

        </button>

      </div>

    </header>


    {/* ==========================================
        AREA BELOW NAVBAR
    ========================================== */}

    <div className="dashboard-body">


      {/* ========================================
          SIDEBAR
      ======================================== */}

      <aside className="dashboard-sidebar">

        <nav className="dashboard-sidebar-nav">

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `dashboard-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>


          <NavLink
            to="/dashboard/meetings"
            className={({ isActive }) =>
              `dashboard-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <Video size={18} />
            <span>Meetings</span>
          </NavLink>


          

          <NavLink
            to="/dashboard/action-items"
            className={({ isActive }) =>
              `dashboard-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <CheckSquare size={18} />
            <span>Action Items</span>
          </NavLink>


          <NavLink
            to="/dashboard/workspace"
            className={({ isActive }) =>
              `dashboard-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <Users size={18} />
            <span>Workspace</span>
          </NavLink>


          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `dashboard-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>

        </nav>


        {/* LOGOUT */}

        <button
          className="dashboard-logout"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>

      </aside>


      {/* ========================================
          PAGE CONTENT
      ======================================== */}

      <main className="dashboard-app">

        <div className="dashboard-page-content">
          <Outlet />
        </div>

      </main>

    </div>

  </div>
);
};

export default DashboardLayout;