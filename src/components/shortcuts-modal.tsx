'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Keyboard, Settings, RotateCcw } from 'lucide-react';
import {
  getAllShortcuts,
  CATEGORY_LABELS,
  ShortcutCategory,
  formatKeyBadge,
  ShortcutDefinition
} from '@/lib/shortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShortcuts(getAllShortcuts());
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setShortcuts(getAllShortcuts());
    };
    window.addEventListener('shortcuts-updated', handleUpdate);
    return () => window.removeEventListener('shortcuts-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const categories: ShortcutCategory[] = ['general', 'navigation', 'actions', 'reading', 'composing'];

  const filteredShortcuts = shortcuts.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    (s.userKey || s.defaultKey).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Atajos de Teclado</h2>
              <p className="text-xs text-muted-foreground">Navega y gestiona tus correos a la máxima velocidad</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings?page=shortcuts"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-primary" />
              Personalizar
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border bg-background/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar atajo, acción o tecla..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {categories.map((cat) => {
            const catItems = filteredShortcuts.filter((s) => s.category === cat);
            if (catItems.length === 0) return null;

            return (
              <div key={cat} className="space-y-2.5">
                <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider px-1">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {catItems.map((item) => {
                    const keys = formatKeyBadge(item.userKey || item.defaultKey);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {keys.map((k, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-[10px] text-muted-foreground">luego</span>}
                              <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold bg-background border border-border rounded-md text-primary shadow-2xs">
                                {k}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No se encontraron atajos con "{search}".</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Pulsa <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] text-foreground font-mono">?</kbd> para abrir esta ayuda en cualquier momento</span>
          <span>Pulsa <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] text-foreground font-mono">Esc</kbd> para cerrar</span>
        </div>
      </div>
    </div>
  );
}
