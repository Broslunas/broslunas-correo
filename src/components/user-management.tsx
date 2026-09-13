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
  X,
  Globe,
  ChevronDown,
  HardDrive,
  Database,
  Sliders,
  Flame,
  Ban,
  FolderOpen
} from 'lucide-react';
import AdminDrive from './admin-drive';

interface AllowedUser {
  _id: string;
  email: string;
  role: 'admin' | 'user';
  twoFactorEnabled: boolean;
  require2FA?: boolean;
  assignedAddresses: string[];
  storageLimitMB?: number;
  dailySendLimit?: number;
  status?: 'active' | 'suspended';
  addedBy: string;
  createdAt: string;
}

interface AllowedDomain {
  _id: string;
  domain: string;
  addedBy: string;
  createdAt: string;
}

interface AllowedMailbox {
  _id: string;
  email: string;
  name: string;
  storageLimitMB?: number;
  dailySendLimit?: number;
  status?: 'active' | 'suspended';
  addedBy: string;
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Domain states
  const [activeTab, setActiveTab] = useState<'users' | 'domains' | 'mailboxes' | 'invitations' | 'storage' | 'drive'>('users');
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainsLoading, setDomainsLoading] = useState(false);

  // Mailbox states
  const [mailboxes, setMailboxes] = useState<AllowedMailbox[]>([]);
  const [newMailboxEmail, setNewMailboxEmail] = useState('');
  const [newMailboxName, setNewMailboxName] = useState('');
  const [newMailboxStorageLimitMB, setNewMailboxStorageLimitMB] = useState(0);
  const [newMailboxDailySendLimit, setNewMailboxDailySendLimit] = useState(0);
  const [mailboxesLoading, setMailboxesLoading] = useState(false);

  // Mailbox edit modal states
  const [editingMailbox, setEditingMailbox] = useState<AllowedMailbox | null>(null);
  const [editMailboxName, setEditMailboxName] = useState('');
  const [editMailboxStorageLimitMB, setEditMailboxStorageLimitMB] = useState(0);
  const [editMailboxDailySendLimit, setEditMailboxDailySendLimit] = useState(0);
  const [editMailboxStatus, setEditMailboxStatus] = useState<'active' | 'suspended'>('active');

  // Storage and Limits states
  const [storageStats, setStorageStats] = useState<any>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [storageSubTab, setStorageSubTab] = useState<'both' | 'users' | 'mailboxes'>('both');

  // Invitation states
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [inviteFullAccess, setInviteFullAccess] = useState(false);
  const [inviteSelectedAddresses, setInviteSelectedAddresses] = useState<string[]>([]);
  const [inviteRequire2FA, setInviteRequire2FA] = useState(false);
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState('');

  // Form states for new user
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [fullAccess, setFullAccess] = useState(false);
  const [newSelectedAddresses, setNewSelectedAddresses] = useState<string[]>([]);
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [newRequire2FA, setNewRequire2FA] = useState(false);
  const [newStorageLimitMB, setNewStorageLimitMB] = useState(0);
  const [newDailySendLimit, setNewDailySendLimit] = useState(0);

  // Edit user modal states
  const [editingUser, setEditingUser] = useState<AllowedUser | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editFullAccess, setEditFullAccess] = useState(false);
  const [editSelectedAddresses, setEditSelectedAddresses] = useState<string[]>([]);
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);
  const [editRequire2FA, setEditRequire2FA] = useState(false);
  const [editStorageLimitMB, setEditStorageLimitMB] = useState(0);
  const [editDailySendLimit, setEditDailySendLimit] = useState(0);
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');

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

  // Load authorized domains list
  const fetchDomains = async () => {
    setDomainsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo cargar la lista de dominios');
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setDomainsLoading(false);
    }
  };

  // Handle Add Domain submission
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Dominio ${newDomain} registrado correctamente.`);
        setNewDomain('');
        fetchDomains();
      } else {
        setError(data.error || 'Error al registrar el dominio');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Domain
  const handleDeleteDomain = async (domainName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el dominio "${domainName}"? Esto podría impedir que se asignen cuentas de este dominio o bloquear correos entrantes/salientes.`)) {
      return;
    }

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainName })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Dominio ${domainName} eliminado con éxito.`);
        fetchDomains();
      } else {
        setError(data.error || 'Error al eliminar el dominio');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al eliminar el dominio.');
    } finally {
      setActionLoading(false);
    }
  };

  // Load authorized mailboxes list
  const fetchMailboxes = async () => {
    setMailboxesLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/mailboxes');
      if (res.ok) {
        const data = await res.json();
        setMailboxes(data.mailboxes || []);
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo cargar la lista de cuentas de correo');
      }
    } catch (err) {
      console.error('Error fetching mailboxes:', err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setMailboxesLoading(false);
    }
  };

  // Handle Add Mailbox submission
  const handleAddMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMailboxEmail.trim() || !newMailboxName.trim()) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMailboxEmail,
          name: newMailboxName,
          storageLimitMB: Number(newMailboxStorageLimitMB) || 0,
          dailySendLimit: Number(newMailboxDailySendLimit) || 0
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Cuenta ${newMailboxEmail} registrada correctamente.`);
        setNewMailboxEmail('');
        setNewMailboxName('');
        setNewMailboxStorageLimitMB(0);
        setNewMailboxDailySendLimit(0);
        fetchMailboxes();
      } else {
        setError(data.error || 'Error al registrar la cuenta de correo');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const startEditMailbox = (box: AllowedMailbox) => {
    setEditingMailbox(box);
    setEditMailboxName(box.name || '');
    setEditMailboxStorageLimitMB(box.storageLimitMB || 0);
    setEditMailboxDailySendLimit(box.dailySendLimit || 0);
    setEditMailboxStatus(box.status || 'active');
  };

  const handleUpdateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMailbox) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/mailboxes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingMailbox.email,
          name: editMailboxName,
          storageLimitMB: Number(editMailboxStorageLimitMB) || 0,
          dailySendLimit: Number(editMailboxDailySendLimit) || 0,
          status: editMailboxStatus
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Cuenta ${editingMailbox.email} actualizada correctamente.`);
        setEditingMailbox(null);
        fetchMailboxes();
        if (activeTab === 'storage') fetchStorageStats();
      } else {
        setError(data.error || 'Error al actualizar cuenta');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Mailbox
  const handleDeleteMailbox = async (email: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la cuenta de correo "${email}"? Los usuarios ya no podrán enviar mensajes desde esta dirección.`)) {
      return;
    }

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/mailboxes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Cuenta ${email} eliminada con éxito.`);
        fetchMailboxes();
      } else {
        setError(data.error || 'Error al eliminar la cuenta de correo');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al eliminar la cuenta de correo.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDomains();
    fetchMailboxes();
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setInvitationsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo cargar la lista de invitaciones');
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGeneratedInvite('');
    setActionLoading(true);

    const assignedAddresses = inviteFullAccess ? ['*'] : inviteSelectedAddresses;
    if (assignedAddresses.length === 0) {
      setError('Debes seleccionar al menos una cuenta de correo.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: inviteRole,
          assignedAddresses,
          require2FA: inviteRequire2FA
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const inviteLink = `${window.location.origin}/invite?token=${data.token}`;
        setGeneratedInvite(inviteLink);
        setSuccess('Enlace de invitación generado con éxito.');
        setInviteSelectedAddresses([]);
        setInviteFullAccess(false);
        setInviteRequire2FA(false);
        fetchInvitations();
      } else {
        setError(data.error || 'Error al generar la invitación');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres revocar este enlace de invitación?')) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/invitations?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Enlace de invitación revocado con éxito.');
        fetchInvitations();
      } else {
        setError(data.error || 'Error al eliminar la invitación');
      }
    } catch (err) {
      console.error(err);
      setError('Error al comunicar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    alert('¡Enlace de invitación copiado al portapapeles!');
  };

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
      : newSelectedAddresses;

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
          assignedAddresses,
          require2FA: newRequire2FA
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Usuario ${newEmail} autorizado correctamente.`);
        setNewEmail('');
        setNewSelectedAddresses([]);
        setFullAccess(false);
        setNewRole('user');
        setNewRequire2FA(false);
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

  // Load storage stats
  const fetchStorageStats = async () => {
    setStorageLoading(true);
    try {
      const res = await fetch('/api/admin/storage');
      if (res.ok) {
        const data = await res.json();
        setStorageStats(data);
      }
    } catch (err) {
      console.error('Error fetching storage stats:', err);
    } finally {
      setStorageLoading(false);
    }
  };

  const handlePurge = async (folder?: string, olderThanDays?: number) => {
    const label = folder === 'trash' && olderThanDays
      ? `la papelera con más de ${olderThanDays} días`
      : folder === 'spam'
      ? 'todo el correo no deseado (spam)'
      : `la carpeta ${folder}`;
    if (!confirm(`¿Estás seguro de que deseas purgar ${label}? Esta acción eliminará permanentemente correos y sus adjuntos de Cloudflare R2.`)) {
      return;
    }
    setPurgeLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, olderThanDays })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || 'Purga completada con éxito');
        fetchStorageStats();
      } else {
        setError(data.error || 'Error al ejecutar purga');
      }
    } catch (err) {
      console.error(err);
      setError('Error al comunicar con el servidor durante la purga.');
    } finally {
      setPurgeLoading(false);
    }
  };

  // Open edit modal
  const startEdit = (user: AllowedUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    const isWildcard = user.assignedAddresses.includes('*');
    setEditFullAccess(isWildcard);
    setEditSelectedAddresses(isWildcard ? [] : [...user.assignedAddresses]);
    setEditRequire2FA(!!user.require2FA);
    setEditStorageLimitMB(user.storageLimitMB || 0);
    setEditDailySendLimit(user.dailySendLimit || 0);
    setEditStatus(user.status || 'active');
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
      : editSelectedAddresses;

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
          assignedAddresses,
          require2FA: editRequire2FA,
          storageLimitMB: Number(editStorageLimitMB),
          dailySendLimit: Number(editDailySendLimit),
          status: editStatus
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Usuario ${editingUser.email} actualizado correctamente.`);
        setEditingUser(null);
        fetchUsers();
        if (activeTab === 'storage') fetchStorageStats();
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
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">

      {/* Header bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-8 bg-card shrink-0">
        <h1 className="text-sm font-bold tracking-wider uppercase text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          Administración de Accesos
        </h1>
        <button
          onClick={
            activeTab === 'users'
              ? fetchUsers
              : activeTab === 'domains'
              ? fetchDomains
              : activeTab === 'mailboxes'
              ? fetchMailboxes
              : activeTab === 'invitations'
              ? fetchInvitations
              : fetchStorageStats
          }
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
          title="Refrescar lista"
        >
          <RefreshCw className={`h-4 w-4 ${(
            activeTab === 'users'
              ? loading
              : activeTab === 'domains'
              ? domainsLoading
              : activeTab === 'mailboxes'
              ? mailboxesLoading
              : activeTab === 'invitations'
              ? invitationsLoading
              : storageLoading
          ) ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Tab Selector */}
      <div className="flex px-8 py-2 border-b border-border bg-muted/30 shrink-0 gap-2 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('users');
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0 ${
            activeTab === 'users'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Gestión de Usuarios
        </button>
        <button
          onClick={() => {
            setActiveTab('domains');
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0 ${
            activeTab === 'domains'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Dominios Autorizados
        </button>
        <button
          onClick={() => {
            setActiveTab('mailboxes');
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0 ${
            activeTab === 'mailboxes'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Cuentas de Correo
        </button>
        <button
          onClick={() => {
            setActiveTab('invitations');
            setError('');
            setSuccess('');
            setGeneratedInvite('');
            fetchInvitations();
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0 ${
            activeTab === 'invitations'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Enlaces de Invitación
        </button>
        <button
          onClick={() => {
            setActiveTab('storage');
            setError('');
            setSuccess('');
            fetchStorageStats();
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0 flex items-center gap-1.5 ${
            activeTab === 'storage'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <HardDrive className="h-3.5 w-3.5" />
          Almacenamiento y Límites
        </button>
        <button
          onClick={() => {
            setActiveTab('drive');
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0 flex items-center gap-1.5 ${
            activeTab === 'drive'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Archivos R2 (Drive)
        </button>
      </div>

      {activeTab === 'users' ? (
        /* Main split viewport for Users */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6">
        
        {/* Left Side: Create User Form */}
        <section className="w-full lg:w-96 shrink-0 space-y-4">
          <div className="bg-card border border-border p-6 rounded-2xl relative backdrop-blur-md">
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
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="fullAccess" className="text-xs font-medium text-foreground select-none cursor-pointer">
                  Acceso Total (todas las cuentas)
                </label>
              </div>

              {/* Require 2FA Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newRequire2FA"
                  checked={newRequire2FA}
                  onChange={(e) => setNewRequire2FA(e.target.checked)}
                  className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="newRequire2FA" className="text-xs font-medium text-foreground select-none cursor-pointer">
                  Exigir 2FA Obligatorio
                </label>
              </div>

              {/* Specific Email addresses selector */}
              {!fullAccess && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Direcciones Asignadas (Cuentas Propias)
                  </label>
                  
                  {mailboxes.length === 0 ? (
                    <div className="rounded-lg border border-yellow-900/35 bg-yellow-950/20 p-3 text-[10px] text-amber-500 font-medium leading-relaxed">
                      ⚠️ No hay cuentas de correo registradas en el servidor. 
                      Registra al menos una cuenta en la pestaña &quot;Cuentas de Correo&quot; primero.
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setNewDropdownOpen(!newDropdownOpen)}
                        className="w-full flex items-center justify-between rounded-lg border border-border bg-background py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none text-left cursor-pointer"
                      >
                        <span className="truncate">
                          {newSelectedAddresses.length === 0 
                            ? 'Seleccionar cuentas...' 
                            : `${newSelectedAddresses.length} cuenta(s) seleccionada(s)`}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                      
                      {newDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setNewDropdownOpen(false)} />
                          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2 shadow-xl animate-fadeIn">
                            <div className="space-y-1">
                              {mailboxes.map(box => {
                                const isChecked = newSelectedAddresses.includes(box.email);
                                return (
                                  <label 
                                    key={box._id} 
                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer select-none text-xs text-foreground text-left"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setNewSelectedAddresses(newSelectedAddresses.filter(addr => addr !== box.email));
                                        } else {
                                          setNewSelectedAddresses([...newSelectedAddresses, box.email]);
                                        }
                                      }}
                                      className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <div className="truncate flex-1 min-w-0">
                                      <p className="font-semibold text-[11px] truncate">{box.name}</p>
                                      <p className="text-[9px] text-muted-foreground truncate">{box.email}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    El usuario solo podrá ver e interactuar con las cuentas seleccionadas.
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
        <section className="flex-1 min-w-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/30 shrink-0">
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
                <thead className="sticky top-0 bg-card/80 backdrop-blur border-b border-border text-muted-foreground/80 font-medium text-[10px] uppercase tracking-wider select-none z-10">
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
                    <tr key={user._id} className="hover:bg-muted/40 transition-all group">
                      {/* Email Profile */}
                      <td className="py-3.5 px-4 font-medium text-foreground select-text">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-primary font-bold border border-border/30">
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="truncate max-w-[160px] font-semibold">{user.email}</p>
                              {user.status === 'suspended' && (
                                <span className="px-1.5 py-0.2 text-[8px] font-bold uppercase rounded bg-red-500/10 text-red-400 border border-red-500/20 select-none">
                                  Suspendido
                                </span>
                              )}
                            </div>
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
                            : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>

                      {/* 2FA Status */}
                      <td className="py-3.5 px-4 select-none">
                        <div className="flex flex-col gap-0.5">
                          {user.twoFactorEnabled ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                              <Check className="h-3.5 w-3.5" />
                              Activo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                              <Clock className="h-3.5 w-3.5 animate-pulse" />
                              Inactivo
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground/60 select-none">
                            {user.require2FA ? 'Obligatorio' : 'Recomendado'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Addresses */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-foreground">
                        {user.assignedAddresses.includes('*') ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/30 border border-emerald-900/20 text-emerald-400 text-[9px] font-semibold select-none">
                            Acceso Total (*)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {user.assignedAddresses.map((addr, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-muted border border-border/40 text-[9px] tracking-tight">
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
      ) : activeTab === 'domains' ? (
        /* Main split viewport for Domains */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6 animate-fadeIn">
          {/* Left Side: Add Domain Form */}
          <section className="w-full lg:w-96 shrink-0 space-y-4">
            <div className="bg-card border border-border p-6 rounded-2xl relative backdrop-blur-md">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Globe className="h-4.5 w-4.5 text-primary" />
                Registrar Nuevo Dominio
              </h3>

              <form onSubmit={handleAddDomain} className="space-y-4">
                {/* Domain Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Nombre de Dominio
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="ej: broslunas.es"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    Solo letras, números, guiones y puntos (ej: midominio.com). No incluyas "http://" ni "@".
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !newDomain.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Globe className="h-3.5 w-3.5" />
                      Registrar Dominio
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

          {/* Right Side: Domains List */}
          <section className="flex-1 min-w-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/30 shrink-0">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Dominios Permitidos ({domains.length})
              </h3>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {domainsLoading ? (
                <div className="h-full flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : domains.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Globe className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-xs">No hay dominios autorizados registrados.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card/80 backdrop-blur border-b border-border text-muted-foreground/80 font-medium text-[10px] uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="py-3 px-4">Dominio</th>
                      <th className="py-3 px-4">Registrado por</th>
                      <th className="py-3 px-4">Fecha de Registro</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {domains.map((dom) => (
                      <tr key={dom._id} className="hover:bg-muted/40 transition-all group">
                        <td className="py-3.5 px-4 font-semibold text-foreground select-text font-mono text-xs">
                          {dom.domain}
                        </td>
                        <td className="py-3.5 px-4 text-foreground">
                          {dom.addedBy || 'System'}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {new Date(dom.createdAt).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right select-none">
                          <button
                            onClick={() => handleDeleteDomain(dom.domain)}
                            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Eliminar dominio"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      ) : activeTab === 'mailboxes' ? (
        /* Main split viewport for Mailboxes */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6 animate-fadeIn">
          {/* Left Side: Add Mailbox Form */}
          <section className="w-full lg:w-96 shrink-0 space-y-4">
            <div className="bg-card border border-border p-6 rounded-2xl relative backdrop-blur-md">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Mail className="h-4.5 w-4.5 text-primary" />
                Registrar Nueva Cuenta
              </h3>

              <form onSubmit={handleAddMailbox} className="space-y-4">
                {/* Mailbox Display Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Nombre del Remitente (Display Name)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={newMailboxName}
                      onChange={(e) => setNewMailboxName(e.target.value)}
                      placeholder="ej: Pablo Luna (Ventas)"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    El nombre que verán los receptores de los correos enviados desde esta cuenta.
                  </p>
                </div>

                {/* Mailbox Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Dirección de Correo
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={newMailboxEmail}
                      onChange={(e) => setNewMailboxEmail(e.target.value)}
                      placeholder="ej: contacto@broslunas.es"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    La dirección debe terminar con un dominio previamente registrado en la pestaña de dominios.
                  </p>
                </div>

                {/* Mailbox Storage Limit */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Cuota Almacenamiento (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMailboxStorageLimitMB || ''}
                    onChange={(e) => setNewMailboxStorageLimitMB(Number(e.target.value) || 0)}
                    placeholder="0 = Ilimitado"
                    className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    Límite máximo para esta cuenta en MB (0 = sin límite).
                  </p>
                </div>

                {/* Mailbox Daily Send Limit */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Límite Diario de Envíos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMailboxDailySendLimit || ''}
                    onChange={(e) => setNewMailboxDailySendLimit(Number(e.target.value) || 0)}
                    placeholder="0 = Ilimitado"
                    className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    Máximo de correos salientes diarios (0 = sin límite).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !newMailboxEmail.trim() || !newMailboxName.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5" />
                      Registrar Cuenta
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

          {/* Right Side: Mailboxes List */}
          <section className="flex-1 min-w-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/30 shrink-0">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Cuentas de Correo Registradas ({mailboxes.length})
              </h3>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {mailboxesLoading ? (
                <div className="h-full flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : mailboxes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Mail className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-xs">No hay cuentas de correo registradas.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card/80 backdrop-blur border-b border-border text-muted-foreground/80 font-medium text-[10px] uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="py-3 px-4">Nombre Remitente</th>
                      <th className="py-3 px-4">Dirección Email</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Cuota</th>
                      <th className="py-3 px-4">Límite Diario</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {mailboxes.map((box) => (
                      <tr key={box._id} className="hover:bg-muted/40 transition-all group">
                        <td className="py-3.5 px-4 font-semibold text-foreground select-text text-xs">
                          {box.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-foreground">
                          {box.email}
                        </td>
                        <td className="py-3.5 px-4">
                          {box.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                              <Ban className="h-3 w-3" /> Suspendida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              <Check className="h-3 w-3" /> Activa
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground text-xs">
                          {box.storageLimitMB && box.storageLimitMB > 0 ? `${box.storageLimitMB} MB` : 'Ilimitado'}
                        </td>
                        <td className="py-3.5 px-4 text-foreground text-xs">
                          {box.dailySendLimit && box.dailySendLimit > 0 ? `${box.dailySendLimit}/día` : 'Ilimitado'}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {new Date(box.createdAt).toLocaleDateString('es-ES', {
                            dateStyle: 'short'
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right select-none">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEditMailbox(box)}
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                              title="Editar límites y estado"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMailbox(box.email)}
                              className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Eliminar cuenta"
                            >
                              <Trash2 className="h-4 w-4" />
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
      ) : activeTab === 'invitations' ? (
        /* Main split viewport for Invitations */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 gap-6 animate-fadeIn">
          {/* Left Side: Generate Invitation Form */}
          <section className="w-full lg:w-96 shrink-0 space-y-4">
            <div className="bg-card border border-border p-6 rounded-2xl relative backdrop-blur-md">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <UserPlus className="h-4.5 w-4.5 text-primary" />
                Generar Enlace de Invitación
              </h3>

              <form onSubmit={handleCreateInvitation} className="space-y-4">
                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Rol Asignado
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
                    className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="user">Usuario Común</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* Wildcard Access Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="inviteFullAccess"
                    checked={inviteFullAccess}
                    onChange={(e) => setInviteFullAccess(e.target.checked)}
                    className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="inviteFullAccess" className="text-xs font-medium text-foreground select-none cursor-pointer">
                    Acceso Total (todas las cuentas)
                  </label>
                </div>

                {/* Require 2FA Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="inviteRequire2FA"
                    checked={inviteRequire2FA}
                    onChange={(e) => setInviteRequire2FA(e.target.checked)}
                    className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="inviteRequire2FA" className="text-xs font-medium text-foreground select-none cursor-pointer">
                    Exigir 2FA Obligatorio
                  </label>
                </div>

                {/* Mailboxes Selection Dropdown */}
                {!inviteFullAccess && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                      Direcciones Asignadas
                    </label>

                    {mailboxes.length === 0 ? (
                      <div className="rounded-lg border border-yellow-905/35 bg-yellow-950/20 p-3 text-[10px] text-amber-500 font-medium leading-relaxed">
                        ⚠️ No hay cuentas de correo registradas. Regístralas primero.
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setInviteDropdownOpen(!inviteDropdownOpen)}
                          className="w-full flex items-center justify-between rounded-lg border border-border bg-background py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none text-left cursor-pointer"
                        >
                          <span className="truncate">
                            {inviteSelectedAddresses.length === 0 
                              ? 'Seleccionar cuentas...' 
                              : `${inviteSelectedAddresses.length} cuenta(s) seleccionada(s)`}
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                        
                        {inviteDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setInviteDropdownOpen(false)} />
                            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2 shadow-xl animate-fadeIn">
                              <div className="space-y-1">
                                {mailboxes.map(box => {
                                  const isChecked = inviteSelectedAddresses.includes(box.email);
                                  return (
                                    <label 
                                      key={box._id} 
                                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer select-none text-xs text-foreground text-left"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setInviteSelectedAddresses(inviteSelectedAddresses.filter(addr => addr !== box.email));
                                          } else {
                                            setInviteSelectedAddresses([...inviteSelectedAddresses, box.email]);
                                          }
                                        }}
                                        className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                      />
                                      <div className="truncate flex-1 min-w-0">
                                        <p className="font-semibold text-[11px] truncate">{box.name}</p>
                                        <p className="text-[9px] text-muted-foreground truncate">{box.email}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    'Generar Enlace'
                  )}
                </button>
              </form>

              {/* Quick Copy Link Box */}
              {generatedInvite && (
                <div className="rounded-xl p-4 space-y-2.5 text-left animate-fadeIn" style={{ border: '1px solid hsl(var(--primary)/0.3)', background: 'hsl(var(--primary)/0.04)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--primary))' }}>¡Enlace Generado!</p>
                  <p className="text-[10px] text-slate-300 font-mono break-all bg-background p-2 rounded border border-white/5 select-text">
                    {generatedInvite}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedInvite, 'generated')}
                    className="w-full py-1.5 rounded bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-widest transition-all hover:bg-primary/95 cursor-pointer"
                  >
                    Copiar Enlace
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Right Side: List of invitations */}
          <section className="flex-1 flex flex-col min-w-0 bg-card border border-border/85 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="flex-1 overflow-x-auto min-h-0">
              {invitationsLoading ? (
                <div className="h-full flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : invitations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 opacity-30 mb-2 animate-pulse" />
                  <p className="text-xs">No hay enlaces de invitación creados.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card/80 backdrop-blur border-b border-border text-muted-foreground/80 font-medium text-[10px] uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="py-3 px-4">Enlace</th>
                      <th className="py-3 px-4">Permisos</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Creado Por / Fecha</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {invitations.map((invite) => {
                      const isExpired = new Date() > new Date(invite.expiresAt);
                      const inviteUrl = `${window.location.origin}/invite?token=${invite.token}`;
                      return (
                        <tr key={invite._id} className="hover:bg-muted/40 transition-all group">
                          <td className="py-3.5 px-4 font-mono text-[11px] text-foreground max-w-[180px] truncate select-text">
                            <span className="text-primary hover:underline cursor-pointer" onClick={() => copyToClipboard(inviteUrl, invite._id)}>
                              {invite.token.substring(0, 12)}... (Copiar Link)
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 capitalize bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                {invite.role}
                              </span>
                              <div className="text-[9px] text-muted-foreground truncate max-w-[200px]">
                                {invite.assignedAddresses.includes('*') 
                                  ? 'Acceso Total (*)' 
                                  : invite.assignedAddresses.join(', ')}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {invite.used ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                Reclamado por: {invite.usedBy}
                              </span>
                            ) : isExpired ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                                Expirado
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' }}>
                                Activo (Expira {new Date(invite.expiresAt).toLocaleDateString()})
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            <div>{invite.createdBy}</div>
                            <div className="text-[9px] opacity-75">{new Date(invite.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right select-none">
                            <button
                              onClick={() => handleDeleteInvitation(invite._id)}
                              className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Eliminar / Revocar enlace"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      ) : activeTab === 'storage' ? (
        /* Main Viewport for Storage and Limits */
        <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 animate-fadeIn">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            <div className="bg-card border border-border p-4 rounded-xl backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Almacenamiento Total</span>
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {storageStats?.global?.totalStorageMB ?? '...'} <span className="text-sm font-normal text-muted-foreground">MB</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                DB + Adjuntos en Cloudflare R2
              </p>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Adjuntos (R2)</span>
                <Database className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {storageStats?.global ? (storageStats.global.totalAttachmentBytes / (1024 * 1024)).toFixed(2) : '...'} <span className="text-sm font-normal text-muted-foreground">MB</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {storageStats?.global?.totalAttachments ?? 0} archivos subidos
              </p>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Correos Totales</span>
                <Mail className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {storageStats?.global?.totalEmails ?? '...'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {storageStats?.global ? ((storageStats.global.dbSizeBytes || 0) / (1024 * 1024)).toFixed(2) : '...'} MB en base de datos
              </p>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Spam y Papelera</span>
                <Trash2 className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {(storageStats?.global?.trashCount ?? 0) + (storageStats?.global?.spamCount ?? 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {storageStats?.global?.spamCount ?? 0} spam / {storageStats?.global?.trashCount ?? 0} papelera
              </p>
            </div>
          </div>

          {/* Quick Purge and Maintenance Bar */}
          <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-xs font-bold text-foreground">Mantenimiento y Purga de Disco</p>
                <p className="text-[10px] text-muted-foreground">Elimina correos antiguos y libera espacio en MongoDB y Cloudflare R2</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={purgeLoading}
                onClick={() => handlePurge('spam')}
                className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                Vaciar Spam
              </button>
              <button
                type="button"
                disabled={purgeLoading}
                onClick={() => handlePurge('trash', 30)}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                Vaciar Papelera &gt; 30 días
              </button>
              <button
                type="button"
                disabled={purgeLoading}
                onClick={() => handlePurge('trash')}
                className="px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                Vaciar Toda la Papelera
              </button>
            </div>
          </div>

          {/* Sub-view Switcher: Both, Users, Mailboxes */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Mostrar:</span>
            <button
              type="button"
              onClick={() => setStorageSubTab('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                storageSubTab === 'both'
                  ? 'bg-primary/20 border-primary/40 text-primary shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Ver Ambos ({storageStats?.users?.length || 0} usuarios / {storageStats?.mailboxes?.length || 0} buzones)
            </button>
            <button
              type="button"
              onClick={() => setStorageSubTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                storageSubTab === 'users'
                  ? 'bg-primary/20 border-primary/40 text-primary shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Por Usuarios ({storageStats?.users?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setStorageSubTab('mailboxes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                storageSubTab === 'mailboxes'
                  ? 'bg-primary/20 border-primary/40 text-primary shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Por Cuentas de Correo ({storageStats?.mailboxes?.length || 0})
            </button>
          </div>

          {/* User Limits & Storage Table */}
          {(storageSubTab === 'both' || storageSubTab === 'users') && (
            <section className="shrink-0 flex flex-col min-w-0 bg-card border border-border rounded-xl overflow-hidden backdrop-blur-md">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  Cuotas y Límites por Usuario
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {storageStats?.users?.length || 0} usuario(s)
                </span>
              </div>

              <div className="overflow-x-auto">
              {storageLoading ? (
                <div className="h-full flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !storageStats?.users || storageStats.users.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <HardDrive className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-xs">No hay datos de almacenamiento para mostrar.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card/80 backdrop-blur border-b border-border text-muted-foreground/80 font-medium text-[10px] uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Almacenamiento Usado</th>
                      <th className="py-3 px-4">Cuota Máxima</th>
                      <th className="py-3 px-4">Envíos Hoy / Límite</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {storageStats.users.map((u: any) => {
                      const matchedUser = users.find(usr => usr.email === u.email);
                      return (
                        <tr key={u.email} className="hover:bg-muted/40 transition-all">
                          <td className="py-3.5 px-4 font-mono text-xs text-foreground select-text">
                            <div>{u.email}</div>
                            <div className="text-[10px] text-muted-foreground">{u.emailCount} correos en sistema</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.status === 'suspended' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                <Ban className="h-3 w-3" /> Suspendido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                <Check className="h-3 w-3" /> Activo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 min-w-[160px]">
                            <div className="text-xs font-semibold text-foreground">
                              {u.usedMB} MB
                              {u.storageLimitMB > 0 && (
                                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                  ({u.percentUsed}%)
                                </span>
                              )}
                            </div>
                            {u.storageLimitMB > 0 ? (
                              <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    (u.percentUsed || 0) >= 90
                                      ? 'bg-red-500'
                                      : (u.percentUsed || 0) >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(100, u.percentUsed || 0)}%` }}
                                />
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sin cuota límite</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {u.storageLimitMB > 0 ? `${u.storageLimitMB} MB` : 'Ilimitado'}
                          </td>
                          <td className="py-3.5 px-4 text-foreground">
                            <span className="font-semibold">{u.sentToday}</span>
                            <span className="text-muted-foreground"> / {u.dailySendLimit > 0 ? `${u.dailySendLimit}/día` : 'Ilimitado'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedUser) {
                                  startEdit(matchedUser);
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-[11px] font-medium transition-all cursor-pointer"
                            >
                              Configurar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          )}

          {/* Mailbox Limits & Storage Table */}
          {(storageSubTab === 'both' || storageSubTab === 'mailboxes') && (
            <section className="shrink-0 flex flex-col min-w-0 bg-card border border-border rounded-xl overflow-hidden backdrop-blur-md">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Cuotas y Almacenamiento por Buzón / Cuenta de Correo
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {storageStats?.mailboxes?.length || 0} cuenta(s)
                </span>
              </div>

            <div className="overflow-x-auto">
              {storageLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !storageStats?.mailboxes || storageStats.mailboxes.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Mail className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-xs">No hay buzones registrados para mostrar.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card/80 backdrop-blur border-b border-border text-muted-foreground/80 font-medium text-[10px] uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="py-3 px-4">Buzón / Remitente</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Almacenamiento Usado</th>
                      <th className="py-3 px-4">Cuota Máxima</th>
                      <th className="py-3 px-4">Envíos Hoy / Límite</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {storageStats.mailboxes.map((m: any) => {
                      const matchedMailbox = mailboxes.find(box => box.email.toLowerCase() === m.email.toLowerCase());
                      return (
                        <tr key={m.email} className="hover:bg-muted/40 transition-all">
                          <td className="py-3.5 px-4 font-mono text-xs text-foreground select-text">
                            <div className="font-semibold font-sans text-xs">{m.name}</div>
                            <div className="text-[11px] text-muted-foreground">{m.email}</div>
                            <div className="text-[10px] text-muted-foreground/70">{m.emailCount} correos asociados</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {m.status === 'suspended' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                <Ban className="h-3 w-3" /> Suspendida
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                <Check className="h-3 w-3" /> Activa
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 min-w-[160px]">
                            <div className="text-xs font-semibold text-foreground">
                              {m.usedMB} MB
                              {m.storageLimitMB > 0 && (
                                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                  ({m.percentUsed}%)
                                </span>
                              )}
                            </div>
                            {m.storageLimitMB > 0 ? (
                              <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    (m.percentUsed || 0) >= 90
                                      ? 'bg-red-500'
                                      : (m.percentUsed || 0) >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(100, m.percentUsed || 0)}%` }}
                                />
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sin cuota límite</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {m.storageLimitMB > 0 ? `${m.storageLimitMB} MB` : 'Ilimitado'}
                          </td>
                          <td className="py-3.5 px-4 text-foreground">
                            <span className="font-semibold">{m.sentToday}</span>
                            <span className="text-muted-foreground"> / {m.dailySendLimit > 0 ? `${m.dailySendLimit}/día` : 'Ilimitado'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedMailbox) {
                                  startEditMailbox(matchedMailbox);
                                } else {
                                  startEditMailbox({
                                    _id: m.email,
                                    email: m.email,
                                    name: m.name || m.email.split('@')[0],
                                    storageLimitMB: m.storageLimitMB,
                                    dailySendLimit: m.dailySendLimit,
                                    status: m.status,
                                    addedBy: 'admin',
                                    createdAt: new Date().toISOString()
                                  });
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-[11px] font-medium transition-all cursor-pointer"
                            >
                              Configurar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          )}
        </div>
      ) : activeTab === 'drive' ? (
        <AdminDrive mailboxes={mailboxes} />
      ) : null}

      {/* Edit User Modal Overlay */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl p-6 shadow-2xl relative animate-zoomIn max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
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
                  className="w-full rounded-lg border border-border bg-muted py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="rounded border-border bg-muted text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="editFullAccess" className="text-xs font-medium text-foreground select-none cursor-pointer">
                  Acceso Total (todas las cuentas)
                </label>
              </div>

              {/* Edit Require 2FA Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editRequire2FA"
                  checked={editRequire2FA}
                  onChange={(e) => setEditRequire2FA(e.target.checked)}
                  className="rounded border-border bg-muted text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="editRequire2FA" className="text-xs font-medium text-foreground select-none cursor-pointer">
                  Exigir 2FA Obligatorio
                </label>
              </div>

              {/* Edit Assigned Addresses Textarea */}
              {!editFullAccess && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Direcciones Asignadas (Cuentas Propias)
                  </label>
                  
                  {mailboxes.length === 0 ? (
                    <div className="rounded-lg border border-yellow-905/35 bg-yellow-950/20 p-3 text-[10px] text-amber-500 font-medium leading-relaxed animate-fadeIn">
                      ⚠️ No hay cuentas de correo registradas. Regístralas primero en la pestaña de cuentas.
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setEditDropdownOpen(!editDropdownOpen)}
                        className="w-full flex items-center justify-between rounded-lg border border-border bg-muted py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none text-left cursor-pointer"
                      >
                        <span className="truncate">
                          {editSelectedAddresses.length === 0 
                            ? 'Seleccionar cuentas...' 
                            : `${editSelectedAddresses.length} cuenta(s) seleccionada(s)`}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                      
                      {editDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setEditDropdownOpen(false)} />
                          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2 shadow-xl animate-fadeIn">
                            <div className="space-y-1">
                              {mailboxes.map(box => {
                                const isChecked = editSelectedAddresses.includes(box.email);
                                return (
                                  <label 
                                    key={box._id} 
                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer select-none text-xs text-foreground text-left"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setEditSelectedAddresses(editSelectedAddresses.filter(addr => addr !== box.email));
                                        } else {
                                          setEditSelectedAddresses([...editSelectedAddresses, box.email]);
                                        }
                                      }}
                                      className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <div className="truncate flex-1 min-w-0">
                                      <p className="font-semibold text-[11px] truncate">{box.name}</p>
                                      <p className="text-[9px] text-muted-foreground truncate">{box.email}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                    Selecciona las cuentas a las que tendrá acceso este usuario.
                  </p>
                </div>
              )}

              {/* Status Select */}
              <div className="space-y-1.5 pt-1 border-t border-border/40">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Estado de la Cuenta
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended')}
                  className="w-full rounded-lg border border-border bg-muted py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Activo (Acceso y Envíos Permitidos)</option>
                  <option value="suspended">Suspendido (Bloqueo Inmediato)</option>
                </select>
              </div>

              {/* Limits Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Cuota Almacenamiento (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Ilimitado"
                    value={editStorageLimitMB}
                    onChange={(e) => setEditStorageLimitMB(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-muted py-2 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[9px] text-muted-foreground">0 para sin límite</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Límite Envíos / Día
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Ilimitado"
                    value={editDailySendLimit}
                    onChange={(e) => setEditDailySendLimit(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-muted py-2 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[9px] text-muted-foreground">0 para sin límite</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground py-2 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer text-center"
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

      {/* Edit Mailbox Modal Overlay */}
      {editingMailbox && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl p-6 shadow-2xl relative animate-zoomIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingMailbox(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Edit3 className="h-4.5 w-4.5 text-primary" />
              Editar Cuenta: <span className="text-primary font-mono font-normal">{editingMailbox.email}</span>
            </h3>

            <form onSubmit={handleUpdateMailbox} className="space-y-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Nombre Remitente (Display Name)
                </label>
                <input
                  type="text"
                  required
                  value={editMailboxName}
                  onChange={(e) => setEditMailboxName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Estado de la Cuenta
                </label>
                <select
                  value={editMailboxStatus}
                  onChange={(e) => setEditMailboxStatus(e.target.value as 'active' | 'suspended')}
                  className="w-full rounded-lg border border-border bg-muted py-2.5 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Activa (Permitir envíos y recepción)</option>
                  <option value="suspended">Suspendida (Bloquear envíos desde esta dirección)</option>
                </select>
              </div>

              {/* Storage and Daily Send limits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Cuota Almacenamiento (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Ilimitado"
                    value={editMailboxStorageLimitMB || ''}
                    onChange={(e) => setEditMailboxStorageLimitMB(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-muted py-2 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[9px] text-muted-foreground">0 para sin límite</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                    Límite Envíos / Día
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Ilimitado"
                    value={editMailboxDailySendLimit || ''}
                    onChange={(e) => setEditMailboxDailySendLimit(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-muted py-2 px-3 text-xs text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[9px] text-muted-foreground">0 para sin límite</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMailbox(null)}
                  className="flex-1 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground py-2 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer text-center"
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
