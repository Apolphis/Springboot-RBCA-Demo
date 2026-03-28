import { useState, useEffect, useRef } from 'react';
import './App.css';

// Returns a styled <span> badge for a role name.
// Colour-coded: orange = ADMIN, green = USER, dim = anything else.
const roleBadge = (role) => {
  const cls = role === 'ADMIN' ? 'badge badge-admin' : role === 'USER' ? 'badge badge-user' : 'badge badge-other';
  return <span className={cls}>{role}</span>;
};

export default function App() {

  // ── Auth ────────────────────────────────────────────────────────────────────
  const [token, setToken] = useState(null);           // raw JWT string from /auth/mock-login
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [currentUser, setCurrentUser] = useState(null); // { userIdentifier, roles[] } from /auth/me
  const [error, setError] = useState(null);

  // ── Admin navigation ─────────────────────────────────────────────────────────
  // Which admin sub-screen is shown. Home is the default after login.
  const [adminView, setAdminView] = useState('home'); // 'home' | 'users' | 'inventory'

  // ── Remote data ──────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState([]);             // active role assignments
  const [roleHistory, setRoleHistory] = useState([]); // soft-deleted (revoked) roles
  const [users, setUsers] = useState([]);             // all app_users records

  // ── Add-role form ────────────────────────────────────────────────────────────
  const [newUser, setNewUser] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newRole, setNewRole] = useState('');

  // ── Inventory ────────────────────────────────────────────────────────────────
  const [inventory, setInventory] = useState([]);
  const [invCategory, setInvCategory] = useState('');
  const [invItemName, setInvItemName] = useState('');
  const [invQuantity, setInvQuantity] = useState('');

  const API_BASE = 'http://localhost:8080';

  // tokenRef mirrors `token` in a ref so async fetch callbacks can read the
  // latest value without capturing a stale closure — prevents a slow response
  // from updating state after the user has already logged out.
  const tokenRef = useRef(token);

  const CATEGORIES = ['Electronics', 'Furniture', 'Stationery', 'Cleaning', 'Machinery', 'Other'];

  // Derived flags — gate which UI sections are rendered.
  const isAdmin = currentUser?.roles?.includes('ADMIN') ?? false;
  const isUser  = currentUser?.roles?.includes('USER')  ?? false;

  // ── JWT utilities ─────────────────────────────────────────────────────────────

  // Decodes the JWT payload (the middle base64url segment) without verifying
  // the signature — the server already did that; we just need claims for display.
  const decodeJwt = (t) => {
    try {
      const p = t.split('.')[1];
      if (!p) return null;
      return JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/') + '=='.slice(0,(4-p.length%4)%4)));
    } catch { return null; }
  };

  const jwtClaims = token ? decodeJwt(token) : null;
  // True if a token exists and its expiry (Unix seconds) is still in the future.
  const jwtValid  = !!jwtClaims?.exp && Date.now() < jwtClaims.exp * 1000;
  // Formats an ISO/Instant timestamp for display; returns '—' for missing values.
  const fmtDate   = (iso) => iso ? new Date(iso).toLocaleString() : '—';

  // Keep tokenRef in sync on every token change.
  useEffect(() => { tokenRef.current = token; }, [token]);

  // ── Logout ────────────────────────────────────────────────────────────────────
  // Resets all state back to the initial blank slate, returning to the login view.
  const doLogout = () => {
    setToken(null); setCurrentUser(null);
    setUsernameInput(''); setPasswordInput('');
    setAdminView('home');
    setRoles([]); setRoleHistory([]); setUsers([]);
    setInventory([]); setError(null);
  };

  // ── Login ─────────────────────────────────────────────────────────────────────
  // POSTs credentials to /auth/mock-login and stores the returned JWT.
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) { setError('Username and password are required.'); return; }
    try {
      const params = new URLSearchParams({ username: usernameInput.trim(), password: passwordInput });
      const res = await fetch(`${API_BASE}/auth/mock-login?${params}`, { method: 'POST' });
      if (res.ok) { setToken(await res.text()); setError(null); }
      else { setToken(null); setError(await res.text() || 'Login failed.'); }
    } catch { setToken(null); setError('Server unreachable.'); }
  };

  // ── Data-fetch helpers ────────────────────────────────────────────────────────
  // Each helper accepts the token explicitly so it can be called in the same tick
  // as a useState setter (before React re-renders with the updated token).
  // The tokenRef guard prevents stale responses from updating state after logout.

  const fetchMe = async (at) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' });
      if (!res.ok) { doLogout(); return; }
      if (tokenRef.current === at) setCurrentUser(await res.json());
    } catch { doLogout(); }
  };

  const fetchRoles = async (at) => {
    try {
      const res = await fetch(`${API_BASE}/api/roles`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' });
      if (res.ok && tokenRef.current === at) setRoles(await res.json());
    } catch {}
  };

  const fetchRoleHistory = async (at) => {
    try {
      const res = await fetch(`${API_BASE}/api/roles/history`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' });
      if (res.ok && tokenRef.current === at) setRoleHistory(await res.json());
    } catch {}
  };

  const fetchUsers = async (at) => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' });
      if (res.ok && tokenRef.current === at) setUsers(await res.json());
    } catch {}
  };

  const fetchInventory = async (at) => {
    try {
      const res = await fetch(`${API_BASE}/api/inventory`, { headers: { Authorization: `Bearer ${at}` }, cache: 'no-store' });
      if (res.ok && tokenRef.current === at) setInventory(await res.json());
    } catch {}
  };

  // ── Side-effects ──────────────────────────────────────────────────────────────

  // As soon as we have a token, fetch the caller's identity and role list.
  useEffect(() => { if (token) fetchMe(token); }, [token]);

  // Once the user identity is loaded, pre-fetch the data relevant to their role.
  useEffect(() => {
    if (!token || !currentUser) return;
    if (isAdmin) { fetchRoles(token); fetchUsers(token); fetchRoleHistory(token); }
    if (isAdmin || isUser) fetchInventory(token);
  }, [currentUser]);

  // ── Role mutation handlers ────────────────────────────────────────────────────

  // Creates a new role assignment; optimistically prepends the server response
  // to the local list so the table updates immediately without a full re-fetch.
  const handleAddRole = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/roles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdentifier: newUser, roleName: newRole, password: newUserPassword }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to save role.');
      const created = await res.json();
      setRoles((p) => [created, ...p]);
      setNewUser(''); setNewUserPassword(''); setNewRole('');
      setError(null); fetchUsers(token); // refresh user list to show any new account
    } catch (err) { setError(err.message); }
  };

  // Soft-deletes a role via DELETE /api/roles/{id}.
  // Moves the row from the active list to the history list locally so the table
  // updates immediately without waiting for a full re-fetch.
  const handleDeleteRole = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/roles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text() || 'Failed to delete role.');
      const deleted = roles.find((r) => r.id === id);
      setRoles((p) => p.filter((r) => r.id !== id));
      if (deleted) setRoleHistory((p) => [{ ...deleted, deletedAt: new Date().toISOString() }, ...p]);
      setError(null);
    } catch (err) { setError(err.message); }
  };

  // ── Inventory mutation handlers ───────────────────────────────────────────────

  // Validates the form then POSTs a new inventory entry.
  const handleAddInventory = async (e) => {
    e.preventDefault();
    const qty = parseInt(invQuantity, 10);
    if (!invCategory || !invItemName.trim() || isNaN(qty) || qty < 0) { setError('All fields required; qty >= 0.'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/inventory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: invCategory, itemName: invItemName.trim(), quantity: qty }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to add item.');
      const created = await res.json();
      setInventory((p) => [created, ...p]);
      setInvCategory(''); setInvItemName(''); setInvQuantity(''); setError(null);
    } catch (err) { setError(err.message); }
  };

  // Hard-deletes an inventory item (ADMIN only). Removes it from local state.
  const handleDeleteInventory = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/inventory/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text() || 'Failed to delete item.');
      setInventory((p) => p.filter((i) => i.id !== id)); setError(null);
    } catch (err) { setError(err.message); }
  };

  // ── Render: Login ─────────────────────────────────────────────────────────────
  // Shown when no token exists or while /auth/me is still loading.
  if (!token || !currentUser) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-logo">◈</div>
          <div className="login-title">ERP // SYSTEM</div>
          <div className="login-subtitle">Sign in to your account to continue</div>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="field">
              <label>Email / Username</label>
              <input className="input" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="you@example.com" autoComplete="off" />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                type="password" placeholder="••••••••" autoComplete="new-password" />
            </div>
            {error && <div className="error-banner">⚠ {error}</div>}
            <button className="btn btn-primary" type="submit" style={{ marginTop: '4px', width: '100%', justifyContent: 'center' }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Render: Nav bar ───────────────────────────────────────────────────────────
  // Shared across all post-login views. Shows the current screen breadcrumb,
  // logged-in username, live JWT validity badge, and a sign-out button.
  // Admin users also get a "← Home" back button when in a sub-screen.
  const nav = (
    <nav className="nav">
      <span className="nav-brand">◈ ERP</span>
      <span className="nav-sep" />
      {isAdmin && adminView !== 'home' && (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setAdminView('home')}>← Home</button>
          <span className="nav-sep" />
        </>
      )}
      <span className="nav-breadcrumb">
        {isAdmin ? (adminView === 'home' ? 'Dashboard' : adminView === 'users' ? 'User Management' : 'Inventory') : 'Inventory'}
      </span>
      <span className="nav-spacer" />
      <span className="nav-meta">{currentUser.userIdentifier}</span>
      <span className={`nav-badge ${jwtValid ? 'valid' : 'expired'}`}>JWT {jwtValid ? 'Active' : 'Expired'}</span>
      <button className="btn btn-ghost btn-sm" onClick={doLogout}>Sign Out</button>
    </nav>
  );

  const errBanner = error && <div className="error-banner">⚠ {error}</div>;

  // ── Render: USER view ─────────────────────────────────────────────────────────
  // Non-admin users see only the inventory screen. They can add items but
  // there is no delete button — that is ADMIN-only.
  if (!isAdmin) {
    return (
      <div className="app">
        {nav}
        <div className="page">
          {errBanner}
          <p className="section-title">Add Stock Entry</p>
          <div className="add-bar">
            <form onSubmit={handleAddInventory} style={{ display: 'contents' }}>
              <select className="input select" value={invCategory} onChange={(e) => setInvCategory(e.target.value)} required>
                <option value="">Category…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input" value={invItemName} onChange={(e) => setInvItemName(e.target.value)} placeholder="Item name" required />
              <input className="input input-qty" value={invQuantity} onChange={(e) => setInvQuantity(e.target.value)}
                placeholder="Qty" type="number" min="0" required />
              <button className="btn btn-primary" type="submit">Add</button>
            </form>
          </div>
          <p className="section-title">Stock ({inventory.length})</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Item</th><th>Qty</th><th>Added By</th></tr></thead>
              <tbody>
                {inventory.length === 0 && <tr className="table-empty"><td colSpan={4}>No stock entries yet.</td></tr>}
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td><span className="badge badge-other">{item.category}</span></td>
                    <td>{item.itemName}</td>
                    <td><strong>{item.quantity}</strong></td>
                    <td className="text-muted text-sm">{item.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: ADMIN Home ────────────────────────────────────────────────────────
  // Dashboard landing screen. Shows JWT metadata for the current session and
  // two navigation tiles to the main admin areas.
  if (adminView === 'home') {
    return (
      <div className="app">
        {nav}
        <div className="page">
          <div className="info-card">
            <div><strong>Session</strong> {currentUser.userIdentifier}</div>
            <div>Issued: {jwtClaims?.iat ? new Date(jwtClaims.iat * 1000).toLocaleString() : '—'}</div>
            <div>Expires: {jwtClaims?.exp ? new Date(jwtClaims.exp * 1000).toLocaleString() : '—'}</div>
            <div>Issuer: {jwtClaims?.iss || '—'}</div>
          </div>
          <p className="section-title">Navigate To</p>
          <div className="home-grid">
            <div className="tile" onClick={() => { setAdminView('users'); fetchRoles(token); fetchUsers(token); fetchRoleHistory(token); }}>
              <div className="tile-icon">◉</div>
              <div className="tile-label">User Management</div>
            </div>
            <div className="tile" onClick={() => { setAdminView('inventory'); fetchInventory(token); }}>
              <div className="tile-icon">▦</div>
              <div className="tile-label">Inventory</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: ADMIN Users ───────────────────────────────────────────────────────
  // Three sections:
  //   1. Add-role form — creates a role assignment (and AppUser if new).
  //   2. User Credentials table — lists all accounts (passwords masked).
  //   3. Active Role Assignments — current active roles with a revoke button.
  //   4. Role History — soft-deleted roles shown as a read-only audit log.
  if (adminView === 'users') {
    return (
      <div className="app">
        {nav}
        <div className="page">
          {errBanner}
          <p className="section-title">Add Role / User</p>
          <div className="add-bar">
            <form onSubmit={handleAddRole} style={{ display: 'contents' }}>
              <input className="input" value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Email" required />
              <input className="input" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)}
                type="password" placeholder="Password" required autoComplete="new-password" />
              <input className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role (e.g. USER)" required />
              <button className="btn btn-primary" type="submit">Save</button>
            </form>
          </div>

          <p className="section-title">User Credentials</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Password</th></tr></thead>
              <tbody>
                {users.length === 0 && <tr className="table-empty"><td colSpan={2}>No users.</td></tr>}
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.userIdentifier}</td>
                    <td className="text-muted text-sm" style={{ fontFamily: 'monospace' }}>{u.passwordMasked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="section-title">Active Role Assignments ({roles.length})</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Last Updated</th><th>Action</th></tr></thead>
              <tbody>
                {roles.length === 0 && <tr className="table-empty"><td colSpan={4}>No active roles.</td></tr>}
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td>{r.userIdentifier}</td>
                    <td>{roleBadge(r.roleName)}</td>
                    <td className="text-sm text-muted">{fmtDate(r.lastModifiedAt)}</td>
                    <td><button className="btn btn-danger-soft" onClick={() => handleDeleteRole(r.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Role history only shown when there is something to display */}
          {roleHistory.length > 0 && (
            <>
              <p className="section-title muted">Role History — Deleted ({roleHistory.length})</p>
              <div className="table-wrap">
                <table className="table-muted">
                  <thead><tr><th>User</th><th>Role</th><th>Last Updated</th><th>Deleted At</th></tr></thead>
                  <tbody>
                    {roleHistory.map((r) => (
                      <tr key={r.id}>
                        <td>{r.userIdentifier}</td>
                        <td>{roleBadge(r.roleName)}</td>
                        <td className="text-sm text-muted">{fmtDate(r.lastModifiedAt)}</td>
                        <td className="text-sm text-danger">{fmtDate(r.deletedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Render: ADMIN Inventory ───────────────────────────────────────────────────
  // Same as the USER inventory view but includes a Delete button per row.
  return (
    <div className="app">
      {nav}
      <div className="page">
        {errBanner}
        <p className="section-title">Add Stock Entry</p>
        <div className="add-bar">
          <form onSubmit={handleAddInventory} style={{ display: 'contents' }}>
            <select className="input select" value={invCategory} onChange={(e) => setInvCategory(e.target.value)} required>
              <option value="">Category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input" value={invItemName} onChange={(e) => setInvItemName(e.target.value)} placeholder="Item name" required />
            <input className="input input-qty" value={invQuantity} onChange={(e) => setInvQuantity(e.target.value)}
              placeholder="Qty" type="number" min="0" required />
            <button className="btn btn-primary" type="submit">Add</button>
          </form>
        </div>

        <p className="section-title">All Stock ({inventory.length})</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Item</th><th>Qty</th><th>Added By</th><th>Action</th></tr></thead>
            <tbody>
              {inventory.length === 0 && <tr className="table-empty"><td colSpan={5}>No stock entries.</td></tr>}
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td><span className="badge badge-other">{item.category}</span></td>
                  <td>{item.itemName}</td>
                  <td><strong>{item.quantity}</strong></td>
                  <td className="text-muted text-sm">{item.createdBy}</td>
                  <td><button className="btn btn-danger-soft" onClick={() => handleDeleteInventory(item.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
