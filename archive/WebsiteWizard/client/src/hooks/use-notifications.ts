import { useState, useEffect } from 'react';
import { notificationService, type Notification } from '@/lib/notification-service';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initialize with current notifications
    setNotifications(notificationService.getAll());
    setUnreadCount(notificationService.getUnreadCount());

    // Subscribe to changes
    const unsubscribe = notificationService.subscribe(() => {
      setNotifications(notificationService.getAll());
      setUnreadCount(notificationService.getUnreadCount());
    });

    return unsubscribe;
  }, []);

  const markAsRead = (id: number) => {
    notificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const deleteNotification = (id: number) => {
    notificationService.delete(id);
  };

  const addMessageNotification = (businessName: string, message: string, businessId?: number) => {
    notificationService.addMessageNotification(businessName, message, businessId);
  };

  const addMeetingNotification = (businessName: string, meetingTime: string, businessId?: number) => {
    notificationService.addMeetingNotification(businessName, meetingTime, businessId);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addMessageNotification,
    addMeetingNotification
  };
}