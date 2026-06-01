'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Server,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Mail,
  Inbox,
  Send,
  Smartphone,
  Laptop,
} from 'lucide-react';
import Sidebar from '@/components/sidebar';
import TwoFactorModal from '@/components/two-factor-modal';

interface AppPassword {
  id: string;
  description: string;
  created: string;
}

interface Account {
  email: string;
  name: string;
  wildduckUserId: string | null;
  appPasswords: AppPassword[];
}

interface CredentialsResponse {
  enabled: boolean;
  imapHost: string;
  imapPort: number;
  imapSecurity: string;
  pop3Host: string;
  pop3Port: number;
  pop3Security: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: string;
  authMethod: string;
  accounts: Account[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CredentialsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password generation state
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [newDescription, setNewDescription] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gmail' | 'apple' | 'thunderbird' | 'outlook'>('gmail');

  // Re-auth state
  const [user, setUser] = useState<{ email: string; name: string; role: string } | null>(null);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('inbox');

  useEffect(() => {
    loadCredentials();
    // Also load user info from session API or similar
    fetch('/api/auth/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) setUser({ email: d.user.email, name: d.user.name, role: d.user.role });
      })
      .catch(() => {});
  }, []);

  const loadCredentials = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/imap/credentials');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const json: CredentialsResponse = await res.json();
      setData(json);
      if (json.accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(json.accounts[0].email);
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAccount || !newDescription.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/imap/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailbox: selectedAccount, description: newDescription.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const json = await res.json();
      setGeneratedPassword(json.appPassword);
      setNewDescription('');
      // Refresh list
      await loadCredentials();
    } catch (err: any) {
      setError(err.message || 'Error al generar la contraseña');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (mailbox: string, id: string) => {
    if (!confirm('¿Revocar esta contraseña? El cliente que la use dejará de sincronizar.')) return;
    try {
      const res = await fetch(`/api/imap/credentials?mailbox=${encodeURIComponent(mailbox)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      await loadCredentials();
    } catch (err: any) {
      setError(err.message || 'Error al revocar');
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const currentAccount = data?.accounts.find(a => a.email === selectedAccount);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(222 47% 4%)' }}>
      <Sidebar
        currentFolder={currentFolder}
        onFolderChange={(f) => { setCurrentFolder(f); router.push(`/mail?inbox=${f}`); }}
        onComposeClick={() => router.push('/compose')}
        role={user?.role}
        twoFactorEnabled={false}
        onSecurityClick={() => setTwoFactorModalOpen(true)}
        isPushSupported={false}
        isPushSubscribed={false}
        onTogglePush={() => {}}
      />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl cursor-pointer shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestiona cómo conectas tu correo desde clientes externos
              </p>
            </div>
          </div>

          {/* WildDuck disabled notice */}
          {data && !data.enabled && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-6"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-300">IMAP/POP3/SMTP no está habilitado</p>
                <p className="text-muted-foreground mt-1">
                  El servidor WildDuck no está configurado. Añade <code className="px-1.5 py-0.5 rounded bg-black/30 text-xs">WILDDUCK_API_URL</code> y
                  <code className="px-1.5 py-0.5 rounded bg-black/30 text-xs ml-1">WILDDUCK_API_KEY</code> a tu
                  <code className="px-1.5 py-0.5 rounded bg-black/30 text-xs ml-1">.env.local</code> y
                  despliega el contenedor <code className="px-1.5 py-0.5 rounded bg-black/30 text-xs">mail-server/</code>.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-6"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
            </div>
          ) : data && (
            <div className="space-y-6">
              {/* Server connection card */}
              <section
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)' }}
                  >
                    <Server className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Parámetros del servidor</h2>
                    <p className="text-xs text-muted-foreground">
                      Copia estos valores en la configuración de tu cliente (Thunderbird, Outlook, Apple Mail)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ConnectionRow
                    icon={Inbox}
                    label="IMAP (recepción)"
                    host={data.imapHost}
                    port={data.imapPort}
                    security={data.imapSecurity}
                    onCopy={(text) => copyToClipboard(text, 'imap')}
                    copied={copied === 'imap'}
                  />
                  <ConnectionRow
                    icon={Mail}
                    label="POP3 (recepción legacy)"
                    host={data.pop3Host}
                    port={data.pop3Port}
                    security={data.pop3Security}
                    onCopy={(text) => copyToClipboard(text, 'pop3')}
                    copied={copied === 'pop3'}
                  />
                  <ConnectionRow
                    icon={Send}
                    label="SMTP (envío)"
                    host={data.smtpHost}
                    port={data.smtpPort}
                    security={data.smtpSecurity}
                    onCopy={(text) => copyToClipboard(text, 'smtp')}
                    copied={copied === 'smtp'}
                  />
                </div>

                <div className="mt-4 p-3 rounded-lg flex items-start gap-2"
                  style={{ background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.15)' }}>
                  <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Método de autenticación:</strong> {data.authMethod}.
                    Nunca uses tu contraseña principal del correo en un cliente externo — genera una
                    contraseña específica por aplicación (abajo).
                  </p>
                </div>
              </section>

              {/* Account & app passwords card */}
              <section
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)' }}
                  >
                    <Key className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Contraseñas de aplicación</h2>
                    <p className="text-xs text-muted-foreground">
                      Genera una contraseña distinta para cada dispositivo o app donde configures tu correo
                    </p>
                  </div>
                </div>

                {/* Account selector */}
                {data.accounts.length > 0 ? (
                  <>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">
                      Cuenta
                    </label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/30 text-foreground border border-white/10 mb-5 outline-none focus:border-teal-400/50"
                    >
                      {data.accounts.map(a => (
                        <option key={a.email} value={a.email}>{a.email}</option>
                      ))}
                    </select>

                    {/* Existing app passwords list */}
                    {currentAccount && currentAccount.appPasswords.length > 0 && (
                      <div className="space-y-2 mb-5">
                        <p className="text-xs font-semibold text-muted-foreground">Activas</p>
                        {currentAccount.appPasswords.map(p => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Creada: {new Date(p.created).toLocaleString('es-ES')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRevoke(currentAccount.email, p.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 hover:bg-red-500/10 transition-colors"
                              style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Revocar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Generate new */}
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Descripción (ej. 'Thunderbird MacBook')"
                        maxLength={64}
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-black/30 text-foreground border border-white/10 outline-none focus:border-teal-400/50"
                      />
                      <button
                        onClick={handleGenerate}
                        disabled={!newDescription.trim() || generating}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(222_47%_4%)] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: 'linear-gradient(135deg, hsl(174 72% 52%), hsl(192 85% 58%))',
                          boxShadow: '0 4px 16px rgba(45,212,191,0.25)',
                        }}
                      >
                        {generating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Generar
                      </button>
                    </div>

                    {/* Generated password reveal */}
                    {generatedPassword && (
                      <div className="space-y-4">
                        <div
                          className="mt-4 p-4 rounded-xl"
                          style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.25)' }}
                        >
                          <div className="flex items-start gap-2 mb-3">
                            <AlertCircle className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-teal-200 font-medium">
                              Esta contraseña solo se mostrará una vez. Cópiala ahora.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2.5 rounded-lg bg-black/40 text-sm font-mono text-foreground break-all tracking-wider">
                              {showPassword ? generatedPassword : '••••••••••••••••••••••••••••'}
                            </code>
                            <button
                              onClick={() => setShowPassword(s => !s)}
                              className="p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                              title={showPassword ? 'Ocultar' : 'Mostrar'}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(generatedPassword, 'gen')}
                              className="p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                              title="Copiar"
                            >
                              {copied === 'gen' ? (
                                <Check className="h-4 w-4 text-teal-400" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Interactive Tutorial for Mail Clients */}
                        <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01]">
                          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-teal-400" /> Guía de configuración para tus aplicaciones
                          </h3>
                          
                          {/* Tabs */}
                          <div className="flex border-b border-white/10 mb-4 overflow-x-auto">
                            <button
                              onClick={() => setActiveTab('gmail')}
                              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'gmail' ? 'border-teal-400 text-teal-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Gmail App (Móvil)
                            </button>
                            <button
                              onClick={() => setActiveTab('apple')}
                              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'apple' ? 'border-teal-400 text-teal-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Apple Mail (iPhone/Mac)
                            </button>
                            <button
                              onClick={() => setActiveTab('thunderbird')}
                              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'thunderbird' ? 'border-teal-400 text-teal-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Thunderbird
                            </button>
                            <button
                              onClick={() => setActiveTab('outlook')}
                              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'outlook' ? 'border-teal-400 text-teal-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Outlook / Otros
                            </button>
                          </div>

                          {/* Tab Contents */}
                          <div className="text-xs text-muted-foreground space-y-3">
                            {activeTab === 'gmail' && (
                              <div className="space-y-2">
                                <p className="text-teal-300 font-semibold mb-1">Configuración en Android o iOS:</p>
                                <ol className="list-decimal pl-4 space-y-1.5">
                                  <li>Abre Gmail, ve a Ajustes y selecciona <strong className="text-foreground">Añadir cuenta</strong>.</li>
                                  <li>Elige la opción <strong className="text-foreground">Otro (IMAP/POP)</strong>.</li>
                                  <li>Escribe tu correo: <code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{selectedAccount}</code>.</li>
                                  <li>En <strong className="text-foreground">Servidor Entrante (IMAP)</strong> usa:
                                    <ul className="list-disc pl-4 mt-0.5 text-muted-foreground space-y-0.5">
                                      <li>Servidor: <code className="text-foreground font-mono">{data.imapHost}</code></li>
                                      <li>Puerto: <code className="text-foreground font-mono">{data.imapPort}</code></li>
                                      <li>Seguridad: <code className="text-foreground">{data.imapSecurity}</code> (SSL/TLS)</li>
                                      <li>Contraseña: <code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{generatedPassword}</code></li>
                                    </ul>
                                  </li>
                                  <li>En <strong className="text-foreground">Servidor Saliente (SMTP)</strong> usa:
                                    <ul className="list-disc pl-4 mt-0.5 text-muted-foreground space-y-0.5">
                                      <li>Servidor: <code className="text-foreground font-mono">{data.smtpHost}</code></li>
                                      <li>Puerto: <strong className="text-amber-400 font-bold font-mono">587</strong></li>
                                      <li>Seguridad: <strong className="text-amber-400 font-bold">STARTTLS</strong> (¡importante!)</li>
                                      <li>Contraseña: <code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{generatedPassword}</code></li>
                                    </ul>
                                  </li>
                                </ol>
                              </div>
                            )}

                            {activeTab === 'apple' && (
                              <div className="space-y-2">
                                <p className="text-teal-300 font-semibold mb-1">Configuración en iPhone, iPad o Mac:</p>
                                <ol className="list-decimal pl-4 space-y-1.5">
                                  <li>Ve a <strong className="text-foreground">Ajustes &gt; Mail &gt; Cuentas &gt; Añadir cuenta</strong>.</li>
                                  <li>Selecciona <strong className="text-foreground">Otra cuenta de correo</strong>.</li>
                                  <li>Escribe tu nombre, tu correo (<code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{selectedAccount}</code>) y la contraseña: <code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{generatedPassword}</code>.</li>
                                  <li>Elige el tipo de cuenta <strong className="text-foreground">IMAP</strong>.</li>
                                  <li>Introduce los servidores de correo entrante (<code className="text-foreground font-mono">{data.imapHost}</code>) y saliente (<code className="text-foreground font-mono">{data.smtpHost}</code>).</li>
                                  <li>Si falla al inicio, revisa los ajustes del servidor de salida (SMTP) y asegúrate de cambiar el puerto a <strong className="text-foreground font-mono">587</strong> con conexión segura <strong className="text-foreground">STARTTLS</strong> / <strong className="text-foreground">TLS</strong>.</li>
                                </ol>
                              </div>
                            )}

                            {activeTab === 'thunderbird' && (
                              <div className="space-y-2">
                                <p className="text-teal-300 font-semibold mb-1">Configuración en Mozilla Thunderbird:</p>
                                <ol className="list-decimal pl-4 space-y-1.5">
                                  <li>Abre Thunderbird y selecciona <strong className="text-foreground">Configurar cuenta de correo</strong>.</li>
                                  <li>Ingresa tu nombre, correo y esta contraseña de aplicación: <code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{generatedPassword}</code>.</li>
                                  <li>Presiona <strong className="text-foreground">Configurar manualmente</strong>.</li>
                                  <li>Ajusta los siguientes campos:
                                    <ul className="list-disc pl-4 mt-1 space-y-1 text-muted-foreground">
                                      <li><strong className="text-foreground">Entrante:</strong> IMAP | <code className="text-foreground font-mono">{data.imapHost}</code> | Puerto <code className="text-foreground font-mono">{data.imapPort}</code> | SSL/TLS | Contraseña normal</li>
                                      <li><strong className="text-foreground">Saliente:</strong> SMTP | <code className="text-foreground font-mono">{data.smtpHost}</code> | Puerto <strong className="text-amber-400 font-bold font-mono">587</strong> | STARTTLS | Contraseña normal</li>
                                    </ul>
                                  </li>
                                  <li>Haz clic en <strong className="text-foreground">Hecho</strong> para validar.</li>
                                </ol>
                              </div>
                            )}

                            {activeTab === 'outlook' && (
                              <div className="space-y-2">
                                <p className="text-teal-300 font-semibold mb-1">Configuración en Outlook u otros clientes:</p>
                                <ul className="list-disc pl-4 space-y-1.5">
                                  <li><strong className="text-foreground">Usuario / Username:</strong> Usa tu correo completo: <code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{selectedAccount}</code>.</li>
                                  <li><strong className="text-foreground">Contraseña / Password:</strong> Usa únicamente esta clave generada: <code className="text-teal-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">{generatedPassword}</code>.</li>
                                  <li><strong className="text-foreground">Servidor IMAP:</strong> <code className="text-foreground font-mono">{data.imapHost}</code> (Puerto <code className="text-foreground font-mono">{data.imapPort}</code>, tipo de seguridad <code className="text-foreground">SSL/TLS</code>).</li>
                                  <li><strong className="text-foreground">Servidor SMTP:</strong> <code className="text-foreground font-mono">{data.smtpHost}</code> (Puerto <strong className="text-amber-400 font-bold font-mono">587</strong>, tipo de seguridad <strong className="text-amber-400 font-bold">STARTTLS</strong>).</li>
                                  <li><strong className="text-foreground">Autenticación:</strong> Elige siempre <strong className="text-foreground">Contraseña normal / Plaintext Password</strong> (no OAuth2 ni inicio de sesión seguro cifrado tipo SPA/MD5).</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tienes buzones asignados. Pide al administrador que te asigne una cuenta.
                  </p>
                )}
              </section>

              {/* Setup help */}
              <section
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <h2 className="text-lg font-bold text-foreground mb-3">Cómo configurar tu cliente</h2>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Copia los parámetros del servidor (arriba) y pégalos en tu cliente.</li>
                  <li>Cuando pida usuario, usa tu dirección de correo completa (ej. <code className="px-1.5 py-0.5 rounded bg-black/30 text-xs">tu@dominio.com</code>).</li>
                  <li>Cuando pida contraseña, usa una <strong>contraseña de aplicación</strong> que generes aquí (no tu contraseña principal).</li>
                  <li>Si el cliente pregunta por el método de autenticación, elige <strong>OAuth2</strong> desactivado / <strong>contraseña normal</strong> (no SASL XOAUTH2).</li>
                </ol>
              </section>
            </div>
          )}
        </div>
      </main>

      {twoFactorModalOpen && (
        <TwoFactorModal
          isOpen={twoFactorModalOpen}
          onClose={() => setTwoFactorModalOpen(false)}
        />
      )}
    </div>
  );
}

function ConnectionRow({
  icon: Icon,
  label,
  host,
  port,
  security,
  onCopy,
  copied,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  host: string;
  port: number;
  security: string;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const value = `${host}:${port}`;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <Icon className="h-4 w-4 text-teal-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-mono text-foreground truncate">
          {value} <span className="text-muted-foreground">· {security}</span>
        </p>
      </div>
      <button
        onClick={() => onCopy(value)}
        className="p-1.5 rounded-md hover:bg-white/5 shrink-0"
        title="Copiar"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-teal-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
