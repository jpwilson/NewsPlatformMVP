/**
 * Format a date string or Date object to a localized string
 * Safely handles invalid or undefined dates by returning a fallback value
 * @param dateString The date to format
 * @param includeTime If true, includes time in the format
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | Date | null | undefined, 
  includeTime: boolean = false,
  useFriendlyFormat: boolean = true
): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    
    if (useFriendlyFormat) {
      // Format like "Tue, 5 Mar 25"
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      
      if (includeTime) {
        const time = date.toLocaleTimeString('en-US', { 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true 
        });
        return `${weekday}, ${day} ${month} ${year} at ${time}`;
      }
      
      return `${weekday}, ${day} ${month} ${year}`;
    }
    
    // Traditional format
    if (includeTime) {
      return date.toLocaleString();
    }
    return date.toLocaleDateString();
  } catch (e) {
    return "Invalid date";
  }
} 