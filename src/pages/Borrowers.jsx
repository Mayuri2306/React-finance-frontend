import { useState, useEffect } from 'react';
import { Modal } from 'bootstrap';
import { borrowerAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

const EMPTY = { name: '', email: '', phone: '', address: '', creditScore: '', upiId: '' };

export default function Borrowers() {
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { fetchBorrowers(); }, []);

  async function fetchBorrowers() {
    try {
      setLoading(true);
      const res = await borrowerAPI.getAll();
      setBorrowers(res.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(EMPTY);
    setEditId(null);
    setFormError('');
    const modal = new Modal(document.getElementById('borrowerModal'));
    modal.show();
  }

  function openEdit(borrower) {
    setForm({
      name: borrower.name,
      email: borrower.email,
      phone: borrower.phone,
      address: borrower.address || '',
      creditScore: borrower.creditScore || '',
      upiId: borrower.upiId || '',
    });
    setEditId(borrower.id);
    setFormError('');
    const modal = new Modal(document.getElementById('borrowerModal'));
    modal.show();
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, creditScore: form.creditScore ? Number(form.creditScore) : null, upiId: form.upiId || null };
      if (editId) {
        await borrowerAPI.update(editId, payload);
      } else {
        await borrowerAPI.create(payload);
      }
      Modal.getInstance(document.getElementById('borrowerModal'))?.hide();
      fetchBorrowers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await borrowerAPI.delete(deleteId);
      setDeleteId(null);
      Modal.getInstance(document.getElementById('deleteModal'))?.hide();
      fetchBorrowers();
    } catch (err) {
      setError(err.message);
    }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    const modal = new Modal(document.getElementById('deleteModal'));
    modal.show();
  }

  const filtered = borrowers.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase()) ||
    b.phone.includes(search)
  );

  const creditBadge = (score) => {
    if (!score) return <span className="text-muted">—</span>;
    const color = score >= 750 ? 'success' : score >= 600 ? 'warning' : 'danger';
    return <span className={`badge bg-${color}`}>{score}</span>;
  };

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

      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="input-group" style={{ maxWidth: 320 }}>
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder="Search borrowers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="bi bi-plus-lg"></i> Add Borrower
        </button>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>UPI ID</th>
                <th>Credit Score</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted py-4">
                  <i className="bi bi-people fs-3 d-block mb-2"></i>
                  {search ? 'No matches found' : 'No borrowers yet'}
                </td></tr>
              ) : filtered.map((b, i) => (
                <tr key={b.id}>
                  <td className="text-muted">{i + 1}</td>
                  <td className="fw-medium">{b.name}</td>
                  <td>{b.email}</td>
                  <td>{b.phone}</td>
                  <td className="text-muted">{b.upiId || '—'}</td>
                  <td>{creditBadge(b.creditScore)}</td>
                  <td className="text-muted">
                    {b.createdAt ? format(parseISO(b.createdAt), 'dd MMM yyyy') : '—'}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(b)}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(b.id)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-top text-muted" style={{ fontSize: '0.8rem' }}>
          {filtered.length} of {borrowers.length} borrowers
        </div>
      </div>

      {/* Borrower Modal */}
      <div className="modal fade" id="borrowerModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Edit Borrower' : 'Add Borrower'}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="mb-3">
                  <label className="form-label fw-medium">Full Name *</label>
                  <input className="form-control" value={form.name} required
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Email *</label>
                  <input type="email" className="form-control" value={form.email} required
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Phone *</label>
                  <input className="form-control" value={form.phone} required
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Address</label>
                  <textarea className="form-control" rows={2} value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">UPI ID</label>
                  <input className="form-control" placeholder="e.g. name@upi"
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
                </div>
                <div className="mb-1">
                  <label className="form-label fw-medium">Credit Score (300–900)</label>
                  <input type="number" className="form-control" min={300} max={900}
                    value={form.creditScore}
                    onChange={(e) => setForm({ ...form, creditScore: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {editId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <div className="modal fade" id="deleteModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>Delete
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">
              Are you sure you want to delete this borrower?
            </div>
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
