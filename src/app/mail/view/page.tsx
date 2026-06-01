'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EmailReader from '@/components/email-reader';

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  r2Url: string;
  contentId?: string | null;
  disposition?: string | null;
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
  messageId?: string;
  inReplyTo?: string;
  references?: string;
}

function StandaloneViewContent() {
  const searchParams = useSearchParams();
  const emailId = searchParams.get('id');
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; name: string; picture: string; role: string; twoFactorEnabled: boolean; assignedAddresses: string[] } | null>(null);

  // Authenticate user status
  useEffect(() => {
    async function fetchUserStatus() {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Error fetching user status:', err);
      }
    }
    fetchUserStatus();
  }, []);

  // Fetch the specific email
  useEffect(() => {
    if (!emailId) return;

    async function fetchEmailDetails() {
      setLoading(true);
      try {
        const res = await fetch(`/api/emails?id=${emailId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.email) {
            setEmail(data.email);
            
            // Mark as read if it is unread
            if (!data.email.isRead) {
              fetch('/api/emails', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [data.email._id], isRead: true })
              }).catch(err => console.error('Error marking email as read:', err));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching email details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEmailDetails();
  }, [emailId]);

  const handleUpdateEmailStatus = async (ids: string[], updates: { folder?: string; isRead?: boolean }) => {
    try {
      const res = await fetch('/api/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, ...updates })
      });
      if (res.ok) {
        if (updates.folder !== undefined) {
          // If moved to folder (e.g. trash or archive), close the window or update local state
          window.close();
        } else if (updates.isRead !== undefined) {
          setEmail(prev => prev ? { ...prev, isRead: updates.isRead! } : null);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeletePermanent = async (ids: string[]) => {
    if (!confirm('¿Estás seguro de que quieres eliminar permanentemente este correo? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch('/api/emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        window.close();
      }
    } catch (error) {
      console.error('Error permanently deleting email:', error);
    }
  };

  const handleReplyClick = (email: Email) => {
    const subjectText = email.subject || '';
    const hasRePrefix = /^re:\s*/i.test(subjectText);
    const cleanSubject = hasRePrefix ? subjectText : `Re: ${subjectText}`;
    const quoteHtml = `<br><br><br><hr style="border:0;border-top:1px solid rgba(45,212,191,0.15);margin:20px 0;"><div style="color:#7d8ba3;font-size:11px;line-height:1.5;">El ${new Date(email.date).toLocaleString('es-ES')} &lt;${email.from.address}&gt; escribió:<br></div><blockquote style="margin:10px 0 0 10px;border-left:2px solid rgba(45,212,191,0.35);padding-left:15px;color:#8d99b3;">${email.body.html || email.body.text}</blockquote>`;
    
    const composeState = {
      to: email.from.address,
      subject: cleanSubject,
      bodyHtml: quoteHtml,
    };
    
    localStorage.setItem('popout_compose_state', JSON.stringify(composeState));
    const width = 850;
    const height = 750;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      '/compose', 
      'PopoutCompose', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  const handleReplyAllClick = (email: Email) => {
    const subjectText = email.subject || '';
    const hasRePrefix = /^re:\s*/i.test(subjectText);
    const cleanSubject = hasRePrefix ? subjectText : `Re: ${subjectText}`;
    const quoteHtml = `<br><br><br><hr style="border:0;border-top:1px solid rgba(45,212,191,0.15);margin:20px 0;"><div style="color:#7d8ba3;font-size:11px;line-height:1.5;">El ${new Date(email.date).toLocaleString('es-ES')} &lt;${email.from.address}&gt; escribió:<br></div><blockquote style="margin:10px 0 0 10px;border-left:2px solid rgba(45,212,191,0.35);padding-left:15px;color:#8d99b3;">${email.body.html || email.body.text}</blockquote>`;
    
    const currentUserEmail = user?.email?.toLowerCase() || '';
    const recipients = new Set<string>();
    email.to.forEach(addr => {
      const lower = addr.toLowerCase();
      if (lower !== currentUserEmail && lower !== email.from.address.toLowerCase()) {
        recipients.add(addr);
      }
    });
    if (email.cc) {
      email.cc.forEach(addr => {
        const lower = addr.toLowerCase();
        if (lower !== currentUserEmail && lower !== email.from.address.toLowerCase()) {
          recipients.add(addr);
        }
      });
    }
    const ccStr = Array.from(recipients).join(', ');
    
    const composeState = {
      to: email.from.address,
      subject: cleanSubject,
      bodyHtml: quoteHtml,
      cc: ccStr || undefined,
    };
    
    localStorage.setItem('popout_compose_state', JSON.stringify(composeState));
    const width = 850;
    const height = 750;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      '/compose', 
      'PopoutCompose', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  const handleForwardClick = (email: Email) => {
    const subjectText = email.subject || '';
    const hasFwdPrefix = /^fwd:\s*/i.test(subjectText);
    const cleanSubject = hasFwdPrefix ? subjectText : `Fwd: ${subjectText}`;
    const fromLine = `${email.from.name || ''} &lt;${email.from.address}&gt;`;
    const toLine = email.to.join(', ');
    const ccLine = email.cc && email.cc.length > 0 ? `<br><b>CC:</b> ${email.cc.join(', ')}` : '';
    const dateStr = new Date(email.date).toLocaleString('es-ES');
    const forwardQuoteHtml = `<br><br><br><hr style="border:0;border-top:1px solid rgba(45,212,191,0.15);margin:20px 0;"><div style="color:#7d8ba3;font-size:11px;line-height:1.5;"><b>---------- Mensaje reenviado ----------</b><br><b>De:</b> ${fromLine}<br><b>Para:</b> ${toLine}${ccLine}<br><b>Fecha:</b> ${dateStr}<br><b>Asunto:</b> ${email.subject}<br></div><br>${email.body.html || email.body.text}`;
    
    const composeState = {
      to: '',
      subject: cleanSubject,
      bodyHtml: forwardQuoteHtml,
    };
    
    localStorage.setItem('popout_compose_state', JSON.stringify(composeState));
    const width = 850;
    const height = 750;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      '/compose', 
      'PopoutCompose', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[hsl(222_47%_4%)]">
        <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[hsl(222_47%_4%)] text-slate-200">
        <p className="text-sm font-semibold">Correo no encontrado o no tienes permiso para verlo.</p>
        <button onClick={() => window.close()} className="mt-4 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded-lg text-xs font-bold">
          Cerrar ventana
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[hsl(222_47%_4%)]">
      <EmailReader
        email={email}
        onUpdateEmailStatus={handleUpdateEmailStatus}
        onDeletePermanent={handleDeletePermanent}
        onReplyClick={handleReplyClick}
        onReplyAllClick={handleReplyAllClick}
        onForwardClick={handleForwardClick}
        isStandalone={true}
      />
    </div>
  );
}

export default function StandaloneViewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[hsl(222_47%_4%)]">
        <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    }>
      <StandaloneViewContent />
    </Suspense>
  );
}
