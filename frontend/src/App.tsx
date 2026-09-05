import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import InternalLayout from './layouts/InternalLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholders for InternalLayout nav
const DummyDashboard = () => <div className="text-white p-8 font-bold">Dashboard Section (Coming Soon)</div>;
const DummyPipeline = () => <div className="text-white p-8 font-bold">Pipeline Placeholder</div>;
const DummyApprovals = () => <div className="text-white p-8 font-bold">Approvals Pipeline (Coming Soon)</div>;
const DummyBackend = () => <div className="text-white p-8 font-bold">Admin Config Engine (Coming Soon)</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Internal Routes fully protected via InternalLayout & AuthProvider */}
          <Route path="/internal" element={<ProtectedRoute />}>
            <Route element={<InternalLayout />}>
              <Route path="dashboard" element={<DummyDashboard />} />
              <Route path="quotations" element={<DummyPipeline />} />

              {/* Specific Role Auth Guards */}
              <Route element={<ProtectedRoute allowedRoles={['SALES_MANAGER', 'FINANCE', 'ADMIN']} />}>
                <Route path="approvals" element={<DummyApprovals />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="backend" element={<DummyBackend />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
