import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Campaign } from "@shared/schema";

interface CampaignCardProps {
  campaign: Campaign;
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const progressPercentage = campaign.totalContacts > 0 
    ? (campaign.sentCount / campaign.totalContacts) * 100 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{campaign.name}</h4>
        <Badge className={getStatusColor(campaign.status)}>
          {campaign.status}
        </Badge>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        SMS campaign to {campaign.totalContacts} {campaign.businessType.replace('_', ' ')}
      </p>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-500">Sent: {campaign.sentCount}/{campaign.totalContacts}</span>
        <span className="text-green-600">{campaign.responseCount} replies</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
    </div>
  );
}
