import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e2a3a 0%, #2d3f55 50%, #1e2a3a 100%)',
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', color: '#fff', marginBottom: 24,
        }}>
          <i className="bi bi-person-check"></i>
        </div>

        <h3 className="fw-bold mb-2">Welcome, {user?.fullName || user?.username}!</h3>
        <p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>
          You are logged in as <span className="badge bg-secondary">{user?.username}</span>
        </p>
        <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
          Your account is active. User screens are coming soon.
        </p>

        <div className="alert alert-info py-2 text-start" style={{ fontSize: '0.825rem' }}>
          <i className="bi bi-info-circle me-2"></i>
          This portal is currently available for <strong>Admin</strong> users only.
          Please contact your administrator for access.
        </div>

        <button className="btn btn-outline-danger mt-3 w-100" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>Sign Out
        </button>
      </div>
    </div>
  );
}
