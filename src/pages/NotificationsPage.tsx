import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';
import { NotificationItem } from '../types';
import { formatRelativeDate } from '../lib/utils';
import { Bell, CheckCheck, ExternalLink, CheckCircle2, AlertTriangle, GitFork } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    notificationService
      .getUserNotifications(user.id)
      .then(setNotifications)
      .catch((err) => console.error('Erreur notifications:', err))
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleOpenNotification = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await notificationService.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.fiche_id) {
      navigate(`/fiches/${notif.fiche_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'confirmation':
        return <CheckCircle2 size={16} className="text-palabre-ok shrink-0" />;
      case 'report':
        return <AlertTriangle size={16} className="text-palabre-fl shrink-0" />;
      case 'variant':
        return <GitFork size={16} className="text-palabre-primary shrink-0" />;
      default:
        return <Bell size={16} className="text-palabre-muted shrink-0" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight mb-1">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-palabre-muted">
            Restez informé des confirmations, retours et évolutions sur vos solutions.
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-palabre-border hover:bg-white text-palabre-text rounded-btn text-xs font-semibold transition-colors cursor-pointer"
          >
            <CheckCheck size={14} />
            <span>Tout marquer comme lu</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-palabre-border rounded-card p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-card border transition-all flex items-center justify-between gap-4 ${
                notif.is_read
                  ? 'bg-white border-palabre-border opacity-75'
                  : 'bg-white border-palabre-primary/30 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(notif.type)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs sm:text-sm font-semibold text-palabre-text">
                      {notif.title}
                    </strong>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-palabre-accent inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-palabre-muted mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {formatRelativeDate(notif.created_at)}
                  </span>
                </div>
              </div>

              {notif.fiche_id && (
                <button
                  onClick={() => handleOpenNotification(notif)}
                  className="px-3 py-1.5 bg-palabre-bg hover:bg-slate-200 border border-palabre-border text-palabre-text rounded-btn text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Ouvrir</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-palabre-border rounded-card p-10 text-center text-xs sm:text-sm text-palabre-muted">
          Vous n'avez aucune notification pour l'instant.
        </div>
      )}
    </div>
  );
};

