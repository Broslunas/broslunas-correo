export type ModalType = 'info' | 'warning' | 'error' | 'success';

export interface AlertModalOptions {
  title?: string;
  type?: ModalType;
  confirmText?: string;
}

export interface ConfirmModalOptions {
  title?: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface ModalRequest {
  id: string;
  title?: string;
  message: string;
  type: ModalType;
  isConfirm?: boolean;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  resolve: (val: boolean) => void;
}

type ModalListener = (modal: ModalRequest | null) => void;

let currentListener: ModalListener | null = null;
const modalQueue: ModalRequest[] = [];
let activeModal: ModalRequest | null = null;

export function registerModalListener(listener: ModalListener) {
  currentListener = listener;
  if (activeModal) {
    listener(activeModal);
  }
  return () => {
    if (currentListener === listener) {
      currentListener = null;
    }
  };
}

function processQueue() {
  if (activeModal || modalQueue.length === 0) return;
  activeModal = modalQueue.shift() || null;
  if (currentListener) {
    currentListener(activeModal);
  }
}

export function dismissCurrentModal(result = false) {
  if (!activeModal) return;
  const current = activeModal;
  activeModal = null;
  if (currentListener) {
    currentListener(null);
  }
  current.resolve(result);
  setTimeout(processQueue, 30);
}

export function showAlert(
  message: string,
  optionsOrTitle?: string | AlertModalOptions
): Promise<void> {
  return new Promise((resolve) => {
    const opts: AlertModalOptions =
      typeof optionsOrTitle === 'string'
        ? { title: optionsOrTitle }
        : optionsOrTitle || {};

    const req: ModalRequest = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      title: opts.title,
      type: opts.type || 'info',
      confirmText: opts.confirmText || 'Aceptar',
      isConfirm: false,
      resolve: () => resolve(),
    };

    modalQueue.push(req);
    processQueue();
  });
}

export function showConfirm(
  message: string,
  optionsOrTitle?: string | ConfirmModalOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const opts: ConfirmModalOptions =
      typeof optionsOrTitle === 'string'
        ? { title: optionsOrTitle }
        : optionsOrTitle || {};

    const req: ModalRequest = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      title: opts.title || 'Confirmar acción',
      type: opts.type || (opts.destructive ? 'warning' : 'info'),
      confirmText: opts.confirmText || (opts.destructive ? 'Eliminar' : 'Aceptar'),
      cancelText: opts.cancelText || 'Cancelar',
      isConfirm: true,
      destructive: opts.destructive,
      resolve,
    };

    modalQueue.push(req);
    processQueue();
  });
}
