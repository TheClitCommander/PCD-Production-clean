import { useParams } from "wouter";
import { useQuery, QueryClientProvider } from "@tanstack/react-query";
import { ProgressGallery } from "@/components/ProgressGallery";
import { PaymentStatus } from "@/components/PaymentStatus";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

function ProgressPublicContent() {
  const { clientId } = useParams();
  
  // Fetch public progress data from API
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/progress/public", clientId],
    queryFn: () => api.getPublicProgress(clientId || ""),
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold text-gray-700">Project not found</h2>
          <p className="text-gray-500 mt-2">This project may not exist or is not publicly visible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Project Progress</h1>
          <p className="text-gray-600 mt-1">{data.businessName}</p>
        </div>

        {/* Payment Status - Only show if payment data exists */}
        {data.paymentInfo && (
          <div className="mb-6">
            <PaymentStatus 
              paymentStatus={data.paymentInfo.paymentStatus}
              totalAmount={data.paymentInfo.totalAmount}
              paidAmount={data.paymentInfo.paidAmount}
              paymentLink={data.paymentInfo.stripePaymentLinkId}
              lastPaymentDate={data.paymentInfo.lastPaymentDate}
            />
          </div>
        )}

        {/* Gallery */}
        <Card className="p-6">
          <CardContent className="p-6">
            {data.entries.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No progress updates yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Check back later for project updates
                </p>
              </div>
            ) : (
              <ProgressGallery 
                entries={data.entries} 
                clientName={data.businessName}
                isAdmin={false}
              />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Powered by LocalBiz Pro</p>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPublic() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProgressPublicContent />
    </QueryClientProvider>
  );
} 