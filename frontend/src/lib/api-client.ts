// API Client for Nordic Options Hub Backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api/v1';
const STORAGE_KEY = 'nordic_options_access_token';

// Helper to get access token
function getAccessToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

// Helper function for making API requests
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid - trigger logout
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    const error = await response.text();
    console.error(`API Error for ${url}:`, response.status, error);
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  getCurrentUser: () => apiRequest<{
    id: string;
    email: string;
    name: string;
  }>('/auth/me'),
};

// Underlyings API
export const underlyingsApi = {
  getAll: () => apiRequest<any[]>('/underlyings'),

  getBySymbol: (symbol: string) => apiRequest<any>(`/underlyings/${symbol}`),

  updatePrice: (symbol: string, price: number) =>
    apiRequest<any>(`/underlyings/${symbol}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ price }),
    }),
};

// Options API
export const optionsApi = {
  getAll: (params?: { underlying?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.underlying) searchParams.append('underlying', params.underlying);
    if (params?.type) searchParams.append('type', params.type);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<any[]>(`/options${query}`);
  },

  getById: (id: number) => apiRequest<any>(`/options/${id}`),

  create: (data: any) =>
    apiRequest<{ id: number }>('/options', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getGreeks: (id: number) => apiRequest<any>(`/options/${id}/greeks`),
};

// Trades API
export const tradesApi = {
  getAll: (status?: 'open' | 'closed') => {
    const query = status ? `?status=${status}` : '';
    return apiRequest<any[]>(`/trades${query}`);
  },

  getById: (id: number) => apiRequest<any>(`/trades/${id}`),

  create: (data: {
    strategy: string;
    underlyingSymbol: string;
    entryDate: string;
    initialCost: number;
    notes?: string;
    legs: Array<{
      optionContractId: number;
      action: 'buy' | 'sell';
      quantity: number;
      entryPrice: number;
    }>;
  }) =>
    apiRequest<{ id: number }>('/trades', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { notes?: string; status?: string }) =>
    apiRequest<any>(`/trades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  close: (id: number) =>
    apiRequest<any>(`/trades/${id}/close`, {
      method: 'POST',
    }),

  delete: (id: number) =>
    apiRequest<any>(`/trades/${id}`, {
      method: 'DELETE',
    }),

  addLeg: (id: number, data: {
    underlyingId: number;
    optionType: 'call' | 'put';
    strikePrice: number;
    expiryDate: string;
    impliedVolatility: number;
    action: 'buy' | 'sell';
    quantity: number;
    entryPrice: number;
  }) =>
    apiRequest<{ id: number }>(`/trades/${id}/legs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Stocks API (market data)
export const stocksApi = {
  getAll: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiRequest<any[]>(`/stocks${query}`);
  },

  getOptions: (symbol: string, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiRequest<any[]>(`/stocks/${symbol}/options${query}`);
  },
};

// Portfolio API
export const portfolioApi = {
  getSummary: () => apiRequest<{
    totalValue: number;
    totalCost: number;
    profitLoss: number;
    openTrades: number;
    netDelta: number;
    netGamma: number;
    netTheta: number;
    netVega: number;
  }>('/portfolio/summary'),

  getPositions: () => apiRequest<Array<{
    tradeId: number;
    strategy: string;
    underlyingSymbol: string;
    currentPrice: number;
    entryDate: string;
    initialCost: number;
    currentValue: number;
    profitLoss: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    daysToExpiry: number;
  }>>('/portfolio/positions'),
};

// Alerts API
export const alertsApi = {
  getAll: () => apiRequest<any[]>('/alerts'),

  create: (data: {
    alertType: string;
    underlyingSymbol?: string;
    thresholdValue?: number;
  }) =>
    apiRequest<{ id: number }>('/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { isActive?: boolean; thresholdValue?: number }) =>
    apiRequest<any>(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<any>(`/alerts/${id}`, {
      method: 'DELETE',
    }),
};

// Journal API
export const journalApi = {
  getAll: (tradeId?: number) => {
    const query = tradeId ? `?trade_id=${tradeId}` : '';
    return apiRequest<any[]>(`/journal${query}`);
  },

  getById: (id: number) => apiRequest<any>(`/journal/${id}`),

  create: (data: {
    tradeId?: number;
    title?: string;
    content: string;
    tags?: string[];
  }) =>
    apiRequest<{ id: number }>('/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: {
    title?: string;
    content?: string;
    tags?: string[];
  }) =>
    apiRequest<any>(`/journal/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<any>(`/journal/${id}`, {
      method: 'DELETE',
    }),
};

// Export all APIs
export const api = {
  underlyings: underlyingsApi,
  options: optionsApi,
  trades: tradesApi,
  stocks: stocksApi,
  portfolio: portfolioApi,
  alerts: alertsApi,
  journal: journalApi,
};
