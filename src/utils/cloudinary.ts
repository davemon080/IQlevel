export type CloudinaryImageKind = 'profile' | 'post' | 'cover' | 'generic';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

function getTransformForKind(kind: CloudinaryImageKind): string {
  switch (kind) {
    case 'profile':
      return 'f_auto,q_70,w_300,h_300,c_fill,g_auto';
    case 'post':
      return 'f_auto,q_70,w_800,c_limit';
    case 'cover':
      return 'f_auto,q_70,w_1200,c_limit';
    default:
      return 'f_auto,q_70';
  }
}

function normalizeCloudinaryFolder(folder?: string): string {
  return (folder || 'app').replace(/^\/+|\/+$/g, '');
}

export function hasCloudinaryConfig(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

export function isCloudinaryUrl(url: string): boolean {
  return /^https?:\/\/res\.cloudinary\.com\//i.test(url);
}

function applyTransformToCloudinaryUploadUrl(url: string, transform: string): string {
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  const tail = url.slice(idx + marker.length);
  const slash = tail.indexOf('/');
  if (slash === -1) return `${prefix}${transform}/${tail}`;

  const firstSegment = tail.slice(0, slash);
  const rest = tail.slice(slash + 1);

  if (
    firstSegment.startsWith('v') &&
    firstSegment.length > 1 &&
    /^\d+$/.test(firstSegment.slice(1))
  ) {
    return `${prefix}${transform}/${tail}`;
  }

  if (
    firstSegment.includes(',') ||
    /^(f_|q_|w_|h_|c_|g_|ar_|dpr_)/.test(firstSegment)
  ) {
    return `${prefix}${transform}/${rest}`;
  }

  return `${prefix}${transform}/${tail}`;
}

export function toCloudinaryCdnUrl(
  url: string | undefined | null,
  kind: CloudinaryImageKind = 'generic'
): string | undefined {
  if (!url) return undefined;
  if (!hasCloudinaryConfig()) return url;

  const transform = getTransformForKind(kind);
  if (isCloudinaryUrl(url)) {
    return applyTransformToCloudinaryUploadUrl(url, transform);
  }

  if (/^https?:\/\//i.test(url) && CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transform}/${encodeURIComponent(url)}`;
  }

  return url;
}

export async function uploadImageToCloudinary(
  file: File,
  options?: { folder?: string; kind?: CloudinaryImageKind }
): Promise<string> {
  if (!hasCloudinaryConfig() || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured.');
  }

  const kind = options?.kind || 'generic';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', normalizeCloudinaryFolder(options?.folder));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const result = await response.json() as { public_id?: string; secure_url?: string };
  if (result.public_id) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${getTransformForKind(kind)}/${result.public_id}`;
  }

  return toCloudinaryCdnUrl(result.secure_url, kind) || '';
}

export function inferImageKindFromFolder(folder: string): CloudinaryImageKind {
  const normalized = (folder || '').toLowerCase();
  if (normalized.includes('profile/avatar')) return 'profile';
  if (normalized.includes('profile/cover')) return 'cover';
  if (normalized.includes('post')) return 'post';
  return 'generic';
}
