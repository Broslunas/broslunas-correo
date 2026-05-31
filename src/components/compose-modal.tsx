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
  ChevronUp
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    to: string;
    subject: string;
    bodyHtml: string;
  } | null;
}

export default function ComposeModal({ isOpen, onClose, initialData }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  // Populate data when composing a reply
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

  if (!isOpen) return null;

  // Execute native rich-text editing controls
  const handleFormat = (command: string) => {
    document.execCommand(command, false, undefined);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Form validation
    if (!to.trim()) {
      setError('El destinatario (Para) es requerido.');
      return;
    }

    const htmlContent = editorRef.current?.innerHTML || '';
    const textContent = editorRef.current?.innerText || '';

    // Split recipient inputs
    const toArray = to.split(',').map(email => email.trim()).filter(Boolean);
    const ccArray = cc ? cc.split(',').map(email => email.trim()).filter(Boolean) : [];
    const bccArray = bcc ? bcc.split(',').map(email => email.trim()).filter(Boolean) : [];

    setLoading(true);

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toArray,
          cc: ccArray,
          bcc: bccArray,
          subject,
          bodyHtml: htmlContent,
          bodyText: textContent
        })
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

  return (
    <div className="fixed bottom-0 right-4 w-full max-w-2xl bg-neutral-900 border border-border rounded-t-xl shadow-2xl flex flex-col z-50 transition-all duration-300 overflow-hidden max-h-[85vh]">
      
      {/* Header bar */}
      <div className="bg-neutral-950 px-4 py-3 flex items-center justify-between border-b border-border select-none">
        <h3 className="text-xs font-semibold text-foreground">Mensaje Nuevo</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Inputs Form */}
      <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
        
        <div className="px-4 py-2 space-y-2 border-b border-border bg-neutral-900/50">
          
          {/* TO Field */}
          <div className="flex items-center text-xs">
            <span className="text-muted-foreground w-12 shrink-0 font-medium">Para:</span>
            <input
              type="text"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="ejemplo@correo.com, otro@correo.com"
              className="flex-1 bg-transparent border-0 outline-none text-foreground py-1 focus:ring-0 placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              CC / CCO {showCcBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* CC / BCC Optional Fields */}
          {showCcBcc && (
            <div className="space-y-2 pt-2 border-t border-border/30">
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground w-12 shrink-0 font-medium">CC:</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="copia@correo.com"
                  className="flex-1 bg-transparent border-0 outline-none text-foreground py-1 focus:ring-0 placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex items-center text-xs border-t border-border/30 pt-2">
                <span className="text-muted-foreground w-12 shrink-0 font-medium">CCO:</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="copiaoculta@correo.com"
                  className="flex-1 bg-transparent border-0 outline-none text-foreground py-1 focus:ring-0 placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* SUBJECT Field */}
          <div className="flex items-center text-xs border-t border-border/30 pt-2">
            <span className="text-muted-foreground w-12 shrink-0 font-medium">Asunto:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
              className="flex-1 bg-transparent border-0 outline-none text-foreground py-1 focus:ring-0 placeholder:text-muted-foreground/50 font-semibold"
            />
          </div>

        </div>

        {/* Text editor toolbar */}
        <div className="px-4 py-2 border-b border-border bg-neutral-950 flex items-center gap-1 select-none">
          <button
            type="button"
            onClick={() => handleFormat('bold')}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Negrita"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('italic')}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Cursiva"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('underline')}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Subrayado"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            type="button"
            onClick={() => handleFormat('insertUnorderedList')}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Lista viñetas"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('removeFormat')}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Eliminar formato"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Editor Body Text Area */}
        <div className="flex-1 p-4 min-h-[220px] max-h-[400px] overflow-y-auto bg-neutral-900">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="editor-content w-full h-full text-xs text-foreground bg-transparent border-0 outline-none select-text focus:ring-0 leading-relaxed min-h-[200px]"
            data-placeholder="Comienza a escribir tu correo aquí..."
          />
        </div>

        {/* Status Messages and Send bar */}
        <div className="px-4 py-3 border-t border-border bg-neutral-950 flex items-center justify-between">
          <div className="text-xs text-destructive-foreground font-medium shrink-0 max-w-[320px] truncate">
            {error && <span className="bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-md">{error}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
  );
}
