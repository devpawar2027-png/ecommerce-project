export const PLACEHOLDER_IMAGE = 
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="%23f1f5f9" width="300" height="300"/><text fill="%2394a3b8" font-family="sans-serif" font-size="14" dy="5" font-weight="600" x="50%" y="50%" text-anchor="middle">Image Unavailable</text></svg>';

export function onImageError(event: Event, fallbackUrl = PLACEHOLDER_IMAGE): void {
  const target = event.target as HTMLImageElement | null;
  if (target && target.src !== fallbackUrl) {
    target.onerror = null; // Prevent infinite fallback loop
    target.src = fallbackUrl;
    target.classList.add('img-fallback');
  }
}
