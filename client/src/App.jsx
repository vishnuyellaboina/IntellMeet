import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";

import DashboardLayout from "./components/DashboardLayout";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import MeetingHistory from "./pages/MeetingHistory";
import ActionItems from "./pages/ActionItems";
import Workspace from "./pages/Workspace";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import MeetingRoom from "./pages/MeetingRoom";

import MeetingDetails from "./pages/MeetingDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Landing + Auth Popup */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Landing />} />
        <Route path="/register" element={<Landing />} />

        {/* Dashboard Application */}
        <Route path="/dashboard" element={<DashboardLayout />}>

          <Route index element={<Dashboard />} />

          <Route path="settings" element={<Settings />} />

          <Route path="meetings" element={<MeetingHistory />} />

          <Route
            path="meetings/:roomId"
            element={<MeetingDetails />}
          />

          <Route
            path="action-items"
            element={<ActionItems />}
          />
          <Route
  path="profile"
  element={<Profile />}
/>
          <Route
            path="workspace"
            element={<Workspace />}
          />

          <Route
            path="notifications"
            element={<Notifications />}
          />

        </Route>

        {/* Meeting Room stays separate */}
        <Route
          path="/meeting/:roomId"
          element={<MeetingRoom />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;