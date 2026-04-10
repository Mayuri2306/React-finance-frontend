import { useState, useEffect, useCallback } from 'react';
import { Modal } from 'bootstrap';
import { userAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

const EMPTY_FORM = { username: '', password: '', fullName: '', email: '', role: 'USER' };
const EMPTY_RESET = { newPassword: '', confirm: '' };

export default function UsersPage() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [resetId, setResetId]   = useState(null);
  const [resetForm, setResetForm] = useState(EMPTY_RESET);
  const [resetError, setResetError] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAll();
      setUsers(res.data.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function applyUpdate(updated) {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  }

  // ─── Create / Edit ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowPwd(false);
    new Modal(document.getElementById('userModal')).show();
  }

  function openEdit(user) {
    setEditId(user.id);
    setForm({ username: user.username, password: '', fullName: user.fullName || '', email: user.email || '', role: user.role });
    setFormError('');
    new Modal(document.getElementById('userModal')).show();
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editId) {
        const res = await userAPI.update(editId, { fullName: form.fullName, email: form.email, role: form.role });
        applyUpdate(res.data.data);
      } else {
        const res = await userAPI.create({ username: form.username.trim(), password: form.password, fullName: form.fullName, email: form.email, role: form.role });
        setUsers(prev => [...prev, res.data.data]);
      }
      Modal.getInstance(document.getElementById('userModal'))?.hide();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  // ─── Reset Password ────────────────────────────────────────────────────────

  function openReset(id) {
    setResetId(id);
    setResetForm(EMPTY_RESET);
    setResetError('');
    new Modal(document.getElementById('resetModal')).show();
  }

  async function handleReset(e) {
    e.preventDefault();
    if (resetForm.newPassword !== resetForm.confirm) {
      setResetError('Passwords do not match');
      return;
    }
    try {
      await userAPI.resetPassword(resetId, resetForm.newPassword);
      Modal.getInstance(document.getElementById('resetModal'))?.hide();
    } catch (err) { setResetError(err.message); }
  }

  // ─── Toggle / Delete ────────────────────────────────────────────────────────

  async function handleToggle(id) {
    try {
      const res = await userAPI.toggleActive(id);
      applyUpdate(res.data.data);
    } catch (err) { setError(err.message); }
  }

  function confirmDelete(id) {
    setDeleteId(id);
    new Modal(document.getElementById('deleteUserModal')).show();
  }

  async function handleDelete() {
    try {
      await userAPI.delete(deleteId);
      setUsers(prev => prev.filter(u => u.id !== deleteId));
      Modal.getInstance(document.getElementById('deleteUserModal'))?.hide();
    } catch (err) { setError(err.message); }
  }

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

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25">
            <div className="small text-muted">Total Users</div>
            <div className="fw-bold fs-4 text-primary">{users.length}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25">
            <div className="small text-muted">Admins</div>
            <div className="fw-bold fs-4 text-danger">{users.filter(u => u.role === 'ADMIN').length}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-success bg-opacity-10 border border-success border-opacity-25">
            <div className="small text-muted">Active</div>
            <div className="fw-bold fs-4 text-success">{users.filter(u => u.active).length}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded bg-secondary bg-opacity-10 border border-secondary border-opacity-25">
            <div className="small text-muted">Inactive</div>
            <div className="fw-bold fs-4 text-secondary">{users.filter(u => !u.active).length}</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="d-flex justify-content-end mb-2">
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="bi bi-person-plus-fill"></i> Add User
        </button>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted py-4">No users found</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} className={!u.active ? 'opacity-50' : ''}>
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
                        style={{ width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="fw-medium">{u.username}</span>
                    </div>
                  </td>
                  <td>{u.fullName || <span className="text-muted">—</span>}</td>
                  <td className="text-muted" style={{ fontSize: '0.85em' }}>{u.email || '—'}</td>
                  <td>
                    <span className={`badge ${u.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'bg-success' : 'bg-secondary'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.82em' }}>
                    {u.createdAt ? format(parseISO(u.createdAt), 'dd MMM yyyy') : '—'}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => openEdit(u)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning" title="Reset Password" onClick={() => openReset(u.id)}>
                        <i className="bi bi-key"></i>
                      </button>
                      <button className={`btn btn-sm ${u.active ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                        title={u.active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(u.id)}>
                        <i className={`bi ${u.active ? 'bi-toggle-on' : 'bi-toggle-off'}`}></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => confirmDelete(u.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────── */}
      <div className="modal fade" id="userModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-person-plus-fill'} me-2 text-primary`}></i>
                  {editId ? 'Edit User' : 'Create User'}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Username *</label>
                    <input type="text" className="form-control" required
                      disabled={!!editId}
                      placeholder="e.g. john_doe"
                      value={form.username}
                      onChange={e => setForm({ ...form, username: e.target.value })} />
                    {editId && <div className="form-text">Username cannot be changed.</div>}
                  </div>
                  {!editId && (
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Password *</label>
                      <div className="input-group">
                        <input type={showPwd ? 'text' : 'password'} className="form-control" required
                          placeholder="Min. 6 characters"
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })} />
                        <button type="button" className="input-group-text bg-white"
                          onClick={() => setShowPwd(v => !v)} tabIndex="-1">
                          <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Full Name</label>
                    <input type="text" className="form-control"
                      placeholder="e.g. John Doe"
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Email</label>
                    <input type="email" className="form-control"
                      placeholder="e.g. john@example.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Role *</label>
                    <div className="d-flex gap-4">
                      {['USER', 'ADMIN'].map(r => (
                        <div className="form-check" key={r}>
                          <input type="radio" className="form-check-input" name="role"
                            id={`role_${r}`} value={r} checked={form.role === r}
                            onChange={() => setForm({ ...form, role: r })} />
                          <label className="form-check-label" htmlFor={`role_${r}`}>
                            {r === 'ADMIN'
                              ? <><i className="bi bi-shield-fill text-danger me-1"></i>Admin</>
                              : <><i className="bi bi-person text-primary me-1"></i>User</>}
                          </label>
                        </div>
                      ))}
                    </div>
                    {form.role === 'ADMIN' && (
                      <div className="alert alert-warning py-2 mt-2 mb-0" style={{ fontSize: '0.82em' }}>
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Admin has full access to all features.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-1" />}
                  {editId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Reset Password Modal ──────────────────────────────────────── */}
      <div className="modal fade" id="resetModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleReset}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-key me-2 text-warning"></i>Reset Password
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body">
                {resetError && <div className="alert alert-danger py-2">{resetError}</div>}
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-medium">New Password *</label>
                    <input type="password" className="form-control" required minLength={6}
                      value={resetForm.newPassword}
                      onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Confirm Password *</label>
                    <input type="password" className="form-control" required
                      value={resetForm.confirm}
                      onChange={e => setResetForm({ ...resetForm, confirm: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-warning">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Delete Modal ──────────────────────────────────────────────── */}
      <div className="modal fade" id="deleteUserModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Delete User</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body pt-0">This user will be permanently deleted.</div>
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
