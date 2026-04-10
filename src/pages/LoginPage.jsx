import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveAuth } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(username.trim(), password);
      const { token, username: uname, fullName, role } = res.data.data;
      saveAuth(token, { username: uname, fullName, role });
      navigate(role === 'ADMIN' ? '/dashboard' : '/welcome', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="text-center mb-4">
          <div className="login-logo">
            <i className="bi bi-bank2"></i>
          </div>
          <h4 className="fw-bold mt-3 mb-1">FinanceApp</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 d-flex align-items-center gap-2" style={{ fontSize: '0.875rem' }}>
            <i className="bi bi-exclamation-circle-fill"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-medium">Username</label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-person text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-medium">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-lock text-muted"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control border-start-0 border-end-0 ps-0"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="input-group-text bg-white border-start-0"
                onClick={() => setShowPassword(v => !v)} tabIndex="-1">
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100 py-2 fw-medium" disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Signing in...</>
              : <><i className="bi bi-box-arrow-in-right me-2"></i>Sign In</>}
          </button>
        </form>

        <div className="text-center mt-4">
          <small className="text-muted">
            <i className="bi bi-shield-lock me-1"></i>
            Secured with JWT Authentication
          </small>
        </div>
      </div>
    </div>
  );
}
