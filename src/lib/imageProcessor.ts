export interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
  cropToSquare?: boolean;
}

const defaultOptions: ProcessImageOptions = {
  maxDimension: 512,
  quality: 0.85,
  outputFormat: 'image/webp',
  cropToSquare: true,
};

/**
 * Process an image file: crop to square (center), resize, and compress
 * Uses Canvas API for client-side processing
 */
export async function processImage(
  file: File,
  options: ProcessImageOptions = {}
): Promise<File> {
  const opts = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        // Crop to square (center crop)
        if (opts.cropToSquare) {
          const minDimension = Math.min(img.width, img.height);
          sourceX = (img.width - minDimension) / 2;
          sourceY = (img.height - minDimension) / 2;
          sourceWidth = minDimension;
          sourceHeight = minDimension;
        }

        // Calculate output dimensions
        let outputWidth = sourceWidth;
        let outputHeight = sourceHeight;

        if (opts.maxDimension && (sourceWidth > opts.maxDimension || sourceHeight > opts.maxDimension)) {
          const scale = opts.maxDimension / Math.max(sourceWidth, sourceHeight);
          outputWidth = Math.round(sourceWidth * scale);
          outputHeight = Math.round(sourceHeight * scale);
        }

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the cropped and resized image
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          outputWidth,
          outputHeight
        );

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not create blob from canvas'));
              return;
            }

            // Determine file extension based on output format
            const extension = opts.outputFormat === 'image/webp' 
              ? 'webp' 
              : opts.outputFormat === 'image/png' 
                ? 'png' 
                : 'jpg';

            // Create new file with processed image
            const processedFile = new File(
              [blob],
              `processed-${Date.now()}.${extension}`,
              { type: opts.outputFormat }
            );

            resolve(processedFile);
          },
          opts.outputFormat,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Create a preview URL from a processed image
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}
