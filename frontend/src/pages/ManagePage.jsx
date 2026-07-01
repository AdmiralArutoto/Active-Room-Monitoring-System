import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/FeedbackContext';
import PageTitle from '../components/PageTitle';
import Modal from '../components/Modal';
import { PrimaryButton, GhostButton } from '../components/Button';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ', ' + new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatRelative(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ManagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'VIEWER' });
  const [error, setError] = useState('');
  const menuRef = useRef(null);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/dashboard'); return; }
    loadUsers();
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActionMenuId(null);
    }
    if (actionMenuId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [actionMenuId]);

  async function loadUsers() {
    try {
      const data = await api.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setUsers(data.users || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setShowCreate(false);
      setForm({ username: '', email: '', full_name: '', password: '', role: 'VIEWER' });
      toast.success('User created');
      loadUsers();
    } catch (err) { setError(err.message); }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/users/${showEdit.id}`, {
        email: form.email,
        full_name: form.full_name,
        role: form.role,
      });
      setShowEdit(null);
      toast.success('User updated');
      loadUsers();
    } catch (err) { setError(err.message); }
  }

  async function handleToggleActive(u) {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      toast.success(u.is_active ? 'User suspended' : 'User activated');
      loadUsers();
    } catch (err) { toast.error(err.message || 'Failed to update user'); }
  }

  async function handleDelete(id) {
    setActionMenuId(null);
    const ok = await confirm({
      title: 'Delete user',
      message: 'Delete this user? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      loadUsers();
    } catch (err) { toast.error(err.message || 'Failed to delete user'); }
  }

  function openEdit(u) {
    setForm({ username: u.username, email: u.email || '', full_name: u.full_name || '', password: '', role: u.role });
    setShowEdit(u);
    setError('');
    setActionMenuId(null);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setLoading(true);
    loadUsers();
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div>
      <PageTitle>Users &amp; Details</PageTitle>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} className="search-filter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a93a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="M16 16L21 21" />
            </svg>
            <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </form>
        </div>
        <PrimaryButton onClick={() => { setForm({ username: '', email: '', full_name: '', password: '', role: 'VIEWER' }); setError(''); setShowCreate(true); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5V19" /><path d="M5 12H19" /></svg>
          Add User
        </PrimaryButton>
      </div>

      <div className="card table-shell">
        <table>
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email Address</th>
              <th>User Role</th>
              <th>Date Added</th>
              <th>Last Active</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="user-avatar">{getInitials(u.full_name || u.username)}</div>
                    <span>{u.full_name || u.username}</span>
                  </div>
                </td>
                <td style={{ color: '#5a6573' }}>{u.email || '—'}</td>
                <td>{u.role}</td>
                <td style={{ color: '#5a6573' }}>{formatDate(u.created_at)}</td>
                <td style={{ color: '#8a93a0' }}>{formatRelative(u.last_active_at)}</td>
                <td>
                  <span className={`status-pill ${u.is_active ? 'status-pill--active' : 'status-pill--suspended'}`}>
                    {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </td>
                <td style={{ position: 'relative' }}>
                  <button className="action-dots" onClick={() => setActionMenuId(actionMenuId === u.id ? null : u.id)}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h.01" /><path d="M12 12h.01" /><path d="M19 12h.01" />
                    </svg>
                  </button>
                  {actionMenuId === u.id && (
                    <div className="action-menu" ref={menuRef}>
                      <button className="action-menu-item" onClick={() => openEdit(u)}>Edit</button>
                      <button className="action-menu-item" onClick={() => { handleToggleActive(u); setActionMenuId(null); }}>
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      <button className="action-menu-item action-menu-item--danger" onClick={() => handleDelete(u.id)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#8a93a0' }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Add User" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="modal-grid">
              {error && <p className="error-text">{error}</p>}
              <TextInput label="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
              <TextInput label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <TextInput label="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              <TextInput label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <SelectInput
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                options={[{ value: 'VIEWER', label: 'Viewer' }, { value: 'MANAGER', label: 'Manager' }, { value: 'ADMIN', label: 'Admin' }]}
              />
              <div className="modal-actions">
                <GhostButton type="button" onClick={() => setShowCreate(false)}>Cancel</GhostButton>
                <PrimaryButton type="submit">Create</PrimaryButton>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit User" onClose={() => setShowEdit(null)}>
          <form onSubmit={handleUpdate}>
            <div className="modal-grid">
              {error && <p className="error-text">{error}</p>}
              <TextInput label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <TextInput label="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              <SelectInput
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                options={[{ value: 'VIEWER', label: 'Viewer' }, { value: 'MANAGER', label: 'Manager' }, { value: 'ADMIN', label: 'Admin' }]}
              />
              <div className="modal-actions">
                <GhostButton type="button" onClick={() => setShowEdit(null)}>Cancel</GhostButton>
                <PrimaryButton type="submit">Save</PrimaryButton>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
