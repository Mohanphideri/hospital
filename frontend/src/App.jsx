import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import BookAppointment from "./pages/BookAppointment";
import AskQuestion from "./pages/AskQuestion";
import EmergencyPage from "./pages/EmergencyPage";
import PortalShell from "./components/PortalShell";
import Section from "./pages/Section";
import ProtectedRoute from "./components/ProtectedRoute";
import PasswordReset from "./pages/PasswordReset";
import ForgotPassword from "./pages/ForgotPassword";
import MySessions from "./pages/MySessions";
import ToastContainer from "./components/ToastContainer";
import IdleSessionGuard from "./components/IdleSessionGuard";
import { ConfirmProvider } from "./contexts/ConfirmContext.jsx";
import { AmbulanceAlertProvider } from "./contexts/AmbulanceAlertContext.jsx";
import { portals } from "./data/portals";
import StaticPage from "./pages/StaticPage";
import ScrollToTop from "./components/ScrollToTop";

// Public hospital/legal pages - each is a plain route so it has its own real
// URL (linked from the footer), all rendered by the same StaticPage component
// keyed off the slug.
const STATIC_PAGE_SLUGS = [
  "about-us",
  "contact-us",
  "privacy-policy",
  "cookie-policy",
  "terms-conditions",
  "refund-policy",
  "accessibility-statement",
  "patient-rights",
  "insurance-partners",
  "careers",
  "visitor-guidelines",
  "admission-process",
  "discharge-process",
  "faq",
];

export default function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <ConfirmProvider>
      <AmbulanceAlertProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/ask" element={<AskQuestion />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset" element={<ProtectedRoute><PasswordReset /></ProtectedRoute>} />
        <Route path="/account/sessions" element={<ProtectedRoute><MySessions /></ProtectedRoute>} />

        {STATIC_PAGE_SLUGS.map((slug) => (
          <Route key={slug} path={`/${slug}`} element={<StaticPage slug={slug} />} />
        ))}

        {Object.entries(portals).map(([key, config]) => {
          return (
            <Route
              key={key}
              path={`/${key}/*`}
              element={
                <ProtectedRoute requiredRole={[config.role]}>
                  <PortalShell config={config} />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={config.sections[0].path} replace />} />
              <Route path=":section" element={<Section />} />
            </Route>
          );
        })}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
      <IdleSessionGuard />
      </AmbulanceAlertProvider>
    </ConfirmProvider>
  );
}
