import React from 'react';
import { 
  Inbox, 
  Send, 
  Trash2, 
  AlertOctagon, 
  PenSquare, 
  LogOut,
  Mail,
  ShieldCheck,
  Bell,
  BellOff
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
  onTogglePush
}: SidebarProps) {
  const folders = [
    { id: 'inbox', label: 'Bandeja de entrada', icon: Inbox },
    { id: 'sent', label: 'Enviados', icon: Send },
    { id: 'spam', label: 'Spam', icon: AlertOctagon },
    { id: 'trash', label: 'Papelera', icon: Trash2 },
  ];

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
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

  return (
    <aside className="w-64 bg-neutral-950 border-r border-border flex flex-col h-full select-none">
      
      {/* App brand */}
      <div className="h-14 border-b border-border flex items-center px-6 gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-border">
          <img src="/favicon.png" alt="Broslunas Correo" className="h-5 w-5 object-contain pointer-events-none" />
        </div>
        <div>
          <span className="font-semibold text-sm tracking-wide text-foreground">Broslunas Correo</span>
          <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full ml-2 font-medium">
            v1.0
          </span>
        </div>
      </div>

      {/* Write button */}
      <div className="p-4">
        <button
          onClick={onComposeClick}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground py-2 text-sm font-semibold shadow-md shadow-primary/15 transition-all duration-200 cursor-pointer"
        >
          <PenSquare className="h-4.5 w-4.5" />
          Redactar correo
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = currentFolder === folder.id;

          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-secondary text-primary font-medium border-l-2 border-primary pl-2.5'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="flex-1 text-left">{folder.label}</span>
            </button>
          );
        })}

        {role === 'admin' && (
          <button
            onClick={() => onFolderChange('admin')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              currentFolder === 'admin'
                ? 'bg-secondary text-primary font-medium border-l-2 border-primary pl-2.5'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ShieldCheck className={`h-4.5 w-4.5 ${currentFolder === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="flex-1 text-left">Administración</span>
          </button>
        )}
      </nav>

      {/* Footer system details & Logout */}
      <div className="p-4 border-t border-border flex flex-col gap-3">
        <button
          onClick={onSecurityClick}
          className={`flex items-center gap-2.5 text-[10px] p-2 rounded-md border w-full transition-all text-left cursor-pointer hover:bg-neutral-900/40 ${
            twoFactorEnabled 
              ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
              : 'bg-amber-950/20 border-amber-900/30 text-amber-400 animate-pulse'
          }`}
        >
          <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${twoFactorEnabled ? 'text-emerald-500' : 'text-amber-500'}`} />
          <div className="truncate flex-1">
            <p className="font-semibold">{twoFactorEnabled ? '2FA Activo' : '2FA Inactivo'}</p>
            <p className="text-[8px] opacity-75">{twoFactorEnabled ? 'Tu cuenta está segura' : 'Configurar (Recomendado)'}</p>
          </div>
        </button>

        {isPushSupported && (
          <button
            onClick={onTogglePush}
            className={`flex items-center gap-2.5 text-[10px] p-2 rounded-md border w-full transition-all text-left cursor-pointer hover:bg-neutral-900/40 ${
              isPushSubscribed
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-neutral-900/40 border-border text-muted-foreground'
            }`}
          >
            {isPushSubscribed ? (
              <Bell className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <div className="truncate flex-1">
              <p className="font-semibold">{isPushSubscribed ? 'Notificaciones Activas' : 'Notificaciones Desactivadas'}</p>
              <p className="text-[8px] opacity-75">
                {isPushSubscribed ? 'Alertas push configuradas' : 'Activar notificaciones'}
              </p>
            </div>
          </button>
        )}

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-neutral-900/60 p-2 rounded-md border border-border/50">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <div className="truncate">
            <p className="font-semibold text-foreground">Conexión Segura</p>
            <p className="text-[9px]">Serverless Edge Stack</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 py-1.5 rounded-lg border border-transparent hover:border-destructive/20 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>

    </aside>
  );
}
