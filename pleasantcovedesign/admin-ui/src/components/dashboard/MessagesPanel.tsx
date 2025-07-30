import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Trash2 } from 'lucide-react';
import api from '../../api';

interface Message {
  id: number;
  content: string;
  senderType: 'client' | 'admin';
  createdAt: string;
  readAt?: string;
}

interface Conversation {
  projectId: number;
  projectTitle: string;
  customerName: string;
  projectToken: string;
  lastMessage: Message;
  lastMessageTime: string;
  messages: Message[];
}

const MessagesPanel: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      console.log('📬 [DASHBOARD] Fetching conversations...');
      const response = await api.get('/admin/inbox');
      
      if (response.data && response.data.projectMessages) {
        setConversations(response.data.projectMessages);
        console.log(`✅ [DASHBOARD] Loaded ${response.data.projectMessages.length} conversations`);
      } else {
        console.warn('⚠️ [DASHBOARD] Unexpected response format:', response.data);
        setConversations([]);
      }
    } catch (error) {
      console.error('❌ [DASHBOARD] Failed to fetch messages:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (projectId: number, projectToken: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        // Call delete API (you'll need to implement this endpoint)
        await api.delete(`/projects/${projectId}`);
        
        // Remove from local state
        setConversations(prev => prev.filter(conv => conv.projectToken !== projectToken));
        
        console.log(`✅ Conversation ${projectToken} deleted successfully`);
      } catch (error) {
        console.error('❌ Failed to delete conversation:', error);
        alert('Failed to delete conversation. Please try again.');
      }
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const truncateMessage = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
          Recent Messages
        </h3>
        <span className="text-sm text-gray-500">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No messages yet</div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation, index) => {
            const lastMsg = conversation.lastMessage
            const hasUnread = conversation.messages.some(msg => 
              msg.senderType === 'client' && !msg.readAt
            )
            
            return (
              <div 
                key={`conversation-${conversation.projectToken}-${index}`} 
                className="flex items-center group hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors"
              >
                <Link
                  to={`/inbox/${conversation.projectToken}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    {hasUnread && (
                      <div key={`unread-${conversation.projectToken}`} className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {lastMsg.senderType === 'client' ? conversation.customerName : 'You'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {truncateMessage(lastMsg.content)}
                      </p>
                    </div>
                  </div>
                </Link>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => deleteConversation(conversation.projectId, conversation.projectToken, e)}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-600 hover:text-red-800 transition-all"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Link
        to="/inbox"
        className="block mt-4 text-center text-blue-600 hover:text-blue-700 font-medium"
      >
        View Inbox →
      </Link>
    </div>
  );
};

export default MessagesPanel; 