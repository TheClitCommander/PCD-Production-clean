import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageCircle, Calendar, Check, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import type { Business } from "@shared/schema";

interface LeadCardProps {
  business: Business;
  isDragging?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export default function LeadCard({ business, isDragging, onDragStart, onDragEnd }: LeadCardProps) {
  const [, setLocation] = useLocation();

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Recently";
    
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Recently";
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const getStageIcon = () => {
    switch (business.stage) {
      case "contacted":
        return <MessageCircle className="w-3 h-3" />;
      case "interested":
        return <Calendar className="w-3 h-3" />;
      case "sold":
        return <Check className="w-3 h-3" />;
      case "delivered":
        return <ExternalLink className="w-3 h-3" />;
      default:
        return <Eye className="w-3 h-3" />;
    }
  };

  const getStageStatus = () => {
    switch (business.stage) {
      case "contacted":
        return { text: "SMS sent", color: "text-blue-600" };
      case "interested":
        return { text: "Call scheduled", color: "text-yellow-600" };
      case "sold":
        return { text: "Payment received", color: "text-green-600" };
      case "delivered":
        return { text: "Live website", color: "text-green-600" };
      default:
        return { text: formatTimeAgo(business.createdAt), color: "text-gray-500" };
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if we're dragging
    if (isDragging) return;
    
    // Don't navigate if clicking on the button
    if ((e.target as HTMLElement).closest('button')) return;
    
    setLocation(`/business/${business.id}`);
  };

  const status = getStageStatus();

  return (
    <div
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? "dragging" : ""
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
    >
      <h4 className="font-medium text-sm text-gray-900 truncate" title={business.name}>
        {business.name}
      </h4>
      <p className="text-xs text-gray-600 mt-1 truncate" title={`${business.city}, ${business.state}`}>
        {business.city}, {business.state}
      </p>
      
      {business.source && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${
          business.source === 'acuity' ? 'bg-blue-100 text-blue-700' :
          business.source === 'squarespace' ? 'bg-purple-100 text-purple-700' :
          business.source === 'manual' ? 'bg-teal-100 text-teal-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {business.source.charAt(0).toUpperCase() + business.source.slice(1)}
        </span>
      )}
      
      {business.tags && (
        <div className="flex flex-wrap gap-1 mt-2">
          {(() => {
            try {
              const tags = JSON.parse(business.tags);
              return tags.slice(0, 3).map((tag: string, index: number) => (
                <span 
                  key={index}
                  className="inline-block text-xs px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-200"
                  title={tag}
                >
                  {tag}
                </span>
              ));
            } catch {
              return null;
            }
          })()}
        </div>
      )}
      
      {business.stage === "sold" && (
        <p className="text-xs text-green-600 font-medium mt-2">$400 + $50/mo</p>
      )}
      
      {business.stage === "delivered" && business.website && (
        <p className="text-xs text-green-600 font-medium mt-2">Live website</p>
      )}
      
      <div className="mt-3 flex justify-between items-center">
        <span className={`text-xs ${status.color} truncate flex-1 mr-2`}>
          {status.text}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 text-primary hover:text-blue-700 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {getStageIcon()}
        </Button>
      </div>
    </div>
  );
}
