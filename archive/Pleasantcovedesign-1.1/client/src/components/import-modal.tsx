import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CloudUpload, X } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertBusiness } from "@shared/schema";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [importMethod, setImportMethod] = useState<"csv" | "manual">("csv");
  const [csvData, setCsvData] = useState("");
  const [manualData, setManualData] = useState<Partial<InsertBusiness>>({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "ME",
    businessType: "",
    stage: "scraped",
    notes: "",
  });

  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: api.importBusinesses,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.imported} businesses.`,
      });
      onClose();
      setCsvData("");
      setManualData({
        name: "",
        phone: "",
        address: "",
        city: "",
        state: "ME",
        businessType: "",
        stage: "scraped",
        notes: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: "Failed to import businesses. Please check your data format.",
        variant: "destructive",
      });
    },
  });

  const createBusinessMutation = useMutation({
    mutationFn: api.createBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Business Added",
        description: "Successfully added new business lead.",
      });
      onClose();
      setManualData({
        name: "",
        phone: "",
        address: "",
        city: "",
        state: "ME",
        businessType: "",
        stage: "scraped",
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add business. Please check your data.",
        variant: "destructive",
      });
    },
  });

  const parseCsvData = (csv: string): InsertBusiness[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const businesses: InsertBusiness[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      const business: Partial<InsertBusiness> = {
        stage: "scraped",
        state: "ME",
        notes: "",
      };

      headers.forEach((header, index) => {
        const value = values[index] || "";
        switch (header) {
          case "name":
          case "business name":
            business.name = value;
            break;
          case "phone":
          case "phone number":
            business.phone = value;
            break;
          case "address":
            business.address = value;
            break;
          case "city":
            business.city = value;
            break;
          case "state":
            business.state = value || "ME";
            break;
          case "business type":
          case "type":
            business.businessType = value;
            break;
        }
      });

      if (business.name && business.phone && business.address && business.city && business.businessType) {
        businesses.push(business as InsertBusiness);
      }
    }

    return businesses;
  };

  const handleCsvImport = () => {
    const businesses = parseCsvData(csvData);
    if (businesses.length === 0) {
      toast({
        title: "Invalid Data",
        description: "No valid businesses found in CSV data. Please check the format.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(businesses);
  };

  const handleManualAdd = () => {
    if (!manualData.name || !manualData.phone || !manualData.address || !manualData.city || !manualData.businessType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createBusinessMutation.mutate(manualData as InsertBusiness);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">Import Leads</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Method Selection */}
          <div className="flex space-x-4 border-b">
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                importMethod === "csv"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setImportMethod("csv")}
            >
              CSV Import
            </button>
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                importMethod === "manual"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setImportMethod("manual")}
            >
              Manual Entry
            </button>
          </div>

          {importMethod === "csv" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="csvData">CSV Data</Label>
                <Textarea
                  id="csvData"
                  placeholder="name,phone,address,city,state,business type&#10;Mike's Auto Repair,(207) 555-0123,123 Main St,Brunswick,ME,auto_repair&#10;Bath Plumbing Co.,(207) 555-0156,456 Oak Ave,Bath,ME,plumbing"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-2">Required columns:</p>
                <ul className="space-y-1">
                  <li>• <strong>name</strong> - Business name</li>
                  <li>• <strong>phone</strong> - Phone number</li>
                  <li>• <strong>address</strong> - Street address</li>
                  <li>• <strong>city</strong> - City name</li>
                  <li>• <strong>business type</strong> - Type of business (auto_repair, plumbing, electrical, etc.)</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCsvImport}
                  disabled={!csvData.trim() || importMutation.isPending}
                  className="bg-primary hover:bg-blue-700 text-white"
                >
                  {importMutation.isPending ? "Importing..." : "Import"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    value={manualData.name}
                    onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Mike's Auto Repair"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={manualData.phone}
                    onChange={(e) => setManualData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(207) 555-0123"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={manualData.address}
                  onChange={(e) => setManualData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={manualData.city}
                    onChange={(e) => setManualData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Brunswick"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={manualData.state}
                    onChange={(e) => setManualData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="ME"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessType">Business Type *</Label>
                <Select 
                  value={manualData.businessType} 
                  onValueChange={(value) => setManualData(prev => ({ ...prev, businessType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_repair">Auto Repair</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="landscaping">Landscaping</SelectItem>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="general_contractor">General Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={manualData.notes}
                  onChange={(e) => setManualData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this business..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleManualAdd}
                  disabled={createBusinessMutation.isPending}
                  className="bg-primary hover:bg-blue-700 text-white"
                >
                  {createBusinessMutation.isPending ? "Adding..." : "Add Business"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
