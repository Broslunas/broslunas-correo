'use client';

import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentFolder: string;
  onFolderChange: (folder: string) => void;
  onComposeClick: () => void;
  role?: string;
  twoFactorEnabled?: boolean;
  onSecurityClick?: () => void;
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  onTogglePush: () => void;
}

export default function Sidebar({
  currentFolder,
  onFolderChange,
  onComposeClick,
  role,
  twoFactorEnabled,
  onSecurityClick,
  isPushSupported,
  isPushSubscribed,
  onTogglePush,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved === 'true';
    }
    return true; // Default to collapsed (icon-only)
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('sidebar_collapsed', String(newValue));
      return newValue;
    });
  };

  const folders = [
    { id: 'inbox', label: 'Bandeja de entrada', icon: Inbox, group: 'core' },
    { id: 'unread', label: 'No leídos', icon: Mail, group: 'core' },
    { id: 'sent',  label: 'Enviados',           icon: Send, group: 'core' },
    
    { id: 'personal', label: 'Personal', icon: User, group: 'categories' },
    { id: 'work', label: 'Trabajo', icon: Briefcase, group: 'categories' },
    { id: 'commercial', label: 'Comercial', icon: Tag, group: 'categories' },
    { id: 'newsletter', label: 'Newsletters', icon: Newspaper, group: 'categories' },
    { id: 'social', label: 'Redes Sociales', icon: Users, group: 'categories' },
    
    { id: 'spam',  label: 'Spam',               icon: AlertOctagon, group: 'system' },
    { id: 'trash', label: 'Papelera',           icon: Trash2, group: 'system' },
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
    ...(role === 'admin' ? [{ id: 'admin', label: 'Administración', icon: ShieldCheck, group: 'admin' }] : []),
  ];

  const mobileCoreItems = folders.filter(f => f.group === 'core');

  return (
    <>
      {/* ====== DESKTOP SIDEBAR ====== */}
      <aside
        className="hidden lg:flex flex-col h-full select-none shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          width: isCollapsed ? '68px' : '220px',
          background: 'rgba(255,255,255,0.02)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start px-5'} h-16 shrink-0 gap-3`}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(34,211,238,0.08))',
              border: '1px solid rgba(45,212,191,0.25)',
              boxShadow: '0 0 16px rgba(45,212,191,0.12)',
            }}
          >
            <img
              src="/favicon.png"
              alt="Broslunas Correo"
              className="h-5 w-5 object-contain"
              style={{ filter: 'drop-shadow(0 0 4px rgba(45,212,191,0.4))' }}
            />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-bold text-foreground truncate tracking-wide animate-fadeIn">
              Broslunas Correo
            </span>
          )}
        </div>

        {/* Compose button */}
        <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} px-3.5 pb-3`}>
          <button
            id="btn-compose-desktop"
            onClick={onComposeClick}
            title={isCollapsed ? "Redactar correo" : undefined}
            className={`group flex h-10 ${isCollapsed ? 'w-10 justify-center' : 'w-full px-4 justify-start'} items-center gap-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0`}
            style={{
              background: 'linear-gradient(135deg, hsl(174 72% 52%), hsl(192 85% 58%))',
              boxShadow: '0 4px 16px rgba(45,212,191,0.25)',
            }}
          >
            <PenSquare className="h-4.5 w-4.5 shrink-0" style={{ color: 'hsl(222 47% 4%)' }} />
            {!isCollapsed && (
              <span className="text-xs font-bold text-[hsl(222_47%_4%)] tracking-wide animate-fadeIn">
                Redactar
              </span>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className={`flex-1 flex flex-col ${isCollapsed ? 'items-center' : 'items-stretch'} gap-1.5 px-3 overflow-y-auto py-2`}>
          {navItems.map((folder, index) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            const prevItem = index > 0 ? navItems[index - 1] : null;
            const showDivider = prevItem && prevItem.group !== folder.group;

            return (
              <React.Fragment key={folder.id}>
                {showDivider && (
                  <div className={`h-px my-1.5 bg-neutral-800/80 shrink-0 ${isCollapsed ? 'w-6 mx-auto' : 'w-full'}`} />
                )}
                <div className="relative group shrink-0">
                  <button
                    onClick={() => onFolderChange(folder.id)}
                    className={`flex h-10 ${isCollapsed ? 'w-10 justify-center' : 'w-full px-3.5 justify-start'} items-center gap-3 rounded-xl transition-all duration-150 cursor-pointer`}
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(34,211,238,0.08))'
                        : 'transparent',
                      border: isActive ? '1px solid rgba(45,212,191,0.25)' : '1px solid transparent',
                      boxShadow: isActive ? '0 0 12px rgba(45,212,191,0.1)' : 'none',
                    }}
                  >
                    <Icon
                      className="h-4.5 w-4.5 transition-colors shrink-0"
                      style={{ color: isActive ? 'hsl(174 72% 60%)' : 'hsl(215 20% 50%)' }}
                    />
                    {!isCollapsed && (
                      <span className="text-xs font-semibold truncate animate-fadeIn" style={{ color: isActive ? 'hsl(174 72% 60%)' : 'hsl(210 40% 75%)' }}>
                        {folder.label}
                      </span>
                    )}
                  </button>
                  {/* Tooltip (only when collapsed) */}
                  {isCollapsed && (
                    <div
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                      style={{
                        background: 'rgba(10,15,30,0.95)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'hsl(210 40% 90%)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                      }}
                    >
                      {folder.label}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className={`flex flex-col ${isCollapsed ? 'items-center' : 'items-stretch'} gap-2 px-3 pb-4 shrink-0`}>
          
          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            className={`flex h-9 ${isCollapsed ? 'w-9 justify-center' : 'w-full px-3 justify-start'} items-center gap-3 rounded-xl transition-all cursor-pointer hover:bg-neutral-800/40 border border-transparent shrink-0`}
            style={{
              background: 'rgba(255,255,255,0.01)',
              borderColor: 'rgba(255,255,255,0.04)',
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4.5 w-4.5 text-teal-400 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4.5 w-4.5 text-teal-400 shrink-0" />
                <span className="text-xs font-semibold text-teal-400 animate-fadeIn whitespace-nowrap">
                  Colapsar menú
                </span>
              </>
            )}
          </button>

          {/* Security indicator */}
          <button
            onClick={onSecurityClick}
            title={isCollapsed ? (twoFactorEnabled ? '2FA Activo' : '2FA Inactivo — Configurar') : undefined}
            className={`flex h-9 ${isCollapsed ? 'w-9 justify-center' : 'w-full px-3 justify-start'} items-center gap-3 rounded-xl transition-all cursor-pointer shrink-0`}
            style={{
              background: twoFactorEnabled
                ? 'rgba(16,185,129,0.1)'
                : 'rgba(245,158,11,0.1)',
              border: twoFactorEnabled
                ? '1px solid rgba(16,185,129,0.2)'
                : '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <ShieldAlert
              className="h-4 w-4 shrink-0"
              style={{ color: twoFactorEnabled ? 'hsl(152 69% 55%)' : 'hsl(38 92% 55%)' }}
            />
            {!isCollapsed && (
              <span className="text-xs font-semibold truncate animate-fadeIn" style={{ color: twoFactorEnabled ? 'hsl(152 69% 55%)' : 'hsl(38 92% 55%)' }}>
                {twoFactorEnabled ? '2FA Activo' : 'Configurar 2FA'}
              </span>
            )}
          </button>

          {/* Push notifications */}
          {isPushSupported && (
            <button
              onClick={onTogglePush}
              title={isCollapsed ? (isPushSubscribed ? 'Notificaciones activas' : 'Activar notificaciones') : undefined}
              className={`flex h-9 ${isCollapsed ? 'w-9 justify-center' : 'w-full px-3 justify-start'} items-center gap-3 rounded-xl transition-all cursor-pointer shrink-0`}
              style={{
                background: isPushSubscribed ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.03)',
                border: isPushSubscribed ? '1px solid rgba(45,212,191,0.2)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {isPushSubscribed
                ? <Bell className="h-4 w-4 shrink-0" style={{ color: 'hsl(174 72% 55%)' }} />
                : <BellOff className="h-4 w-4 shrink-0" style={{ color: 'hsl(215 20% 45%)' }} />
              }
              {!isCollapsed && (
                <span className="text-xs font-semibold truncate animate-fadeIn" style={{ color: isPushSubscribed ? 'hsl(174 72% 55%)' : 'hsl(215 20% 45%)' }}>
                  {isPushSubscribed ? 'Alertas: Activas' : 'Activar Alertas'}
                </span>
              )}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Cerrar sesión" : undefined}
            className={`flex h-9 ${isCollapsed ? 'w-9 justify-center' : 'w-full px-3 justify-start'} items-center gap-3 rounded-xl transition-all cursor-pointer hover:bg-red-500/10 shrink-0`}
            style={{ border: '1px solid transparent' }}
          >
            <LogOut className="h-4 w-4 shrink-0 transition-colors" style={{ color: 'hsl(215 20% 45%)' }} />
            {!isCollapsed && (
              <span className="text-xs font-semibold truncate animate-fadeIn" style={{ color: 'hsl(215 20% 45%)' }}>
                Cerrar sesión
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ====== MOBILE BOTTOM NAVIGATION (< lg) ====== */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2 py-1.5 safe-area-pb"
        style={{
          background: 'rgba(6,11,24,0.92)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
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
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer min-w-[48px]"
              style={{
                background: isActive ? 'rgba(45,212,191,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
              }}
            >
              <Icon
                className="h-5 w-5 transition-colors"
                style={{ color: isActive ? 'hsl(174 72% 60%)' : 'hsl(215 20% 50%)' }}
              />
              <span
                className="text-[9px] font-semibold leading-none"
                style={{ color: isActive ? 'hsl(174 72% 60%)' : 'hsl(215 20% 45%)' }}
              >
                {folder.label.split(' ')[0]}
              </span>
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
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer"
        >
          <div
            className="h-8 w-8 flex items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, hsl(174 72% 52%), hsl(192 85% 58%))',
              boxShadow: '0 0 12px rgba(45,212,191,0.3)',
            }}
          >
            <PenSquare className="h-4 w-4" style={{ color: 'hsl(222 47% 4%)' }} />
          </div>
          <span className="text-[9px] font-semibold animate-pulse" style={{ color: 'hsl(174 72% 60%)' }}>
            Redactar
          </span>
        </button>

        {/* More on mobile */}
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer min-w-[48px]"
          style={{
            background: mobileMenuOpen ? 'rgba(45,212,191,0.1)' : 'transparent',
            border: mobileMenuOpen ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
          }}
        >
          <MoreHorizontal
            className="h-5 w-5 transition-colors"
            style={{ color: mobileMenuOpen ? 'hsl(174 72% 60%)' : 'hsl(215 20% 50%)' }}
          />
          <span
            className="text-[9px] font-semibold leading-none"
            style={{ color: mobileMenuOpen ? 'hsl(174 72% 60%)' : 'hsl(215 20% 45%)' }}
          >
            Categorías
          </span>
        </button>
      </nav>

      {/* ====== MOBILE MORE DRAWER ====== */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full max-h-[78vh] overflow-y-auto bg-neutral-950 border-t border-neutral-800 rounded-t-3xl p-6 space-y-6 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(to top, hsl(222 47% 3%), hsl(222 47% 6%))',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 select-none">
                Categorías y Carpetas
              </h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-900 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Categorías Section */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-teal-400/70 uppercase tracking-widest">Categorías</p>
              <div className="grid grid-cols-2 gap-2">
                {folders.filter(f => f.group === 'categories').map(folder => {
                  const Icon = folder.icon;
                  const isActive = currentFolder === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onFolderChange(folder.id);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left text-xs font-semibold"
                      style={{
                        background: isActive ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.02)',
                        borderColor: isActive ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? 'hsl(174 72% 60%)' : 'hsl(210 40% 80%)'
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{folder.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sistema Section */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-teal-400/70 uppercase tracking-widest">Sistema</p>
              <div className="grid grid-cols-2 gap-2">
                {folders.filter(f => f.group === 'system').map(folder => {
                  const Icon = folder.icon;
                  const isActive = currentFolder === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onFolderChange(folder.id);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left text-xs font-semibold"
                      style={{
                        background: isActive ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.02)',
                        borderColor: isActive ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? 'hsl(174 72% 60%)' : 'hsl(210 40% 80%)'
                      }}
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
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left text-xs font-semibold"
                    style={{
                      background: currentFolder === 'admin' ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.02)',
                      borderColor: currentFolder === 'admin' ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.05)',
                      color: currentFolder === 'admin' ? 'hsl(174 72% 60%)' : 'hsl(210 40% 80%)'
                    }}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Administración</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ajustes y Sesión Section */}
            <div className="pt-4 border-t border-neutral-900/80 space-y-3 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSecurityClick?.();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 text-xs font-bold py-2.5 transition-all text-amber-500 cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4" />
                  2FA {twoFactorEnabled ? 'Activo ✓' : 'Configurar'}
                </button>
                {isPushSupported && (
                  <button
                    onClick={onTogglePush}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 text-xs font-bold py-2.5 transition-all cursor-pointer"
                    style={{ color: isPushSubscribed ? 'hsl(174 72% 55%)' : 'hsl(215 20% 50%)' }}
                  >
                    {isPushSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    Notificaciones
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-950/20 hover:bg-red-950/30 border border-red-900/20 text-red-400 py-2.5 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
            
            {/* Safe area padding */}
            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
}
