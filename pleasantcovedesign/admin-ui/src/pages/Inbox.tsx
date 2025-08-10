import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Search, 
  Send,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  User,
  X,
  MessageSquare
} from 'lucide-react'
import api, { getWebSocketUrl } from '../api'
import { io, Socket } from 'socket.io-client'
import TokenDebugPanel from '../components/TokenDebugPanel'
import InvalidTokenError from '../components/InvalidTokenError'

interface Message {
  id: number
  projectId: number
  projectToken: string
  content: string
  senderName: string
  senderType: 'client' | 'admin'
  createdAt: string
  readAt?: string
  attachments?: string[]
}

interface ClientProfile {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  industry: string | null
  website: string | null
  priority: string | null
}

interface Conversation {
  id: number
  projectId: number
  projectToken: string
  projectTitle: string
  customerName: string
  customerEmail: string
  lastMessage?: Message
  lastMessageTime: string
  unreadCount: number
  messages: Message[]
  clientProfile?: ClientProfile | null
}

const Inbox: React.FC = () => {
  const navigate = useNavigate()
  const { projectToken } = useParams<{ projectToken?: string }>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [searchTerm, setSearchTerm] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [showProjectHelper, setShowProjectHelper] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationsRef = useRef<Conversation[]>([])
  const selectedConversationRef = useRef<Conversation | null>(null)
  const autoSelectedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fetchHasRun = useRef(false)

  // Cache last opened project token
  useEffect(() => {
    if (selectedConversation?.projectToken) {
      localStorage.setItem('pcd_last_admin_project', selectedConversation.projectToken)
    }
  }, [selectedConversation])

  // Auto-redirect to last-used token if no token in URL
  useEffect(() => {
    if (!projectToken && !loading) {
      const lastProject = localStorage.getItem('pcd_last_admin_project')
      if (lastProject && conversations.some(c => c.projectToken === lastProject)) {
        navigate(`/inbox/${lastProject}`, { replace: true })
      }
    }
  }, [projectToken, loading, conversations, navigate])

  useEffect(() => {
    conversationsRef.current = conversations
    selectedConversationRef.current = selectedConversation
  }, [conversations, selectedConversation])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const joinConversationRoom = (projectToken: string) => {
    // This function is now primarily for logging and future-proofing.
    // The main 'admin-room' is joined on connect and is sufficient.
    console.log(`🔍 [ROOM_DEBUG] Acknowledging selection of room: ${projectToken}`)
  }

  // Handle conversation selection - NO LONGER JOINS/LEAVES ROOMS
  const handleConversationSelect = async (conversation: Conversation) => {
    console.log('🎯 [SELECT] Selected conversation:', conversation.customerName);
    
    // Navigate to the conversation's URL
    if (conversation.projectToken !== projectToken) {
      navigate(`/inbox/${conversation.projectToken}`)
    }
    
    // Mark all unread client messages as read
    const unreadMessages = conversation.messages.filter(m => m.senderType === 'client' && !m.readAt);
    const readAt = new Date().toISOString();
    
    console.log(`📖 [READ_MESSAGES] Found ${unreadMessages.length} unread messages for ${conversation.customerName}`);
    
    // Update conversation locally without waiting for API calls
    const updatedMessages = conversation.messages.map(msg => ({
      ...msg,
      readAt: (msg.senderType === 'client' && !msg.readAt) ? readAt : msg.readAt
    }));
    
    // Update the conversation in state immediately for better UX
    const updatedConversation = {
      ...conversation,
      unreadCount: 0,
      messages: updatedMessages
    };
    setSelectedConversation(updatedConversation);
    
    // Update conversations list
    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === conversation.id
          ? updatedConversation
          : conv
      )
    );
    
    // Now try to update on the server in the background
    for (const msg of unreadMessages) {
      try {
        console.log(`📖 [READ_MESSAGES] Marking message ${msg.id} as read`);
        // Try with both endpoint formats for backward compatibility
        try {
          await api.post(`/messages/${msg.id}/read`);
          console.log(`✅ [READ_MESSAGES] Successfully marked message ${msg.id} as read`);
        } catch (innerError: any) {
          if (innerError.response?.status === 404) {
            // Try alternative endpoint format
            await api.post(`/admin/messages/${msg.id}/read`);
            console.log(`✅ [READ_MESSAGES] Successfully marked message ${msg.id} as read (alternative endpoint)`);
          } else {
            throw innerError; // Re-throw for outer catch
          }
        }
      } catch (error: any) {
        // Handle errors gracefully
        if (error.response?.status === 404) {
          console.warn(`⚠️ Read receipt endpoint not available on server - messages will appear unread on reload`);
          // Don't spam console with repeated 404s
          break;
        } else if (error.code === 'ERR_NETWORK') {
          console.warn(`⚠️ Network error marking message as read - will retry on next selection`);
          break;
        } else {
          console.error('Failed to mark message as read:', error);
        }
      }
    }
    
    // Cache this selection
    localStorage.setItem('pcd_last_admin_project', conversation.projectToken)
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  useEffect(() => {
    console.log(`🔌 [WEBSOCKET] Setting up WebSocket connection for Admin Inbox...`);
    
    const backendUrl = getWebSocketUrl();
    console.log(`🔌 [WEBSOCKET] Connecting to: ${backendUrl}`);
    setConnectionStatus('connecting');
    
    // Try to connect to WebSocket with fallback options
    let socket;
    try {
      socket = io(backendUrl, {
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000, // Increase timeout
      });
      
      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize socket.io:', error);
      setConnectionStatus('error');
      // Continue with local functionality only
      return;
    }
    
    // Add connection error handler
    socket.on('connect_error', (error) => {
      console.error(`❌ [WEBSOCKET] Connection error:`, error);
      setConnectionStatus('error');
    });
    
    socket.on('connect', () => {
      console.log(`✅ [WEBSOCKET] Connected with ID: ${socket.id}`);
      setConnectionStatus('connected');
      console.log('🏠 [WEBSOCKET] Joining universal admin room...');
      
      // Try to join admin room, but don't block on failure
      try {
        socket.emit('join', 'admin-room', (response: any) => {
          console.log(`✅ [WEBSOCKET] Join response for admin-room:`, response);
        });
      } catch (error) {
        console.warn('Failed to join admin room, but continuing with local functionality:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ [WEBSOCKET] Disconnected:`, reason);
      setConnectionStatus('disconnected');
    });

    // Add debugging for ALL socket events
    socket.onAny((eventName, ...args) => {
      console.log(`🎧 [SOCKET_EVENT] Received event: ${eventName}`, args);
    });

    // Enhanced admin message handler with detailed logging
    socket.on('newMessage', (message: Message) => {
      console.log('🛰️ [Admin UI] Received newMessage event:', message);
      console.log('📨 [ADMIN_BROADCAST] Received newMessage event');
      console.log('📨 [ADMIN_BROADCAST] Message data:', JSON.stringify(message, null, 2));
      
      // Validate message structure
      if (!message.projectToken) {
        console.error('❌ [ADMIN_BROADCAST] Message missing projectToken:', message);
        return;
      }
      
      if (!message.id) {
        console.error('❌ [ADMIN_BROADCAST] Message missing ID:', message);
        return;
      }
      
      setConversations(prevConvos => {
        const newConversations = [...prevConvos];
        const convoIndex = newConversations.findIndex(c => c.projectToken === message.projectToken);

        if (convoIndex > -1) {
          // Conversation exists, update it
          const updatedConvo = { ...newConversations[convoIndex] };
          const messageExists = updatedConvo.messages.some(m => m.id === message.id);
          
          if (!messageExists) {
            updatedConvo.messages = [...updatedConvo.messages, message];
            updatedConvo.lastMessage = message;
            updatedConvo.lastMessageTime = message.createdAt;
            
            // Only increment unread count for CLIENT messages without readAt when conversation is not selected
            if (message.senderType === 'client' && !message.readAt && selectedConversationRef.current?.projectToken !== message.projectToken) {
              updatedConvo.unreadCount = (updatedConvo.unreadCount || 0) + 1;
            }
            newConversations[convoIndex] = updatedConvo;
            
            // CRITICAL FIX: Update selectedConversation if this is the currently selected conversation
            if (selectedConversationRef.current?.projectToken === message.projectToken) {
              console.log('🎯 [REALTIME_UPDATE] Updating selected conversation with new message');
              setSelectedConversation(updatedConvo);
            }
          }
        } else {
          // New conversation, create it
          const newConversation: Conversation = {
            id: message.projectId || Date.now(),
            projectId: message.projectId,
            projectToken: message.projectToken,
            projectTitle: `${message.senderName || 'New Conversation'}'s Project`,
            customerName: message.senderName || 'New Conversation',
            customerEmail: 'unknown@example.com',
            lastMessage: message,
            lastMessageTime: message.createdAt,
            unreadCount: message.senderType === 'client' ? 1 : 0,
            messages: [message],
          };
          newConversations.unshift(newConversation);
        }

        // Return the sorted list
        return newConversations.sort((a, b) => 
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
      });
    });
    
    // Listen for read receipts
    socket.on('messagesRead', (data: { projectToken: string, messageIds: number[], readAt: string }) => {
      console.log('📖 [READ_RECEIPT] Messages marked as read:', data);
      
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.projectToken === data.projectToken) {
            // Update read status for messages in this conversation
            const updatedMessages = conv.messages.map(msg => {
              if (data.messageIds.includes(msg.id)) {
                return { ...msg, readAt: data.readAt };
              }
              return msg;
            });
            
            // Recalculate unread count
            const newUnreadCount = updatedMessages.filter(msg => 
              msg.senderType === 'client' && !msg.readAt
            ).length;
            
            console.log(`📖 [READ_RECEIPT] Updated unread count for ${conv.customerName}: ${conv.unreadCount} → ${newUnreadCount}`);
            
            // Also update selected conversation if it matches
            if (selectedConversationRef.current?.projectToken === data.projectToken) {
              setSelectedConversation(prev => prev ? { 
                ...prev, 
                messages: updatedMessages,
                unreadCount: newUnreadCount
              } : null);
            }
            
            return { 
              ...conv, 
              messages: updatedMessages, 
              unreadCount: newUnreadCount 
            };
          }
          return conv;
        });
      });
    });

    // Listen for single message read receipts
    socket.on('messageRead', (data: { messageId: number, readAt: string }) => {
      console.log('📖 [SINGLE_READ] Message marked as read:', data);
      
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          const messageExists = conv.messages.some(msg => msg.id === data.messageId);
          if (messageExists) {
            const updatedMessages = conv.messages.map(msg => {
              if (msg.id === data.messageId) {
                return { ...msg, readAt: data.readAt };
              }
              return msg;
            });
            
            // Recalculate unread count
            const newUnreadCount = updatedMessages.filter(msg => 
              msg.senderType === 'client' && !msg.readAt
            ).length;
            
            console.log(`📖 [SINGLE_READ] Updated unread count for ${conv.customerName}: ${conv.unreadCount} → ${newUnreadCount}`);
            
            // Update selected conversation if it matches
            if (selectedConversationRef.current?.projectToken === conv.projectToken) {
              setSelectedConversation(prev => prev ? { 
                ...prev, 
                messages: updatedMessages,
                unreadCount: newUnreadCount
              } : null);
            }
            
            return { 
              ...conv, 
              messages: updatedMessages, 
              unreadCount: newUnreadCount 
            };
          }
          return conv;
        });
      });
    });

    return () => {
      console.log(`🔌 [WEBSOCKET] Cleaning up admin connection...`);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchConversations = async () => {
      if (fetchHasRun.current) {
        console.log('⏭️ [FETCH] Fetch already ran, skipping');
        return;
      }
      
      console.log('📥 [FETCH] Starting conversation fetch...');
      
      try {
        const businessId = 1;
        console.log(`📥 [FETCH] Fetching messages for business ${businessId}...`);
        
        const messagesRes = await api.get(`/admin/inbox`);
        console.log('📥 [FETCH] Raw API response:', messagesRes.data);
        
        const businessData = messagesRes.data;
        
        if (!businessData.projectMessages) {
          console.log('⚠️ [FETCH] No projectMessages in response');
          setConversations([]);
          setLoading(false);
          return;
        }
        
        console.log(`📥 [FETCH] Found ${businessData.projectMessages.length} projects`);
        
        const conversationList: Conversation[] = [];
        
        businessData.projectMessages.forEach((project: any, index: number) => {
          console.log(`📋 [FETCH] Processing project ${index + 1}:`, {
            projectId: project.projectId,
            accessToken: project.accessToken,
            projectTitle: project.projectTitle,
            customerName: project.customerName,
            messageCount: project.messages?.length || 0
          });
          
          // Use customerName from API response if available, otherwise parse from title
          const customerName = project.customerName || project.projectTitle.split(' - ')[0] || 'Unknown Customer';
          
          const messages: Message[] = project.messages ? project.messages.map((msg: any, msgIndex: number) => {
            console.log(`📝 [FETCH] Processing message ${msgIndex + 1}:`, msg);
            
            return {
              id: msg.id || `temp_${Date.now()}_${msgIndex}`,
              projectId: project.projectId,
              projectToken: project.accessToken, // Key mapping
              content: msg.content || msg.body || '',
              senderName: msg.senderName || msg.sender || 'Unknown',
              senderType: msg.senderType || 'client',
              createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
              readAt: msg.readAt, // Include readAt field
              attachments: msg.attachments || []
            };
          }) : [];
          
          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          const conversation: Conversation = {
            id: project.projectId,
            projectId: project.projectId,
            projectToken: project.accessToken,
            projectTitle: project.projectTitle,
            customerName: customerName,
            customerEmail: project.customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            lastMessage: messages[messages.length - 1] || undefined,
            lastMessageTime: messages[messages.length - 1]?.createdAt || new Date().toISOString(),
            unreadCount: project.unreadCount || 0, // Use backend-calculated unread count
            messages: messages,
            clientProfile: project.clientProfile || null
          };
          
          conversationList.push(conversation);
          console.log(`✅ [FETCH] Created conversation for ${customerName} with ${messages.length} messages, ${conversation.unreadCount} unread`);
        });
        
        // Priority sorting: Unread conversations first, then by newest message
        conversationList.sort((a, b) => {
          // First priority: Unread messages (unread conversations go to top)
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          
          // Second priority: Most recent message time
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });

        console.log(`📥 [FETCH] Final conversation list:`, conversationList.map(c => ({
          name: c.customerName,
          token: c.projectToken,
          messageCount: c.messages.length
        })));
        
        setConversations(conversationList);
        
        // Auto-select based on URL token or first conversation
        if (!selectedConversation && !autoSelectedRef.current && conversationList.length > 0) {
          let conversationToSelect = null;
          
          // If we have a project token in the URL, try to find that conversation
          if (projectToken) {
            console.log(`🎯 [AUTO_SELECT] Looking for conversation with token: ${projectToken}`);
            conversationToSelect = conversationList.find(c => c.projectToken === projectToken);
            if (conversationToSelect) {
              console.log(`✅ [AUTO_SELECT] Found conversation for token: ${conversationToSelect.customerName}`);
            } else {
              console.log(`⚠️ [AUTO_SELECT] No conversation found for token: ${projectToken}`);
              // Mark token as invalid if not found
              setInvalidToken(true);
            }
          }
          
          // If no token or conversation not found, select the first one
          if (!conversationToSelect) {
            conversationToSelect = conversationList[0];
            console.log(`🎯 [AUTO_SELECT] Auto-selecting first conversation: ${conversationToSelect.customerName}`);
          }
          
          // Use handleConversationSelect to ensure messages are marked as read
          await handleConversationSelect(conversationToSelect);
          autoSelectedRef.current = true;
        }
        
      } catch (error) {
        console.error('❌ [FETCH] Error fetching conversations:', error);
        if (error instanceof Error) {
          console.error('❌ [FETCH] Error details:', error.message);
          console.error('❌ [FETCH] Error stack:', error.stack);
        }
      } finally {
        setLoading(false);
        fetchHasRun.current = true;
      }
    };

    fetchConversations();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setAttachments(prev => [...prev, ...newFiles])
    
    // Clear the input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
  }

  // Handler functions for conversation actions
  const handlePhoneCall = (conversation: Conversation | null) => {
    if (!conversation?.clientProfile?.phone) {
      alert('❌ Phone number not available for this client')
      return
    }
    
    const phone = conversation.clientProfile.phone
    const telLink = `tel:${phone}`
    
    // Try to open the phone dialer
    window.location.href = telLink
    
    // Also show a confirmation
    alert(`📞 Calling ${conversation.customerName} at ${phone}`)
  }

  const handleVideoCall = (conversation: Conversation | null) => {
    if (!conversation?.clientProfile) {
      alert('❌ Client profile not available')
      return
    }
    
    // For now, show a "coming soon" message
    // In the future, this could integrate with Zoom, Teams, etc.
    alert(`📹 Video call feature coming soon!\n\nClient: ${conversation.customerName}\nEmail: ${conversation.clientProfile.email || 'N/A'}`)
  }

  const handleConversationMenu = (conversation: Conversation | null) => {
    if (!conversation) return
    
    // Show conversation options menu
    const actions = [
      'Mark as Unread',
      'Archive Conversation', 
      'Delete Conversation',
      'Export Messages',
      'View Client Profile'
    ]
    
    const choice = prompt(`Conversation Options for ${conversation.customerName}:\n\n${actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}\n\nEnter number (1-${actions.length}):`)
    
    if (choice && parseInt(choice) >= 1 && parseInt(choice) <= actions.length) {
      const selectedAction = actions[parseInt(choice) - 1]
      alert(`Selected: ${selectedAction}\n\n(Feature implementation coming soon!)`)
    }
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !selectedConversation) {
      console.log('❌ Cannot send message: missing content or conversation')
      return
    }

    try {
      console.log('📤 Sending admin message to project:', {
        projectId: selectedConversation.projectId,
        projectToken: selectedConversation.projectToken,
        customerName: selectedConversation.customerName,
        messageContent: newMessage,
        filesCount: attachments.length
      })
      
      let response;
      
      if (attachments.length > 0) {
        // Use FormData for file uploads via public API
        const formData = new FormData()
        formData.append('content', newMessage || '')
        formData.append('senderName', 'Pleasant Cove Design')
        formData.append('senderType', 'admin')
        
        attachments.forEach(file => {
          formData.append('files', file)
        })
        
        response = await fetch(`${getWebSocketUrl()}/api/public/project/${selectedConversation.projectToken}/messages`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        response = { data: await response.json() }
      } else {
        // Use unified messaging API for text-only messages
        response = await api.post(`/messages`, {
          projectToken: selectedConversation.projectToken,
          sender: 'Pleasant Cove Design',
          body: newMessage,
          attachmentKeys: [],
          hasFiles: false
        })
      }

      console.log('✅ Admin message sent successfully:', response.data)

      // Clear the input immediately
      setNewMessage('')
      setAttachments([])
      
      // Add message instantly via optimistic update (WebSocket will handle real-time sync)
      const sentMessage: Message = {
        id: response.data.id || Date.now(), // Use server ID or temporary ID
        projectId: selectedConversation.projectId,
        projectToken: selectedConversation.projectToken,
        content: response.data.content || newMessage || '',
        senderName: response.data.senderName || 'Pleasant Cove Design',
        senderType: response.data.senderType || 'admin',
        createdAt: response.data.createdAt || new Date().toISOString(),
        attachments: response.data.attachments || []
      }
      
      // Update conversations state instantly
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conversation => {
          if (conversation.id === selectedConversation?.id) {
            // Check for duplicates
            const messageExists = conversation.messages.some(m => m.id === sentMessage.id)
            if (messageExists) return conversation
            
            const updatedMessages = [...conversation.messages, sentMessage]
            const updatedConversation = {
              ...conversation,
              messages: updatedMessages,
              lastMessage: sentMessage,
              lastMessageTime: sentMessage.createdAt
            }
            
            // Update selected conversation
            setSelectedConversation(updatedConversation)
            
            return updatedConversation
          }
          return conversation
        })
        
        return updatedConversations
      })
      
    } catch (error) {
      console.error('❌ Failed to send admin message:', error)
      
      // Show more detailed error message
      let errorMessage = 'Failed to send message. Please try again.'
      if (error instanceof Error) {
        errorMessage = `Failed to send message: ${error.message}`
      }
      
      alert(errorMessage)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Sort conversations by last activity and filter by search
  const filteredConversations = conversations
    .filter(conv => 
      conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by last message time (most recent first)
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    })

  // Add helper to navigate to a specific project
  const navigateToProject = (token: string) => {
    navigate(`/inbox/${token}`)
    window.location.reload() // Force reload to ensure proper initialization
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading conversations...</div>
      </div>
    )
  }

  // Show error if invalid token
  if (invalidToken && projectToken) {
    return <InvalidTokenError token={projectToken} onRetry={() => {
      setInvalidToken(false)
      fetchHasRun.current = false
      window.location.reload()
    }} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Project Helper Panel */}
      {showProjectHelper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Project Navigation Helper</h3>
              <button
                onClick={() => setShowProjectHelper(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                Current URL Token: <code className="bg-blue-100 px-2 py-1 rounded">{projectToken || 'none'}</code>
              </p>
              <p className="text-sm text-blue-800">
                Selected Conversation: <code className="bg-blue-100 px-2 py-1 rounded">{selectedConversation?.projectToken ? `${selectedConversation.customerName} (${selectedConversation.projectToken.substring(0, 8)}...)` : 'none'}</code>
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Available Conversations (sorted by recent activity):</p>
              {filteredConversations.map((conv) => (
                <div
                  key={conv.projectToken}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{conv.customerName}</p>
                      <span className="text-xs text-gray-500">• {conv.customerEmail}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Token: {conv.projectToken.substring(0, 8)}... • Last activity: {formatTime(conv.lastMessageTime)}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {conv.lastMessage.senderType === 'admin' ? 'You: ' : `${conv.lastMessage.senderName}: `}
                        {conv.lastMessage.content || '📎 Attachment'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      handleConversationSelect(conv)
                      setShowProjectHelper(false)
                    }}
                    className={`px-3 py-1 text-sm rounded whitespace-nowrap ml-2 ${
                      conv.projectToken === selectedConversation?.projectToken
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {conv.projectToken === selectedConversation?.projectToken ? 'Current' : 'Select'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Tip:</strong> The system automatically remembers your last opened conversation.
              </p>
              <p className="text-xs text-gray-500">
                Direct link to current conversation:
              </p>
              <code className="block bg-gray-200 p-2 rounded text-xs break-all mt-1">
                {window.location.origin}/inbox/{selectedConversation?.projectToken || '<PROJECT_TOKEN>'}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Main Inbox Container - Full Screen */}
      <div className="flex h-screen w-full bg-white">
        {/* Conversations Sidebar */}
        <div className="w-80 lg:w-96 xl:w-80 border-r border-gray-200 flex flex-col bg-gray-50">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground">Business Inbox</h1>
              {/* Connection status */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowProjectHelper(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Open project navigation helper"
                >
                  <MessageSquare className="w-3 h-3" />
                  Projects
                </button>
                <button
                  onClick={async () => {
                    console.log('🔄 Manual refresh triggered');
                    fetchHasRun.current = false;
                    const fetchConversations = async () => {
                      try {
                        const messagesRes = await api.get(`/admin/inbox`);
                        const businessData = messagesRes.data;
                        
                        if (!businessData.projectMessages) {
                          setConversations([]);
                          return;
                        }
                        
                        const conversationList: Conversation[] = [];
                        
                        businessData.projectMessages.forEach((project: any) => {
                          const customerName = project.customerName || project.projectTitle.split(' - ')[0] || 'Unknown Customer';
                          
                          const messages: Message[] = project.messages ? project.messages.map((msg: any) => ({
                            id: msg.id || `temp_${Date.now()}_${Math.random()}`,
                            projectId: project.projectId,
                            projectToken: project.accessToken,
                            content: msg.content || msg.body || '',
                            senderName: msg.senderName || msg.sender || 'Unknown',
                            senderType: msg.senderType || 'client',
                            createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
                            attachments: msg.attachments || []
                          })) : [];
                          
                          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                          
                          const conversation: Conversation = {
                            id: project.projectId,
                            projectId: project.projectId,
                            projectToken: project.accessToken,
                            projectTitle: project.projectTitle,
                            customerName: customerName,
                            customerEmail: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                            lastMessage: messages[messages.length - 1] || undefined,
                            lastMessageTime: messages[messages.length - 1]?.createdAt || new Date().toISOString(),
                            unreadCount: 0,
                            messages: messages
                          };
                          
                          conversationList.push(conversation);
                        });
                        
                        conversationList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
                        setConversations(conversationList);
                        console.log('✅ Manual refresh complete:', conversationList.length, 'conversations');
                      } catch (error) {
                        console.error('❌ Manual refresh failed:', error);
                      }
                    };
                    await fetchConversations();
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Refresh conversations"
                >
                  🔄
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</span>
                  {(() => {
                    const totalUnread = filteredConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
                    return totalUnread > 0 ? (
                      <div className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                        {totalUnread} new
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-xs font-medium ${
                    connectionStatus === 'connected' ? 'text-green-600' : 
                    connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {connectionStatus === 'connected' ? 'Live' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={`conversation-${conversation.id}`}
                onClick={() => handleConversationSelect(conversation)}
                className={`conversation-item ${
                  selectedConversation?.id === conversation.id 
                    ? 'conversation-item-active' 
                    : conversation.unreadCount > 0 
                      ? 'conversation-item-unread' 
                      : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`${conversation.unreadCount > 0 ? 'font-bold' : 'font-medium'} text-foreground truncate`}>
                        {conversation.customerName || 'Unknown Customer'}
                      </p>
                      <span className={`text-xs ${conversation.unreadCount > 0 ? 'text-blue-600 font-medium' : 'text-muted'}`}>
                        {conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : ''}
                      </span>
                    </div>
                    <p className={`text-sm ${conversation.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-muted'} truncate`}>
                      {conversation.projectTitle || 'No Title'}
                    </p>
                    {conversation.lastMessage ? (
                      <p className={`text-sm ${conversation.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-muted'} truncate mt-1`}>
                        {conversation.lastMessage.senderType === 'admin' ? '🔵 You: ' : '💬 '}
                        {conversation.lastMessage.content || (conversation.lastMessage.attachments?.length ? `📎 ${conversation.lastMessage.attachments.length} file(s)` : 'Message')}
                      </p>
                    ) : (
                      <p className="text-sm text-muted truncate mt-1 italic">No messages yet</p>
                    )}
                    {conversation.unreadCount > 0 && (
                      <div className="absolute top-3 right-3 flex items-center">
                        <div className="relative">
                          <div className="unread-pulse absolute inline-flex h-4 w-4 rounded-full bg-blue-400 opacity-75"></div>
                          <div className="relative inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-md">
                            {conversation.unreadCount}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredConversations.length === 0 && !loading && (
              <div className="p-8 text-center text-muted">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area - Full remaining width */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">
                        {selectedConversation.customerName}
                      </h2>
                      <p className="text-sm text-muted">
                        {selectedConversation.projectTitle}
                      </p>
                      <p className="text-xs text-muted">
                        Token: {selectedConversation.projectToken}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      className="btn-icon"
                      onClick={() => handlePhoneCall(selectedConversation)}
                      title="Call client"
                    >
                      <Phone className="h-4 w-4 text-muted" />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => handleVideoCall(selectedConversation)}
                      title="Start video call"
                    >
                      <Video className="h-4 w-4 text-muted" />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => handleConversationMenu(selectedConversation)}
                      title="Conversation options"
                    >
                      <MoreVertical className="h-4 w-4 text-muted" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={`message-${message.id}`}
                    className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 ${
                      message.senderType === 'admin'
                        ? 'message-bubble-admin'
                        : 'message-bubble-client'
                    }`}>
                      {message.content && <p className="text-sm">{message.content}</p>}
                      
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((attachment, attachmentIndex) => {
                            const fileName = attachment.split('/').pop() || 'attachment';
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                            const isVideo = /\.(mp4|webm|mov|avi)$/i.test(fileName);
                            const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(fileName);
                            const isPdf = /\.pdf$/i.test(fileName);
                            
                            // Use Railway URLs directly (server-side URLs are now fixed)
                            let displayUrl = attachment;
                            if (isImage && attachment.includes('/uploads/') && !attachment.startsWith('https://pcd-production-clean-production-e6f3.up.railway.app')) {
                              // Fix any remaining old Railway URLs to use the correct domain
                              displayUrl = attachment.replace(
                                'https://pleasantcovedesign-production.up.railway.app',
                                'https://pcd-production-clean-production-e6f3.up.railway.app'
                              );
                            }
                            
                            if (isImage) {
                              return (
                                <div key={attachmentIndex} className="mt-2">
                                  <img 
                                    src={displayUrl} 
                                    alt={fileName}
                                    className="max-w-48 max-h-32 rounded cursor-pointer border border-gray-200 hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(displayUrl, '_blank')}
                                    onError={(e) => {
                                      // Fallback to file link if image fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <a
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`items-center gap-2 text-xs underline hover:no-underline ${
                                      message.senderType === 'admin' ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                    style={{ display: 'none' }}
                                  >
                                    📷 {fileName}
                                  </a>
                                </div>
                              );
                            } else if (isVideo) {
                              return (
                                <div key={attachmentIndex} className="mt-2">
                                  <video 
                                    controls
                                    className="max-w-64 max-h-40 rounded border border-gray-200"
                                    preload="metadata"
                                  >
                                    <source src={attachment} />
                                    Your browser does not support video playback.
                                  </video>
                                  <a
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs underline hover:no-underline mt-1 ${
                                      message.senderType === 'admin' ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                  >
                                    🎬 {fileName}
                                  </a>
                                </div>
                              );
                            } else if (isAudio) {
                              return (
                                <div key={attachmentIndex} className="mt-2">
                                  <audio 
                                    controls
                                    className="w-full max-w-64"
                                    preload="metadata"
                                  >
                                    <source src={attachment} />
                                    Your browser does not support audio playback.
                                  </audio>
                                  <a
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs underline hover:no-underline mt-1 ${
                                      message.senderType === 'admin' ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                  >
                                    🎵 {fileName}
                                  </a>
                                </div>
                              );
                            } else {
                              // Get appropriate icon based on file type
                              const getFileIcon = (filename: string) => {
                                if (isPdf) return '📄';
                                if (/\.(doc|docx)$/i.test(filename)) return '📝';
                                if (/\.(xls|xlsx|csv)$/i.test(filename)) return '📊';
                                if (/\.(zip|rar|7z)$/i.test(filename)) return '🗜️';
                                if (/\.(txt|log)$/i.test(filename)) return '📃';
                                return '📎';
                              };
                              
                              return (
                                <a
                                  key={attachmentIndex}
                                  href={attachment}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className={`flex items-center gap-2 text-xs underline hover:no-underline px-2 py-1 rounded transition-colors ${
                                    message.senderType === 'admin' 
                                      ? 'text-blue-200 hover:text-blue-100 hover:bg-blue-700' 
                                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                  }`}
                                >
                                  {getFileIcon(fileName)} {fileName}
                                </a>
                              );
                            }
                          })}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${
                        message.senderType === 'admin' ? 'text-primary-100' : 'text-muted'
                      }`}>
                        {formatTime(message.createdAt)} • {message.senderName}
                        {message.senderType === 'admin' && (
                          <span className="ml-2">
                            {message.readAt ? (
                              <span className="text-blue-400" title={`Read at ${formatTime(message.readAt)}`}>✓✓</span>
                            ) : (
                              <span className="text-gray-400" title="Delivered">✓</span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                {/* Attachment Preview */}
                {attachments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                        >
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          <span className="max-w-32 truncate">{file.name}</span>
                          <button
                            onClick={() => removeAttachment(index)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-muted hover:text-foreground hover:bg-gray-100 rounded-lg"
                    title="Attach files"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={1}
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && attachments.length === 0}
                    className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted px-8">
              <MessageSquare className="h-20 w-20 mb-6 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to Business Inbox</h2>
              <p className="text-gray-500 max-w-md">Choose a conversation from the sidebar to start messaging with your clients. All your project communications are organized here.</p>
            </div>
          )}
        </div>
        
        {/* Debug Panel */}
        <TokenDebugPanel 
          projectToken={selectedConversation?.projectToken}
          connectionStatus={connectionStatus}
          currentRoom={selectedConversationRef.current?.projectToken || undefined}
        />
      </div>
    </div>
  )
}

export default Inbox;