import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Globe, User, Settings, LogOut, MessageSquare, Check, Calendar, Search, Filter, Phone, Mail, ExternalLink, MoreVertical, Eye, Edit, Trash2, Download, Plus, Play, Pause, BarChart } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.businessType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'draft': return 'Draft';
      default: return status;
    }
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600">Manage your SMS and email outreach campaigns</p>
          </div>
          <Button className="bg-primary hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
                <p className="text-sm text-gray-600">Total Campaigns</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{campaigns.filter(c => c.status === 'active').length}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{campaigns.filter(c => c.status === 'completed').length}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {campaigns.reduce((total, c) => total + (c.responseRate || 0), 0) / Math.max(campaigns.length, 1)}%
                </p>
                <p className="text-sm text-gray-600">Avg Response Rate</p>
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
                    placeholder="Search campaigns by name or business type..."
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
                    {filterStatus === "all" ? "Filter by Status" : `Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => setFilterStatus("all")}
                    className={filterStatus === "all" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStatus === "all" && "✓ "}All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStatus("active")}
                    className={filterStatus === "active" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStatus === "active" && "✓ "}Active
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStatus("paused")}
                    className={filterStatus === "paused" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStatus === "paused" && "✓ "}Paused
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStatus("completed")}
                    className={filterStatus === "completed" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStatus === "completed" && "✓ "}Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilterStatus("draft")}
                    className={filterStatus === "draft" ? "bg-blue-50 text-blue-700" : ""}
                  >
                    {filterStatus === "draft" && "✓ "}Draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-500 mb-4">Create your first campaign to start reaching out to prospects</p>
              <Button className="bg-primary hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{campaign.businessType}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sent:</span>
                      <span className="font-medium">{campaign.sentCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Responses:</span>
                      <span className="font-medium">{campaign.responseCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Response Rate:</span>
                      <span className="font-medium text-green-600">{campaign.responseRate || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(((campaign.responseCount || 0) / Math.max(campaign.sentCount || 1, 1)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(((campaign.responseCount || 0) / Math.max(campaign.sentCount || 1, 1)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 mt-4 border-t">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <BarChart className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex space-x-2">
                        {campaign.status === 'active' ? (
                          <Button variant="outline" size="sm">
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}