import { format, parseISO } from "date-fns";

export function formatDateTime(isoString: string): string {
  try {
    return format(parseISO(isoString), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "Invalid Date";
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

// Convert ISO string to YYYY-MM-DDThh:mm for datetime-local inputs
export function toDateTimeInput(isoString: string): string {
  if (!isoString) return "";
  try {
    return new Date(isoString).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}
