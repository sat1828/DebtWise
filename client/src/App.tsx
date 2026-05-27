import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { AppShell } from './components/layout/AppShell';
import { Welcome } from './pages/onboarding/Welcome';
import { StateSelection } from './pages/onboarding/StateSelection';
import { DebtEntry } from './pages/onboarding/DebtEntry';
import { CreateAccount } from './pages/onboarding/CreateAccount';
import { Login } from './pages/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { DebtDetail } from './pages/debt/DebtDetail';
import { NegotiationWizard } from './pages/negotiation/NegotiationWizard';
import { RightsHub } from './pages/rights/RightsHub';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicRoute><Welcome /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/onboarding/state" element={<PublicRoute><StateSelection /></PublicRoute>} />
          <Route path="/onboarding/debt-entry" element={<PublicRoute><DebtEntry /></PublicRoute>} />
          <Route path="/onboarding/create-account" element={<PublicRoute><CreateAccount /></PublicRoute>} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/debts/:id" element={<DebtDetail />} />
            <Route path="/debts/:id/negotiate" element={<NegotiationWizard />} />
            <Route path="/rights" element={<RightsHub />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
