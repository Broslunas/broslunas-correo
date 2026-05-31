'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/sidebar';
import EmailList from '@/components/email-list';
import EmailReader from '@/components/email-reader';
import ComposeModal from '@/components/compose-modal';
import UserManagement from '@/components/user-management';
import TwoFactorModal from '@/components/two-factor-modal';

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  r2Url: string;
}

interface Email {
  _id: string;
  from: { name: string; address: string };
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  date: string;
  body: { text: string; html: string };
  attachments?: Attachment[];
  folder: string;
  isRead: boolean;
}

// Mobile view states: 'list' | 'reader'
type MobileView = 'list' | 'reader';

export default function Dashboard() {
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyData, setReplyData] = useState<{ to: string; subject: string; bodyHtml: string } | null>(null);
  const [user, setUser] = useState<{ email: string; name: string; picture: string; role: string; twoFactorEnabled: boolean; assignedAddresses: string[] } | null>(null);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Responsive: track which "panel" is visible on mobile/tablet
  const [mobileView, setMobileView] = useState<MobileView>('list');

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
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
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
        })
        .catch((error) => console.error('Error registering Service Worker:', error));
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

  const getFolderLabel = (folderId: string) => {
    switch (folderId) {
      case 'inbox': return 'Bandeja de entrada';
      case 'sent':  return 'Enviados';
      case 'spam':  return 'Spam';
      case 'trash': return 'Papelera';
      default: return 'Correos';
    }
  };

  const fetchEmails = useCallback(async () => {
    const cacheKey = `emails_cache_${currentFolder}_${searchQuery}`;
    setSyncing(true);
    try {
      const res = await fetch(`/api/emails?folder=${currentFolder}&search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        const freshEmails = data.emails || [];
        setEmails(freshEmails);
        localStorage.setItem(cacheKey, JSON.stringify(freshEmails));
        if (selectedEmail && !freshEmails.some((e: Email) => e._id === selectedEmail._id)) {
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setSyncing(false);
    }
  }, [currentFolder, searchQuery, selectedEmail]);

  // Fetch on folder/search change with stale-while-revalidate
  useEffect(() => {
    const cacheKey = `emails_cache_${currentFolder}_${searchQuery}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setEmails(parsed);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }
    } catch (err) {
      setLoading(true);
    }

    let isMounted = true;
    async function fetchFreshEmails() {
      setSyncing(true);
      try {
        const res = await fetch(`/api/emails?folder=${currentFolder}&search=${encodeURIComponent(searchQuery)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const freshEmails = data.emails || [];
          setEmails(freshEmails);
          localStorage.setItem(cacheKey, JSON.stringify(freshEmails));
          if (selectedEmail && !freshEmails.some((e: Email) => e._id === selectedEmail._id)) {
            setSelectedEmail(null);
          }
        }
      } catch (error) {
        console.error('Error fetching fresh emails:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setSyncing(false);
        }
      }
    }
    fetchFreshEmails();
    return () => { isMounted = false; };
  }, [currentFolder, searchQuery]);

  // Sync state changes to local cache
  useEffect(() => {
    const cacheKey = `emails_cache_${currentFolder}_${searchQuery}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(emails));
    } catch (err) {
      console.error('Error syncing emails state to cache:', err);
    }
  }, [emails, currentFolder, searchQuery]);

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setMobileView('reader'); // Switch to reader on mobile

    if (!email.isRead) {
      setEmails(prev => prev.map(e => e._id === email._id ? { ...e, isRead: true } : e));
      try {
        await fetch('/api/emails', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [email._id], isRead: true })
        });
      } catch (err) {
        console.error('Error marking email as read:', err);
      }
    }
  };

  const handleUpdateEmailStatus = async (ids: string[], updates: { folder?: string; isRead?: boolean }) => {
    try {
      const res = await fetch('/api/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, ...updates })
      });
      if (res.ok) {
        if (updates.folder !== undefined) {
          setEmails(prev => prev.filter(e => !ids.includes(e._id)));
          if (selectedEmail && ids.includes(selectedEmail._id)) {
            setSelectedEmail(null);
            setMobileView('list');
          }
        } else if (updates.isRead !== undefined) {
          setEmails(prev => prev.map(e => ids.includes(e._id) ? { ...e, isRead: updates.isRead! } : e));
          if (selectedEmail && ids.includes(selectedEmail._id)) {
            setSelectedEmail(prev => prev ? { ...prev, isRead: updates.isRead! } : null);
          }
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeletePermanent = async (ids: string[]) => {
    if (!confirm('¿Estás seguro de que quieres eliminar permanentemente estos correos? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch('/api/emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        setEmails(prev => prev.filter(e => !ids.includes(e._id)));
        if (selectedEmail && ids.includes(selectedEmail._id)) {
          setSelectedEmail(null);
          setMobileView('list');
        }
      }
    } catch (error) {
      console.error('Error permanently deleting emails:', error);
    }
  };

  const handleReplyClick = (email: Email) => {
    const cleanSubject = email.subject.toLowerCase().startsWith('re:') ? email.subject : `Re: ${email.subject}`;
    const quoteHtml = `<br><br><br><hr style="border:0;border-top:1px solid rgba(45,212,191,0.15);margin:20px 0;"><div style="color:#7d8ba3;font-size:11px;line-height:1.5;">El ${new Date(email.date).toLocaleString('es-ES')} &lt;${email.from.address}&gt; escribió:<br></div><blockquote style="margin:10px 0 0 10px;border-left:2px solid rgba(45,212,191,0.35);padding-left:15px;color:#8d99b3;">${email.body.html || email.body.text}</blockquote>`;
    setReplyData({ to: email.from.address, subject: cleanSubject, bodyHtml: quoteHtml });
    setComposeOpen(true);
  };

  const handleComposeClick = () => {
    setReplyData(null);
    setComposeOpen(true);
  };

  const handleFolderChange = (folder: string) => {
    setCurrentFolder(folder);
    setSelectedEmail(null);
    setMobileView('list'); // Always go back to list when changing folder
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: 'hsl(222 47% 4%)' }}
    >
      {/* Sidebar (desktop: fixed icon column | mobile: bottom nav rendered inside Sidebar) */}
      <Sidebar
        currentFolder={currentFolder}
        onFolderChange={handleFolderChange}
        onComposeClick={handleComposeClick}
        role={user?.role}
        twoFactorEnabled={user?.twoFactorEnabled}
        onSecurityClick={() => setTwoFactorModalOpen(true)}
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

        {/* Content: three-column on desktop, adaptive on mobile/tablet */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {currentFolder === 'admin' ? (
            <UserManagement />
          ) : (
            <>
              {/*
                RESPONSIVE LAYOUT STRATEGY:
                - Mobile (< lg): Show either email list OR email reader (never both).
                - Desktop (lg+): Show both side by side.
              */}

              {/* Email List Panel */}
              <div
                className={`
                  h-full flex-col overflow-hidden w-full
                  ${mobileView === 'list' ? 'flex' : 'hidden'}
                  lg:flex lg:w-80 lg:shrink-0
                `}
              >
                <EmailList
                  emails={emails}
                  selectedEmailId={selectedEmail?._id || null}
                  onSelectEmail={handleSelectEmail}
                  onUpdateEmailStatus={handleUpdateEmailStatus}
                  folderLabel={getFolderLabel(currentFolder)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  loading={loading}
                  syncing={syncing}
                  onSyncClick={fetchEmails}
                />
              </div>

              {/* Email Reader Panel */}
              <main
                className={`
                  h-full flex-col overflow-hidden flex-1 min-w-0
                  ${mobileView === 'reader' ? 'flex' : 'hidden'}
                  lg:flex
                `}
              >
                <EmailReader
                  email={selectedEmail}
                  onUpdateEmailStatus={handleUpdateEmailStatus}
                  onDeletePermanent={handleDeletePermanent}
                  onReplyClick={handleReplyClick}
                  onBack={() => {
                    setMobileView('list');
                    setSelectedEmail(null);
                  }}
                />
              </main>
            </>
          )}
        </div>

        {/* Bottom nav spacing on mobile (avoid content behind nav bar) */}
        <div className="lg:hidden h-16 shrink-0" />
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setReplyData(null);
          if (currentFolder === 'sent') fetchEmails();
        }}
        initialData={replyData}
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
