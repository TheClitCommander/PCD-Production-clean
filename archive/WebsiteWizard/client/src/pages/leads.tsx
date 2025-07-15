import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import type { Business } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Globe, User, Settings, LogOut, MessageSquare, Check, Calendar, Search, Filter, Phone, Mail, ExternalLink, MoreVertical, Eye, Edit, Trash2, Download, Bot, Sparkles, TrendingUp } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businesses = [] } = useQuery({
    queryKey: ["/api/businesses"],
  }) as { data: Business[] };

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/stats"],
  });

  const launchBotMutation = useMutation({
    mutationFn: async (businessIds: number[]) => {
      const response = await fetch("/api/bot/launch-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessIds, campaignType: "general" }),
      });
      if (!response.ok) throw new Error("Failed to launch bot");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bot Launched!",
        description: "Automated enrichment and outreach has been started for selected leads.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      setSelectedLeads([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to launch bot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredBusinesses = businesses.filter((business: Business) => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.businessType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === "all" || business.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'scraped': return 'bg-gray-100 text-gray-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'interested': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'scraped': return 'Scraped';
      case 'contacted': return 'Contacted';
      case 'interested': return 'Interested';
      case 'sold': return 'Sold';
      case 'delivered': return 'Delivered';
      default: return stage;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreDisplay = (score: number) => {
    if (score >= 80) return { color: 'text-green-600', label: 'Hot Lead' };
    if (score >= 60) return { color: 'text-yellow-600', label: 'Warm Lead' };
    if (score >= 40) return { color: 'text-blue-600', label: 'Cool Lead' };
    return { color: 'text-gray-600', label: 'Cold Lead' };
  };

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
              <a href="/inbox" className="text-gray-600 hover:text-gray-900">Inbox</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Templates</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Analytics</a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b">
                  <h4 className="font-semibold">Notifications</h4>
                </div>
                {notifications.slice(0, 3).map((notification) => {
                  const getIcon = (type: string) => {
                    switch (type) {
                      case 'message': return MessageSquare;
                      case 'meeting': return Calendar;
                      case 'delivery': return Check;
                      case 'call': return Phone;
                      case 'email': return Mail;
                      case 'payment': return Check;
                      default: return Bell;
                    }
                  };
                  
                  const getIconColor = (type: string) => {
                    switch (type) {
                      case 'message': return 'text-blue-500';
                      case 'meeting': return 'text-green-500';
                      case 'delivery': return 'text-purple-500';
                      case 'call': return 'text-orange-500';
                      case 'email': return 'text-indigo-500';
                      case 'payment': return 'text-green-600';
                      default: return 'text-gray-500';
                    }
                  };

                  const Icon = getIcon(notification.type);
                  return (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className={`flex items-start space-x-3 p-3 ${!notification.read ? 'bg-blue-50' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Icon className={`w-4 h-4 mt-1 ${getIconColor(notification.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-500">
                          {notification.description.slice(0, 60)}
                          {notification.description.length > 60 ? '...' : ''}
                        </p>
                        <p className="text-xs text-gray-400">{notification.time}</p>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/notifications" className="text-center text-sm text-blue-600 hover:text-blue-800">
                    View all notifications
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Account Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 rounded-full bg-primary text-white hover:bg-primary/90">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium">John Smith</p>
                  <p className="text-sm text-gray-500">john@localbizpro.com</p>
                </div>
                <DropdownMenuItem asChild>
                  <a href="/profile">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/account">
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/notifications">
                    <Bell className="w-4 h-4 mr-2" />
                    Notification Preferences
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => {
                  if (confirm("Are you sure you want to sign out?")) {
                    window.location.href = "/";
                  }
                }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
            <p className="text-gray-600">Manage and track all your business prospects</p>
          </div>
          <Button 
            onClick={() => launchBotMutation.mutate(selectedLeads)}
            disabled={selectedLeads.length === 0 || launchBotMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Bot className="w-4 h-4 mr-2" />
            Launch Bot ({selectedLeads.length} selected)
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{businesses.length}</p>
                <p className="text-sm text-gray-600">Total Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{businesses.filter(b => b.stage === 'scraped').length}</p>
                <p className="text-sm text-gray-600">To Enrich</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{businesses.filter(b => b.stage === 'contacted').length}</p>
                <p className="text-sm text-gray-600">Contacted</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{businesses.filter(b => b.stage === 'interested').length}</p>
                <p className="text-sm text-gray-600">Interested</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{businesses.filter(b => b.stage === 'sold').length}</p>
                <p className="text-sm text-gray-600">Converted</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search leads by name or business type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    {filterStage === "all" ? "Filter by Stage" : `Stage: ${filterStage.charAt(0).toUpperCase() + filterStage.slice(1)}`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => setFilterStage("all")}
                    className={filterStage === "all" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStage === "all" && "✓ "}All Stages
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStage("scraped")}
                    className={filterStage === "scraped" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStage === "scraped" && "✓ "}Scraped
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStage("contacted")}
                    className={filterStage === "contacted" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStage === "contacted" && "✓ "}Contacted
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStage("interested")}
                    className={filterStage === "interested" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStage === "interested" && "✓ "}Interested
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStage("sold")}
                    className={filterStage === "sold" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStage === "sold" && "✓ "}Sold
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStage("delivered")}
                    className={filterStage === "delivered" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStage === "delivered" && "✓ "}Delivered
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," + 
                  "Business Name,Email,Phone,Type,Location,Stage,Created\n" +
                  filteredBusinesses.map(b => 
                    `"${b.name}","${b.email}","${b.phone}","${b.businessType}","${b.city}, ${b.state}","${b.stage}","${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Recently'}"`
                  ).join("\n");
                
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "leads_export.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === filteredBusinesses.length && filteredBusinesses.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads(filteredBusinesses.map(b => b.id));
                          } else {
                            setSelectedLeads([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Business</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Stage</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Tags</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No leads found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredBusinesses.map((business) => {
                      const scoreInfo = getScoreDisplay(business.score || 0);
                      return (
                        <tr 
                          key={business.id} 
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => setLocation(`/business/${business.id}`)}
                        >
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(business.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeads([...selectedLeads, business.id]);
                                } else {
                                  setSelectedLeads(selectedLeads.filter(id => id !== business.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{business.name}</p>
                              <p className="text-sm text-gray-500">{business.email || 'No email'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className={`text-sm font-medium ${scoreInfo.color}`}>
                                {business.score || 0}
                              </div>
                              <Badge variant="outline" className={`text-xs ${scoreInfo.color}`}>
                                {scoreInfo.label}
                              </Badge>
                              {business.priority === 'high' && (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{business.businessType}</td>
                          <td className="py-3 px-4 text-gray-700">{business.city}, {business.state}</td>
                          <td className="py-3 px-4">
                            <Badge className={getStageColor(business.stage)}>
                              {getStageLabel(business.stage)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {business.tags?.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              )) || <span className="text-gray-400 text-sm">No tags</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setLocation(`/business/${business.id}`)}
                                title="View business overview"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.location.href = `tel:${business.phone}`}
                                title="Call business"
                              >
                                <Phone className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.location.href = `mailto:${business.email || 'info@' + business.name.toLowerCase().replace(/\s+/g, '') + '.com'}`}
                                title="Send email"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    // Trigger enrichment for single lead
                                    launchBotMutation.mutate([business.id]);
                                  }}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Enrich Lead
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    const editData = {
                                      name: business.name,
                                      phone: business.phone,
                                      businessType: business.businessType,
                                      stage: business.stage,
                                      notes: business.notes
                                    };
                                    alert(`Edit functionality would open with:\n${JSON.stringify(editData, null, 2)}`);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    if (business.website) {
                                      window.open(business.website, '_blank');
                                    } else {
                                      window.open('/customer-example', '_blank');
                                    }
                                  }}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Website
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${business.name}? This action cannot be undone.`)) {
                                        alert(`Delete functionality would remove ${business.name} from the database.`);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}