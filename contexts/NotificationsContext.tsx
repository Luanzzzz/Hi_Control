import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { botService } from '../src/services/botService';

export interface NotificationItem {
  id: string;
  type: 'sync' | 'cert_missing' | 'cert_expired';
  message: string;
}

interface NotificationsContextType {
  notifications: NotificationItem[];
  count: number;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

interface NotificationsProviderProps {
  children: ReactNode;
}

const POLL_INTERVAL_MS = 90000;

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const buildNotifications = useCallback((status: Awaited<ReturnType<typeof botService.obterStatus>>) => {
    const items: NotificationItem[] = [];
    if (status.notas_24h > 0) {
      items.push({
        id: 'sync-24h',
        type: 'sync',
        message: `Bot importou ${status.notas_24h} nota(s) nas últimas 24h`,
      });
    }
    const semCert = status.empresas_sem_certificado ?? 0;
    if (semCert > 0) {
      items.push({
        id: 'cert-missing',
        type: 'cert_missing',
        message: `${semCert} empresa(s) sem certificado`,
      });
    }
    const certExp = status.empresas_cert_expirado ?? 0;
    if (certExp > 0) {
      items.push({
        id: 'cert-expired',
        type: 'cert_expired',
        message: `${certExp} empresa(s) com certificado expirado`,
      });
    }
    setNotifications(items);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const status = await botService.obterStatus();
      buildNotifications(status);
    } catch {
      setNotifications([]);
    }
  }, [buildNotifications]);

  useEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refresh]);

  const value: NotificationsContextType = {
    notifications,
    count: notifications.length,
    refresh,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
