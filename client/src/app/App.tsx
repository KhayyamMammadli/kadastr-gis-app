import { Spin } from "antd";
import { useAuth } from "../hooks/useAuth";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";

export default function App() {
  const { isCheckingAuth, isAuthenticated } = useAuth({ checkSession: true });

  if (isCheckingAuth) {
    return (
      <div className="loading-screen">
        <Spin size="large" />
        <p>Sistem yoxlanılır...</p>
      </div>
    );
  }

  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
}
