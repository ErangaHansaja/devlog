/**
 * Generates a short, collision-safe ID for single-user local storage.
 * Format: base36 timestamp + random suffix (e.g. "lz4k7m3x_a1b2c3")
 */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Checks whether the given ISO date string falls on today's calendar date.
 * Uses local timezone comparison via toDateString().
 */
export function isToday(dateStr: string): boolean {
  const input = new Date(dateStr);
  const now = new Date();
  return input.toDateString() === now.toDateString();
}

/**
 * Formats an ISO date string into a short locale-aware display string.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns a human-readable relative time string (e.g. "2 hours ago", "yesterday").
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  return formatDate(dateStr);
}

/**
 * Truncates text to a maximum length, appending "..." if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
