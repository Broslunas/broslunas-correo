'use client';

import React, { useState } from 'react';
import { Search, Mail, Eye, EyeOff, Trash2, RefreshCw, Bell, BellOff, ChevronDown, Globe } from 'lucide-react';

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
}

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (email: Email) => void;
  onUpdateEmailStatus: (ids: string[], updates: { folder?: string; isRead?: boolean }) => void;
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
}

function SenderAvatar({ name, address }: { name: string; address: string }) {
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
  const idx = (name || address).charCodeAt(0) % colors.length;
  const [from, to] = colors[idx];

  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none text-white shadow-xs"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {letter}
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
}: EmailListProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex flex-col h-full shrink-0 w-full md:w-80 lg:w-[320px] bg-card border-r border-border">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 space-y-2.5 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
            {folderLabel}
          </h2>
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

        {/* Account Selector */}
        {availableAccounts && availableAccounts.length > 0 && (
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
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            id="email-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en el correo..."
            className="w-full rounded-full py-2 pl-9 pr-4 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
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
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-1 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Bandeja vacía</p>
            <p className="text-xs text-muted-foreground">No se encontraron correos aquí.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {emails.map((email, i) => {
              const isSelected = selectedEmailId === email._id;
              return (
                <div
                  key={email._id}
                  onClick={() => onSelectEmail(email)}
                  className={`group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer animate-fadeIn ${
                    isSelected
                      ? 'bg-accent/70 text-accent-foreground border-l-3 border-primary'
                      : 'hover:bg-muted/60 text-foreground'
                  }`}
                  style={{
                    animationDelay: `${Math.min(i * 20, 200)}ms`,
                  }}
                >
                  <SenderAvatar name={email.from.name} address={email.from.address} />

                  <div className="flex-1 min-w-0 pr-1">
                    {/* Row 1: Sender + date */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-xs truncate ${
                          email.isRead
                            ? 'font-medium text-muted-foreground'
                            : 'font-bold text-foreground'
                        }`}
                      >
                        {email.from.name || email.from.address}
                      </span>
                      <span
                        className={`text-[10px] whitespace-nowrap shrink-0 ${
                          email.isRead ? 'text-muted-foreground/70' : 'font-semibold text-primary'
                        }`}
                      >
                        {formatEmailDate(email.date)}
                      </span>
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
          </div>
        )}
      </div>
    </div>
  );
}
