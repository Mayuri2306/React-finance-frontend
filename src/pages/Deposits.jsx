import React, { useState, useEffect } from 'react';
import { Modal } from 'bootstrap';
import { depositAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

const today = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  clientName: '',
  phoneNumber: '',
  address: '',
  amountReceived: '',
  receivedDate: today(),
  receivedVia: 'CASH',
  upiId: '',
  accountNumber: '',
  bankName: '',
  repaymentDate: '',
  repaymentAmount: '',
  remarks: '',
};

const REPAY_EMPTY = {
  repaidDate: today(),
  repaidVia: 'CASH',
  repaidRemarks: '',
};

function isOverdue(deposit) {
  return deposit.status === 'ACTIVE' && !!deposit.repaymentDate && deposit.repaymentDate < today();
}

function statusDisplay(deposit) {
  if (deposit.status === 'REPAID') return { label: 'REPAID', color: 'secondary' };
  if (isOverdue(deposit)) return { label: 'OVERDUE', color: 'danger' };
  return { label: 'ACTIVE', color: 'success' };
}

const VIA_LABELS = { CASH: 'Cash', UPI: 'UPI', BANK: 'Bank Transfer' };
const VIA_ICONS = { CASH: 'bi-cash', UPI: 'bi-phone', BANK: 'bi-bank' };

