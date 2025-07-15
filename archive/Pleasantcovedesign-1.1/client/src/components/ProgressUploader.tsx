import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Calendar, Image as ImageIcon, CheckCircle, DollarSign } from "lucide-react";
import { api } from "@/lib/api";
import moment from "moment";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProgressUploaderProps {
  businessId: number;
  onSuccess?: () => void;
}

export function ProgressUploader({ businessId, onSuccess }: ProgressUploaderProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Form state
  const [stage, setStage] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(moment().format("YYYY-MM-DD"));
  const [publiclyVisible, setPubliclyVisible] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Payment fields
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid'>('pending');
  const [paymentNotes, setPaymentNotes] = useState("");
  const [stripeLink, setStripeLink] = useState("");

  // Create progress mutation
  const createProgressMutation = useMutation({
    mutationFn: async (data: {
      stage: string;
      imageUrl: string;
      date: string;
      notes?: string;
      publiclyVisible: boolean;
    }) => api.createProgressEntry(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId, "progress"] });
      toast({
        title: "✅ Progress Added",
        description: "The progress update has been added successfully.",
      });
      
      // Reset form
      setStage("");
      setNotes("");
      setDate(moment().format("YYYY-MM-DD"));
      setImageFile(null);
      setImagePreview("");
      setPubliclyVisible(true);
      setPaymentRequired(false);
      setPaymentAmount("");
      setPaymentStatus('pending');
      setPaymentNotes("");
      setStripeLink("");
      
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add progress update. Please try again.",
        variant: "destructive",
      });
      console.error("Progress upload error:", error);
    },
  });

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload to Cloudinary (or stub for now)
  const uploadImage = async (file: File): Promise<string> => {
    // TODO: Implement actual Cloudinary upload
    // For now, return a placeholder or use the preview
    
    // Stub implementation - in production, upload to Cloudinary
    console.log("Would upload file:", file.name);
    
    // For demo, use a placeholder image
    const placeholders = [
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format",
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format",
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format",
    ];
    
    // Return a random placeholder for now
    return placeholders[Math.floor(Math.random() * placeholders.length)];
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stage || !imageFile) {
      toast({
        title: "Missing Information",
        description: "Please provide a stage name and select an image.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload image
      const imageUrl = await uploadImage(imageFile);
      
      const data: any = {
        stage,
        imageUrl,
        date,
        notes,
        publiclyVisible,
      };

      // Add payment fields if payment is required
      if (paymentRequired) {
        data.paymentRequired = true;
        data.paymentAmount = paymentAmount ? parseFloat(paymentAmount) : null;
        data.paymentStatus = paymentStatus;
        data.paymentNotes = paymentNotes;
        data.stripeLink = stripeLink;
      }

      // Create progress entry
      await createProgressMutation.mutateAsync(data);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Add Progress Update
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stage Name */}
          <div>
            <Label htmlFor="stage">Stage Name *</Label>
            <Input
              id="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g., Homepage Design Complete"
              required
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label htmlFor="image">Progress Image *</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="image"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload image</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</span>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any details about this progress update..."
              rows={3}
            />
          </div>

          {/* Payment Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="paymentRequired"
                checked={paymentRequired}
                onCheckedChange={(checked) => setPaymentRequired(checked as boolean)}
              />
              <Label 
                htmlFor="paymentRequired" 
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
                  <Label htmlFor="paymentAmount">Amount ($)</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-2"
                  />
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(value: any) => setPaymentStatus(value)}>
                    <SelectTrigger id="paymentStatus" className="mt-2">
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
                  <Label htmlFor="stripeLink">Stripe Payment Link (Optional)</Label>
                  <Input
                    id="stripeLink"
                    type="url"
                    value={stripeLink}
                    onChange={(e) => setStripeLink(e.target.value)}
                    placeholder="https://checkout.stripe.com/..."
                    className="mt-2"
                  />
                </div>

                {/* Payment Notes */}
                <div>
                  <Label htmlFor="paymentNotes">Payment Notes (Optional)</Label>
                  <Textarea
                    id="paymentNotes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g., 50% deposit for design stage"
                    className="mt-2"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Public Visibility */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="public"
              checked={publiclyVisible}
              onCheckedChange={(checked) => setPubliclyVisible(checked as boolean)}
            />
            <Label htmlFor="public" className="text-sm font-normal cursor-pointer">
              Make this update publicly visible
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isUploading || createProgressMutation.isPending}
            className="w-full"
          >
            {isUploading || createProgressMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Add Progress Update
              </>
            )}
          </Button>
        </form>

        {/* Cloudinary Note */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="text-amber-800">
            <strong>Note:</strong> Image upload is currently using placeholder images. 
            To enable real uploads, integrate with Cloudinary or your preferred image hosting service.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 