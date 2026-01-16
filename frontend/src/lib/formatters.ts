// Formatting utilities for the trading cockpit

export function formatCurrency(value: number, currency: string = 'SEK'): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(decimals)}%`;
}

export function formatPnL(value: number, currency: string = 'SEK'): string {
  const formatted = formatCurrency(Math.abs(value), currency);
  return value >= 0 ? `+${formatted}` : `-${formatted.replace('-', '')}`;
}

export function formatGreek(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(decimals);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatStrike(strike: number): string {
  return strike.toFixed(strike % 1 === 0 ? 0 : 2);
}

export function formatIV(iv: number): string {
  return `${(iv * 100).toFixed(1)}%`;
}

export function getPnLColor(value: number): 'profit' | 'loss' | 'neutral' {
  if (value > 0) return 'profit';
  if (value < 0) return 'loss';
  return 'neutral';
}

export function getOptionLabel(type: 'call' | 'put', strike: number, expiry: Date): string {
  return `${formatDateShort(expiry)} ${formatStrike(strike)} ${type.toUpperCase()}`;
}
