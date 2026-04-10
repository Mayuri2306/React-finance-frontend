import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard':    { label: 'Dashboard',    icon: 'bi-speedometer2' },
  '/borrowers':    { label: 'Borrowers',    icon: 'bi-people' },
  '/loans':        { label: 'Loans',        icon: 'bi-cash-coin' },
  '/deposits':     { label: 'Deposits',     icon: 'bi-wallet2' },
  '/emi-tracker':  { label: 'EMI Tracker',  icon: 'bi-calendar-check' },
  '/expenses':     { label: 'Expenses',     icon: 'bi-receipt' },
  '/notifications':{ label: 'Notifications',icon: 'bi-bell' },
  '/admin':        { label: 'Admin',        icon: 'bi-person-gear' },
  '/users':        { label: 'Users',        icon: 'bi-people-fill' },
};

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();
  const current = PAGE_TITLES[pathname] || { label: 'Finance', icon: 'bi-house' };
  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <button className="btn btn-sm btn-link text-dark p-0 me-2 hamburger-btn" onClick={onMenuClick}>
        <i className="bi bi-list fs-4"></i>
      </button>

      <i className={`bi ${current.icon} text-primary`}></i>
      <span className="topbar-title">{current.label}</span>

      <div className="ms-auto d-flex align-items-center gap-3">
        <small className="text-muted d-none d-md-block">{now}</small>

        {/* User menu */}
        <div className="dropdown">
          <button className="btn btn-sm btn-link text-dark p-0 d-flex align-items-center gap-2 text-decoration-none"
            data-bs-toggle="dropdown">
            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="d-none d-md-block text-start">
              <div className="fw-medium" style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                {user?.fullName || user?.username}
              </div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{user?.role}</div>
            </div>
            <i className="bi bi-chevron-down text-muted d-none d-md-block" style={{ fontSize: '0.65rem' }}></i>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ minWidth: 180 }}>
            <li>
              <span className="dropdown-item-text text-muted" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-person me-2"></i>{user?.username}
              </span>
            </li>
            <li><hr className="dropdown-divider my-1" /></li>
            <li>
              <button className="dropdown-item text-danger d-flex align-items-center gap-2"
                onClick={handleLogout}>
                <i className="bi bi-box-arrow-right"></i> Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
