/**
 * Format a date string or Date object to a localized string
 * Safely handles invalid or undefined dates by returning a fallback value
 * @param dateString The date to format
 * @param includeTime If true, includes time in the format
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | Date | null | undefined, 
  includeTime: boolean = false
): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (includeTime) {
      return date.toLocaleString();
    }
    return date.toLocaleDateString();
  } catch (e) {
    return "Invalid date";
  }
} 