// API base URL — all requests go through the shared proxy at /api
export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

/**
 * Resolve an image URL for use on mobile.
 * Images uploaded via the admin are stored as relative paths like /api/storage/objects/...
 * React Native needs an absolute URL, so we prepend the domain when the path starts with /.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}${url}`;
  }
  return url;
}
