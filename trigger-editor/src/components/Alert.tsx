import * as React from 'react';
import { useState, useCallback, type ReactNode } from 'react';

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface AlertOptions {
  type?: AlertType;
  title?: string;
  duration?: number; // in milliseconds, 0 = no auto-close
  closable?: boolean;
  onClose?: () => void;
}

export interface AlertData extends AlertOptions {
  id: string;
  message: ReactNode;
}

// Alert Context for managing alerts
interface AlertContextType {
  alerts: AlertData[];
  showAlert: (message: ReactNode, options?: AlertOptions) => string;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

const AlertContext = React.createContext<AlertContextType | null>(null);

export function useAlertContext() {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return context;
}

// Alert Provider Component
interface AlertProviderProps {
  children: ReactNode;
  maxAlerts?: number;
}

export function AlertProvider({ children, maxAlerts = 5 }: AlertProviderProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const showAlert = useCallback((message: ReactNode, options: AlertOptions = {}) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newAlert: AlertData = {
      id,
      message,
      type: options.type ?? 'info',
      title: options.title,
      duration: options.duration ?? 5000,
      closable: options.closable ?? true,
      onClose: options.onClose,
    };

    setAlerts(prev => {
      const updated = [newAlert, ...prev];
      return updated.slice(0, maxAlerts);
    });

    // Auto-dismiss if duration is set
    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        dismissAlert(id);
      }, newAlert.duration);
    }

    return id;
  }, [maxAlerts]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const alert = prev.find(a => a.id === id);
      if (alert?.onClose) {
        alert.onClose();
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Expose alert functions to window for external integrations
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store original alert function
      const originalAlert = (window as any).alert;

      // Expose alert API to window.triggerEditorAlerts
      (window as any).triggerEditorAlerts = {
        alert: (message: string, title?: string) => showAlert(message, { title, type: 'info' }),
        success: (message: string, title?: string) => showAlert(message, { title, type: 'success' }),
        info: (message: string, title?: string) => showAlert(message, { title, type: 'info' }),
        warning: (message: string, title?: string) => showAlert(message, { title, type: 'warning' }),
        error: (message: string, title?: string) => showAlert(message, { title, type: 'error' }),
        debug: (message: string, title?: string) => showAlert(message, { title, type: 'debug' }),
        dismiss: dismissAlert,
        clear: clearAllAlerts,
      };

      // Replace window.alert with our custom implementation
      (window as any).alert = (message: string, title?: string) => {
        return showAlert(message, { title, type: 'info' });
      };

      // Cleanup on unmount
      return () => {
        (window as any).alert = originalAlert;
        delete (window as any).triggerEditorAlerts;
      };
    }
  }, [showAlert, dismissAlert, clearAllAlerts]);

  return (
    <AlertContext.Provider value={{ alerts, showAlert, dismissAlert, clearAllAlerts }}>
      {children}
      <AlertContainer alerts={alerts} onDismiss={dismissAlert} />
    </AlertContext.Provider>
  );
}

// Custom hook for easy alert triggering
export function useAlert() {
  const { showAlert, dismissAlert, clearAllAlerts } = useAlertContext();

  return {
    alert: showAlert,
    success: (message: ReactNode, options?: AlertOptions) => 
      showAlert(message, { ...options, type: 'success' }),
    info: (message: ReactNode, options?: AlertOptions) => 
      showAlert(message, { ...options, type: 'info' }),
    warning: (message: ReactNode, options?: AlertOptions) => 
      showAlert(message, { ...options, type: 'warning' }),
    error: (message: ReactNode, options?: AlertOptions) => 
      showAlert(message, { ...options, type: 'error' }),
    debug: (message: ReactNode, options?: AlertOptions) => 
      showAlert(message, { ...options, type: 'debug' }),
    dismiss: dismissAlert,
    clear: clearAllAlerts,
  };
}

// Alert Container - renders all active alerts
interface AlertContainerProps {
  alerts: AlertData[];
  onDismiss: (id: string) => void;
}

function AlertContainer({ alerts, onDismiss }: AlertContainerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="alert-container">
      {alerts.map(alert => (
        <Alert key={alert.id} alert={alert} onDismiss={() => onDismiss(alert.id)} />
      ))}
    </div>
  );
}

// Individual Alert Component
interface AlertProps {
  alert: AlertData;
  onDismiss: () => void;
}

function Alert({ alert, onDismiss }: AlertProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200); // Wait for animation
  };

  const typeStyles: Record<AlertType, { bg: string; border: string; icon: string }> = {
    info: { bg: 'rgba(88, 166, 255, 0.1)', border: '#58a6ff', icon: 'ℹ' },
    success: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', icon: '✓' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '⚠' },
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '✕' },
    debug: { bg: 'rgba(139, 148, 158, 0.1)', border: '#8b949e', icon: '🔍' },
  };

  const style = typeStyles[alert.type ?? 'info'];

  return (
    <div
      className={`alert-item ${isExiting ? 'alert-exit' : 'alert-enter'}`}
      style={{
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        maxWidth: '400px',
        animation: isExiting ? 'alertSlideOut 0.2s ease-out forwards' : 'alertSlideIn 0.3s ease-out',
      }}
    >
      <span
        style={{
          color: style.border,
          fontSize: '16px',
          lineHeight: '1',
          flexShrink: 0,
        }}
      >
        {style.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {alert.title && (
          <div
            style={{
              fontWeight: 600,
              fontSize: '14px',
              color: '#c9d1d9',
              marginBottom: '4px',
            }}
          >
            {alert.title}
          </div>
        )}
        <div
          style={{
            fontSize: '13px',
            color: '#8b949e',
            wordBreak: 'break-word',
          }}
        >
          {alert.message}
        </div>
      </div>
      {alert.closable !== false && (
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8b949e',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: '14px',
            lineHeight: 1,
            borderRadius: '4px',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(139, 148, 158, 0.2)';
            e.currentTarget.style.color = '#c9d1d9';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#8b949e';
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Alert Container CSS styles (to be added to style.css)
export const alertStyles = `
.alert-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  pointer-events: none;
}

.alert-container > * {
  pointer-events: auto;
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes alertSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

.alert-enter {
  animation: alertSlideIn 0.3s ease-out;
}

.alert-exit {
  animation: alertSlideOut 0.2s ease-out forwards;
}
`;

// Inject styles into document
if (typeof document !== 'undefined' && !document.getElementById('alert-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'alert-styles';
  styleEl.textContent = alertStyles;
  document.head.appendChild(styleEl);
}

export default AlertProvider;
