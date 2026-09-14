// Shortcuts system for Broslunas Webmail
// Supports single keys, modifiers (Ctrl, Alt, Shift, Meta), and chords (e.g. "g i")

export type ShortcutCategory = 'navigation' | 'actions' | 'reading' | 'composing' | 'general';

export interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  category: ShortcutCategory;
  defaultKey: string;
  userKey?: string;
  requiresInReader?: boolean;
  requiresInList?: boolean;
}

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // General
  {
    id: 'showShortcutsHelp',
    name: 'Mostrar atajos de teclado',
    description: 'Abre este panel de ayuda de atajos',
    category: 'general',
    defaultKey: '?',
  },
  {
    id: 'toggleSidebar',
    name: 'Alternar barra lateral',
    description: 'Expande o colapsa el menú lateral',
    category: 'general',
    defaultKey: 'Ctrl+b',
  },
  {
    id: 'toggleTheme',
    name: 'Cambiar modo claro / oscuro',
    description: 'Alterna entre el tema visual claro y oscuro',
    category: 'general',
    defaultKey: 'Ctrl+Shift+L',
  },

  // Navegación
  {
    id: 'goToInbox',
    name: 'Ir a Bandeja de entrada',
    description: 'Navega a la carpeta principal de entrada',
    category: 'navigation',
    defaultKey: 'g i',
  },
  {
    id: 'goToStarred',
    name: 'Ir a Destacados',
    description: 'Navega a la carpeta de correos destacados',
    category: 'navigation',
    defaultKey: 'g s',
  },
  {
    id: 'goToUnread',
    name: 'Ir a No leídos',
    description: 'Navega a los correos sin leer',
    category: 'navigation',
    defaultKey: 'g u',
  },
  {
    id: 'goToSent',
    name: 'Ir a Enviados',
    description: 'Navega a la carpeta de correos enviados',
    category: 'navigation',
    defaultKey: 'g t',
  },
  {
    id: 'goToDrafts',
    name: 'Ir a Borradores',
    description: 'Navega a los borradores guardados',
    category: 'navigation',
    defaultKey: 'g d',
  },
  {
    id: 'goToSpam',
    name: 'Ir a Spam',
    description: 'Navega a la carpeta de correo basura',
    category: 'navigation',
    defaultKey: 'g !',
  },
  {
    id: 'goToTrash',
    name: 'Ir a Papelera',
    description: 'Navega a la papelera de reciclaje',
    category: 'navigation',
    defaultKey: 'g #',
  },
  {
    id: 'goToSettings',
    name: 'Ir a Ajustes',
    description: 'Abre la página de configuración del sistema',
    category: 'navigation',
    defaultKey: 'g ,',
  },
  {
    id: 'focusSearch',
    name: 'Buscar correos',
    description: 'Enfoca la barra de búsqueda de mensajes',
    category: 'navigation',
    defaultKey: '/',
  },
  {
    id: 'refreshMail',
    name: 'Actualizar mensajes',
    description: 'Sincroniza y recarga los correos de la bandeja',
    category: 'navigation',
    defaultKey: 'u',
  },

  // Acciones en Lista
  {
    id: 'compose',
    name: 'Redactar nuevo correo',
    description: 'Abre la ventana de composición de mensaje',
    category: 'actions',
    defaultKey: 'c',
  },
  {
    id: 'selectNext',
    name: 'Seleccionar correo siguiente',
    description: 'Baja al siguiente correo en la lista',
    category: 'actions',
    defaultKey: 'j',
  },
  {
    id: 'selectPrev',
    name: 'Seleccionar correo anterior',
    description: 'Sube al correo anterior en la lista',
    category: 'actions',
    defaultKey: 'k',
  },
  {
    id: 'openSelected',
    name: 'Abrir correo seleccionado',
    description: 'Abre el mensaje actualmente seleccionado',
    category: 'actions',
    defaultKey: 'Enter',
  },
  {
    id: 'backToList',
    name: 'Volver a la lista',
    description: 'Cierra el lector de correo o vuelve a la vista de lista',
    category: 'actions',
    defaultKey: 'Escape',
  },
  {
    id: 'toggleStar',
    name: 'Marcar / Desmarcar estrella',
    description: 'Añade o retira de favoritos el correo',
    category: 'actions',
    defaultKey: 's',
  },
  {
    id: 'toggleRead',
    name: 'Marcar como leído / no leído',
    description: 'Alterna el estado de lectura del correo',
    category: 'actions',
    defaultKey: 'm',
  },
  {
    id: 'deleteEmail',
    name: 'Mover a la papelera',
    description: 'Elimina el correo seleccionado o actual',
    category: 'actions',
    defaultKey: '#',
  },
  {
    id: 'markSpam',
    name: 'Marcar como spam',
    description: 'Mueve el correo seleccionado a la carpeta Spam',
    category: 'actions',
    defaultKey: '!',
  },
  {
    id: 'selectAll',
    name: 'Seleccionar todos los correos',
    description: 'Marca todas las casillas de la lista visible',
    category: 'actions',
    defaultKey: '* a',
  },
  {
    id: 'deselectAll',
    name: 'Deseleccionar todos',
    description: 'Desmarca todas las casillas seleccionadas',
    category: 'actions',
    defaultKey: '* n',
  },

  // Lectura
  {
    id: 'reply',
    name: 'Responder',
    description: 'Responde al remitente del correo abierto',
    category: 'reading',
    defaultKey: 'r',
    requiresInReader: true,
  },
  {
    id: 'replyAll',
    name: 'Responder a todos',
    description: 'Responde a todos los destinatarios del correo',
    category: 'reading',
    defaultKey: 'a',
    requiresInReader: true,
  },
  {
    id: 'forward',
    name: 'Reenviar',
    description: 'Reenvía el correo abierto a nuevos destinatarios',
    category: 'reading',
    defaultKey: 'f',
    requiresInReader: true,
  },
  {
    id: 'printEmail',
    name: 'Imprimir correo',
    description: 'Abre el cuadro de diálogo de impresión del correo',
    category: 'reading',
    defaultKey: 'Ctrl+p',
    requiresInReader: true,
  },

  // Redacción
  {
    id: 'sendEmail',
    name: 'Enviar correo',
    description: 'Envía inmediatamente el correo en redacción',
    category: 'composing',
    defaultKey: 'Ctrl+Enter',
  },
  {
    id: 'discardDraft',
    name: 'Cerrar / Descartar ventana',
    description: 'Cierra la ventana flotante de redacción',
    category: 'composing',
    defaultKey: 'Alt+Escape',
  },
];

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  general: 'General y Ayuda',
  navigation: 'Navegación y Carpetas',
  actions: 'Gestión de Correos',
  reading: 'Lectura de Mensajes',
  composing: 'Redacción de Correos',
};

