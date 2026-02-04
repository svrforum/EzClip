/**
 * Format a duration in seconds to a human-readable time string.
 * @param seconds - Duration in seconds
 * @returns Formatted time string (e.g., "1:05")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format a file size in bytes to a human-readable string.
 * @param bytes - File size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format a bitrate in bits per second to a human-readable string.
 * @param bps - Bitrate in bits per second
 * @returns Formatted bitrate string (e.g., "1.5 Mbps")
 */
export function formatBitrate(bps: number): string {
  if (bps < 1000) return `${bps} bps`
  if (bps < 1000000) return `${(bps / 1000).toFixed(1)} Kbps`
  return `${(bps / 1000000).toFixed(1)} Mbps`
}

/**
 * Format dimensions as a string.
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Formatted dimension string (e.g., "1920 × 1080")
 */
export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height}`
}
