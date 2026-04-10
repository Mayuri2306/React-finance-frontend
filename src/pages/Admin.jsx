import { useState, useEffect } from 'react';
import { Modal } from 'bootstrap';
import { adminAPI } from '../services/api';

const EMPTY_ADMIN = { name: '', email: '', phone: '', address: '' };
const EMPTY_ACCOUNT = { bankName: '', upiId: '', accountNumber: '', ifscCode: '', accountHolderName: '', isActive: true };

export default function Admin() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [editAdminId, setEditAdminId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
  const [editAccountId, setEditAccountId] = useState(null);
  const [targetAdminId, setTargetAdminId] = useState(null);
  const [accountError, setAccountError] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const [deleteAdminId, setDeleteAdminId] = useState(null);
  const [deleteAccountId, setDeleteAccountId] = useState(null);

  useEffect(() => { fetchAdmins(); }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const res = await adminAPI.getAll();
      setAdmins(res.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateAdmin() {
    setAdminForm(EMPTY_ADMIN);
    setEditAdminId(null);
    setFormError('');
    new Modal(document.getElementById('adminModal')).show();
  }

  function openEditAdmin(admin) {
    setAdminForm({ name: admin.name, email: admin.email || '', phone: admin.phone || '', address: admin.address || '' });
    setEditAdminId(admin.id);
    setFormError('');
    new Modal(document.getElementById('adminModal')).show();
  }

  async function handleSaveAdmin(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editAdminId) {
        const res = await adminAPI.update(editAdminId, adminForm);
        setAdmins(prev => prev.map(a => a.id === editAdminId ? res.data.data : a));
      } else {
        const res = await adminAPI.create(adminForm);
        setAdmins(prev => [...prev, res.data.data]);
      }
      Modal.getInstance(document.getElementById('adminModal'))?.hide();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteAdmin(id) {
    setDeleteAdminId(id);
    new Modal(document.getElementById('deleteAdminModal')).show();
  }

  async function handleDeleteAdmin() {
    if (!deleteAdminId) return;
    const id = deleteAdminId;
    try {
      await adminAPI.delete(id);
      setAdmins(prev => prev.filter(a => a.id !== id));
      setDeleteAdminId(null);
      Modal.getInstance(document.getElementById('deleteAdminModal'))?.hide();
    } catch (err) {
      setError(err.message);
    }
  }

  function openAddAccount(adminId) {
    setAccountForm(EMPTY_ACCOUNT);
    setEditAccountId(null);
    setTargetAdminId(adminId);
    setAccountError('');
    new Modal(document.getElementById('accountModal')).show();
  }

  function openEditAccount(account, adminId) {
    setAccountForm({
      bankName: account.bankName,
      upiId: account.upiId,
      accountNumber: account.accountNumber || '',
      ifscCode: account.ifscCode || '',
      accountHolderName: account.accountHolderName || '',
      isActive: account.isActive,
    });
    setEditAccountId(account.id);
    setTargetAdminId(adminId);
    setAccountError('');
    new Modal(document.getElementById('accountModal')).show();
  }

  async function handleSaveAccount(e) {
    e.preventDefault();
    setSavingAccount(true);
    setAccountError('');
    try {
      const payload = { ...accountForm, accountNumber: accountForm.accountNumber || null, ifscCode: accountForm.ifscCode || null, accountHolderName: accountForm.accountHolderName || null };
      if (editAccountId) {
        await adminAPI.updateAccount(editAccountId, payload);
      } else {
        await adminAPI.addAccount(targetAdminId, payload);
      }
      Modal.getInstance(document.getElementById('accountModal'))?.hide();
      fetchAdmins();
    } catch (err) {
      setAccountError(err.message);
    } finally {
      setSavingAccount(false);
    }
  }

  function confirmDeleteAccount(id) {
    setDeleteAccountId(id);
    new Modal(document.getElementById('deleteAccountModal')).show();
  }

  async function handleDeleteAccount() {
    if (!deleteAccountId) return;
    const id = deleteAccountId;
    try {
      await adminAPI.deleteAccount(id);
      setDeleteAccountId(null);
      Modal.getInstance(document.getElementById('deleteAccountModal'))?.hide();
      fetchAdmins();
    } catch (err) {
      setError(err.message);
    }
  }

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

      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0 small">Manage admin profiles and their payment receiving bank accounts / UPI IDs.</p>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreateAdmin}>
          <i className="bi bi-plus-lg"></i> Add Admin
        </button>
      </div>

      {admins.length === 0 ? (
        <div className="table-card p-5 text-center text-muted">
          <i className="bi bi-person-gear fs-1 d-block mb-2"></i>
          No admins yet. Add one to get started.
        </div>
      ) : admins.map(admin => (
        <div key={admin.id} className="table-card mb-4">
          {/* Admin header */}
          <div className="px-3 py-2 d-flex justify-content-between align-items-center border-bottom bg-light rounded-top">
            <div>
              <strong className="me-2">{admin.name}</strong>
              {admin.email && <span className="text-muted me-3 small"><i className="bi bi-envelope me-1"></i>{admin.email}</span>}
              {admin.phone && <span className="text-muted small"><i className="bi bi-telephone me-1"></i>{admin.phone}</span>}
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-success" onClick={() => openAddAccount(admin.id)}>
                <i className="bi bi-plus me-1"></i>Add Account
              </button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => openEditAdmin(admin)}>
                <i className="bi bi-pencil"></i>
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteAdmin(admin.id)}>
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>

          {/* Bank accounts table */}
          {admin.bankAccounts?.length === 0 ? (
            <div className="p-3 text-center text-muted small">No bank accounts. Click "Add Account" to add one.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Bank Name</th>
                    <th>UPI ID</th>
                    <th>Account Holder</th>
                    <th>Account No.</th>
                    <th>IFSC</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admin.bankAccounts.map(acc => (
                    <tr key={acc.id}>
                      <td className="fw-medium">{acc.bankName}</td>
                      <td><span className="badge bg-success bg-opacity-10 text-success border border-success">{acc.upiId}</span></td>
                      <td className="text-muted">{acc.accountHolderName || '—'}</td>
                      <td className="text-muted">{acc.accountNumber || '—'}</td>
                      <td className="text-muted">{acc.ifscCode || '—'}</td>
                      <td>
                        <span className={`badge ${acc.isActive ? 'bg-success' : 'bg-secondary'}`}>
                          {acc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEditAccount(acc, admin.id)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteAccount(acc.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Admin Modal */}
      <div className="modal fade" id="adminModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSaveAdmin}>
              <div className="modal-header">
                <h5 className="modal-title">{editAdminId ? 'Edit Admin' : 'Add Admin'}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="mb-3">
                  <label className="form-label fw-medium">Full Name *</label>
                  <input className="form-control" required value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Email</label>
                  <input type="email" className="form-control" value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Phone</label>
                  <input className="form-control" value={adminForm.phone}
                    onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} />
                </div>
                <div className="mb-1">
                  <label className="form-label fw-medium">Address</label>
                  <textarea className="form-control" rows={2} value={adminForm.address}
                    onChange={(e) => setAdminForm({ ...adminForm, address: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {editAdminId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bank Account Modal */}
      <div className="modal fade" id="accountModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSaveAccount}>
              <div className="modal-header">
                <h5 className="modal-title">{editAccountId ? 'Edit Bank Account' : 'Add Bank Account'}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {accountError && <div className="alert alert-danger py-2">{accountError}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Bank Name *</label>
                    <input className="form-control" required placeholder="e.g. SBI, HDFC"
                      value={accountForm.bankName}
                      onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">UPI ID *</label>
                    <input className="form-control" required placeholder="e.g. name@upi"
                      value={accountForm.upiId}
                      onChange={(e) => setAccountForm({ ...accountForm, upiId: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Account Holder Name</label>
                    <input className="form-control" placeholder="Name on the account"
                      value={accountForm.accountHolderName}
                      onChange={(e) => setAccountForm({ ...accountForm, accountHolderName: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Account Number</label>
                    <input className="form-control" value={accountForm.accountNumber}
                      onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">IFSC Code</label>
                    <input className="form-control" placeholder="e.g. SBIN0001234"
                      value={accountForm.ifscCode}
                      onChange={(e) => setAccountForm({ ...accountForm, ifscCode: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" id="isActiveCheck"
                        checked={accountForm.isActive}
                        onChange={(e) => setAccountForm({ ...accountForm, isActive: e.target.checked })} />
                      <label className="form-check-label" htmlFor="isActiveCheck">Active (visible when marking payments)</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingAccount}>
                  {savingAccount ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {editAccountId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Admin Modal */}
      <div className="modal fade" id="deleteAdminModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Delete Admin</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">Delete this admin and all their bank accounts?</div>
            <div className="modal-footer border-0 pt-0">
              <button className="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteAdmin}>Delete</button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <div className="modal fade" id="deleteAccountModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Delete Account</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">Delete this bank account?</div>
            <div className="modal-footer border-0 pt-0">
              <button className="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteAccount}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
