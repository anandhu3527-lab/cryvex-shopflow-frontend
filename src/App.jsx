import { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import SessionMonitor from "./components/auth/SessionMonitor";
import AppRoutes from "./routes/AppRoutes";
import SplashScreen from "./components/splash/SplashScreen";
import { healthApi } from "./services/api/healthApi";

import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

export default function App() {
  const [startupStatus, setStartupStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  const checkStartup = useCallback(async () => {
    setStartupStatus("loading");
    setErrorMessage("");
    try {
      const result = await healthApi.checkHealth();
      if (result.isHealthy) {
        setStartupStatus("ready");
      } else {
        setStartupStatus("error");
        setErrorMessage(
          result.error || "Unable to establish connection to Cryvex services."
        );
      }
    } catch (err) {
      setStartupStatus("error");
      setErrorMessage(
        err?.message || "An unexpected error occurred during startup verification."
      );
    }
  }, []);

  useEffect(() => {
    checkStartup();
  }, [checkStartup]);

  return (
    <Router>
      {startupStatus !== "ready" ? (
        <SplashScreen
          status={startupStatus}
          errorMessage={errorMessage}
          onRetry={checkStartup}
        />
      ) : (
        <AuthProvider>
          <NotificationProvider>
            <SessionMonitor />
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      )}
    </Router>
  );
}