const STORAGE_KEY = 'webmail_custom_shortcuts';

export function getCustomShortcuts(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading custom shortcuts:', e);
    return {};
  }
}

export function saveCustomShortcuts(customMap: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customMap));
    window.dispatchEvent(new CustomEvent('shortcuts-updated', { detail: customMap }));
  } catch (e) {
    console.error('Error saving custom shortcuts:', e);
  }
}

export function resetAllShortcuts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('shortcuts-updated', { detail: {} }));
}

export function getAllShortcuts(): ShortcutDefinition[] {
  const custom = getCustomShortcuts();
  return DEFAULT_SHORTCUTS.map(def => ({
    ...def,
    userKey: custom[def.id] || def.defaultKey,
  }));
}

export function getShortcutKey(id: string): string {
  const custom = getCustomShortcuts();
  if (custom[id]) return custom[id];
  const found = DEFAULT_SHORTCUTS.find(s => s.id === id);
  return found ? found.defaultKey : '';
}

export function isInputElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

// Convert keyboard event into normalized string format (e.g. "Ctrl+Shift+L", "Enter", "c")
export function eventToShortcutString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey && (e.ctrlKey || e.altKey || e.metaKey)) parts.push('Shift');

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key === 'Escape') key = 'Escape';
  else if (key === 'Enter') key = 'Enter';
  else if (key === 'Delete') key = 'Delete';
  else if (key === 'Backspace') key = 'Backspace';
  else if (key === 'ArrowUp') key = 'ArrowUp';
  else if (key === 'ArrowDown') key = 'ArrowDown';
  else if (key === 'ArrowLeft') key = 'ArrowLeft';
  else if (key === 'ArrowRight') key = 'ArrowRight';
  else if (key.length === 1) {
    // Keep single char as is, lowercase unless shift without ctrl/alt
    if (parts.length > 0) {
      key = key.toUpperCase();
    }
  }

  // Avoid adding duplicate modifiers
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    return '';
  }

  parts.push(key);
  return parts.join('+');
}

export function formatKeyBadge(keyStr: string): string[] {
  if (!keyStr) return [];
  if (keyStr.includes(' ')) {
    return keyStr.split(' ');
  }
  return [keyStr];
}
