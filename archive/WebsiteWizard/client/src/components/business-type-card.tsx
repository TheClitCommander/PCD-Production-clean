import { Badge } from "@/components/ui/badge";

interface BusinessTypeCardProps {
  businessType: {
    name: string;
    description: string;
    successRate: string;
    prospects: string;
    imageUrl: string;
  };
}

export default function BusinessTypeCard({ businessType }: BusinessTypeCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <img 
        src={businessType.imageUrl} 
        alt={businessType.name}
        className="w-full h-48 object-cover" 
      />
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{businessType.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{businessType.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-green-600 font-medium">{businessType.successRate} success rate</span>
          <span className="text-xs text-gray-500">{businessType.prospects}</span>
        </div>
      </div>
    </div>
  );
}
