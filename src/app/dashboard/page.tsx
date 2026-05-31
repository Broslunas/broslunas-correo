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

  // Load user profile status on mount
  useEffect(() => {
    async function fetchUserStatus() {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          // Redirect to login if unauthorized or session expired
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Error fetching user status:', err);
      }
    }
    fetchUserStatus();
  }, []);

  // Folder labels lookup
  const getFolderLabel = (folderId: string) => {
    switch (folderId) {
      case 'inbox': return 'Bandeja de entrada';
      case 'sent': return 'Enviados';
      case 'spam': return 'Spam';
      case 'trash': return 'Papelera';
      default: return 'Correos';
    }
  };

  // Fetch emails from API
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emails?folder=${currentFolder}&search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        
        // Clear selection if the current selected email is no longer in the list
        if (selectedEmail && !data.emails.some((e: Email) => e._id === selectedEmail._id)) {
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, searchQuery, selectedEmail]);

  // Run fetch on mount, folder change, or search query change
  useEffect(() => {
    fetchEmails();
  }, [currentFolder, searchQuery]);

  // Handle email click / selection
  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);

    // If it's unread, mark it as read immediately in the DB and locally
    if (!email.isRead) {
      // Optimistic local update
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

  // Handle updating email folder or read status
  const handleUpdateEmailStatus = async (ids: string[], updates: { folder?: string; isRead?: boolean }) => {
    try {
      const res = await fetch('/api/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, ...updates })
      });

      if (res.ok) {
        // If we changed folders, remove from the current view list
        if (updates.folder !== undefined) {
          setEmails(prev => prev.filter(e => !ids.includes(e._id)));
          if (selectedEmail && ids.includes(selectedEmail._id)) {
            setSelectedEmail(null);
          }
        } else if (updates.isRead !== undefined) {
          // If we changed read status, update it in the list and selected view
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

  // Handle permanent delete (purge from db)
  const handleDeletePermanent = async (ids: string[]) => {
    if (!confirm('¿Estás seguro de que quieres eliminar permanentemente estos correos de la base de datos? Esta acción no se puede deshacer.')) {
      return;
    }

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
        }
      }
    } catch (error) {
      console.error('Error permanently deleting emails:', error);
    }
  };

  // Handle Reply trigger
  const handleReplyClick = (email: Email) => {
    const cleanSubject = email.subject.toLowerCase().startsWith('re:') ? email.subject : `Re: ${email.subject}`;
    
    // Create detailed email reply quote block
    const quoteHtml = `<br><br><br><hr style="border:0;border-top:1px solid #2d2d2d;margin:20px 0;"><div style="color:#a3a3a3;font-size:11px;line-height:1.5;">El ${new Date(email.date).toLocaleString('es-ES')} &lt;${email.from.address}&gt; escribió:<br></div><blockquote style="margin:10px 0 0 10px;border-left:2px solid #52525b;padding-left:15px;color:#d4d4d4;">${email.body.html || email.body.text}</blockquote>`;
    
    setReplyData({
      to: email.from.address,
      subject: cleanSubject,
      bodyHtml: quoteHtml
    });
    setComposeOpen(true);
  };

  // Handle Compose trigger
  const handleComposeClick = () => {
    setReplyData(null);
    setComposeOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      
      {/* Column 1: Navigation Sidebar */}
      <Sidebar 
        currentFolder={currentFolder} 
        onFolderChange={(folder) => {
          setCurrentFolder(folder);
          setSelectedEmail(null); // Clear selected mail on category change
        }}
        onComposeClick={handleComposeClick}
        role={user?.role}
        twoFactorEnabled={user?.twoFactorEnabled}
        onSecurityClick={() => setTwoFactorModalOpen(true)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {user && !user.twoFactorEnabled && (
          <div className="bg-amber-955/15 border-b border-amber-900/25 px-6 py-2.5 flex items-center justify-between text-amber-400 select-none animate-fadeIn shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span><strong>Recomendación de Seguridad:</strong> Tu cuenta no tiene activada la verificación de dos pasos (2FA). Protégela para evitar accesos no autorizados.</span>
            </div>
            <button 
              onClick={() => setTwoFactorModalOpen(true)}
              className="text-[9px] bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold px-2.5 py-1 rounded-md transition-all cursor-pointer tracking-wider uppercase"
            >
              Configurar 2FA
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {currentFolder === 'admin' ? (
            <UserManagement />
          ) : (
            <>
              {/* Column 2: Emails List Pane */}
              <EmailList
                emails={emails}
                selectedEmailId={selectedEmail?._id || null}
                onSelectEmail={handleSelectEmail}
                onUpdateEmailStatus={handleUpdateEmailStatus}
                folderLabel={getFolderLabel(currentFolder)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                loading={loading}
              />

              {/* Column 3: Detailed Email Content Reader */}
              <main className="flex-1 min-w-0 h-full">
                <EmailReader
                  email={selectedEmail}
                  onUpdateEmailStatus={handleUpdateEmailStatus}
                  onDeletePermanent={handleDeletePermanent}
                  onReplyClick={handleReplyClick}
                />
              </main>
            </>
          )}
        </div>
      </div>

      {/* Compose floating editor overlay */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setReplyData(null);
          // Re-fetch email list if the compose modal closes (to show new items in Sent)
          if (currentFolder === 'sent') {
            fetchEmails();
          }
        }}
        initialData={replyData}
        assignedAddresses={user?.assignedAddresses || []}
      />

      {/* 2FA Setup Modal */}
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
