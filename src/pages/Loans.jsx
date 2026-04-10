import React, { useState, useEffect } from 'react';
import { Modal } from 'bootstrap';
import { loanAPI, borrowerAPI, adminAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

const EMPTY = {
  borrowerId: '',
  loanType: 'MONTHLY',
  principal: '',
  interestRate: '',
  tenureMonths: '',
  disbursementDate: new Date().toISOString().split('T')[0],
  notes: '',
  notificationType: 'EMAIL',
  dailyAmount: '',
  totalDays: '',
  receivableAmount: '',
  recoveryDate: new Date().toISOString().split('T')[0],
  emiAmount: '',
};

const STATUS_COLORS = { ACTIVE: 'success', COMPLETED: 'secondary', DEFAULTED: 'danger' };

function ViaSelector({ name, via, onViaChange, accountId, onAccountChange, accounts }) {
  return (
    <>
      <span className="small fw-medium text-nowrap">Received via:</span>
      {['CASH', 'UPI'].map(v => (
        <div key={v} className="form-check form-check-inline mb-0">
          <input type="radio" className="form-check-input" name={name}
            id={`${name}-${v}`} checked={via === v}
            onChange={() => { onViaChange(v); if (v === 'CASH') onAccountChange(''); }} />
          <label className="form-check-label small" htmlFor={`${name}-${v}`}>
            {v === 'CASH' ? 'Cash' : 'UPI'}
          </label>
        </div>
      ))}
      {via === 'UPI' && (
        <select className="form-select form-select-sm" style={{ maxWidth: 240 }}
          value={accountId} onChange={e => onAccountChange(e.target.value)}>
          <option value="">— Select UPI account *</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.bankName} · {acc.upiId}</option>
          ))}
        </select>
      )}
    </>
  );
}

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [preview, setPreview] = useState(null);
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [payingRowId, setPayingRowId] = useState(null);
  const [payingVia, setPayingVia] = useState('CASH');
  const [payingAccountId, setPayingAccountId] = useState('');
  const [payingDate, setPayingDate] = useState('');
  const [payingRemarks, setPayingRemarks] = useState('');
  const [extendRemarks, setExtendRemarks] = useState('');
  const [closeEarlyRemarks, setCloseEarlyRemarks] = useState('');
  const [settleRemarks, setSettleRemarks] = useState('');
  const [showCloseEarly, setShowCloseEarly] = useState(false);
  const [closeEarlyVia, setCloseEarlyVia] = useState('CASH');
  const [closeEarlyAccountId, setCloseEarlyAccountId] = useState('');
  const [closingEarly, setClosingEarly] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [extending, setExtending] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [settleVia, setSettleVia] = useState('CASH');
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settleDate, setSettleDate] = useState('');
  const [settling, setSettling] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [loansRes, borrowersRes, accountsRes] = await Promise.all([
        loanAPI.getAll(),
        borrowerAPI.getAll(),
        adminAPI.getActiveAccounts(),
      ]);
      setLoans(loansRes.data.data);
      setBorrowers(borrowersRes.data.data);
      setAdminAccounts(accountsRes.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function calcPreview() {
    if (form.loanType === 'EMI') {
      const p = parseFloat(form.principal);
      const emi = parseFloat(form.emiAmount);
      const n = parseInt(form.tenureMonths);
      if (!p || !emi || !n) { setPreview(null); return; }
      const totalCollectable = parseFloat((emi * n).toFixed(2));
      const profit = parseFloat((totalCollectable - p).toFixed(2));
      setPreview({ type: 'EMI', totalCollectable, profit, emi, months: n });
      return;
    }
    if (form.loanType === 'DAILY') {
      const disbursed = parseFloat(form.principal);
      const daily = parseFloat(form.dailyAmount);
      const days = parseInt(form.totalDays);
      if (!disbursed || !daily || !days) { setPreview(null); return; }
      const totalCollectable = parseFloat((daily * days).toFixed(2));
      const profit = parseFloat((totalCollectable - disbursed).toFixed(2));
      setPreview({ type: 'DAILY', totalCollectable, profit, daily });
    } else {
      const p = parseFloat(form.principal);
      const r = parseFloat(form.interestRate);
      const n = parseInt(form.tenureMonths);
      if (!p || !r || !n) { setPreview(null); return; }
      const monthlyInterest = parseFloat(((p * r) / 100).toFixed(2));
      const disbursed = parseFloat((p - monthlyInterest).toFixed(2));
      const totalInterest = parseFloat((monthlyInterest * n).toFixed(2));
      setPreview({ type: 'MONTHLY', monthlyInterest, disbursed, totalInterest });
    }
  }

  function openCreate() {
    setForm(EMPTY);
    setFormError('');
    setPreview(null);
    new Modal(document.getElementById('loanModal')).show();
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        loanType: form.loanType,
        principal: parseFloat(form.principal),
        disbursementDate: form.disbursementDate,
        notes: form.notes,
        borrower: { id: parseInt(form.borrowerId) },
      };
      if (form.loanType === 'DAILY') {
        payload.dailyAmount = parseFloat(form.dailyAmount);
        payload.totalDays = parseInt(form.totalDays);
      } else if (form.loanType === 'FLEXIBLE') {
        payload.interestRate = parseFloat(form.interestRate);
      } else if (form.loanType === 'ONETIME') {
        payload.receivableAmount = parseFloat(form.receivableAmount);
        payload.recoveryDate = form.recoveryDate;
      } else if (form.loanType === 'EMI') {
        payload.emiAmount = parseFloat(form.emiAmount);
        payload.tenureMonths = parseInt(form.tenureMonths);
      } else {
        payload.interestRate = parseFloat(form.interestRate);
        payload.tenureMonths = parseInt(form.tenureMonths);
      }
      await loanAPI.create(payload, form.notificationType);
      Modal.getInstance(document.getElementById('loanModal'))?.hide();
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openSchedule(loan) {
    setSelectedLoan(loan);
    setPayingRowId(null);
    setPayingVia('CASH');
    setPayingAccountId('');
    setPayingDate('');
    setPayingRemarks('');
    setExtendRemarks('');
    setCloseEarlyRemarks('');
    setSettleRemarks('');
    setShowCloseEarly(false);
    setCloseEarlyVia('CASH');
    setCloseEarlyAccountId('');
    setShowExtend(false);
    setExtensionMonths(1);
    setShowSettle(false);
    setSettleVia('CASH');
    setSettleAccountId('');
    setSettleDate('');
    new Modal(document.getElementById('scheduleModal')).show();
  }

  function applyUpdate(updatedLoan) {
    setSelectedLoan(updatedLoan);
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
  }

  async function handleTogglePay(loanId, scheduleId, isPaid) {
    try {
      const res = isPaid
        ? await loanAPI.markUnpaid(loanId, scheduleId)
        : await loanAPI.markPaid(loanId, scheduleId, payingAccountId, payingDate, payingVia, payingRemarks);
      applyUpdate(res.data.data);
      setPayingRowId(null);
      setPayingVia('CASH');
      setPayingAccountId('');
      setPayingDate('');
      setPayingRemarks('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusAction(id, action) {
    try {
      const res = await (action === 'complete' ? loanAPI.complete(id) : loanAPI.markDefault(id));
      Modal.getInstance(document.getElementById('scheduleModal'))?.hide();
      setLoans(prev => prev.map(l => l.id === id ? res.data.data : l));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSettle() {
    if (settleVia === 'UPI' && !settleAccountId) return;
    setSettling(true);
    try {
      const res = selectedLoan.loanType === 'DAILY'
        ? await loanAPI.closeDaily(selectedLoan.id, settleAccountId, settleDate, settleVia, settleRemarks)
        : await loanAPI.settle(selectedLoan.id, settleAccountId, settleDate, settleVia, settleRemarks);
      applyUpdate(res.data.data);
      setShowSettle(false);
      setSettleVia('CASH');
      setSettleAccountId('');
      setSettleDate('');
      setSettleRemarks('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSettling(false);
    }
  }

  async function handleExtend() {
    if (extensionMonths < 1) return;
    setExtending(true);
    try {
      const res = await loanAPI.extend(selectedLoan.id, extensionMonths, extendRemarks);
      applyUpdate(res.data.data);
      setShowExtend(false);
      setExtensionMonths(1);
      setExtendRemarks('');
    } catch (err) {
      setError(err.message);
    } finally {
      setExtending(false);
    }
  }

  async function handleCloseEarly() {
    if (closeEarlyVia === 'UPI' && !closeEarlyAccountId && selectedLoan.loanType === 'MONTHLY') return;
    setClosingEarly(true);
    try {
      const res = await loanAPI.closeEarly(selectedLoan.id, closeEarlyAccountId, 'EMAIL', closeEarlyVia, closeEarlyRemarks);
      applyUpdate(res.data.data);
      setShowCloseEarly(false);
      setCloseEarlyVia('CASH');
      setCloseEarlyAccountId('');
      setCloseEarlyRemarks('');
    } catch (err) {
      setError(err.message);
    } finally {
      setClosingEarly(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const idToDelete = deleteId;
    try {
      await loanAPI.delete(idToDelete);
      setDeleteId(null);
      Modal.getInstance(document.getElementById('deleteLoanModal'))?.hide();
      setLoans(prev => prev.filter(l => l.id !== idToDelete));
    } catch (err) {
      setError(err.message);
    }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    new Modal(document.getElementById('deleteLoanModal')).show();
  }

  const filtered = loans.filter(l => {
    const matchSearch =
      l.borrower?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.notes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || l.status === filterStatus;
    const matchType = !filterType || l.loanType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const typeCounts = {
    '': loans.length,
    MONTHLY: loans.filter(l => l.loanType === 'MONTHLY').length,
    DAILY: loans.filter(l => l.loanType === 'DAILY').length,
    FLEXIBLE: loans.filter(l => l.loanType === 'FLEXIBLE').length,
    ONETIME: loans.filter(l => l.loanType === 'ONETIME').length,
    EMI: loans.filter(l => l.loanType === 'EMI').length,
  };

  const monthlyInterest = loan => ((loan.principal * loan.interestRate) / 100).toFixed(2);
  const totalInterest = loan => (parseFloat(monthlyInterest(loan)) * loan.tenureMonths).toFixed(2);
  const dailyProfit = loan => ((loan.dailyAmount * loan.totalDays) - loan.principal).toFixed(2);
  const emiProfit = loan => ((loan.emiAmount * loan.tenureMonths) - loan.principal).toFixed(2);

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

      <div className="d-flex flex-wrap align-items-center gap-2 justify-content-between mb-3">
        <div className="d-flex gap-2">
          <div className="input-group" style={{ maxWidth: 260 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input type="text" className="form-control border-start-0 ps-0"
              placeholder="Search loans..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 150 }} value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="DEFAULTED">Defaulted</option>
          </select>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="bi bi-plus-lg"></i> New Loan
        </button>
      </div>

      <ul className="nav nav-tabs mb-0" style={{ borderBottom: 'none' }}>
        {[
          { value: '', label: 'All', icon: 'bi-list-ul' },
          { value: 'MONTHLY', label: 'Monthly', icon: 'bi-calendar-month' },
          { value: 'DAILY', label: 'Daily', icon: 'bi-calendar-day' },
          { value: 'FLEXIBLE', label: 'Flexible', icon: 'bi-clock-history' },
          { value: 'ONETIME', label: 'One-Time', icon: 'bi-arrow-return-left' },
          { value: 'EMI', label: 'EMI', icon: 'bi-calendar-range' },
        ].map(tab => (
          <li className="nav-item" key={tab.value}>
            <button
              className={`nav-link d-flex align-items-center gap-1 ${filterType === tab.value ? 'active' : ''}`}
              onClick={() => setFilterType(tab.value)}>
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
              <span className={`badge ms-1 ${filterType === tab.value ? 'bg-primary' : 'bg-secondary'}`}
                style={{ fontSize: '0.7em' }}>
                {typeCounts[tab.value]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="table-card" style={{ borderTopLeftRadius: 0 }}>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Borrower</th>
                <th>Principal</th>
                <th>Rate</th>
                <th>Tenure</th>
                <th>Monthly Interest</th>
                <th>Total Interest</th>
                <th>Disbursed</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-muted py-4">
                  <i className="bi bi-cash-coin fs-3 d-block mb-2"></i>
                  {search || filterStatus || filterType ? 'No matches found' : 'No loans yet'}
                </td></tr>
              ) : filtered.map((loan, i) => (
                <tr key={loan.id}>
                  <td className="text-muted">{i + 1}</td>
                  <td className="fw-medium">{loan.borrower?.name}</td>
                  <td>
                    ₹{Number(loan.principal).toLocaleString('en-IN')}
                    {loan.loanType === 'DAILY' && <span className="badge ms-1" style={{ background: '#7c3aed', fontSize: '0.65em' }}>DAILY</span>}
                    {loan.loanType === 'FLEXIBLE' && <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65em' }}>FLEXIBLE</span>}
                    {loan.loanType === 'ONETIME' && <span className="badge bg-info text-dark ms-1" style={{ fontSize: '0.65em' }}>ONE-TIME</span>}
                    {loan.loanType === 'EMI' && <span className="badge bg-success ms-1" style={{ fontSize: '0.65em' }}>EMI</span>}
                  </td>
                  <td>
                    {loan.loanType === 'DAILY' ? `₹${Number(loan.dailyAmount).toLocaleString('en-IN')}/day`
                      : loan.loanType === 'EMI' ? `₹${Number(loan.emiAmount).toLocaleString('en-IN')}/mo`
                      : loan.loanType === 'ONETIME' ? <span className="text-muted">—</span>
                      : `${loan.interestRate}%/mo`}
                  </td>
                  <td>
                    {loan.loanType === 'DAILY' ? `${loan.totalDays}d`
                      : loan.loanType === 'FLEXIBLE' ? <span className="text-muted">Open</span>
                      : loan.loanType === 'ONETIME' ? (loan.recoveryDate ? format(parseISO(loan.recoveryDate), 'dd MMM yy') : '—')
                      : `${loan.tenureMonths}m`}
                  </td>
                  <td className="text-primary">
                    {loan.loanType === 'DAILY' || loan.loanType === 'FLEXIBLE' || loan.loanType === 'ONETIME'
                      ? <span className="text-muted">—</span>
                      : loan.loanType === 'EMI'
                        ? `₹${Number(loan.emiAmount).toLocaleString('en-IN')}`
                        : `₹${Number(monthlyInterest(loan)).toLocaleString('en-IN')}`}
                  </td>
                  <td className="text-warning">
                    {loan.loanType === 'DAILY'
                      ? <span title="Profit">₹{Number(dailyProfit(loan)).toLocaleString('en-IN')}</span>
                      : loan.loanType === 'FLEXIBLE'
                        ? <span className="text-muted">On settle</span>
                        : loan.loanType === 'ONETIME'
                          ? <span title="Profit">₹{Number(loan.receivableAmount - loan.principal).toLocaleString('en-IN')}</span>
                          : loan.loanType === 'EMI'
                            ? <span title="Profit">₹{Number(emiProfit(loan)).toLocaleString('en-IN')}</span>
                            : `₹${Number(totalInterest(loan)).toLocaleString('en-IN')}`}
                  </td>
                  <td className="text-success fw-medium">
                    ₹{Number(loan.disbursedAmount).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={`badge bg-${STATUS_COLORS[loan.status]}`}>{loan.status}</span>
                  </td>
                  <td className="text-muted">
                    {loan.disbursementDate ? format(parseISO(loan.disbursementDate), 'dd MMM yyyy') : '—'}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-info me-1" title="Payment Schedule"
                      onClick={() => openSchedule(loan)}>
                      <i className="bi bi-calendar-check"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(loan.id)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-top text-muted" style={{ fontSize: '0.8rem' }}>
          {filtered.length} of {loans.length} loans
        </div>
      </div>

      {/* New Loan Modal */}
      <div className="modal fade" id="loanModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title">New Loan</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-medium">Borrower *</label>
                    <select className="form-select" required value={form.borrowerId}
                      onChange={e => setForm({ ...form, borrowerId: e.target.value })}>
                      <option value="">Select borrower...</option>
                      {borrowers.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Loan Type *</label>
                    <div className="d-flex gap-3">
                      {[
                        { value: 'MONTHLY', icon: 'bi-calendar-month', label: 'Monthly Finance' },
                        { value: 'DAILY', icon: 'bi-calendar-day', label: 'Daily Finance' },
                        { value: 'FLEXIBLE', icon: 'bi-clock-history', label: 'Flexible (Open-ended)' },
                        { value: 'ONETIME', icon: 'bi-arrow-return-left', label: 'One-Time' },
                        { value: 'EMI', icon: 'bi-calendar-range', label: 'EMI Collection' },
                      ].map(opt => (
                        <div key={opt.value} className="form-check">
                          <input type="radio" className="form-check-input" name="loanType"
                            id={`lt_${opt.value}`} value={opt.value}
                            checked={form.loanType === opt.value}
                            onChange={() => setForm({ ...EMPTY, borrowerId: form.borrowerId, disbursementDate: form.disbursementDate, notificationType: form.notificationType, loanType: opt.value })} />
                          <label className="form-check-label" htmlFor={`lt_${opt.value}`}>
                            <i className={`bi ${opt.icon} me-1`}></i>{opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {form.loanType === 'EMI' ? (
                    <>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Principal Given (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          value={form.principal}
                          onChange={e => setForm({ ...form, principal: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Monthly Collection (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          placeholder="Amount to collect each month"
                          value={form.emiAmount}
                          onChange={e => setForm({ ...form, emiAmount: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Tenure (months) *</label>
                        <input type="number" className="form-control" required min={1} max={360}
                          value={form.tenureMonths}
                          onChange={e => setForm({ ...form, tenureMonths: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                    </>
                  ) : form.loanType === 'ONETIME' ? (
                    <>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Amount Given (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          value={form.principal}
                          onChange={e => setForm({ ...form, principal: e.target.value })} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Amount to Receive (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          value={form.receivableAmount}
                          onChange={e => setForm({ ...form, receivableAmount: e.target.value })} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Recovery Date *</label>
                        <input type="date" className="form-control" required
                          value={form.recoveryDate}
                          onChange={e => setForm({ ...form, recoveryDate: e.target.value })} />
                      </div>
                    </>
                  ) : form.loanType === 'FLEXIBLE' ? (
                    <>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Principal (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          value={form.principal}
                          onChange={e => setForm({ ...form, principal: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Interest Rate (% / month) *</label>
                        <input type="number" className="form-control" required min={0.01} max={100} step={0.01}
                          value={form.interestRate}
                          onChange={e => setForm({ ...form, interestRate: e.target.value })} />
                      </div>
                      <div className="col-12">
                        <div className="alert alert-info py-2 mb-0 small">
                          <i className="bi bi-info-circle me-1"></i>
                          Tenure is open-ended. When the borrower repays, use <strong>Settle</strong> in the schedule modal to calculate the total due based on actual repayment date.
                        </div>
                      </div>
                    </>
                  ) : form.loanType === 'DAILY' ? (
                    <>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Amount Disbursed (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          value={form.principal}
                          onChange={e => setForm({ ...form, principal: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Daily Amount (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          value={form.dailyAmount}
                          onChange={e => setForm({ ...form, dailyAmount: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Total Days *</label>
                        <input type="number" className="form-control" required min={1} max={3650}
                          value={form.totalDays}
                          onChange={e => setForm({ ...form, totalDays: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Principal (₹) *</label>
                        <input type="number" className="form-control" required min={1} step={0.01}
                          value={form.principal}
                          onChange={e => setForm({ ...form, principal: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Interest Rate (% / month) *</label>
                        <input type="number" className="form-control" required min={0.01} max={100} step={0.01}
                          value={form.interestRate}
                          onChange={e => setForm({ ...form, interestRate: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Tenure (months) *</label>
                        <input type="number" className="form-control" required min={1} max={360}
                          value={form.tenureMonths}
                          onChange={e => setForm({ ...form, tenureMonths: e.target.value })}
                          onBlur={calcPreview} />
                      </div>
                    </>
                  )}

                  <div className="col-md-6">
                    <label className="form-label fw-medium">Disbursement Date *</label>
                    <input type="date" className="form-control" required value={form.disbursementDate}
                      onChange={e => setForm({ ...form, disbursementDate: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Remarks</label>
                    <input type="text" className="form-control" placeholder="e.g. Home loan, personal..."
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Notify Borrower via</label>
                    <div className="d-flex gap-3">
                      {[
                        { value: 'EMAIL', icon: 'bi-envelope', label: 'Email' },
                        { value: 'IN_APP', icon: 'bi-bell', label: 'In-App Only' },
                        { value: 'NONE', icon: 'bi-bell-slash', label: 'No Notification' },
                      ].map(opt => (
                        <div key={opt.value} className="form-check">
                          <input type="radio" className="form-check-input" name="notifType"
                            id={`notif_${opt.value}`} value={opt.value}
                            checked={form.notificationType === opt.value}
                            onChange={() => setForm({ ...form, notificationType: opt.value })} />
                          <label className="form-check-label" htmlFor={`notif_${opt.value}`}>
                            <i className={`bi ${opt.icon} me-1`}></i>{opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {preview && (
                    <div className="col-12">
                      <div className="row g-2">
                        {preview.type === 'EMI' ? (
                          <>
                            <div className="col-4">
                              <div className="p-2 rounded bg-primary bg-opacity-10 text-center">
                                <div className="small text-muted">Monthly Collection</div>
                                <div className="fw-bold text-primary">₹{Number(preview.emi).toLocaleString('en-IN')}/mo</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="p-2 rounded bg-warning bg-opacity-10 text-center">
                                <div className="small text-muted">Total Collectible</div>
                                <div className="fw-bold text-warning">₹{Number(preview.totalCollectable).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="p-2 rounded bg-success bg-opacity-10 text-center">
                                <div className="small text-muted">Profit</div>
                                <div className="fw-bold text-success">₹{Number(preview.profit).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                          </>
                        ) : preview.type === 'DAILY' ? (
                          <>
                            <div className="col-4">
                              <div className="p-2 rounded bg-primary bg-opacity-10 text-center">
                                <div className="small text-muted">Daily Amount</div>
                                <div className="fw-bold text-primary">₹{Number(preview.daily).toLocaleString('en-IN')}/day</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="p-2 rounded bg-warning bg-opacity-10 text-center">
                                <div className="small text-muted">Total Collectible</div>
                                <div className="fw-bold text-warning">₹{Number(preview.totalCollectable).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="p-2 rounded bg-success bg-opacity-10 text-center">
                                <div className="small text-muted">Profit</div>
                                <div className="fw-bold text-success">₹{Number(preview.profit).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="col-4">
                              <div className="p-2 rounded bg-primary bg-opacity-10 text-center">
                                <div className="small text-muted">Monthly Interest</div>
                                <div className="fw-bold text-primary">₹{Number(preview.monthlyInterest).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="p-2 rounded bg-warning bg-opacity-10 text-center">
                                <div className="small text-muted">Total Interest</div>
                                <div className="fw-bold text-warning">₹{Number(preview.totalInterest).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="p-2 rounded bg-success bg-opacity-10 text-center">
                                <div className="small text-muted">Amount Disbursed</div>
                                <div className="fw-bold text-success">₹{Number(preview.disbursed).toLocaleString('en-IN')}</div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  Disburse Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Payment Schedule Modal */}
      <div className="modal fade" id="scheduleModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Payment Schedule — {selectedLoan?.borrower?.name}
                <span className={`badge bg-${STATUS_COLORS[selectedLoan?.status]} ms-2`}>
                  {selectedLoan?.status}
                </span>
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            {selectedLoan && (
              <>
                <div className="modal-body p-0">
                  <div className="px-3 py-2 bg-light d-flex gap-4 border-bottom flex-wrap">
                    {selectedLoan.loanType === 'EMI' ? (
                      <>
                        <span className="small"><strong>Principal:</strong> ₹{Number(selectedLoan.principal).toLocaleString('en-IN')}</span>
                        <span className="small"><strong>Monthly Collection:</strong> ₹{Number(selectedLoan.emiAmount).toLocaleString('en-IN')}/mo</span>
                        <span className="small"><strong>Tenure:</strong> {selectedLoan.tenureMonths} months</span>
                        <span className="small"><strong>Total Collectible:</strong> ₹{Number(selectedLoan.emiAmount * selectedLoan.tenureMonths).toLocaleString('en-IN')}</span>
                        <span className="small text-success"><strong>Profit:</strong> ₹{Number(emiProfit(selectedLoan)).toLocaleString('en-IN')}</span>
                      </>
                    ) : selectedLoan.loanType === 'ONETIME' ? (
                      <>
                        <span className="small"><strong>Amount Given:</strong> ₹{Number(selectedLoan.principal).toLocaleString('en-IN')}</span>
                        <span className="small"><strong>Amount to Receive:</strong> ₹{Number(selectedLoan.receivableAmount).toLocaleString('en-IN')}</span>
                        <span className="small"><strong>Recovery Date:</strong> {selectedLoan.recoveryDate ? format(parseISO(selectedLoan.recoveryDate), 'dd MMM yyyy') : '—'}</span>
                        <span className="small text-success"><strong>Profit:</strong> ₹{Number(selectedLoan.receivableAmount - selectedLoan.principal).toLocaleString('en-IN')}</span>
                      </>
                    ) : selectedLoan.loanType === 'DAILY' ? (
                      <>
                        <span className="small"><strong>Disbursed:</strong> ₹{Number(selectedLoan.principal).toLocaleString('en-IN')}</span>
                        <span className="small"><strong>Daily:</strong> ₹{Number(selectedLoan.dailyAmount).toLocaleString('en-IN')}/day</span>
                        <span className="small"><strong>Days:</strong> {selectedLoan.totalDays}</span>
                        <span className="small"><strong>Total Collectible:</strong> ₹{Number(selectedLoan.dailyAmount * selectedLoan.totalDays).toLocaleString('en-IN')}</span>
                        <span className="small text-success"><strong>Profit:</strong> ₹{Number(dailyProfit(selectedLoan)).toLocaleString('en-IN')}</span>
                      </>
                    ) : selectedLoan.loanType === 'FLEXIBLE' ? (
                      <>
                        <span className="small"><strong>Principal:</strong> ₹{Number(selectedLoan.principal).toLocaleString('en-IN')}</span>
                        <span className="small"><strong>Rate:</strong> {selectedLoan.interestRate}%/month</span>
                        <span className="small"><strong>Disbursed:</strong> {format(parseISO(selectedLoan.disbursementDate), 'dd MMM yyyy')}</span>
                        <span className="small text-warning fw-bold">Open-ended — settle when borrower repays</span>
                      </>
                    ) : (
                      <>
                        <span className="small"><strong>Principal:</strong> ₹{Number(selectedLoan.principal).toLocaleString('en-IN')}</span>
                        <span className="small"><strong>Rate:</strong> {selectedLoan.interestRate}%/month</span>
                        <span className="small"><strong>Monthly Interest:</strong> ₹{Number(monthlyInterest(selectedLoan)).toLocaleString('en-IN')}</span>
                        <span className="small"><strong>Disbursed:</strong> ₹{Number(selectedLoan.disbursedAmount).toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>{selectedLoan.loanType === 'DAILY' ? 'Day' : '#'}</th>
                          <th style={{ width: 100 }}>Due Date</th>
                          <th style={{ width: 100 }}>Amount</th>
                          <th style={{ width: 80 }}>Type</th>
                          <th style={{ width: 75 }}>Status</th>
                          <th style={{ width: 95 }}>Paid On</th>
                          <th>Received Account</th>
                          <th>Remarks</th>
                          <th style={{ width: 80 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLoan.schedule?.map(s => (
                          <React.Fragment key={s.id}>
                            <tr className={s.isPaid ? 'table-success' : ''}>
                              <td className="text-muted">{s.monthNumber}</td>
                              <td style={{ fontSize: '0.85em' }}>{format(parseISO(s.dueDate), 'dd MMM yyyy')}</td>
                              <td className="fw-medium">₹{Number(s.amountDue).toLocaleString('en-IN')}</td>
                              <td>
                                {s.paymentType === 'DAILY'
                                  ? <span className="badge" style={{ background: '#7c3aed', fontSize: '0.7em' }}>DAILY</span>
                                  : s.paymentType === 'SETTLEMENT'
                                    ? <span className="badge bg-warning text-dark" style={{ fontSize: '0.7em' }}>SETTLE</span>
                                    : <span className={`badge ${s.paymentType === 'PRINCIPAL' ? 'bg-danger' : 'bg-info'}`} style={{ fontSize: '0.7em' }}>
                                        {s.paymentType === 'PRINCIPAL' ? 'PRIN' : 'INT'}
                                      </span>
                                }
                              </td>
                              <td>
                                {s.isWaived
                                  ? <span className="badge bg-warning text-dark" style={{ fontSize: '0.7em' }}>WAIVED</span>
                                  : s.isPaid
                                    ? <span className="badge bg-success" style={{ fontSize: '0.7em' }}>PAID</span>
                                    : <span className="badge bg-secondary" style={{ fontSize: '0.7em' }}>PENDING</span>}
                              </td>
                              <td className="text-muted" style={{ fontSize: '0.82em' }}>
                                {s.paidDate ? format(parseISO(s.paidDate), 'dd MMM yyyy') : '—'}
                              </td>
                              <td style={{ fontSize: '0.82em' }}>
                                {s.isPaid && !s.isWaived
                                  ? s.receivedVia === 'UPI' && s.receivedAccount
                                    ? <span className="text-success">
                                        <i className="bi bi-bank2 me-1"></i>
                                        {s.receivedAccount.bankName} · {s.receivedAccount.upiId}
                                      </span>
                                    : <span className="badge bg-success" style={{ fontSize: '0.85em' }}>Cash</span>
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td style={{ fontSize: '0.82em' }}>
                                {s.remarks ? <span className="text-muted fst-italic">{s.remarks}</span> : <span className="text-muted">—</span>}
                              </td>
                              <td>
                                {selectedLoan.status === 'ACTIVE' && (
                                  s.isPaid ? (
                                    <button className="btn btn-sm btn-outline-secondary"
                                      onClick={() => handleTogglePay(selectedLoan.id, s.id, true)}>
                                      <i className="bi bi-x-circle me-1"></i>Unpay
                                    </button>
                                  ) : (
                                    <button className="btn btn-sm btn-outline-success"
                                      onClick={() => {
                                        setPayingRowId(payingRowId === s.id ? null : s.id);
                                        setPayingAccountId('');
                                        setPayingDate(new Date().toISOString().split('T')[0]);
                                      }}>
                                      <i className="bi bi-check-circle me-1"></i>Pay
                                    </button>
                                  )
                                )}
                              </td>
                            </tr>
                            {payingRowId === s.id && (
                              <tr className="table-warning">
                                <td colSpan={9} className="py-2 px-3">
                                  <div className="d-flex gap-2 align-items-center flex-wrap">
                                    <span className="small fw-medium text-nowrap">Paid on:</span>
                                    <input type="date" className="form-control form-control-sm" style={{ maxWidth: 150 }}
                                      value={payingDate}
                                      onChange={e => setPayingDate(e.target.value)} />
                                    <ViaSelector name={`via-${s.id}`}
                                      via={payingVia} onViaChange={setPayingVia}
                                      accountId={payingAccountId} onAccountChange={setPayingAccountId}
                                      accounts={adminAccounts} />
                                    <input type="text" className="form-control form-control-sm" style={{ maxWidth: 200 }}
                                      placeholder="Remarks (optional)"
                                      value={payingRemarks}
                                      onChange={e => setPayingRemarks(e.target.value)} />
                                    <button className="btn btn-sm btn-success"
                                      disabled={!payingDate || (payingVia === 'UPI' && !payingAccountId)}
                                      onClick={() => handleTogglePay(selectedLoan.id, s.id, false)}>
                                      <i className="bi bi-check-lg me-1"></i>Confirm
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary"
                                      onClick={() => { setPayingRowId(null); setPayingVia('CASH'); setPayingAccountId(''); setPayingDate(''); setPayingRemarks(''); }}>
                                      Cancel
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {showSettle && (selectedLoan.loanType === 'FLEXIBLE' || selectedLoan.loanType === 'DAILY') && (
                  <div className="px-3 py-2 border-top bg-warning bg-opacity-10">
                    <div className="small fw-bold text-warning mb-2">
                      <i className="bi bi-calculator me-1"></i>
                      {selectedLoan.loanType === 'DAILY' ? 'Settle Pending Payments' : 'Settle Loan'}
                    </div>
                    {selectedLoan.loanType === 'DAILY' ? (() => {
                      const unpaid = selectedLoan.schedule?.filter(s => !s.isPaid) || [];
                      const pendingAmount = unpaid.reduce((sum, s) => sum + Number(s.amountDue), 0);
                      return (
                        <div className="small text-dark mb-2">
                          Pending days: <strong>{unpaid.length}</strong> &nbsp;|&nbsp;
                          Pending amount: <strong className="text-danger">₹{Number(pendingAmount).toLocaleString('en-IN')}</strong>
                          <span className="text-muted ms-2">(all remaining daily rows will be marked paid)</span>
                        </div>
                      );
                    })() : (() => {
                      const from = parseISO(selectedLoan.disbursementDate);
                      const to = settleDate ? parseISO(settleDate) : new Date();
                      const months = Math.max(1, Math.floor((to - from) / (1000 * 60 * 60 * 24 * 30.44)));
                      const interest = ((selectedLoan.principal * selectedLoan.interestRate * months) / 100).toFixed(2);
                      const total = (parseFloat(selectedLoan.principal) + parseFloat(interest)).toFixed(2);
                      return (
                        <div className="small text-dark mb-2">
                          Months elapsed: <strong>{months}</strong> &nbsp;|&nbsp;
                          Interest: <strong>₹{Number(interest).toLocaleString('en-IN')}</strong> &nbsp;|&nbsp;
                          Total due: <strong className="text-danger">₹{Number(total).toLocaleString('en-IN')}</strong>
                        </div>
                      );
                    })()}
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      <label className="small fw-medium text-nowrap">
                        {selectedLoan.loanType === 'DAILY' ? 'Settle date:' : 'Repayment date:'}
                      </label>
                      <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }}
                        value={settleDate} onChange={e => setSettleDate(e.target.value)} />
                      <ViaSelector name="settleVia"
                        via={settleVia} onViaChange={setSettleVia}
                        accountId={settleAccountId} onAccountChange={setSettleAccountId}
                        accounts={adminAccounts} />
                      <input type="text" className="form-control form-control-sm" style={{ maxWidth: 200 }}
                        placeholder="Remarks (optional)"
                        value={settleRemarks}
                        onChange={e => setSettleRemarks(e.target.value)} />
                      <button className="btn btn-sm btn-warning fw-bold"
                        disabled={(settleVia === 'UPI' && !settleAccountId) || settling}
                        onClick={handleSettle}>
                        {settling ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2-all me-1"></i>}
                        Confirm Settle
                      </button>
                      <button className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setShowSettle(false); setSettleVia('CASH'); setSettleAccountId(''); setSettleDate(''); setSettleRemarks(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {showExtend && (
                  <div className="px-3 py-2 border-top bg-info bg-opacity-10">
                    <div className="small fw-bold text-info mb-2">
                      <i className="bi bi-calendar-plus me-1"></i>Extend Repayment
                    </div>
                    <div className="small text-muted mb-2">
                      New interest months will be added and the principal due date will be pushed forward.
                      {(() => {
                        const mi = parseFloat(monthlyInterest(selectedLoan));
                        const ext = parseInt(extensionMonths) || 0;
                        return ext > 0
                          ? <span className="ms-1 fw-bold text-dark">
                              +{ext} month{ext > 1 ? 's' : ''} · Additional interest: ₹{Number((mi * ext).toFixed(2)).toLocaleString('en-IN')}
                            </span>
                          : null;
                      })()}
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      <label className="small fw-medium text-nowrap">Extend by:</label>
                      <input type="number" className="form-control form-control-sm" style={{ maxWidth: 90 }}
                        min={1} max={120} value={extensionMonths}
                        onChange={e => setExtensionMonths(parseInt(e.target.value) || 1)} />
                      <span className="small text-muted">month(s)</span>
                      <input type="text" className="form-control form-control-sm" style={{ maxWidth: 220 }}
                        placeholder="Reason for extension (optional)"
                        value={extendRemarks}
                        onChange={e => setExtendRemarks(e.target.value)} />
                      <button className="btn btn-sm btn-info fw-bold text-white"
                        disabled={extensionMonths < 1 || extending}
                        onClick={handleExtend}>
                        {extending ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1"></i>}
                        Confirm Extend
                      </button>
                      <button className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setShowExtend(false); setExtensionMonths(1); setExtendRemarks(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {showCloseEarly && (
                  <div className="px-3 py-2 border-top bg-warning bg-opacity-10">
                    <div className="small fw-bold text-warning mb-2">
                      <i className="bi bi-lightning-charge me-1"></i>Early Closure Settlement
                    </div>
                    {selectedLoan.loanType === 'EMI' ? (
                      <>
                        <div className="small text-muted mb-2">
                          All remaining unpaid EMI rows will be <strong>waived</strong> and the loan will be closed.
                          {(() => {
                            const unpaid = selectedLoan.schedule?.filter(s => !s.isPaid) || [];
                            return unpaid.length > 0 && (
                              <span className="ms-1 text-warning">
                                ({unpaid.length} EMI row{unpaid.length > 1 ? 's' : ''} waived ·
                                ₹{Number(unpaid.reduce((sum, s) => sum + Number(s.amountDue), 0)).toLocaleString('en-IN')} forfeited)
                              </span>
                            );
                          })()}
                        </div>
                        <div className="d-flex gap-2 align-items-center flex-wrap">
                          <input type="text" className="form-control form-control-sm" style={{ maxWidth: 260 }}
                            placeholder="Reason for early closure (optional)"
                            value={closeEarlyRemarks}
                            onChange={e => setCloseEarlyRemarks(e.target.value)} />
                          <button className="btn btn-sm btn-warning fw-bold" disabled={closingEarly}
                            onClick={handleCloseEarly}>
                            {closingEarly ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2-all me-1"></i>}
                            Confirm Close
                          </button>
                          <button className="btn btn-sm btn-outline-secondary"
                            onClick={() => { setShowCloseEarly(false); setCloseEarlyRemarks(''); }}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="small text-muted mb-2">
                          Unpaid interest months will be <strong>waived</strong>. Principal will be marked paid today.
                          {(() => {
                            const unpaidInterest = selectedLoan.schedule?.filter(s => !s.isPaid && s.paymentType === 'INTEREST').length;
                            const principal = selectedLoan.schedule?.find(s => s.paymentType === 'PRINCIPAL');
                            return <>
                              {unpaidInterest > 0 && <span className="ms-1 text-warning">({unpaidInterest} interest month{unpaidInterest > 1 ? 's' : ''} waived)</span>}
                              {principal && !principal.isPaid && <span className="ms-1 fw-bold text-dark"> Settlement: ₹{Number(principal.amountDue).toLocaleString('en-IN')}</span>}
                            </>;
                          })()}
                        </div>
                        <div className="d-flex gap-2 align-items-center flex-wrap">
                          <ViaSelector name="closeEarlyVia"
                            via={closeEarlyVia} onViaChange={setCloseEarlyVia}
                            accountId={closeEarlyAccountId} onAccountChange={setCloseEarlyAccountId}
                            accounts={adminAccounts} />
                          <input type="text" className="form-control form-control-sm" style={{ maxWidth: 220 }}
                            placeholder="Reason for early closure (optional)"
                            value={closeEarlyRemarks}
                            onChange={e => setCloseEarlyRemarks(e.target.value)} />
                          <button className="btn btn-sm btn-warning fw-bold"
                            disabled={(closeEarlyVia === 'UPI' && !closeEarlyAccountId) || closingEarly}
                            onClick={handleCloseEarly}>
                            {closingEarly ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2-all me-1"></i>}
                            Confirm Close
                          </button>
                          <button className="btn btn-sm btn-outline-secondary"
                            onClick={() => { setShowCloseEarly(false); setCloseEarlyVia('CASH'); setCloseEarlyAccountId(''); setCloseEarlyRemarks(''); }}>
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="modal-footer justify-content-between">
                  <div className="d-flex gap-2 flex-wrap">
                    {selectedLoan.status === 'ACTIVE' && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleStatusAction(selectedLoan.id, 'complete')}>
                          <i className="bi bi-check2-all me-1"></i>Mark Completed
                        </button>
                        {(selectedLoan.loanType === 'FLEXIBLE' || selectedLoan.loanType === 'DAILY') && (
                          <button className="btn btn-sm btn-warning"
                            onClick={() => { setShowSettle(v => !v); setShowExtend(false); setShowCloseEarly(false); }}>
                            <i className="bi bi-calculator me-1"></i>
                            {selectedLoan.loanType === 'DAILY' ? 'Settle Pending' : 'Settle'}
                          </button>
                        )}
                        {selectedLoan.loanType === 'MONTHLY' && (
                          <button className="btn btn-sm btn-info"
                            onClick={() => { setShowExtend(v => !v); setShowCloseEarly(false); setExtensionMonths(1); setExtendRemarks(''); }}>
                            <i className="bi bi-calendar-plus me-1"></i>Extend
                          </button>
                        )}
                        {(selectedLoan.loanType === 'MONTHLY' || selectedLoan.loanType === 'EMI') && (
                          <button className="btn btn-sm btn-warning"
                            onClick={() => { setShowCloseEarly(v => !v); setShowExtend(false); setCloseEarlyAccountId(''); setCloseEarlyRemarks(''); }}>
                            <i className="bi bi-lightning-charge me-1"></i>Close Early
                          </button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleStatusAction(selectedLoan.id, 'default')}>
                          <i className="bi bi-exclamation-triangle me-1"></i>Mark Defaulted
                        </button>
                      </>
                    )}
                  </div>
                  <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <div className="modal fade" id="deleteLoanModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>Delete
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">Delete this loan and all its payment schedules?</div>
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
