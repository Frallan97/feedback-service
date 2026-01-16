// Normalize API responses to ensure consistent data types and default values

// Helper to convert ISO date strings to Date objects
function parseDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

// Normalize Trade data from API
export function normalizeTrade(trade: any): any {
  return {
    ...trade,
    id: String(trade.id), // Convert to string to match frontend types
    entryDate: parseDate(trade.entryDate),
    openedAt: parseDate(trade.entryDate), // Alias for frontend
    closeDate: trade.closeDate ? parseDate(trade.closeDate) : undefined,
    closedAt: trade.closeDate ? parseDate(trade.closeDate) : undefined, // Alias for frontend
    tags: trade.tags || [], // Trades don't have tags in backend, use empty array
    legs: trade.legs || [], // Ensure legs is always an array
    underlyingId: trade.underlyingSymbol, // Map symbol to ID for frontend compatibility
  };
}

// Normalize Underlying data from API
export function normalizeUnderlying(underlying: any): any {
  return {
    ...underlying,
    price: underlying.currentPrice || underlying.price || 0,
    currentPrice: underlying.currentPrice || underlying.price || 0,
    lastUpdated: underlying.lastUpdated ? parseDate(underlying.lastUpdated) : new Date(),
    createdAt: underlying.createdAt ? parseDate(underlying.createdAt) : new Date(),
    numericId: underlying.id, // Preserve numeric ID for backend API calls
    id: underlying.symbol, // Use symbol as ID for frontend compatibility
    dividendYield: underlying.dividendYield || underlying.dividend_yield || 0,
  };
}

// Normalize Alert data from API
export function normalizeAlert(alert: any): any {
  return {
    ...alert,
    id: String(alert.id), // Convert to string to match frontend types
    createdAt: parseDate(alert.createdAt),
    triggeredAt: alert.triggeredAt ? parseDate(alert.triggeredAt) : undefined,
    tradeId: String(alert.tradeId || alert.trade_id || ''), // Convert to string to match frontend types
    underlyingSymbol: alert.underlyingSymbol || alert.underlying_symbol,
  };
}

// Normalize Journal Entry data from API
export function normalizeJournalEntry(entry: any): any {
  return {
    ...entry,
    id: String(entry.id), // Convert to string to match frontend types
    entryDate: parseDate(entry.entryDate || entry.entry_date),
    createdAt: parseDate(entry.createdAt || entry.created_at),
    tradeId: String(entry.tradeId || entry.trade_id || ''), // Convert to string to match frontend types
    note: entry.content || entry.note || '', // Backend uses 'content', frontend expects 'note'
    tags: entry.tags || [],
  };
}

// Normalize Option data from API
export function normalizeOption(option: any): any {
  const underlyingId = option.underlyingId || option.underlying_id;
  return {
    ...option,
    id: String(option.id), // Convert to string to match frontend types
    expiry: parseDate(option.expiryDate || option.expiry_date || option.expiry),
    expiryDate: parseDate(option.expiryDate || option.expiry_date || option.expiry),
    strike: option.strikePrice || option.strike_price || option.strike || 0,
    strikePrice: option.strikePrice || option.strike_price || option.strike || 0,
    type: option.optionType || option.option_type || option.type || 'call',
    optionType: option.optionType || option.option_type || option.type || 'call',
    iv: option.impliedVolatility || option.implied_volatility || option.iv || 0.25,
    impliedVolatility: option.impliedVolatility || option.implied_volatility || option.iv || 0.25,
    underlyingId: String(underlyingId), // Convert to string to match frontend types
    createdAt: option.createdAt ? parseDate(option.createdAt) : new Date(),
  };
}

// Normalize TradeLeg data from API
export function normalizeTradeLeg(leg: any): any {
  return {
    ...leg,
    id: String(leg.id), // Convert to string to match frontend types
    tradeId: String(leg.tradeId || leg.trade_id || ''), // Convert to string to match frontend types
    optionId: String(leg.optionContractId || leg.option_contract_id || leg.optionId || ''), // Convert to string
    side: leg.action || leg.side || 'buy', // Backend uses 'action', frontend uses 'side'
    action: leg.action || leg.side || 'buy',
    premium: leg.entryPrice || leg.premium || 0,
    entryPrice: leg.entryPrice || leg.premium || 0,
    option: leg.option ? normalizeOption(leg.option) : undefined,
    createdAt: leg.createdAt ? parseDate(leg.createdAt) : new Date(),
  };
}

// Normalize full trade with legs
export function normalizeTradeWithLegs(trade: any): any {
  const normalized = normalizeTrade(trade);
  if (normalized.legs && Array.isArray(normalized.legs)) {
    normalized.legs = normalized.legs.map(normalizeTradeLeg);
  }
  return normalized;
}
