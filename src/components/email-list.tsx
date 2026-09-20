'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Mail,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Bell,
  BellOff,
  ChevronDown,
  Globe,
  Star,
  CheckSquare,
  Square,
  MinusSquare,
  Folder,
  X,
  Paperclip,
  Sparkles,
  PartyPopper,
  CheckCircle2,
  SunMedium,
} from 'lucide-react';
import { fetchAndCachePlanetAvatar, getDicebearPlanetUrl } from '@/lib/avatar-cache';

interface Email {
  _id: string;
  from: { name: string; address: string };
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  date: string;
  body: { text: string; html: string };
  attachments?: any[];
  folder: string;
  isRead: boolean;
  isStarred?: boolean;
  threadId?: string;
  threadCount?: number;
}

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  isExpanded?: boolean;
  onSelectEmail: (email: Email) => void;
  onUpdateEmailStatus: (ids: string[], updates: { folder?: string; isRead?: boolean; isStarred?: boolean }) => void;
  folderLabel: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading: boolean;
  syncing: boolean;
  onSyncClick: () => void;
  isPushSupported?: boolean;
  isPushSubscribed?: boolean;
  onTogglePush?: () => void;
  availableAccounts?: { email: string; name: string }[];
  selectedAccount?: string;
  onAccountChange?: (account: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
}

function SenderAvatar({ name, address }: { name: string; address: string }) {
  const seed = (address || name || 'default').trim().toLowerCase();
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchAndCachePlanetAvatar(seed).then((cached) => {
      if (isMounted && cached) {
        setAvatarSrc(cached);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [seed]);

  const letter = (name || address)[0]?.toUpperCase() ?? '?';
  const colors = [
    ['#2563eb', '#1d4ed8'],
    ['#0891b2', '#0e7490'],
    ['#059669', '#047857'],
    ['#7c3aed', '#6d28d9'],
    ['#db2777', '#be185d'],
    ['#ea580c', '#c2410c'],
    ['#4b5563', '#374151'],
  ];
  const idx = seed.charCodeAt(0) % colors.length;
  const [from, to] = colors[idx];

  return (
    <div
      className="h-9 w-9 rounded-full shrink-0 select-none shadow-xs overflow-hidden relative border border-border/40"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {!imgError && avatarSrc ? (
        <img
          src={avatarSrc}
          alt={name || address}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : !imgError ? (
        <img
          src={getDicebearPlanetUrl(seed)}
          alt={name || address}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-white">
          {letter}
        </div>
      )}
    </div>
  );
}

function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  if (isNaN(date.getTime())) return '';
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: '2-digit' });
}

