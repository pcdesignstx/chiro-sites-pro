import { toast } from 'react-hot-toast';

export const showNotification = (message, type = 'success') => {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast(message, {
        icon: '⚠️',
        style: {
          background: '#FEF3C7',
          color: '#92400E',
        },
      });
      break;
    case 'info':
      toast(message);
      break;
    default:
      toast(message);
  }
};

// New convenience functions
export const showSuccess = (message) => {
  toast.success(message);
};

export const showError = (message) => {
  toast.error(message);
};

export const showInfo = (message) => {
  toast(message);
};

export const showWarning = (message) => {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#FEF3C7',
      color: '#92400E',
    },
  });
}; 