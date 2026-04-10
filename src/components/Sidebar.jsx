import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard',    icon: 'bi-speedometer2',   label: 'Dashboard' },
  { path: '/borrowers',    icon: 'bi-people',         label: 'Borrowers' },
  { path: '/loans',        icon: 'bi-cash-coin',      label: 'Loans' },
  { path: '/deposits',     icon: 'bi-wallet2',        label: 'Deposits' },
  { path: '/emi-tracker',  icon: 'bi-calendar-check', label: 'EMI Tracker' },
  { path: '/expenses',     icon: 'bi-receipt',        label: 'Expenses' },
  { path: '/notifications',icon: 'bi-bell',           label: 'Notifications' },
  { path: '/admin',        icon: 'bi-person-gear',    label: 'Admin' },
];

const ADMIN_ITEMS = [
  { path: '/users', icon: 'bi-people-fill', label: 'Users' },
];

export default function Sidebar({ open, onClose }) {
  const { isAdmin } = useAuth();

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar-brand">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-bank2 text-primary fs-5"></i>
            <h5>FinanceApp</h5>
          </div>
          <button className="btn btn-sm btn-link text-white sidebar-close-btn p-0" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <small>Management System</small>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <NavLink key={path} to={path} onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className={`bi ${icon}`}></i>{label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="nav-section-label mt-2">Administration</div>
            {ADMIN_ITEMS.map(({ path, icon, label }) => (
              <NavLink key={path} to={path} onClick={onClose}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <i className={`bi ${icon}`}></i>{label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-top border-secondary">
        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
          <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: '0.5rem' }}></i>
          {import.meta.env.VITE_API_BASE_URL || 'localhost:8080'}
        </small>
      </div>
    </aside>
  );
}
