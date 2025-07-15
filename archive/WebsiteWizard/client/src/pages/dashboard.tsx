import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Globe, Upload, Plus, Eye, Calendar, Check, ExternalLink, ArrowRight, Settings, User, LogOut, MessageSquare, Phone, Mail, Users, Target, DollarSign, Clock, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import PipelineBoard from "@/components/pipeline-board";
import ImportModal from "@/components/import-modal";
import CampaignCard from "@/components/campaign-card";
import BusinessTypeCard from "@/components/business-type-card";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import moment from "moment";

export default function Dashboard() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: () => api.getActivities(10),
  });

  const { data: businessesData = [] } = useQuery({
    queryKey: ["/api/businesses"],
    queryFn: api.getBusinesses,
  });

  const businessTypes = [
    {
      name: "Auto Repair Shops",
      description: "High need for online presence, typically family-owned",
      successRate: "89%",
      prospects: "42 prospects found",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      businessType: "auto_repair",
    },
    {
      name: "Plumbing Services", 
      description: "Emergency services need 24/7 online visibility",
      successRate: "76%",
      prospects: "31 prospects found",
      imageUrl: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      businessType: "plumbing",
    },
    {
      name: "Electrical Contractors",
      description: "Licensed professionals value digital credibility", 
      successRate: "82%",
      prospects: "28 prospects found",
      imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      businessType: "electrical",
    },
    {
      name: "Landscaping Services",
      description: "Visual businesses benefit from photo galleries",
      successRate: "71%", 
      prospects: "36 prospects found",
      imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      businessType: "landscaping",
    },
    {
      name: "Roofing Contractors",
      description: "High-value projects need trust and credentials",
      successRate: "78%",
      prospects: "19 prospects found", 
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      businessType: "roofing",
    },
    {
      name: "Cleaning Services",
      description: "Recurring services benefit from online booking",
      successRate: "85%",
      prospects: "23 prospects found",
      imageUrl: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      businessType: "cleaning",
    },
  ];

  const handleBusinessTypeClick = (businessType: string) => {
    setLocation(`/prospects?type=${businessType}`);
  };

  // Stats calculations
  const todayStats = stats?.today || { newLeads: 0, responses: 0, callsScheduled: 0, delivered: 0 };
  const activeClients = businessesData.filter(b => b.stage === 'sold' || b.stage === 'delivered').length;
  const scheduledMeetings = businessesData.filter(b => 
    b.scheduledTime && moment(b.scheduledTime).isAfter(moment())
  ).length;
  
  // Payment stats
  const paymentStats = businessesData.reduce((acc, b) => {
    if (b.totalAmount && b.totalAmount > 0) {
      acc.totalDue += b.totalAmount;
      acc.totalPaid += b.paidAmount || 0;
      if (b.paymentStatus === 'paid') acc.paidCount++;
      if (b.paymentStatus === 'overdue') acc.overdueCount++;
    }
    return acc;
  }, { totalDue: 0, totalPaid: 0, paidCount: 0, overdueCount: 0 });

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-16 bg-white border-b"></div>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-white rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
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
                <Globe className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-xl text-gray-900">LocalBiz Pro</span>
            </a>
            <div className="hidden md:flex space-x-6 ml-8">
              <a href="/" className="text-primary border-b-2 border-primary pb-2 font-medium">Dashboard</a>
              <a href="/prospects" className="text-gray-600 hover:text-gray-900">Prospects</a>
              <a href="/inbox" className="text-gray-600 hover:text-gray-900">Inbox</a>
              <a href="/scheduling" className="text-gray-600 hover:text-gray-900">Scheduling</a>
              <a href="/clients" className="text-gray-600 hover:text-gray-900">Clients</a>
              <a href="/templates" className="text-gray-600 hover:text-gray-900">Templates</a>
              <a href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
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
                    // Clear auth token from localStorage
                    localStorage.removeItem('authToken');
                    // Redirect to login page
                    window.location.href = "/login";
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
        {/* Header Stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Manage your automated website sales pipeline</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/leads')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalLeads || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-lg">👥</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-green-600">+12% from last week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/campaigns')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Campaigns</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.activeCampaigns || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">📧</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-gray-600">2 completing today</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.conversionRate || "0.0"}%</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-lg">📈</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-green-600">+3.2% this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${stats?.monthlyRevenue?.toLocaleString() || "0"}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">💰</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-green-600">+$1,240 this week</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pipeline Management */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-gray-900">Sales Pipeline</CardTitle>
                  <Button onClick={() => setIsImportModalOpen(true)} className="bg-primary hover:bg-blue-700 text-white">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Leads
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <PipelineBoard />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            {/* Campaign Management */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {campaigns?.filter(c => c.status === 'active').map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
                <Button 
                  className="w-full bg-primary hover:bg-blue-700 text-white"
                  onClick={() => setLocation('/campaigns')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Today's Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New leads scraped</span>
                    <span className="font-medium text-gray-900">{stats?.today?.newLeads || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">SMS responses</span>
                    <span className="font-medium text-gray-900">{stats?.today?.responses || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Calls scheduled</span>
                    <span className="font-medium text-gray-900">{stats?.today?.callsScheduled || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Websites delivered</span>
                    <span className="font-medium text-gray-900">{stats?.today?.delivered || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {activities?.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : "Recently"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!activities || activities.length === 0) && (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Business Showcase Section */}
        <div className="mt-12">
          <Card>
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Target Business Types</CardTitle>
                  <p className="text-gray-600 mt-2">High-conversion local businesses perfect for website automation</p>
                </div>
                <Button 
                  variant="link" 
                  className="text-primary hover:text-blue-700"
                  onClick={() => setLocation('/prospects')}
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessTypes.map((businessType, index) => (
                  <div key={index} onClick={() => handleBusinessTypeClick(businessType.businessType)} className="cursor-pointer">
                    <BusinessTypeCard businessType={businessType} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Revenue Analytics</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative h-64 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                  alt="Business analytics dashboard with charts" 
                  className="absolute inset-0 w-full h-full object-cover opacity-30 rounded-lg" 
                />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">${stats?.monthlyRevenue?.toLocaleString() || "0"}</h4>
                    <p className="text-sm text-gray-600">This month's revenue</p>
                  </div>
                  <div className="flex items-end space-x-1">
                    {[8, 12, 6, 16, 10, 20, 14].map((height, i) => (
                      <div 
                        key={i}
                        className={`${i >= 5 ? 'bg-green-600' : 'bg-blue-600'} w-4 rounded-sm`}
                        style={{ height: `${height * 4}px` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Average Deal Size</p>
                  <p className="text-xl font-bold text-gray-900">${stats?.avgDealSize || 450}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monthly Recurring</p>
                  <p className="text-xl font-bold text-gray-900">${stats?.monthlyRecurring?.toLocaleString() || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Website Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {templates?.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-primary text-lg">🔧</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Used {template.usageCount}x</span>
                  </div>
                ))}
                
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => setLocation('/templates')}
                >
                  View All Templates <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalLeads || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">{scheduledMeetings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 p-3 rounded-lg ${
                  paymentStats.overdueCount > 0 ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <DollarSign className={`h-6 w-6 ${
                    paymentStats.overdueCount > 0 ? 'text-red-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(paymentStats.totalPaid / 100).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    of ${(paymentStats.totalDue / 100).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Overview - if there are any overdue payments */}
        {paymentStats.overdueCount > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      {paymentStats.overdueCount} Overdue Payment{paymentStats.overdueCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-red-700">
                      ${((paymentStats.totalDue - paymentStats.totalPaid) / 100).toFixed(0)} outstanding
                    </p>
                  </div>
                </div>
                <Link href="/clients">
                  <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                    View Clients
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
    </div>
  );
}