export default function EmailList({
  emails,
  selectedEmailId,
  isExpanded = false,
  onSelectEmail,
  onUpdateEmailStatus,
  folderLabel,
  searchQuery,
  onSearchChange,
  loading,
  syncing,
  onSyncClick,
  isPushSupported,
  isPushSubscribed,
  onTogglePush,
  availableAccounts = [],
  selectedAccount = '',
  onAccountChange = () => {},
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  totalCount = 0,
}: EmailListProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchFolderOpen, setBatchFolderOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Progressive infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading || loadingMore || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore]);

  // Clear batch selection when changing folders or accounts
  useEffect(() => {
    setSelectedIds(new Set());
    setBatchFolderOpen(false);
  }, [folderLabel, selectedAccount]);

  // Keyboard shortcut events for selecting/deselecting all
  useEffect(() => {
    const handleSelectAll = () => setSelectedIds(new Set(emails.map(e => e._id)));
    const handleDeselectAll = () => setSelectedIds(new Set());
    window.addEventListener('select-all-emails', handleSelectAll);
    window.addEventListener('deselect-all-emails', handleDeselectAll);
    return () => {
      window.removeEventListener('select-all-emails', handleSelectAll);
      window.removeEventListener('deselect-all-emails', handleDeselectAll);
    };
  }, [emails]);

  const allSelected = emails.length > 0 && selectedIds.size === emails.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e._id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchMarkRead = (isRead: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onUpdateEmailStatus(ids, { isRead });
    setSelectedIds(new Set());
  };

  const handleBatchStar = (isStarred: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onUpdateEmailStatus(ids, { isStarred });
    setSelectedIds(new Set());
  };

  const handleBatchTrash = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onUpdateEmailStatus(ids, { folder: 'trash' });
    setSelectedIds(new Set());
  };

  const handleBatchMoveFolder = (folderId: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onUpdateEmailStatus(ids, { folder: folderId });
    setSelectedIds(new Set());
    setBatchFolderOpen(false);
  };

  return (
    <div
      className={`flex flex-col h-full bg-card ${
        isExpanded
          ? 'w-full flex-1 min-w-0'
          : 'shrink-0 w-full md:w-80 lg:w-[320px] border-r border-border'
      }`}
    >
      {/* Header */}
      <div className={`shrink-0 pt-4 pb-3 space-y-2.5 border-b border-border bg-card ${isExpanded ? 'px-6' : 'px-4'}`}>
        {selectedIds.size > 0 ? (
          /* Batch toolbar */
          <div className="flex items-center justify-between bg-primary/10 rounded-xl px-2.5 py-1.5 border border-primary/20 animate-fadeIn">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSelectAll}
                title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                className="p-1 rounded text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                {allSelected ? <CheckSquare className="h-4 w-4" /> : <MinusSquare className="h-4 w-4" />}
              </button>
              <span className="text-xs font-semibold text-primary">
                {selectedIds.size} selec.
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleBatchMarkRead(true)}
                title="Marcar como leídos"
                className="p-1 rounded-md text-foreground/80 hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleBatchMarkRead(false)}
                title="Marcar como no leídos"
                className="p-1 rounded-md text-foreground/80 hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleBatchStar(true)}
                title="Destacar seleccionados"
                className="p-1 rounded-md text-amber-500 hover:bg-card transition-colors cursor-pointer"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleBatchTrash}
                title="Mover a papelera"
                className="p-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Move to folder dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBatchFolderOpen(!batchFolderOpen)}
                  title="Mover a carpeta"
                  className="p-1 rounded-md text-foreground/80 hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                >
                  <Folder className="h-3.5 w-3.5" />
                </button>
                {batchFolderOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setBatchFolderOpen(false)} />
                    <div className="absolute right-0 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl z-30 w-36 animate-fadeIn">
                      {[
                        { id: 'inbox', label: 'Principal' },
                        { id: 'personal', label: 'Personal' },
                        { id: 'work', label: 'Trabajo' },
                        { id: 'commercial', label: 'Comercial' },
                        { id: 'newsletter', label: 'Newsletter' },
                        { id: 'social', label: 'Redes Sociales' },
                        { id: 'spam', label: 'Spam' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleBatchMoveFolder(f.id)}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs hover:bg-muted font-medium transition-colors cursor-pointer"
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                title="Cancelar selección"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer ml-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                title="Seleccionar todos"
                className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
                {folderLabel}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {syncing && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  Sync
                </span>
              )}
              {isPushSupported && onTogglePush && (
                <button
                  onClick={onTogglePush}
                  title={isPushSubscribed ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer lg:hidden"
                >
                  {isPushSubscribed ? (
                    <Bell className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
              <button
                onClick={onSyncClick}
                disabled={syncing}
                title="Sincronizar"
                className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Account Selector */}
        {availableAccounts && availableAccounts.length > 0 && folderLabel !== 'Catch-All' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-left text-xs transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate font-medium">
                  {selectedAccount
                    ? availableAccounts.find((a) => a.email === selectedAccount)?.name || selectedAccount
                    : 'Todas las cuentas'}
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ml-1 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl z-20 max-h-60 overflow-y-auto animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      onAccountChange('');
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${
                      !selectedAccount ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span>Todas las cuentas</span>
                  </button>

                  {availableAccounts.map((acc) => {
                    const isSelected = selectedAccount === acc.email;
                    return (
                      <button
                        type="button"
                        key={acc.email}
                        onClick={() => {
                          onAccountChange(acc.email);
                          setDropdownOpen(false);
                        }}
                        className={`flex flex-col w-full px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer mt-0.5 ${
                          isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="text-xs font-semibold truncate">{acc.name || acc.email}</span>
                        {acc.name && (
                          <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {acc.email}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Gmail-style search bar */}
        <div className={`relative ${isExpanded ? 'max-w-xl' : 'w-full'}`}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            id="email-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar con operadores (from:, has:attachment)..."
            className="w-full rounded-full py-2 pl-9 pr-8 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Search Operator Quick Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
          {[
            { label: 'Adjuntos', token: 'has:attachment' },
            { label: 'No leídos', token: 'is:unread' },
            { label: 'Destacados', token: 'is:starred' },
            { label: 'De:', token: 'from:' },
            { label: 'Para:', token: 'to:' },
            { label: 'Asunto:', token: 'subject:' },
          ].map((chip) => {
            const isActive = searchQuery.toLowerCase().includes(chip.token.toLowerCase());
            return (
              <button
                key={chip.token}
                type="button"
                onClick={() => {
                  if (!searchQuery.toLowerCase().includes(chip.token.toLowerCase())) {
                    const next = searchQuery ? `${searchQuery.trim()} ${chip.token}` : chip.token;
                    onSearchChange(next);
                  }
                  const el = document.getElementById('email-search');
                  el?.focus();
                }}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors border cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">Cargando correspondencia...</span>
          </div>
        ) : emails.length === 0 ? (
          searchQuery ? (
            <div className={`flex flex-col items-center justify-center gap-2 text-center px-6 ${isExpanded ? 'h-96 py-20' : 'h-48'}`}>
              <div className="h-12 w-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-1 text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Sin resultados</p>
              <p className="text-xs text-muted-foreground">No encontramos correos que coincidan con &quot;{searchQuery}&quot;.</p>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="mt-2 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            /* Feature 19: Inbox Zero Celebrations */
            <div className={`flex flex-col items-center justify-center text-center px-6 animate-fadeIn ${isExpanded ? 'h-[450px] py-16' : 'h-72 py-6'}`}>
              <div className="relative mb-3">
                <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary/10 to-amber-500/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg animate-bounce">
                  <PartyPopper className="h-8 w-8 text-primary" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 animate-pulse" />
                <SunMedium className="absolute -bottom-1 -left-1 h-5 w-5 text-amber-500/80 animate-spin" style={{ animationDuration: '8s' }} />
              </div>

              <h3 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-1.5 justify-center">
                <span>¡Estás al día!</span>
                <span className="text-primary font-black">Inbox Zero</span>
              </h3>

              <p className="text-xs text-muted-foreground max-w-xs mt-1 leading-relaxed">
                Has procesado toda tu correspondencia en {folderLabel}. Disfruta de la tranquilidad o aprovecha los accesos rápidos:
              </p>

              {/* Quick action shortcuts */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={onSyncClick}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-medium transition-all shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                  <span>Sincronizar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('email-search');
                    el?.focus();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-medium transition-all shadow-2xs cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Buscar correo</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="divide-y divide-border/60">
            {emails.map((email, i) => {
              const isSelected = selectedEmailId === email._id;
              const isChecked = selectedIds.has(email._id);

              if (isExpanded) {
                return (
                  <div
                    key={email._id}
                    onClick={() => onSelectEmail(email)}
                    className={`group relative flex items-center gap-3 px-6 py-2.5 transition-colors cursor-pointer border-b border-border/40 animate-fadeIn ${
                      isSelected
                        ? 'bg-accent/70 text-accent-foreground'
                        : isChecked
                        ? 'bg-primary/5'
                        : !email.isRead
                        ? 'bg-background hover:bg-muted/50 text-foreground'
                        : 'bg-background/50 hover:bg-muted/50 text-muted-foreground'
                    }`}
                    style={{
                      animationDelay: `${Math.min(i * 15, 200)}ms`,
                    }}
                  >
                    {/* Unread indicator */}
                    {!email.isRead ? (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 -ml-1 mr-0.5" />
                    ) : (
                      <span className="h-2 w-2 shrink-0 -ml-1 mr-0.5" />
                    )}

                    {/* Select Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelectOne(email._id, e)}
                      className={`p-0.5 rounded transition-opacity cursor-pointer shrink-0 ${
                        isChecked || selectedIds.size > 0
                          ? 'opacity-100 text-primary'
                          : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    </button>

                    {/* Star */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateEmailStatus([email._id], { isStarred: !email.isStarred });
                      }}
                      className="cursor-pointer shrink-0 p-0.5"
                      title={email.isStarred ? 'Quitar destacado' : 'Destacar'}
                    >
                      <Star
                        className={`h-3.5 w-3.5 transition-colors ${
                          email.isStarred
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30 hover:text-amber-400'
                        }`}
                      />
                    </button>

                    {/* Sender */}
                    <div className="w-48 sm:w-56 shrink-0 truncate flex items-center gap-2">
                      <span
                        className={`text-xs truncate ${
                          !email.isRead
                            ? 'font-bold text-foreground'
                            : 'font-medium text-foreground/85'
                        }`}
                      >
                        {email.from.name || email.from.address}
                      </span>
                      {email.threadCount && email.threadCount > 1 && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {email.threadCount}
                        </span>
                      )}
                    </div>

                    {/* Subject + Snippet continuous line */}
                    <div className="flex-1 min-w-0 flex items-center text-xs truncate mr-4">
                      <span
                        className={`shrink-0 truncate max-w-[40%] ${
                          !email.isRead
                            ? 'font-semibold text-foreground'
                            : 'font-normal text-muted-foreground'
                        }`}
                      >
                        {email.subject || '(Sin asunto)'}
                      </span>
                      {email.body.text && (
                        <>
                          <span className="mx-2 text-muted-foreground/40 shrink-0 select-none">—</span>
                          <span className="truncate text-muted-foreground/70 font-normal">
                            {email.body.text}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Catch-All recipient address */}
                    {folderLabel === 'Catch-All' && email.to && email.to.length > 0 && (
                      <span className="hidden xl:inline-block text-[10px] text-primary/80 font-medium truncate max-w-[150px] shrink-0 mr-2">
                        Para: {email.to[0]}
                      </span>
                    )}

                    {/* Right side: attachments + date + hover quick actions */}
                    <div className="flex items-center gap-2 shrink-0 relative min-w-[90px] justify-end">
                      {email.attachments && email.attachments.length > 0 && (
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      )}

                      {/* Date */}
                      <span
                        className={`text-[11px] whitespace-nowrap transition-opacity ${
                          !email.isRead ? 'font-semibold text-primary' : 'text-muted-foreground/75'
                        } group-hover:opacity-0`}
                      >
                        {formatEmailDate(email.date)}
                      </span>

                      {/* Hover quick actions */}
                      <div className="absolute right-0 hidden group-hover:flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateEmailStatus([email._id], { isRead: !email.isRead });
                          }}
                          title={email.isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          {email.isRead ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateEmailStatus([email._id], { folder: 'trash' });
                          }}
                          title="Mover a papelera"
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={email._id}
                  onClick={() => onSelectEmail(email)}
                  className={`group relative flex items-start gap-2.5 px-3.5 py-3 transition-colors cursor-pointer animate-fadeIn ${
                    isSelected
                      ? 'bg-accent/70 text-accent-foreground border-l-3 border-primary'
                      : isChecked
                      ? 'bg-primary/5'
                      : 'hover:bg-muted/60 text-foreground'
                  }`}
                  style={{
                    animationDelay: `${Math.min(i * 20, 200)}ms`,
                  }}
                >
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelectOne(email._id, e)}
                    className={`mt-1 p-0.5 rounded transition-opacity cursor-pointer ${
                      isChecked || selectedIds.size > 0
                        ? 'opacity-100 text-primary'
                        : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isChecked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  </button>

                  <SenderAvatar name={email.from.name} address={email.from.address} />

                  <div className="flex-1 min-w-0 pr-1">
                    {/* Row 1: Sender + thread count + date + star */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <span
                          className={`text-xs truncate ${
                            email.isRead
                              ? 'font-medium text-muted-foreground'
                              : 'font-bold text-foreground'
                          }`}
                        >
                          {email.from.name || email.from.address}
                        </span>
                        {email.threadCount && email.threadCount > 1 && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {email.threadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateEmailStatus([email._id], { isStarred: !email.isStarred });
                          }}
                          className="cursor-pointer"
                          title={email.isStarred ? 'Quitar destacado' : 'Destacar'}
                        >
                          <Star
                            className={`h-3.5 w-3.5 transition-colors ${
                              email.isStarred
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[10px] whitespace-nowrap ${
                            email.isRead ? 'text-muted-foreground/70' : 'font-semibold text-primary'
                          }`}
                        >
                          {formatEmailDate(email.date)}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Subject */}
                    <p
                      className={`text-xs truncate mb-0.5 ${
                        email.isRead
                          ? 'font-normal text-muted-foreground'
                          : 'font-semibold text-foreground'
                      }`}
                    >
                      {email.subject || '(Sin asunto)'}
                    </p>

                    {/* Catch-All recipient address */}
                    {folderLabel === 'Catch-All' && email.to && email.to.length > 0 && (
                      <p className="text-[10px] text-primary/80 font-medium truncate mb-0.5">
                        Para: {email.to.join(', ')}
                      </p>
                    )}

                    {/* Row 3: Snippet */}
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-1">
                      {email.body.text || '(Sin contenido de texto)'}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!email.isRead && (
                    <div className="absolute top-4 right-3 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}

                  {/* Hover quick actions */}
                  <div className="absolute bottom-2 right-2 hidden group-hover:flex items-center gap-1 rounded-lg p-1 shadow-md bg-card border border-border">
                    <button
                      title={email.isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateEmailStatus([email._id], { isRead: !email.isRead });
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      {email.isRead ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      title="Mover a papelera"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateEmailStatus([email._id], { folder: 'trash' });
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {/* Sentinel for progressive infinite scroll */}
            {hasMore && (
              <div ref={sentinelRef} className="py-3 flex justify-center items-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span>Cargando más correos...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && emails.length > 0 && (
              <div className="py-3 text-center text-[11px] text-muted-foreground/50">
                Fin de la lista
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progressive scroll counter */}
      {totalCount > 0 && (
        <div className="shrink-0 px-3.5 py-2 border-t border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
          <span>{emails.length} de {totalCount} correos</span>
          {loadingMore && (
            <span className="flex items-center gap-1.5 text-primary font-medium text-[11px]">
              <span className="h-2.5 w-2.5 rounded-full border border-primary border-t-transparent animate-spin" />
              Cargando...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
