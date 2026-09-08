import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ROLES } from "./context/AuthContext";
import PublicLayout from "./layouts/PublicLayout";
import AppShell from "./layouts/AppShell";
import RequireRole from "./components/nav/RequireRole";

import Landing from "./pages/public/Landing";
import NotFound from "./pages/public/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import BatchList from "./pages/batches/BatchList";
import CreateBatch from "./pages/batches/CreateBatch";
import BatchDetails from "./pages/batches/BatchDetails";
import Verify from "./pages/verify/Verify";
import Transfers from "./pages/transfers/Transfers";
import Insights from "./pages/insights/Insights";
import Profile from "./pages/profile/Profile";
import Admin from "./pages/admin/Admin";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route path="/app" element={<AppShell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="batches" element={<BatchList />} />
            <Route path="batches/new" element={<CreateBatch />} />
            <Route path="batches/:id" element={<BatchDetails />} />
            <Route path="verify" element={<Verify />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="insights" element={<Insights />} />
            <Route path="profile" element={<Profile />} />
            <Route
              path="admin"
              element={
                <RequireRole roles={[ROLES.ADMIN]}>
                  <Admin />
                </RequireRole>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
