import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'bootstrap';
import { emiTrackerAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function nextDueDate(emi) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = emi.dueDayOfMonth;
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), d);
  if (today <= thisMonth) return thisMonth;
  return new Date(today.getFullYear(), today.getMonth() + 1, d);
}

function daysUntilDue(emi) {
  const due = nextDueDate(emi);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function isUpcoming(emi) {
  return emi.status === 'ACTIVE' && daysUntilDue(emi) <= emi.remindDaysBefore;
}

function isDueToday(emi) {
  return emi.status === 'ACTIVE' && daysUntilDue(emi) === 0;
}

function isOverdue(emi) {
  return emi.status === 'ACTIVE' && daysUntilDue(emi) < 0;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  name: '',
  lenderName: '',
  emiAmount: '',
  dueDayOfMonth: '',
  startDate: today(),
  endDate: '',
  totalEmis: '',
  emisPaid: '0',
  bankAccountName: '',
  bankAccountNumber: '',
  remindDaysBefore: '5',
  remarks: '',
};

const STATUS_COLOR = { ACTIVE: 'success', PAUSED: 'warning', COMPLETED: 'secondary' };

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmiTrackerPage() {
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [deleteId, setDeleteId] = useState(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const fetchEmis = useCallback(async () => {
    try {
      setLoading(true);
      const res = await emiTrackerAPI.getAll();
      setEmis(res.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmis(); }, [fetchEmis]);

  function applyUpdate(updated) {
    setEmis(prev => prev.map(e => e.id === updated.id ? updated : e));
  }

  // ─── Modals ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null);
    setForm(EMPTY);
    setFormError('');
    new Modal(document.getElementById('emiModal')).show();
  }

  function openEdit(emi) {
    setEditId(emi.id);
    setForm({
      name: emi.name,
      lenderName: emi.lenderName,
      emiAmount: String(emi.emiAmount),
      dueDayOfMonth: String(emi.dueDayOfMonth),
      startDate: emi.startDate,
      endDate: emi.endDate || '',
      totalEmis: emi.totalEmis != null ? String(emi.totalEmis) : '',
      emisPaid: String(emi.emisPaid),
      bankAccountName: emi.bankAccountName,
      bankAccountNumber: emi.bankAccountNumber || '',
      remindDaysBefore: String(emi.remindDaysBefore),
      remarks: emi.remarks || '',
    });
    setFormError('');
    new Modal(document.getElementById('emiModal')).show();
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        lenderName: form.lenderName.trim(),
        emiAmount: parseFloat(form.emiAmount),
        dueDayOfMonth: parseInt(form.dueDayOfMonth),
        startDate: form.startDate,
        endDate: form.endDate || null,
        totalEmis: form.totalEmis ? parseInt(form.totalEmis) : null,
        emisPaid: form.emisPaid ? parseInt(form.emisPaid) : 0,
        bankAccountName: form.bankAccountName.trim(),
        bankAccountNumber: form.bankAccountNumber.trim() || null,
        remindDaysBefore: parseInt(form.remindDaysBefore),
        remarks: form.remarks.trim() || null,
      };
      if (editId) {
        const res = await emiTrackerAPI.update(editId, payload);
        applyUpdate(res.data.data);
      } else {
        const res = await emiTrackerAPI.create(payload);
        setEmis(prev => [...prev, res.data.data]);
      }
      Modal.getInstance(document.getElementById('emiModal'))?.hide();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(id) {
    try {
      const res = await emiTrackerAPI.markPaid(id);
      applyUpdate(res.data.data);
    } catch (err) { setError(err.message); }
  }

  async function handlePause(id) {
    try {
      const res = await emiTrackerAPI.pause(id);
      applyUpdate(res.data.data);
    } catch (err) { setError(err.message); }
  }

  async function handleResume(id) {
    try {
      const res = await emiTrackerAPI.resume(id);
      applyUpdate(res.data.data);
    } catch (err) { setError(err.message); }
  }

  async function handleComplete(id) {
    try {
      const res = await emiTrackerAPI.complete(id);
      applyUpdate(res.data.data);
    } catch (err) { setError(err.message); }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    new Modal(document.getElementById('deleteEmiModal')).show();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const id = deleteId;
    try {
      await emiTrackerAPI.delete(id);
      setDeleteId(null);
      Modal.getInstance(document.getElementById('deleteEmiModal'))?.hide();
      setEmis(prev => prev.filter(e => e.id !== id));
    } catch (err) { setError(err.message); }
  }

  // ─── Derived state ──────────────────────────────────────────────────────────

  const upcomingEmis = emis.filter(isUpcoming);
  const overdueEmis = emis.filter(isOverdue);

  const tabs = [
    { key: 'ALL', label: 'All', count: emis.length },
    { key: 'UPCOMING', label: 'Upcoming', count: upcomingEmis.length },
    { key: 'ACTIVE', label: 'Active', count: emis.filter(e => e.status === 'ACTIVE' && !isUpcoming(e)).length },
    { key: 'PAUSED', label: 'Paused', count: emis.filter(e => e.status === 'PAUSED').length },
    { key: 'COMPLETED', label: 'Completed', count: emis.filter(e => e.status === 'COMPLETED').length },
  ];

  const filtered = emis.filter(e => {
    const matchSearch =
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.lenderName?.toLowerCase().includes(search.toLowerCase()) ||
      e.bankAccountName?.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      filterTab === 'ALL' ? true
      : filterTab === 'UPCOMING' ? isUpcoming(e)
      : filterTab === 'ACTIVE' ? (e.status === 'ACTIVE' && !isUpcoming(e))
      : e.status === filterTab;
    return matchSearch && matchTab;
  });

  const activeEmis = emis.filter(e => e.status === 'ACTIVE');
  const monthlyOutflow = activeEmis.reduce((s, e) => s + Number(e.emiAmount), 0);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
      <div className="spinner-border text-primary" />
    </div>
  );

  return (
    <div>
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error} <button className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      {/* ── Reminder Alert Banner ─────────────────────────────────────────── */}
      {!alertDismissed && (overdueEmis.length > 0 || upcomingEmis.length > 0) && (
        <div className={`alert ${overdueEmis.length > 0 ? 'alert-danger' : 'alert-warning'} alert-dismissible mb-3`}
          style={{ borderLeft: `4px solid ${overdueEmis.length > 0 ? '#dc3545' : '#ffc107'}` }}>
          <button className="btn-close" onClick={() => setAlertDismissed(true)} />
          <div className="d-flex align-items-start gap-2">
            <i className={`bi ${overdueEmis.length > 0 ? 'bi-exclamation-octagon-fill text-danger' : 'bi-bell-fill text-warning'} fs-5 mt-1 flex-shrink-0`}></i>
            <div className="w-100">
              <div className="fw-bold mb-2">
                {overdueEmis.length > 0
                  ? `${overdueEmis.length} EMI${overdueEmis.length > 1 ? 's' : ''} overdue — ensure balance immediately!`
                  : `${upcomingEmis.length} EMI${upcomingEmis.length > 1 ? 's' : ''} due soon — maintain balance in:`}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {[...overdueEmis, ...upcomingEmis.filter(e => !isOverdue(e))].map(emi => {
                  const days = daysUntilDue(emi);
                  const urgency = days < 0 ? 'danger' : days === 0 ? 'danger' : days <= 2 ? 'warning' : 'info';
                  return (
                    <span key={emi.id} className={`badge bg-${urgency} d-flex align-items-center gap-1 py-2 px-3`}
                      style={{ fontSize: '0.82em', fontWeight: 500 }}>
                      <i className="bi bi-bank2"></i>
                      <strong>{emi.bankAccountName}</strong>
                      &nbsp;·&nbsp;₹{Number(emi.emiAmount).toLocaleString('en-IN')}
                      &nbsp;
                      <span className="opacity-75">
                        ({emi.name}
                        {days < 0 ? ` · ${Math.abs(days)}d overdue` : days === 0 ? ' · DUE TODAY' : ` · in ${days}d`})
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="p-3 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25">
            <div className="small text-muted">Active EMIs</div>
            <div className="fw-bold fs-4 text-primary">{activeEmis.length}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="p-3 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25">
            <div className="small text-muted">Monthly Outflow</div>
            <div className="fw-bold fs-5 text-danger">₹{Number(monthlyOutflow).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className={`p-3 rounded border ${upcomingEmis.length > 0 ? 'bg-warning bg-opacity-10 border-warning border-opacity-25' : 'bg-light border-secondary border-opacity-25'}`}>
            <div className="small text-muted">In Reminder Window</div>
            <div className={`fw-bold fs-4 ${upcomingEmis.length > 0 ? 'text-warning' : 'text-muted'}`}>
              {upcomingEmis.length}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className={`p-3 rounded border ${overdueEmis.length > 0 ? 'bg-danger bg-opacity-10 border-danger border-opacity-25' : 'bg-light border-secondary border-opacity-25'}`}>
            <div className="small text-muted">Overdue</div>
            <div className={`fw-bold fs-4 ${overdueEmis.length > 0 ? 'text-danger' : 'text-muted'}`}>
              {overdueEmis.length}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap align-items-center gap-2 justify-content-between mb-3">
        <div className="input-group" style={{ maxWidth: 280 }}>
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input type="text" className="form-control border-start-0 ps-0"
            placeholder="Search EMIs..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="bi bi-plus-lg"></i> Add EMI
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <ul className="nav nav-tabs mb-0" style={{ borderBottom: 'none' }}>
        {tabs.map(tab => (
          <li className="nav-item" key={tab.key}>
            <button
              className={`nav-link d-flex align-items-center gap-1 ${filterTab === tab.key ? 'active' : ''}`}
              onClick={() => setFilterTab(tab.key)}>
              {tab.label}
              <span className={`badge ms-1 ${
                filterTab === tab.key ? 'bg-primary'
                : tab.key === 'UPCOMING' && tab.count > 0 ? 'bg-warning text-dark'
                : 'bg-secondary'
              }`} style={{ fontSize: '0.7em' }}>
                {tab.count}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="table-card" style={{ borderTopLeftRadius: 0 }}>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>EMI / Lender</th>
                <th>Amount</th>
                <th>Due Day</th>
                <th>Next Due</th>
                <th>Remind Before</th>
                <th>Bank Account</th>
                <th>Progress</th>
                <th>Last Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-muted py-4">
                  <i className="bi bi-calendar-x fs-3 d-block mb-2"></i>
                  {search || filterTab !== 'ALL' ? 'No matches found' : 'No EMIs tracked yet — click Add EMI to start'}
                </td></tr>
              ) : filtered.map((emi, i) => {
                const days = daysUntilDue(emi);
                const upcoming = isUpcoming(emi);
                const overdue = isOverdue(emi);
                const dueToday = isDueToday(emi);
                const nextDue = nextDueDate(emi);
                const dueDateStr = format(nextDue, 'dd MMM yyyy');

                let dueBadge;
                if (overdue) dueBadge = <span className="badge bg-danger ms-1" style={{ fontSize: '0.7em' }}>{Math.abs(days)}d overdue</span>;
                else if (dueToday) dueBadge = <span className="badge bg-danger ms-1" style={{ fontSize: '0.7em' }}>TODAY</span>;
                else if (days <= 3 && upcoming) dueBadge = <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.7em' }}>in {days}d</span>;
                else if (upcoming) dueBadge = <span className="badge bg-info ms-1" style={{ fontSize: '0.7em' }}>in {days}d</span>;

                const rowClass = overdue ? 'table-danger' : dueToday ? 'table-warning' : upcoming ? 'table-warning bg-opacity-50' : '';

                return (
                  <tr key={emi.id} className={rowClass}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <div className="fw-medium">{emi.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.8em' }}>
                        <i className="bi bi-building me-1"></i>{emi.lenderName}
                      </div>
                      {emi.remarks && (
                        <div className="text-muted fst-italic" style={{ fontSize: '0.75em' }}>{emi.remarks}</div>
                      )}
                    </td>
                    <td className="fw-bold text-danger">
                      ₹{Number(emi.emiAmount).toLocaleString('en-IN')}
                      <div className="text-muted fw-normal" style={{ fontSize: '0.75em' }}>/month</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {ordinal(emi.dueDayOfMonth)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.88em' }}>
                      <span className={overdue || dueToday ? 'text-danger fw-bold' : ''}>
                        {dueDateStr}
                      </span>
                      {dueBadge}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        <i className="bi bi-bell me-1"></i>{emi.remindDaysBefore}d before
                      </span>
                    </td>
                    <td>
                      <div className="fw-medium">
                        <i className="bi bi-bank2 me-1 text-primary"></i>
                        {emi.bankAccountName}
                      </div>
                      {emi.bankAccountNumber && (
                        <div className="text-muted" style={{ fontSize: '0.75em' }}>A/C: {emi.bankAccountNumber}</div>
                      )}
                    </td>
                    <td>
                      {emi.totalEmis ? (
                        <div>
                          <div className="small fw-medium">{emi.emisPaid} / {emi.totalEmis}</div>
                          <div className="progress mt-1" style={{ height: 5, width: 80 }}>
                            <div className="progress-bar bg-success"
                              style={{ width: `${Math.min(100, (emi.emisPaid / emi.totalEmis) * 100)}%` }} />
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72em' }}>
                            {emi.totalEmis - emi.emisPaid} remaining
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted small">{emi.emisPaid} paid</span>
                      )}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.82em' }}>
                      {emi.lastPaidDate ? format(parseISO(emi.lastPaidDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td>
                      <span className={`badge bg-${STATUS_COLOR[emi.status]}`}>{emi.status}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {emi.status === 'ACTIVE' && (
                          <button className="btn btn-sm btn-success" title="Mark this month's EMI as paid"
                            onClick={() => handleMarkPaid(emi.id)}>
                            <i className="bi bi-check-circle me-1"></i>Paid
                          </button>
                        )}
                        {emi.status === 'ACTIVE' && (
                          <button className="btn btn-sm btn-outline-warning" title="Pause EMI"
                            onClick={() => handlePause(emi.id)}>
                            <i className="bi bi-pause-circle"></i>
                          </button>
                        )}
                        {emi.status === 'PAUSED' && (
                          <button className="btn btn-sm btn-outline-success" title="Resume EMI"
                            onClick={() => handleResume(emi.id)}>
                            <i className="bi bi-play-circle"></i>
                          </button>
                        )}
                        {emi.status !== 'COMPLETED' && (
                          <button className="btn btn-sm btn-outline-secondary" title="Mark as fully completed"
                            onClick={() => handleComplete(emi.id)}>
                            <i className="bi bi-flag-fill"></i>
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-primary" title="Edit"
                          onClick={() => openEdit(emi)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" title="Delete"
                          onClick={() => confirmDelete(emi.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-3 py-2 border-top text-muted" style={{ fontSize: '0.8rem' }}>
            {filtered.length} of {emis.length} EMIs
            {activeEmis.length > 0 && (
              <span className="ms-3">
                Active monthly outflow: <strong className="text-danger">₹{Number(monthlyOutflow).toLocaleString('en-IN')}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      <div className="modal fade" id="emiModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-plus-circle'} me-2 text-primary`}></i>
                  {editId ? 'Edit EMI' : 'Add EMI'}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="row g-3">

                  {/* EMI Details */}
                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                      EMI Details
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">EMI Name *</label>
                    <input type="text" className="form-control" required
                      placeholder="e.g. HDFC Home Loan, Car Loan EMI"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Lender / Bank *</label>
                    <input type="text" className="form-control" required
                      placeholder="e.g. HDFC Bank, SBI"
                      value={form.lenderName}
                      onChange={e => setForm({ ...form, lenderName: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">EMI Amount (₹) *</label>
                    <input type="number" className="form-control" required min={1} step={0.01}
                      placeholder="Monthly debit amount"
                      value={form.emiAmount}
                      onChange={e => setForm({ ...form, emiAmount: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Due Day of Month *</label>
                    <input type="number" className="form-control" required min={1} max={28}
                      placeholder="1 – 28"
                      value={form.dueDayOfMonth}
                      onChange={e => setForm({ ...form, dueDayOfMonth: e.target.value })} />
                    <div className="form-text">Keep ≤ 28 (safe for all months)</div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Start Date *</label>
                    <input type="date" className="form-control" required
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">End Date</label>
                    <input type="date" className="form-control"
                      value={form.endDate}
                      onChange={e => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Total EMIs</label>
                    <input type="number" className="form-control" min={1}
                      placeholder="e.g. 60, 120, 240"
                      value={form.totalEmis}
                      onChange={e => setForm({ ...form, totalEmis: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">EMIs Paid So Far</label>
                    <input type="number" className="form-control" min={0}
                      placeholder="0"
                      value={form.emisPaid}
                      onChange={e => setForm({ ...form, emisPaid: e.target.value })} />
                  </div>

                  {/* Bank Account */}
                  <div className="col-12 mt-1">
                    <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                      Bank Account to Maintain Balance In
                    </div>
                  </div>
                  <div className="col-md-7">
                    <label className="form-label fw-medium">Account Name *</label>
                    <input type="text" className="form-control" required
                      placeholder="e.g. SBI Savings, HDFC Current"
                      value={form.bankAccountName}
                      onChange={e => setForm({ ...form, bankAccountName: e.target.value })} />
                    <div className="form-text">This account must have sufficient balance before the due date</div>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-medium">Account Number</label>
                    <input type="text" className="form-control"
                      placeholder="Optional"
                      value={form.bankAccountNumber}
                      onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} />
                  </div>

                  {/* Reminder */}
                  <div className="col-12 mt-1">
                    <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                      Reminder
                    </div>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-medium">Remind Me *</label>
                    <div className="input-group">
                      <input type="number" className="form-control" required min={1} max={30}
                        value={form.remindDaysBefore}
                        onChange={e => setForm({ ...form, remindDaysBefore: e.target.value })} />
                      <span className="input-group-text">days before due date</span>
                    </div>
                    <div className="form-text">
                      {form.remindDaysBefore && form.dueDayOfMonth
                        ? `Reminder will show from the ${ordinal(Math.max(1, parseInt(form.dueDayOfMonth) - parseInt(form.remindDaysBefore)))} of each month`
                        : 'Set how early you want to be reminded to maintain balance'}
                    </div>
                  </div>
                  {form.emiAmount && form.remindDaysBefore && form.bankAccountName && (
                    <div className="col-md-7">
                      <div className="alert alert-info py-2 mb-0 small mt-4">
                        <i className="bi bi-bell-fill me-1"></i>
                        You will be reminded to keep <strong>₹{Number(parseFloat(form.emiAmount || 0)).toLocaleString('en-IN')}</strong> in&nbsp;
                        <strong>{form.bankAccountName}</strong> at least <strong>{form.remindDaysBefore} days</strong> before the {ordinal(parseInt(form.dueDayOfMonth) || 1)} of each month.
                      </div>
                    </div>
                  )}
                  <div className="col-12">
                    <label className="form-label fw-medium">Remarks</label>
                    <input type="text" className="form-control"
                      placeholder="Any notes about this EMI..."
                      value={form.remarks}
                      onChange={e => setForm({ ...form, remarks: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {editId ? 'Save Changes' : 'Add EMI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <div className="modal fade" id="deleteEmiModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>Delete EMI
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">Delete this EMI tracker entry?</div>
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
