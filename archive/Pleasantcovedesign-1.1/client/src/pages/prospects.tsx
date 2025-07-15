import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Globe, MessageSquare, Calendar, Target, Plus, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { Business } from "@shared/schema";
import { BUSINESS_TYPES } from "@shared/schema";

export default function Prospects() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();

  // Read URL parameters to auto-filter by business type
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam && BUSINESS_TYPES.includes(typeParam as any)) {
      setSelectedType(typeParam);
    }
  }, []);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["/api/businesses"],
    queryFn: api.getBusinesses,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const businessTypeInfo = {
    auto_repair: {
      name: "Auto Repair Shops",
      description: "Family-owned mechanics with high local traffic needs",
      avgRevenue: "$350K-$500K annually",
      painPoints: ["No online presence", "Appointment booking struggles", "Trust building"],
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    },
    plumbing: {
      name: "Plumbing Services", 
      description: "Emergency services requiring 24/7 online visibility",
      avgRevenue: "$400K-$750K annually",
      painPoints: ["Emergency call routing", "Service area coverage", "Licensing display"],
      imageUrl: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    },
    electrical: {
      name: "Electrical Contractors",
      description: "Licensed professionals valuing digital credibility",
      avgRevenue: "$500K-$1M annually", 
      painPoints: ["License verification", "Safety certifications", "Project portfolios"],
      imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    },
    landscaping: {
      name: "Landscaping Services",
      description: "Visual businesses needing photo galleries and portfolios",
      avgRevenue: "$200K-$600K annually",
      painPoints: ["Seasonal booking", "Project showcases", "Service area mapping"],
      imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    },
    roofing: {
      name: "Roofing Contractors",
      description: "High-value projects requiring trust and credentials",
      avgRevenue: "$800K-$2M annually",
      painPoints: ["Insurance claims", "Weather urgency", "Material sourcing"],
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    },
    cleaning: {
      name: "Cleaning Services",
      description: "Recurring services benefiting from online booking systems",
      avgRevenue: "$150K-$400K annually",
      painPoints: ["Recurring scheduling", "Trust building", "Service customization"],
      imageUrl: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    },
    hvac: {
      name: "HVAC Services",
      description: "Year-round essential services with emergency needs",
      avgRevenue: "$600K-$1.2M annually",
      painPoints: ["Emergency response", "Seasonal demand", "Equipment sourcing"],
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    },
    general_contractor: {
      name: "General Contractors",
      description: "Project-based businesses needing comprehensive portfolios",
      avgRevenue: "$1M-$5M annually",
      painPoints: ["Project timelines", "Subcontractor coordination", "Permit tracking"],
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
    }
  };

  const filteredBusinesses = businesses?.filter(business => {
    const matchesType = selectedType === "all" || business.businessType === selectedType;
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  const getBusinessesByType = (type: string) => {
    return businesses?.filter(b => b.businessType === type) || [];
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "scraped": return "bg-gray-100 text-gray-700";
      case "contacted": return "bg-blue-100 text-blue-700";
      case "interested": return "bg-yellow-100 text-yellow-700";
      case "sold": return "bg-green-100 text-green-700";
      case "delivered": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-16 bg-white border-b"></div>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-64 bg-white rounded-lg"></div>
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
              <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/prospects" className="text-primary border-b-2 border-primary pb-2 font-medium">Prospects</a>
              <a href="/inbox" className="text-gray-600 hover:text-gray-900">Inbox</a>
              <a href="/scheduling" className="text-gray-600 hover:text-gray-900">Scheduling</a>
              <a href="/clients" className="text-gray-600 hover:text-gray-900">Clients</a>
              <a href="/templates" className="text-gray-600 hover:text-gray-900">Templates</a>
              <a href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Prospect Database</h1>
              <p className="text-gray-600">Automated lead generation across Maine's local business sectors</p>
            </div>
            <div className="flex gap-2">
              <Button 
                className="bg-primary hover:bg-blue-700 text-white"
                onClick={() => navigate('/prospects/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Business
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/prospects?import=true')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-6">
            <div className="flex-1">
              <Input
                placeholder="Search businesses or cities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Business Types</SelectItem>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {businessTypeInfo[type as keyof typeof businessTypeInfo]?.name || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Business Type Overview */}
        {selectedType !== "all" && selectedType in businessTypeInfo && (
          <div className="mb-8">
            <Card>
              <CardContent className="p-0">
                <div className="relative h-48 overflow-hidden rounded-t-lg">
                  <img 
                    src={businessTypeInfo[selectedType as keyof typeof businessTypeInfo].imageUrl}
                    alt={businessTypeInfo[selectedType as keyof typeof businessTypeInfo].name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
                    <div className="p-6 text-white">
                      <h2 className="text-2xl font-bold mb-2">
                        {businessTypeInfo[selectedType as keyof typeof businessTypeInfo].name}
                      </h2>
                      <p className="text-gray-200">
                        {businessTypeInfo[selectedType as keyof typeof businessTypeInfo].description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Average Revenue</h4>
                      <p className="text-sm text-gray-600">
                        {businessTypeInfo[selectedType as keyof typeof businessTypeInfo].avgRevenue}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Total Prospects</h4>
                      <p className="text-sm text-gray-600">
                        {getBusinessesByType(selectedType).length} businesses found
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Common Pain Points</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {businessTypeInfo[selectedType as keyof typeof businessTypeInfo].painPoints.map((point, i) => (
                          <li key={i}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Prospects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBusinesses.map((business) => (
            <Card 
              key={business.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={(e) => {
                // Prevent navigation if clicking on buttons
                if ((e.target as HTMLElement).closest('button')) return;
                navigate(`/prospects/${business.id}`);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {business.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {businessTypeInfo[business.businessType as keyof typeof businessTypeInfo]?.name || business.businessType}
                    </p>
                  </div>
                  <Badge className={getStageColor(business.stage)}>
                    {business.stage}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {business.address}, {business.city}, {business.state}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {business.phone}
                </div>
                {business.website && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Globe className="w-4 h-4 mr-2" />
                    <a href={business.website} target="_blank" rel="noopener noreferrer" 
                       className="text-primary hover:underline"
                       onClick={(e) => e.stopPropagation()}>
                      View Website
                    </a>
                  </div>
                )}
                {business.notes && (
                  <p className="text-sm text-gray-600 italic">{business.notes}</p>
                )}
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    SMS
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-primary hover:bg-blue-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/prospects/${business.id}`);
                    }}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No prospects found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedType === "all" 
                ? "Try adjusting your search criteria." 
                : "No businesses found for this category. Try selecting a different business type."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}