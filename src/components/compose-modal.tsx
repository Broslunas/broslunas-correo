import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Bookmark,
  Plus,
  Trash2,
} from 'lucide-react';
import type { CannedTemplate } from '@/lib/templates';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    id?: string;
    from?: string;
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
  onQueueSend?: (payload: any) => void;
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

export default function ComposeModal({ isOpen, onClose, initialData, assignedAddresses, onQueueSend }: ComposeModalProps) {
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
  const [hasFullAccess, setHasFullAccess] = useState(assignedAddresses?.includes('*') || false);
  const [isCustomSender, setIsCustomSender] = useState(false);
  const [customFromName, setCustomFromName] = useState('');
  const [saveAsMailbox, setSaveAsMailbox] = useState(false);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Contacts Autocomplete
  const [contacts, setContacts] = useState<{ email: string; name: string }[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<{
    field: 'to' | 'cc' | 'bcc';
    query: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/contacts')
        .then(res => res.json())
        .then(data => {
          if (data.contacts) setContacts(data.contacts);
        })
        .catch(err => console.error('Error fetching contacts:', err));
    } else {
      setActiveSuggestion(null);
    }
  }, [isOpen]);

  const handleRecipientChange = (field: 'to' | 'cc' | 'bcc', val: string) => {
    if (field === 'to') setTo(val);
    else if (field === 'cc') setCc(val);
    else setBcc(val);

    const parts = val.split(',');
    const currentToken = parts[parts.length - 1].trim();
    if (currentToken.length >= 1) {
      setActiveSuggestion({ field, query: currentToken.toLowerCase() });
    } else {
      setActiveSuggestion(null);
    }
  };

  const handleSelectContact = (field: 'to' | 'cc' | 'bcc', contactEmail: string) => {
    const rawVal = field === 'to' ? to : field === 'cc' ? cc : bcc;
    const parts = rawVal.split(',');
    parts.pop();
    const prefix = parts.map(p => p.trim()).filter(Boolean);
    const newVal = [...prefix, contactEmail].join(', ') + ', ';

    if (field === 'to') setTo(newVal);
    else if (field === 'cc') setCc(newVal);
    else setBcc(newVal);

    setActiveSuggestion(null);
  };

  const matchingContacts = useMemo(() => {
    if (!activeSuggestion || !activeSuggestion.query) return [];
    const q = activeSuggestion.query;
    return contacts
      .filter(c => c.email.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [activeSuggestion, contacts]);

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

  // Templates States
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [predefinedTemplates, setPredefinedTemplates] = useState<CannedTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CannedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

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
      if (initialData.from) {
        setFrom(initialData.from);
      }
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
      setCustomFromName('');
      setSaveAsMailbox(false);
      setIsCustomSender(false);
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
          fromName: customFromName ? customFromName.trim() : undefined,
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
    if (assignedAddresses?.includes('*')) {
      setHasFullAccess(true);
    }
  }, [assignedAddresses]);

  useEffect(() => {
    if (isOpen) {
      setSenderLoading(true);
      fetch('/api/mailboxes')
        .then(res => res.json())
        .then(data => {
          const list = data.mailboxes || [];
          setSenderMailboxes(list);
          const fullAccessAllowed = !!(data.hasFullAccess || assignedAddresses?.includes('*'));
          if (fullAccessAllowed) {
            setHasFullAccess(true);
          }
          if (data.domains) {
            setAvailableDomains(data.domains);
          }
          if (list.length > 0) {
            const initialFrom = (initialData?.from && list.some((m: { email: string }) => m.email.toLowerCase() === initialData.from?.toLowerCase()))
              ? initialData.from
              : list[0].email;
            setFrom(initialFrom);

            // Wait brief moment for editor content to mount from initialData
            setTimeout(() => {
              if (!initialData?.id) {
                updateSignature(initialFrom, list);
              }
            }, 150);
          } else {
            setFrom(initialData?.from || '');
            if (fullAccessAllowed) {
              setIsCustomSender(true);
            }
          }
        })
        .catch(err => console.error('Error loading sender mailboxes:', err))
        .finally(() => setSenderLoading(false));
    }
  }, [isOpen, assignedAddresses]);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setPredefinedTemplates(data.predefined || []);
        setCustomTemplates(data.custom || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
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
        const el = document.createElement('div');
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

  const handleApplyTemplate = (template: CannedTemplate) => {
    if (!subject.trim() && template.subject) {
      setSubject(template.subject);
    }
    insertHtmlAtCursor(template.bodyHtml);
    setShowTemplatesDropdown(false);
  };

  const handleSaveCustomTemplate = async () => {
    if (!newTemplateTitle.trim() || !editorRef.current) return;
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTemplateTitle.trim(),
          subject: subject || '',
          bodyHtml: editorRef.current.innerHTML || '',
        }),
      });
      if (res.ok) {
        setNewTemplateTitle('');
        setShowSaveTemplateModal(false);
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteCustomTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomTemplates(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting template:', err);
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

    if (attachments.some(att => att.isUploading)) {
      setError('Espera a que terminen de subirse los archivos adjuntos.');
      return;
    }

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

    const payload = {
      from,
      fromName: customFromName ? customFromName.trim() : undefined,
      saveMailbox: saveAsMailbox,
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
    };

    if (onQueueSend) {
      onQueueSend(payload);
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    color: 'inherit',
    fontSize: '13px',
    width: '100%',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid hsl(var(--border))',
  };

  return (
    /* Backdrop overlay on mobile */
    <div
      className={`fixed inset-0 z-50 flex transition-all duration-300 ${isMaximized ? 'items-center justify-center p-4 bg-black/40' : 'items-end sm:items-end sm:justify-end sm:p-4'}`}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="w-full flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slideInUp bg-card border border-border text-foreground shadow-2xl"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          pointerEvents: 'auto',
          height: isMaximized ? '94vh' : 'min(90vh, 700px)',
          width: isMaximized ? '95vw' : 'auto',
          maxWidth: isMaximized ? 'none' : '42rem',
          minWidth: isMaximized ? 'none' : 'min(100vw, 640px)',
          position: 'relative',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md border-2 border-dashed border-primary rounded-t-2xl sm:rounded-2xl pointer-events-none animate-fadeIn">
            <Upload className="h-10 w-10 animate-bounce mb-3 text-primary" />
            <p className="text-sm font-semibold text-foreground">Suelte los archivos aquí para adjuntar</p>
            <p className="text-xs text-muted-foreground mt-1">Límite de 10 MB por archivo</p>
          </div>
        )}

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
              <PenSquare className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
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
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
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
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Fields */}
          <div className="shrink-0 px-5 py-1 border-b border-border bg-card">
            {/* FROM */}
            <div style={rowStyle}>
              <span className="text-xs font-medium w-14 shrink-0 text-muted-foreground">De:</span>
              {senderLoading ? (
                <span className="text-xs animate-pulse text-muted-foreground">Cargando...</span>
              ) : senderMailboxes.length === 0 && !hasFullAccess ? (
                <span className="text-xs font-semibold text-destructive">
                  Sin cuentas de correo registradas.
                </span>
              ) : isCustomSender ? (
                <div className="flex-1 flex flex-wrap items-center gap-2 py-0.5">
                  <div className="flex-1 flex items-center min-w-[180px]">
                    <input
                      type="email"
                      required
                      value={from}
                      onChange={(e) => handleFromChange(e.target.value)}
                      placeholder={availableDomains.length > 0 ? `nuevo@${availableDomains[0]}` : "nuevo@dominio.com"}
                      style={{ ...inputStyle, fontWeight: 600 }}
                      className="text-foreground placeholder:text-muted-foreground"
                      list="compose-allowed-domains"
                    />
                    {availableDomains.length > 0 && (
                      <datalist id="compose-allowed-domains">
                        {availableDomains.map((d, i) => (
                          <option key={i} value={`contacto@${d}`} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customFromName}
                    onChange={(e) => setCustomFromName(e.target.value)}
                    placeholder="Nombre (opcional)"
                    style={{ ...inputStyle, width: '130px' }}
                    className="text-foreground placeholder:text-muted-foreground text-xs"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveAsMailbox}
                      onChange={(e) => setSaveAsMailbox(e.target.checked)}
                      className="rounded border-border accent-primary cursor-pointer"
                    />
                    <span>Guardar cuenta</span>
                  </label>
                  {senderMailboxes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSender(false);
                        handleFromChange(senderMailboxes[0].email);
                      }}
                      className="text-[11px] text-primary hover:underline cursor-pointer ml-auto shrink-0"
                    >
                      Elegir existente
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={from}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomSender(true);
                        setFrom('');
                      } else {
                        handleFromChange(e.target.value);
                      }
                    }}
                    style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600, flex: 1 }}
                    className="bg-card text-foreground"
                  >
                    {senderMailboxes.map((box, idx) => (
                      <option key={`${box.email || ''}-${idx}`} value={box.email} className="bg-card text-foreground">
                        {box.name} &lt;{box.email}&gt;
                      </option>
                    ))}
                    {hasFullAccess && (
                      <option value="__custom__" className="bg-card text-primary font-semibold">
                        + Nueva dirección sin cuenta...
                      </option>
                    )}
                  </select>
                  {hasFullAccess && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSender(true);
                        setFrom('');
                      }}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Crear o redactar desde un correo sin cuenta"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Sin cuenta</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TO */}
            <div style={rowStyle} className="relative">
              <span className="text-xs font-medium w-14 shrink-0 text-muted-foreground">Para:</span>
              <input
                type="text"
                required
                value={to}
                onChange={(e) => handleRecipientChange('to', e.target.value)}
                onFocus={() => {
                  const token = to.split(',').pop()?.trim() || '';
                  if (token) setActiveSuggestion({ field: 'to', query: token.toLowerCase() });
                }}
                onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                placeholder="destinatario@ejemplo.com"
                style={{ ...inputStyle, flex: 1 }}
                className="text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline transition-colors cursor-pointer shrink-0"
              >
                CC/CCO {showCcBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {activeSuggestion?.field === 'to' && matchingContacts.length > 0 && (
                <div className="absolute left-14 top-full mt-1 w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-fadeIn">
                  {matchingContacts.map((contact, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectContact('to', contact.email);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted/80 flex flex-col transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-medium text-foreground">{contact.name || contact.email}</span>
                      <span className="text-[11px] text-muted-foreground">{contact.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CC/BCC */}
            {showCcBcc && (
              <>
                <div style={rowStyle} className="relative">
                  <span className="text-xs font-medium w-14 shrink-0 text-muted-foreground">CC:</span>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => handleRecipientChange('cc', e.target.value)}
                    onFocus={() => {
                      const token = cc.split(',').pop()?.trim() || '';
                      if (token) setActiveSuggestion({ field: 'cc', query: token.toLowerCase() });
                    }}
                    onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                    placeholder="copia@ejemplo.com"
                    style={{ ...inputStyle, flex: 1 }}
                    className="text-foreground placeholder:text-muted-foreground"
                  />
                  {activeSuggestion?.field === 'cc' && matchingContacts.length > 0 && (
                    <div className="absolute left-14 top-full mt-1 w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-fadeIn">
                      {matchingContacts.map((contact, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectContact('cc', contact.email);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-muted/80 flex flex-col transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-medium text-foreground">{contact.name || contact.email}</span>
                          <span className="text-[11px] text-muted-foreground">{contact.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={rowStyle} className="relative">
                  <span className="text-xs font-medium w-14 shrink-0 text-muted-foreground">CCO:</span>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => handleRecipientChange('bcc', e.target.value)}
                    onFocus={() => {
                      const token = bcc.split(',').pop()?.trim() || '';
                      if (token) setActiveSuggestion({ field: 'bcc', query: token.toLowerCase() });
                    }}
                    onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                    placeholder="copiaoculta@ejemplo.com"
                    style={{ ...inputStyle, flex: 1 }}
                    className="text-foreground placeholder:text-muted-foreground"
                  />
                  {activeSuggestion?.field === 'bcc' && matchingContacts.length > 0 && (
                    <div className="absolute left-14 top-full mt-1 w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-fadeIn">
                      {matchingContacts.map((contact, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectContact('bcc', contact.email);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-muted/80 flex flex-col transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-medium text-foreground">{contact.name || contact.email}</span>
                          <span className="text-[11px] text-muted-foreground">{contact.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* SUBJECT */}
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span className="text-xs font-medium w-14 shrink-0 text-muted-foreground">Asunto:</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del correo"
                style={{ ...inputStyle, flex: 1, fontWeight: 600 }}
                className="text-foreground placeholder:text-muted-foreground font-semibold"
              />
            </div>
          </div>

          {/* Formatting toolbar */}
          <div
            className="shrink-0 flex flex-wrap items-center gap-1.5 px-4 py-2 select-none border-b border-border bg-muted/30"
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
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Rehacer"
                onClick={() => handleFormat('redo')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-border mx-1 shrink-0" />

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
                  className="h-7 px-2 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-foreground bg-card border border-border hover:bg-muted"
                >
                  <span className="truncate max-w-[70px]">Fuente</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showFontDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-xl border border-border bg-card p-1 shadow-2xl animate-fadeIn">
                    {fontFamilies.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => handleFontFamily(f.value)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
                  className="h-7 px-2 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-foreground bg-card border border-border hover:bg-muted"
                >
                  <span>Tamaño</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showSizeDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-28 rounded-xl border border-border bg-card p-1 shadow-2xl animate-fadeIn">
                    {fontSizes.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => handleFontSize(s.value)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-4 w-px bg-border mx-1 shrink-0" />

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
                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  <Palette className="h-3.5 w-3.5" />
                </button>
                {showColorDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl border border-border bg-card p-2 shadow-2xl animate-fadeIn">
                    <div className="flex gap-1 mb-2 p-0.5 rounded-lg bg-muted">
                      <button
                        type="button"
                        onClick={() => setSelectedColorTab('text')}
                        className={`flex-1 py-1 rounded-md text-[10px] font-semibold text-center transition-all ${selectedColorTab === 'text' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Texto
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedColorTab('bg')}
                        className={`flex-1 py-1 rounded-md text-[10px] font-semibold text-center transition-all ${selectedColorTab === 'bg' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
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
                          className="h-6 w-6 rounded-md border border-border hover:scale-110 active:scale-95 transition-all cursor-pointer"
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
                        className="h-6 w-6 rounded-md border border-border bg-transparent flex items-center justify-center text-[9px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-4 w-px bg-border mx-1 shrink-0" />

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
                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-border mx-1 shrink-0" />

            {/* GROUP 5: Lists & Layout */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title="Lista con viñetas"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('insertUnorderedList')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Lista numerada"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('insertOrderedList')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Reducir sangría"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('outdent')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span className="text-[10px] font-bold">«</span>
              </button>
              <button
                type="button"
                title="Aumentar sangría"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('indent')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span className="text-[10px] font-bold">»</span>
              </button>
              <button
                type="button"
                title="Cita"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('formatBlock', 'blockquote')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-border mx-1 shrink-0" />

            {/* GROUP 6: Extras (Link, HTML Import, Clean format) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title="Insertar enlace"
                onClick={handleOpenLinkModal}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Importar HTML"
                onClick={() => setShowHtmlModal(true)}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-primary hover:bg-muted"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Adjuntar archivo"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-primary"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Adjuntar desde Google Drive"
                onClick={handleGoogleDriveAttach}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-primary"
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

              {/* Canned Templates Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  title="Plantillas y respuestas predefinidas"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTemplatesDropdown(!showTemplatesDropdown);
                    setShowColorDropdown(false);
                    setShowFontDropdown(false);
                    setShowSizeDropdown(false);
                  }}
                  className={`h-7 px-2 flex items-center gap-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    showTemplatesDropdown
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-[11px]">Plantillas</span>
                </button>

                {showTemplatesDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTemplatesDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1 z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-2xl animate-fadeIn space-y-2">
                      <div className="flex items-center justify-between px-1 pb-1 border-b border-border/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Plantillas de respuesta
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTemplatesDropdown(false);
                            setShowSaveTemplateModal(true);
                          }}
                          className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Guardar actual
                        </button>
                      </div>

                      {/* Custom user templates */}
                      {customTemplates.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-primary px-1 mb-1">Mis plantillas</p>
                          <div className="space-y-0.5">
                            {customTemplates.map((tmpl) => (
                              <div
                                key={tmpl.id}
                                onClick={() => handleApplyTemplate(tmpl)}
                                className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-muted text-foreground text-xs cursor-pointer transition-colors"
                              >
                                <div className="truncate min-w-0 pr-1">
                                  <p className="font-medium truncate">{tmpl.title}</p>
                                  {tmpl.subject && (
                                    <p className="text-[10px] text-muted-foreground truncate">{tmpl.subject}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  title="Eliminar plantilla"
                                  onClick={(e) => handleDeleteCustomTemplate(tmpl.id, e)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Predefined templates */}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground px-1 mb-1">Predefinidas</p>
                        <div className="space-y-0.5">
                          {predefinedTemplates.map((tmpl) => (
                            <div
                              key={tmpl.id}
                              onClick={() => handleApplyTemplate(tmpl)}
                              className="p-1.5 rounded-lg hover:bg-muted text-foreground text-xs cursor-pointer transition-colors"
                            >
                              <p className="font-medium truncate">{tmpl.title}</p>
                              {tmpl.subject && (
                                <p className="text-[10px] text-muted-foreground truncate">{tmpl.subject}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                title="Eliminar formato"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('removeFormat')}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* AI Assistant Panel */}
          {showAiAssistant && (
            <div className="shrink-0 px-5 py-3.5 border-b border-border bg-muted/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  Asistente de Redacción IA
                </span>
                <button
                  type="button"
                  onClick={() => setShowAiAssistant(false)}
                  className="text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
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
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="px-4 py-2 disabled:opacity-50 text-xs font-bold shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
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
                <span className="font-semibold text-muted-foreground">Formato:</span>
                <label className="flex items-center gap-1.5 text-foreground cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="aiFormat"
                    value="html"
                    checked={aiFormat === 'html'}
                    onChange={() => setAiFormat('html')}
                    className="cursor-pointer accent-primary"
                  />
                  Formato enriquecido (HTML)
                </label>
                <label className="flex items-center gap-1.5 text-foreground cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="aiFormat"
                    value="text"
                    checked={aiFormat === 'text'}
                    onChange={() => setAiFormat('text')}
                    className="cursor-pointer accent-primary"
                  />
                  Texto plano
                </label>
              </div>

              {aiError && (
                <p className="text-[11px] text-destructive font-medium">{aiError}</p>
              )}
            </div>
          )}

          {/* Editor body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 bg-card">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => setEditorContent(editorRef.current?.innerHTML || '')}
              onBlur={() => setEditorContent(editorRef.current?.innerHTML || '')}
              className="editor-content w-full min-h-[180px] leading-relaxed text-sm text-foreground outline-none"
              data-placeholder="Comienza a escribir tu mensaje aquí..."
            />
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="shrink-0 px-5 py-2.5 space-y-2 max-h-[140px] overflow-y-auto border-t border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Archivos Adjuntos ({attachments.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att, idx) => {
                  const isImage = att.contentType.startsWith('image/');
                  const isPdf = att.contentType === 'application/pdf';
                  const hasError = !!att.error;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl border border-border bg-card transition-all text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Thumbnail / Icon */}
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted border border-border shrink-0 overflow-hidden">
                          {att.isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : hasError ? (
                            <X className="h-3.5 w-3.5 text-destructive" />
                          ) : isImage && att.key ? (
                            <img
                              src={`/api/attachments?key=${encodeURIComponent(att.key)}&filename=${encodeURIComponent(att.filename)}`}
                              alt={att.filename}
                              className="h-full w-full object-cover"
                            />
                          ) : isPdf ? (
                            <FileText className="h-4 w-4 text-destructive" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary" />
                          )}
                        </div>

                        {/* File Details */}
                        <div className="truncate">
                          <p className={`font-medium truncate ${hasError ? 'text-destructive' : 'text-foreground'}`} title={att.filename}>
                            {att.filename}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
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
                        className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer"
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
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border bg-card">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
              {/* AI Assistant Button */}
              <button
                type="button"
                title="Redactar con IA"
                onClick={() => setShowAiAssistant(!showAiAssistant)}
                className={`h-8 px-3.5 flex items-center gap-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  showAiAssistant
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Redactor IA</span>
              </button>

              <div className="h-4 w-px bg-border mx-1 shrink-0" />

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                {autoSaveStatus === 'saving' && (
                  <span className="flex items-center gap-1.5 animate-pulse font-medium shrink-0 text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sincronizando...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                    <Check className="h-3.5 w-3.5" />
                    Sincronizado {lastSavedTime && `a las ${lastSavedTime}`}
                  </span>
                )}
                {autoSaveStatus === 'error' && (
                  <span className="text-destructive font-medium shrink-0">
                    Error al sincronizar borrador
                  </span>
                )}
                {error && (
                  <span
                    className="px-2.5 py-1 rounded-lg truncate bg-destructive/10 border border-destructive/20 text-destructive"
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
                className="h-8 w-8 flex items-center justify-center rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 mr-1"
                title="Descartar borrador"
              >
                <Trash className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer bg-muted hover:bg-muted/80 text-foreground border border-border"
              >
                Cancelar
              </button>
              <button
                id="btn-send-email"
                type="submit"
                disabled={loading || attachments.some(att => att.isUploading)}
                title={attachments.some(att => att.isUploading) ? 'Espera a que terminen de subirse los archivos adjuntos' : 'Enviar correo'}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer bg-primary text-primary-foreground shadow-sm"
              >
                {attachments.some(att => att.isUploading) ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Subiendo archivos...
                  </>
                ) : loading ? (
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
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl animate-fadeInUp text-foreground">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-foreground">Insertar Enlace</h4>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleInsertLink} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Texto a mostrar</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Texto del enlace"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Dirección URL</label>
                  <input
                    type="text"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold shadow-xs hover:opacity-90 active:scale-95 transition-transform cursor-pointer bg-primary text-primary-foreground"
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
          <div className="absolute inset-0 z-50 flex flex-col p-5 bg-card/95 backdrop-blur-md text-foreground">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Importar Código HTML</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHtmlModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* File upload section */}
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-muted/40 border border-border">
                <div>
                  <span className="block text-xs font-medium text-foreground">Cargar desde un archivo</span>
                  <span className="block text-[10px] text-muted-foreground">Selecciona un archivo HTML local (.html)</span>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-foreground hover:bg-muted cursor-pointer transition-colors">
                  <Upload className="h-3.5 w-3.5 text-primary" />
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
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  O pega el código HTML directamente:
                </label>
                <textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  placeholder={`<div style="font-family: Arial, sans-serif; padding: 20px;">\n  <h1>¡Hola!</h1>\n  <p>Este es un correo diseñado...</p>\n</div>`}
                  className="flex-1 w-full p-4 rounded-xl text-xs font-mono bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none resize-none overflow-y-auto"
                />
              </div>

              {/* Import Options */}
              <div className="flex items-center gap-6 p-1 text-xs">
                <label className="flex items-center gap-2 text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="cursor-pointer accent-primary"
                  />
                  <span>Reemplazar todo el contenido</span>
                </label>
                <label className="flex items-center gap-2 text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'insert'}
                    onChange={() => setImportMode('insert')}
                    className="cursor-pointer accent-primary"
                  />
                  <span>Insertar en la posición del cursor</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowHtmlModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportHtml}
                  className="px-5 py-2 rounded-xl text-xs font-semibold shadow-xs hover:opacity-90 active:scale-95 transition-transform cursor-pointer bg-primary text-primary-foreground"
                >
                  Importar HTML
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Custom Template Modal */}
        {showSaveTemplateModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl animate-fadeInUp text-foreground space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Guardar como Plantilla</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Guarda el contenido y asunto actuales como plantilla personalizada reutilizable.
              </p>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Nombre de la plantilla
                </label>
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Ej: Agradecimiento reunión, Presupuesto base..."
                  className="w-full rounded-xl px-3 py-2 text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!newTemplateTitle.trim() || savingTemplate}
                  onClick={handleSaveCustomTemplate}
                  className="px-4 py-1.5 rounded-xl text-xs bg-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingTemplate ? 'Guardando...' : 'Guardar plantilla'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
