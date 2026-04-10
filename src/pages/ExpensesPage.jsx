import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'bootstrap';
import { expenseAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'FOOD',          label: 'Food & Dining',    icon: 'bi-cup-hot',          color: '#fd7e14' },
  { value: 'TRANSPORT',     label: 'Transport',         icon: 'bi-car-front',        color: '#0dcaf0' },
  { value: 'UTILITIES',     label: 'Utilities',         icon: 'bi-lightning-charge', color: '#0d6efd' },
  { value: 'RENT',          label: 'Rent',              icon: 'bi-house',            color: '#6c757d' },
  { value: 'SALARY',        label: 'Salary / Staff',    icon: 'bi-people',           color: '#198754' },
  { value: 'OFFICE',        label: 'Office Expenses',   icon: 'bi-briefcase',        color: '#343a40' },
  { value: 'MAINTENANCE',   label: 'Maintenance',       icon: 'bi-tools',            color: '#dc3545' },
  { value: 'ENTERTAINMENT', label: 'Entertainment',     icon: 'bi-camera-video',     color: '#6f42c1' },
  { value: 'MEDICAL',       label: 'Medical',           icon: 'bi-heart-pulse',      color: '#d63384' },
  { value: 'EMI',           label: 'EMI',               icon: 'bi-calendar-check',   color: '#20c997' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous',     icon: 'bi-three-dots',       color: '#adb5bd' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));
const PAYMENT_LABELS = { CASH: 'Cash', UPI: 'UPI', BANK: 'Bank Transfer' };

const PERIODS = [
  { key: 'DAILY',     label: 'Daily' },
  { key: 'MONTHLY',   label: 'Monthly' },
  { key: 'QUARTERLY', label: 'Quarterly' },
  { key: 'YEARLY',    label: 'Yearly' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodDates(period) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-based

  switch (period) {
    case 'DAILY': {
      const d = today.toISOString().split('T')[0];
      return {
        start: d, end: d,
        label: today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      };
    }
    case 'MONTHLY': {
      const start = new Date(y, m, 1).toISOString().split('T')[0];
      const end   = new Date(y, m + 1, 0).toISOString().split('T')[0];
      return { start, end, label: today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
    }
    case 'QUARTERLY': {
      const q = Math.floor(m / 3);
      const startDate = new Date(y, q * 3, 1);
      const endDate   = new Date(y, q * 3 + 3, 0);
      const qLabels = ['Q1 (Jan – Mar)', 'Q2 (Apr – Jun)', 'Q3 (Jul – Sep)', 'Q4 (Oct – Dec)'];
      return {
        start: startDate.toISOString().split('T')[0],
        end:   endDate.toISOString().split('T')[0],
        label: `${qLabels[q]} ${y}`,
      };
    }
    case 'YEARLY':
      return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Year ${y}` };
    default:
      return getPeriodDates('MONTHLY');
  }
}

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

const todayStr = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  title: '', amount: '', category: '',
  expenseDate: todayStr(), paymentMethod: 'CASH', remarks: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [period, setPeriod]             = useState('MONTHLY');
  const [expenses, setExpenses]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filterCategory, setFilterCat] = useState('');
  const [search, setSearch]             = useState('');
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [editId, setEditId]             = useState(null);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');
  const [deleteId, setDeleteId]         = useState(null);

  const { start, end, label: periodLabel } = getPeriodDates(period);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expenseAPI.getAll(start, end);
      setExpenses(res.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ─── Computed summary ───────────────────────────────────────────────────────

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const avgAmount   = expenses.length ? totalAmount / expenses.length : 0;

  const byCategory = CATEGORIES
    .map(cat => ({
      ...cat,
      total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
      count: expenses.filter(e => e.category === cat.value).length,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const topCategory = byCategory[0];

  // Timeline: group by day (daily/monthly) or month (quarterly/yearly)
  const timeline = (() => {
    const map = {};
    expenses.forEach(exp => {
      const key = (period === 'QUARTERLY' || period === 'YEARLY')
        ? exp.expenseDate.substring(0, 7)
        : exp.expenseDate;
      map[key] = (map[key] || 0) + Number(exp.amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        let label;
        if (period === 'QUARTERLY' || period === 'YEARLY') {
          const [yr, mo] = k.split('-');
          label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
            .toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        } else {
          label = format(parseISO(k), period === 'DAILY' ? 'dd MMM yyyy' : 'dd MMM (EEE)');
        }
        return { key: k, label, amount: v };
      });
  })();

  const maxTimeline = Math.max(...timeline.map(t => t.amount), 1);

  // ─── Filtered list ───────────────────────────────────────────────────────────

  const filtered = expenses.filter(e =>
    (!filterCategory || e.category === filterCategory) &&
    (!search || e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.remarks?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount), 0);

  // ─── Modals ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, expenseDate: todayStr() });
    setFormError('');
    new Modal(document.getElementById('expenseModal')).show();
  }

  function openEdit(exp) {
    setEditId(exp.id);
    setForm({
      title: exp.title,
      amount: String(exp.amount),
      category: exp.category || '',
      expenseDate: exp.expenseDate,
      paymentMethod: exp.paymentMethod || 'CASH',
      remarks: exp.remarks || '',
    });
    setFormError('');
    new Modal(document.getElementById('expenseModal')).show();
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        category: form.category || null,
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
        remarks: form.remarks.trim() || null,
      };
      if (editId) {
        const res = await expenseAPI.update(editId, payload);
        const updated = res.data.data;
        if (updated.expenseDate >= start && updated.expenseDate <= end) {
          setExpenses(prev => prev.map(ex => ex.id === updated.id ? updated : ex));
        } else {
          setExpenses(prev => prev.filter(ex => ex.id !== updated.id));
        }
      } else {
        const res = await expenseAPI.create(payload);
        const created = res.data.data;
        if (created.expenseDate >= start && created.expenseDate <= end) {
          setExpenses(prev => [created, ...prev].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)));
        }
      }
      Modal.getInstance(document.getElementById('expenseModal'))?.hide();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    new Modal(document.getElementById('deleteExpenseModal')).show();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const id = deleteId;
    try {
      await expenseAPI.delete(id);
      setDeleteId(null);
      Modal.getInstance(document.getElementById('deleteExpenseModal'))?.hide();
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) { setError(err.message); }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

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

      {/* ── Period Tabs ───────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <ul className="nav nav-pills mb-0">
          {PERIODS.map(p => (
            <li className="nav-item" key={p.key}>
              <button
                className={`nav-link ${period === p.key ? 'active' : ''}`}
                onClick={() => { setPeriod(p.key); setFilterCat(''); setSearch(''); }}>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        <span className="text-muted small">
          <i className="bi bi-calendar3 me-1"></i>{periodLabel}
        </span>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25 h-100">
            <div className="small text-muted">Total Expenses</div>
            <div className="fw-bold fs-5 text-danger">₹{fmt(totalAmount)}</div>
            <div className="text-muted" style={{ fontSize: '0.75em' }}>{expenses.length} transactions</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25 h-100">
            <div className="small text-muted">Avg per Transaction</div>
            <div className="fw-bold fs-5 text-primary">₹{fmt(Math.round(avgAmount))}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-warning bg-opacity-10 border border-warning border-opacity-25 h-100">
            <div className="small text-muted">Top Category</div>
            {topCategory ? (
              <>
                <div className="fw-bold" style={{ color: topCategory.color, fontSize: '0.95em' }}>
                  <i className={`bi ${topCategory.icon} me-1`}></i>{topCategory.label}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75em' }}>₹{fmt(topCategory.total)}</div>
              </>
            ) : <div className="text-muted fw-bold">—</div>}
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-success bg-opacity-10 border border-success border-opacity-25 h-100">
            <div className="small text-muted">Categories Used</div>
            <div className="fw-bold fs-4 text-success">{byCategory.length}</div>
            <div className="text-muted" style={{ fontSize: '0.75em' }}>of {CATEGORIES.length} total</div>
          </div>
        </div>
      </div>

      {/* ── Category Breakdown + Timeline ─────────────────────────────────── */}
      {expenses.length > 0 && (
        <div className="row g-3 mb-3">

          {/* Category Breakdown */}
          <div className="col-md-5">
            <div className="table-card h-100">
              <div className="px-3 py-2 border-bottom fw-medium text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>
                <i className="bi bi-pie-chart me-2"></i>By Category
              </div>
              <div className="p-3">
                {byCategory.map(cat => (
                  <div key={cat.value} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="d-flex align-items-center gap-2" style={{ fontSize: '0.88em' }}>
                        <i className={`bi ${cat.icon}`} style={{ color: cat.color }}></i>
                        {cat.label}
                        <span className="text-muted" style={{ fontSize: '0.82em' }}>({cat.count})</span>
                      </span>
                      <span className="fw-medium" style={{ fontSize: '0.88em' }}>
                        ₹{fmt(cat.total)}
                        <span className="text-muted ms-1" style={{ fontSize: '0.85em' }}>
                          ({totalAmount > 0 ? Math.round((cat.total / totalAmount) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div className="progress-bar"
                        style={{
                          width: `${totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0}%`,
                          backgroundColor: cat.color,
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="col-md-7">
            <div className="table-card h-100">
              <div className="px-3 py-2 border-bottom fw-medium text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>
                <i className="bi bi-bar-chart me-2"></i>
                {period === 'DAILY' ? 'Breakdown' : period === 'MONTHLY' ? 'Day-wise' : 'Month-wise'}
              </div>
              {timeline.length === 0 ? (
                <div className="p-3 text-muted text-center">No data for this period</div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="table table-sm mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>{period === 'QUARTERLY' || period === 'YEARLY' ? 'Month' : 'Date'}</th>
                        <th className="text-end">Amount</th>
                        <th style={{ width: '38%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map(t => (
                        <tr key={t.key}>
                          <td style={{ fontSize: '0.85em' }}>{t.label}</td>
                          <td className="text-end fw-medium" style={{ fontSize: '0.85em' }}>₹{fmt(t.amount)}</td>
                          <td className="align-middle">
                            <div className="progress" style={{ height: 8 }}>
                              <div className="progress-bar bg-danger bg-opacity-75"
                                style={{ width: `${(t.amount / maxTimeline) * 100}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-bold border-top">
                        <td>Total</td>
                        <td className="text-end text-danger">₹{fmt(totalAmount)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap align-items-center gap-2 justify-content-between mb-2">
        <div className="d-flex gap-2 flex-wrap">
          <div className="input-group" style={{ maxWidth: 220 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input type="text" className="form-control border-start-0 ps-0"
              placeholder="Search..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ maxWidth: 190 }}
            value={filterCategory} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="bi bi-plus-lg"></i> Add Expense
        </button>
      </div>

      {/* ── Expense Table ─────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Payment</th>
                <th className="text-end">Amount</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">
                  <i className="bi bi-receipt fs-3 d-block mb-2"></i>
                  {expenses.length === 0
                    ? `No expenses recorded for ${periodLabel}`
                    : 'No matches for current filters'}
                </td></tr>
              ) : filtered.map(exp => {
                const cat = CAT_MAP[exp.category];
                return (
                  <tr key={exp.id}>
                    <td className="text-muted" style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>
                      {format(parseISO(exp.expenseDate), 'dd MMM yyyy')}
                    </td>
                    <td className="fw-medium">{exp.title}</td>
                    <td>
                      {cat ? (
                        <span className="badge rounded-pill d-inline-flex align-items-center gap-1"
                          style={{ backgroundColor: cat.color + '22', color: cat.color, border: `1px solid ${cat.color}55`, fontSize: '0.78em' }}>
                          <i className={`bi ${cat.icon}`}></i>{cat.label}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border" style={{ fontSize: '0.75em' }}>
                        {PAYMENT_LABELS[exp.paymentMethod] || exp.paymentMethod}
                      </span>
                    </td>
                    <td className="text-end fw-bold text-danger">₹{fmt(exp.amount)}</td>
                    <td className="text-muted" style={{ fontSize: '0.82em', maxWidth: 160 }}>
                      <span className="text-truncate d-block">{exp.remarks || '—'}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" title="Edit"
                          onClick={() => openEdit(exp)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" title="Delete"
                          onClick={() => confirmDelete(exp.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="fw-bold border-top bg-light">
                  <td colSpan={4} className="text-end text-muted" style={{ fontSize: '0.85em' }}>
                    {(filterCategory || search) ? `${filtered.length} of ${expenses.length} shown` : `${expenses.length} expenses`}
                  </td>
                  <td className="text-end text-danger">₹{fmt(filteredTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      <div className="modal fade" id="expenseModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-plus-circle'} me-2 text-primary`}></i>
                  {editId ? 'Edit Expense' : 'Add Expense'}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="row g-3">
                  <div className="col-8">
                    <label className="form-label fw-medium">Title *</label>
                    <input type="text" className="form-control" required
                      placeholder="e.g. Office rent, Petrol, Lunch"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="col-4">
                    <label className="form-label fw-medium">Amount (₹) *</label>
                    <input type="number" className="form-control" required min={0.01} step={0.01}
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Category</label>
                    <select className="form-select"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="">— Select —</option>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Date *</label>
                    <input type="date" className="form-control" required
                      value={form.expenseDate}
                      onChange={e => setForm({ ...form, expenseDate: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Payment Method</label>
                    <div className="d-flex gap-3">
                      {['CASH', 'UPI', 'BANK'].map(m => (
                        <div className="form-check" key={m}>
                          <input type="radio" className="form-check-input" name="paymentMethod"
                            id={`pm_${m}`} value={m} checked={form.paymentMethod === m}
                            onChange={() => setForm({ ...form, paymentMethod: m })} />
                          <label className="form-check-label" htmlFor={`pm_${m}`}>{PAYMENT_LABELS[m]}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Remarks</label>
                    <input type="text" className="form-control"
                      placeholder="Optional notes"
                      value={form.remarks}
                      onChange={e => setForm({ ...form, remarks: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-1" />}
                  {editId ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <div className="modal fade" id="deleteExpenseModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>Delete Expense
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">This expense will be permanently deleted.</div>
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
