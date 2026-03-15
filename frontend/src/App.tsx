import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { TotpSetupPage } from './features/auth/pages/TotpSetupPage';
import { TotpVerifyPage } from './features/auth/pages/TotpVerifyPage';
import { SocialCallbackPage } from './features/auth/pages/SocialCallbackPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { InventoryPage } from './features/inventory/pages/InventoryPage';
import { ProtectedRoute } from './shared/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/totp-verify" element={<TotpVerifyPage />} />
      <Route path="/auth/social-callback" element={<SocialCallbackPage />} />
      <Route
        path="/auth/totp-setup"
        element={
          <ProtectedRoute>
            <TotpSetupPage />
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
        path="/inventory"
        element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}

export default App;
