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
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Link as LinkIcon,
  Code,
  Undo2,
  Redo2,
  Quote,
  Upload,
  Strikethrough,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    to: string;
    subject: string;
    bodyHtml: string;
    cc?: string;
    bcc?: string;
  } | null;
  assignedAddresses: string[];
}

const fontFamilies = [
  { name: 'Sans-serif', value: 'sans-serif' },
  { name: 'Serif', value: 'serif' },
  { name: 'Fijo (Monospace)', value: 'monospace' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
];

const fontSizes = [
  { name: 'Pequeño', value: '1' },
  { name: 'Normal', value: '3' },
  { name: 'Grande', value: '5' },
  { name: 'Enorme', value: '7' },
];

const colorPalette = [
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#eab308', label: 'Amarillo' },
  { hex: '#22c55e', label: 'Verde' },
  { hex: '#14b8a6', label: 'Teal/Celeste' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#a855f7', label: 'Púrpura' },
  { hex: '#ffffff', label: 'Blanco' },
  { hex: '#9ca3af', label: 'Gris' },
];

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

  // Styling & Dropdown States
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [selectedColorTab, setSelectedColorTab] = useState<'text' | 'bg'>('text');

  // Window Sizing States
  const [isMaximized, setIsMaximized] = useState(false);

  // Link Insertion States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Import HTML States
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'insert'>('replace');

  // Auto-maximize if pathname is /compose
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/compose') {
      setIsMaximized(true);
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setTo(initialData.to || '');
      setCc(initialData.cc || '');
      setBcc(initialData.bcc || '');
      setSubject(initialData.subject || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = initialData.bodyHtml || '';
      }
      if (initialData.cc || initialData.bcc) {
        setShowCcBcc(true);
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

  const saveSelection = () => {
    if (typeof window === 'undefined') return null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      return sel.getRangeAt(0);
    }
    return null;
  };

  const restoreSelection = (range: Range | null) => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && range) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const insertHtmlAtCursor = (html: string) => {
    let sel, range;
    if (typeof window !== 'undefined' && window.getSelection) {
      sel = window.getSelection();
      if (sel && sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement("div");
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node, lastNode;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range = range.cloneRange();
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else if (editorRef.current) {
        editorRef.current.innerHTML += html;
      }
    }
  };

  const handleFormat = (command: string, value: string | undefined = undefined) => {
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch (e) {}
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFontFamily = (fontValue: string) => {
    handleFormat('fontName', fontValue);
    setShowFontDropdown(false);
  };

  const handleFontSize = (sizeValue: string) => {
    handleFormat('fontSize', sizeValue);
    setShowSizeDropdown(false);
  };

  const handleOpenLinkModal = () => {
    const selRange = saveSelection();
    setSavedRange(selRange);
    const selectedText = selRange ? selRange.toString() : '';
    setLinkText(selectedText);
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    setShowLinkModal(false);
    
    if (!linkUrl.trim()) return;

    restoreSelection(savedRange);
    
    const formattedUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('mailto:') 
      ? linkUrl 
      : `https://${linkUrl}`;

    const anchorHtml = `<a href="${formattedUrl}" target="_blank" style="color: #2dd4bf; text-decoration: underline;" rel="noopener noreferrer">${linkText || formattedUrl}</a>`;

    insertHtmlAtCursor(anchorHtml);
    editorRef.current?.focus();
  };

  const handleImportHtml = () => {
    if (!htmlCode.trim()) return;

    if (importMode === 'replace') {
      if (editorRef.current) {
        // Reset editor styles first to defaults
        editorRef.current.removeAttribute('style');
        editorRef.current.style.color = 'hsl(210 40% 88%)';
        editorRef.current.style.outline = 'none';

        // Extract style properties from <body> tag of imported HTML
        const bodyMatch = htmlCode.match(/<body([^>]*)>/i);
        if (bodyMatch) {
          const attrs = bodyMatch[1];
          const styleMatch = attrs.match(/style=["']([^"']*)["']/i);
          const bgcolorMatch = attrs.match(/bgcolor=["']([^"']*)["']/i);
          
          if (styleMatch) {
            const styles = styleMatch[1].split(';');
            styles.forEach(style => {
              const parts = style.split(':');
              if (parts.length >= 2) {
                const prop = parts[0].trim().toLowerCase();
                const val = parts.slice(1).join(':').trim();
                if (prop && val && editorRef.current) {
                  if (prop === 'background-color' || prop === 'background') {
                    editorRef.current.style.backgroundColor = val;
                  } else if (prop === 'color') {
                    editorRef.current.style.color = val;
                  } else if (prop === 'font-family') {
                    editorRef.current.style.fontFamily = val;
                  }
                }
              }
            });
          }
          if (bgcolorMatch && bgcolorMatch[1] && !editorRef.current.style.backgroundColor) {
            editorRef.current.style.backgroundColor = bgcolorMatch[1];
          }
        }

        editorRef.current.innerHTML = htmlCode;
      }
    } else {
      insertHtmlAtCursor(htmlCode);
    }
    
    setShowHtmlModal(false);
    setHtmlCode('');
    editorRef.current?.focus();
  };

  const handleHtmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setHtmlCode(text);
    };
    reader.readAsText(file);
  };

  const handlePopOut = () => {
    const composeState = {
      to,
      cc,
      bcc,
      subject,
      bodyHtml: editorRef.current?.innerHTML || '',
    };
    if (typeof window !== 'undefined') {
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
      onClose();
    }
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

    // Package the HTML with container styles if any custom styling is active
    let finalHtml = htmlContent;
    if (editorRef.current) {
      const bg = editorRef.current.style.backgroundColor;
      const fg = editorRef.current.style.color;
      const font = editorRef.current.style.fontFamily;
      if (bg || (fg && fg !== 'hsl(210 40% 88%)') || font) {
        finalHtml = `<div style="${bg ? `background-color: ${bg};` : ''} ${fg ? `color: ${fg};` : ''} ${font ? `font-family: ${font};` : ''} padding: 20px; min-height: 100%;">${htmlContent}</div>`;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: toArray, cc: ccArray, bcc: bccArray, subject, bodyHtml: finalHtml, bodyText: textContent }),
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
      className={`fixed inset-0 z-50 flex transition-all duration-300 ${isMaximized ? 'items-center justify-center p-4 bg-slate-950/20' : 'items-end sm:items-end sm:justify-end sm:p-4'}`}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="w-full flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slideInUp"
        style={{
          pointerEvents: 'auto',
          height: isMaximized ? '94vh' : 'min(90vh, 700px)',
          width: isMaximized ? '95vw' : 'auto',
          maxWidth: isMaximized ? 'none' : '42rem',
          minWidth: isMaximized ? 'none' : 'min(100vw, 640px)',
          background: 'rgba(8,14,30,0.96)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(45,212,191,0.08)',
          position: 'relative',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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

          <div className="flex items-center gap-1">
            {/* Popout to Standalone Window (Only show if not already standalone) */}
            {typeof window !== 'undefined' && window.location.pathname !== '/compose' && (
              <button
                type="button"
                title="Abrir en ventana aparte"
                onClick={handlePopOut}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'hsl(215 20% 55%)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(210 40% 90%)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(215 20% 55%)'; }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Maximize / Minimize (Only show if not standalone) */}
            {typeof window !== 'undefined' && window.location.pathname !== '/compose' && (
              <button
                type="button"
                title={isMaximized ? "Restaurar tamaño" : "Maximizar"}
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'hsl(215 20% 55%)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(210 40% 90%)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(215 20% 55%)'; }}
              >
                {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
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
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 overflow-x-auto select-none border-b border-white/5 bg-white/[0.01]"
            onClick={() => {
              // Close dropdowns when clicking toolbar background
              setShowFontDropdown(false);
              setShowSizeDropdown(false);
              setShowColorDropdown(false);
            }}
          >
            {/* GROUP 1: Undo / Redo */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title="Deshacer"
                onClick={() => handleFormat('undo')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Rehacer"
                onClick={() => handleFormat('redo')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

            {/* GROUP 2: Typography (Font and Size) */}
            <div className="flex items-center gap-1.5">
              {/* Font Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFontDropdown(!showFontDropdown);
                    setShowSizeDropdown(false);
                    setShowColorDropdown(false);
                  }}
                  className="h-7 px-2 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-white/70 hover:bg-white/5 hover:text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="truncate max-w-[70px]">Fuente</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {showFontDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md p-1 shadow-2xl animate-fadeIn">
                    {fontFamilies.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => handleFontFamily(f.value)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/80 hover:bg-teal-500/10 hover:text-teal-400 transition-colors"
                        style={{ fontFamily: f.value }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Size Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSizeDropdown(!showSizeDropdown);
                    setShowFontDropdown(false);
                    setShowColorDropdown(false);
                  }}
                  className="h-7 px-2 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-white/70 hover:bg-white/5 hover:text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span>Tamaño</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {showSizeDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-28 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md p-1 shadow-2xl animate-fadeIn">
                    {fontSizes.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => handleFontSize(s.value)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/80 hover:bg-teal-500/10 hover:text-teal-400 transition-colors"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

            {/* GROUP 3: Core Style buttons */}
            <div className="flex items-center gap-0.5">
              {[
                { cmd: 'bold', Icon: Bold, title: 'Negrita (Ctrl+B)' },
                { cmd: 'italic', Icon: Italic, title: 'Cursiva (Ctrl+I)' },
                { cmd: 'underline', Icon: Underline, title: 'Subrayado (Ctrl+U)' },
                { cmd: 'strikeThrough', Icon: Strikethrough, title: 'Tachado' },
              ].map(({ cmd, Icon, title }) => (
                <button
                  key={cmd}
                  type="button"
                  title={title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat(cmd)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}

              {/* Color Selector Popover */}
              <div className="relative">
                <button
                  type="button"
                  title="Color de texto y resaltado"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColorDropdown(!showColorDropdown);
                    setShowFontDropdown(false);
                    setShowSizeDropdown(false);
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-teal-400"
                >
                  <Palette className="h-3.5 w-3.5" />
                </button>
                {showColorDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md p-2 shadow-2xl animate-fadeIn">
                    <div className="flex gap-1 mb-2 p-0.5 rounded-lg bg-white/5">
                      <button
                        type="button"
                        onClick={() => setSelectedColorTab('text')}
                        className={`flex-1 py-1 rounded-md text-[10px] font-semibold text-center transition-all ${selectedColorTab === 'text' ? 'bg-teal-500/20 text-teal-400' : 'text-white/60 hover:text-white'}`}
                      >
                        Texto
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedColorTab('bg')}
                        className={`flex-1 py-1 rounded-md text-[10px] font-semibold text-center transition-all ${selectedColorTab === 'bg' ? 'bg-teal-500/20 text-teal-400' : 'text-white/60 hover:text-white'}`}
                      >
                        Fondo
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {colorPalette.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          title={color.label}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (selectedColorTab === 'text') {
                              handleFormat('foreColor', color.hex);
                            } else {
                              handleFormat('backColor', color.hex);
                            }
                            setShowColorDropdown(false);
                          }}
                          className="h-6 w-6 rounded-md border border-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                      <button
                        type="button"
                        title="Restablecer color por defecto"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (selectedColorTab === 'text') {
                            handleFormat('foreColor', 'inherit');
                          } else {
                            handleFormat('backColor', 'transparent');
                          }
                          setShowColorDropdown(false);
                        }}
                        className="h-6 w-6 rounded-md border border-white/10 bg-transparent flex items-center justify-center text-[9px] text-white/50 hover:text-white cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

            {/* GROUP 4: Alignments */}
            <div className="flex items-center gap-0.5">
              {[
                { cmd: 'justifyLeft', Icon: AlignLeft, title: 'Alinear a la izquierda' },
                { cmd: 'justifyCenter', Icon: AlignCenter, title: 'Centrar' },
                { cmd: 'justifyRight', Icon: AlignRight, title: 'Alinear a la derecha' },
                { cmd: 'justifyFull', Icon: AlignJustify, title: 'Justificar' },
              ].map(({ cmd, Icon, title }) => (
                <button
                  key={cmd}
                  type="button"
                  title={title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat(cmd)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

            {/* GROUP 5: Lists & Layout */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title="Lista con viñetas"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('insertUnorderedList')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Lista numerada"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('insertOrderedList')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Reducir sangría"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('outdent')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <span className="text-[10px] font-bold">«</span>
              </button>
              <button
                type="button"
                title="Aumentar sangría"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('indent')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <span className="text-[10px] font-bold">»</span>
              </button>
              <button
                type="button"
                title="Cita"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('formatBlock', 'blockquote')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

            {/* GROUP 6: Extras (Link, HTML Import, Clean format) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title="Insertar enlace"
                onClick={handleOpenLinkModal}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-white"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Importar HTML"
                onClick={() => setShowHtmlModal(true)}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-teal-400 hover:bg-teal-500/10"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Eliminar formato"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('removeFormat')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5 hover:text-red-400"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
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

        {/* Link Insertion Modal */}
        {showLinkModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl animate-fadeInUp">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-white">Insertar Enlace</h4>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="text-white/60 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleInsertLink} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-white/50 mb-1">Texto a mostrar</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Texto del enlace"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/50 mb-1">Dirección URL</label>
                  <input
                    type="text"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-white/60 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md hover:opacity-90 active:scale-95 transition-transform cursor-pointer"
                  >
                    Insertar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HTML Import Modal */}
        {showHtmlModal && (
          <div className="absolute inset-0 z-50 flex flex-col p-5 bg-slate-950/90 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-teal-400" />
                <h4 className="text-sm font-semibold text-white">Importar Código HTML</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHtmlModal(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* File upload section */}
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <span className="block text-xs font-medium text-white/80">Cargar desde un archivo</span>
                  <span className="block text-[10px] text-white/55">Selecciona un archivo HTML local (.html)</span>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 cursor-pointer transition-colors">
                  <Upload className="h-3.5 w-3.5 text-teal-400" />
                  <span>Examinar</span>
                  <input
                    type="file"
                    accept=".html,text/html"
                    onChange={handleHtmlFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Code Textarea */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-[11px] font-medium text-white/50 mb-1">
                  O pega el código HTML directamente:
                </label>
                <textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  placeholder={`<div style="font-family: Arial, sans-serif; padding: 20px; color: #e2e8f0;">\n  <h1 style="color: #2dd4bf;">¡Hola!</h1>\n  <p>Este es un correo diseñado...</p>\n</div>`}
                  className="flex-1 w-full p-4 rounded-xl text-xs font-mono bg-slate-950 border border-white/10 text-emerald-400 placeholder-white/20 focus:outline-none focus:border-teal-500/50 resize-none overflow-y-auto"
                />
              </div>

              {/* Import Options */}
              <div className="flex items-center gap-6 p-1 text-xs">
                <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-teal-500"
                  />
                  <span>Reemplazar todo el contenido</span>
                </label>
                <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'insert'}
                    onChange={() => setImportMode('insert')}
                    className="accent-teal-500"
                  />
                  <span>Insertar en la posición del cursor</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowHtmlModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportHtml}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md hover:opacity-90 active:scale-95 transition-transform cursor-pointer"
                >
                  Importar HTML
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
