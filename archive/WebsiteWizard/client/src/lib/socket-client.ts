import { io, Socket } from 'socket.io-client';

// Types for messages
export interface Message {
  id?: number;
  type?: string;
  direction: 'inbound' | 'outbound';
  message: string;
  timestamp: Date | string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  businessId?: number | string;
  businessName?: string;
  // Sender information
  senderName?: string;
  senderId?: string;
  messageType?: 'admin' | 'client';
  content?: string; // Added for compatibility with client widget
}

// Socket event listeners
type MessageCallback = (message: Message) => void;
type ErrorCallback = (error: Error) => void;
type ConnectionCallback = (connected: boolean) => void;

class SocketClient {
  private socket: Socket | null = null;
  private messageListeners: MessageCallback[] = [];
  private errorListeners: ErrorCallback[] = [];
  private connectionListeners: ConnectionCallback[] = [];
  
  // Get the base URL for the socket connection - ALWAYS use Railway for production messaging
  private getBaseUrl(): string {
    // PRODUCTION-FIRST: Always use Railway for real messaging
    return 'https://pleasantcovedesign-production.up.railway.app';
  }

  // Connect as admin
  connectAdmin(token: string): void {
    if (this.socket) {
      this.disconnect();
    }

    const baseUrl = this.getBaseUrl();
    console.log('Connecting to Railway socket server at:', baseUrl);

    this.socket = io(baseUrl, {
      path: '/socket.io',
      auth: {
        token
      }
    });

    this.setupListeners();
    
    // Join the project-specific room to match the widget's room
    if (this.socket) {
      this.socket.on('connect', () => {
        console.log('Joining project room to receive messages from client widget');
        if (this.socket) {
          // Join the specific project room that the widget uses
          const projectRoom = 'mc516tr5_CSU4OUADdSIHB3AXxZPpbw';
          this.socket.emit('join', projectRoom, (response: any) => {
            console.log('Joined project room:', response);
          });
        }
      });
    }
  }

  // Connect as client
  connectClient(businessId: number): void {
    if (this.socket) {
      this.disconnect();
    }

    const baseUrl = this.getBaseUrl();
    console.log('Connecting to Railway socket server at:', baseUrl);

    this.socket = io(baseUrl, {
      path: '/socket.io',
      auth: {
        businessId
      }
    });

    this.setupListeners();
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Send message as admin
  sendAdminMessage(businessId: number, message: string, senderName: string = 'Admin'): void {
    if (!this.socket?.connected) {
      this.notifyError({ message: 'Not connected to server' });
      return;
    }

    console.log('Sending admin message to business:', businessId, message);
    this.socket.emit('admin:message', { 
      businessId, 
      message, 
      senderName,
      senderId: 'admin-' + this.socket.id 
    });
  }

  // Send message as client
  sendClientMessage(businessId: number, message: string): void {
    if (!this.socket?.connected) {
      this.notifyError({ message: 'Not connected to server' });
      return;
    }

    this.socket.emit('client:message', { businessId, message });
  }

  // Disconnect from server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.notifyConnectionChange(false);
    }
  }

  // Listen for new messages
  onMessage(callback: MessageCallback): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
    };
  }

  // Listen for errors
  onError(callback: ErrorCallback): () => void {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter(cb => cb !== callback);
    };
  }

  // Listen for connection changes
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }

  // Setup socket listeners
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.notifyConnectionChange(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.notifyConnectionChange(false);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.notifyError(error);
    });

    // Listen for new:message (WebsiteWizard format)
    this.socket.on('new:message', (message) => {
      console.log('New message received (new:message):', message);
      this.notifyMessage(message);
    });

    // Also listen for newMessage (client widget format)
    this.socket.on('newMessage', (message) => {
      console.log('New message received (newMessage):', message);
      
      // Normalize the message format
      const normalizedMessage: Message = {
        message: message.content || message.message,
        timestamp: message.createdAt || message.timestamp || new Date(),
        direction: message.senderType === 'admin' ? 'outbound' : 'inbound',
        status: 'delivered',
        businessId: message.projectId || message.businessId,
        senderName: message.senderName,
        senderId: message.senderId || message.id,
        messageType: message.senderType
      };
      
      this.notifyMessage(normalizedMessage);
    });

    this.socket.on('message:sent', (message) => {
      console.log('Message sent confirmation:', message);
      this.notifyMessage({
        ...message,
        status: 'delivered'
      });
    });
    
    // Listen for authentication response
    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });
    
    // Handle project join response for client widget
    this.socket.on('joined', (data) => {
      console.log('Joined project room:', data);
    });
  }

  // Notify message listeners
  private notifyMessage(message: Message): void {
    // Normalize message format - ensure we have both message and content fields
    const normalizedMessage = {
      ...message,
      message: message.message || message.content || '',
      content: message.content || message.message || ''
    };
    
    this.messageListeners.forEach(callback => {
      try {
        callback(normalizedMessage);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  // Notify error listeners
  private notifyError(error: Error | { message: string }): void {
    this.errorListeners.forEach(callback => {
      try {
        // Convert plain objects to Error instances
        const errorObj = error instanceof Error ? error : new Error(error.message);
        callback(errorObj);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  // Notify connection listeners
  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }
}

// Create singleton instance
export const socketClient = new SocketClient(); 