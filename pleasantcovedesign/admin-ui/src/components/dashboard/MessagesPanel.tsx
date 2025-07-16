import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import Card from '../Card'
import api from '../../api'

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

interface Conversation {
  projectToken: string
  projectTitle: string
  customerName: string
  lastMessage: Message
  lastMessageTime: string
  messages: Message[]
}

const MessagesPanel: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [totalMessages, setTotalMessages] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get('/admin/conversations')
        const conversationData = response.data.projectMessages || []
        
        // Calculate totals
        let totalMsgs = 0
        let unreadMsgs = 0
        
        conversationData.forEach((conv: any) => {
          if (conv.messages) {
            totalMsgs += conv.messages.length
            unreadMsgs += conv.messages.filter((msg: any) => 
              msg.senderType === 'client' && !msg.readAt
            ).length
          }
        })
        
        setTotalMessages(totalMsgs)
        setUnreadCount(unreadMsgs)
        
        // Get the latest 5 conversations
        const sortedConversations = conversationData
          .filter((conv: any) => conv.messages && conv.messages.length > 0)
          .sort((a: any, b: any) => 
            new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
          )
          .slice(0, 5)
          
        setConversations(sortedConversations)
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [])

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (!content) return 'Sent an attachment'
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <Card>
      <Link to="/inbox" className="block">
        <div className="flex items-center gap-2 mb-4 hover:text-blue-600 transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            {unreadCount > 0 ? `${unreadCount} unread` : 'Messages'} / {totalMessages} total
          </h3>
        </div>
      </Link>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No messages yet</div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const lastMsg = conversation.lastMessage
            const hasUnread = conversation.messages.some(msg => 
              msg.senderType === 'client' && !msg.readAt
            )
            
            return (
              <Link
                key={conversation.projectToken}
                to={`/inbox/${conversation.projectToken}`}
                className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  {hasUnread && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
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
    </Card>
  )
}

export default MessagesPanel 