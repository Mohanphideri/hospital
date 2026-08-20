import AppRoutes from "./routes.jsx";
import ToastContainer from "../components/feedback/ToastContainer";
import IdleSessionGuard from "../components/feedback/IdleSessionGuard";
import { ConfirmProvider } from "../contexts/ConfirmContext.jsx";
import { AmbulanceAlertProvider } from "../contexts/AmbulanceAlertContext.jsx";
import ScrollToTop from "../components/layout/ScrollToTop";

export default function App() {
  return (
    <ConfirmProvider>
      <AmbulanceAlertProvider>
        <ScrollToTop />
        <AppRoutes />
        <ToastContainer />
        <IdleSessionGuard />
      </AmbulanceAlertProvider>
    </ConfirmProvider>
  );
}
