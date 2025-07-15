import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Building2, Calendar, MessageSquare, ChevronRight, Users, Loader2, DollarSign, CheckCircle, AlertCircle, Phone, Mail, MapPin } from "lucide-react";
import type { Business } from "@shared/schema";
import moment from "moment";

export default function Clients() {
  const [, navigate] = useLocation();
  
  // Fetch all businesses and filter for clients
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["/api/businesses"],
    queryFn: api.getBusinesses,
  });

  // Filter for businesses with stage 'sold' or 'delivered' (actual clients)
  const clients = businesses.filter(b => b.stage === 'sold' || b.stage === 'delivered');

  // Fetch recent activities to show last interaction
  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: () => api.getActivities(100),
  });

  // Helper to get last interaction date for a client
  const getLastInteraction = (clientId: number) => {
    const clientActivities = activities.filter(a => a.businessId === clientId);
    if (clientActivities.length > 0) {
      return moment(clientActivities[0].createdAt).format('MMM D, YYYY');
    }
    return 'No recent activity';
  };

  // Helper to determine client status badge
  const getStatusBadge = (client: Business) => {
    // You can expand this logic based on your needs
    if (client.stage === 'delivered') {
      return <Badge className="bg-green-100 text-green-700">Delivered</Badge>;
    }
    
    // Check if they have a recent appointment
    const hasRecentAppointment = client.scheduledTime && 
      moment(client.scheduledTime).isAfter(moment());
    
    if (hasRecentAppointment) {
      return <Badge className="bg-blue-100 text-blue-700">Active</Badge>;
    }
    
    // Default status for 'sold' stage
    return <Badge className="bg-yellow-100 text-yellow-700">In Progress</Badge>;
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
      {/* Navigation - similar to other pages */}
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
              <a href="/clients" className="text-primary border-b-2 border-primary pb-2 font-medium">Clients</a>
              <a href="/templates" className="text-gray-600 hover:text-gray-900">Templates</a>
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
              <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600 mt-1">
                Manage your active clients and their projects
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span className="text-lg font-medium">{clients.length} Clients</span>
            </div>
          </div>

          {/* Client Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Clients Yet</h3>
                  <p className="text-gray-500 mb-4">
                    Convert your prospects to clients to see them here
                  </p>
                  <Button onClick={() => navigate("/prospects")}>
                    View Prospects
                  </Button>
                </CardContent>
              </Card>
            ) : (
              clients.map(client => (
                <Card 
                  key={client.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      {getStatusBadge(client)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {client.email}
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {client.city}, {client.state}
                      </div>
                    </div>

                    {/* Tags */}
                    {client.tags && (
                      <div className="flex flex-wrap gap-1">
                        {client.tags.split(',').slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Payment Status */}
                    {client.totalAmount && client.totalAmount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-gray-600">
                              ${((client.paidAmount || 0) / 100).toFixed(0)} / ${(client.totalAmount / 100).toFixed(0)}
                            </span>
                          </div>
                          <Badge
                            variant={
                              client.paymentStatus === 'paid' ? 'default' :
                              client.paymentStatus === 'partial' ? 'secondary' :
                              client.paymentStatus === 'overdue' ? 'destructive' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {client.paymentStatus === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {client.paymentStatus === 'overdue' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {client.paymentStatus || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Last Interaction */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-gray-500">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {getLastInteraction(client.id)}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${client.id}`);
                        }}
                      >
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 