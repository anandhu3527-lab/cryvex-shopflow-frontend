import { BrowserRouter as Router } from "react-router-dom";
import SessionMonitor from "./components/auth/SessionMonitor";
import AppRoutes from "./routes/AppRoutes";

import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SessionMonitor />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}