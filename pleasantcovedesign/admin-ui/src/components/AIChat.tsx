import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Minimize2, Maximize2, X } from 'lucide-react';

// Get admin token function (same as used in api.ts)
const getAdminToken = async (): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer pleasantcove2024admin'
      },
      body: JSON.stringify({
        type: 'admin'
      })
    });
    
    const data = await response.json();
    if (data.valid) {
      return data.token;
    }
    throw new Error('Failed to get admin token');
  } catch (error) {
    console.error('Token error:', error);
    throw error;
  }
};

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  functionCalls?: any[];
  pendingAction?: {
    action: string;
    params: any;
    confirmationPrompt: string;
  };
}

interface AIChatProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onClose?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ 
  isMinimized = false, 
  onToggleMinimize, 
  onClose 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hey! I\'m Minerva, your AI copilot. What can I help you with today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Slash commands and quick actions
  const slashCommands = [
    { command: '/leads', description: 'Show recent leads' },
    { command: '/last', description: 'Show last messages' },
    { command: '/demo', description: 'Generate a demo' },
    { command: '/stats', description: 'Show business stats' },
    { command: '/appointments', description: 'Show upcoming appointments' },
    { command: '/search', description: 'Search messages' },
    { command: '/help', description: 'Show all commands' }
  ];

  const quickActions = [
    { label: '📊 Recent Leads', action: 'Show me our recent leads' },
    { label: '💬 Last Messages', action: 'Who did we message last and what did they say?' },
    { label: '🎨 Generate Demo', action: 'Help me generate a website demo' },
    { label: '📅 Appointments', action: 'What are my upcoming appointments?' },
    { label: '📈 Stats', action: 'Show me business statistics' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get admin token for authentication
      const token = await getAdminToken();
      
      // Call the real AI service with function calling
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            sessionId,
            timestamp: new Date().toISOString(),
            // Include pending confirmation if user is responding to one
            confirmationId: pendingConfirmation?.id
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response,
          timestamp: new Date(),
          functionCalls: data.functionCalls
        };

        // Check if any function calls require confirmation
        if (data.functionCalls && data.functionCalls.length > 0) {
          const confirmationRequired = data.functionCalls.find((fc: any) => 
            fc.result?.requiresConfirmation
          );
          
          if (confirmationRequired) {
            aiMessage.pendingAction = {
              action: confirmationRequired.result.action,
              params: confirmationRequired.result.params,
              confirmationPrompt: confirmationRequired.result.confirmationPrompt
            };
            setPendingConfirmation({
              id: Date.now().toString(),
              ...confirmationRequired.result
            });
          } else {
            setPendingConfirmation(null);
          }
        }

        setMessages(prev => [...prev, aiMessage]);
        
        // Update session ID if provided
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
      } else {
        throw new Error(data.error || 'AI service returned an error');
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}\n\nThis might be because:\n• OpenAI API is not configured\n• Network connection issue\n• Server is temporarily unavailable\n\nI'm falling back to basic responses for now.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Fall back to simulated response
      try {
        const fallbackResponse = await simulateAIResponse(userMessage.content);
        const fallbackMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: fallbackResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMessage]);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Show slash command suggestions
    if (value.startsWith('/') && value.length > 1) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSlashCommand = (command: string) => {
    setInput(command + ' ');
    setShowSuggestions(false);
    
    // Auto-execute common commands
    switch (command) {
      case '/leads':
        setInput('Show me our recent leads');
        setTimeout(sendMessage, 100);
        break;
      case '/last':
        setInput('Who did we message last and what did they say?');
        setTimeout(sendMessage, 100);
        break;
      case '/stats':
        setInput('Show me business statistics');
        setTimeout(sendMessage, 100);
        break;
      case '/appointments':
        setInput('What are my upcoming appointments?');
        setTimeout(sendMessage, 100);
        break;
      case '/help':
        setInput('What can you help me with?');
        setTimeout(sendMessage, 100);
        break;
      default:
        // For other commands, just insert them
        break;
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(sendMessage, 100);
  };

  const handleConfirmAction = (confirmed: boolean) => {
    if (confirmed) {
      setInput('yes');
    } else {
      setInput('no, cancel that');
    }
    setPendingConfirmation(null);
    setTimeout(sendMessage, 100);
  };

  const filteredSlashCommands = slashCommands.filter(cmd => 
    cmd.command.toLowerCase().includes(input.toLowerCase())
  );

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggleMinimize}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors flex items-center gap-2"
        >
          <Bot size={20} />
          <span className="text-sm font-medium">AI Assistant</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white border border-gray-300 rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <h3 className="font-medium">Minerva AI</h3>
        </div>
        <div className="flex items-center gap-2">
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Minimize2 size={16} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.type === 'ai' && <Bot size={16} className="mt-0.5 flex-shrink-0" />}
                  {message.type === 'user' && <User size={16} className="mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pending Action Confirmation */}
            {message.pendingAction && (
              <div className="mt-2 ml-8 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800 mb-2">
                  ⚠️ Action requires confirmation
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmAction(true)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                  >
                    Yes, proceed
                  </button>
                  <button
                    onClick={() => handleConfirmAction(false)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center gap-2 text-gray-500">
                <Bot size={16} />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (show when no messages or when empty) */}
      {messages.length === 1 && !pendingConfirmation && (
        <div className="px-4 pb-2">
          <div className="text-xs text-gray-500 mb-2">Quick Actions:</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.action)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 relative">
        {/* Slash Command Suggestions */}
        {showSuggestions && filteredSlashCommands.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
            {filteredSlashCommands.map((cmd, index) => (
              <button
                key={index}
                onClick={() => handleSlashCommand(cmd.command)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
              >
                <span className="font-mono text-sm text-blue-600">{cmd.command}</span>
                <span className="text-xs text-gray-500">{cmd.description}</span>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={pendingConfirmation ? "Type 'yes' to confirm or 'no' to cancel..." : "Ask me anything..."}
              className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isLoading}
            />
            {input.startsWith('/') && (
              <div className="absolute top-1 right-2 text-xs text-gray-400">
                Press Tab or click suggestion
              </div>
            )}
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Command Help Hint */}
        {!input && !pendingConfirmation && (
          <div className="text-xs text-gray-400 mt-1">
            💡 Type <code>/</code> for commands or just chat naturally
          </div>
        )}
      </div>
    </div>
  );
};

// Simulate AI response (replace with actual AI service call)
async function simulateAIResponse(userInput: string): Promise<string> {
  // Add delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const input = userInput.toLowerCase();
  
  // Simple response logic based on keywords
  if (input.includes('lead') || input.includes('customer')) {
    return '📊 I can help you analyze leads! Here are some things I can do:\n\n• Generate professional demos for prospects\n• Create personalized outreach campaigns\n• Track lead engagement and conversion\n• Analyze lead quality and scoring\n\nWould you like me to pull up your recent leads or help with a specific lead?';
  }
  
  if (input.includes('minerva') || input.includes('ai') || input.includes('automation')) {
    return '🤖 Minerva is your AI business automation system! She can:\n\n• Generate stunning website demos (storefront & stylized)\n• Create smart, personalized outreach messages\n• Generate professional invoices\n• Provide business analytics and insights\n\nI can help you use any of these features. What would you like Minerva to do?';
  }
  
  if (input.includes('appointment') || input.includes('schedule') || input.includes('meeting')) {
    return '📅 For appointments, I can help you:\n\n• View upcoming appointments\n• Schedule new meetings\n• Set up Zoom, phone, or FaceTime calls\n• Manage availability\n• Send appointment reminders\n\nWhat appointment task can I assist with?';
  }
  
  if (input.includes('demo') || input.includes('website') || input.includes('design')) {
    return '🎨 Website demos are one of our strongest features! I can help you:\n\n• Generate professional demos for any business type\n• Choose between "storefront" and "stylized" designs\n• Create mobile-optimized mockups\n• Generate comparison demos for client choices\n\nWhich business would you like me to create a demo for?';
  }
  
  if (input.includes('help') || input.includes('how') || input.includes('what')) {
    return '💡 I\'m here to help! I can assist with:\n\n🔹 **Lead Management** - Analyze and organize prospects\n🔹 **Minerva AI Tools** - Demos, outreach, invoicing\n🔹 **Appointments** - Scheduling and calendar management\n🔹 **Business Analytics** - Performance insights\n🔹 **System Support** - Technical questions\n\nJust tell me what you\'d like to work on!';
  }
  
  // Default response
  return '🤔 I understand you\'re asking about "' + userInput + '". \n\nI can help you with lead management, Minerva AI tools, appointments, business analytics, and system questions. Could you be more specific about what you\'d like me to help you with?\n\nFor example:\n• "Show me recent leads"\n• "Generate a demo for [company name]"\n• "What are my upcoming appointments?"\n• "Help me with outreach"';
}

export default AIChat; 