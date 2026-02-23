export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropImageOptions {
  maxDimension?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Creates an image element from a source URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

/**
 * Extracts the cropped area from an image and returns it as a File
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  options: CropImageOptions = {}
): Promise<File> {
  const {
    maxDimension = 512,
    quality = 0.85,
    outputFormat = 'image/webp',
  } = options;

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Calculate final size (maintain aspect ratio but limit to maxDimension)
  const cropSize = Math.max(pixelCrop.width, pixelCrop.height);
  const scale = cropSize > maxDimension ? maxDimension / cropSize : 1;
  
  const finalWidth = Math.round(pixelCrop.width * scale);
  const finalHeight = Math.round(pixelCrop.height * scale);

  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    finalWidth,
    finalHeight
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }

        // Determine file extension based on format
        const extension = outputFormat === 'image/webp' ? 'webp' : 
                         outputFormat === 'image/jpeg' ? 'jpg' : 'png';
        
        const file = new File([blob], `cropped-image.${extension}`, {
          type: outputFormat,
          lastModified: Date.now(),
        });

        resolve(file);
      },
      outputFormat,
      quality
    );
  });
}
