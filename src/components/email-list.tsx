import React, { useState } from 'react';
import { Search, Mail, Eye, EyeOff, Trash2, ShieldAlert, RefreshCw } from 'lucide-react';

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
  onSyncClick
}: EmailListProps) {
  
  // Format dates elegantly
  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (isNaN(date.getTime())) return '';

    // Same day: Show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    // Same year: Show Day and Month name
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    // Different year: Show complete numeric date
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: '2-digit' });
  };

  return (
    <div className="w-80 bg-neutral-900 border-r border-border flex flex-col h-full shrink-0">
      
      {/* Header and Folder Title */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{folderLabel}</h2>
          <div className="flex items-center gap-2">
            {syncing && (
              <span className="flex items-center gap-1 text-[8px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full select-none tracking-wider animate-pulse">
                <span className="h-1 w-1 rounded-full bg-primary animate-ping" />
                Sincronizando
              </span>
            )}
            <button
              onClick={onSyncClick}
              disabled={syncing}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Sincronizar ahora"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en correos..."
            className="w-full rounded-lg border border-border bg-neutral-950 py-1.5 pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Cargando correspondencia...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full gap-2">
            <Mail className="h-8 w-8 text-muted-foreground/30" />
            <span className="text-xs font-medium">Bandeja vacía</span>
            <span className="text-[10px] text-muted-foreground/60">No se encontraron correos aquí.</span>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {emails.map((email) => {
              const isSelected = selectedEmailId === email._id;
              return (
                <div
                  key={email._id}
                  onClick={() => onSelectEmail(email)}
                  className={`group relative p-4 flex flex-col gap-1 transition-all duration-150 cursor-pointer ${
                    isSelected 
                      ? 'bg-neutral-800/80 border-l-2 border-primary pl-3.5' 
                      : 'hover:bg-neutral-800/40'
                  }`}
                >
                  
                  {/* Sender and Date row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs truncate ${!email.isRead ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {email.from.name || email.from.address}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatEmailDate(email.date)}
                    </span>
                  </div>

                  {/* Subject */}
                  <h3 className={`text-xs truncate ${!email.isRead ? 'font-bold text-foreground' : 'text-neutral-300'}`}>
                    {email.subject}
                  </h3>

                  {/* Body Snippet */}
                  <p className="text-[11px] text-muted-foreground line-clamp-2 pr-6">
                    {email.body.text || '(Sin contenido de texto)'}
                  </p>

                  {/* Status Indicator Dot */}
                  {!email.isRead && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />
                  )}

                  {/* Quick Action Overlay (shows on hover) */}
                  <div className="absolute bottom-2 right-2 hidden group-hover:flex items-center gap-1.5 bg-neutral-900 border border-border p-1 rounded-md shadow-lg transition-all duration-200">
                    <button
                      title={email.isRead ? "Marcar como no leído" : "Marcar como leído"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateEmailStatus([email._id], { isRead: !email.isRead });
                      }}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
                    >
                      {email.isRead ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      title="Mover a papelera"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateEmailStatus([email._id], { folder: 'trash' });
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
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
