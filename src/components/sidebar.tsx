'use client';

import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Send,
  Trash2,
  AlertOctagon,
  PenSquare,
  Pencil,
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
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  Clock,
  Menu,
  Star,
  AtSign,
} from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

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

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    setIsCollapsed(saved === 'true');
    setIsHydrated(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('sidebar_collapsed', String(newValue));
      return newValue;
    });
  };

  const folders = [
    { id: 'inbox', label: 'Bandeja de entrada', icon: Inbox, group: 'core' },
    { id: 'starred', label: 'Destacados', icon: Star, group: 'core' },
    { id: 'unread', label: 'No leídos', icon: Mail, group: 'core' },
    { id: 'sent', label: 'Enviados', icon: Send, group: 'core' },
    { id: 'drafts', label: 'Borradores', icon: FileText, group: 'core' },

    { id: 'personal', label: 'Personal', icon: User, group: 'categories' },
    { id: 'work', label: 'Trabajo', icon: Briefcase, group: 'categories' },
    { id: 'commercial', label: 'Comercial', icon: Tag, group: 'categories' },
    { id: 'newsletter', label: 'Newsletters', icon: Newspaper, group: 'categories' },
    { id: 'social', label: 'Redes Sociales', icon: Users, group: 'categories' },
    ...(canViewAllAccounts
      ? [{ id: 'catchall', label: 'Catch-All', icon: AtSign, group: 'categories' }]
      : []),

    { id: 'spam', label: 'Spam', icon: AlertOctagon, group: 'system' },
    { id: 'trash', label: 'Papelera', icon: Trash2, group: 'system' },
    { id: 'tempmail', label: 'Buzón Temporal', icon: Clock, group: 'system' },
  ];

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
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

  const navItems = [
    ...folders,
    ...(role === 'admin'
      ? [{ id: 'admin', label: 'Administración', icon: ShieldCheck, group: 'admin' }]
      : []),
  ];

  const mobileCoreItems = folders.filter((f) => f.group === 'core');

  return (
    <>
      {/* ====== DESKTOP GMAIL-STYLE SIDEBAR ====== */}
      <aside
        className="hidden lg:flex flex-col h-full select-none shrink-0 transition-all duration-300 ease-in-out bg-background border-r border-border overflow-hidden"
        style={{
          width: isCollapsed ? '72px' : '256px',
        }}
      >
        {/* Header with Hamburger & Logo */}
        <div className={`flex items-center h-16 shrink-0 transition-all ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
          <button
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expandir panel lateral' : 'Contraer panel lateral'}
            title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden animate-fadeIn">
              <img
                src="/favicon.png"
                alt="Logo"
                className="h-6 w-6 object-contain shrink-0"
              />
              <span className="text-base font-bold text-foreground truncate tracking-tight">
                Broslunas Correo
              </span>
            </div>
          )}
        </div>

        {/* Compose Button (Gmail FAB Style) */}
        <div className={`py-2 shrink-0 flex items-center justify-center transition-all ${isCollapsed ? 'px-0' : 'px-3.5'}`}>
          <button
            id="btn-compose-desktop"
            onClick={onComposeClick}
            title={isCollapsed ? 'Redactar' : undefined}
            className={`group flex items-center transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-95 shrink-0 bg-[#c2e7ff] text-[#001d35] hover:brightness-95 dark:bg-[#c2e7ff] dark:text-[#001d35] dark:hover:brightness-105 font-sans ${
              isCollapsed
                ? 'h-12 w-12 justify-center rounded-2xl'
                : 'h-14 w-full px-5 justify-start gap-4 rounded-2xl'
            }`}
          >
            <Pencil className="h-5 w-5 shrink-0 text-[#001d35] transition-transform duration-200 group-hover:rotate-6" />
            {!isCollapsed && (
              <span className="text-sm font-semibold tracking-normal font-sans select-none animate-fadeIn">
                Redactar
              </span>
            )}
          </button>
        </div>

        {/* Navigation Items (Gmail Pill Style) */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto py-2 pr-2">
          {navItems.map((folder, index) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            const prevItem = index > 0 ? navItems[index - 1] : null;
            const showDivider = prevItem && prevItem.group !== folder.group;

            return (
              <React.Fragment key={folder.id}>
                {showDivider && (
                  <div className={`h-px my-2 bg-border shrink-0 ${isCollapsed ? 'w-8 mx-auto' : 'w-full'}`} />
                )}
                <div className="relative group shrink-0">
                  <button
                    onClick={() => {
                      if (folder.id === 'tempmail') {
                        window.location.href = '/tempmail';
                      } else {
                        onFolderChange(folder.id);
                      }
                    }}
                    className={`flex items-center gap-4 transition-all duration-150 cursor-pointer ${
                      isCollapsed
                        ? 'h-10 w-10 mx-auto justify-center rounded-full'
                        : 'h-10 w-full px-4 justify-start rounded-full'
                    } ${
                      isActive
                        ? 'bg-accent text-accent-foreground font-bold shadow-xs'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground font-medium'
                    }`}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="text-xs truncate tracking-normal animate-fadeIn">
                        {folder.label}
                      </span>
                    )}
                  </button>

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-lg">
                      {folder.label}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="flex flex-col gap-1.5 px-3 py-3 border-t border-border bg-background shrink-0">
          {/* Theme Toggle Button */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2'} h-10 rounded-full hover:bg-muted/70 transition-colors`}>
            {!isCollapsed && (
              <span className="text-xs font-medium text-muted-foreground animate-fadeIn">
                Tema
              </span>
            )}
            <ThemeToggle className="hover:bg-transparent" showLabel={false} />
          </div>

          {/* Security / 2FA status */}
          <div className="relative group shrink-0">
            <button
              onClick={onSecurityClick}
              title={isCollapsed ? (twoFactorEnabled ? '2FA Activo' : '2FA Inactivo') : undefined}
              className={`flex items-center gap-3 h-9 transition-colors cursor-pointer ${
                isCollapsed
                  ? 'w-9 mx-auto justify-center rounded-full'
                  : 'w-full px-3 justify-start rounded-full'
              } ${
                twoFactorEnabled
                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="text-xs font-semibold truncate animate-fadeIn">
                  {twoFactorEnabled ? '2FA Activo' : 'Configurar 2FA'}
                </span>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-lg">
                {twoFactorEnabled ? '2FA Activo' : 'Configurar 2FA'}
              </div>
            )}
          </div>

          {/* Settings Button */}
          <div className="relative group shrink-0">
            <button
              onClick={onSettingsClick}
              title={isCollapsed ? 'Configuración' : undefined}
              className={`flex items-center gap-3 h-9 transition-colors cursor-pointer ${
                isCollapsed
                  ? 'w-9 mx-auto justify-center rounded-full'
                  : 'w-full px-3 justify-start rounded-full'
              } ${
                currentFolder === 'settings'
                  ? 'bg-accent text-accent-foreground font-bold'
                  : 'text-foreground/80 hover:bg-muted hover:text-foreground'
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="text-xs font-semibold truncate animate-fadeIn">
                  Configuración
                </span>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-lg">
                Configuración
              </div>
            )}
          </div>

          {/* Push Notifications */}
          {isPushSupported && (
            <div className="relative group shrink-0">
              <button
                onClick={onTogglePush}
                title={isCollapsed ? (isPushSubscribed ? 'Notificaciones activas' : 'Activar notificaciones') : undefined}
                className={`flex items-center gap-3 h-9 transition-colors cursor-pointer ${
                  isCollapsed
                    ? 'w-9 mx-auto justify-center rounded-full'
                    : 'w-full px-3 justify-start rounded-full'
                } ${
                  isPushSubscribed
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {isPushSubscribed ? (
                  <Bell className="h-4 w-4 shrink-0" />
                ) : (
                  <BellOff className="h-4 w-4 shrink-0" />
                )}
                {!isCollapsed && (
                  <span className="text-xs font-semibold truncate animate-fadeIn">
                    {isPushSubscribed ? 'Alertas activas' : 'Activar alertas'}
                  </span>
                )}
              </button>
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-lg">
                  {isPushSubscribed ? 'Alertas activas' : 'Activar alertas'}
                </div>
              )}
            </div>
          )}

          {/* Logout Button */}
          <div className="relative group shrink-0">
            <button
              onClick={handleLogout}
              title={isCollapsed ? 'Cerrar sesión' : undefined}
              className={`flex items-center gap-3 h-9 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer ${
                isCollapsed
                  ? 'w-9 mx-auto justify-center rounded-full'
                  : 'w-full px-3 justify-start rounded-full'
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="text-xs font-semibold truncate animate-fadeIn">
                  Cerrar sesión
                </span>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 bg-foreground text-background shadow-lg">
                Cerrar sesión
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ====== MOBILE BOTTOM NAVIGATION (< lg) ====== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2 py-1.5 bg-background/95 border-t border-border backdrop-blur-md safe-area-pb">
        {mobileCoreItems.map((folder) => {
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
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors cursor-pointer min-w-[48px] ${
                isActive ? 'text-primary bg-accent/50 font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] leading-none">{folder.label.split(' ')[0]}</span>
            </button>
          );
        })}

        {/* Compose on mobile */}
        <button
          id="btn-compose-mobile"
          onClick={() => {
            setMobileMenuOpen(false);
            onComposeClick();
          }}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
        >
          <div className="h-9 w-9 flex items-center justify-center rounded-2xl bg-[#c2e7ff] text-[#001d35] shadow-md">
            <Pencil className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-semibold text-foreground">Redactar</span>
        </button>

        {/* More on mobile */}
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors cursor-pointer min-w-[48px] ${
            mobileMenuOpen ? 'text-primary bg-accent/50 font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] leading-none">Más</span>
        </button>
      </nav>

      {/* ====== MOBILE MORE DRAWER ====== */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full max-h-[80vh] overflow-y-auto bg-card border-t border-border rounded-t-3xl p-6 space-y-5 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Carpetas y Ajustes
              </h3>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Categorías Section */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Categorías</p>
              <div className="grid grid-cols-2 gap-2">
                {folders
                  .filter((f) => f.group === 'categories')
                  .map((folder) => {
                    const Icon = folder.icon;
                    const isActive = currentFolder === folder.id;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onFolderChange(folder.id);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer text-left text-xs font-semibold ${
                          isActive
                            ? 'bg-accent text-accent-foreground border-border'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{folder.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Sistema Section */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sistema</p>
              <div className="grid grid-cols-2 gap-2">
                {folders
                  .filter((f) => f.group === 'system')
                  .map((folder) => {
                    const Icon = folder.icon;
                    const isActive = currentFolder === folder.id;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (folder.id === 'tempmail') {
                            window.location.href = '/tempmail';
                          } else {
                            onFolderChange(folder.id);
                          }
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer text-left text-xs font-semibold ${
                          isActive
                            ? 'bg-accent text-accent-foreground border-border'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{folder.label}</span>
                      </button>
                    );
                  })}
                {role === 'admin' && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onFolderChange('admin');
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer text-left text-xs font-semibold ${
                      currentFolder === 'admin'
                        ? 'bg-accent text-accent-foreground border-border'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Administración</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ajustes y Sesión Section */}
            <div className="pt-3 border-t border-border space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSettingsClick?.();
                }}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  currentFolder === 'settings'
                    ? 'bg-accent text-accent-foreground'
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive py-2.5 text-xs font-bold transition-colors cursor-pointer"
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
