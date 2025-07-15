import React, { useRef } from 'react';
import { Button } from './ui/button';
import { Paperclip, Image, X, Loader2 } from 'lucide-react';

interface MobileFileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  isUploading: boolean;
  accept?: string;
  maxSize?: number;
  buttonText?: string;
  icon?: React.ReactNode;
}

export function MobileFileUpload({
  onFileSelect,
  selectedFile,
  onClearFile,
  isUploading,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  buttonText = "Attach File",
  icon = <Paperclip className="h-4 w-4" />
}: MobileFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    // On mobile devices, this ensures the native file picker opens
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
        </div>
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFile}
            className="p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        // Mobile-specific attributes
        capture={accept?.includes('image') ? 'environment' : undefined}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="gap-1"
      >
        {icon}
        <span className="hidden sm:inline">{buttonText}</span>
      </Button>
    </>
  );
} 