const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8082/api/v1';

interface Feedback {
  id: string;
  application_id: string;
  user_id?: string;
  category_id?: number;
  title: string;
  content: string;
  rating?: number;
  status: string;
  priority: string;
  page_url: string;
  browser_info?: Record<string, any>;
  app_version: string;
  metadata?: Record<string, any>;
  contact_email: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  resolved_at?: string;
}

interface Application {
  id: string;
  name: string;
  slug: string;
  description: string;
  api_key?: string;
  is_active: boolean;
  webhook_url?: string;
  allowed_origins: string[];
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  application_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

interface Comment {
  id: string;
  feedback_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('app_access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

export const feedbackApi = {
  // Get paginated feedback with filters
  getFeedback: (params?: {
    app_id?: string;
    status?: string;
    priority?: string;
    category_id?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return apiFetch<{ feedback: Feedback[]; total: number; page: number; limit: number }>(
      `/feedback${queryString ? '?' + queryString : ''}`
    );
  },

  // Get single feedback by ID
  getFeedbackById: (id: string) =>
    apiFetch<Feedback>(`/feedback/${id}`),

  // Update feedback (status, priority, category)
  updateFeedback: (id: string, data: Partial<Feedback>) =>
    apiFetch<{ message: string }>(`/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Delete feedback
  deleteFeedback: (id: string) =>
    apiFetch<{ message: string }>(`/feedback/${id}`, {
      method: 'DELETE'
    }),

  // Get comments for feedback
  getComments: (feedbackId: string) =>
    apiFetch<Comment[]>(`/feedback/${feedbackId}/comments`),

  // Create comment
  createComment: (feedbackId: string, content: string, isInternal: boolean) =>
    apiFetch<Comment>(`/feedback/${feedbackId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, is_internal: isInternal }),
    }),

  // Update comment
  updateComment: (feedbackId: string, commentId: string, content: string) =>
    apiFetch<{ message: string }>(`/feedback/${feedbackId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  // Delete comment
  deleteComment: (feedbackId: string, commentId: string) =>
    apiFetch<{ message: string }>(`/feedback/${feedbackId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
};

export const applicationApi = {
  // Get all applications
  getApplications: () =>
    apiFetch<Application[]>('/applications'),

  // Get single application (includes API key)
  getApplicationById: (id: string) =>
    apiFetch<Application>(`/applications/${id}`),

  // Create new application
  createApplication: (data: {
    name: string;
    slug: string;
    description: string;
    webhook_url?: string;
    allowed_origins?: string[];
  }) =>
    apiFetch<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update application
  updateApplication: (id: string, data: Partial<Application>) =>
    apiFetch<{ message: string }>(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Delete application
  deleteApplication: (id: string) =>
    apiFetch<{ message: string }>(`/applications/${id}`, {
      method: 'DELETE',
    }),

  // Regenerate API key
  regenerateApiKey: (id: string) =>
    apiFetch<{ api_key: string; message: string }>(`/applications/${id}/regenerate-key`, {
      method: 'POST',
    }),

  // Get categories for application
  getCategories: (appId: string) =>
    apiFetch<Category[]>(`/applications/${appId}/categories`),

  // Create category
  createCategory: (appId: string, data: { name: string; color?: string; icon?: string }) =>
    apiFetch<Category>(`/applications/${appId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export type { Feedback, Application, Category, Comment };
