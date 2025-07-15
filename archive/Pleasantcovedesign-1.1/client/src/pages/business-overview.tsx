import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import type { Business } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Bell, Globe, User, Settings, LogOut, MessageSquare, Phone, Mail, 
  ArrowLeft, Calendar, Check, ExternalLink, Edit, Trash2, Bot,
  Clock, MapPin, Building, Tag, TrendingUp
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

export default function BusinessOverview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const { data: business, isLoading } = useQuery({
    queryKey: [`/api/businesses/${id}`],
    queryFn: () => api.getBusiness(parseInt(id!)),
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: [`/api/businesses/${id}/activities`],
    queryFn: () => api.getBusinessActivities(parseInt(id!)),
    enabled: !!id,
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

  const getScoreDisplay = (score: number) => {
    if (score >= 80) return { color: 'text-green-600', label: 'Hot Lead' };
    if (score >= 60) return { color: 'text-yellow-600', label: 'Warm Lead' };
    if (score >= 40) return { color: 'text-blue-600', label: 'Cool Lead' };
    return { color: 'text-gray-600', label: 'Cold Lead' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-16 bg-white border-b"></div>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-white rounded-lg"></div>
                <div className="h-64 bg-white rounded-lg"></div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-white rounded-lg"></div>
                <div className="h-32 bg-white rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h2>
          <p className="text-gray-600 mb-4">The business you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const scoreInfo = getScoreDisplay(business.score || 0);

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
                {notifications.slice(0, 3).map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className={`flex items-start space-x-3 p-3 ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-gray-500">{notification.description}</p>
                      <p className="text-xs text-gray-400">{notification.time}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
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
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
              <p className="text-gray-600">{business.businessType} • {business.city}, {business.state}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              onClick={() => window.location.href = `tel:${business.phone}`}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = `mailto:${business.email || 'info@' + business.name.toLowerCase().replace(/\s+/g, '') + '.com'}`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button>
              <MessageSquare className="w-4 h-4 mr-2" />
              Open Inbox
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Details */}
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Business Type</p>
                      <p className="font-medium">{business.businessType}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">{business.city}, {business.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{business.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{business.email || 'Not available'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Lead Score</p>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${scoreInfo.color}`}>{business.score || 0}</span>
                        <Badge variant="outline" className={`text-xs ${scoreInfo.color}`}>
                          {scoreInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Added</p>
                      <p className="font-medium">{business.createdAt ? new Date(business.createdAt).toLocaleDateString() : 'Recently'}</p>
                    </div>
                  </div>
                </div>

                {business.website && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-3">
                      <ExternalLink className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Website</p>
                        <a 
                          href={business.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {business.website}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {business.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Notes</p>
                    <p className="text-gray-900">{business.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities && activities.length > 0 ? (
                    activities.map((activity: any) => (
                      <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : "Recently"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No activity recorded yet</p>
                      <p className="text-sm">Start engaging with this business to see activity here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stage & Status */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Pipeline Stage</p>
                  <Badge className={getStageColor(business.stage)}>
                    {getStageLabel(business.stage)}
                  </Badge>
                </div>
                
                {business.priority && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Priority</p>
                    <Badge 
                      variant="outline" 
                      className={
                        business.priority === 'high' ? 'text-red-600 border-red-200' :
                        business.priority === 'medium' ? 'text-yellow-600 border-yellow-200' :
                        'text-green-600 border-green-200'
                      }
                    >
                      {business.priority.charAt(0).toUpperCase() + business.priority.slice(1)}
                    </Badge>
                  </div>
                )}

                {business.stage === 'sold' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Deal Value</p>
                    <p className="text-lg font-bold text-green-600">$400 + $50/month</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {business.tags && business.tags.length > 0 ? (
                    business.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tags assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setLocation(`/inbox?business=${business.id}`)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Conversation
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Call
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Bot className="w-4 h-4 mr-2" />
                  Launch Outreach
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
                {business.website && (
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => business.website && window.open(business.website, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Website
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 