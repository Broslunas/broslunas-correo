import React from 'react';
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
  const folders = [
    { id: 'inbox', label: 'Bandeja de entrada', icon: Inbox },
    { id: 'sent',  label: 'Enviados',           icon: Send },
    { id: 'spam',  label: 'Spam',               icon: AlertOctagon },
    { id: 'trash', label: 'Papelera',           icon: Trash2 },
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
    ...(role === 'admin' ? [{ id: 'admin', label: 'Administración', icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* ====== DESKTOP SIDEBAR (icon-only, lg+) ====== */}
      <aside
        className="hidden lg:flex flex-col h-full select-none shrink-0"
        style={{
          width: '68px',
          background: 'rgba(255,255,255,0.02)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 shrink-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all"
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
        </div>

        {/* Compose button */}
        <div className="flex justify-center px-3 pb-3">
          <button
            id="btn-compose-desktop"
            onClick={onComposeClick}
            title="Redactar correo"
            className="group flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, hsl(174 72% 52%), hsl(192 85% 58%))',
              boxShadow: '0 4px 16px rgba(45,212,191,0.25)',
            }}
          >
            <PenSquare className="h-4.5 w-4.5" style={{ color: 'hsl(222 47% 4%)' }} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center gap-1 px-2.5">
          {navItems.map((folder) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            return (
              <div key={folder.id} className="relative group">
                <button
                  onClick={() => onFolderChange(folder.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(34,211,238,0.08))'
                      : 'transparent',
                    border: isActive ? '1px solid rgba(45,212,191,0.25)' : '1px solid transparent',
                    boxShadow: isActive ? '0 0 12px rgba(45,212,191,0.1)' : 'none',
                  }}
                >
                  <Icon
                    className="h-4.5 w-4.5 transition-colors"
                    style={{ color: isActive ? 'hsl(174 72% 60%)' : 'hsl(215 20% 50%)' }}
                  />
                </button>
                {/* Tooltip */}
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
              </div>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="flex flex-col items-center gap-2 px-2.5 pb-4">
          {/* Security indicator */}
          <div className="relative group">
            <button
              onClick={onSecurityClick}
              title={twoFactorEnabled ? '2FA Activo' : '2FA Inactivo — Configurar'}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer"
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
                className="h-4 w-4"
                style={{ color: twoFactorEnabled ? 'hsl(152 69% 55%)' : 'hsl(38 92% 55%)' }}
              />
            </button>
            <div
              className="absolute left-full ml-3 bottom-0 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{
                background: 'rgba(10,15,30,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'hsl(210 40% 90%)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              {twoFactorEnabled ? '2FA Activo ✓' : '2FA Inactivo — Configurar'}
            </div>
          </div>

          {/* Push notifications */}
          {isPushSupported && (
            <div className="relative group">
              <button
                onClick={onTogglePush}
                title={isPushSubscribed ? 'Notificaciones activas' : 'Activar notificaciones'}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer"
                style={{
                  background: isPushSubscribed ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.03)',
                  border: isPushSubscribed ? '1px solid rgba(45,212,191,0.2)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {isPushSubscribed
                  ? <Bell className="h-4 w-4" style={{ color: 'hsl(174 72% 55%)' }} />
                  : <BellOff className="h-4 w-4" style={{ color: 'hsl(215 20% 45%)' }} />
                }
              </button>
              <div
                className="absolute left-full ml-3 bottom-0 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                style={{
                  background: 'rgba(10,15,30,0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'hsl(210 40% 90%)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
                {isPushSubscribed ? 'Notificaciones activas' : 'Activar notificaciones'}
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="relative group">
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer hover:bg-red-500/10"
              style={{ border: '1px solid transparent' }}
            >
              <LogOut className="h-4 w-4 transition-colors" style={{ color: 'hsl(215 20% 45%)' }} />
            </button>
            <div
              className="absolute left-full ml-3 bottom-0 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{
                background: 'rgba(10,15,30,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'hsl(210 40% 90%)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              Cerrar sesión
            </div>
          </div>
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
        {navItems.map((folder) => {
          const Icon = folder.icon;
          const isActive = currentFolder === folder.id;
          return (
            <button
              key={folder.id}
              id={`btn-nav-${folder.id}`}
              onClick={() => onFolderChange(folder.id)}
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
          onClick={onComposeClick}
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
          <span className="text-[9px] font-semibold" style={{ color: 'hsl(174 72% 60%)' }}>
            Redactar
          </span>
        </button>

        {/* Logout on mobile */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="h-5 w-5" style={{ color: 'hsl(215 20% 45%)' }} />
          <span className="text-[9px] font-semibold" style={{ color: 'hsl(215 20% 40%)' }}>Salir</span>
        </button>
      </nav>
    </>
  );
}
