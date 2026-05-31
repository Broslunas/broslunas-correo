import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  User, 
  Mail, 
  Check, 
  Clock, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle,
  X
} from 'lucide-react';

interface AllowedUser {
  _id: string;
  email: string;
  role: 'admin' | 'user';
  twoFactorEnabled: boolean;
  assignedAddresses: string[];
  addedBy: string;
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for new user
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [fullAccess, setFullAccess] = useState(false);
  const [addressesInput, setAddressesInput] = useState('');

  // Edit user modal states
  const [editingUser, setEditingUser] = useState<AllowedUser | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editFullAccess, setEditFullAccess] = useState(false);
  const [editAddressesInput, setEditAddressesInput] = useState('');

  // Load authorized users list
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo cargar la lista de usuarios');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Add User submission
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    // Prepare addresses array
    const assignedAddresses = fullAccess 
      ? ['*'] 
      : addressesInput.split(',').map(a => a.trim()).filter(Boolean);

    if (assignedAddresses.length === 0) {
      setError('Debes asignar al menos una dirección o activar el acceso total.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
          assignedAddresses
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Usuario ${newEmail} autorizado correctamente.`);
        setNewEmail('');
        setAddressesInput('');
        setFullAccess(false);
        setNewRole('user');
        fetchUsers();
      } else {
        setError(data.error || 'Error al agregar usuario');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Revoke Access (Delete)
  const handleRevokeAccess = async (email: string) => {
    if (!confirm(`¿Estás seguro de que quieres revocar el acceso a ${email}? Se cerrará su sesión de inmediato.`)) {
      return;
    }

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Acceso revocado a ${email} con éxito.`);
        fetchUsers();
      } else {
        setError(data.error || 'Error al revocar acceso');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al revocar acceso.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const startEdit = (user: AllowedUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    const isWildcard = user.assignedAddresses.includes('*');
    setEditFullAccess(isWildcard);
    setEditAddressesInput(isWildcard ? '' : user.assignedAddresses.join(', '));
  };

  // Handle Update User submission (from Edit modal)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    const assignedAddresses = editFullAccess 
      ? ['*'] 
      : editAddressesInput.split(',').map(a => a.trim()).filter(Boolean);

    if (assignedAddresses.length === 0) {
      setError('Debes asignar al menos una dirección o activar el acceso total.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingUser.email,
          role: editRole,
          assignedAddresses
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Usuario ${editingUser.email} actualizado correctamente.`);
        setEditingUser(null);
        fetchUsers();
      } else {
        setError(data.error || 'Error al actualizar usuario');
      }
    } catch (err) {
      console.error(err);
      setError('Error al guardar cambios.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden">
      
      {/* Header bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-8 bg-neutral-950/80 backdrop-blur shrink-0">
        <h1 className="text-sm font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          Administración de Accesos
        </h1>
        <button 
          onClick={fetchUsers}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-900 border border-border/45 transition-all cursor-pointer"
          title="Refrescar lista"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main split viewport */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6">
        
        {/* Left Side: Create User Form */}
        <section className="w-full lg:w-96 shrink-0 space-y-4">
          <div className="bg-neutral-900/30 border border-border p-6 rounded-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <UserPlus className="h-4.5 w-4.5 text-primary" />
              Autorizar Nuevo Usuario
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              {/* Google Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Cuenta de Google (Gmail)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="usuario@gmail.com"
                    className="w-full rounded-lg border border-border bg-neutral-950 py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Rol de Sistema
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                  className="w-full rounded-lg border border-border bg-neutral-950 py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="user">Usuario Común</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Wildcard Access Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fullAccess"
                  checked={fullAccess}
                  onChange={(e) => setFullAccess(e.target.checked)}
                  className="rounded border-border bg-neutral-950 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="fullAccess" className="text-xs font-medium text-foreground select-none cursor-pointer">
                  Acceso Total (todas las cuentas)
                </label>
              </div>

              {/* Specific Email addresses text input */}
              {!fullAccess && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Direcciones Asignadas (Cuentas Propias)
                  </label>
                  <div className="relative">
                    <span className="absolute top-3 left-3 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                    <textarea
                      value={addressesInput}
                      onChange={(e) => setAddressesInput(e.target.value)}
                      placeholder="contacto@broslunas.es, ventas@broslunas.es"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-neutral-950 py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    Separa las direcciones de tu dominio con comas. El usuario solo podrá ver e interactuar con estas cuentas.
                  </p>
                </div>
              )}

              {/* Form buttons */}
              <button
                type="submit"
                disabled={actionLoading || !newEmail.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Autorizar Acceso
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="rounded-xl bg-red-950/20 border border-red-900/30 p-4 text-xs text-red-400 font-medium flex items-start gap-2.5 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="rounded-xl bg-emerald-950/20 border border-emerald-900/30 p-4 text-xs text-emerald-400 font-medium flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <p>{success}</p>
            </div>
          )}
        </section>

        {/* Right Side: Users List */}
        <section className="flex-1 min-w-0 bg-neutral-900/20 border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-neutral-950/20 shrink-0">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Usuarios Autorizados ({users.length})
            </h3>
          </div>

          {/* Scrollable List Table */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <User className="h-8 w-8 opacity-30 mb-2" />
                <p className="text-xs">No hay usuarios adicionales autorizados.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-neutral-900/80 backdrop-blur border-b border-border text-muted-foreground/80 font-medium text-[10px] uppercase tracking-wider select-none z-10">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Estado 2FA</th>
                    <th className="py-3 px-4">Direcciones Asignadas</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-neutral-900/40 transition-all group">
                      {/* Email Profile */}
                      <td className="py-3.5 px-4 font-medium text-foreground select-text">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-neutral-800 flex items-center justify-center text-primary font-bold border border-border/30">
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="truncate max-w-[160px] font-semibold">{user.email}</p>
                            <p className="text-[9px] text-muted-foreground/60 select-none">
                              Agregado por: {user.addedBy || 'System'}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Role Badge */}
                      <td className="py-3.5 px-4 select-none">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                          user.role === 'admin' 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-neutral-800 border-neutral-700 text-muted-foreground'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>

                      {/* 2FA Status */}
                      <td className="py-3.5 px-4 select-none">
                        {user.twoFactorEnabled ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                            <Check className="h-3.5 w-3.5" />
                            Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                            <Clock className="h-3.5 w-3.5 animate-pulse" />
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Assigned Addresses */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-300">
                        {user.assignedAddresses.includes('*') ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/30 border border-emerald-900/20 text-emerald-400 text-[9px] font-semibold select-none">
                            Acceso Total (*)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {user.assignedAddresses.map((addr, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-neutral-900 border border-border/40 text-[9px] tracking-tight">
                                {addr}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right select-none">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-all cursor-pointer"
                            title="Editar permisos"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleRevokeAccess(user.email)}
                            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Revocar acceso"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>

      {/* Edit User Modal Overlay */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative animate-zoomIn">
            <button 
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-900 transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Edit3 className="h-4.5 w-4.5 text-primary" />
              Editar Accesos: <span className="text-primary font-mono font-normal">{editingUser.email}</span>
            </h3>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* Edit Role Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Rol de Sistema
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'user')}
                  className="w-full rounded-lg border border-border bg-neutral-900 py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="user">Usuario Común</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Edit Full Access Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editFullAccess"
                  checked={editFullAccess}
                  onChange={(e) => setEditFullAccess(e.target.checked)}
                  className="rounded border-border bg-neutral-900 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="editFullAccess" className="text-xs font-medium text-foreground select-none cursor-pointer">
                  Acceso Total (todas las cuentas)
                </label>
              </div>

              {/* Edit Assigned Addresses Textarea */}
              {!editFullAccess && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Direcciones Asignadas (Cuentas Propias)
                  </label>
                  <div className="relative">
                    <span className="absolute top-3 left-3 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                    <textarea
                      value={editAddressesInput}
                      onChange={(e) => setEditAddressesInput(e.target.value)}
                      placeholder="contacto@broslunas.es, ventas@broslunas.es"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-neutral-900 py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    Separa las direcciones de tu dominio con comas.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-muted-foreground hover:text-foreground py-2 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
