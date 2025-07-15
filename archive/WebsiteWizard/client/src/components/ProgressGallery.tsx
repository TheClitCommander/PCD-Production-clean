import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, StickyNote, Image as ImageIcon, Trash2, Edit, Loader2,
  DollarSign, CheckCircle, AlertCircle, ExternalLink
} from "lucide-react";
import moment from "moment";
import type { ProgressEntry } from "@shared/schema";
import { EditProgressModal } from "./EditProgressModal";
import { cn } from "@/lib/utils";

interface ProgressGalleryProps {
  entries: ProgressEntry[];
  clientName?: string;
  onDelete?: (entryId: number) => void;
  isAdmin?: boolean;
  isLoading?: boolean;
}

export function ProgressGallery({ 
  entries, 
  clientName, 
  onDelete, 
  isAdmin = false, 
  isLoading = false 
}: ProgressGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ProgressEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (entryId: number) => {
    if (!onDelete) return;
    
    setDeletingId(entryId);
    try {
      await onDelete(entryId);
    } finally {
      setDeletingId(null);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="w-full h-48 bg-gray-200" />
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map((entry, index) => (
          <Card 
            key={entry.id || index} 
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedImage(entry)}
          >
            <div className="aspect-w-16 aspect-h-9 relative">
              <img
                src={entry.imageUrl}
                alt={entry.stage}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  // Fallback for broken images
                  e.currentTarget.src = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-semibold text-lg">{entry.stage}</h3>
              </div>
              {isAdmin && entry.id && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-white/80 hover:bg-white text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEntry(entry);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 bg-white/80 hover:bg-white text-red-600"
                      disabled={deletingId === entry.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this progress entry?')) {
                          handleDelete(entry.id);
                        }
                      }}
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {moment(entry.date).format("MMM D, YYYY")}
                </div>
                {entry.notes && (
                  <div className="flex items-center">
                    <StickyNote className="h-4 w-4" />
                  </div>
                )}
              </div>
              {entry.notes && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {entry.notes}
                </p>
              )}
              
              {/* Payment Badge in Card */}
              {entry.paymentRequired && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      ${((entry.paymentAmount || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <Badge
                    variant={
                      entry.paymentStatus === 'paid' ? 'default' :
                      entry.paymentStatus === 'partial' ? 'secondary' :
                      'outline'
                    }
                    className={cn(
                      "text-xs",
                      entry.paymentStatus === 'paid' && "bg-green-100 text-green-700",
                      entry.paymentStatus === 'partial' && "bg-yellow-100 text-yellow-700"
                    )}
                  >
                    {entry.paymentStatus || 'pending'}
                  </Badge>
                </div>
              )}
              
              {!entry.publiclyVisible && isAdmin && (
                <div className="mt-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    🔒 Private
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No progress updates yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Progress images will appear here as the project develops
            </p>
          </div>
        </Card>
      )}

      {/* Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedImage && (
            <div>
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.stage}
                className="w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format";
                }}
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{selectedImage.stage}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  {moment(selectedImage.date).format("MMMM D, YYYY")}
                </div>
                {selectedImage.notes && (
                  <p className="text-gray-700 mb-4">{selectedImage.notes}</p>
                )}
                
                {/* Payment Information in Modal */}
                {selectedImage.paymentRequired && (
                  <div className={cn(
                    "border rounded-lg p-4 space-y-3 mb-4",
                    selectedImage.paymentStatus === 'paid' ? 'bg-green-50 border-green-200' :
                    selectedImage.paymentStatus === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium">
                            Payment Required: ${((selectedImage.paymentAmount || 0) / 100).toFixed(2)}
                          </p>
                          {selectedImage.paymentNotes && (
                            <p className="text-sm text-gray-600 mt-1">{selectedImage.paymentNotes}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          selectedImage.paymentStatus === 'paid' ? 'default' :
                          selectedImage.paymentStatus === 'partial' ? 'secondary' :
                          'outline'
                        }
                        className={cn(
                          "capitalize",
                          selectedImage.paymentStatus === 'paid' && "bg-green-100 text-green-700",
                          selectedImage.paymentStatus === 'partial' && "bg-yellow-100 text-yellow-700"
                        )}
                      >
                        {selectedImage.paymentStatus === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {selectedImage.paymentStatus === 'partial' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {selectedImage.paymentStatus || 'pending'}
                      </Badge>
                    </div>
                    
                    {selectedImage.stripeLink && selectedImage.paymentStatus !== 'paid' && (
                      <Button
                        asChild
                        className="w-full"
                        variant={selectedImage.paymentStatus === 'partial' ? 'default' : 'outline'}
                      >
                        <a href={selectedImage.stripeLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {selectedImage.paymentStatus === 'partial' ? 'Complete Payment' : 'Make Payment'}
                        </a>
                      </Button>
                    )}
                  </div>
                )}
                
                {!selectedImage.publiclyVisible && isAdmin && (
                  <div className="mt-4">
                    <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded">
                      🔒 This update is private
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editingEntry && (
        <EditProgressModal
          entry={editingEntry}
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => {
            setEditingEntry(null);
            // Trigger refresh of data if needed
          }}
        />
      )}
    </div>
  );
} 