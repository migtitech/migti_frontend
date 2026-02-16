/**
 * Resolve the best URL for displaying an image.
 * Prefer signed_url when present (for private S3 buckets); fallback to imageUrl.
 * API returns { imageUrl, s3Key, signedUrl } - signedUrl is used for private buckets.
 *
 * @param {string|{ imageUrl?: string, signedUrl?: string }} img
 * @returns {string|null}
 */
export const getImageDisplayUrl = (img) => {
  if (!img) return null
  if (typeof img === 'string') return img
  return img.signedUrl || img.imageUrl || null
}
