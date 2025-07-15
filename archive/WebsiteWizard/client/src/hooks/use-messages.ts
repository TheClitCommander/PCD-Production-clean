import { useState, useEffect, useCallback } from 'react';
import { socketClient, Message } from '../lib/socket-client';
import { useToast } from './use-toast';
import { useNotifications } from './use-notifications';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMessages(businessId?: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { addMessageNotification } = useNotifications();
  
  // Load message history from Railway API
  const { data: messageHistory, isLoading, refetch } = useQuery({
    queryKey: ['messageHistory', businessId],
    queryFn: () => api.getMessageHistory(businessId),
    enabled: true, // Always enabled to load all messages
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });

  // Convert Railway message format to our Message interface
  const convertRailwayMessage = useCallback((railwayMsg: any): Message => {
    // Map projectToken to businessId for proper conversation organization
    let mappedBusinessId = undefined;
    if (railwayMsg.projectToken === 'mc516tr5_CSU4OUADdSIHB3AXxZPpbw') {
      mappedBusinessId = 1; // Map to business ID 1 (Coastal Electric)
    }
    
    return {
      id: railwayMsg.id,
      direction: railwayMsg.direction || (railwayMsg.senderType === 'admin' ? 'outbound' : 'inbound'),
      message: railwayMsg.message || railwayMsg.content || '',
      timestamp: railwayMsg.timestamp || railwayMsg.createdAt || new Date(),
      businessId: mappedBusinessId, // Use mapped businessId instead of railwayMsg.businessId
      senderName: railwayMsg.senderName,
      messageType: railwayMsg.senderType,
      status: railwayMsg.status || 'delivered'
    };
  }, []);

  // Update messages when Railway data comes in
  useEffect(() => {
    if (messageHistory && Array.isArray(messageHistory)) {
      console.log('[MESSAGES] Loading message history from Railway:', messageHistory);
      const convertedMessages = messageHistory.map(convertRailwayMessage);
      setMessages(convertedMessages);
    }
  }, [messageHistory, convertRailwayMessage]);

  // Handle new messages from socket
  const handleNewMessage = useCallback((message: Message) => {
    console.log('[MESSAGES] Received new socket message:', message);
    
    // Ensure the message has all required fields
    const messageContent = message.message || message.content || '';
    if (!messageContent.trim()) {
      console.warn('[MESSAGES] Received empty message, ignoring');
      return;
    }

    // Filter by business ID if specified
    if (businessId && message.businessId && message.businessId.toString() !== businessId.toString()) {
      console.log('[MESSAGES] Message not for current business, ignoring');
      return;
    }

    // Ensure the message has all required fields
    const normalizedMessage: Message = {
      ...message,
      message: messageContent,
      timestamp: message.timestamp || new Date(),
      direction: message.direction || 
        (message.messageType === 'admin' ? 'outbound' : 'inbound')
    };

    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const exists = prev.some(m => 
        m.id === normalizedMessage.id || 
        (m.message === normalizedMessage.message && 
         Math.abs(new Date(m.timestamp).getTime() - new Date(normalizedMessage.timestamp).getTime()) < 1000)
      );
      
      if (exists) {
        console.log('[MESSAGES] Duplicate message detected, ignoring');
        return prev;
      }

      console.log('[MESSAGES] Adding new message to state');
      return [...prev, normalizedMessage];
    });

    // Show notification for inbound messages
    if (normalizedMessage.direction === 'inbound') {
      addMessageNotification(
        normalizedMessage.senderName || 'Client',
        `${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`,
        normalizedMessage.businessId ? Number(normalizedMessage.businessId) : undefined
      );

      toast({
        title: "New Message",
        description: `${normalizedMessage.senderName || 'Client'}: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`,
      });
    }

    // Refetch message history to stay in sync with Railway
    refetch();
  }, [businessId]); // Only depend on businessId, not on changing functions

  // Socket connection management
  useEffect(() => {
    console.log('[MESSAGES] Setting up socket listeners');
    
    // Listen for connection status
    const removeConnectionListener = socketClient.onConnectionChange(setConnected);
    
    // Listen for messages - handle both event types from Railway
    const removeMessageListener = socketClient.onMessage(handleNewMessage);
    
    // Connect as admin only once
    if (!socketClient.isConnected()) {
      socketClient.connectAdmin('admin-token');
    }
    
    return () => {
      console.log('[MESSAGES] Cleaning up socket listeners');
      removeConnectionListener();
      removeMessageListener();
    };
  }, []); // Empty dependency array to prevent reconnection loop

  // Send message function using Railway API
  const sendMessage = useCallback(async (content: string, businessId?: number) => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      console.log('[MESSAGES] Sending message via Railway API:', { content, businessId });
      
      // Send via Railway API
      await api.sendMessage(businessId || 1, content, 'admin');
      
      // Refetch messages to get the latest state from Railway
      await refetch();
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, refetch]);

  return {
    messages,
    sendMessage,
    connected,
    loading: loading || isLoading,
    refetch
  };
} 