import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  PenTool, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedMailboxes: { email: string; name: string }[];
  onSettingsSaved?: () => void;
}

interface MailboxSettings {
  email: string;
  autoReplyEnabled: boolean;
  autoReplySubject: string;
  autoReplyBody: string;
  signature: string;
}

export default function SettingsModal({ isOpen, onClose, assignedMailboxes, onSettingsSaved }: SettingsModalProps) {
  const [selectedEmail, setSelectedEmail] = useState('');
  const [settings, setSettings] = useState<MailboxSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'signature' | 'autoreply'>('signature');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Signature state modifications
  const [signatureText, setSignatureText] = useState('');

  // Auto-reply state modifications
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplySubject, setAutoReplySubject] = useState('');
  const [autoReplyBody, setAutoReplyBody] = useState('');

  // AI states
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && assignedMailboxes.length > 0) {
      // Default to the first mailbox
      setSelectedEmail(assignedMailboxes[0].email);
    }
  }, [isOpen, assignedMailboxes]);

  // Fetch settings for the selected email
  useEffect(() => {
    if (!isOpen || !selectedEmail) return;

    const fetchSettings = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    fetchSettings();
  }, [selectedEmail, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
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
        setSuccess('Configuración guardada correctamente.');
        if (onSettingsSaved) {
          onSettingsSaved();
        }
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError(data.error || 'Ocurrió un error al guardar la configuración.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Error al conectar con el servidor.');
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative animate-zoomIn flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-900 transition-all cursor-pointer z-10"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Modal Title */}
        <div className="shrink-0 flex items-center gap-2 mb-5 pb-3 border-b border-neutral-900 select-none">
          <Settings className="h-5 w-5 text-teal-400" />
          <h3 className="text-sm font-semibold text-foreground">
            Configuración de la Cuenta
          </h3>
        </div>

        {/* Account Selector */}
        <div className="shrink-0 space-y-2 mb-4">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Seleccionar cuenta de correo:
          </label>
          {assignedMailboxes.length === 0 ? (
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
              {assignedMailboxes.map((box, idx) => (
                <option key={`${box.email}-${idx}`} value={box.email} style={{ background: '#0a0f1e' }}>
                  {box.name} &lt;{box.email}&gt;
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex-1 py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <p className="text-xs text-muted-foreground">Cargando configuraciones...</p>
          </div>
        ) : settings ? (
          <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
            {/* Feedback Banners */}
            {error && (
              <div className="shrink-0 rounded-lg bg-red-950/20 border border-red-900/30 p-3 text-xs text-red-400 font-medium flex items-start gap-2.5 mb-4 animate-shake">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="shrink-0 rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-3 text-xs text-emerald-400 font-medium flex items-start gap-2.5 mb-4 animate-fadeIn">
                <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
                <p>{success}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="shrink-0 flex gap-2 border-b border-neutral-900/80 pb-3 mb-4 select-none">
              <button
                type="button"
                onClick={() => setActiveTab('signature')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer`}
                style={{
                  background: activeTab === 'signature' ? 'rgba(45,212,191,0.08)' : 'transparent',
                  border: activeTab === 'signature' ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
                  color: activeTab === 'signature' ? 'hsl(174 72% 60%)' : 'hsl(215 20% 55%)'
                }}
              >
                <PenTool className="h-3.5 w-3.5" />
                Firma de correo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('autoreply')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer`}
                style={{
                  background: activeTab === 'autoreply' ? 'rgba(45,212,191,0.08)' : 'transparent',
                  border: activeTab === 'autoreply' ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
                  color: activeTab === 'autoreply' ? 'hsl(174 72% 60%)' : 'hsl(215 20% 55%)'
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Respuesta automática
              </button>
            </div>

            {/* Tab content (scrollable if needed) */}
            <div className="flex-1 overflow-y-auto pr-1 pb-4 min-h-0 space-y-4">
              {activeTab === 'signature' ? (
                /* Tab 1: SIGNATURE */
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Texto de la firma:
                    </label>
                    <textarea
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      placeholder="Atentamente,\n[Tu Nombre]\n[Tu Cargo]"
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
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Tip: La firma se agregará automáticamente al pie de todos los nuevos correos redactados desde esta cuenta de correo.
                  </p>
                </div>
              ) : (
                /* Tab 2: AUTO-REPLY */
                <div className="space-y-4">
                  {/* Enable toggle */}
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

                  {/* Settings fields (only if enabled) */}
                  <div className={`space-y-4 transition-all ${autoReplyEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    
                    {/* AI Generation Control */}
                    <div className="p-3.5 rounded-xl border border-neutral-905 bg-neutral-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 select-none">
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

                    {/* Subject input */}
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

                    {/* Body text area */}
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

                    {/* Loop prevention info */}
                    <div className="text-[10px] text-muted-foreground leading-normal">
                      ℹ️ <strong>Prevención de bucles:</strong> Para evitar spam y bucles infinitos de correo, se enviará como máximo una respuesta automática por remitente cada 24 horas.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="shrink-0 flex gap-2.5 pt-4 border-t border-neutral-900 select-none">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-muted-foreground hover:text-foreground py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 py-2 text-xs font-bold text-neutral-950 shadow hover:bg-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
