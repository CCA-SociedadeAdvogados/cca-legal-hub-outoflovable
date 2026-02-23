import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageCropModal } from './ImageCropModal';

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  onUrlChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  shape?: 'circle' | 'square';
  size?: 'sm' | 'md' | 'lg';
  enableCrop?: boolean;
  maxDimension?: number;
}

export function ImageUploader({
  currentImageUrl,
  onUpload,
  onUrlChange,
  placeholder = 'Upload',
  className,
  shape = 'circle',
  size = 'md',
  enableCrop = true,
  maxDimension = 512,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentImageUrl;

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 10MB before processing)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    // Create object URL for crop modal
    const objectUrl = URL.createObjectURL(file);
    
    if (enableCrop) {
      // Open crop modal
      setSelectedImageSrc(objectUrl);
      setCropModalOpen(true);
    } else {
      // Direct upload without crop (fallback for auto-crop)
      setIsUploading(true);
      try {
        const url = await onUpload(file);
        setPreviewUrl(objectUrl);
        onUrlChange(url);
      } catch (error) {
        console.error('Image upload failed:', error);
        URL.revokeObjectURL(objectUrl);
      } finally {
        setIsUploading(false);
      }
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    // Clean up old selected image
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }

    // Create preview from cropped image
    const objectUrl = URL.createObjectURL(croppedFile);
    setPreviewUrl(objectUrl);

    // Upload the cropped file
    setIsUploading(true);
    try {
      const url = await onUpload(croppedFile);
      onUrlChange(url);
    } catch (error) {
      console.error('Image upload failed:', error);
      setPreviewUrl(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropModalClose = (open: boolean) => {
    setCropModalOpen(open);
    if (!open && selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onUrlChange('');
  };

  const isLoading = isUploading;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative">
        {shape === 'circle' ? (
          <Avatar className={cn(sizeClasses[size], 'border-2 border-dashed border-muted-foreground/30')}>
            <AvatarImage src={displayUrl || undefined} />
            <AvatarFallback className="bg-muted">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              sizeClasses[size],
              'flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted overflow-hidden'
            )}
          >
            {displayUrl ? (
              <img src={displayUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}

        {displayUrl && !isLoading && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isLoading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            A carregar...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {placeholder}
          </>
        )}
      </Button>

      {/* Crop Modal */}
      {selectedImageSrc && (
        <ImageCropModal
          open={cropModalOpen}
          onOpenChange={handleCropModalClose}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          shape={shape === 'circle' ? 'round' : 'rect'}
          aspect={1}
          maxDimension={maxDimension}
        />
      )}
    </div>
  );
}
