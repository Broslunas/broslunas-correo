'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import ComposeModal from '@/components/compose-modal';
import TwoFactorModal from '@/components/two-factor-modal';
import { 
  Settings, 
  Palette, 
  Mail, 
  PenTool, 
  MessageSquare, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';

interface MailboxSettings {
  email: string;
  autoReplyEnabled: boolean;
  autoReplySubject: string;
  autoReplyBody: string;
  signature: string;
}

const themes = [
  { id: 'theme-aurora-frost', name: 'Aurora Frost', primary: '#2dd4bf', accent: '#22d3ee', bg: '#060b18', dark: true },
  { id: 'theme-sunset-glow', name: 'Sunset Glow', primary: '#f97316', accent: '#eab308', bg: '#0b0214', dark: true },
  { id: 'theme-emerald-forest', name: 'Emerald Forest', primary: '#22c55e', accent: '#0d9488', bg: '#010f07', dark: true },
  { id: 'theme-rose-wine', name: 'Rose Wine', primary: '#f43f5e', accent: '#f472b6', bg: '#100208', dark: true },
  { id: 'theme-cyberpunk-neon', name: 'Cyberpunk Neon', primary: '#ec4899', accent: '#eab308', bg: '#08050e', dark: true },
  { id: 'theme-nordic-slate', name: 'Nordic Slate', primary: '#38bdf8', accent: '#06b6d4', bg: '#0b0e14', dark: true },
  { id: 'theme-midnight-gold', name: 'Midnight Gold', primary: '#eab308', accent: '#f59e0b', bg: '#000000', dark: true },
  { id: 'theme-lavender-mist', name: 'Lavender Mist', primary: '#c084fc', accent: '#d8b4fe', bg: '#0a0314', dark: true },
  { id: 'theme-ocean-deep', name: 'Ocean Deep', primary: '#0ea5e9', accent: '#14b8a6', bg: '#020b18', dark: true },
  { id: 'theme-sakura-light', name: 'Sakura Light', primary: '#ec4899', accent: '#db2777', bg: '#fef1f5', dark: false },
];

function SettingsContent() {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string; picture: string; role: string; twoFactorEnabled: boolean; assignedAddresses: string[] } | null>(null);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  
  // Push status
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  // Theme selection
  const [selectedTheme, setSelectedTheme] = useState('theme-aurora-frost');

  // Mailboxes settings
  const [availableAccounts, setAvailableAccounts] = useState<{ email: string; name: string }[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [settings, setSettings] = useState<MailboxSettings | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'signature' | 'autoreply'>('signature');
  
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Signature state
  const [signatureText, setSignatureText] = useState('');

  // Auto-reply state
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplySubject, setAutoReplySubject] = useState('');
  const [autoReplyBody, setAutoReplyBody] = useState('');

  // AI states
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('webmail_theme') || 'theme-aurora-frost';
      setSelectedTheme(savedTheme);
    }
  }, []);

  // Sync push SW status
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.ready.then((registration) => {
        return registration.pushManager.getSubscription().then((existingSub) => {
          setIsPushSubscribed(!!existingSub);
        });
      });
    }
  }, []);

  // Load user profile & mailboxes list
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

    async function fetchMailboxes() {
      try {
        const res = await fetch('/api/mailboxes');
        if (res.ok) {
          const data = await res.json();
          const list = data.mailboxes || [];
          setAvailableAccounts(list);
          if (list.length > 0) {
            setSelectedEmail(list[0].email);
          }
        }
      } catch (err) {
        console.error('Error fetching mailboxes:', err);
      }
    }

    fetchUserStatus();
    fetchMailboxes();
  }, []);

  // Fetch settings for the selected email
  useEffect(() => {
    if (!selectedEmail) return;

    const fetchSettings = async () => {
      setSettingsLoading(true);
      setError('');
      setSuccess('');
      try {
        const res = await fetch(`/api/mailboxes/settings?email=${encodeURIComponent(selectedEmail)}`);
        if (res.ok) {
          const data = await res.json();
          const mailboxSettings = data.settings;
          setSettings(mailboxSettings);
          setSignatureText(mailboxSettings.signature || '');
          setAutoReplyEnabled(mailboxSettings.autoReplyEnabled || false);
          setAutoReplySubject(mailboxSettings.autoReplySubject || '');
          setAutoReplyBody(mailboxSettings.autoReplyBody || '');
        } else {
          setError('No se pudieron recuperar las configuraciones para esta cuenta.');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Error de conexión con el servidor.');
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [selectedEmail]);

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
        
        // Helper to convert base64 VAPID key to Uint8Array
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

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

  const handleFolderChange = (folder: string) => {
    if (folder === 'settings') return;
    const paramVal = folder === 'inbox' ? 'main' : folder;
    router.push(`/mail?inbox=${paramVal}`);
  };

  const applyTheme = (themeId: string) => {
    localStorage.setItem('webmail_theme', themeId);
    const isLight = themeId === 'theme-sakura-light';
    document.documentElement.className = isLight ? themeId : 'dark ' + themeId;
    setSelectedTheme(themeId);
  };

  const handleSaveMailboxSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/mailboxes/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedEmail,
          signature: signatureText,
          autoReplyEnabled,
          autoReplySubject,
          autoReplyBody
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Configuración del correo guardada correctamente.');
        setTimeout(() => {
          setSuccess('');
        }, 4000);
      } else {
        setError(data.error || 'Ocurrió un error al guardar la configuración.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAutoreplyWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_autoreply',
          promptText: aiPrompt
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.subject) setAutoReplySubject(data.subject);
        if (data.body) setAutoReplyBody(data.body);
        setSuccess('¡Plantilla generada por IA con éxito! Revisa los campos abajo.');
        setShowAiInput(false);
        setAiPrompt('');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Error al generar la respuesta con IA.');
      }
    } catch (err) {
      console.error('Error generating autoreply with AI:', err);
      setError('Error de conexión al generar con IA.');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Sidebar */}
      <Sidebar
        currentFolder="settings"
        onFolderChange={handleFolderChange}
        onComposeClick={() => setComposeOpen(true)}
        role={user?.role}
        twoFactorEnabled={user?.twoFactorEnabled}
        onSecurityClick={() => setTwoFactorModalOpen(true)}
        isPushSupported={isPushSupported}
        isPushSubscribed={isPushSubscribed}
        onTogglePush={handleTogglePush}
      />

      {/* Main settings workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Settings Header */}
        <header 
          className="shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid hsl(var(--border) / 0.8)' }}
        >
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-teal-400" />
            <h1 className="text-sm font-bold text-foreground">
              Configuración y Personalización
            </h1>
          </div>
        </header>

        {/* Scrollable contents grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 select-none">
          
          {/* Section 1: Themes Grid */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4.5 w-4.5 text-teal-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Temas Visuales
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecciona uno de los 10 temas premium para personalizar el color principal, resplandores de ambiente y el estilo general de tu bandeja de entrada:
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-2">
              {themes.map((theme) => {
                const isActive = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => applyTheme(theme.id)}
                    className={`flex flex-col items-stretch p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] cursor-pointer`}
                    style={{
                      background: 'hsl(var(--card) / 0.3)',
                      borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border) / 0.6)',
                      boxShadow: isActive ? '0 0 16px hsl(var(--primary) / 0.15)' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[80%]">
                        {theme.name}
                      </span>
                      {theme.dark ? (
                        <Moon className="h-3 w-3 text-muted-foreground opacity-60" />
                      ) : (
                        <Sun className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    
                    {/* Circle Color previews */}
                    <div className="flex items-center gap-1.5 mt-auto">
                      <span 
                        className="h-3.5 w-3.5 rounded-full border border-neutral-900/10 shadow-sm shrink-0"
                        style={{ background: theme.primary }}
                      />
                      <span 
                        className="h-3 w-3 rounded-full border border-neutral-900/10 shadow-sm shrink-0"
                        style={{ background: theme.accent }}
                      />
                      <span 
                        className="h-2.5 w-2.5 rounded-full border border-neutral-900/10 shadow-sm shrink-0 ml-auto"
                        style={{ background: theme.bg }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 2: Mailbox Config (Signature and Auto-replies) */}
          <section className="space-y-4 pt-4 border-t border-neutral-900/50">
            <div className="flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-teal-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Firma y Respuesta Automática
              </h2>
            </div>
            
            {/* Account dropdown selector */}
            <div className="max-w-md space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Seleccionar cuenta a configurar:
              </label>
              {availableAccounts.length === 0 ? (
                <div className="text-xs text-red-400 font-medium">
                  No tienes ninguna cuenta de correo asignada para configurar.
                </div>
              ) : (
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  style={{ cursor: 'pointer' }}
                >
                  {availableAccounts.map((box, idx) => (
                    <option key={`${box.email}-${idx}`} value={box.email} style={{ background: '#0a0f1e' }}>
                      {box.name} &lt;{box.email}&gt;
                    </option>
                  ))}
                </select>
              )}
            </div>

            {settingsLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 max-w-2xl border border-neutral-900/60 rounded-2xl bg-neutral-950/20">
                <Loader2 className="h-7 w-7 animate-spin text-teal-400" />
                <p className="text-xs text-muted-foreground">Cargando configuraciones...</p>
              </div>
            ) : settings ? (
              <form onSubmit={handleSaveMailboxSettings} className="max-w-2xl border border-neutral-900/60 rounded-2xl bg-neutral-950/20 p-5 space-y-5">
                
                {/* Save status messages */}
                {error && (
                  <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3 text-xs text-red-400 font-medium flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-3 text-xs text-emerald-400 font-medium flex items-start gap-2.5 animate-fadeIn">
                    <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
                    <p>{success}</p>
                  </div>
                )}

                {/* Subtabs selector */}
                <div className="flex gap-2 border-b border-neutral-900/80 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab('signature')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer`}
                    style={{
                      background: activeSettingsTab === 'signature' ? 'rgba(45,212,191,0.08)' : 'transparent',
                      border: activeSettingsTab === 'signature' ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
                      color: activeSettingsTab === 'signature' ? 'hsl(174 72% 60%)' : 'hsl(215 20% 55%)'
                    }}
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    Firma de correo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab('autoreply')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer`}
                    style={{
                      background: activeSettingsTab === 'autoreply' ? 'rgba(45,212,191,0.08)' : 'transparent',
                      border: activeSettingsTab === 'autoreply' ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
                      color: activeSettingsTab === 'autoreply' ? 'hsl(174 72% 60%)' : 'hsl(215 20% 55%)'
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Respuesta automática
                  </button>
                </div>

                {/* Tab 1: SIGNATURE */}
                {activeSettingsTab === 'signature' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Texto de la firma:
                      </label>
                      <textarea
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        placeholder="Atentamente,\n[Tu Nombre]"
                        className="w-full h-32 px-3 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                      />
                    </div>
                    <div className="p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/50 space-y-2">
                      <span className="text-[9px] font-bold text-teal-400/80 uppercase tracking-widest block">
                        Vista previa de firma:
                      </span>
                      <div className="text-xs text-muted-foreground border-t border-neutral-900/50 pt-2 font-sans min-h-[50px] whitespace-pre-line">
                        {signatureText ? signatureText : <span className="italic opacity-60">Sin firma configurada</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: AUTO-REPLY */}
                {activeSettingsTab === 'autoreply' && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Switch Card */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/30">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground block">
                          Activar respuestas automáticas
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Envía un correo automático a las personas que te escriban
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={autoReplyEnabled}
                          onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-850 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-checked:after:bg-neutral-950" />
                      </label>
                    </div>

                    {/* AI Generation Control */}
                    <div className="p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-teal-400" />
                          <span className="text-xs font-semibold text-foreground">Asistente IA</span>
                        </div>
                        <button
                          type="button"
                          disabled={!autoReplyEnabled}
                          onClick={() => setShowAiInput(!showAiInput)}
                          className="text-[10px] font-bold text-teal-400 hover:text-teal-350 transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                          {showAiInput ? 'Cerrar' : 'Generar plantilla con IA'}
                        </button>
                      </div>

                      {showAiInput && (
                        <div className="space-y-2 animate-fadeIn">
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Escribe instrucciones para tu respuesta automática (ej: "estaré de vacaciones del 5 al 12 de junio y para emergencias escribir a pedro@mail.com"):
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              placeholder="Escribe las instrucciones..."
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-850 bg-neutral-900/30 text-foreground transition-all focus:border-teal-500 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleGenerateAutoreplyWithAi();
                                }
                              }}
                            />
                            <button
                              type="button"
                              disabled={aiGenerating || !aiPrompt.trim()}
                              onClick={handleGenerateAutoreplyWithAi}
                              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              {aiGenerating ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Generando...
                                </>
                              ) : (
                                'Generar'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Auto-reply fields */}
                    <div className={`space-y-4 transition-all ${autoReplyEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      {/* Subject */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Asunto de la respuesta:
                        </label>
                        <input
                          type="text"
                          disabled={!autoReplyEnabled}
                          value={autoReplySubject}
                          onChange={(e) => setAutoReplySubject(e.target.value)}
                          placeholder="Respuesta automática: {{subject}}"
                          className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>

                      {/* Body */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Mensaje automático:
                        </label>
                        <textarea
                          disabled={!autoReplyEnabled}
                          value={autoReplyBody}
                          onChange={(e) => setAutoReplyBody(e.target.value)}
                          placeholder="Escribe tu respuesta automática aquí..."
                          className="w-full h-36 px-3 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>

                      {/* Placeholders helper card */}
                      <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/10 text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[10px] uppercase tracking-wider mb-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Placeholders dinámicos</span>
                        </div>
                        <p className="text-[10px] leading-relaxed">
                          Puedes utilizar las siguientes etiquetas en el asunto o cuerpo para personalizar la respuesta automática:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[10px] pt-1">
                          <li><code className="text-teal-400 font-semibold font-mono">{"{{subject}}"}</code>: Inserta el asunto del correo original.</li>
                          <li><code className="text-teal-400 font-semibold font-mono">{"{{sender}}"}</code>: Inserta el remitente original (nombre o correo).</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer save button */}
                <div className="pt-4 border-t border-neutral-900 flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2 text-xs font-bold rounded-lg bg-teal-500 text-neutral-950 shadow hover:bg-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar configuración'
                    )}
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          {/* Bottom spacing on mobile */}
          <div className="lg:hidden h-16" />
        </div>
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

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[hsl(222_47%_4%)]">
        <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
