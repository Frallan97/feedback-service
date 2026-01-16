import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081';
const STORAGE_KEY = 'app_access_token';

// Helper to decode JWT and extract expiry
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (e) {
    console.error('Failed to parse token:', e);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Fetch current user info from backend
  const fetchCurrentUser = useCallback(async (token: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api/v1';
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Token might be expired, clear it
      sessionStorage.removeItem(STORAGE_KEY);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login via popup window to auth-service
  const login = useCallback(() => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Pass redirect_uri so auth-service knows where to send the user after OAuth
    const redirectUri = window.location.origin;
    const authUrl = `${AUTH_SERVICE_URL}/api/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const popup = window.open(
      authUrl,
      'OAuth Login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0`
    );

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return;
    }

    // Listen for message from popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== AUTH_SERVICE_URL && event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'AUTH_SUCCESS' && event.data.accessToken) {
        const token = event.data.accessToken;

        // Store token
        sessionStorage.setItem(STORAGE_KEY, token);
        setAccessToken(token);

        // Fetch user data
        fetchCurrentUser(token);

        toast.success('Login successful!');

        // Clean up
        window.removeEventListener('message', handleMessage);
        // Don't close popup - it closes itself to avoid COOP errors
      } else if (event.data.type === 'AUTH_ERROR') {
        toast.error('Login failed. Please try again.');
        window.removeEventListener('message', handleMessage);
        // Don't close popup - it closes itself to avoid COOP errors
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed without completing auth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  }, [fetchCurrentUser]);

  // Logout
  const logout = useCallback(async () => {
    try {
      // Call backend logout endpoint to revoke refresh token
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api/v1';
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies (refresh token)
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }

    // Clear local state
    sessionStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  // Refresh token using refresh token cookie
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api/v1';
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Critical: includes cookies
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      const newToken = data.access_token;

      // Store new token
      sessionStorage.setItem(STORAGE_KEY, newToken);
      setAccessToken(newToken);

      // Fetch updated user info
      await fetchCurrentUser(newToken);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear auth state
      sessionStorage.removeItem(STORAGE_KEY);
      setAccessToken(null);
      setUser(null);
      return false;
    }
  }, [fetchCurrentUser]);

  // Restore token from sessionStorage on mount
  useEffect(() => {
    // Only run once on mount - no dependencies to avoid infinite loops
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initAuth = async () => {
      const storedToken = sessionStorage.getItem(STORAGE_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      const expiry = getTokenExpiry(storedToken);
      const now = Date.now();

      // If token expires in < 2 minutes, refresh immediately
      if (expiry && expiry - now < 2 * 60 * 1000) {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api/v1';
          const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            const newToken = data.access_token;
            sessionStorage.setItem(STORAGE_KEY, newToken);
            setAccessToken(newToken);
            await fetchCurrentUser(newToken);
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          setIsLoading(false);
        }
      } else {
        setAccessToken(storedToken);
        fetchCurrentUser(storedToken);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Set up automatic token refresh before expiry
  useEffect(() => {
    if (!accessToken) return;

    const expiry = getTokenExpiry(accessToken);
    if (!expiry) return;

    const now = Date.now();
    const timeUntilExpiry = expiry - now;

    // Refresh 2 minutes before expiry
    const refreshBuffer = 2 * 60 * 1000;
    const timeUntilRefresh = Math.max(0, timeUntilExpiry - refreshBuffer);

    console.log(`Setting up token refresh in ${Math.floor(timeUntilRefresh / 1000)}s`);

    const timer = setTimeout(async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api/v1';
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const newToken = data.access_token;
          sessionStorage.setItem(STORAGE_KEY, newToken);
          setAccessToken(newToken);
          await fetchCurrentUser(newToken);
          console.log('Token refreshed successfully');
        } else {
          toast.error('Session expired. Please log in again.');
          sessionStorage.removeItem(STORAGE_KEY);
          setAccessToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        toast.error('Session expired. Please log in again.');
        sessionStorage.removeItem(STORAGE_KEY);
        setAccessToken(null);
        setUser(null);
      }
    }, timeUntilRefresh);

    return () => clearTimeout(timer);
    // Only depend on accessToken changing, not on function references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const value = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
