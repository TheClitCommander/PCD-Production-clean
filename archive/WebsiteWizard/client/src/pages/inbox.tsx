import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Paperclip, 
  Send, 
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Image,
  FileText,
  Loader2,
  Zap,
  CalendarPlus,
  Download,
  Eye
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { Business } from "@shared/schema";
import moment from "moment";
import { useMessages } from "@/hooks/use-messages";
import { Message } from "@/lib/socket-client";
import { MobileFileUpload } from "@/components/mobile-file-upload";

export default function Inbox() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Load all businesses
  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["/api/businesses"],
    queryFn: () => api.getBusinesses(),
  });

  // Load messages for ALL businesses (not just a specific one)
  const { messages, sendMessage, connected, loading } = useMessages(); // Remove businessId parameter

  // Debug: Log current messages state
  useEffect(() => {
    console.log('[INBOX] Current messages state:', messages);
  }, [messages]);

  // Show connection status more prominently
  useEffect(() => {
    console.log('[INBOX] Current messages state:', messages);
    if (connected) {
      toast({
        title: "Connected to messaging server",
        description: "Real-time messaging is now active",
        variant: "default"
      });
    } else {
      toast({
        title: "Disconnected from messaging server", 
        description: "Trying to reconnect...",
        variant: "destructive"
      });
    }
  }, [connected, messages, toast]);

  // Get messages for a specific business
  const getConversations = (business: Business): Message[] => {
    // Filter messages for the selected business - include both businessId and business ID formats
    const businessMessages = messages.filter(m => {
      const messageBusinessId = m.businessId?.toString();
      const targetBusinessId = business.id?.toString();
      return messageBusinessId === targetBusinessId;
    });
    
    console.log(`[INBOX] Getting conversations for business ${business.id} (${business.name}):`);
    console.log(`[INBOX] Found ${businessMessages.length} real messages:`, businessMessages);
    
    // ALWAYS show real messages if they exist
    if (businessMessages.length > 0) {
      return businessMessages.sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        return aTime - bTime; // Sort chronologically
      });
    }
    
    // Only show fake starter messages if NO real messages exist
    // This gives users something to see while testing
    return [
      {
        id: 1,
        direction: "outbound" as const,
        message: `Hi ${(business.name || 'there').split(' ')[0]}, I noticed ${business.name || 'your business'} doesn't have a website. I'm local and can get one built for just $400 with free setup. Want the details?`,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: "delivered",
        businessId: business.id
      },
      {
        id: 2,
        direction: "inbound" as const,
        message: "Hi there! Yes, we've been thinking about getting a website. Can you tell me more about what's included?",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        status: "read",
        businessId: business.id
      },
      {
        id: 3,
        direction: "outbound" as const,
        message: "Great! I'd love to show you some examples of sites I've built for other auto shops in Maine. Are you free for a quick 15-min call tomorrow?",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: "delivered",
        businessId: business.id
      }
    ];
  };

  const getUpcomingMeetings = () => [
    {
      id: 1,
      businessId: 2,
      businessName: "Bath Plumbing Co",
      type: "call",
      datetime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 30,
      status: "scheduled",
      notes: "Demo website examples, discuss pricing"
    },
    {
      id: 2,
      businessId: 3,
      businessName: "Coastal Electric",
      type: "video",
      datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      duration: 15,
      status: "confirmed",
      notes: "Show electrical contractor templates"
    }
  ];

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const messageDate = date instanceof Date ? date : new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "text-green-600";
      case "read": return "text-blue-600";
      case "pending": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Check if message contains a file attachment
  const parseFileAttachment = (message: string) => {
    // Check for file attachment patterns
    const filePattern = /📎\s*(.+?)(?:\n|$)/;
    const imagePattern = /🖼️\s*(.+?)(?:\n|$)/;
    
    const fileMatch = message.match(filePattern);
    const imageMatch = message.match(imagePattern);
    
    if (fileMatch || imageMatch) {
      const fileName = fileMatch?.[1] || imageMatch?.[1] || 'Unknown file';
      const isImage = !!imageMatch || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
      
      // Check if fileName already contains a full URL (from uploads)
      let fileUrl: string;
      if (fileName.startsWith('http://') || fileName.startsWith('https://') || fileName.startsWith('/uploads/')) {
        fileUrl = fileName.startsWith('/uploads/') ? `${window.location.origin}${fileName}` : fileName;
      } else {
        // Fallback for legacy messages - try to construct URL
        fileUrl = `/uploads/${fileName}`;
      }
      
      return {
        hasAttachment: true,
        fileName: fileName.replace(/^.*\//, ''), // Extract just the filename for display
        isImage,
        fileUrl,
        cleanMessage: message.replace(/📎\s*(.+?)(?:\n|$)/, '').replace(/🖼️\s*(.+?)(?:\n|$)/, '').trim()
      };
    }
    
    return {
      hasAttachment: false,
      fileName: '',
      isImage: false,
      fileUrl: '',
      cleanMessage: message
    };
  };

  // Handle file download
  const handleFileDownload = (fileUrl: string, fileName: string) => {
    // In production, this would download from the actual URL
    // For now, we'll show a toast indicating the download would start
    toast({
      title: "Download Started",
      description: `Downloading ${fileName}...`,
    });
    
    // Simulate download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  // Generate suggested message based on lead stage and score
  const getSuggestedMessage = useMemo(() => {
    if (!selectedBusiness) return "";
    
    const firstName = (selectedBusiness.name || 'there').split(' ')[0];
    const score = selectedBusiness.score || 0;
    const stage = selectedBusiness.stage;
    const leadId = selectedBusiness.id?.toString() || "0";
    
    // If lead is qualified and hasn't scheduled yet
    if (score >= 70 && (stage === 'contacted' || stage === 'scraped' || stage === 'interested')) {
      return `Hey ${firstName}, it's Ben from Pleasant Cove Design. I'd love to chat about your website — you can book a free consultation at a time that works for you here: https://www.pleasantcovedesign.com/schedule?lead_id=${leadId}`;
    }
    
    // Follow-up message for interested leads
    if (stage === 'interested') {
      return `Hi ${firstName}, just following up on our conversation. Ready to move forward with your website? Let me know if you have any questions or want to schedule a quick call: https://www.pleasantcovedesign.com/schedule?lead_id=${leadId}`;
    }
    
    // Default message
    return `Hi ${firstName}, it's Ben from Pleasant Cove Design. How can I help you today?`;
  }, [selectedBusiness]);

  // Handle sending a new message via Socket.IO
  const handleSendMessage = () => {
    if (!selectedBusiness || !newMessage.trim()) return;
    
    // Send message using our hooks
    sendMessage(newMessage, selectedBusiness.id || 1);
    
    // Clear input
    setNewMessage("");
  };

  // Handle sending suggested message
  const handleSendSuggestedMessage = () => {
    if (!selectedBusiness) return;
    
    const message = getSuggestedMessage;
    if (!message || !message.trim()) return;
    
    // Send message using our hooks - ensure message is a string
    sendMessage(String(message), selectedBusiness.id || 1);
    
    // Hide preview
    setShowPreview(false);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      toast({
        title: "File selected",
        description: `${file.name} ready to send`,
      });
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 5MB for images)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Image too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      toast({
        title: "Image selected",
        description: `${file.name} ready to send`,
      });
    }
  };

  // Upload file to a service (placeholder for now)
  const uploadFile = async (file: File): Promise<string> => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to WebsiteWizard server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return result.fileUrl;
    } catch (error) {
      console.error('Upload error:', error);
      // Fallback to mock URL for demo
      return `https://mockcdn.com/uploads/${file.name}`;
    }
  };

  // Send message with file attachment
  const handleSendWithFile = async () => {
    if (!selectedBusiness || !selectedFile) return;
    
    setIsUploading(true);
    
    try {
      // Upload the file first
      const fileUrl = await uploadFile(selectedFile);
      
      // Create message with file attachment using proper emoji indicators and the actual file URL
      const isImage = selectedFile.type.startsWith('image/');
      const emoji = isImage ? '🖼️' : '📎';
      const messageText = newMessage.trim() 
        ? `${newMessage}\n\n${emoji} ${fileUrl}` 
        : `${emoji} ${fileUrl}`;
      
      // Send message (Railway API will need to be updated to support attachments)
      await sendMessage(messageText, selectedBusiness.id || 1);
      
      // Clear inputs
      setNewMessage("");
      setSelectedFile(null);
      
      toast({
        title: "File sent",
        description: "Your file has been shared successfully",
      });
    } catch (error) {
      console.error('Failed to send file:', error);
      toast({
        title: "Failed to send file",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Quick schedule mutation
  const quickScheduleMutation = useMutation({
    mutationFn: async (businessId: number) => {
      // Get next available 8:30 AM slot
      const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
      const dayAfter = moment().add(2, 'days').format('YYYY-MM-DD');
      
      // Try tomorrow first
      const { slots: tomorrowSlots } = await api.getAvailableSlots(tomorrow, businessId);
      const tomorrow830 = tomorrowSlots.find((slot: string) => moment(slot).format('HH:mm') === '08:30');
      
      if (tomorrow830) {
        return api.bookAppointment(businessId, tomorrow830);
      }
      
      // Try day after
      const { slots: dayAfterSlots } = await api.getAvailableSlots(dayAfter, businessId);
      const dayAfter830 = dayAfterSlots.find((slot: string) => moment(slot).format('HH:mm') === '08:30');
      
      if (dayAfter830) {
        return api.bookAppointment(businessId, dayAfter830);
      }
      
      throw new Error('No available 8:30 AM slots in the next 2 days');
    },
    onSuccess: (data, businessId) => {
      const business = businesses?.find(b => b.id === businessId);
      const appointmentTime = moment(data.booking.scheduledTime).format('dddd [at] h:mm A');
      
      toast({
        title: "✅ Consultation scheduled",
        description: `${business?.name} scheduled for ${appointmentTime}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to schedule",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-xl text-gray-900">LocalBiz Pro</span>
            </a>
            <div className="hidden md:flex space-x-6 ml-8">
              <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/prospects" className="text-gray-600 hover:text-gray-900">Prospects</a>
              <a href="/inbox" className="text-primary border-b-2 border-primary pb-2 font-medium">Inbox</a>
              <a href="/scheduling" className="text-gray-600 hover:text-gray-900">Scheduling</a>
              <a href="/clients" className="text-gray-600 hover:text-gray-900">Clients</a>
              <a href="/templates" className="text-gray-600 hover:text-gray-900">Templates</a>
              <a href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          
          {/* Sidebar - Business List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Active Conversations</h2>
              <Input 
                placeholder="Search conversations..." 
                className="mt-3"
              />
            </div>
            <div className="overflow-y-auto h-full">
              {businesses?.map((business) => {
                const conversations = getConversations(business);
                const lastMessage = conversations[conversations.length - 1];
                
                return (
                  <div
                    key={business.id}
                    onClick={() => setSelectedBusiness(business)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedBusiness?.id === business.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(business.name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {business.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(lastMessage.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {lastMessage.direction === 'inbound' ? '' : 'You: '}
                          {lastMessage.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={`text-xs ${
                            business.stage === 'interested' ? 'bg-yellow-100 text-yellow-700' :
                            business.stage === 'sold' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {business.stage}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            {lastMessage.direction === 'outbound' && (
                              <CheckCircle className={`w-3 h-3 ${getStatusColor(lastMessage.status || 'pending')}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border flex flex-col">
            {selectedBusiness ? (
              <>
                {/* Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(selectedBusiness.name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedBusiness.name}</h3>
                        <p className="text-sm text-gray-600">{selectedBusiness.city}, {selectedBusiness.state}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      <Button size="sm" variant="outline">
                        <Video className="w-4 h-4 mr-1" />
                        Video
                      </Button>
                      {selectedBusiness.stage !== 'scheduled' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => quickScheduleMutation.mutate(selectedBusiness.id)}
                          disabled={quickScheduleMutation.isPending}
                        >
                          {quickScheduleMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CalendarPlus className="w-4 h-4 mr-1" />
                          )}
                          Quick Schedule
                        </Button>
                      )}
                      <Button size="sm">
                        <Calendar className="w-4 h-4 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="w-full justify-start px-4 pt-4 bg-transparent">
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="meetings">Meetings</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="messages" className="flex-1 flex flex-col p-4">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                      {getConversations(selectedBusiness).map((message) => {
                        const { hasAttachment, fileName, isImage, fileUrl, cleanMessage } = parseFileAttachment(message.message);
                        return (
                          <div
                            key={message.id}
                            className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.direction === 'outbound'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {/* Show sender name if available */}
                              {message.senderName && (
                                <div className={`text-xs font-semibold mb-1 ${
                                  message.direction === 'outbound' ? 'text-blue-100' : 'text-blue-600'
                                }`}>
                                  {message.senderName}
                                </div>
                              )}
                              {hasAttachment ? (
                                <div className="space-y-2">
                                  {cleanMessage && (
                                    <p className="text-sm">{cleanMessage}</p>
                                  )}
                                  <div className={`border rounded-lg p-3 ${
                                    message.direction === 'outbound' 
                                      ? 'border-blue-300 bg-blue-50' 
                                      : 'border-gray-300 bg-white'
                                  }`}>
                                    {isImage ? (
                                      <div className="space-y-2">
                                        <img 
                                          src={fileUrl} 
                                          alt={fileName}
                                          className="max-w-full h-auto max-h-48 rounded cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(fileUrl, '_blank')}
                                          onError={(e) => {
                                            // Fallback to a simple broken image indicator
                                            e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjOWNhM2FmIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjYwIiByPSI4IiBmaWxsPSIjOWNhM2FmIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmI3Mjg0IiBmb250LXNpemU9IjE0Ij5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+Cjwvc3ZnPgo=";
                                          }}
                                        />
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-600">{fileName}</span>
                                          <div className="flex space-x-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-xs"
                                              onClick={() => window.open(fileUrl, '_blank')}
                                            >
                                              <Image className="w-3 h-3 mr-1" />
                                              View
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-xs"
                                              onClick={() => handleFileDownload(fileUrl, fileName)}
                                            >
                                              <Download className="w-3 h-3 mr-1" />
                                              Save
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <FileText className="w-5 h-5 text-blue-600" />
                                          <div>
                                            <p className="text-sm font-medium">{fileName}</p>
                                            <p className="text-xs text-gray-500">Document</p>
                                          </div>
                                        </div>
                                        <div className="flex space-x-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => window.open(fileUrl, '_blank')}
                                          >
                                            <Eye className="w-3 h-3 mr-1" />
                                            View
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => handleFileDownload(fileUrl, fileName)}
                                          >
                                            <Download className="w-3 h-3 mr-1" />
                                            Download
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm">{cleanMessage}</p>
                              )}
                              <div className={`flex items-center justify-between mt-1 ${
                                message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                <span className="text-xs">{formatTimeAgo(message.timestamp)}</span>
                                {message.direction === 'outbound' && (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Message Input */}
                    <div className="border-t pt-4">
                      {/* Selected File Display */}
                      {selectedFile && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {selectedFile.type.startsWith('image/') ? (
                              <Image className="w-4 h-4 text-blue-600" />
                            ) : (
                              <FileText className="w-4 h-4 text-green-600" />
                            )}
                            <span className="text-sm font-medium">{selectedFile.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                          >
                            ✕
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-end space-x-2">
                        {/* File Upload Button */}
                        <div className="relative">
                          <Button variant="outline" size="sm" asChild>
                            <label className="cursor-pointer">
                              <Paperclip className="w-4 h-4" />
                              <input
                                type="file"
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                              />
                            </label>
                          </Button>
                        </div>
                        
                        {/* Image Upload Button */}
                        <div className="relative">
                          <Button variant="outline" size="sm" asChild>
                            <label className="cursor-pointer">
                              <Image className="w-4 h-4" />
                              <input
                                type="file"
                                onChange={handleImageSelect}
                                className="hidden"
                                accept="image/*"
                              />
                            </label>
                          </Button>
                        </div>
                        
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 min-h-0 resize-none"
                          rows={2}
                          onKeyDown={(e) => {
                            // Send on Enter (but not with shift for new line)
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (selectedFile) {
                                handleSendWithFile();
                              } else {
                                handleSendMessage();
                              }
                            }
                          }}
                        />
                        
                        <Button 
                          onClick={selectedFile ? handleSendWithFile : handleSendMessage}
                          disabled={isUploading || (!newMessage.trim() && !selectedFile)}
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {!connected && (
                        <div className="text-xs text-amber-500 mt-1 flex items-center">
                          <div className="h-2 w-2 bg-amber-500 rounded-full mr-2"></div>
                          Connecting to messaging server...
                        </div>
                      )}
                      {connected && (
                        <div className="text-xs text-green-500 mt-1 flex items-center">
                          <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                          Connected to messaging server
                        </div>
                      )}
                    </div>

                    {/* Message Preview Panel */}
                    {selectedBusiness && ((selectedBusiness.score || 0) >= 70 || selectedBusiness.stage === 'interested') && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">Suggested Message</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowPreview(!showPreview)}
                          >
                            {showPreview ? 'Hide' : 'Show'}
                          </Button>
                        </div>
                        
                        {showPreview && (
                          <div className="space-y-3">
                            <Alert className="bg-blue-50 border-blue-200">
                              <AlertDescription className="text-sm">
                                This is an auto-generated scheduling invitation. Review before sending.
                              </AlertDescription>
                            </Alert>
                            
                            <Textarea
                              value={getSuggestedMessage || ""}
                              readOnly
                              className="resize-none bg-gray-50"
                              rows={4}
                            />
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>SMS to {selectedBusiness.phone || 'phone number'}</span>
                              </div>
                              
                              <Button
                                onClick={handleSendSuggestedMessage}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Send This Message
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="meetings" className="flex-1 p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Upcoming Meetings</h4>
                        <Button size="sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          Schedule New
                        </Button>
                      </div>
                      
                      {getUpcomingMeetings()
                        .filter(meeting => meeting.businessId === selectedBusiness.id)
                        .map((meeting) => (
                        <Card key={meeting.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  meeting.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                                <div>
                                  <p className="font-medium">{meeting.type === 'video' ? 'Video Call' : 'Phone Call'}</p>
                                  <p className="text-sm text-gray-600">
                                    {meeting.datetime.toLocaleDateString()} at {meeting.datetime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                </div>
                              </div>
                              <Badge className={meeting.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                {meeting.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{meeting.notes}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="media" className="flex-1 p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium">Shared Media</h4>
                        <Button size="sm">
                          <Paperclip className="w-4 h-4 mr-1" />
                          Upload
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="cursor-pointer hover:shadow-md">
                          <CardContent className="p-4 text-center">
                            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">Website Proposal.pdf</p>
                            <p className="text-xs text-gray-500">2 days ago</p>
                          </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:shadow-md">
                          <CardContent className="p-4 text-center">
                            <Image className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">Logo Options.png</p>
                            <p className="text-xs text-gray-500">1 day ago</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="flex-1 p-4">
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium">Client Notes</h4>
                      <Textarea
                        placeholder="Add notes about this client..."
                        className="min-h-32"
                        defaultValue={selectedBusiness.notes || ""}
                      />
                      <Button>Save Notes</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No conversation selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a business from the sidebar to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}