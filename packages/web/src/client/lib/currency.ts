/**
 * Currency formatting utilities for Thai Baht (THB)
 */

/**
 * Format a number as Thai Baht currency
 * @param amount - The amount to format
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted currency string (e.g., "฿1,234.56")
 *
 * @example
 * formatTHB(1234.56) // "฿1,234.56"
 * formatTHB(50) // "฿50.00"
 * formatTHB(1234, { minimumFractionDigits: 0 }) // "฿1,234"
 */
export function formatTHB(
  amount: number,
  options?: Partial<Intl.NumberFormatOptions>,
): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Format a number as Thai Baht currency with compact notation
 * Useful for displaying large amounts (e.g., "฿1.2K", "฿3.5M")
 * @param amount - The amount to format
 * @returns Compactly formatted currency string
 *
 * @example
 * formatTHBCompact(1234) // "฿1.2K"
 * formatTHBCompact(1234567) // "฿1.2M"
 * formatTHBCompact(50) // "฿50"
 */
export function formatTHBCompact(amount: number): string {
  // Don't use compact notation for small amounts
  if (amount < 1000) {
    return formatTHB(amount, { minimumFractionDigits: 0 });
  }

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Parse a Thai Baht currency string to a number
 * @param value - The currency string to parse (e.g., "฿1,234.56" or "1234.56")
 * @returns The numeric value, or null if parsing fails
 *
 * @example
 * parseTHB("฿1,234.56") // 1234.56
 * parseTHB("1234.56") // 1234.56
 * parseTHB("invalid") // null
 */
export function parseTHB(value: string): number | null {
  // Remove currency symbol, spaces, and commas
  const cleaned = value.replace(/[฿\s,]/g, "");

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a number range as Thai Baht currency
 * @param min - Minimum amount
 * @param max - Maximum amount
 * @returns Formatted range string (e.g., "฿50 - ฿100")
 *
 * @example
 * formatTHBRange(50, 100) // "฿50 - ฿100"
 */
export function formatTHBRange(min: number, max: number): string {
  const formattedMin = formatTHB(min, { minimumFractionDigits: 0 });
  const formattedMax = formatTHB(max, { minimumFractionDigits: 0 });
  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Get currency symbol for Thai Baht
 */
export const THB_SYMBOL = "฿";
