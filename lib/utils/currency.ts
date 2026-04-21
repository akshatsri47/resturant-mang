/**
 * Format cents to currency string
 * All prices stored as integer cents to avoid floating point errors
 */
export function formatCurrency(cents: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function decimalToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function calculateSubtotal(items: { unit_price_cents: number; quantity: number; is_voided?: boolean }[]): number {
  return items.reduce((sum, item) => {
    if (item.is_voided) return sum;
    return sum + item.unit_price_cents * item.quantity;
  }, 0);
}

export function calculateTax(subtotalCents: number, taxRate: number): number {
  return Math.round(subtotalCents * (taxRate / 100));
}

export function calculateTotal(subtotalCents: number, taxCents: number, discountCents: number): number {
  return Math.max(0, subtotalCents + taxCents - discountCents);
}
