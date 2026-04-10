import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import Dashboard from './pages/Dashboard';
import Borrowers from './pages/Borrowers';
import Loans from './pages/Loans';
import Deposits from './pages/Deposits';
import EmiTrackerPage from './pages/EmiTrackerPage';
import ExpensesPage from './pages/ExpensesPage';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import UsersPage from './pages/UsersPage';

const ADMIN_ROUTES = [
  { path: '/dashboard',    component: Dashboard },
  { path: '/borrowers',    component: Borrowers },
  { path: '/loans',        component: Loans },
  { path: '/deposits',     component: Deposits },
  { path: '/emi-tracker',  component: EmiTrackerPage },
  { path: '/expenses',     component: ExpensesPage },
  { path: '/notifications', component: Notifications },
  { path: '/admin',        component: Admin },
  { path: '/users',        component: UsersPage, adminOnly: true },
];

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) return null;

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {ADMIN_ROUTES.map(({ path, component: Component, adminOnly }) => (
              <Route key={path} path={path} element={
                <ProtectedRoute adminOnly={adminOnly}>
                  <Component />
                </ProtectedRoute>
              } />
            ))}
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Redirect to dashboard if already logged in
function PublicRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth();
  if (!isLoggedIn) return children;
  return <Navigate to={isAdmin ? '/dashboard' : '/welcome'} replace />;
}
