import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './core/auth/AuthContext';
import ProtectedRoute from './core/layout/ProtectedRoute';
import MainLayout from './core/layout/MainLayout';
import LoginPage from './core/auth/LoginPage';

// Contract Request Module
import ContractRequestList from './modules/contract/request/ContractRequestList';
import ContractRequestForm from './modules/contract/request/ContractRequestForm';
import ContractRequestDetail from './modules/contract/request/ContractRequestDetail';
import TaskInbox from './modules/contract/request/TaskInbox';

const Placeholder = ({ title }) => (
  <div>
    <h1 style={{ marginBottom: '1rem' }}>{title}</h1>
    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Module under construction
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Placeholder title="Dashboard" />} />

              {/* Contract Request Routes */}
              <Route path="contract-requests">
                <Route index element={<ContractRequestList />} />
                <Route path="new" element={<ContractRequestForm />} />
                <Route path=":id" element={<ContractRequestDetail />} />
              </Route>

              {/* Task Inboxes */}
              <Route path="tasks/dept-head" element={<TaskInbox />} />
              <Route path="tasks/procurement" element={<TaskInbox />} />
              <Route path="tasks/legal" element={<TaskInbox />} />

              {/* Admin modules */}
              <Route path="organizations" element={<Placeholder title="Organizations" />} />
              <Route path="vendors" element={<Placeholder title="Vendors" />} />
              <Route path="users" element={<Placeholder title="Users & Roles" />} />
              <Route path="settings" element={<Placeholder title="Settings" />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
