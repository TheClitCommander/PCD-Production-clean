import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, User, Phone, Mail, MapPin, Calendar, MessageSquare, 
  FileText, Briefcase, Receipt, StickyNote, Send, Clock, CheckCircle2,
  XCircle, Loader2, ChevronLeft, ArrowRight, Upload, Download, Edit, Activity,
  Image, ExternalLink, Trash2, Megaphone
} from "lucide-react";
import type { Business, Activity as ActivityType } from "@shared/schema";
import moment from "moment";
import { ProgressGallery } from "@/components/ProgressGallery";
import { ProgressUploader } from "@/components/ProgressUploader";
import { PaymentManager } from "@/components/PaymentManager";

const PROJECT_MILESTONES = [
  { id: 'branding', label: 'Branding', description: 'Logo and brand identity' },
  { id: 'mockup', label: 'Mockup', description: 'Design mockups and concepts' },
  { id: 'development', label: 'Development', description: 'Building the solution' },
  { id: 'review', label: 'Final Review', description: 'Client review and feedback' },
  { id: 'launch', label: 'Launch', description: 'Go live!' },
];

export default function ClientProfile() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const businessId = parseInt(id!);
  
  // State
  const [activeTab, setActiveTab] = useState("profile");
  const [internalNotes, setInternalNotes] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [projectMilestones, setProjectMilestones] = useState<Record<string, boolean>>({});
  const [editingNotes, setEditingNotes] = useState(false);
  const [showProgressUploader, setShowProgressUploader] = useState(false);

  // For demo purposes, hardcode admin status
  const isAdmin = true; // In production, this would come from auth context

  // Fetch client data
  const { data: client, isLoading } = useQuery({
    queryKey: [`/api/businesses/${businessId}`],
    queryFn: () => api.getBusiness(businessId),
  });

  // Fetch client activities
  const { data: activities = [] } = useQuery({
    queryKey: ["/api/businesses", id, "activities"],
    queryFn: () => api.getBusinessActivities(businessId),
    enabled: !!businessId,
  });

  // Fetch client appointments from new appointments table
  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/businesses", id, "appointments"],
    queryFn: () => api.getBusinessAppointments(businessId),
    enabled: !!businessId,
  });

  // Fetch progress entries from API
  const { data: progressEntries = [], refetch: refetchProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["/api/businesses", id, "progress"],
    queryFn: () => api.getBusinessProgress(businessId),
    enabled: !!businessId,
  });

  // Filter appointments for this client
  const clientAppointments = appointments.filter(apt => apt.businessId === businessId);

  // Fetch templates for SMS sending
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: api.getTemplates,
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: (updates: Partial<Business>) => 
      api.updateBusiness(businessId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}`] });
      toast({
        title: "Client updated",
        description: "Changes saved successfully",
      });
    },
  });

  // Update appointment status mutation
  const updateAppointmentStatusMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: number; status: string }) =>
      api.updateAppointment(appointmentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", id, "appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      
      toast({
        title: "Appointment updated",
        description: "The appointment status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appointment status.",
        variant: "destructive",
      });
    },
  });

  // Delete progress entry mutation
  const deleteProgressMutation = useMutation({
    mutationFn: (entryId: number) => api.deleteProgressEntry(entryId),
    onSuccess: () => {
      refetchProgress();
      toast({
        title: "Progress removed",
        description: "The progress entry has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete progress entry.",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { channel: string; body: string }) =>
      fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: businessId, ...data }),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/activities`] });
      setShowTemplateModal(false);
      toast({
        title: "Message sent",
        description: "SMS sent successfully to client",
      });
    },
  });

  // Helper to get conversation messages
  const getConversations = () => {
    return activities.filter(a => 
      a.type === 'sms_sent' || 
      a.type === 'email_sent' || 
      a.type === 'sms_received' ||
      a.type === 'email_received'
    );
  };

  // Save internal notes
  const saveNotes = () => {
    updateClientMutation.mutate({ 
      notes: internalNotes 
    });
    setEditingNotes(false);
  };

  // Send templated message
  const sendTemplateMessage = () => {
    if (!selectedTemplate) return;
    
    // Replace template variables
    let body = selectedTemplate.description;
    body = body.replace('{{name}}', client?.name || '');
    body = body.replace('{{business}}', client?.name || '');
    body = body.replace('{{date}}', moment().format('MMMM D, YYYY'));
    
    sendMessageMutation.mutate({
      channel: 'sms', // Hardcode to SMS for now
      body
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Client not found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/clients")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Clients
            </Button>
          </div>
          <Button onClick={() => setShowTemplateModal(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send Update
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Client Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {client.phone}
                </span>
                {client.email && (
                  <span className="flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {client.email}
                  </span>
                )}
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {client.city}, {client.state}
                </span>
              </div>
            </div>
            <Badge variant={client.stage === 'closed' ? 'secondary' : 'default'}>
              {client.stage}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="conversations">Messages</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="receipts">Payments</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Name</Label>
                    <p className="font-medium">{client.name}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={client.stage}
                      onValueChange={(value) => updateClientMutation.mutate({ stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Active Client</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{client.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <p className="font-medium">{client.address}</p>
                    <p className="text-sm text-gray-600">{client.city}, {client.state}</p>
                  </div>
                  <div>
                    <Label>Website</Label>
                    <p className="font-medium">{client.website || 'None'}</p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label>Service Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {client.tags?.split(',').map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking History Tab */}
          <TabsContent value="bookings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment History</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
                ) : (
                  <div className="space-y-4">
                    {/* Show all appointments sorted by date */}
                    {appointments
                      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
                      .map((appointment) => {
                        const isPast = moment(appointment.datetime).isBefore(moment());
                        const isCurrent = !isPast && appointment.status !== 'cancelled';
                        
                        return (
                          <div 
                            key={appointment.id} 
                            className={`border rounded-lg p-4 ${
                              isCurrent ? 'bg-blue-50 border-blue-200' : 
                              appointment.status === 'cancelled' ? 'bg-gray-50 border-gray-200' :
                              'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {moment(appointment.datetime).format('MMMM D, YYYY')}
                                  </p>
                                  {isCurrent && (
                                    <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {moment(appointment.datetime).format('h:mm A')}
                                </p>
                                {appointment.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{appointment.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    appointment.status === 'completed' ? 'default' :
                                    appointment.status === 'no-show' ? 'destructive' :
                                    appointment.status === 'cancelled' ? 'secondary' :
                                    'outline'
                                  }
                                >
                                  {appointment.status}
                                </Badge>
                                
                                {/* Action buttons for current/future appointments */}
                                {isCurrent && appointment.status === 'confirmed' && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm('Mark this appointment as completed?')) {
                                          updateAppointmentStatusMutation.mutate({
                                            appointmentId: appointment.id,
                                            status: 'completed'
                                          });
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Complete
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => {
                                        if (confirm('Mark this appointment as no-show?')) {
                                          updateAppointmentStatusMutation.mutate({
                                            appointmentId: appointment.id,
                                            status: 'no-show'
                                          });
                                        }
                                      }}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      No-show
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Additional metadata */}
                            <div className="mt-2 flex gap-2">
                              {appointment.isAutoScheduled && (
                                <Badge variant="outline" className="text-xs">Self-scheduled</Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                Created {moment(appointment.createdAt).format('MMM D, YYYY')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                
                {/* Add appointment button */}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/scheduling")}
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule New Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
              </CardHeader>
              <CardContent>
                {getConversations().length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages yet</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {getConversations().map((msg) => (
                      <div key={msg.id} className={`flex ${
                        msg.type.includes('sent') ? 'justify-end' : 'justify-start'
                      }`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.type.includes('sent') 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{msg.description}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {moment(msg.createdAt).format('MMM D, h:mm A')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Progress Tab */}
          <TabsContent value="progress" className="mt-6">
            {/* Admin Upload Section - Show when admin */}
            {isAdmin && (
              <div className="mb-6">
                {showProgressUploader ? (
                  <div className="space-y-4">
                    <ProgressUploader 
                      businessId={businessId}
                      onSuccess={() => {
                        refetchProgress();
                        setShowProgressUploader(false);
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setShowProgressUploader(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowProgressUploader(true)}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Progress Update
                  </Button>
                )}
              </div>
            )}

            {/* Progress Gallery */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Visual Progress</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/progress/public/${businessId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Public View
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ProgressGallery 
                  entries={progressEntries} 
                  clientName={client.name}
                  onDelete={isAdmin ? (entryId) => deleteProgressMutation.mutate(entryId) : undefined}
                  isAdmin={isAdmin}
                  isLoading={isLoadingProgress}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts" className="mt-6">
            <PaymentManager business={client} />
          </TabsContent>

          {/* Internal Notes Tab */}
          <TabsContent value="notes" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Internal Notes</CardTitle>
                  <Button 
                    size="sm" 
                    variant={editingNotes ? "default" : "outline"}
                    onClick={() => {
                      if (editingNotes) {
                        saveNotes();
                      } else {
                        setInternalNotes(client.notes || '');
                        setEditingNotes(true);
                      }
                    }}
                  >
                    {editingNotes ? (
                      <>Save Notes</>
                    ) : (
                      <><Edit className="h-4 w-4 mr-2" />Edit</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingNotes ? (
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add internal notes about this client..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {client.notes ? (
                      <pre className="whitespace-pre-wrap font-sans">{client.notes}</pre>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No notes added yet. Click Edit to add notes.
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">
                  <StickyNote className="h-3 w-3 inline mr-1" />
                  These notes are internal only and not visible to the client
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Selection Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Update to Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Template</Label>
              <Select onValueChange={(value) => {
                const template = templates.find(t => t.id === parseInt(value));
                setSelectedTemplate(template);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.businessType !== 'email').map(template => (
                    <SelectItem key={template.id} value={template.id!.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedTemplate.description
                      .replace('{{name}}', client.name)
                      .replace('{{business}}', client.name)
                      .replace('{{date}}', moment().format('MMMM D, YYYY'))
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendTemplateMessage}
              disabled={!selectedTemplate || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Actions - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveTab("conversations")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              View Conversation
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/scheduling")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Call
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowTemplateModal(true)}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Launch Outreach
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveTab("profile")}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 