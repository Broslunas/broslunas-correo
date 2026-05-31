import React from 'react';
import { Search, Mail, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';

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
}: EmailListProps) {
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
        className="shrink-0 px-4 pt-4 pb-3 space-y-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'hsl(174 72% 60%)' }}
          >
            {folderLabel}
          </h2>
          <div className="flex items-center gap-2">
            {syncing && (
              <span
                className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(45,212,191,0.1)',
                  border: '1px solid rgba(45,212,191,0.2)',
                  color: 'hsl(174 72% 60%)',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                Sync
              </span>
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
              e.currentTarget.style.borderColor = 'rgba(45,212,191,0.35)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,212,191,0.08)';
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
              style={{ borderColor: 'hsl(174 72% 52%)', borderTopColor: 'transparent' }}
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
                background: 'rgba(45,212,191,0.06)',
                border: '1px solid rgba(45,212,191,0.12)',
              }}
            >
              <Mail className="h-6 w-6" style={{ color: 'hsl(174 72% 45%)' }} />
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
                      ? 'linear-gradient(135deg, rgba(45,212,191,0.08), rgba(34,211,238,0.04))'
                      : 'transparent',
                    borderLeft: isSelected
                      ? '2px solid hsl(174 72% 52%)'
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
                        background: 'hsl(174 72% 52%)',
                        boxShadow: '0 0 6px rgba(45,212,191,0.6)',
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
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(174 72% 60%)'; }}
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
