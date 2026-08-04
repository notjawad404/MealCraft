/**
 * Prepares a picked file for upload: downscaled, re-encoded, and returned as a
 * Blob. See docs/FRONTEND.md.
 */

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

// The longest edge kept.
const MAX_EDGE = 1280;

// What the encoder aims for; MAX_ENCODED_BYTES is the hard ceiling.
const TARGET_BYTES = 300 * 1024;

// Must stay at or below the backend's MAX_IMAGE_BYTES.
const MAX_ENCODED_BYTES = 1024 * 1024;

// Only reached by an image that will not meet the target at full size.
const EDGE_STEPS = [MAX_EDGE, 1024, 800];

const QUALITY = {
  'image/webp': { max: 0.8, min: 0.45 },
  'image/jpeg': { max: 0.85, min: 0.5 },
};

const QUALITY_SEARCH_STEPS = 5;

export class ImageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageError';
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Probed rather than assumed: canvas falls back to PNG instead of failing.
let webpSupport = null;
function encodeFormat() {
  if (webpSupport === null) {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    webpSupport = probe.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupport ? 'image/webp' : 'image/jpeg';
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError('That file is not an image we can read.'));
    };
    img.src = url;
  });
}

function newCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

/** Scale down to fit `maxEdge`, halving on the way. */
function downscale(img, maxEdge) {
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(1, maxEdge / longest);
  const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
  const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

  let { canvas, ctx } = newCanvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);

  while (canvas.width > targetW * 2) {
    const step = newCanvas(Math.max(targetW, canvas.width / 2), Math.max(targetH, canvas.height / 2));
    step.ctx.drawImage(canvas, 0, 0, step.canvas.width, step.canvas.height);
    canvas = step.canvas;
  }

  if (canvas.width === targetW && canvas.height === targetH) return canvas;

  const final = newCanvas(targetW, targetH);
  final.ctx.drawImage(canvas, 0, 0, targetW, targetH);
  return final.canvas;
}

/** Flatten onto white, since JPEG has no alpha channel. */
function flatten(source) {
  const { canvas, ctx } = newCanvas(source.width, source.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageError('That image could not be compressed.'))),
      type,
      quality,
    );
  });
}

/** The highest quality whose encoded size fits `budget`, found by bisection. */
async function encodeWithinBudget(canvas, type, budget) {
  const { max, min } = QUALITY[type];

  const best = await canvasToBlob(canvas, type, max);
  if (best.size <= budget) return { blob: best, quality: max };

  const floor = await canvasToBlob(canvas, type, min);
  if (floor.size > budget) return { blob: floor, quality: min, overBudget: true };

  let fits = floor;
  let fitsQuality = min;
  let low = min;
  let high = max;

  for (let step = 0; step < QUALITY_SEARCH_STEPS; step++) {
    const mid = (low + high) / 2;
    const candidate = await canvasToBlob(canvas, type, mid);
    if (candidate.size <= budget) {
      fits = candidate;
      fitsQuality = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return { blob: fits, quality: fitsQuality };
}

/**
 * @param {File} file
 * @returns {Promise<{ blob: Blob, width: number, height: number, bytes: number,
 *                     format: string, originalBytes: number }>}
 * @throws {ImageError} with a message meant to be shown to the user as-is
 */
export async function optimizeImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageError('Use a JPEG, PNG, WebP or GIF image.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageError(
      `That image is ${formatBytes(file.size)} — pick one under ${formatBytes(MAX_SOURCE_BYTES)}.`,
    );
  }

  const img = await loadImage(file);

  // Sent as-is: a canvas re-encode would flatten it to its first frame.
  if (file.type === 'image/gif') {
    if (file.size > MAX_ENCODED_BYTES) {
      throw new ImageError(
        `That GIF is ${formatBytes(file.size)}. GIFs cannot be compressed here — use one under ${formatBytes(MAX_ENCODED_BYTES)}.`,
      );
    }
    return {
      blob: file,
      width: img.naturalWidth,
      height: img.naturalHeight,
      bytes: file.size,
      format: 'image/gif',
      originalBytes: file.size,
    };
  }

  const type = encodeFormat();
  const opaque = type === 'image/jpeg';

  let smallest = null;

  for (const edge of EDGE_STEPS) {
    const scaled = downscale(img, edge);
    const canvas = opaque ? flatten(scaled) : scaled;
    const { blob } = await encodeWithinBudget(canvas, type, TARGET_BYTES);

    if (blob.size <= TARGET_BYTES) {
      return {
        blob,
        width: canvas.width,
        height: canvas.height,
        bytes: blob.size,
        format: type,
        originalBytes: file.size,
      };
    }

    // Over target even at this size's lowest quality; try the next size down.
    smallest = canvas;
  }

  // Nothing hit the target, so settle for the hard ceiling.
  const { blob } = await encodeWithinBudget(smallest, type, MAX_ENCODED_BYTES);
  if (blob.size > MAX_ENCODED_BYTES) {
    throw new ImageError('That image will not compress small enough. Try a different one.');
  }

  return {
    blob,
    width: smallest.width,
    height: smallest.height,
    bytes: blob.size,
    format: type,
    originalBytes: file.size,
  };
}
