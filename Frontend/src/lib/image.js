/**
 * Turns a picked file into a base64 data URI small enough to store on the
 * recipe document itself. Everything happens in the browser — there is no
 * upload endpoint, so whatever comes out of here is what lands in MongoDB.
 */

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Refuse absurd source files up front rather than spending seconds decoding a
// 60 MP photo only to throw the result away.
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

// Must stay at or below the backend's MAX_IMAGE_BYTES (Backend/utils/imageData.js).
const MAX_ENCODED_BYTES = 2 * 1024 * 1024;

// Tried in order until the encoded result fits the budget. A recipe photo is
// never shown larger than a card or a detail header, so 1280px is generous.
const EDGE_STEPS = [1280, 960, 720];
const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.5];

// Listings send the thumbnail rather than the full image, so twenty of these
// have to be cheap. At 400px a card never has to upscale.
const THUMBNAIL_EDGE = 400;
const THUMBNAIL_QUALITY_STEPS = [0.7, 0.6, 0.5, 0.4];
const MAX_THUMBNAIL_BYTES = 192 * 1024; // matches the backend

export class ImageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageError';
  }
}

/** Decoded byte count of a data URI, without actually decoding it. */
export function encodedBytes(dataUrl) {
  const payload = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ImageError('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageError('That file is not an image we can read.'));
    img.src = dataUrl;
  });
}

function drawScaled(img, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const ctx = canvas.getContext('2d');
  // Transparent PNGs would otherwise come out of the JPEG encoder on black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The small copy that listings show. An animated GIF becomes its first frame. */
function makeThumbnail(img) {
  const canvas = drawScaled(img, THUMBNAIL_EDGE);
  for (const quality of THUMBNAIL_QUALITY_STEPS) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (encodedBytes(dataUrl) <= MAX_THUMBNAIL_BYTES) return dataUrl;
  }
  // 400px of anything at quality 0.4 fits comfortably; if it somehow does not,
  // the listing falls back to a placeholder rather than failing the save.
  return '';
}

/**
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, thumbnail: string, bytes: number, width: number, height: number }>}
 * @throws {ImageError} with a message meant to be shown to the user as-is
 */
export async function fileToDataUrl(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageError('Use a JPEG, PNG, WebP or GIF image.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageError(
      `That image is ${formatBytes(file.size)} — pick one under ${formatBytes(MAX_SOURCE_BYTES)}.`,
    );
  }

  const original = await readAsDataUrl(file);

  // A GIF is left exactly as it is when it already fits: re-encoding one
  // through a canvas would flatten it to its first frame.
  if (file.type === 'image/gif') {
    const bytes = encodedBytes(original);
    if (bytes <= MAX_ENCODED_BYTES) {
      const img = await loadImage(original);
      return {
        dataUrl: original,
        thumbnail: makeThumbnail(img),
        bytes,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }
    throw new ImageError(
      `That GIF is ${formatBytes(bytes)}. GIFs cannot be compressed here — use one under ${formatBytes(MAX_ENCODED_BYTES)}.`,
    );
  }

  const img = await loadImage(original);

  // Re-encoding rather than storing the original also drops EXIF metadata,
  // which on a phone photo includes where it was taken.
  for (const edge of EDGE_STEPS) {
    const canvas = drawScaled(img, edge);
    for (const quality of QUALITY_STEPS) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const bytes = encodedBytes(dataUrl);
      if (bytes <= MAX_ENCODED_BYTES) {
        return {
          dataUrl,
          thumbnail: makeThumbnail(img),
          bytes,
          width: canvas.width,
          height: canvas.height,
        };
      }
    }
  }

  throw new ImageError('That image will not compress small enough. Try a different one.');
}
