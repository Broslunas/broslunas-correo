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
  Paperclip,
  FileText,
  Check,
  Sparkles,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    id?: string;
    to: string;
    subject: string;
    bodyHtml: string;
    cc?: string;
    bcc?: string;
    attachments?: any[];
    inReplyTo?: string;
    references?: string;
    forwardMode?: boolean;
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

const GoogleDriveIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...props}>
    <path fill="#0066da" d="M19.43 12.98L12 20h7.43L24 12.98z" />
    <path fill="#00a85d" d="M16.57 3.5H7.43L0 16.5h9.14z" />
    <path fill="#ffd04b" d="M12 20l4.57-7.98H2.86L0 16.5z" />
  </svg>
);

export default function ComposeModal({ isOpen, onClose, initialData, assignedAddresses }: ComposeModalProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [senderMailboxes, setSenderMailboxes] = useState<{ email: string; name: string; signature?: string }[]>([]);
  const [senderLoading, setSenderLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

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

  // Attachment states
  const [attachments, setAttachments] = useState<{
    tempId: string;
    filename: string;
    contentType: string;
    size: number;
    key: string;
    isUploading?: boolean;
    error?: string;
  }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive states & scripts loader
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeGapi = () => {
      (window as any).gapi.load('picker', () => {
        setGapiLoaded(true);
      });
    };

    // Load Google API (gapi)
    if (!(window as any).gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = initializeGapi;
      document.body.appendChild(script);
    } else {
      initializeGapi();
    }

    // Load Google Identity Services (gis)
    if (!(window as any).google?.accounts?.oauth2) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setGisLoaded(true);
      document.body.appendChild(script);
    } else {
      setGisLoaded(true);
    }
  }, []);

  const handleGoogleDriveAttach = () => {
    if (!gapiLoaded || !gisLoaded) {
      alert('Las APIs de Google se están cargando. Por favor, intenta de nuevo en un momento.');
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const developerKey = process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY;

    if (!clientId || !developerKey) {
      alert('La integración con Google Drive no está completamente configurada en el cliente. Asegúrate de configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID y NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY en tus variables de entorno.');
      return;
    }

    if (googleAccessToken) {
      createPicker(googleAccessToken, developerKey);
    } else {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
          if (response.error !== undefined) {
            console.error('Error authenticating with Google:', response);
            return;
          }
          setGoogleAccessToken(response.access_token);
          createPicker(response.access_token, developerKey);
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const createPicker = (accessToken: string, developerKey: string) => {
    const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);

    const picker = new (window as any).google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(developerKey)
      .setCallback((data: any) => pickerCallback(data, accessToken))
      .build();
    picker.setVisible(true);
  };

  const pickerCallback = async (data: any, accessToken: string) => {
    if (data.action === (window as any).google.picker.Action.PICKED) {
      const doc = data.docs[0];
      const fileId = doc.id;
      const filename = doc.name;
      const mimeType = doc.mimeType;
      const size = doc.sizeBytes || 0;

      // Add temporary uploading item
      const tempId = crypto.randomUUID();
      setAttachments(prev => [
        ...prev,
        {
          tempId,
          filename,
          contentType: mimeType,
          size,
          key: '',
          isUploading: true,
        }
      ]);

      try {
        const res = await fetch('/api/attachments/google-drive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            accessToken,
            filename,
            mimeType,
            size,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          setAttachments(prev => prev.map(item => 
            item.tempId === tempId 
              ? { ...item, key: resData.key, isUploading: false }
              : item
          ));
        } else {
          setAttachments(prev => prev.map(item => 
            item.tempId === tempId 
              ? { ...item, isUploading: false, error: resData.error || 'Error al descargar desde Drive.' }
              : item
          ));
        }
      } catch (err) {
        console.error('Error downloading from Drive:', err);
        setAttachments(prev => prev.map(item => 
          item.tempId === tempId 
            ? { ...item, isUploading: false, error: 'Error de red.' }
            : item
        ));
      }
    }
  };


  // AI assistant states
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiFormat, setAiFormat] = useState<'html' | 'text'>('html');

  const handleGenerateAiText = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');

    try {
      const isReply = !!initialData?.subject;
      const payload: any = {
        action: isReply ? 'reply' : 'compose',
        promptText: aiPrompt,
        format: aiFormat,
      };

      if (isReply) {
        payload.emailContext = {
          from: initialData?.to || 'Desconocido',
          subject: initialData?.subject || 'Sin asunto',
          body: initialData?.bodyHtml || '',
        };
      }

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        let generatedText = data.text || '';
        
        if (aiFormat === 'text') {
          // Escape HTML content, then replace newlines with HTML linebreaks
          generatedText = generatedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
        } else {
          // Clean up markdown block quotes if returned
          generatedText = generatedText.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
        }

        if (!isReply) {
          const subjectMatch = generatedText.match(/^Asunto:\s*(.+)$/m);
          if (subjectMatch) {
            setSubject(subjectMatch[1].trim());
            generatedText = generatedText.replace(/^Asunto:\s*.+$/m, '').trim();
          }
        }

        if (editorRef.current) {
          if (isReply) {
            const quoteContent = initialData?.bodyHtml || '';
            editorRef.current.innerHTML = `${generatedText}<br><br>${quoteContent}`;
          } else {
            editorRef.current.innerHTML = generatedText;
          }
          setEditorContent(editorRef.current.innerHTML);
        }
        
        setAiPrompt('');
        setShowAiAssistant(false);
      } else {
        const errData = await res.json();
        setAiError(errData.error || 'Error al generar texto.');
      }
    } catch (err) {
      console.error('Error generating AI text:', err);
      setAiError('Error de red al comunicarse con el asistente de IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    interface TempAttachment {
      tempId: string;
      file?: File;
      filename: string;
      contentType: string;
      size: number;
      key: string;
      isUploading: boolean;
      error?: string;
    }

    const newAttachments: TempAttachment[] = files.map(file => {
      const tempId = crypto.randomUUID();
      return {
        tempId,
        file,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        key: '',
        isUploading: true,
      };
    });

    const validAttachments: TempAttachment[] = newAttachments.map(att => {
      if (att.size > maxSize) {
        return {
          ...att,
          isUploading: false,
          error: 'El archivo excede el límite de 10 MB.',
        };
      }
      return att;
    });

    setAttachments(prev => [
      ...prev,
      ...validAttachments.map(({ tempId, filename, contentType, size, key, isUploading, error }) => ({
        tempId,
        filename,
        contentType,
        size,
        key,
        isUploading,
        error
      }))
    ]);

    for (const att of validAttachments) {
      if (att.error || !att.file) continue;
      
      const formData = new FormData();
      formData.append('file', att.file);

      try {
        const res = await fetch('/api/attachments', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setAttachments(prev => prev.map(item => 
            item.tempId === att.tempId 
              ? { ...item, key: data.key, isUploading: false }
              : item
          ));
        } else {
          setAttachments(prev => prev.map(item => 
            item.tempId === att.tempId 
              ? { ...item, isUploading: false, error: data.error || 'Error al subir.' }
              : item
          ));
        }
      } catch (err) {
        setAttachments(prev => prev.map(item => 
          item.tempId === att.tempId 
            ? { ...item, isUploading: false, error: 'Error de red.' }
            : item
        ));
      }
    }
  };

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
      setDraftId(initialData.id || null);
      const normalizedAttachments = (initialData.attachments || []).map((att: any) => ({
        tempId: att.tempId || crypto.randomUUID(),
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        key: att.key || att.r2Url,
        isUploading: false,
      }));
      setAttachments(normalizedAttachments);
      if (editorRef.current) {
        editorRef.current.innerHTML = initialData.bodyHtml || '';
      }
      setEditorContent(initialData.bodyHtml || '');
      if (initialData.cc || initialData.bcc) {
        setShowCcBcc(true);
      }
    } else {
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setDraftId(null);
      setAttachments([]);
      setEditorContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
    setAutoSaveStatus('idle');
    setLastSavedTime(null);
  }, [initialData, isOpen]);

  // Debounced Auto-save Draft effect
  useEffect(() => {
    if (!isOpen || !from) return;

    // Check if there is any content to save (avoid blank draft creation spam)
    const hasContent = to.trim() || cc.trim() || bcc.trim() || subject.trim() || editorContent.trim() || attachments.length > 0;
    if (!hasContent) return;

    const delayDebounce = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        const bodyData = {
          id: draftIdRef.current || undefined,
          from,
          to: to.split(',').map(email => email.trim()).filter(Boolean),
          cc: cc ? cc.split(',').map(email => email.trim()).filter(Boolean) : [],
          bcc: bcc ? bcc.split(',').map(email => email.trim()).filter(Boolean) : [],
          subject: subject || '',
          bodyHtml: editorContent,
          bodyText: editorRef.current?.innerText || '',
          attachments: attachments.filter(att => !att.isUploading && !att.error && att.key),
          inReplyTo: initialData?.inReplyTo || undefined,
          references: initialData?.references || undefined,
        };

        const res = await fetch('/api/drafts', {
          method: draftIdRef.current ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.draftId) {
            setDraftId(data.draftId);
          }
          setAutoSaveStatus('saved');
          setLastSavedTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          setAutoSaveStatus('error');
        }
      } catch (err) {
        console.error('Error auto-saving draft:', err);
        setAutoSaveStatus('error');
      }
    }, 2000);

    return () => clearTimeout(delayDebounce);
  }, [from, to, cc, bcc, subject, editorContent, attachments, isOpen]);

  const handleDiscardDraft = async () => {
    const currentId = draftIdRef.current;
    if (currentId) {
      if (!confirm('¿Estás seguro de que deseas eliminar permanentemente este borrador?')) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/drafts?id=${currentId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          onClose();
        } else {
          const data = await res.json();
          setError(data.error || 'Error al eliminar el borrador.');
        }
      } catch (err) {
        setError('Error al conectar para eliminar el borrador.');
      } finally {
        setLoading(false);
      }
    } else {
      onClose();
    }
  };

  const updateSignature = (senderEmail: string, mailboxesList = senderMailboxes) => {
    if (!editorRef.current) return;
    const mailbox = mailboxesList.find(m => m.email === senderEmail);
    const signature = mailbox?.signature || '';

    let currentHtml = editorRef.current.innerHTML;

    const signatureRegex = /<div class=["']mail-signature["'] id=["']signature-block["']>([\s\S]*?)<\/div>/i;
    
    const newSignatureHtml = signature 
      ? `<div class="mail-signature" id="signature-block"><br><br>--<br>${signature.replace(/\n/g, '<br>')}</div>`
      : '<div class="mail-signature" id="signature-block"></div>';

    if (signatureRegex.test(currentHtml)) {
      currentHtml = currentHtml.replace(signatureRegex, newSignatureHtml);
    } else {
      const quoteIndex = currentHtml.indexOf('<hr ');
      if (quoteIndex !== -1) {
        currentHtml = currentHtml.slice(0, quoteIndex) + newSignatureHtml + currentHtml.slice(quoteIndex);
      } else {
        currentHtml = currentHtml + newSignatureHtml;
      }
    }

    editorRef.current.innerHTML = currentHtml;
    setEditorContent(currentHtml);
  };

  const handleFromChange = (newFrom: string) => {
    setFrom(newFrom);
    updateSignature(newFrom);
  };

  useEffect(() => {
    if (isOpen) {
      setSenderLoading(true);
      fetch('/api/mailboxes')
        .then(res => res.json())
        .then(data => {
          const list = data.mailboxes || [];
          setSenderMailboxes(list);
          if (list.length > 0) {
            const initialFrom = list[0].email;
            setFrom(initialFrom);
            
            // Wait brief moment for editor content to mount from initialData
            setTimeout(() => {
              if (!initialData?.id) {
                updateSignature(initialFrom, list);
              }
            }, 150);
          } else {
            setFrom('');
          }
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

    // Package the HTML with classic container styles so it looks correct on any client
    let finalHtml = htmlContent;
    if (editorRef.current) {
      const bg = editorRef.current.style.backgroundColor || '#ffffff';
      const fg = editorRef.current.style.color || '#1e293b';
      const font = editorRef.current.style.fontFamily || 'Arial, sans-serif';
      const cleanFg = fg === 'hsl(210 40% 88%)' || fg === 'rgb(212, 218, 232)' ? '#1e293b' : fg;
      
      finalHtml = `<div style="background-color: ${bg}; color: ${cleanFg}; font-family: ${font}; padding: 24px; min-height: 100%; line-height: 1.6; font-size: 14px;">${htmlContent}</div>`;
    }

    const activeAttachments = attachments
      .filter(att => !att.isUploading && !att.error && att.key)
      .map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        r2Url: att.key
      }));

    setLoading(true);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          from, 
          to: toArray, 
          cc: ccArray, 
          bcc: bccArray, 
          subject, 
          bodyHtml: finalHtml, 
          bodyText: textContent,
          attachments: activeAttachments,
          draftId: draftId || undefined,
          inReplyTo: initialData?.inReplyTo || undefined,
          references: initialData?.references || undefined,
        }),
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md border-2 border-dashed rounded-t-2xl sm:rounded-2xl pointer-events-none animate-fadeIn" style={{ borderColor: 'hsl(var(--primary)/0.5)' }}>
            <Upload className="h-10 w-10 animate-bounce mb-3" style={{ color: 'hsl(var(--primary))' }} />
            <p className="text-sm font-semibold text-white">Suelte los archivos aquí para adjuntar</p>
            <p className="text-xs text-white/50 mt-1">Límite de 10 MB por archivo</p>
          </div>
        )}
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
              {initialData?.forwardMode ? 'Reenviar correo' : initialData ? 'Responder correo' : 'Mensaje nuevo'}
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
                  onChange={(e) => handleFromChange(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600 }}
                >
                  {senderMailboxes.map((box, idx) => (
                    <option key={`${box.email || ''}-${idx}`} value={box.email} style={{ background: '#0a0f1e' }}>
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
            className="shrink-0 flex flex-wrap items-center gap-1.5 px-4 py-2 select-none border-b border-white/5 bg-white/[0.01]"
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
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/80 transition-colors" onMouseEnter={e => { e.currentTarget.style.background='hsl(var(--primary)/0.1)'; e.currentTarget.style.color='hsl(var(--primary))'; }} onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=''; }}
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
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white/80 transition-colors" onMouseEnter={e => { e.currentTarget.style.background='hsl(var(--primary)/0.1)'; e.currentTarget.style.color='hsl(var(--primary))'; }} onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=''; }}
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
                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--primary))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = ''; }}
                >
                  <Palette className="h-3.5 w-3.5" />
                </button>
                {showColorDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md p-2 shadow-2xl animate-fadeIn">
                    <div className="flex gap-1 mb-2 p-0.5 rounded-lg bg-white/5">
                      <button
                        type="button"
                        onClick={() => setSelectedColorTab('text')}
                        className={`flex-1 py-1 rounded-md text-[10px] font-semibold text-center transition-all ${selectedColorTab === 'text' ? 'text-white/60' : 'text-white/60 hover:text-white'}`}
                        style={selectedColorTab === 'text' ? { background: 'hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' } : {}}
                      >
                        Texto
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedColorTab('bg')}
                        className={`flex-1 py-1 rounded-md text-[10px] font-semibold text-center transition-all ${selectedColorTab === 'bg' ? 'text-white/60' : 'text-white/60 hover:text-white'}`}
                        style={selectedColorTab === 'bg' ? { background: 'hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))' } : {}}
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
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer" style={{ color: 'hsl(var(--primary))' }}
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Adjuntar archivo"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5" onMouseEnter={e => e.currentTarget.style.color='hsl(var(--primary))'} onMouseLeave={e => e.currentTarget.style.color=''}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Adjuntar desde Google Drive"
                onClick={handleGoogleDriveAttach}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-white/60 hover:bg-white/5" onMouseEnter={e => e.currentTarget.style.color='hsl(var(--primary))'} onMouseLeave={e => e.currentTarget.style.color=''}
              >
                <GoogleDriveIcon className="h-3.5 w-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFiles(Array.from(e.target.files));
                  }
                }}
                className="hidden"
                multiple
              />
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

          {/* AI Assistant Panel */}
          {showAiAssistant && (
            <div
              className="shrink-0 px-5 py-3.5 border-b border-white/5 space-y-3"
              style={{ background: 'rgba(45,212,191,0.02)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'hsl(var(--primary))' }}>
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  Asistente de Redacción Gemini IA
                </span>
                <button
                  type="button"
                  onClick={() => setShowAiAssistant(false)}
                  className="text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    initialData?.subject 
                      ? "Ej: Aceptar invitación cortésmente, pedir agendar para el miércoles..." 
                      : "Ej: Escribe un correo formal para solicitar el estado del proyecto..."
                  }
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerateAiText();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={aiLoading || !aiPrompt.trim()}
                  onClick={handleGenerateAiText}
                  className="px-4 py-2 disabled:opacity-50 text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1.5 rounded-xl"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    'Redactar'
                  )}
                </button>
              </div>

              {/* Format selection */}
              <div className="flex items-center gap-4 text-xs pt-1 select-none">
                <span className="font-semibold text-white/40">Formato:</span>
                <label className="flex items-center gap-1.5 text-white/80 cursor-pointer text-[11px] hover:text-white">
                  <input
                    type="radio"
                    name="aiFormat"
                    value="html"
                    checked={aiFormat === 'html'}
                    onChange={() => setAiFormat('html')}
                    style={{ accentColor: 'hsl(var(--primary))' }} className="cursor-pointer"
                  />
                  Formato enriquecido (HTML)
                </label>
                <label className="flex items-center gap-1.5 text-white/80 cursor-pointer text-[11px] hover:text-white">
                  <input
                    type="radio"
                    name="aiFormat"
                    value="text"
                    checked={aiFormat === 'text'}
                    onChange={() => setAiFormat('text')}
                    style={{ accentColor: 'hsl(var(--primary))' }} className="cursor-pointer"
                  />
                  Texto plano
                </label>
              </div>

              {aiError && (
                <p className="text-[11px] text-red-400 font-medium">{aiError}</p>
              )}
            </div>
          )}

          {/* Editor body */}
          <div
            className="flex-1 overflow-y-auto px-5 py-4 min-h-0"
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => setEditorContent(editorRef.current?.innerHTML || '')}
              onBlur={() => setEditorContent(editorRef.current?.innerHTML || '')}
              className="editor-content w-full min-h-[180px] leading-relaxed text-sm"
              data-placeholder="Comienza a escribir tu mensaje aquí..."
              style={{ color: 'hsl(210 40% 88%)', outline: 'none' }}
            />
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="shrink-0 px-5 py-2.5 space-y-2 max-h-[140px] overflow-y-auto border-t border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--primary))' }}>Archivos Adjuntos ({attachments.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att, idx) => {
                  const isImage = att.contentType.startsWith('image/');
                  const isPdf = att.contentType === 'application/pdf';
                  const hasError = !!att.error;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl border transition-all text-xs bg-white/5 border-white/5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Thumbnail / Icon */}
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 shrink-0 overflow-hidden">
                          {att.isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                          ) : hasError ? (
                            <X className="h-3.5 w-3.5 text-red-400" />
                          ) : isImage && att.key ? (
                            <img
                              src={`/api/attachments?key=${encodeURIComponent(att.key)}&filename=${encodeURIComponent(att.filename)}`}
                              alt={att.filename}
                              className="h-full w-full object-cover"
                            />
                          ) : isPdf ? (
                            <FileText className="h-4 w-4 text-red-400" />
                          ) : (
                            <FileText className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                          )}
                        </div>

                        {/* File Details */}
                        <div className="truncate">
                          <p className={`font-medium truncate ${hasError ? 'text-red-400' : 'text-white/80'}`} title={att.filename}>
                            {att.filename}
                          </p>
                          <p className="text-[10px] text-white/40">
                            {hasError ? att.error : formatBytes(att.size)}
                          </p>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachments(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="h-6 w-6 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            className="shrink-0 flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
              {/* AI Assistant Button */}
              <button
                type="button"
                title="Redactar con IA"
                onClick={() => setShowAiAssistant(!showAiAssistant)}
                className={`h-8 px-3.5 flex items-center gap-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0`}
                style={showAiAssistant
                  ? { background: 'hsl(var(--primary)/0.2)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary)/0.3)' }
                  : { background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary)/0.2)' }
                }
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Redactor IA</span>
              </button>

              <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

              <div className="flex items-center gap-2 text-[11px] text-white/50 truncate">
                {autoSaveStatus === 'saving' && (
                  <span className="flex items-center gap-1.5 animate-pulse font-medium shrink-0" style={{ color: 'hsl(var(--primary))' }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sincronizando...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="flex items-center gap-1.5 text-emerald-400/90 font-medium shrink-0">
                    <Check className="h-3.5 w-3.5" />
                    Sincronizado {lastSavedTime && `a las ${lastSavedTime}`}
                  </span>
                )}
                {autoSaveStatus === 'error' && (
                  <span className="text-red-400 font-medium shrink-0">
                    Error al sincronizar borrador
                  </span>
                )}
                {error && (
                  <span
                    className="px-2.5 py-1 rounded-lg truncate"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: 'hsl(0 78% 65%)',
                    }}
                    title={error}
                  >
                    {error}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={loading}
                onClick={handleDiscardDraft}
                className="h-8 w-8 flex items-center justify-center rounded-xl transition-all cursor-pointer text-white/40 hover:text-red-400 hover:bg-red-500/10 mr-1"
                title="Descartar borrador"
              >
                <Trash className="h-4 w-4" />
              </button>
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
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none"
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
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" style={{ '--tw-ring-color': 'hsl(var(--primary))' } as React.CSSProperties}
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
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md hover:opacity-90 active:scale-95 transition-transform cursor-pointer" style={{ background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))', color: 'hsl(var(--primary-foreground))' }}
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
                <Code className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
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
                  <Upload className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary))' }} />
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
                  className="flex-1 w-full p-4 rounded-xl text-xs font-mono bg-slate-950 border border-white/10 text-emerald-400 placeholder-white/20 focus:outline-none resize-none overflow-y-auto"
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
                    style={{ accentColor: 'hsl(var(--primary))' }}
                  />
                  <span>Reemplazar todo el contenido</span>
                </label>
                <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'insert'}
                    onChange={() => setImportMode('insert')}
                    style={{ accentColor: 'hsl(var(--primary))' }}
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold shadow-md hover:opacity-90 active:scale-95 transition-transform cursor-pointer" style={{ background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))', color: 'hsl(var(--primary-foreground))' }}
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
