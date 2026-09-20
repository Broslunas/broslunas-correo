'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  Building,
  FileText,
  Star,
  Trash2,
  Edit2,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Bookmark,
  Send,
  ExternalLink,
  LayoutGrid,
  List,
  Sparkles,
  UserCheck,
  X,
  Clock,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { showConfirm } from '@/lib/modal';

export interface Contact {
  _id?: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  notes?: string;
  picture?: string;
  role?: string;
  source: 'registered' | 'saved' | 'interaction';
  isRegistered?: boolean;
  starred?: boolean;
  interactionCount: number;
  lastInteraction?: string;
}

interface ContactsManagerProps {
  onComposeTo: (email: string, name?: string) => void;
  onSearchEmailsWithContact?: (email: string) => void;
}

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600 text-white',
  'from-emerald-500 to-teal-600 text-white',
  'from-violet-500 to-purple-600 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-rose-500 to-pink-600 text-white',
  'from-cyan-500 to-blue-600 text-white',
  'from-fuchsia-500 to-pink-600 text-white',
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getInitials(name: string, email: string): string {
  const target = (name && name.trim()) || email.split('@')[0];
  const parts = target.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return target.slice(0, 2).toUpperCase();
}

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Hace un momento';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export default function ContactsManager({
  onComposeTo,
  onSearchEmailsWithContact
}: ContactsManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'registered' | 'saved' | 'interaction'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStarred, setFormStarred] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail Drawer State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (res.ok && data.contacts) {
        setContacts(data.contacts);
      } else {
        toast.error(data.error || 'Error al cargar contactos');
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      toast.error('Error de conexión al cargar contactos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleCopyEmail = (email: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success('Correo copiado al portapapeles');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleToggleStar = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStarred = !contact.starred;

    // Optimistic update
    setContacts(prev => prev.map(c => c.email === contact.email ? { ...c, starred: newStarred } : c));
    if (selectedContact?.email === contact.email) {
      setSelectedContact(prev => prev ? { ...prev, starred: newStarred } : null);
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact._id,
          email: contact.email,
          name: contact.name,
          phone: contact.phone,
          company: contact.company,
          notes: contact.notes,
          starred: newStarred,
        }),
      });
      if (!res.ok) {
        // Rollback
        setContacts(prev => prev.map(c => c.email === contact.email ? { ...c, starred: !newStarred } : c));
        toast.error('No se pudo actualizar el estado de favorito');
      }
    } catch {
      setContacts(prev => prev.map(c => c.email === contact.email ? { ...c, starred: !newStarred } : c));
      toast.error('Error al guardar');
    }
  };

  const handleSaveToBook = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contact.email,
          name: contact.name,
          starred: contact.starred,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`"${contact.name || contact.email}" guardado en la libreta`);
        fetchContacts();
      } else {
        toast.error(data.error || 'Error al guardar contacto');
      }
    } catch {
      toast.error('Error al guardar en la libreta');
    }
  };

  const handleDeleteContact = async (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await showConfirm(`¿Eliminar a "${contact.name || contact.email}" de tus contactos guardados?`, {
      title: 'Eliminar contacto',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const url = contact._id
        ? `/api/contacts?id=${contact._id}`
        : `/api/contacts?email=${encodeURIComponent(contact.email)}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Contacto eliminado de guardados');
        if (selectedContact?.email === contact.email) {
          setSelectedContact(null);
        }
        fetchContacts();
      } else {
        toast.error(data.error || 'Error al eliminar contacto');
      }
    } catch {
      toast.error('Error al eliminar contacto');
    }
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompany('');
    setFormNotes('');
    setFormStarred(false);
    setModalOpen(true);
  };

  const openEditModal = (contact: Contact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingContact(contact);
    setFormName(contact.name || '');
    setFormEmail(contact.email || '');
    setFormPhone(contact.phone || '');
    setFormCompany(contact.company || '');
    setFormNotes(contact.notes || '');
    setFormStarred(!!contact.starred);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formEmail.includes('@')) {
      toast.error('Por favor ingresa un correo electrónico válido');
      return;
    }

    setSaving(true);
    try {
      const method = editingContact?._id ? 'PUT' : 'POST';
      const payload: Record<string, any> = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        company: formCompany.trim(),
        notes: formNotes.trim(),
        starred: formStarred,
      };
      if (editingContact?._id) {
        payload.id = editingContact._id;
      }

      const res = await fetch('/api/contacts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editingContact ? 'Contacto actualizado' : 'Contacto creado correctamente');
        setModalOpen(false);
        fetchContacts();
      } else {
        toast.error(data.error || 'Error al procesar contacto');
      }
    } catch {
      toast.error('Error al comunicarse con el servidor');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado y búsqueda
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // Filtro de pestaña
      if (activeFilter === 'starred' && !c.starred) return false;
      if (activeFilter === 'registered' && !c.isRegistered && c.source !== 'registered') return false;
      if (activeFilter === 'saved' && c.source !== 'saved') return false;
      if (activeFilter === 'interaction' && c.source !== 'interaction') return false;

      // Filtro de búsqueda
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    });
  }, [contacts, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: contacts.length,
      registered: contacts.filter(c => c.isRegistered || c.source === 'registered').length,
      saved: contacts.filter(c => c.source === 'saved').length,
      interactions: contacts.filter(c => c.source === 'interaction').length,
      starred: contacts.filter(c => c.starred).length,
    };
  }, [contacts]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* Top Header */}
      <header className="shrink-0 border-b border-border/60 bg-card/40 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Contactos
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                  {stats.total}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cuentas del sistema, libreta personal y personas con las que te has comunicado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchContacts}
              disabled={loading}
              title="Refrescar lista"
              className="p-2 rounded-xl border border-border/70 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>

            <div className="flex items-center rounded-xl border border-border/70 p-0.5 bg-muted/30">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Vista en cuadrícula"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Vista en lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Nuevo contacto</span>
            </button>
          </div>
        </div>

        {/* Search & Tabs Row */}
        <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email, empresa o teléfono..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'Todos', count: stats.total },
              { id: 'starred', label: 'Favoritos', count: stats.starred, icon: Star },
              { id: 'registered', label: 'Registrados', count: stats.registered, icon: ShieldCheck },
              { id: 'saved', label: 'Libreta', count: stats.saved, icon: Bookmark },
              { id: 'interaction', label: 'De correos', count: stats.interactions, icon: Sparkles },
            ].map(tab => {
              const isActive = activeFilter === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/50'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area: Grid / List & Detail Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-foreground">Cargando contactos...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sincronizando cuentas registradas y correos anteriores
              </p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-center max-w-sm mx-auto p-6 rounded-2xl border border-dashed border-border/80 bg-card/30">
              <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No se encontraron contactos</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery
                  ? `No hay contactos que coincidan con "${searchQuery}"`
                  : 'Aún no tienes contactos en este filtro.'}
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Agregar primer contacto</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ====== GRID VIEW ====== */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredContacts.map((contact) => {
                const avatarColor = getAvatarColor(contact.email);
                const initials = getInitials(contact.name, contact.email);

                return (
                  <div
                    key={contact.email}
                    onClick={() => setSelectedContact(contact)}
                    className="group relative flex flex-col justify-between p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                  >
                    {/* Top Row: Avatar, Info, Star */}
                    <div>
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {contact.picture ? (
                            <img
                              src={contact.picture}
                              alt={contact.name}
                              className="h-11 w-11 rounded-2xl object-cover ring-2 ring-border/40 shrink-0"
                            />
                          ) : (
                            <div
                              className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0`}
                            >
                              {initials}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {contact.name || contact.email.split('@')[0]}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {contact.isRegistered || contact.source === 'registered' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  <UserCheck className="h-2.5 w-2.5" />
                                  Registrado
                                </span>
                              ) : contact.source === 'saved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <Bookmark className="h-2.5 w-2.5" />
                                  Guardado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  De correo
                                </span>
                              )}

                              {contact.interactionCount > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  {contact.interactionCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Star / Favorite */}
                        <button
                          onClick={(e) => handleToggleStar(contact, e)}
                          title={contact.starred ? 'Quitar de favoritos' : 'Marcar como favorito'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            contact.starred
                              ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10'
                              : 'text-muted-foreground/40 hover:text-amber-500 hover:bg-muted'
                          }`}
                        >
                          <Star
                            className={`h-4 w-4 ${contact.starred ? 'fill-amber-500' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Email pill */}
                      <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border/40 group/email">
                        <span className="text-xs text-muted-foreground font-mono truncate" title={contact.email}>
                          {contact.email}
                        </span>
                        <button
                          onClick={(e) => handleCopyEmail(contact.email, e)}
                          title="Copiar correo"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer shrink-0 ml-1"
                        >
                          {copiedEmail === contact.email ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      {/* Optional metadata: phone, company */}
                      {(contact.company || contact.phone) && (
                        <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                          {contact.company && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Building className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{contact.company}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate font-mono text-[11px]">{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Last interaction timestamp */}
                      {contact.lastInteraction && (
                        <div className="mt-2 text-[10px] text-muted-foreground/70 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Último contacto: {formatRelativeDate(contact.lastInteraction)}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onComposeTo(contact.email, contact.name);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-500/15 dark:hover:bg-blue-600 dark:text-blue-400 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        <Send className="h-3 w-3" />
                        <span>Escribir correo</span>
                      </button>

                      {contact.source === 'interaction' && !contact._id && (
                        <button
                          onClick={(e) => handleSaveToBook(contact, e)}
                          title="Guardar en mi libreta"
                          className="p-1.5 rounded-xl border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {contact._id && (
                        <>
                          <button
                            onClick={(e) => openEditModal(contact, e)}
                            title="Editar contacto"
                            className="p-1.5 rounded-xl border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteContact(contact, e)}
                            title="Eliminar de contactos guardados"
                            className="p-1.5 rounded-xl border border-border/70 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ====== LIST VIEW ====== */
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-10"></th>
                      <th className="py-3 px-4">Contacto</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4 hidden md:table-cell">Empresa / Teléfono</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4 hidden lg:table-cell">Interacciones</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredContacts.map((contact) => {
                      const avatarColor = getAvatarColor(contact.email);
                      const initials = getInitials(contact.name, contact.email);

                      return (
                        <tr
                          key={contact.email}
                          onClick={() => setSelectedContact(contact)}
                          className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        >
                          <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleToggleStar(contact, e)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                contact.starred
                                  ? 'text-amber-500 hover:text-amber-600'
                                  : 'text-muted-foreground/30 hover:text-amber-500'
                              }`}
                            >
                              <Star
                                className={`h-4 w-4 ${contact.starred ? 'fill-amber-500' : ''}`}
                              />
                            </button>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-2.5">
                              {contact.picture ? (
                                <img
                                  src={contact.picture}
                                  alt={contact.name}
                                  className="h-8 w-8 rounded-xl object-cover shrink-0"
                                />
                              ) : (
                                <div
                                  className={`h-8 w-8 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center font-bold text-[10px] tracking-wider shadow-xs shrink-0`}
                                >
                                  {initials}
                                </div>
                              )}
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {contact.name || contact.email.split('@')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <span>{contact.email}</span>
                              <button
                                onClick={(e) => handleCopyEmail(contact.email, e)}
                                title="Copiar correo"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity cursor-pointer"
                              >
                                {copiedEmail === contact.email ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground hidden md:table-cell">
                            {contact.company || contact.phone || '—'}
                          </td>
                          <td className="py-2.5 px-4">
                            {contact.isRegistered || contact.source === 'registered' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                Registrado
                              </span>
                            ) : contact.source === 'saved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Guardado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                De correo
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground hidden lg:table-cell">
                            {contact.interactionCount > 0 ? (
                              <span>{contact.interactionCount} correos</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onComposeTo(contact.email, contact.name)}
                                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors cursor-pointer"
                                title="Enviar correo"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                              {contact._id && (
                                <>
                                  <button
                                    onClick={(e) => openEditModal(contact, e)}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteContact(contact, e)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {contact.source === 'interaction' && !contact._id && (
                                <button
                                  onClick={(e) => handleSaveToBook(contact, e)}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Guardar en libreta"
                                >
                                  <Bookmark className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* ====== CONTACT DETAIL DRAWER ====== */}
        {selectedContact && (
          <aside className="w-80 md:w-96 border-l border-border/60 bg-card/60 backdrop-blur-md p-5 flex flex-col justify-between overflow-y-auto shrink-0 shadow-lg animate-slideLeft">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ficha de Contacto
                </span>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="mt-5 flex flex-col items-center text-center">
                {selectedContact.picture ? (
                  <img
                    src={selectedContact.picture}
                    alt={selectedContact.name}
                    className="h-20 w-20 rounded-3xl object-cover ring-4 ring-primary/20 shadow-md"
                  />
                ) : (
                  <div
                    className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${getAvatarColor(
                      selectedContact.email
                    )} flex items-center justify-center font-bold text-xl tracking-wider shadow-md`}
                  >
                    {getInitials(selectedContact.name, selectedContact.email)}
                  </div>
                )}

                <h2 className="text-base font-bold text-foreground mt-3">
                  {selectedContact.name || selectedContact.email.split('@')[0]}
                </h2>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground">
                    {selectedContact.email}
                  </span>
                  <button
                    onClick={() => handleCopyEmail(selectedContact.email)}
                    title="Copiar correo"
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {copiedEmail === selectedContact.email ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5">
                  {selectedContact.isRegistered || selectedContact.source === 'registered' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Cuenta registrada
                    </span>
                  ) : selectedContact.source === 'saved' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Contacto en libreta
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                      Descubierto en correos
                    </span>
                  )}

                  {selectedContact.starred && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500" />
                      Favorito
                    </span>
                  )}
                </div>
              </div>

              {/* Data fields */}
              <div className="mt-6 space-y-3">
                {selectedContact.phone && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Teléfono
                    </span>
                    <p className="text-xs font-mono font-medium text-foreground mt-0.5">
                      {selectedContact.phone}
                    </p>
                  </div>
                )}

                {selectedContact.company && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" /> Empresa / Organización
                    </span>
                    <p className="text-xs font-medium text-foreground mt-0.5">
                      {selectedContact.company}
                    </p>
                  </div>
                )}

                {selectedContact.notes && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Notas
                    </span>
                    <p className="text-xs text-foreground mt-0.5 whitespace-pre-line">
                      {selectedContact.notes}
                    </p>
                  </div>
                )}

                {/* Interactions report */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Historial de correos
                  </span>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Correos compartidos:</span>
                    <span className="font-bold text-foreground">{selectedContact.interactionCount}</span>
                  </div>
                  {selectedContact.lastInteraction && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Última interacción:</span>
                      <span className="font-medium text-foreground">
                        {new Date(selectedContact.lastInteraction).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bottom */}
            <div className="mt-6 pt-4 border-t border-border/60 space-y-2">
              <button
                onClick={() => onComposeTo(selectedContact.email, selectedContact.name)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Redactar correo a este contacto</span>
              </button>

              {onSearchEmailsWithContact && (
                <button
                  onClick={() => onSearchEmailsWithContact(selectedContact.email)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border/70 hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Ver correos con este contacto</span>
                </button>
              )}

              <div className="flex items-center gap-2 pt-1">
                {selectedContact.source === 'interaction' && !selectedContact._id && (
                  <button
                    onClick={() => handleSaveToBook(selectedContact)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors cursor-pointer border border-emerald-500/20"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Guardar en libreta</span>
                  </button>
                )}

                {selectedContact._id && (
                  <>
                    <button
                      onClick={() => openEditModal(selectedContact)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/70 hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteContact(selectedContact)}
                      className="p-2 rounded-xl border border-border/70 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ====== CREATE / EDIT CONTACT MODAL ====== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {editingContact ? <Edit2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Ana García"
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Correo electrónico <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ana@ejemplo.com"
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Empresa / Organización
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Empresa S.L."
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notas
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Detalles sobre este contacto..."
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formStarred}
                  onChange={(e) => setFormStarred(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="flex items-center gap-1">
                  <Star className={`h-3.5 w-3.5 ${formStarred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                  Marcar como contacto favorito
                </span>
              </label>

              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border/70 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{editingContact ? 'Guardar Cambios' : 'Crear Contacto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
