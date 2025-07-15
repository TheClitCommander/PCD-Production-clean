// Centralized notification service to manage all notifications across the app
export interface Notification {
  id: number;
  type: 'message' | 'meeting' | 'delivery' | 'call' | 'email' | 'payment';
  title: string;
  description: string;
  time: string;
  read: boolean;
  businessName: string;
  businessId?: number;
  urgent?: boolean;
}

class NotificationService {
  private notifications: Notification[] = [
    {
      id: 1,
      type: "message",
      title: "New lead response",
      description: "Coastal Electric replied to your SMS: 'Yes, we're interested in a new website. When can we schedule a call?'",
      time: "5 minutes ago",
      read: false,
      businessName: "Coastal Electric",
      businessId: 1,
      urgent: true
    },
    {
      id: 2,
      type: "meeting",
      title: "Meeting scheduled",
      description: "Bath Plumbing Co booked a demo call for tomorrow at 2:00 PM",
      time: "1 hour ago",
      read: false,
      businessName: "Bath Plumbing Co",
      businessId: 2
    },
    {
      id: 3,
      type: "delivery",
      title: "Website delivered",
      description: "Portland Auto Repair website is now live at portlandautorepair.com",
      time: "3 hours ago",
      read: true,
      businessName: "Portland Auto Repair",
      businessId: 3
    },
    {
      id: 4,
      type: "call",
      title: "Missed call",
      description: "Missed call from (207) 555-0198 - Brunswick Tire Shop",
      time: "4 hours ago",
      read: true,
      businessName: "Brunswick Tire Shop",
      businessId: 4
    },
    {
      id: 5,
      type: "email",
      title: "Email inquiry",
      description: "New email from Freeport Landscaping asking about our services",
      time: "6 hours ago",
      read: true,
      businessName: "Freeport Landscaping",
      businessId: 5
    },
    {
      id: 6,
      type: "payment",
      title: "Payment received",
      description: "$1,200 payment received from Yarmouth Dental for website package",
      time: "1 day ago",
      read: true,
      businessName: "Yarmouth Dental",
      businessId: 6
    }
  ];

  private listeners: (() => void)[] = [];

  getAll(): Notification[] {
    return this.notifications;
  }

  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id: number): void {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.notifyListeners();
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.notifyListeners();
  }

  delete(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  addNotification(notification: Omit<Notification, 'id'>): void {
    const newNotification = {
      ...notification,
      id: Math.max(...this.notifications.map(n => n.id), 0) + 1
    };
    this.notifications.unshift(newNotification);
    this.notifyListeners();
  }

  // Add a new message notification when a business responds
  addMessageNotification(businessName: string, message: string, businessId?: number): void {
    this.addNotification({
      type: 'message',
      title: 'New lead response',
      description: `${businessName} replied: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`,
      time: 'Just now',
      read: false,
      businessName,
      businessId,
      urgent: true
    });
  }

  // Add a meeting notification
  addMeetingNotification(businessName: string, meetingTime: string, businessId?: number): void {
    this.addNotification({
      type: 'meeting',
      title: 'Meeting scheduled',
      description: `${businessName} booked a demo call for ${meetingTime}`,
      time: 'Just now',
      read: false,
      businessName,
      businessId
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const notificationService = new NotificationService();