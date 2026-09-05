import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import InternalLayout from './layouts/InternalLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import PortalLayout from './layouts/PortalLayout';

import Dashboard from './pages/Dashboard';
import QuotationList from './pages/QuotationList';
import QuotationBuilder from './pages/QuotationBuilder';
import ApprovalQueue from './pages/ApprovalQueue';
import ApprovalDetail from './pages/ApprovalDetail';
import FulfillmentScreen from './pages/FulfillmentScreen';
import { BillingDashboard } from './pages/billing/BillingDashboard';
import { SubscriptionDetail } from './pages/billing/SubscriptionDetail';
import { OrderBillingView } from './pages/billing/OrderBillingView';

import CustomerDashboard from './pages/portal/CustomerDashboard';
import PortalView from './pages/portal/PortalView';

const DummyBackend = () => <div className="text-white p-8 font-bold">Admin Config Engine (Coming Soon)</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
          <Route path="/signup" element={<AuthLayout><Signup /></AuthLayout>} />

          <Route path="/internal" element={<ProtectedRoute allowedRoles={['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN']} />}>
            <Route element={<InternalLayout />}>
              <Route path="dashboard" element={<Dashboard />} />

              <Route path="quotations" element={<QuotationList />} />
              <Route path="quotations/:id" element={<QuotationBuilder />} />

              <Route element={<ProtectedRoute allowedRoles={['SALES_MANAGER', 'FINANCE', 'ADMIN']} />}>
                <Route path="approvals" element={<ApprovalQueue />} />
                <Route path="approvals/:id" element={<ApprovalDetail />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['FINANCE', 'ADMIN']} />}>
                <Route path="fulfillment" element={<FulfillmentScreen />} />
                <Route path="billing" element={<BillingDashboard />} />
                <Route path="billing/subscription/:id" element={<SubscriptionDetail />} />
                <Route path="billing/order/:orderId" element={<OrderBillingView />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="backend" element={<DummyBackend />} />
              </Route>
            </Route>
          </Route>

          <Route path="/portal" element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
            <Route element={<PortalLayout />}>
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="quotations/:id" element={<PortalView />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
