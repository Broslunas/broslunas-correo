'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import ComposeModal from '@/components/compose-modal';
import TwoFactorModal from '@/components/two-factor-modal';
import {
  Settings as SettingsIcon,
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
  ShieldCheck,
  ShieldAlert,
  Bell,
  BellOff,
  Filter,
  Trash2,
  Plus,
  KeyRound,
  Shield,
  Smartphone,
  Info,
  Volume2,
  Keyboard,
  RotateCcw,
  Edit3,
  Search,
  X
} from 'lucide-react';
import {
  getAllShortcuts,
  getCustomShortcuts,
  saveCustomShortcuts,
  resetAllShortcuts,
  CATEGORY_LABELS,
  ShortcutCategory,
  ShortcutDefinition,
  formatKeyBadge,
  eventToShortcutString
} from '@/lib/shortcuts';

interface MailboxSettings {
  email: string;
  autoReplyEnabled: boolean;
  autoReplySubject: string;
  autoReplyBody: string;
  signature: string;
}

interface User2FAStatus {
  enabled: boolean;
  email: string;
  name: string;
  picture: string;
  qrCodeUrl?: string;
  secret?: string;
  require2FA: boolean;
}

interface RoutingRule {
  id: string;
  field: 'subject' | 'from' | 'body';
  matchType: 'contains' | 'equals';
  value: string;
  action: 'folder' | 'spam' | 'delete';
  folder: string;
}

const themes = [
  {
    id: 'light',
    name: 'Modo Claro (Gmail White)',
    desc: 'Fondo blanco y gris suave, tipografía nítida y acentos Google Blue estilo Gmail Material 3.',
    icon: Sun,
    primary: '#0b57d0',
    accent: '#d3e3fd',
    bg: '#f6f8fc',
    dark: false,
  },
  {
    id: 'dark',
    name: 'Modo Oscuro (Gmail Dark)',
    desc: 'Fondo negro y carbón profundo, acentos azul suave y descanso visual profesional.',
    icon: Moon,
    primary: '#a8c7fa',
    accent: '#004a77',
    bg: '#111318',
    dark: true,
  },
];

