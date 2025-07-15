import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Business } from "@shared/schema";

interface PaymentManagerProps {
  business: Business;
}

export function PaymentManager({ business }: PaymentManagerProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    paymentStatus: business.paymentStatus || 'pending',
    totalAmount: (business.totalAmount || 0) / 100, // Convert cents to dollars
    paidAmount: (business.paidAmount || 0) / 100,
    stripePaymentLinkId: business.stripePaymentLinkId || '',
    paymentNotes: business.paymentNotes || '',
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        paymentStatus: formData.paymentStatus,
        totalAmount: Math.round(formData.totalAmount * 100), // Convert to cents
        paidAmount: Math.round(formData.paidAmount * 100),
        stripePaymentLinkId: formData.stripePaymentLinkId,
        paymentNotes: formData.paymentNotes,
        lastPaymentDate: formData.paidAmount > 0 ? new Date().toISOString() : business.lastPaymentDate,
      };
      return api.updateBusiness(business.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", business.id] });
      toast({
        title: "Payment Updated",
        description: "Payment information has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update payment information.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentMutation.mutate();
  };

  const copyPaymentLink = () => {
    if (formData.stripePaymentLinkId) {
      navigator.clipboard.writeText(formData.stripePaymentLinkId);
      toast({
        title: "Link Copied",
        description: "Payment link copied to clipboard.",
      });
    }
  };

  const publicProgressUrl = `${window.location.origin}/progress/public/${business.id}`;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Payment Management
        </h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit Payment
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="status">Payment Status</Label>
            <Select
              value={formData.paymentStatus}
              onValueChange={(value) => setFormData({ ...formData, paymentStatus: value as any })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
                <SelectItem value="paid">Paid in Full</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total">Total Amount ($)</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="paid">Paid Amount ($)</Label>
              <Input
                id="paid"
                type="number"
                step="0.01"
                value={formData.paidAmount}
                onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="link">Stripe Payment Link</Label>
            <div className="flex gap-2">
              <Input
                id="link"
                value={formData.stripePaymentLinkId}
                onChange={(e) => setFormData({ ...formData, stripePaymentLinkId: e.target.value })}
                placeholder="https://buy.stripe.com/..."
              />
              <Button type="button" variant="ghost" size="icon" onClick={copyPaymentLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Payment Notes</Label>
            <Textarea
              id="notes"
              value={formData.paymentNotes}
              onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
              placeholder="Add any payment-related notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updatePaymentMutation.isPending}>
              {updatePaymentMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium capitalize">{business.paymentStatus || 'pending'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p className="font-medium">
                ${((business.paidAmount || 0) / 100).toFixed(2)} / ${((business.totalAmount || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {business.stripePaymentLinkId && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Link</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                  {business.stripePaymentLinkId}
                </code>
                <Button variant="ghost" size="icon" onClick={copyPaymentLink}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(business.stripePaymentLinkId!, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 mb-1">Client Portal Link</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                {publicProgressUrl}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(publicProgressUrl);
                  toast({
                    title: "Link Copied",
                    description: "Client portal link copied to clipboard.",
                  });
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share this link with the client or embed in Squarespace
            </p>
          </div>

          {business.paymentNotes && (
            <div>
              <p className="text-sm text-gray-600">Notes</p>
              <p className="text-sm mt-1">{business.paymentNotes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
} 