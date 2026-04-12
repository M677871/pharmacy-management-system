import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { TotpVerifyPage } from './features/auth/pages/TotpVerifyPage';
import { SocialCallbackPage } from './features/auth/pages/SocialCallbackPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { InventoryPage } from './features/inventory/pages/InventoryPage';
import { PosPage } from './features/sales/pages/PosPage';
import { PurchasesPage } from './features/purchases/pages/PurchasesPage';
import { ReportsPage } from './features/reports/pages/ReportsPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { CatalogPage } from './features/catalog/pages/CatalogPage';
import { MessagesPage } from './features/messaging/pages/MessagesPage';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { useAuth } from './features/auth/hooks/useAuth';

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/auth/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/auth/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />
      <Route
        path="/auth/forgot-password"
        element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        }
      />
      <Route
        path="/auth/reset-password"
        element={
          <GuestRoute>
            <ResetPasswordPage />
          </GuestRoute>
        }
      />
      <Route
        path="/auth/totp-verify"
        element={
          <GuestRoute>
            <TotpVerifyPage />
          </GuestRoute>
        }
      />
      <Route
        path="/auth/social-callback"
        element={
          <GuestRoute>
            <SocialCallbackPage />
          </GuestRoute>
        }
      />
      <Route
        path="/auth/totp-setup"
        element={
          <ProtectedRoute>
            <Navigate to="/settings" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <PosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <PurchasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalog"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CatalogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
