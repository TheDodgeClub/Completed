// API base URL — all requests go through the shared proxy at /api
export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "the-dodge-club.replit.app"}/api`;

/**
 * Resolve an image URL for use on mobile.
 * Admin-uploaded images are stored as /api/storage/objects/...
 * Mobile-uploaded images come back from the presigned URL route as /objects/...
 * React Native needs an absolute URL, so we prepend the domain (and fix the path prefix).
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) {
    // /objects/... paths need the /api/storage prefix to reach the serving endpoint
    const path = url.startsWith("/objects/") ? `/api/storage${url}` : url;
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}${path}`;
  }
  return url;
}
