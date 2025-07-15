import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, Plus, Edit2, Trash2, Copy, Eye, FileText, 
  Loader2, Building2, Search, Tag, Mail, Hash, EyeOff
} from "lucide-react";
import type { Template, InsertTemplate } from "@shared/schema";

// Available tags for templates
const TEMPLATE_TAGS = [
  { value: "follow-up", label: "Follow-up", color: "bg-blue-100 text-blue-700" },
  { value: "thank-you", label: "Thank You", color: "bg-green-100 text-green-700" },
  { value: "reminder", label: "Reminder", color: "bg-yellow-100 text-yellow-700" },
  { value: "project-complete", label: "Project Complete", color: "bg-purple-100 text-purple-700" },
  { value: "no-show", label: "No-Show", color: "bg-red-100 text-red-700" },
  { value: "welcome", label: "Welcome", color: "bg-indigo-100 text-indigo-700" },
  { value: "check-in", label: "Check-in", color: "bg-gray-100 text-gray-700" },
];

export default function Templates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<"sms" | "email">("sms");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [showPreview, setShowPreview] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState<InsertTemplate>({
    name: "",
    businessType: "general",
    description: "",
    previewUrl: null,
    features: null,
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: api.getTemplates,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (template: InsertTemplate) =>
      fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setShowCreateModal(false);
      resetForm();
      toast({
        title: "Template created",
        description: "Your template has been saved successfully",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Template> }) =>
      fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setEditingTemplate(null);
      resetForm();
      toast({
        title: "Template updated",
        description: "Changes saved successfully",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template deleted",
        description: "Template removed successfully",
      });
    },
  });

  // Reset form
  const resetForm = () => {
    setTemplateForm({
      name: "",
      businessType: activeTab === "sms" ? "general" : "email",
      description: "",
      previewUrl: null,
      features: null,
    });
    setEditingTemplate(null);
  };

  // Handle create/update
  const handleSave = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id!,
        updates: templateForm,
      });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  // Start editing
  const startEdit = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      businessType: template.businessType,
      description: template.description,
      previewUrl: template.previewUrl,
      features: template.features,
    });
    setShowCreateModal(true);
  };

  // Filter templates based on search, type, and tag
  const filteredTemplates = templates.filter(template => {
    // Filter by type (SMS vs Email)
    const isCorrectType = activeTab === "sms" 
      ? template.businessType !== "email" 
      : template.businessType === "email";
    
    // Filter by search query
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by tag
    const matchesTag = selectedTag === "all" || 
      (template.features && template.features.includes(selectedTag));
    
    return isCorrectType && matchesSearch && matchesTag;
  });

  // Duplicate template
  const duplicateTemplate = (template: Template) => {
    setTemplateForm({
      name: `${template.name} (Copy)`,
      businessType: template.businessType,
      description: template.description,
      previewUrl: template.previewUrl,
      features: template.features,
    });
    setShowCreateModal(true);
  };

  // Render preview with variable substitution
  const renderPreview = (content: string) => {
    return content
      .replace(/\{\{name\}\}/g, 'John Doe')
      .replace(/\{\{business\}\}/g, 'Sample Business')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{time\}\}/g, '2:00 PM')
      .replace(/\{\{link\}\}/g, 'https://example.com/booking');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-xl text-gray-900">LocalBiz Pro</span>
            </a>
            <div className="hidden md:flex space-x-6 ml-8">
              <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/prospects" className="text-gray-600 hover:text-gray-900">Prospects</a>
              <a href="/inbox" className="text-gray-600 hover:text-gray-900">Inbox</a>
              <a href="/scheduling" className="text-gray-600 hover:text-gray-900">Scheduling</a>
              <a href="/clients" className="text-gray-600 hover:text-gray-900">Clients</a>
              <a href="/templates" className="text-primary border-b-2 border-primary pb-2 font-medium">Templates</a>
              <a href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
              <p className="text-gray-600 mt-1">
                Create and manage SMS and email templates for client communication
              </p>
            </div>
            <Button onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New {activeTab === "sms" ? "SMS" : "Email"} Template
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "sms" | "email")}>
            <TabsList className="mb-4">
              <TabsTrigger value="sms" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS Templates
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email Templates
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-[200px]">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {TEMPLATE_TAGS.map(tag => (
                      <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Templates List */}
              <TabsContent value="sms" className="mt-0">
                <div className="space-y-4">
                  {filteredTemplates.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchQuery || selectedTag !== "all" ? "No templates found" : "No SMS templates yet"}
                        </h3>
                        <p className="text-gray-500 mb-4">
                          {searchQuery || selectedTag !== "all" 
                            ? "Try adjusting your filters" 
                            : "Create your first SMS template to get started"}
                        </p>
                        {!searchQuery && selectedTag === "all" && (
                          <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create SMS Template
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    filteredTemplates.map(template => (
                      <Card key={template.id} className="overflow-hidden">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center">
                                {template.name}
                                <Badge variant="secondary" className="ml-2">
                                  <Hash className="h-3 w-3 mr-1" />
                                  {template.usageCount || 0} uses
                                </Badge>
                              </CardTitle>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.features?.split(',').map(tag => {
                                  const tagInfo = TEMPLATE_TAGS.find(t => t.value === tag.trim());
                                  return tagInfo ? (
                                    <Badge key={tag} className={tagInfo.color}>
                                      {tagInfo.label}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                              >
                                {showPreview === template.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(template)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => duplicateTemplate(template)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Delete this template?")) {
                                    deleteTemplateMutation.mutate(template.id!);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-sm ${showPreview === template.id ? 'bg-gray-50 p-3 rounded-lg' : 'text-gray-600'}`}>
                            {showPreview === template.id ? (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Preview with sample data:</p>
                                <p className="whitespace-pre-wrap">{renderPreview(template.description)}</p>
                              </div>
                            ) : (
                              <p className="line-clamp-2">{template.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="email" className="mt-0">
                <div className="space-y-4">
                  {filteredTemplates.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchQuery || selectedTag !== "all" ? "No templates found" : "No email templates yet"}
                        </h3>
                        <p className="text-gray-500 mb-4">
                          {searchQuery || selectedTag !== "all" 
                            ? "Try adjusting your filters" 
                            : "Create your first email template to get started"}
                        </p>
                        {!searchQuery && selectedTag === "all" && (
                          <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Email Template
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    filteredTemplates.map(template => (
                      <Card key={template.id} className="overflow-hidden">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center">
                                {template.name}
                                <Badge variant="secondary" className="ml-2">
                                  <Hash className="h-3 w-3 mr-1" />
                                  {template.usageCount || 0} uses
                                </Badge>
                              </CardTitle>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.features?.split(',').map(tag => {
                                  const tagInfo = TEMPLATE_TAGS.find(t => t.value === tag.trim());
                                  return tagInfo ? (
                                    <Badge key={tag} className={tagInfo.color}>
                                      {tagInfo.label}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                              >
                                {showPreview === template.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(template)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => duplicateTemplate(template)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Delete this template?")) {
                                    deleteTemplateMutation.mutate(template.id!);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-sm ${showPreview === template.id ? 'bg-gray-50 p-3 rounded-lg' : 'text-gray-600'}`}>
                            {showPreview === template.id ? (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Preview with sample data:</p>
                                <div className="whitespace-pre-wrap">{renderPreview(template.description)}</div>
                              </div>
                            ) : (
                              <p className="line-clamp-3">{template.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : `Create New ${activeTab === "sms" ? "SMS" : "Email"} Template`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder={activeTab === "sms" ? "e.g., Follow-up SMS" : "e.g., Website Launch Email"}
              />
            </div>

            <div>
              <Label>Tags</Label>
              <Select
                value={templateForm.features || ""}
                onValueChange={(value) => setTemplateForm({ ...templateForm, features: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TAGS.map(tag => (
                    <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Message Content</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder={activeTab === "sms" 
                  ? "Hi {{name}}, just checking in on {{business}}. Your next appointment is {{date}} at {{time}}..."
                  : "Subject: Your Website is Ready!\n\nDear {{name}},\n\nWe're excited to announce that {{business}}'s new website is live..."
                }
                rows={activeTab === "sms" ? 4 : 10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {"{{name}}"}, {"{{business}}"}, {"{{date}}"}, {"{{time}}"}, {"{{link}}"}
              </p>
            </div>

            {/* Preview */}
            {templateForm.description && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {renderPreview(templateForm.description)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!templateForm.name || !templateForm.description || 
                       createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && 
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              }
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 