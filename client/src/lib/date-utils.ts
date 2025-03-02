/**
 * Format a date string or Date object to a localized string
 * Safely handles invalid or undefined dates by returning a fallback value
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return "Invalid date";
  }
} 