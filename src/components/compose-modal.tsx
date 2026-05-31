import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
  Trash,
  ChevronDown,
  ChevronUp,
  PenSquare,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    to: string;
    subject: string;
    bodyHtml: string;
  } | null;
  assignedAddresses: string[];
}

export default function ComposeModal({ isOpen, onClose, initialData, assignedAddresses }: ComposeModalProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [senderMailboxes, setSenderMailboxes] = useState<{ email: string; name: string }[]>([]);
  const [senderLoading, setSenderLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      setTo(initialData.to || '');
      setSubject(initialData.subject || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = initialData.bodyHtml || '';
      }
    } else {
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSenderLoading(true);
      fetch('/api/mailboxes')
        .then(res => res.json())
        .then(data => {
          const list = data.mailboxes || [];
          setSenderMailboxes(list);
          if (list.length > 0) setFrom(list[0].email);
          else setFrom('');
        })
        .catch(err => console.error('Error loading sender mailboxes:', err))
        .finally(() => setSenderLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFormat = (command: string) => {
    document.execCommand(command, false, undefined);
    editorRef.current?.focus();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!to.trim()) {
      setError('El destinatario (Para) es requerido.');
      return;
    }

    const htmlContent = editorRef.current?.innerHTML || '';
    const textContent = editorRef.current?.innerText || '';
    const toArray = to.split(',').map(email => email.trim()).filter(Boolean);
    const ccArray = cc ? cc.split(',').map(email => email.trim()).filter(Boolean) : [];
    const bccArray = bcc ? bcc.split(',').map(email => email.trim()).filter(Boolean) : [];

    setLoading(true);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: toArray, cc: ccArray, bcc: bccArray, subject, bodyHtml: htmlContent, bodyText: textContent }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onClose();
      } else {
        setError(data.error || 'Ocurrió un error al enviar el correo.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al comunicar con la pasarela de envío.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'hsl(210 40% 90%)',
    fontSize: '13px',
    width: '100%',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    /* Backdrop overlay on mobile */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end sm:p-4"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="w-full sm:w-auto sm:max-w-2xl flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slideInUp"
        style={{
          pointerEvents: 'auto',
          /* Mobile: full width, full height above keyboard */
          height: 'min(90vh, 700px)',
          /* Desktop: fixed width */
          minWidth: 'min(100vw, 640px)',
          background: 'rgba(8,14,30,0.96)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(45,212,191,0.08)',
        }}
      >
        {/* Top shimmer */}
        <div
          className="shrink-0 h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(45,212,191,0.4), transparent)' }}
        />

        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.2), rgba(34,211,238,0.1))',
                border: '1px solid rgba(45,212,191,0.25)',
              }}
            >
              <PenSquare className="h-3.5 w-3.5" style={{ color: 'hsl(174 72% 60%)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'hsl(210 40% 92%)' }}>
              {initialData ? 'Responder correo' : 'Mensaje nuevo'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'hsl(215 20% 55%)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(210 40% 90%)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(215 20% 55%)'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Fields */}
          <div
            className="shrink-0 px-5 py-1"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* FROM */}
            <div style={rowStyle}>
              <span className="text-xs font-medium w-14 shrink-0" style={{ color: 'hsl(215 20% 50%)' }}>De:</span>
              {senderLoading ? (
                <span className="text-xs animate-pulse" style={{ color: 'hsl(215 20% 45%)' }}>Cargando...</span>
              ) : senderMailboxes.length === 0 ? (
                <span className="text-xs font-semibold" style={{ color: 'hsl(0 78% 60%)' }}>
                  Sin cuentas de correo registradas.
                </span>
              ) : (
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600 }}
                >
                  {senderMailboxes.map((box) => (
                    <option key={box.email} value={box.email} style={{ background: '#0a0f1e' }}>
                      {box.name} &lt;{box.email}&gt;
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* TO */}
            <div style={rowStyle}>
              <span className="text-xs font-medium w-14 shrink-0" style={{ color: 'hsl(215 20% 50%)' }}>Para:</span>
              <input
                type="text"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="destinatario@ejemplo.com"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer shrink-0"
                style={{ color: 'hsl(174 72% 55%)' }}
              >
                CC/CCO {showCcBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* CC/BCC */}
            {showCcBcc && (
              <>
                <div style={rowStyle}>
                  <span className="text-xs font-medium w-14 shrink-0" style={{ color: 'hsl(215 20% 50%)' }}>CC:</span>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="copia@ejemplo.com"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
                <div style={rowStyle}>
                  <span className="text-xs font-medium w-14 shrink-0" style={{ color: 'hsl(215 20% 50%)' }}>CCO:</span>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="copiaoculta@ejemplo.com"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </>
            )}

            {/* SUBJECT */}
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span className="text-xs font-medium w-14 shrink-0" style={{ color: 'hsl(215 20% 50%)' }}>Asunto:</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del correo"
                style={{ ...inputStyle, flex: 1, fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Formatting toolbar */}
          <div
            className="shrink-0 flex items-center gap-0.5 px-4 py-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {[
              { cmd: 'bold',                 Icon: Bold,      title: 'Negrita' },
              { cmd: 'italic',              Icon: Italic,     title: 'Cursiva' },
              { cmd: 'underline',           Icon: Underline,  title: 'Subrayado' },
              { cmd: 'insertUnorderedList', Icon: List,       title: 'Lista' },
              { cmd: 'removeFormat',        Icon: Trash,      title: 'Limpiar formato' },
            ].map(({ cmd, Icon, title }) => (
              <button
                key={cmd}
                type="button"
                title={title}
                onClick={() => handleFormat(cmd)}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                style={{ color: 'hsl(215 20% 55%)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(45,212,191,0.08)';
                  e.currentTarget.style.color = 'hsl(174 72% 60%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'hsl(215 20% 55%)';
                }}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* Editor body */}
          <div
            className="flex-1 overflow-y-auto px-5 py-4 min-h-0"
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="editor-content w-full min-h-[180px] leading-relaxed text-sm"
              data-placeholder="Comienza a escribir tu mensaje aquí..."
              style={{ color: 'hsl(210 40% 88%)', outline: 'none' }}
            />
          </div>

          {/* Footer */}
          <div
            className="shrink-0 flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-xs shrink-0 max-w-[200px] sm:max-w-[320px] truncate">
              {error && (
                <span
                  className="px-2.5 py-1 rounded-lg"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: 'hsl(0 78% 65%)',
                  }}
                >
                  {error}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'hsl(215 20% 60%)',
                }}
              >
                Cancelar
              </button>
              <button
                id="btn-send-email"
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, hsl(174 72% 52%), hsl(192 85% 58%))',
                  color: 'hsl(222 47% 4%)',
                  boxShadow: '0 4px 16px rgba(45,212,191,0.2)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
