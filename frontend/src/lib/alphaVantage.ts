// Alpha Vantage API integration for stock market data
// Documentation: https://www.alphavantage.co/documentation/

const API_KEY = '1WUIKON767RJNX6K';
const BASE_URL = 'https://www.alphavantage.co/query';

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
}

export interface GlobalQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: string;
  previousClose: number;
}

/**
 * Search for stock symbols matching keywords
 */
export async function searchSymbol(keywords: string): Promise<SymbolSearchResult[]> {
  try {
    const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      throw new Error('API call frequency limit reached. Please try again later.');
    }

    const matches = data['bestMatches'] || [];
    return matches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
    }));
  } catch (error) {
    console.error('Error searching symbols:', error);
    throw error;
  }
}

/**
 * Get current stock quote (price and other data)
 */
export async function getGlobalQuote(symbol: string): Promise<GlobalQuote | null> {
  try {
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      throw new Error('API call frequency limit reached. Please try again later.');
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      return null;
    }

    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      volume: parseInt(quote['06. volume']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'],
      previousClose: parseFloat(quote['08. previous close']),
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Map Swedish stock symbols to Alpha Vantage symbols
 * Swedish stocks may need different symbol formats (e.g., ERIC.ST for Stockholm exchange)
 */
export function mapSwedishSymbolToAlphaVantage(symbol: string): string {
  const symbolMap: Record<string, string> = {
    'ERIC B': 'ERIC', // Ericsson - using US listing
    'ERIC': 'ERIC',
    'VOLV B': 'VOLVY', // Volvo - ADR
    'VOLV': 'VOLVY',
    'ABB': 'ABB', // ABB Ltd
    'ATCO A': 'ATCO-A.ST', // May need .ST suffix for Stockholm exchange
    'ATCO': 'ATCO-A.ST',
    'OMXS30': '^OMX', // OMX Stockholm 30 index
    'HEXA B': 'HEXA-B.ST',
    'HEXA': 'HEXA-B.ST',
  };

  return symbolMap[symbol] || symbol;
}

/**
 * Fetch price for a symbol (handles Swedish symbol mapping)
 */
export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const alphaVantageSymbol = mapSwedishSymbolToAlphaVantage(symbol);
    const quote = await getGlobalQuote(alphaVantageSymbol);
    return quote?.price ?? null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

