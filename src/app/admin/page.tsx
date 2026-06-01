'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import UserManagement from '@/components/user-management';
import ComposeModal from '@/components/compose-modal';
import TwoFactorModal from '@/components/two-factor-modal';

export default function AdminPage() {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string; picture: string; role: string; twoFactorEnabled: boolean; assignedAddresses: string[] } | null>(null);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  // Helper to convert base64 VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Register SW and check status
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.ready.then((registration) => {
        return registration.pushManager.getSubscription().then(async (existingSub) => {
          setIsPushSubscribed(!!existingSub);
          if (Notification.permission === 'granted') {
            try {
              const keyRes = await fetch('/api/push/subscribe');
              if (keyRes.ok) {
                const { publicKey } = await keyRes.json();
                const subscription = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(publicKey)
                });
                await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscription, action: 'subscribe' })
                });
                setIsPushSubscribed(true);
              }
            } catch (syncErr) {
              console.error('Error syncing push subscription on mount:', syncErr);
            }
          }
        });
      }).catch((error) => console.error('Error waiting for Service Worker ready:', error));
    }
  }, []);

  const handleTogglePush = async () => {
    if (!isPushSupported) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: existingSub, action: 'unsubscribe' })
        });
        setIsPushSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Permiso de notificaciones denegado. Habilita las notificaciones en tu navegador.');
          return;
        }
        const keyRes = await fetch('/api/push/subscribe');
        if (!keyRes.ok) throw new Error('No se pudo recuperar la clave pública de notificaciones.');
        const { publicKey } = await keyRes.json();
        const newSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        const subRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSub, action: 'subscribe' })
        });
        if (subRes.ok) setIsPushSubscribed(true);
        else throw new Error('Error al registrar la suscripción en el servidor.');
      }
    } catch (err: any) {
      console.error('Error toggling push notifications:', err);
      alert(`Error al configurar notificaciones: ${err.message || err}`);
    }
  };

  // Load user profile
  useEffect(() => {
    try {
      const cachedUser = localStorage.getItem('user_profile_cache');
      if (cachedUser) setUser(JSON.parse(cachedUser));
    } catch (err) {
      console.error('Error reading user profile cache:', err);
    }

    async function fetchUserStatus() {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem('user_profile_cache', JSON.stringify(data));
          // Redirect if not an admin
          if (data.role !== 'admin') {
            window.location.href = '/mail?inbox=main';
          }
        } else {
          localStorage.removeItem('user_profile_cache');
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Error fetching user status:', err);
      }
    }
    fetchUserStatus();
  }, []);

  const handleComposeClick = () => {
    setComposeOpen(true);
  };

  const handleFolderChange = (folder: string) => {
    if (folder === 'admin') {
      // Already on admin page
    } else {
      const paramVal = folder === 'inbox' ? 'main' : folder;
      router.push(`/mail?inbox=${paramVal}`);
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: 'hsl(222 47% 4%)' }}
    >
      {/* Sidebar */}
      <Sidebar
        currentFolder="admin"
        onFolderChange={handleFolderChange}
        onComposeClick={handleComposeClick}
        role={user?.role}
        twoFactorEnabled={user?.twoFactorEnabled}
        onSecurityClick={() => setTwoFactorModalOpen(true)}
        onSettingsClick={() => router.push('/settings')}
        isPushSupported={isPushSupported}
        isPushSubscribed={isPushSubscribed}
        onTogglePush={handleTogglePush}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* 2FA warning banner */}
        {user && !user.twoFactorEnabled && (
          <div
            className="shrink-0 flex items-center justify-between px-4 md:px-6 py-2.5 animate-fadeIn"
            style={{
              background: 'rgba(245,158,11,0.06)',
              borderBottom: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(38 92% 65%)' }}>
              <span
                className="flex h-1.5 w-1.5 rounded-full animate-pulse shrink-0"
                style={{ background: 'hsl(38 92% 60%)' }}
              />
              <span>
                <strong>Seguridad:</strong> La verificación en dos pasos (2FA) no está activada. Protege tu cuenta.
              </span>
            </div>
            <button
              onClick={() => setTwoFactorModalOpen(true)}
              className="shrink-0 text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer ml-3"
              style={{
                background: 'hsl(38 92% 55%)',
                color: 'hsl(222 47% 4%)',
              }}
            >
              Activar 2FA
            </button>
          </div>
        )}

        {/* Administration workspace */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <UserManagement />
        </div>

        {/* Bottom nav spacing on mobile */}
        <div className="lg:hidden h-16 shrink-0" />
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        initialData={null}
        assignedAddresses={user?.assignedAddresses || []}
      />

      {/* 2FA Modal */}
      <TwoFactorModal
        isOpen={twoFactorModalOpen}
        onClose={() => setTwoFactorModalOpen(false)}
        onStatusChange={(enabled) => {
          setUser(prev => prev ? { ...prev, twoFactorEnabled: enabled } : null);
        }}
      />
    </div>
  );
}
