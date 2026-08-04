/**
 * Prepares a picked file for upload: downscaled, re-encoded, and handed back as
 * a Blob ready to be posted as binary multipart.
 *
 * Nothing here produces base64. The file used to be read into a data URI and
 * posted as a JSON field, which cost a third more bytes on the wire for the
 * encoding alone; the canvas gives us a Blob directly, and that Blob is what
 * goes to the server and on to Cloudinary.
 *
 * Two other things fall out of re-encoding rather than uploading the original:
 * the EXIF block goes, which on a phone photo says where it was taken, and the
 * 4-8 MP a modern camera produces is cut down to something a recipe page can
 * actually use. A photo is never drawn larger than a card or a detail header.
 */

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Refuse absurd source files up front rather than spending seconds decoding a
// 60 MP photo only to throw the result away.
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

// The longest edge we keep. The detail view draws a photo at most ~30rem tall
// across a content column, so 1280 still has pixels in hand on a 2x display,
// and Cloudinary's delivery transform never asks for more than 1600.
const MAX_EDGE = 1280;

// What the encoder aims for. A target, not a limit: an image that will not
// compress this far is kept at the best quality that fits MAX_ENCODED_BYTES
// rather than being ground down to meet a number.
const TARGET_BYTES = 300 * 1024;

// The hard ceiling. Must stay at or below the backend's MAX_IMAGE_BYTES
// (Backend/utils/imageData.js), which multer also enforces on the way in.
const MAX_ENCODED_BYTES = 1024 * 1024;

// Only reached by an image that will not meet the target at full size.
const EDGE_STEPS = [MAX_EDGE, 1024, 800];

// WebP's quality scale is not JPEG's: 0.8 here is roughly JPEG 0.9 to the eye
// at about two thirds the bytes, which is the single biggest saving available.
const QUALITY = {
  'image/webp': { max: 0.8, min: 0.45 },
  'image/jpeg': { max: 0.85, min: 0.5 },
};

// Each step halves the remaining quality range, so five gets within ~1% of the
// best quality that fits. Every step is one encode, hence not more.
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

// Safari only learned to encode WebP in 14, and canvas silently falls back to
// PNG rather than failing, so the result has to be inspected rather than
// trusted. Asked once and remembered — it cannot change mid-session.
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
    // An object URL rather than a FileReader data URI: the browser decodes
    // straight from the file instead of building a base64 copy of it first.
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

/**
 * Scale down to fit `maxEdge`, halving on the way.
 *
 * One 4000px-to-1280px drawImage samples a fraction of the source pixels and
 * leaves stair-stepped edges — which then cost bytes to encode, because sharp
 * noise is exactly what a lossy codec spends bits on. Halving repeatedly
 * averages every pixel in, so the result is both cleaner and smaller.
 */
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

/** JPEG has no alpha, so a transparent PNG would otherwise come out on black. */
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

/**
 * The highest quality whose encoded size fits `budget`, found by bisection.
 *
 * Measured on the Blob itself, so the numbers are the real encoded bytes rather
 * than an estimate off a base64 string. Most photos never get past the first
 * line — at 1280px, WebP 0.8 is usually already inside the budget.
 */
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

  // A GIF goes up exactly as it is: re-encoding one through a canvas would
  // flatten it to its first frame, and losing the animation is a worse outcome
  // than sending a few more kilobytes.
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

    // Over target even at the lowest quality this size allows. A smaller
    // picture encoded well beats a bigger one encoded badly, so try the next
    // size down before settling.
    smallest = canvas;
  }

  // Nothing hit the target at any size — fine texture and noise do this. Give
  // the smallest rendering the best quality that still fits the hard ceiling,
  // rather than degrading it further to meet a number that was only a target.
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
