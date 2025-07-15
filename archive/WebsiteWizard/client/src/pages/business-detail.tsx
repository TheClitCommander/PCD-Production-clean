import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, Phone, Mail, MapPin, Globe, TrendingUp, Calendar, 
  MessageSquare, Activity, ChevronLeft, UserCheck, Loader2, ExternalLink
} from "lucide-react";
import type { Business, Activity as ActivityType } from "@shared/schema";
import moment from "moment";

export default function BusinessDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const businessId = parseInt(id!);

  // Fetch business data
  const { data: business, isLoading } = useQuery({
    queryKey: [`/api/businesses/${businessId}`],
    queryFn: () => api.getBusiness(businessId),
  });

  // Fetch activities for this business
  const { data: activities = [] } = useQuery({
    queryKey: [`/api/businesses/${businessId}/activities`],
    queryFn: () => api.getBusinessActivities(businessId),
  });

  // Convert to client mutation
  const convertToClientMutation = useMutation({
    mutationFn: () => api.updateBusiness(businessId, { 
      stage: 'client',
      notes: `${business?.notes || ''}\n\n[${moment().format('YYYY-MM-DD')}] Converted to client`
    }),
    onSuccess: () => {
      // Log activity
      fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "status_changed",
          description: `Converted to client on ${moment().format('MMMM D, YYYY')}`,
          businessId,
        }),
      });

      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      
      toast({
        title: "Success!",
        description: "Business converted to client successfully",
      });

      // Redirect to client profile
      setTimeout(() => {
        navigate(`/clients/${businessId}`);
      }, 500);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Business not found</h2>
      </div>
    );
  }

  const isClient = business.stage === 'client' || business.stage === 'closed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/prospects")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Prospects
            </Button>
          </div>
          {!isClient && (
            <Button 
              onClick={() => convertToClientMutation.mutate()}
              disabled={convertToClientMutation.isPending}
            >
              {convertToClientMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Convert to Client
            </Button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{business.name}</CardTitle>
                    <p className="text-gray-600 mt-1">{business.businessType}</p>
                  </div>
                  <Badge variant={business.stage === 'scraped' ? 'secondary' : 'default'}>
                    {business.stage}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <Label className="text-sm">Phone</Label>
                        <p className="font-medium">{business.phone}</p>
                      </div>
                    </div>
                    {business.email && (
                      <div className="flex items-start space-x-3">
                        <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <Label className="text-sm">Email</Label>
                          <p className="font-medium">{business.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <Label className="text-sm">Address</Label>
                        <p className="font-medium">{business.address}</p>
                        <p className="text-sm text-gray-600">{business.city}, {business.state}</p>
                      </div>
                    </div>
                    {business.website && (
                      <div className="flex items-start space-x-3">
                        <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <Label className="text-sm">Website</Label>
                          <a 
                            href={business.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline flex items-center"
                          >
                            {business.website}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {business.tags && (
                  <div>
                    <Label className="text-sm">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {business.tags.split(',').map((tag, idx) => (
                        <Badge key={idx} variant="outline">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score and Priority */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm">Lead Score</Label>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-2xl font-bold">{business.score || 0}</span>
                      <span className="text-gray-500 ml-1">/ 100</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Priority</Label>
                    <Badge 
                      variant={
                        business.priority === 'high' ? 'destructive' :
                        business.priority === 'low' ? 'secondary' : 'default'
                      }
                      className="mt-1"
                    >
                      {business.priority}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={business.notes || ''}
                  readOnly
                  rows={6}
                  className="font-mono text-sm"
                  placeholder="No notes available"
                />
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline - Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/scheduling")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/inbox")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                {isClient ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate(`/clients/${businessId}`)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    View Client Profile
                  </Button>
                ) : (
                  <Button 
                    className="w-full justify-start"
                    onClick={() => convertToClientMutation.mutate()}
                    disabled={convertToClientMutation.isPending}
                  >
                    {convertToClientMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Convert to Client
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No activities yet</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {moment(activity.createdAt).format('MMM D, YYYY h:mm A')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 