type SettingsTab = 'general' | 'accounts' | 'security' | 'notifications' | 'rules' | 'shortcuts';
const VALID_TABS: SettingsTab[] = ['general', 'accounts', 'security', 'notifications', 'rules', 'shortcuts'];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page') as SettingsTab | null;
  const initialTab: SettingsTab = pageParam && VALID_TABS.includes(pageParam) ? pageParam : 'general';

  const [composeOpen, setComposeOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string; picture: string; role: string; twoFactorEnabled: boolean; assignedAddresses: string[] } | null>(null);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);

  // Navigation states
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab with URL search parameter (?page=...)
  useEffect(() => {
    const p = searchParams.get('page') as SettingsTab | null;
    if (p && VALID_TABS.includes(p) && p !== activeTab) {
      setActiveTab(p);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.replace(`/settings?page=${tab}`, { scroll: false });
  };

  // Shortcuts state
  const [shortcutsList, setShortcutsList] = useState<ShortcutDefinition[]>([]);
  const [shortcutSearch, setShortcutSearch] = useState('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingChordFirstKey, setRecordingChordFirstKey] = useState<string>('');

  useEffect(() => {
    setShortcutsList(getAllShortcuts());
    const onUpdate = () => setShortcutsList(getAllShortcuts());
    window.addEventListener('shortcuts-updated', onUpdate);
    return () => window.removeEventListener('shortcuts-updated', onUpdate);
  }, []);

  // Push status
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  // Theme selection
  const [selectedTheme, setSelectedTheme] = useState('light');

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

  // 2FA Security states (in-line configuration)
  const [status2FA, setStatus2FA] = useState<User2FAStatus | null>(null);
  const [loading2FA, setLoading2FA] = useState(false);
  const [actionLoading2FA, setActionLoading2FA] = useState(false);
  const [totpCode, setTotpCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sessions list (mock data + control)
  const [sessions, setSessions] = useState([
    { id: '1', device: 'Chrome en Windows 11', ip: '84.120.45.19', date: 'Activo ahora', current: true },
    { id: '2', device: 'Safari en iPhone 14 Pro', ip: '80.34.12.189', date: 'Hace 4 horas', current: false },
    { id: '3', device: 'iPad Pro en iOS 17', ip: '80.34.12.189', date: 'Ayer, 18:42', current: false }
  ]);

  // Passkeys states
  interface PasskeyInfo {
    _id: string;
    name: string;
    createdAt: string;
    lastUsedAt?: string;
  }
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  // Blocked Senders Blacklist
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [newBlockedEmail, setNewBlockedEmail] = useState('');

  // Notifications volume and sound options
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [alertVolume, setAlertVolume] = useState(70);

  // Routing Rules (Filtros y Reglas)
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  // Form to create rules
  const [newRuleField, setNewRuleField] = useState<'subject' | 'from' | 'body'>('subject');
  const [newRuleMatchType, setNewRuleMatchType] = useState<'contains' | 'equals'>('contains');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<'folder' | 'spam' | 'delete'>('folder');
  const [newRuleFolder, setNewRuleFolder] = useState('work');

  // Shortcut recording effect
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingId(null);
        setRecordingChordFirstKey('');
        return;
      }

      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      const isModifierCombo = e.ctrlKey || e.altKey || e.metaKey || (e.shiftKey && e.key.length > 1);

      if (isModifierCombo) {
        const combo = eventToShortcutString(e);
        if (combo) {
          saveShortcutKey(recordingId, combo);
        }
        return;
      }

      // Single key or chord
      const pressed = e.key;
      if (pressed === 'Enter' && recordingChordFirstKey) {
        saveShortcutKey(recordingId, recordingChordFirstKey);
        return;
      }

      if (!recordingChordFirstKey && (pressed === 'g' || pressed === '*')) {
        setRecordingChordFirstKey(pressed);
        return;
      }

      if (recordingChordFirstKey) {
        const combo = `${recordingChordFirstKey} ${pressed}`;
        saveShortcutKey(recordingId, combo);
        return;
      }

      // Single normal key
      saveShortcutKey(recordingId, pressed);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingId, recordingChordFirstKey]);

  const saveShortcutKey = (id: string, newKey: string) => {
    const current = getCustomShortcuts();
    current[id] = newKey;
    saveCustomShortcuts(current);
    setRecordingId(null);
    setRecordingChordFirstKey('');
    setSuccess(`Atajo guardado: ${newKey}`);
    setTimeout(() => setSuccess(''), 2500);
  };

  const handleResetSingleShortcut = (id: string) => {
    const current = getCustomShortcuts();
    delete current[id];
    saveCustomShortcuts(current);
    setSuccess('Atajo restablecido al valor predeterminado');
    setTimeout(() => setSuccess(''), 2500);
  };

  const handleResetAllShortcuts = () => {
    if (confirm('¿Deseas restablecer todos los atajos de teclado a los valores predeterminados?')) {
      resetAllShortcuts();
      setSuccess('Todos los atajos se han restablecido');
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  // Load theme & settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setSelectedTheme(isDark ? 'dark' : 'light');

      const handleThemeSync = () => {
        setSelectedTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      };
      window.addEventListener('theme-change', handleThemeSync);

      // Blacklist load from API (falling back to localStorage)
      fetch('/api/user/blacklist')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.blacklist)) {
            setBlacklist(data.blacklist);
          } else {
            const savedBlacklist = localStorage.getItem('webmail_blacklist');
            if (savedBlacklist) setBlacklist(JSON.parse(savedBlacklist));
          }
        })
        .catch(() => {
          const savedBlacklist = localStorage.getItem('webmail_blacklist');
          if (savedBlacklist) setBlacklist(JSON.parse(savedBlacklist));
        });

      // Rules load
      const savedRules = localStorage.getItem('webmail_routing_rules');
      if (savedRules) {
        setRoutingRules(JSON.parse(savedRules));
      } else {
        const defaultRules: RoutingRule[] = [
          { id: 'r1', field: 'subject', matchType: 'contains', value: 'reunión', action: 'folder', folder: 'work' },
          { id: 'r2', field: 'from', matchType: 'contains', value: 'linkedin.com', action: 'folder', folder: 'social' }
        ];
        setRoutingRules(defaultRules);
        localStorage.setItem('webmail_routing_rules', JSON.stringify(defaultRules));
      }

      // Sound alerts preference load
      const soundPref = localStorage.getItem('webmail_sound_alert') !== 'false';
      setSoundAlertEnabled(soundPref);
      const soundVol = Number(localStorage.getItem('webmail_sound_volume') || '70');
      setAlertVolume(soundVol);
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

  // Load 2FA status when Security tab active
  const fetch2FAStatus = async () => {
    setLoading2FA(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/2fa/verify');
      if (res.ok) {
        const data = await res.json();
        setStatus2FA(data);
        setTotpCode(['', '', '', '', '', '']);
      } else {
        setError('No se pudo cargar la configuración de seguridad 2FA.');
      }
    } catch (err) {
      console.error('Error fetching 2FA:', err);
      setError('Error de red al consultar seguridad.');
    } finally {
      setLoading2FA(false);
    }
  };

  const fetchPasskeys = async () => {
    setLoadingPasskeys(true);
    try {
      const res = await fetch('/api/auth/passkey');
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data.passkeys || []);
      }
    } catch (err) {
      console.error('Error fetching passkeys:', err);
    } finally {
      setLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      fetch2FAStatus();
      fetchPasskeys();
    }
  }, [activeTab]);

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
    const isDark = themeId === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('webmail_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('webmail_theme', 'light');
    }
    setSelectedTheme(themeId);
    window.dispatchEvent(new Event('theme-change'));
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
        setSuccess('Configuración de la firma/respuesta automática guardada correctamente.');
        // Update local availableAccounts signatures
        setAvailableAccounts(prev => prev.map(m => m.email === selectedEmail ? { ...m, signature: signatureText } : m));
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
      const data = await res.json();
      if (res.ok && !data.error) {
        setAutoReplySubject(data.subject || '');
        setAutoReplyBody(data.body || '');
        setSuccess('Plantilla de respuesta automática generada con éxito con IA.');
        setShowAiInput(false);
      } else {
        setError(data.error || 'No se pudo generar la respuesta automática con IA.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el asistente de IA.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Enable 2FA TOTP verification
  const handleVerify2FACode = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = totpCode.join('');
    if (fullCode.length !== 6) {
      setError('Por favor, ingresa los 6 dígitos.');
      return;
    }

    setError('');
    setActionLoading2FA(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('¡Verificación en dos pasos (2FA) activada correctamente!');
        if (user) setUser({ ...user, twoFactorEnabled: true });
        fetch2FAStatus();
      } else {
        setError(data.error || 'Código incorrecto. Verifica los dígitos e intenta de nuevo.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al comunicar con el servidor de seguridad.');
    } finally {
      setActionLoading2FA(false);
    }
  };

  // Disable 2FA TOTP
  const handleDisable2FA = async () => {
    if (!confirm('¿Estás seguro de que deseas desactivar la verificación en dos pasos (2FA)? Tu cuenta estará desprotegida.')) {
      return;
    }

    setError('');
    setActionLoading2FA(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Autenticación en dos pasos desactivada con éxito.');
        if (user) setUser({ ...user, twoFactorEnabled: false });
        fetch2FAStatus();
      } else {
        setError(data.error || 'No se pudo desactivar el doble factor.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al desactivar 2FA.');
    } finally {
      setActionLoading2FA(false);
    }
  };

  const handleRegisterPasskey = async () => {
    const keyName = prompt('Introduce un nombre descriptivo para esta llave de paso (ej. "Mi MacBook TouchID", "Llave USB Yubikey"):');
    if (keyName === null) return; // Cancelled
    const name = keyName.trim() || `Llave de paso (${new Date().toLocaleDateString('es-ES')})`;

    setRegisteringPasskey(true);
    setError('');
    setSuccess('');

    try {
      const optionsRes = await fetch('/api/auth/passkey/register/options');
      if (!optionsRes.ok) {
        const errData = await optionsRes.json();
        throw new Error(errData.error || 'No se pudieron obtener las opciones de registro.');
      }
      const options = await optionsRes.json();

      const { startRegistration } = await import('@simplewebauthn/browser');

      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, name }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'La verificación de la llave de paso falló.');
      }

      setSuccess('¡Llave de paso registrada con éxito!');
      fetchPasskeys();
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Error al registrar la llave de paso.');
      }
    } finally {
      setRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta llave de paso? Ya no podrás usarla para iniciar sesión.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/passkey', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Llave de paso eliminada correctamente.');
        fetchPasskeys();
      } else {
        throw new Error(data.error || 'No se pudo eliminar la llave de paso.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al eliminar la llave de paso.');
    }
  };

  // Helper to type digit in inline 2FA boxes
  const handleTotpBoxChange = (index: number, value: string) => {
    if (value && isNaN(Number(value))) return;

    const newCode = [...totpCode];
    newCode[index] = value.slice(-1);
    setTotpCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Helper for 2FA backspace boxes
  const handleTotpBoxKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!totpCode[index] && index > 0) {
        const newCode = [...totpCode];
        newCode[index - 1] = '';
        setTotpCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...totpCode];
        newCode[index] = '';
        setTotpCode(newCode);
      }
    }
  };

  // Helper to block email sender
  const handleAddToBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedEmail.trim() || !newBlockedEmail.includes('@')) {
      alert('Por favor introduce un correo electrónico válido');
      return;
    }
    const cleanMail = newBlockedEmail.trim().toLowerCase();
    if (blacklist.includes(cleanMail)) {
      alert('Este correo ya está en la lista negra');
      return;
    }

    try {
      const res = await fetch('/api/user/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanMail }),
      });
      if (res.ok) {
        const updated = [...blacklist, cleanMail];
        setBlacklist(updated);
        localStorage.setItem('webmail_blacklist', JSON.stringify(updated));
        setNewBlockedEmail('');
        setSuccess(`Remitente ${cleanMail} bloqueado con éxito.`);
      } else {
        const d = await res.json();
        alert(d.error || 'Error al bloquear');
      }
    } catch {
      alert('Error al comunicar con el servidor');
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRemoveFromBlacklist = async (email: string) => {
    try {
      const res = await fetch('/api/user/blacklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const updated = blacklist.filter(item => item !== email);
        setBlacklist(updated);
        localStorage.setItem('webmail_blacklist', JSON.stringify(updated));
        setSuccess(`Remitente ${email} desbloqueado.`);
      }
    } catch {
      alert('Error al comunicar con el servidor');
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  // Close all other devices sessions (mock)
  const handleTerminateOtherSessions = () => {
    if (confirm('¿Cerrar todas las demás sesiones activas en otros dispositivos? Se requerirá iniciar sesión de nuevo en ellos.')) {
      setSessions(sessions.filter(s => s.current));
      setSuccess('Otras sesiones finalizadas correctamente.');
      setTimeout(() => setSuccess(''), 3500);
    }
  };

  // Notification alerts preferences save
  const handleSaveNotificationPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('webmail_sound_alert', String(soundAlertEnabled));
    localStorage.setItem('webmail_sound_volume', String(alertVolume));
    setSuccess('Preferencias de notificación actualizadas.');
    setTimeout(() => setSuccess(''), 3500);
  };

  // Filter Rules CRUD
  const handleAddRoutingRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleValue.trim()) {
      alert('Por favor introduce un valor clave para el filtro');
      return;
    }
    
    const rule: RoutingRule = {
      id: crypto.randomUUID(),
      field: newRuleField,
      matchType: newRuleMatchType,
      value: newRuleValue.trim().toLowerCase(),
      action: newRuleAction,
      folder: newRuleAction === 'folder' ? newRuleFolder : ''
    };

    const updated = [...routingRules, rule];
    setRoutingRules(updated);
    localStorage.setItem('webmail_routing_rules', JSON.stringify(updated));
    setNewRuleValue('');
    setSuccess('Regla de filtrado añadida con éxito.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteRoutingRule = (id: string) => {
    const updated = routingRules.filter(r => r.id !== id);
    setRoutingRules(updated);
    localStorage.setItem('webmail_routing_rules', JSON.stringify(updated));
    setSuccess('Regla de filtrado eliminada.');
    setTimeout(() => setSuccess(''), 3000);
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
        canViewAllAccounts={user?.assignedAddresses?.includes('*')}
        twoFactorEnabled={user?.twoFactorEnabled}
        onSecurityClick={() => setTwoFactorModalOpen(true)}
        isPushSupported={isPushSupported}
        isPushSubscribed={isPushSubscribed}
        onTogglePush={handleTogglePush}
      />

      {/* Settings Navigation Structure */}
      <div className="flex-1 flex h-full overflow-hidden min-w-0">
        
        {/* Settings Second Sidebar (Sub-sidebar) */}
        <div 
          className="w-56 shrink-0 h-full flex flex-col overflow-y-auto"
          style={{ 
            background: 'rgba(255,255,255,0.015)',
            borderRight: '1px solid hsl(var(--border) / 0.8)' 
          }}
        >
          {/* Header */}
          <div className="p-5 select-none">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
              Ajustes
            </h2>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 space-y-1 select-none">
            <button
              onClick={() => handleTabChange('general')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer`}
              style={{
                background: activeTab === 'general' ? 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.04))' : 'transparent',
                border: activeTab === 'general' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                color: activeTab === 'general' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
              }}
            >
              <Palette className="h-4 w-4 shrink-0" />
              General y Temas
            </button>

            <button
              onClick={() => handleTabChange('accounts')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer`}
              style={{
                background: activeTab === 'accounts' ? 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.04))' : 'transparent',
                border: activeTab === 'accounts' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                color: activeTab === 'accounts' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
              }}
            >
              <Mail className="h-4 w-4 shrink-0" />
              Firmas y Auto-respuestas
            </button>

            <button
              onClick={() => handleTabChange('security')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer`}
              style={{
                background: activeTab === 'security' ? 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.04))' : 'transparent',
                border: activeTab === 'security' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                color: activeTab === 'security' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
              }}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Seguridad y 2FA
            </button>

            <button
              onClick={() => handleTabChange('notifications')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer`}
              style={{
                background: activeTab === 'notifications' ? 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.04))' : 'transparent',
                border: activeTab === 'notifications' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                color: activeTab === 'notifications' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
              }}
            >
              <Bell className="h-4 w-4 shrink-0" />
              Notificaciones
            </button>

            <button
              onClick={() => handleTabChange('rules')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer`}
              style={{
                background: activeTab === 'rules' ? 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.04))' : 'transparent',
                border: activeTab === 'rules' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                color: activeTab === 'rules' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
              }}
            >
              <Filter className="h-4 w-4 shrink-0" />
              Filtros y Reglas
            </button>

            <button
              onClick={() => handleTabChange('shortcuts')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer`}
              style={{
                background: activeTab === 'shortcuts' ? 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.04))' : 'transparent',
                border: activeTab === 'shortcuts' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                color: activeTab === 'shortcuts' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
              }}
            >
              <Keyboard className="h-4 w-4 shrink-0" />
              Atajos de Teclado
            </button>
          </nav>

          {/* User profile card in footer */}
          <div 
            className="p-4 border-t select-none mt-auto flex items-center gap-2.5"
            style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
          >
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full border border-primary/20" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-neutral-850 flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-foreground truncate">{user?.name || 'Cargando...'}</p>
              <p className="text-[9px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Settings Workpanel Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <header 
            className="shrink-0 flex items-center px-6 py-4"
            style={{ borderBottom: '1px solid hsl(var(--border) / 0.8)' }}
          >
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4.5 w-4.5 text-primary animate-spin-slow" />
              <h1 className="text-sm font-bold text-foreground">
                {activeTab === 'general' && 'General y Apariencia'}
                {activeTab === 'accounts' && 'Gestión de Firmas y Respuestas'}
                {activeTab === 'security' && 'Ajustes de Seguridad y Accesos'}
                {activeTab === 'notifications' && 'Preferencias de Notificaciones'}
                {activeTab === 'rules' && 'Enrutamiento y Reglas de Correo'}
              </h1>
            </div>
          </header>

          {/* Scrollable Workpanel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Global Success / Error notifications */}
            {success && (
              <div className="rounded-xl bg-emerald-950/20 border border-emerald-900/30 p-4 text-xs text-emerald-400 font-semibold flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
                <p>{success}</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-950/20 border border-red-900/30 p-4 text-xs text-red-400 font-semibold flex items-start gap-2.5 animate-shake">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* TAB 1: GENERAL & THEMES */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                    Tema y Apariencia
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Personaliza la interfaz seleccionando entre el modo claro profesional y el modo oscuro estilo Gmail:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl pt-1">
                  {themes.map((theme) => {
                    const isActive = selectedTheme === theme.id;
                    const Icon = theme.icon;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => applyTheme(theme.id)}
                        className={`flex flex-col items-stretch p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-accent/40 border-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-card border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 select-none">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                              theme.dark ? 'bg-neutral-800 text-amber-300' : 'bg-blue-100 text-blue-600'
                            }`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold text-foreground">
                              {theme.name}
                            </span>
                          </div>
                          {isActive && (
                            <span className="flex h-6 px-2.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                              Activo
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                          {theme.desc}
                        </p>

                        {/* Visual preview strip */}
                        <div className="flex items-center gap-2 mt-auto p-2 rounded-xl bg-background border border-border">
                          <span className="h-4 w-4 rounded-full border border-border shrink-0" style={{ background: theme.primary }} />
                          <span className="h-4 w-4 rounded-full border border-border shrink-0" style={{ background: theme.accent }} />
                          <span className="h-4 w-4 rounded-full border border-border shrink-0" style={{ background: theme.bg }} />
                          <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                            {theme.dark ? '#111318' : '#f6f8fc'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border flex gap-3 text-xs text-muted-foreground leading-normal max-w-2xl shadow-xs">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong>Sincronización instantánea:</strong> El tema seleccionado se guarda en tus preferencias locales y se aplica inmediatamente en toda la bandeja de entrada, redacción, buzón temporal y panel de administración.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACCOUNTS (SIGNATURE / AUTO-REPLY) */}
            {activeTab === 'accounts' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                    Configuración de Buzones
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Modifica y personaliza de forma independiente las firmas de correo y respuestas de ausencia por cada cuenta:
                  </p>
                </div>

                <div className="max-w-md space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Seleccionar cuenta de correo:
                  </label>
                  {availableAccounts.length === 0 ? (
                    <div className="text-xs text-red-400 font-medium">
                      No hay cuentas de correo registradas en tu perfil.
                    </div>
                  ) : (
                    <select
                      value={selectedEmail}
                      onChange={(e) => setSelectedEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  <div className="py-16 flex flex-col items-center justify-center gap-3 border border-neutral-900 rounded-2xl bg-neutral-950/20 max-w-xl">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Cargando configuraciones...</p>
                  </div>
                ) : settings ? (
                  <form onSubmit={handleSaveMailboxSettings} className="border border-neutral-900 rounded-2xl bg-neutral-950/20 p-5 space-y-5 max-w-xl">
                    
                    {/* Tabs indicator */}
                    <div className="flex gap-2 border-b border-neutral-900/80 pb-3">
                      <button
                        type="button"
                        onClick={() => setActiveSettingsTab('signature')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer`}
                        style={{
                          background: activeSettingsTab === 'signature' ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                          border: activeSettingsTab === 'signature' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                          color: activeSettingsTab === 'signature' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
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
                          background: activeSettingsTab === 'autoreply' ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                          border: activeSettingsTab === 'autoreply' ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
                          color: activeSettingsTab === 'autoreply' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Respuesta automática
                      </button>
                    </div>

                    {/* Signature */}
                    {activeSettingsTab === 'signature' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Texto de la firma:
                          </label>
                          <textarea
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            placeholder="Atentamente,\n[Tu Nombre]\n[Tu Cargo]"
                            className="w-full h-32 px-3 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                          />
                        </div>
                        <div className="p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/50 space-y-2">
                          <span className="text-[9px] font-bold text-primary/80 uppercase tracking-widest block">
                            Vista previa de firma:
                          </span>
                          <div className="text-xs text-muted-foreground border-t border-neutral-900/50 pt-2 font-sans min-h-[50px] whitespace-pre-line">
                            {signatureText ? signatureText : <span className="italic opacity-60">Sin firma configurada</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Auto-reply */}
                    {activeSettingsTab === 'autoreply' && (
                      <div className="space-y-4">
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
                            <div className="w-9 h-5 bg-neutral-850 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-neutral-950" />
                          </label>
                        </div>

                        {/* AI Tool */}
                        <div className="p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/20 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-xs font-semibold text-foreground">Asistente IA</span>
                            </div>
                            <button
                              type="button"
                              disabled={!autoReplyEnabled}
                              onClick={() => setShowAiInput(!showAiInput)}
                              className="text-[10px] font-bold text-primary hover:text-primary/85 transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50"
                            >
                              {showAiInput ? 'Cerrar' : 'Generar plantilla con IA'}
                            </button>
                          </div>

                          {showAiInput && (
                            <div className="space-y-2 animate-fadeIn">
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                Escribe instrucciones para tu respuesta automática (ej: "estaré fuera de la oficina del 5 al 12 de junio y para emergencias escribir a pedro@mail.com"):
                              </p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={aiPrompt}
                                  onChange={(e) => setAiPrompt(e.target.value)}
                                  placeholder="Escribe las instrucciones..."
                                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-850 bg-neutral-900/30 text-foreground transition-all focus:border-primary focus:outline-none"
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
                                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary hover:bg-primary/85 text-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
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

                        {/* Fields */}
                        <div className={`space-y-4 transition-all ${autoReplyEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
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
                              className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Mensaje automático:
                            </label>
                            <textarea
                              disabled={!autoReplyEnabled}
                              value={autoReplyBody}
                              onChange={(e) => setAutoReplyBody(e.target.value)}
                              placeholder="Escribe tu respuesta automática aquí..."
                              className="w-full h-36 px-3 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1.5 text-primary font-bold text-[10px] uppercase tracking-wider mb-1.5">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Placeholders dinámicos</span>
                            </div>
                            <p className="text-[10px] leading-relaxed">
                              Puedes utilizar las siguientes etiquetas en el asunto o cuerpo para personalizar la respuesta automática:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[10px] pt-1">
                              <li><code className="text-primary font-semibold font-mono">{"{{subject}}"}</code>: Inserta el asunto del correo original.</li>
                              <li><code className="text-primary font-semibold font-mono">{"{{sender}}"}</code>: Inserta el remitente original (nombre o correo).</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-neutral-900 flex justify-end">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-6 py-2 text-xs font-bold rounded-lg bg-primary text-neutral-950 shadow hover:bg-primary/85 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
            )}

            {/* TAB 3: SECURITY & 2FA */}
            {activeTab === 'security' && (
              <div className="space-y-8 animate-fadeIn max-w-xl">
                
                {/* 2FA Section (Inline) */}
                <div className="space-y-4 border border-neutral-900 rounded-2xl bg-neutral-950/20 p-5">
                  <div className="flex items-center gap-2 select-none">
                    <KeyRound className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                      Verificación de Dos Pasos (2FA)
                    </h3>
                  </div>

                  {loading2FA ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Consultando estado de 2FA...</p>
                    </div>
                  ) : status2FA ? (
                    <div className="space-y-4">
                      {status2FA.enabled ? (
                        /* Enabled status */
                        <div className="space-y-4 py-2">
                          <div className="flex items-center gap-3 bg-emerald-950/15 border border-emerald-900/20 rounded-xl p-3.5">
                            <Shield className="h-8 w-8 text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-foreground">Doble Factor Activo</p>
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                Tu cuenta está protegida. Se solicitará un código TOTP dinámico en cada nuevo inicio de sesión.
                              </p>
                            </div>
                          </div>
                          
                          {!status2FA.require2FA ? (
                            <button
                              type="button"
                              disabled={actionLoading2FA}
                              onClick={handleDisable2FA}
                              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-950/30 hover:bg-red-900/30 border border-red-900/20 text-red-400 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading2FA ? 'Desactivando...' : 'Desactivar doble factor (2FA)'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold bg-neutral-900/50 p-3 rounded-lg border border-neutral-850 select-none">
                              <ShieldAlert className="h-4 w-4 shrink-0" />
                              <span>El doble factor es requerido de forma obligatoria por los administradores de la organización.</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Disabled status - Setup flows */
                        <div className="space-y-4">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Asegura tu cuenta de correo escaneando este código QR con tu aplicación autenticadora (Google Authenticator, Authy, Microsoft Authenticator, etc.) e introduce el código generado abajo:
                          </p>

                          {status2FA.qrCodeUrl && (
                            <div className="flex flex-col sm:flex-row items-center gap-5 bg-neutral-900/30 border border-neutral-900/50 rounded-xl p-4">
                              <div className="bg-white p-2 rounded-lg shrink-0 select-none">
                                <img src={status2FA.qrCodeUrl} alt="2FA QR Code" className="h-32 w-32" />
                              </div>
                              <div className="space-y-2 text-center sm:text-left">
                                <p className="text-[10px] text-muted-foreground">¿No puedes escanear? Introduce esta clave manualmente:</p>
                                <code className="text-xs font-mono bg-neutral-950 text-primary border border-neutral-850 px-2.5 py-1 rounded inline-block tracking-wider select-all">
                                  {status2FA.secret?.replace(/(.{4})/g, '$1 ').trim()}
                                </code>
                              </div>
                            </div>
                          )}

                          <form onSubmit={handleVerify2FACode} className="space-y-3.5 pt-2">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block text-center sm:text-left">
                                Código de 6 dígitos:
                              </label>
                              <div className="flex justify-center sm:justify-start gap-2">
                                {totpCode.map((digit, idx) => (
                                  <input
                                    key={idx}
                                    ref={el => { inputRefs.current[idx] = el; }}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleTotpBoxChange(idx, e.target.value)}
                                    onKeyDown={e => handleTotpBoxKeyDown(idx, e)}
                                    className="w-10 h-11 text-center text-sm font-bold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                  />
                                ))}
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={actionLoading2FA || totpCode.some(d => d === '')}
                              className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-neutral-950 shadow hover:bg-primary/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                            >
                              {actionLoading2FA ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Verificando...
                                </>
                              ) : (
                                'Activar doble factor (2FA)'
                              )}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Passkeys Management Section */}
                <div className="space-y-4 border border-neutral-900 rounded-2xl bg-neutral-950/20 p-5">
                  <div className="flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4.5 w-4.5 text-primary" />
                      <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                        Llaves de paso (Passkeys)
                      </h3>
                    </div>
                    <button
                      type="button"
                      disabled={registeringPasskey}
                      onClick={handleRegisterPasskey}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-primary hover:bg-primary/85 text-neutral-950 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {registeringPasskey ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Añadir llave
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Las llaves de paso te permiten iniciar sesión de forma segura usando biometría (huella dactilar, FaceID) o el PIN de tu dispositivo, sin necesidad de contraseñas ni códigos 2FA.
                  </p>

                  <div className="pt-2">
                    {loadingPasskeys ? (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <p className="text-[10px] text-muted-foreground">Cargando llaves de paso...</p>
                      </div>
                    ) : passkeys.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/30 text-center select-none">
                        <p className="text-xs text-muted-foreground italic opacity-60">No tienes ninguna llave de paso registrada.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {passkeys.map((pk) => (
                          <div 
                            key={pk._id}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-900/50 bg-neutral-950/40"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {pk.name}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                Creada el {new Date(pk.createdAt).toLocaleDateString('es-ES')} a las {new Date(pk.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                {pk.lastUsedAt && ` • Usada por última vez: ${new Date(pk.lastUsedAt).toLocaleDateString('es-ES')}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePasskey(pk._id)}
                              className="text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors p-1.5 rounded-lg border border-transparent hover:border-red-900/20 shrink-0 cursor-pointer"
                              title="Eliminar llave de paso"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sender Blacklist Section */}
                <div className="space-y-4 border border-neutral-900 rounded-2xl bg-neutral-950/20 p-5">
                  <div className="flex items-center gap-2 select-none">
                    <ShieldAlert className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                      Lista Negra de Remitentes
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Los correos recibidos desde estas direcciones se moverán automáticamente a la carpeta de Spam:
                  </p>

                  <form onSubmit={handleAddToBlacklist} className="flex gap-2">
                    <input
                      type="email"
                      value={newBlockedEmail}
                      onChange={(e) => setNewBlockedEmail(e.target.value)}
                      placeholder="ejemplo@remitentespam.com"
                      className="flex-1 px-3.5 py-1.5 text-xs rounded-lg border border-neutral-850 bg-neutral-900/30 text-foreground transition-all focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newBlockedEmail.trim()}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-neutral-950 hover:bg-primary/85 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Bloquear
                    </button>
                  </form>

                  <div className="pt-2">
                    {blacklist.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic opacity-60">Ningún remitente bloqueado.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {blacklist.map((email) => (
                          <div 
                            key={email}
                            className="flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-neutral-900/50 bg-neutral-950/50"
                          >
                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[85%]">{email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromBlacklist(email)}
                              className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded hover:bg-neutral-900 shrink-0 cursor-pointer"
                              title="Desbloquear"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Sessions Section */}
                <div className="space-y-4 border border-neutral-900 rounded-2xl bg-neutral-950/20 p-5">
                  <div className="flex items-center gap-2 select-none">
                    <Smartphone className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                      Sesiones y Dispositivos Activos
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Lista de navegadores y dispositivos que han iniciado sesión recientemente en tu cuenta:
                  </p>

                  <div className="space-y-2 pt-1.5">
                    {sessions.map((sess) => (
                      <div 
                        key={sess.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-neutral-900/50 bg-neutral-950/40"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {sess.device}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            IP: {sess.ip} • {sess.date}
                          </p>
                        </div>
                        {sess.current ? (
                          <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary shrink-0 select-none">
                            Este dispositivo
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {sessions.length > 1 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleTerminateOtherSessions}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-950/20 hover:bg-red-950/30 border border-red-900/20 text-red-400 transition-all cursor-pointer"
                      >
                        Cerrar las otras sesiones
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-fadeIn max-w-xl">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                    Alertas y Notificaciones
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configura de qué manera quieres recibir las alertas de nuevos correos electrónicos entrantes en tiempo real:
                  </p>
                </div>

                <form onSubmit={handleSaveNotificationPreferences} className="border border-neutral-900 rounded-2xl bg-neutral-950/20 p-5 space-y-5">
                  
                  {/* Push Browser alerts toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/30">
                    <div className="space-y-0.5 pr-4">
                      <span className="text-xs font-semibold text-foreground block">
                        Notificaciones Push en el navegador
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Mostrar alertas emergentes de escritorio al recibir nuevos correos cuando la pestaña no esté visible
                      </span>
                    </div>
                    {isPushSupported ? (
                      <button
                        type="button"
                        onClick={handleTogglePush}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        style={{
                          background: isPushSubscribed ? 'hsl(var(--primary) / 0.1)' : 'rgba(255,255,255,0.03)',
                          borderColor: isPushSubscribed ? 'hsl(var(--primary) / 0.2)' : 'rgba(255,255,255,0.08)',
                          color: isPushSubscribed ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                        }}
                      >
                        {isPushSubscribed ? (
                          <>
                            <Bell className="h-3.5 w-3.5" />
                            Activas ✓
                          </>
                        ) : (
                          <>
                            <BellOff className="h-3.5 w-3.5" />
                            Activar
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10 select-none shrink-0">
                        No soportado por navegador
                      </span>
                    )}
                  </div>

                  {/* Sound Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/30">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground block">
                        Alertas de sonido
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Emitir un sonido de campanilla inmediato al entrar un correo nuevo en la Bandeja de entrada
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={soundAlertEnabled}
                        onChange={(e) => setSoundAlertEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-850 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-neutral-950" />
                    </label>
                  </div>

                  {/* Volume control slider */}
                  <div className={`space-y-2 p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/30 transition-all ${soundAlertEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex items-center justify-between select-none">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Volume2 className="h-4 w-4 text-primary" />
                        Volumen de alertas de sonido
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold font-mono">{alertVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      disabled={!soundAlertEnabled}
                      value={alertVolume}
                      onChange={(e) => setAlertVolume(Number(e.target.value))}
                      className="w-full h-1.5 bg-neutral-850 rounded-lg appearance-none cursor-pointer focus:outline-none"
                      style={{ accentColor: 'hsl(var(--primary))' }}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-neutral-950 shadow hover:bg-primary/85 transition-all cursor-pointer"
                    >
                      Guardar preferencias
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 5: ROUTING RULES (FILTROS) */}
            {activeTab === 'rules' && (
              <div className="space-y-6 animate-fadeIn max-w-xl">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                    Reglas e Hilos de Enrutamiento
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Crea filtros automáticos para organizar tus correos entrantes según criterios específicos en carpetas del sistema:
                  </p>
                </div>

                {/* Rules Creator Form */}
                <form onSubmit={handleAddRoutingRule} className="border border-neutral-900 rounded-2xl bg-neutral-950/20 p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* Criterio de campo */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Si el campo:
                      </label>
                      <select
                        value={newRuleField}
                        onChange={(e) => setNewRuleField(e.target.value as any)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="subject" style={{ background: '#0a0f1e' }}>Asunto (Subject)</option>
                        <option value="from" style={{ background: '#0a0f1e' }}>Remitente (From)</option>
                        <option value="body" style={{ background: '#0a0f1e' }}>Contenido (Body)</option>
                      </select>
                    </div>

                    {/* Criterio de condición */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Condición:
                      </label>
                      <select
                        value={newRuleMatchType}
                        onChange={(e) => setNewRuleMatchType(e.target.value as any)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="contains" style={{ background: '#0a0f1e' }}>Contiene la palabra</option>
                        <option value="equals" style={{ background: '#0a0f1e' }}>Es igual a</option>
                      </select>
                    </div>
                  </div>

                  {/* Valor clave */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Valor a buscar:
                    </label>
                    <input
                      type="text"
                      required
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder="Introduce el valor (ej: urgente, linkedin, factura...)"
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1.5">
                    {/* Acción */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Entonces ejecutar acción:
                      </label>
                      <select
                        value={newRuleAction}
                        onChange={(e) => setNewRuleAction(e.target.value as any)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="folder" style={{ background: '#0a0f1e' }}>Mover a carpeta...</option>
                        <option value="spam" style={{ background: '#0a0f1e' }}>Marcar como Spam</option>
                        <option value="delete" style={{ background: '#0a0f1e' }}>Eliminar (Mover a Papelera)</option>
                      </select>
                    </div>

                    {/* Carpeta destino (solo si acción === folder) */}
                    <div className={`space-y-1.5 transition-all ${newRuleAction === 'folder' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Carpeta destino:
                      </label>
                      <select
                        disabled={newRuleAction !== 'folder'}
                        value={newRuleFolder}
                        onChange={(e) => setNewRuleFolder(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/40 text-foreground transition-all focus:border-primary focus:outline-none"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="work" style={{ background: '#0a0f1e' }}>Trabajo</option>
                        <option value="personal" style={{ background: '#0a0f1e' }}>Personal</option>
                        <option value="commercial" style={{ background: '#0a0f1e' }}>Comercial</option>
                        <option value="newsletter" style={{ background: '#0a0f1e' }}>Newsletters</option>
                        <option value="social" style={{ background: '#0a0f1e' }}>Redes Sociales</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-neutral-950 shadow hover:bg-primary/85 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crear Filtro
                    </button>
                  </div>
                </form>

                {/* Rules List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Filtros y Reglas Activas
                  </h4>

                  {routingRules.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic opacity-60">No se han definido filtros.</p>
                  ) : (
                    <div className="space-y-2">
                      {routingRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-900 bg-neutral-950/40"
                        >
                          <div className="text-xs leading-normal">
                            Si el <strong className="text-primary">{rule.field === 'subject' ? 'Asunto' : rule.field === 'from' ? 'Remitente' : 'Contenido'}</strong>{' '}
                            {rule.matchType === 'contains' ? 'contiene' : 'es igual a'}{' '}
                            <code className="bg-neutral-900 border border-neutral-850 px-1.5 py-0.5 rounded text-[10px] text-foreground font-mono">"{rule.value}"</code>
                            {' -> '}
                            <strong className="text-primary">
                              {rule.action === 'folder' ? `Mover a "${rule.folder}"` : rule.action === 'spam' ? 'Mover a Spam' : 'Mover a Papelera'}
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoutingRule(rule.id)}
                            className="text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded hover:bg-neutral-900 shrink-0 cursor-pointer ml-3"
                            title="Eliminar regla"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-6 animate-fadeIn max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      Atajos de Teclado
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Personaliza cada tecla o combinación de atajos para navegar y operar el correo a máxima velocidad.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAllShortcuts}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800 text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1.5 self-start shrink-0"
                    title="Restablecer todos los atajos a los valores predeterminados"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restablecer todos
                  </button>
                </div>

                {/* Recording banner if active */}
                {recordingId && (
                  <div className="p-4 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-mono text-sm font-bold">
                        {recordingChordFirstKey ? `${recordingChordFirstKey} ...` : '⌨️'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Grabando atajo para: <span className="text-primary">{shortcutsList.find(s => s.id === recordingId)?.name}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {recordingChordFirstKey
                            ? `Primera tecla "${recordingChordFirstKey}" detectada. Pulsa la segunda tecla o Enter para dejarla sola.`
                            : 'Presiona la tecla o combinación (ej. c, j, Enter, Ctrl+B, o acorde tipo g i). Presiona Esc para cancelar.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setRecordingId(null); setRecordingChordFirstKey(''); }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-foreground transition-colors cursor-pointer"
                    >
                      Cancelar (Esc)
                    </button>
                  </div>
                )}

                {/* Filter Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre, descripción o tecla..."
                    value={shortcutSearch}
                    onChange={(e) => setShortcutSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-900/40 border border-neutral-800 rounded-xl focus:outline-none focus:border-primary placeholder:text-muted-foreground text-foreground"
                  />
                  {shortcutSearch && (
                    <button
                      onClick={() => setShortcutSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Shortcut categories */}
                {(['navigation', 'actions', 'reading', 'composing', 'general'] as ShortcutCategory[]).map((cat) => {
                  const filtered = shortcutsList.filter(s =>
                    s.category === cat && (
                      s.name.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
                      s.description.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
                      (s.userKey || s.defaultKey).toLowerCase().includes(shortcutSearch.toLowerCase())
                    )
                  );

                  if (filtered.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-3">
                      <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider px-1">
                        {CATEGORY_LABELS[cat]}
                      </h4>
                      <div className="space-y-2">
                        {filtered.map((item) => {
                          const isCustomized = item.userKey && item.userKey !== item.defaultKey;
                          const isRecording = recordingId === item.id;
                          const currentKey = item.userKey || item.defaultKey;
                          const keyBadges = formatKeyBadge(currentKey);

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                isRecording
                                  ? 'border-primary bg-primary/10 shadow-md'
                                  : 'border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900/40'
                              }`}
                            >
                              <div className="min-w-0 pr-4 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    {item.name}
                                  </span>
                                  {isCustomized && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 select-none">
                                      Personalizado
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-normal">
                                  {item.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Key badge display */}
                                <div className="flex items-center gap-1">
                                  {isRecording ? (
                                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-primary text-neutral-950 rounded-lg animate-pulse">
                                      {recordingChordFirstKey ? `${recordingChordFirstKey} + ...` : 'Presiona tecla...'}
                                    </span>
                                  ) : (
                                    keyBadges.map((k, idx) => (
                                      <React.Fragment key={idx}>
                                        {idx > 0 && <span className="text-[10px] text-muted-foreground">luego</span>}
                                        <kbd className="px-2 py-1 text-xs font-mono font-bold bg-neutral-900 border border-neutral-800 rounded-md text-primary shadow-2xs">
                                          {k}
                                        </kbd>
                                      </React.Fragment>
                                    ))
                                  )}
                                </div>

                                {/* Reassign button */}
                                {!isRecording && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecordingId(item.id);
                                      setRecordingChordFirstKey('');
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-foreground transition-all cursor-pointer flex items-center gap-1"
                                    title="Modificar atajo"
                                  >
                                    <Edit3 className="h-3 w-3 text-muted-foreground" />
                                    Cambiar
                                  </button>
                                )}

                                {/* Reset single button */}
                                {isCustomized && !isRecording && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetSingleShortcut(item.id)}
                                    className="p-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-800 transition-all cursor-pointer"
                                    title={`Restablecer al valor por defecto (${item.defaultKey})`}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
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
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
