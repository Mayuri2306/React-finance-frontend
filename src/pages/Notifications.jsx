import { useState, useEffect } from 'react';
import { Modal } from 'bootstrap';
import { notificationAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

const TYPE_ICONS = {
  EMAIL: 'bi-envelope-fill',
  SMS: 'bi-phone-fill',
  IN_APP: 'bi-bell-fill',
};

const TYPE_COLORS = {
  EMAIL: 'primary',
  SMS: 'success',
  IN_APP: 'info',
};

const STATUS_COLORS = {
  SENT: 'success',
  FAILED: 'danger',
  PENDING: 'warning',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [resending, setResending] = useState(null);
  const [resendRowId, setResendRowId] = useState(null);
  const [resendType, setResendType] = useState('EMAIL');

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll();
      setNotifications(res.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(id, type) {
    setResending(id);
    try {
      const res = await notificationAPI.resend(id, type);
      const updated = res.data.data;
      setNotifications(prev => prev.map(x => x.id === updated.id ? updated : x));
      if (selected?.id === updated.id) setSelected(updated);
      setResendRowId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await notificationAPI.delete(deleteId);
      setDeleteId(null);
      Modal.getInstance(document.getElementById('deleteNotifModal'))?.hide();
      fetchNotifications();
    } catch (err) {
      setError(err.message);
    }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    const modal = new Modal(document.getElementById('deleteNotifModal'));
    modal.show();
  }

  function openDetail(n) {
    setSelected(n);
    const modal = new Modal(document.getElementById('detailModal'));
    modal.show();
  }

  const filtered = notifications.filter((n) => {
    const matchSearch =
      n.borrower?.name?.toLowerCase().includes(search.toLowerCase()) ||
      n.subject?.toLowerCase().includes(search.toLowerCase()) ||
      n.message?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || n.type === filterType;
    return matchSearch && matchType;
  });

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
      <div className="spinner-border text-primary" />
    </div>
  );

  return (
    <div>
      {error && <div className="alert alert-danger alert-dismissible">
        {error} <button className="btn-close" onClick={() => setError('')} />
      </div>}

      <div className="d-flex flex-wrap align-items-center gap-2 justify-content-between mb-3">
        <div className="d-flex gap-2">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: 140 }} value={filterType}
            onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="IN_APP">In-App</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
        <small className="text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Notifications are auto-generated on loan status changes
        </small>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Borrower</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">
                  <i className="bi bi-bell-slash fs-3 d-block mb-2"></i>
                  {search || filterType ? 'No matches found' : 'No notifications yet'}
                </td></tr>
              ) : filtered.map((n, i) => (
                <tr key={n.id} style={{ cursor: 'pointer' }}>
                  <td className="text-muted">{i + 1}</td>
                  <td className="fw-medium">{n.borrower?.name || '—'}</td>
                  <td>
                    <span className="text-truncate d-inline-block" style={{ maxWidth: 240 }}>
                      {n.subject}
                    </span>
                  </td>
                  <td>
                    <span className={`badge bg-${TYPE_COLORS[n.type] || 'secondary'} d-flex align-items-center gap-1`}
                      style={{ width: 'fit-content' }}>
                      <i className={`bi ${TYPE_ICONS[n.type] || 'bi-bell'}`}></i>
                      {n.type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge bg-${STATUS_COLORS[n.status] || 'secondary'}`}>{n.status}</span>
                  </td>
                  <td className="text-muted">
                    {n.createdAt ? format(parseISO(n.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openDetail(n)}>
                      <i className="bi bi-eye"></i>
                    </button>
                    {resendRowId === n.id ? (
                      <span className="d-inline-flex gap-1 align-items-center me-1">
                        <select className="form-select form-select-sm" style={{ width: 110 }}
                          value={resendType} onChange={(e) => setResendType(e.target.value)}>
                          <option value="EMAIL">Email</option>
                          <option value="IN_APP">In-App</option>
                          <option value="SMS">SMS</option>
                        </select>
                        <button className="btn btn-sm btn-primary" disabled={resending === n.id}
                          onClick={() => handleResend(n.id, resendType)}>
                          {resending === n.id
                            ? <span className="spinner-border spinner-border-sm" />
                            : <i className="bi bi-send"></i>}
                        </button>
                        <button className="btn btn-sm btn-outline-secondary"
                          onClick={() => setResendRowId(null)}>
                          <i className="bi bi-x"></i>
                        </button>
                      </span>
                    ) : (
                      <button className="btn btn-sm btn-outline-primary me-1" title="Resend"
                        onClick={() => { setResendRowId(n.id); setResendType('EMAIL'); }}>
                        <i className="bi bi-send"></i>
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(n.id)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-top text-muted" style={{ fontSize: '0.8rem' }}>
          {filtered.length} of {notifications.length} notifications
        </div>
      </div>

      {/* Detail Modal */}
      <div className="modal fade" id="detailModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className={`bi ${TYPE_ICONS[selected?.type] || 'bi-bell'} me-2`}></i>
                Notification Detail
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            {selected && (
              <div className="modal-body">
                <div className="mb-3">
                  <label className="text-muted small">Subject</label>
                  <p className="fw-medium mb-0">{selected.subject}</p>
                </div>
                <div className="mb-3">
                  <label className="text-muted small">Borrower</label>
                  <p className="mb-0">{selected.borrower?.name || '—'}</p>
                </div>
                <div className="mb-3">
                  <label className="text-muted small">Message</label>
                  <div className="p-3 bg-light rounded">{selected.message}</div>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="text-muted small">Type</label>
                    <p className="mb-0">
                      <span className={`badge bg-${TYPE_COLORS[selected.type]}`}>{selected.type}</span>
                    </p>
                  </div>
                  <div className="col-6">
                    <label className="text-muted small">Status</label>
                    <p className="mb-0">
                      <span className={`badge bg-${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                    </p>
                  </div>
                  <div className="col-12">
                    <label className="text-muted small">Sent At</label>
                    <p className="mb-0">
                      {selected.createdAt ? format(parseISO(selected.createdAt), 'dd MMM yyyy, HH:mm:ss') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
              <div className="d-flex gap-2 align-items-center">
                <select className="form-select form-select-sm" style={{ width: 120 }}
                  value={resendType} onChange={(e) => setResendType(e.target.value)}>
                  <option value="EMAIL">Email</option>
                  <option value="IN_APP">In-App</option>
                  <option value="SMS">SMS</option>
                </select>
                <button className="btn btn-primary" disabled={resending === selected?.id}
                  onClick={() => handleResend(selected?.id, resendType)}>
                  {resending === selected?.id
                    ? <><span className="spinner-border spinner-border-sm me-1" />Sending...</>
                    : <><i className="bi bi-send me-1"></i>Resend</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <div className="modal fade" id="deleteNotifModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>Delete
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">Delete this notification?</div>
            <div className="modal-footer border-0 pt-0">
              <button className="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