export default function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [deleteId, setDeleteId] = useState(null);
  const [repayDeposit, setRepayDeposit] = useState(null);
  const [repayForm, setRepayForm] = useState(REPAY_EMPTY);
  const [repaying, setRepaying] = useState(false);
  const [repayError, setRepayError] = useState('');

  useEffect(() => { fetchDeposits(); }, []);

  async function fetchDeposits() {
    try {
      setLoading(true);
      const res = await depositAPI.getAll();
      setDeposits(res.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(EMPTY);
    setFormError('');
    new Modal(document.getElementById('depositModal')).show();
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        clientName: form.clientName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim() || null,
        amountReceived: parseFloat(form.amountReceived),
        receivedDate: form.receivedDate,
        receivedVia: form.receivedVia,
        repaymentDate: form.repaymentDate,
        repaymentAmount: parseFloat(form.repaymentAmount),
        remarks: form.remarks.trim() || null,
      };
      if (form.receivedVia === 'UPI') payload.upiId = form.upiId.trim();
      if (form.receivedVia === 'BANK') {
        payload.accountNumber = form.accountNumber.trim();
        payload.bankName = form.bankName.trim() || null;
      }
      await depositAPI.create(payload);
      Modal.getInstance(document.getElementById('depositModal'))?.hide();
      fetchDeposits();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openRepay(deposit) {
    setRepayDeposit(deposit);
    setRepayForm(REPAY_EMPTY);
    setRepayError('');
    new Modal(document.getElementById('repayModal')).show();
  }

  async function handleRepay(e) {
    e.preventDefault();
    setRepaying(true);
    setRepayError('');
    try {
      const res = await depositAPI.repay(
        repayDeposit.id,
        repayForm.repaidDate,
        repayForm.repaidVia,
        repayForm.repaidRemarks,
      );
      Modal.getInstance(document.getElementById('repayModal'))?.hide();
      setDeposits(prev => prev.map(d => d.id === res.data.data.id ? res.data.data : d));
    } catch (err) {
      setRepayError(err.message);
    } finally {
      setRepaying(false);
    }
  }

  async function handleRevert(id) {
    try {
      const res = await depositAPI.revert(id);
      setDeposits(prev => prev.map(d => d.id === id ? res.data.data : d));
    } catch (err) {
      setError(err.message);
    }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    new Modal(document.getElementById('deleteDepositModal')).show();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const id = deleteId;
    try {
      await depositAPI.delete(id);
      setDeleteId(null);
      Modal.getInstance(document.getElementById('deleteDepositModal'))?.hide();
      setDeposits(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const tabs = [
    { key: 'ALL', label: 'All', count: deposits.length },
    { key: 'ACTIVE', label: 'Active', count: deposits.filter(d => d.status === 'ACTIVE' && !isOverdue(d)).length },
    { key: 'OVERDUE', label: 'Overdue', count: deposits.filter(isOverdue).length },
    { key: 'REPAID', label: 'Repaid', count: deposits.filter(d => d.status === 'REPAID').length },
  ];

  const filtered = deposits.filter(d => {
    const matchSearch =
      d.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      d.phoneNumber?.includes(search) ||
      d.remarks?.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      filterTab === 'ALL' ? true
      : filterTab === 'OVERDUE' ? isOverdue(d)
      : filterTab === 'ACTIVE' ? (d.status === 'ACTIVE' && !isOverdue(d))
      : d.status === filterTab;
    return matchSearch && matchTab;
  });

  const totalReceived = deposits.reduce((s, d) => s + Number(d.amountReceived), 0);
  const totalRepayable = deposits.filter(d => d.status === 'ACTIVE').reduce((s, d) => s + Number(d.repaymentAmount), 0);
  const totalProfit = deposits.reduce((s, d) => s + (Number(d.repaymentAmount) - Number(d.amountReceived)), 0);

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

      {/* Summary cards */}
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="p-3 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25">
            <div className="small text-muted">Total Collected</div>
            <div className="fw-bold fs-5 text-primary">₹{Number(totalReceived).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 rounded bg-warning bg-opacity-10 border border-warning border-opacity-25">
            <div className="small text-muted">Pending Repayment</div>
            <div className="fw-bold fs-5 text-warning">₹{Number(totalRepayable).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 rounded bg-success bg-opacity-10 border border-success border-opacity-25">
            <div className="small text-muted">Total Interest Payable</div>
            <div className="fw-bold fs-5 text-success">₹{Number(totalProfit).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 justify-content-between mb-3">
        <div className="input-group" style={{ maxWidth: 280 }}>
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input type="text" className="form-control border-start-0 ps-0"
            placeholder="Search by name, phone..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="bi bi-plus-lg"></i> Record Deposit
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-0" style={{ borderBottom: 'none' }}>
        {tabs.map(tab => (
          <li className="nav-item" key={tab.key}>
            <button
              className={`nav-link d-flex align-items-center gap-1 ${filterTab === tab.key ? 'active' : ''}`}
              onClick={() => setFilterTab(tab.key)}>
              {tab.label}
              <span className={`badge ms-1 ${filterTab === tab.key ? 'bg-primary' : tab.key === 'OVERDUE' && tab.count > 0 ? 'bg-danger' : 'bg-secondary'}`}
                style={{ fontSize: '0.7em' }}>
                {tab.count}
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
                <th>Client</th>
                <th>Phone</th>
                <th>Amount Received</th>
                <th>Received Via</th>
                <th>Received Date</th>
                <th>Repayment Date</th>
                <th>Repayment Amount</th>
                <th>Interest</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-muted py-4">
                  <i className="bi bi-inbox fs-3 d-block mb-2"></i>
                  {search || filterTab !== 'ALL' ? 'No matches found' : 'No deposits recorded yet'}
                </td></tr>
              ) : filtered.map((dep, i) => {
                const sd = statusDisplay(dep);
                const interest = Number(dep.repaymentAmount) - Number(dep.amountReceived);
                return (
                  <tr key={dep.id} className={isOverdue(dep) ? 'table-danger bg-opacity-25' : ''}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <div className="fw-medium">{dep.clientName}</div>
                      {dep.address && <div className="text-muted" style={{ fontSize: '0.78em' }}>{dep.address}</div>}
                    </td>
                    <td>{dep.phoneNumber}</td>
                    <td className="fw-medium">₹{Number(dep.amountReceived).toLocaleString('en-IN')}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        <i className={`bi ${VIA_ICONS[dep.receivedVia]} me-1`}></i>
                        {VIA_LABELS[dep.receivedVia]}
                      </span>
                      {dep.receivedVia === 'UPI' && dep.upiId &&
                        <div className="text-muted" style={{ fontSize: '0.75em' }}>{dep.upiId}</div>}
                      {dep.receivedVia === 'BANK' && dep.accountNumber &&
                        <div className="text-muted" style={{ fontSize: '0.75em' }}>
                          {dep.bankName ? `${dep.bankName} · ` : ''}{dep.accountNumber}
                        </div>}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.88em' }}>
                      {format(parseISO(dep.receivedDate), 'dd MMM yyyy')}
                    </td>
                    <td style={{ fontSize: '0.88em' }}>
                      <span className={isOverdue(dep) ? 'text-danger fw-bold' : ''}>
                        {dep.repaymentDate ? format(parseISO(dep.repaymentDate), 'dd MMM yyyy') : '—'}
                      </span>
                    </td>
                    <td className="fw-medium text-warning">
                      ₹{Number(dep.repaymentAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="text-success">
                      ₹{Number(interest).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge bg-${sd.color}`}>{sd.label}</span>
                      {dep.status === 'REPAID' && dep.repaidDate && (
                        <div className="text-muted" style={{ fontSize: '0.75em' }}>
                          {format(parseISO(dep.repaidDate), 'dd MMM yyyy')}
                          {dep.repaidVia && ` · ${VIA_LABELS[dep.repaidVia]}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        {dep.status === 'ACTIVE' ? (
                          <button className="btn btn-sm btn-success" title="Mark as Repaid"
                            onClick={() => openRepay(dep)}>
                            <i className="bi bi-check2-circle me-1"></i>Repay
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-outline-secondary" title="Revert to Active"
                            onClick={() => handleRevert(dep.id)}>
                            <i className="bi bi-arrow-counterclockwise"></i>
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-danger" title="Delete"
                          onClick={() => confirmDelete(dep.id)}>
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
            {filtered.length} of {deposits.length} deposits
          </div>
        )}
      </div>

      {/* Create Deposit Modal */}
      <div className="modal fade" id="depositModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-wallet2 me-2 text-primary"></i>Record Deposit
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="row g-3">
                  {/* Client Info */}
                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                      Client Details
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Client Name *</label>
                    <input type="text" className="form-control" required
                      placeholder="Full name"
                      value={form.clientName}
                      onChange={e => setForm({ ...form, clientName: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Phone Number *</label>
                    <input type="tel" className="form-control" required
                      placeholder="e.g. 9876543210"
                      value={form.phoneNumber}
                      onChange={e => setForm({ ...form, phoneNumber: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Address</label>
                    <input type="text" className="form-control"
                      placeholder="City, area or full address"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>

                  {/* Receipt Info */}
                  <div className="col-12 mt-1">
                    <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                      Amount Received
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Amount Received (₹) *</label>
                    <input type="number" className="form-control" required min={1} step={0.01}
                      placeholder="0.00"
                      value={form.amountReceived}
                      onChange={e => setForm({ ...form, amountReceived: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Received Date *</label>
                    <input type="date" className="form-control" required
                      value={form.receivedDate}
                      onChange={e => setForm({ ...form, receivedDate: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Received Via *</label>
                    <div className="d-flex gap-3 flex-wrap">
                      {['CASH', 'UPI', 'BANK'].map(v => (
                        <div key={v} className="form-check">
                          <input type="radio" className="form-check-input" name="receivedVia"
                            id={`rv_${v}`} checked={form.receivedVia === v}
                            onChange={() => setForm({ ...form, receivedVia: v, upiId: '', accountNumber: '', bankName: '' })} />
                          <label className="form-check-label" htmlFor={`rv_${v}`}>
                            <i className={`bi ${VIA_ICONS[v]} me-1`}></i>{VIA_LABELS[v]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {form.receivedVia === 'UPI' && (
                    <div className="col-md-6">
                      <label className="form-label fw-medium">UPI ID *</label>
                      <input type="text" className="form-control" required
                        placeholder="e.g. name@upi"
                        value={form.upiId}
                        onChange={e => setForm({ ...form, upiId: e.target.value })} />
                    </div>
                  )}
                  {form.receivedVia === 'BANK' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Account Number *</label>
                        <input type="text" className="form-control" required
                          placeholder="Bank account number"
                          value={form.accountNumber}
                          onChange={e => setForm({ ...form, accountNumber: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Bank Name</label>
                        <input type="text" className="form-control"
                          placeholder="e.g. SBI, HDFC"
                          value={form.bankName}
                          onChange={e => setForm({ ...form, bankName: e.target.value })} />
                      </div>
                    </>
                  )}

                  {/* Repayment Info */}
                  <div className="col-12 mt-1">
                    <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                      Repayment Terms
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Repayment Date</label>
                    <input type="date" className="form-control"
                      min={form.receivedDate}
                      value={form.repaymentDate}
                      onChange={e => setForm({ ...form, repaymentDate: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Repayment Amount (₹) *</label>
                    <input type="number" className="form-control" required min={1} step={0.01}
                      placeholder="0.00"
                      value={form.repaymentAmount}
                      onChange={e => setForm({ ...form, repaymentAmount: e.target.value })} />
                    {form.amountReceived && form.repaymentAmount && parseFloat(form.repaymentAmount) > parseFloat(form.amountReceived) && (
                      <div className="form-text text-success">
                        Interest: ₹{Number(parseFloat(form.repaymentAmount) - parseFloat(form.amountReceived)).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Remarks</label>
                    <textarea className="form-control" rows={2}
                      placeholder="Any notes about this deposit..."
                      value={form.remarks}
                      onChange={e => setForm({ ...form, remarks: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  Save Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Repay Modal */}
      <div className="modal fade" id="repayModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleRepay}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-check2-circle me-2 text-success"></i>Mark as Repaid
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {repayError && <div className="alert alert-danger py-2">{repayError}</div>}
                {repayDeposit && (
                  <div className="alert alert-info py-2 mb-3 small">
                    <strong>{repayDeposit.clientName}</strong> — Repayment amount:
                    <strong className="ms-1">₹{Number(repayDeposit.repaymentAmount).toLocaleString('en-IN')}</strong>
                  </div>
                )}
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-medium">Repaid Date *</label>
                    <input type="date" className="form-control" required
                      value={repayForm.repaidDate}
                      onChange={e => setRepayForm({ ...repayForm, repaidDate: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Repaid Via *</label>
                    <div className="d-flex gap-3 flex-wrap">
                      {['CASH', 'UPI', 'BANK'].map(v => (
                        <div key={v} className="form-check">
                          <input type="radio" className="form-check-input" name="repaidVia"
                            id={`rpv_${v}`} checked={repayForm.repaidVia === v}
                            onChange={() => setRepayForm({ ...repayForm, repaidVia: v })} />
                          <label className="form-check-label" htmlFor={`rpv_${v}`}>
                            <i className={`bi ${VIA_ICONS[v]} me-1`}></i>{VIA_LABELS[v]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Remarks</label>
                    <input type="text" className="form-control"
                      placeholder="Optional note for this repayment"
                      value={repayForm.repaidRemarks}
                      onChange={e => setRepayForm({ ...repayForm, repaidRemarks: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-success" disabled={repaying}>
                  {repaying ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1"></i>}
                  Confirm Repaid
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="deleteDepositModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>Delete
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">Delete this deposit record?</div>
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
