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
  // Generate a consistent color from the sender name
  const colors = [
    ['#2dd4bf', '#0f766e'],
    ['#22d3ee', '#0e7490'],
    ['#34d399', '#059669'],
    ['#60a5fa', '#1d4ed8'],
    ['#a78bfa', '#6d28d9'],
    ['#f472b6', '#be185d'],
    ['#fb923c', '#c2410c'],
  ];
  const idx = (name || address).charCodeAt(0) % colors.length;
  const [from, to] = colors[idx];

  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: '#fff',
        boxShadow: `0 2px 8px ${from}33`,
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
    <div
      className="flex flex-col h-full shrink-0 w-full md:w-80 lg:w-[320px]"
      style={{
        background: 'rgba(255,255,255,0.018)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-4 pt-4 pb-3 space-y-3 relative"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-bold uppercase tracking-widest animate-fadeIn"
            style={{ color: 'hsl(var(--primary))' }}
          >
            {folderLabel}
          </h2>
          <div className="flex items-center gap-2">
            {syncing && (
              <span
                className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: 'hsl(var(--primary) / 0.1)',
                  border: '1px solid hsl(var(--primary) / 0.2)',
                  color: 'hsl(var(--primary))',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                Sync
              </span>
            )}
            {isPushSupported && onTogglePush && (
              <button
                onClick={onTogglePush}
                title={isPushSubscribed ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer lg:hidden"
                style={{
                  background: isPushSubscribed ? 'hsl(var(--primary) / 0.1)' : 'rgba(255,255,255,0.04)',
                  border: isPushSubscribed ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid rgba(255,255,255,0.07)',
                  color: isPushSubscribed ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
              >
                {isPushSubscribed ? (
                  <Bell className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary))' }} />
                ) : (
                  <BellOff className="h-3.5 w-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                )}
              </button>
            )}
            <button
              onClick={onSyncClick}
              disabled={syncing}
              title="Sincronizar"
              className="h-7 w-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-40 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'hsl(215 20% 55%)',
              }}
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
              className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer select-none"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: dropdownOpen ? 'hsl(var(--primary) / 0.25)' : 'rgba(255,255,255,0.07)',
                color: 'hsl(210 40% 90%)',
              }}
            >
              <div className="flex items-center gap-2 truncate">
                <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {selectedAccount ? availableAccounts.find(a => a.email === selectedAccount)?.name || selectedAccount : 'Todas las cuentas'}
                </span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ml-1 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                {/* Click outside backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div
                  className="absolute left-0 right-0 mt-1.5 rounded-xl border p-1 shadow-2xl z-20 max-h-60 overflow-y-auto animate-fadeIn"
                  style={{
                    background: 'rgba(10,15,30,0.98)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.7)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onAccountChange('');
                      setDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      background: !selectedAccount ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                      color: !selectedAccount ? 'hsl(var(--primary))' : 'hsl(210 40% 80%)',
                    }}
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
                        className="flex flex-col w-full px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer mt-0.5"
                        style={{
                          background: isSelected ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                          color: isSelected ? 'hsl(var(--primary))' : 'hsl(210 40% 80%)',
                        }}
                      >
                        <span className="text-xs font-semibold truncate">{acc.name || acc.email}</span>
                        {acc.name && <span className="text-[9px] opacity-60 truncate mt-0.5">{acc.email}</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
            style={{ color: 'hsl(215 20% 45%)' }}
          />
          <input
            id="email-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar correos..."
            className="w-full rounded-xl py-2 pl-9 pr-4 text-xs transition-all outline-none placeholder:text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'hsl(210 40% 90%)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.35)';
              e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div
              className="h-6 w-6 rounded-full border-2 animate-spin"
              style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }}
            />
            <span className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>
              Cargando correspondencia...
            </span>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-6">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-1"
              style={{
                background: 'hsl(var(--primary) / 0.06)',
                border: '1px solid hsl(var(--primary) / 0.12)',
              }}
            >
              <Mail className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(210 40% 75%)' }}>
              Bandeja vacía
            </p>
            <p className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>
              No se encontraron correos aquí.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {emails.map((email, i) => {
              const isSelected = selectedEmailId === email._id;
              return (
                <div
                  key={email._id}
                  onClick={() => onSelectEmail(email)}
                  className="group relative flex items-start gap-3 px-4 py-3.5 transition-all duration-150 cursor-pointer animate-fadeInUp"
                  style={{
                    animationDelay: `${Math.min(i * 30, 300)}ms`,
                    background: isSelected
                      ? 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.04))'
                      : 'transparent',
                    borderLeft: isSelected
                      ? '2px solid hsl(var(--primary))'
                      : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <SenderAvatar name={email.from.name} address={email.from.address} />

                  <div className="flex-1 min-w-0 pr-1">
                    {/* Row 1: Sender + date */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className="text-xs truncate"
                        style={{
                          fontWeight: email.isRead ? 500 : 700,
                          color: email.isRead ? 'hsl(210 40% 75%)' : 'hsl(210 40% 96%)',
                        }}
                      >
                        {email.from.name || email.from.address}
                      </span>
                      <span
                        className="text-[10px] whitespace-nowrap shrink-0"
                        style={{ color: 'hsl(215 20% 45%)' }}
                      >
                        {formatEmailDate(email.date)}
                      </span>
                    </div>

                    {/* Row 2: Subject */}
                    <p
                      className="text-xs truncate mb-0.5"
                      style={{
                        fontWeight: email.isRead ? 400 : 600,
                        color: email.isRead ? 'hsl(210 40% 65%)' : 'hsl(210 40% 90%)',
                      }}
                    >
                      {email.subject}
                    </p>

                    {/* Row 3: Snippet */}
                    <p
                      className="text-[11px] line-clamp-1"
                      style={{ color: 'hsl(215 20% 42%)' }}
                    >
                      {email.body.text || '(Sin contenido de texto)'}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!email.isRead && (
                    <div
                      className="absolute top-4 right-3 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        background: 'hsl(var(--primary))',
                        boxShadow: '0 0 6px hsl(var(--primary) / 0.6)',
                      }}
                    />
                  )}

                  {/* Hover quick actions */}
                  <div
                    className="absolute bottom-2 right-2 hidden group-hover:flex items-center gap-1 rounded-lg p-1 shadow-lg"
                    style={{
                      background: 'rgba(6,11,24,0.95)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <button
                      title={email.isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateEmailStatus([email._id], { isRead: !email.isRead });
                      }}
                      className="p-1.5 rounded-md transition-colors cursor-pointer"
                      style={{ color: 'hsl(215 20% 55%)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--primary))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(215 20% 55%)'; }}
                    >
                      {email.isRead ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      title="Mover a papelera"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateEmailStatus([email._id], { folder: 'trash' });
                      }}
                      className="p-1.5 rounded-md transition-colors cursor-pointer"
                      style={{ color: 'hsl(215 20% 55%)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(0 78% 60%)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(215 20% 55%)'; }}
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
