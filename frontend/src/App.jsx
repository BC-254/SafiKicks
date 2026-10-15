import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ToastProvider, PageSpinner } from './design-system';

// Layouts
import { CustomerLayout } from './layouts/CustomerLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { OwnerLayout } from './layouts/OwnerLayout';

// Route Guard
import { PrivateRoute } from './routes/PrivateRoute';

// Auth Views
import { LoginPage } from './views/auth/LoginPage';

// Owner Views
import { StaffPage } from './views/owner/StaffPage';
import { CatalogPage } from './views/owner/CatalogPage';

// Placeholder view helper for pending milestones
function PlaceholderView({ title, milestone, role }) {
  return (
    <div style={{
      padding: 'var(--space-8)',
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--card-radius)',
      border: 'var(--card-border)',
      maxWidth: 600,
      margin: '0 auto',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
        View component mapped for <strong>{milestone}</strong> ({role}).
      </p>
    </div>
  );
}

export default function App() {
  const { initAuth, isLoading } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Customer Portal (Public, Mobile-First) */}
          <Route element={<CustomerLayout />}>
            <Route path="/register" element={<PlaceholderView title="Customer Registration" milestone="M4" role="Customer" />} />
            <Route path="/verify" element={<PlaceholderView title="Phone Verification" milestone="M4" role="Customer" />} />
            <Route path="/job/:token" element={<PlaceholderView title="Job Status Timeline" milestone="M4" role="Customer" />} />
            <Route path="/job/:token/confirm-price" element={<PlaceholderView title="Confirm Price" milestone="M7" role="Customer" />} />
            <Route path="/job/:token/pickup" element={<PlaceholderView title="Pickup Status" milestone="M9" role="Customer" />} />
          </Route>

          {/* Repairer Dashboard (Role: repairer) */}
          <Route
            path="/repairer"
            element={
              <PrivateRoute allowedRoles={['repairer']}>
                <StaffLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/repairer/queue" replace />} />
            <Route path="queue" element={<PlaceholderView title="Repair Queue" milestone="M6" role="Repairer" />} />
            <Route path="jobs/:id" element={<PlaceholderView title="Job Details & Pricing" milestone="M6" role="Repairer" />} />
            <Route path="pickup" element={<PlaceholderView title="Release Shoes (OTP)" milestone="M9" role="Repairer" />} />
            <Route path="activity" element={<PlaceholderView title="My Repair Activity" milestone="M6" role="Repairer" />} />
          </Route>

          {/* Counter Staff Portal (Role: counter_staff, owner) */}
          <Route
            path="/counter"
            element={
              <PrivateRoute allowedRoles={['counter_staff', 'owner']}>
                <StaffLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/counter/receipt" replace />} />
            <Route path="receipt" element={<PlaceholderView title="Receive & Tag Shoes" milestone="M5" role="Counter Staff" />} />
            <Route path="register" element={<PlaceholderView title="Register for Customer" milestone="M5" role="Counter Staff" />} />
            <Route path="payment" element={<PlaceholderView title="Record Payment" milestone="M8" role="Counter Staff" />} />
            <Route path="jobs" element={<PlaceholderView title="All Received Jobs" milestone="M5" role="Counter Staff" />} />
          </Route>

          {/* Owner Dashboard (Role: owner) */}
          <Route
            path="/owner"
            element={
              <PrivateRoute allowedRoles={['owner']}>
                <OwnerLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="dashboard" element={<PlaceholderView title="Executive Overview" milestone="M11" role="Owner" />} />
            <Route path="jobs" element={<PlaceholderView title="Job Oversight" milestone="M11" role="Owner" />} />
            <Route path="approvals" element={<PlaceholderView title="Pending Approvals" milestone="M10" role="Owner" />} />
            <Route path="reconciliation" element={<PlaceholderView title="Daily Cash Close" milestone="M11" role="Owner" />} />
            <Route path="reports" element={<PlaceholderView title="Revenue & SMS Analytics" milestone="M11" role="Owner" />} />
            <Route path="audit" element={<PlaceholderView title="Immutable Audit Trail" milestone="M12" role="Owner" />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="staff" element={<StaffPage />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
