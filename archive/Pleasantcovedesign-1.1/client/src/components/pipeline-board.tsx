import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import LeadCard from "./lead-card";
import { PIPELINE_STAGES } from "@shared/schema";
import type { Business, PipelineStage } from "@shared/schema";
import { useState } from "react";

export default function PipelineBoard() {
  const [draggedLead, setDraggedLead] = useState<Business | null>(null);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["/api/businesses"],
    queryFn: api.getBusinesses,
  });

  const { data: stats } = useQuery<{
    stageStats?: Record<PipelineStage, number>;
  }>({
    queryKey: ["/api/stats"],
  });

  const updateBusinessMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Business> }) =>
      api.updateBusiness(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const handleDragStart = (lead: Business) => {
    setDraggedLead(lead);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStage: PipelineStage) => {
    e.preventDefault();
    
    if (draggedLead && draggedLead.stage !== newStage) {
      updateBusinessMutation.mutate({
        id: draggedLead.id,
        updates: { stage: newStage },
      });
    }
    
    setDraggedLead(null);
  };

  const getBusinessesByStage = (stage: PipelineStage) => {
    return businesses?.filter(b => b.stage === stage) || [];
  };

  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case "scraped": return "bg-gray-100 text-gray-700";
      case "contacted": return "bg-blue-100 text-blue-700";
      case "interested": return "bg-yellow-100 text-yellow-700";
      case "sold": return "bg-green-100 text-green-700";
      case "delivered": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStageTitle = (stage: PipelineStage) => {
    switch (stage) {
      case "scraped": return "Scraped";
      case "contacted": return "Contacted";
      case "interested": return "Interested";
      case "sold": return "Sold";
      case "delivered": return "Delivered";
      default: return stage;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage} className="bg-gray-50 rounded-lg p-4 pipeline-column">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-6 w-8 bg-gray-200 rounded-full"></div>
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-lg p-3 h-24 animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {PIPELINE_STAGES.map((stage) => {
        const stageBusinesses = getBusinessesByStage(stage);
        const stageCount = stats?.stageStats?.[stage] || stageBusinesses.length;

        return (
          <div
            key={stage}
            className="bg-gray-50 rounded-lg p-4 pipeline-column min-w-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 truncate mr-2">{getStageTitle(stage)}</h3>
              <Badge variant="secondary" className={`${getStageColor(stage)} flex-shrink-0`}>
                {stageCount}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {stageBusinesses.map((business) => (
                <LeadCard
                  key={business.id}
                  business={business}
                  isDragging={draggedLead?.id === business.id}
                  onDragStart={() => handleDragStart(business)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              
              {stageBusinesses.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No leads in this stage
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
