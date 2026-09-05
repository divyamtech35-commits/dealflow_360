import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Workspace from './pages/Workspace';
import QuotationBuilder from './pages/QuotationBuilder';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-foreground">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/workspace/quote/:id" element={<QuotationBuilder />} />
          <Route path="/workspace/quote/new" element={<QuotationBuilder />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
