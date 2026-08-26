// Cookbook prices are plain currency units; order amounts are minor units.
export function formatPrice(amount, currency = 'usd') {
  const value = Number(amount) || 0;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export const formatCents = (amount, currency = 'usd') =>
  formatPrice((Number(amount) || 0) / 100, currency);

export function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
