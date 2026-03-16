import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import LiveVitals from "./pages/LiveVitals";
import AIBots from "./pages/AIBots";
import PatientDetails from "./pages/PatientDetails";
import DoctorPatientList from "./pages/DoctorPatientList";
import PatientProfile from "./pages/PatientProfile";
import MotherDashboard from "./pages/MotherDashboard";
import NotificationHistory from "./pages/NotificationHistory";
import AccountSettings from "./pages/AccountSettings";
import NotFound from "./pages/NotFound";
import NearbyHospitals from "./pages/NearbyHospitals";
import PartnerDashboard from "./pages/PartnerDashboard";

const queryClient = new QueryClient();

function ProtectedPatientDetailsRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isDoctor, isAsha, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/role-select" replace />;
  if (isDoctor || isAsha) return <>{children}</>;
  return <Navigate to="/role-select" replace />;
}

/** Any authenticated user – used for routes shared across all roles. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/role-select" replace />;
  return <>{children}</>;
}

/** Mother dashboard: only mothers can access; others redirect to role-select or login. */
function ProtectedMotherDashboardRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isMother, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/role-select" replace />;
  if (!isMother) return <Navigate to="/role-select" replace />;
  return <>{children}</>;
}

/** Partner dashboard: only partners can access. */
function ProtectedPartnerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPartner, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/role-select" replace />;
  if (!isPartner) return <Navigate to="/role-select" replace />;
  return <>{children}</>;
}

/** Live Vitals is strictly Mother only: redirect others to role-select or their dashboard. */
function LiveVitalsRoute({ children }: { children: React.ReactNode }) {
  const { isMother, isDoctor, isAsha, isPartner, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/role-select" replace />;
  if (isMother) return <>{children}</>;
  if (isDoctor) return <Navigate to="/doctor-patients" replace />;
  if (isAsha) return <Navigate to="/patient-details" replace />;
  if (isPartner) return <Navigate to="/partner-dashboard" replace />;
  return <Navigate to="/role-select" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/role-select" element={<RoleSelect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />
              <Route
                path="/mother-dashboard"
                element={
                  <ProtectedMotherDashboardRoute>
                    <MotherDashboard />
                  </ProtectedMotherDashboardRoute>
                }
              />
              <Route
                path="/nearby-hospitals"
                element={
                  <ProtectedMotherDashboardRoute>
                    <NearbyHospitals />
                  </ProtectedMotherDashboardRoute>
                }
              />
              <Route path="/live-vitals" element={<LiveVitalsRoute><LiveVitals /></LiveVitalsRoute>} />
              <Route path="/ai-bots" element={<AIBots />} />
              <Route
                path="/patient/:id"
                element={
                  <ProtectedPatientDetailsRoute>
                    <PatientProfile />
                  </ProtectedPatientDetailsRoute>
                }
              />
              <Route
                path="/doctor-patients"
                element={
                  <ProtectedPatientDetailsRoute>
                    <DoctorPatientList />
                  </ProtectedPatientDetailsRoute>
                }
              />
              <Route
                path="/patient-details"
                element={
                  <ProtectedPatientDetailsRoute>
                    <PatientDetails />
                  </ProtectedPatientDetailsRoute>
                }
              />
              <Route path="/notification-history" element={<NotificationHistory />} />
              <Route
                path="/partner-dashboard"
                element={
                  <ProtectedPartnerRoute>
                    <PartnerDashboard />
                  </ProtectedPartnerRoute>
                }
              />
              <Route
                path="/account-settings"
                element={
                  <ProtectedRoute>
                    <AccountSettings />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
