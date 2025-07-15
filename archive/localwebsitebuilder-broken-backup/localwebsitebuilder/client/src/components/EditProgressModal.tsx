import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import type { ProgressEntry } from "@shared/schema";

interface EditProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ProgressEntry;
  onSuccess?: () => void;
}

export function EditProgressModal({ isOpen, onClose, entry, onSuccess }: EditProgressModalProps) {
  const [stage, setStage] = useState(entry.stage);
  const [notes, setNotes] = useState(entry.notes || "");
  const [date, setDate] = useState(entry.date);
  const [publiclyVisible, setPubliclyVisible] = useState<boolean>(entry.publiclyVisible !== false);
  
  // Payment fields
  const [paymentRequired, setPaymentRequired] = useState(entry.paymentRequired || false);
  const [paymentAmount, setPaymentAmount] = useState(
    entry.paymentAmount ? (entry.paymentAmount / 100).toFixed(2) : ""
  );
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid'>(
    entry.paymentStatus || 'pending'
  );
  const [paymentNotes, setPaymentNotes] = useState(entry.paymentNotes || "");
  const [stripeLink, setStripeLink] = useState(entry.stripeLink || "");

  // Reset form when entry changes
  useEffect(() => {
    setStage(entry.stage);
    setNotes(entry.notes || "");
    setDate(entry.date);
    setPubliclyVisible(entry.publiclyVisible !== false);
    setPaymentRequired(entry.paymentRequired || false);
    setPaymentAmount(entry.paymentAmount ? (entry.paymentAmount / 100).toFixed(2) : "");
    setPaymentStatus(entry.paymentStatus || 'pending');
    setPaymentNotes(entry.paymentNotes || "");
    setStripeLink(entry.stripeLink || "");
  }, [entry]);

  const updateProgressMutation = useMutation({
    mutationFn: (data: any) => api.updateProgressEntry(entry.id, data),
    onSuccess: () => {
      toast({
        title: "Progress updated",
        description: "Progress entry has been updated successfully.",
      });
      onClose();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update progress entry.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = {
      stage,
      notes,
      date,
      publiclyVisible,
    };

    // Add payment fields if payment is required
    if (paymentRequired) {
      data.paymentRequired = true;
      data.paymentAmount = paymentAmount ? parseFloat(paymentAmount) : null;
      data.paymentStatus = paymentStatus;
      data.paymentNotes = paymentNotes;
      data.stripeLink = stripeLink;
    } else {
      // Clear payment fields if payment is not required
      data.paymentRequired = false;
      data.paymentAmount = null;
      data.paymentStatus = null;
      data.paymentNotes = null;
      data.stripeLink = null;
    }

    updateProgressMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Progress Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stage Name */}
          <div>
            <Label htmlFor="edit-stage">Stage Name</Label>
            <Input
              id="edit-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g., Foundation Work, Framing, Final Review"
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="edit-notes">Notes (Optional)</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details about this progress update..."
              rows={3}
            />
          </div>

          {/* Payment Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-paymentRequired"
                checked={paymentRequired}
                onCheckedChange={(checked) => setPaymentRequired(checked as boolean)}
              />
              <Label 
                htmlFor="edit-paymentRequired" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                This stage includes a payment
              </Label>
            </div>

            {paymentRequired && (
              <div className="space-y-4 pl-6 animate-in fade-in slide-in-from-top-2">
                {/* Amount */}
                <div>
                  <Label htmlFor="edit-paymentAmount">Amount ($)</Label>
                  <Input
                    id="edit-paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="edit-paymentStatus">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(value: any) => setPaymentStatus(value)}>
                    <SelectTrigger id="edit-paymentStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Stripe Link */}
                <div>
                  <Label htmlFor="edit-stripeLink">Stripe Payment Link (Optional)</Label>
                  <Input
                    id="edit-stripeLink"
                    type="url"
                    value={stripeLink}
                    onChange={(e) => setStripeLink(e.target.value)}
                    placeholder="https://checkout.stripe.com/..."
                  />
                </div>

                {/* Payment Notes */}
                <div>
                  <Label htmlFor="edit-paymentNotes">Payment Notes (Optional)</Label>
                  <Textarea
                    id="edit-paymentNotes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g., 50% deposit for design stage"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-visible"
              checked={publiclyVisible}
              onCheckedChange={(checked) => setPubliclyVisible(checked as boolean)}
            />
            <Label 
              htmlFor="edit-visible" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Visible to client
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProgressMutation.isPending}>
              {updateProgressMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 