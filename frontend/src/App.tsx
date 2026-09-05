import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import InternalLayout from './layouts/InternalLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';

import Dashboard from './pages/Dashboard';
import QuotationList from './pages/QuotationList';
import QuotationBuilder from './pages/QuotationBuilder';
import ApprovalQueue from './pages/ApprovalQueue';
import ApprovalDetail from './pages/ApprovalDetail';
import FulfillmentScreen from './pages/FulfillmentScreen';
import BillingScreen from './pages/BillingScreen';
import AdminConfig from './pages/AdminConfig';
import CustomerPortal from './pages/customer/CustomerPortal';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
          <Route path="/signup" element={<AuthLayout><Signup /></AuthLayout>} />

          {/* Internal Application Workspaces (Sales Person, Manager, Admin) */}
          <Route path="/internal" element={<ProtectedRoute />}>
            <Route element={<InternalLayout />}>
              {/* Sales Person Core */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="quotations" element={<QuotationList />} />
              <Route path="quotations/:id" element={<QuotationBuilder />} />
              <Route path="fulfillment" element={<FulfillmentScreen />} />
              <Route path="billing" element={<BillingScreen />} />

              {/* Manager Approvals & Deal Health */}
              <Route element={<ProtectedRoute allowedRoles={['SALES_MANAGER', 'FINANCE', 'ADMIN']} />}>
                <Route path="approvals" element={<ApprovalQueue defaultView="QUEUE" />} />
                <Route path="approvals/health" element={<ApprovalQueue defaultView="HEALTH" />} />
                <Route path="approvals/:id" element={<ApprovalDetail />} />
              </Route>

              {/* Admin Master Data Management */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="admin" element={<Navigate to="/internal/admin/products" replace />} />
                <Route path="admin/products" element={<AdminConfig tab="PRODUCTS" />} />
                <Route path="admin/prices" element={<AdminConfig tab="PRICES" />} />
                <Route path="admin/discount-rules" element={<AdminConfig tab="DISCOUNTS" />} />
                <Route path="admin/warehouses" element={<AdminConfig tab="WAREHOUSES" />} />
                <Route path="admin/subscription-plans" element={<AdminConfig tab="PLANS" />} />
                <Route path="backend" element={<Navigate to="/internal/admin/products" replace />} />
              </Route>
              {/* Customer Portal (View Quote, Request Changes, Counter Discount, Confirm Quote) */}
              <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'SALES_REP', 'ADMIN', 'SALES_MANAGER']} />}>
                <Route path="customer" element={<Navigate to="/internal/customer/quotes" replace />} />
                <Route path="customer/quotes" element={<CustomerPortal tab="VIEW" />} />
                <Route path="customer/quotes/:id" element={<CustomerPortal tab="VIEW" />} />
                <Route path="customer/request-changes" element={<CustomerPortal tab="CHANGES" />} />
                <Route path="customer/counter-discount" element={<CustomerPortal tab="COUNTER" />} />
                <Route path="customer/confirm-quote" element={<CustomerPortal tab="CONFIRM" />} />
              </Route>
            </Route>
          </Route>

          {/* Legacy Customer Portal Redirects */}
          <Route path="/portal" element={<Navigate to="/internal/customer/quotes" replace />} />
          <Route path="/portal/quotes" element={<Navigate to="/internal/customer/quotes" replace />} />
          <Route path="/portal/quotes/:id" element={<Navigate to="/internal/customer/quotes" replace />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
