'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Send,
  Trash2,
  AlertOctagon,
  PenSquare,
  LogOut,
  ShieldCheck,
  Bell,
  BellOff,
  ShieldAlert,
  Mail,
  User,
  Briefcase,
  Tag,
  Newspaper,
  Users,
  MoreHorizontal,
  X,
  FileText,
  Settings,
  Star,
  AtSign,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  Shield,
  Sparkles,
  Contact,
} from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import { formatBytes } from '@/lib/utils';
import { showConfirm } from '@/lib/modal';

interface SidebarProps {
  currentFolder: string;
  onFolderChange: (folder: string) => void;
  onComposeClick: () => void;
  role?: string;
  canViewAllAccounts?: boolean;
  twoFactorEnabled?: boolean;
  onSecurityClick?: () => void;
  onSettingsClick?: () => void;
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  onTogglePush: () => void;
}

interface NavFolder {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'core' | 'categories' | 'system' | 'admin';
  accentColor?: string;
}

export default function Sidebar({
  currentFolder,
  onFolderChange,
  onComposeClick,
  role,
  canViewAllAccounts,
  twoFactorEnabled,
  onSecurityClick,
  onSettingsClick,
  isPushSupported,
  isPushSubscribed,
  onTogglePush,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [systemExpanded, setSystemExpanded] = useState(true);
  const [storage, setStorage] = useState<{
    usedBytes: number;
    limitBytes: number;
    percent: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/user/storage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.usedBytes === 'number') {
          setStorage({
            usedBytes: data.usedBytes,
            limitBytes: data.limitBytes,
            percent: data.percent,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    setIsCollapsed(saved === 'true');
    const savedCat = localStorage.getItem('sidebar_categories_expanded');
    if (savedCat !== null) setCategoriesExpanded(savedCat === 'true');
    const savedSys = localStorage.getItem('sidebar_system_expanded');
    if (savedSys !== null) setSystemExpanded(savedSys === 'true');
    setIsHydrated(true);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  const toggleCategories = () => {
    setCategoriesExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_categories_expanded', String(next));
      return next;
    });
  };

  const toggleSystem = () => {
    setSystemExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_system_expanded', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B for collapse & custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleCollapse();
      }
    };
    const handleCustomToggle = () => toggleCollapse();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-sidebar', handleCustomToggle);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-sidebar', handleCustomToggle);
    };
  }, [toggleCollapse]);

  const coreFolders: NavFolder[] = [
    { id: 'inbox', label: 'Bandeja de entrada', icon: Inbox, group: 'core' },
    { id: 'starred', label: 'Destacados', icon: Star, group: 'core' },
    { id: 'unread', label: 'No leídos', icon: Mail, group: 'core' },
    { id: 'sent', label: 'Enviados', icon: Send, group: 'core' },
    { id: 'drafts', label: 'Borradores', icon: FileText, group: 'core' },
    { id: 'contacts', label: 'Contactos', icon: Contact, group: 'core' },
  ];

  const categoryFolders: NavFolder[] = [
    { id: 'personal', label: 'Personal', icon: User, group: 'categories', accentColor: 'bg-emerald-500' },
    { id: 'work', label: 'Trabajo', icon: Briefcase, group: 'categories', accentColor: 'bg-blue-500' },
    { id: 'commercial', label: 'Comercial', icon: Tag, group: 'categories', accentColor: 'bg-amber-500' },
    { id: 'newsletter', label: 'Newsletters', icon: Newspaper, group: 'categories', accentColor: 'bg-purple-500' },
    { id: 'social', label: 'Redes Sociales', icon: Users, group: 'categories', accentColor: 'bg-pink-500' },
    ...(canViewAllAccounts
      ? [{ id: 'catchall', label: 'Catch-All', icon: AtSign, group: 'categories' as const, accentColor: 'bg-cyan-500' }]
      : []),
  ];

  const systemFolders: NavFolder[] = [
    { id: 'spam', label: 'Spam', icon: AlertOctagon, group: 'system', accentColor: 'bg-orange-500' },
    { id: 'trash', label: 'Papelera', icon: Trash2, group: 'system', accentColor: 'bg-rose-500' },
    ...(role === 'admin'
      ? [{ id: 'admin', label: 'Administración', icon: ShieldCheck, group: 'admin' as const, accentColor: 'bg-indigo-500' }]
      : []),
  ];

  const allFolders = [...coreFolders, ...categoryFolders, ...systemFolders];

  const handleLogout = async () => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas cerrar la sesión?', {
      title: 'Cerrar sesión',
      confirmText: 'Cerrar sesión',
      destructive: true,
    });
    if (confirmed) {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' }),
        });
        if (res.ok) {
          localStorage.clear();
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  const renderNavItem = (folder: NavFolder) => {
    const Icon = folder.icon;
    const isActive = currentFolder === folder.id;

    return (
      <div key={folder.id} className="relative group shrink-0">
        <button
          onClick={() => onFolderChange(folder.id)}
          aria-label={folder.label}
          className={`relative flex items-center transition-all duration-150 cursor-pointer select-none ${
            isCollapsed
              ? 'h-9 w-9 mx-auto justify-center rounded-xl'
              : 'h-9 w-full px-3 justify-start gap-2.5 rounded-xl'
          } ${
            isActive
              ? 'bg-blue-500/10 text-blue-600 dark:bg-white/[0.08] dark:text-white font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
          }`}
        >
          {/* Icon or category dot */}
          <div className="relative flex items-center justify-center shrink-0">
            <Icon
              className={`h-4 w-4 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-sky-400'
                  : 'text-muted-foreground group-hover:text-foreground'
              }`}
            />
            {folder.accentColor && !isCollapsed && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${folder.accentColor}`}
              />
            )}
          </div>

          {/* Label */}
          {!isCollapsed && (
            <span className="text-xs truncate tracking-tight flex-1 text-left">
              {folder.label}
            </span>
          )}

          {/* Active status indicator dot */}
          {isActive && !isCollapsed && (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-sky-400 shrink-0" />
          )}
        </button>

        {/* Collapsed Tooltip */}
        {isCollapsed && (
          <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md border border-border/30">
            {folder.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ====== DESKTOP SIDEBAR ====== */}
      <aside
        className={`hidden lg:flex flex-col h-full select-none shrink-0 transition-all duration-300 ease-in-out bg-card/60 dark:bg-card/25 backdrop-blur-md border-r border-border/60 overflow-hidden relative ${
          isCollapsed ? 'w-[68px]' : 'w-[256px]'
        }`}
      >
        {/* Header with App Brand & Collapse Toggle */}
        <div
          className={`h-14 shrink-0 flex items-center border-b border-border/40 transition-all duration-200 ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
          }`}
        >
          {isCollapsed ? (
            <button
              onClick={toggleCollapse}
              aria-label="Expandir barra lateral"
              title="Expandir (Ctrl+B)"
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 cursor-pointer"
            >
              <img
                src="/favicon.png"
                alt="Logo"
                className="h-5 w-5 object-contain transition-transform duration-200 group-hover:scale-110"
              />
              <div className="absolute left-full ml-2.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md">
                Expandir (Ctrl+B)
              </div>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden animate-fadeIn">
                <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center p-1 shadow-xs shrink-0">
                  <img
                    src="/favicon.png"
                    alt="Logo"
                    className="h-5 w-5 object-contain"
                  />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs font-bold text-foreground tracking-tight truncate flex items-center gap-1.5">
                    Broslunas Correo
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 truncate">
                    Webmail Seguro
                  </span>
                </div>
              </div>

              <button
                onClick={toggleCollapse}
                aria-label="Contraer barra lateral"
                title="Contraer (Ctrl+B)"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Compose CTA Button */}
        <div
          className={`py-3 shrink-0 flex items-center justify-center transition-all ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
        >
          <button
            id="btn-compose-desktop"
            onClick={onComposeClick}
            aria-label="Redactar nuevo correo"
            className={`group relative flex items-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] shrink-0 bg-blue-600 hover:bg-blue-500 text-white dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white ${
              isCollapsed
                ? 'h-10 w-10 justify-center rounded-xl'
                : 'h-10 w-full px-3.5 justify-between rounded-xl'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <PenSquare className="h-4 w-4 shrink-0 text-white transition-transform duration-200 group-hover:rotate-6" />
              {!isCollapsed && (
                <span className="text-xs font-semibold tracking-tight text-white truncate animate-fadeIn">
                  Redactar
                </span>
              )}
            </div>
            {!isCollapsed && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/20 text-white border border-white/10">
                C
              </kbd>
            )}

            {isCollapsed && (
              <div className="absolute left-full ml-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md">
                Redactar correo
              </div>
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 flex flex-col gap-3 px-2.5 overflow-y-auto no-scrollbar py-1">
          {/* Core Folders */}
          <div className="flex flex-col gap-0.5">
            {coreFolders.map(renderNavItem)}
          </div>

          {/* Categories Section */}
          <div className="flex flex-col gap-0.5 pt-1 border-t border-border/40">
            {!isCollapsed ? (
              <div
                onClick={toggleCategories}
                className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <span>Categorías</span>
                <span className="p-0.5">
                  {categoriesExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </div>
            ) : (
              <div className="h-px w-6 mx-auto my-1 bg-border/60" />
            )}

            {(categoriesExpanded || isCollapsed) && (
              <div className="flex flex-col gap-0.5 animate-fadeIn">
                {categoryFolders.map(renderNavItem)}
              </div>
            )}
          </div>

          {/* System Folders */}
          <div className="flex flex-col gap-0.5 pt-1 border-t border-border/40">
            {!isCollapsed ? (
              <div
                onClick={toggleSystem}
                className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <span>Sistema</span>
                <span className="p-0.5">
                  {systemExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </div>
            ) : (
              <div className="h-px w-6 mx-auto my-1 bg-border/60" />
            )}

            {(systemExpanded || isCollapsed) && (
              <div className="flex flex-col gap-0.5 animate-fadeIn">
                {systemFolders.map(renderNavItem)}
              </div>
            )}
          </div>
        </nav>

        {/* Unified Bottom Footer */}
        <div className="border-t border-border/50 bg-background/50 dark:bg-card/40 p-2 flex flex-col gap-2 shrink-0">
          {/* Storage Micro-Card */}
          {storage && (
            <div className="relative group shrink-0">
              {isCollapsed ? (
                <div className="flex justify-center">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                      storage.percent > 90
                        ? 'text-destructive bg-destructive/15'
                        : storage.percent > 75
                        ? 'text-amber-500 bg-amber-500/15'
                        : 'text-primary bg-primary/10'
                    }`}
                  >
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md border border-border/30">
                    <div className="font-bold">{storage.percent}% de almacenamiento</div>
                    <div className="text-[10px] opacity-80">
                      {formatBytes(storage.usedBytes)} de {formatBytes(storage.limitBytes)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-card/60 border border-border/50 hover:border-border transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-medium mb-1.5">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <HardDrive className="h-3 w-3 text-muted-foreground" />
                      Almacenamiento
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        storage.percent > 90
                          ? 'text-destructive'
                          : storage.percent > 75
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {storage.percent}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        storage.percent > 90
                          ? 'bg-destructive'
                          : storage.percent > 75
                          ? 'bg-amber-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.max(3, storage.percent)}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-muted-foreground/80 mt-1 truncate">
                    {formatBytes(storage.usedBytes)} de {formatBytes(storage.limitBytes)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2FA Status Pill (Expanded Only) */}
          {!isCollapsed && onSecurityClick && (
            <button
              onClick={onSecurityClick}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                twoFactorEnabled
                  ? 'bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-semibold truncate">
                  {twoFactorEnabled ? '2FA Activo' : 'Activar 2FA'}
                </span>
              </div>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  twoFactorEnabled ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
            </button>
          )}

          {/* Utility Quick Action Toolbar */}
          <div
            className={`flex items-center ${
              isCollapsed ? 'flex-col gap-1.5' : 'justify-between px-0.5'
            }`}
          >
            {/* Theme Toggle */}
            <div className="relative group">
              <ThemeToggle className="h-8 w-8 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" />
              {isCollapsed && (
                <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md">
                  Cambiar tema
                </div>
              )}
            </div>

            {/* Push Notifications Toggle */}
            {isPushSupported && (
              <div className="relative group">
                <button
                  onClick={onTogglePush}
                  aria-label={isPushSubscribed ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isPushSubscribed
                      ? 'text-primary bg-primary/10 hover:bg-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {isPushSubscribed ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </button>
                <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md">
                  {isPushSubscribed ? 'Alertas activas' : 'Activar alertas'}
                </div>
              </div>
            )}

            {/* 2FA Icon Button in Collapsed Mode */}
            {isCollapsed && onSecurityClick && (
              <div className="relative group">
                <button
                  onClick={onSecurityClick}
                  aria-label={twoFactorEnabled ? '2FA Activo' : 'Configurar 2FA'}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    twoFactorEnabled
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                </button>
                <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md">
                  {twoFactorEnabled ? '2FA Activo' : 'Configurar 2FA'}
                </div>
              </div>
            )}

            {/* Settings Button */}
            <div className="relative group">
              <button
                onClick={onSettingsClick}
                aria-label="Configuración"
                className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'settings'
                    ? 'bg-blue-500/10 text-blue-600 dark:bg-white/[0.08] dark:text-white font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-md">
                Configuración
              </div>
            </div>

            {/* Logout Button */}
            <div className="relative group">
              <button
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-destructive text-destructive-foreground shadow-md">
                Cerrar sesión
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ====== MOBILE BOTTOM NAV (< lg) ====== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2 py-2 bg-background/90 backdrop-blur-xl border-t border-border/60 safe-area-pb">
        {coreFolders.slice(0, 4).map((folder) => {
          const Icon = folder.icon;
          const isActive = currentFolder === folder.id;
          return (
            <button
              key={folder.id}
              id={`btn-nav-${folder.id}`}
              onClick={() => {
                setMobileMenuOpen(false);
                onFolderChange(folder.id);
              }}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer min-w-[48px] ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-primary/15 text-primary' : ''
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[10px] leading-none">
                {folder.label.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Compose Button Mobile */}
        <button
          id="btn-compose-mobile"
          onClick={() => {
            setMobileMenuOpen(false);
            onComposeClick();
          }}
          className="flex flex-col items-center gap-1 px-2.5 py-1 transition-transform active:scale-95 cursor-pointer"
        >
          <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <PenSquare className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-foreground leading-none">
            Redactar
          </span>
        </button>

        {/* More Options Drawer Button */}
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer min-w-[48px] ${
            mobileMenuOpen
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              mobileMenuOpen ? 'bg-primary/15 text-primary' : ''
            }`}
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] leading-none">Más</span>
        </button>
      </nav>

      {/* ====== MOBILE DRAWER MODAL ====== */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto bg-card border-t border-border rounded-t-3xl p-5 space-y-4 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <img src="/favicon.png" alt="Logo" className="h-5 w-5 object-contain" />
                <h3 className="text-sm font-bold text-foreground">
                  Carpetas y Ajustes
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <ThemeToggle className="h-8 w-8 p-1.5" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Storage in Drawer */}
            {storage && (
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center justify-between text-xs font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    Almacenamiento
                  </span>
                  <span className="text-muted-foreground font-bold">{storage.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      storage.percent > 90
                        ? 'bg-destructive'
                        : storage.percent > 75
                        ? 'bg-amber-500'
                        : 'bg-primary'
                    }`}
                    style={{ width: `${Math.max(3, storage.percent)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {formatBytes(storage.usedBytes)} de {formatBytes(storage.limitBytes)}
                </div>
              </div>
            )}

            {/* Acceso Rápido */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                Gestión
              </p>
              <div className="grid grid-cols-2 gap-2">
                {coreFolders.slice(4).map((folder) => {
                  const Icon = folder.icon;
                  const isActive = currentFolder === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onFolderChange(folder.id);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer text-left text-xs font-semibold ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-white/[0.08] dark:text-white border-blue-500/30 dark:border-white/15'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{folder.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorías */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                Categorías
              </p>
              <div className="grid grid-cols-2 gap-2">
                {categoryFolders.map((folder) => {
                  const Icon = folder.icon;
                  const isActive = currentFolder === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onFolderChange(folder.id);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer text-left text-xs font-semibold ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-white/[0.08] dark:text-white border-blue-500/30 dark:border-white/15'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{folder.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sistema */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                Sistema
              </p>
              <div className="grid grid-cols-2 gap-2">
                {systemFolders.map((folder) => {
                  const Icon = folder.icon;
                  const isActive = currentFolder === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onFolderChange(folder.id);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer text-left text-xs font-semibold ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-white/[0.08] dark:text-white border-blue-500/30 dark:border-white/15'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{folder.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seguridad, Ajustes y Sesión */}
            <div className="pt-2 border-t border-border space-y-2">
              {onSecurityClick && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSecurityClick();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    twoFactorEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>{twoFactorEnabled ? '2FA Activo' : 'Activar Verificación 2FA'}</span>
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      twoFactorEnabled ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                </button>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSettingsClick?.();
                }}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  currentFolder === 'settings'
                    ? 'bg-blue-500/10 text-blue-600 dark:bg-white/[0.08] dark:text-white border-blue-500/30 dark:border-white/15'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                <Settings className="h-4 w-4" />
                Configuración
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive py-2.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>

            <div className="h-4" />
          </div>
        </div>
      )}
    </>
  );
}
