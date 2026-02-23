/**
 * Sistema de Toast simples (sem dependencias externas)
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

let toastContainer: HTMLDivElement | null = null;

const createToastContainer = (position: ToastOptions['position'] = 'top-right'): HTMLDivElement => {
  if (toastContainer) {
    return toastContainer;
  }

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = `fixed z-[9999] ${getPositionClasses(position)} pointer-events-none`;
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');

  document.body.appendChild(container);
  toastContainer = container;
  return container;
};

const getPositionClasses = (position: ToastOptions['position']): string => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'top-right':
      return 'top-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    default:
      return 'top-4 right-4';
  }
};

const getToastStyles = (type: ToastType): string => {
  const baseStyles = 'pointer-events-auto min-w-[300px] max-w-[500px] p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 transform translate-x-0 opacity-100';

  switch (type) {
    case 'success':
      return `${baseStyles} bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200`;
    case 'error':
      return `${baseStyles} bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200`;
    case 'warning':
      return `${baseStyles} bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200`;
    case 'info':
      return `${baseStyles} bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200`;
    default:
      return `${baseStyles} bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200`;
  }
};

const getIcon = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '!';
    case 'warning':
      return '!';
    case 'info':
      return 'i';
    default:
      return '•';
  }
};

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    showToast(message, 'success', options);
  },

  error: (message: string, options?: ToastOptions) => {
    showToast(message, 'error', options);
  },

  info: (message: string, options?: ToastOptions) => {
    showToast(message, 'info', options);
  },

  warning: (message: string, options?: ToastOptions) => {
    showToast(message, 'warning', options);
  }
};

const showToast = (
  message: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
): void => {
  const { duration = 4000, position = 'top-right' } = options;

  const container = createToastContainer(position);
  const toast = document.createElement('div');

  toast.className = `${getToastStyles(type)} mb-3`;
  toast.setAttribute('role', 'alert');

  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-start gap-3';

  const icon = document.createElement('span');
  icon.className = 'text-xl flex-shrink-0';
  icon.textContent = getIcon(type);

  const text = document.createElement('p');
  text.className = 'flex-1 text-sm font-medium';
  text.textContent = String(message ?? '');

  const closeButton = document.createElement('button');
  closeButton.className = 'flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity';
  closeButton.setAttribute('aria-label', 'Fechar notificacao');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    toast.remove();
  });

  wrapper.appendChild(icon);
  wrapper.appendChild(text);
  wrapper.appendChild(closeButton);
  toast.appendChild(wrapper);

  // Animacao de entrada
  toast.style.transform = 'translateX(400px)';
  toast.style.opacity = '0';

  container.appendChild(toast);

  // Trigger reflow para animacao
  toast.offsetHeight;

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });

  // Remover apos duracao
  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
};
