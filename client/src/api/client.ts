const BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('debtwise_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(res.status, body.code || 'UNKNOWN', body.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  auth: {
    register: (data: any) => request<{ user: any; token: string; refreshToken: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) => request<{ user: any; token: string; refreshToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    refresh: (refreshToken: string) => request<{ token: string; refreshToken: string }>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    me: () => request<any>('/auth/me'),
    updateMe: (data: any) => request<any>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
    setupMfa: () => request<any>('/auth/mfa/setup', { method: 'POST' }),
    verifyMfa: (token: string) => request<any>('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  },

  // Debts
  debts: {
    list: () => request<{ debts: any[] }>('/debts'),
    get: (id: string) => request<{ debt: any; sessions: any[]; documents: any[]; deadlines: any[]; threads: any[] }>(`/debts/${id}`),
    create: (data: any) => request<{ debt: any }>('/debts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ debt: any }>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/debts/${id}`, { method: 'DELETE' }),
    analyze: (id: string) => request<{ analysis: any }>(`/debts/${id}/analyze`, { method: 'POST' }),
    uploadNotice: (text: string) => request<{ extracted: any }>('/debts/upload-notice', { method: 'POST', body: JSON.stringify({ text }) }),
  },

  // Negotiations
  negotiations: {
    list: (debtId: string) => request<{ sessions: any[] }>(`/debts/${debtId}/sessions`),
    create: (debtId: string, data: any) => request<{ session: any }>(`/debts/${debtId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
    update: (debtId: string, sessionId: string, data: any) => request<{ session: any }>(`/debts/${debtId}/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify(data) }),
    logContact: (debtId: string, sessionId: string, data: any) => request<{ contacts: any[] }>(`/debts/${debtId}/sessions/${sessionId}/contact`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Documents
  documents: {
    list: (debtId: string) => request<{ documents: any[] }>(`/debts/${debtId}/documents`),
    generate: (debtId: string, type: string) => request<{ document: any }>(`/debts/${debtId}/documents`, { method: 'POST', body: JSON.stringify({ type }) }),
    update: (id: string, data: any) => request<{ document: any }>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // AI
  ai: {
    chat: (data: { message: string; debtId?: string; threadId?: string }) => request<{ message: any; threadId: string }>('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
    threads: (debtId: string) => request<{ threads: any[] }>(`/ai/threads/${debtId}`),
  },

  // Deadlines
  deadlines: {
    list: () => request<{ deadlines: any[] }>('/deadlines'),
    resolve: (id: string) => request<{ message: string }>(`/deadlines/${id}/resolve`, { method: 'PUT' }),
  },

  // Integrations
  integrations: {
    plaidLinkToken: () => request<{ linkToken: string; expiration: string }>('/plaid/link-token', { method: 'POST' }),
    plaidExchange: (publicToken: string) => request<{ status: string; connectionId: string }>('/plaid/exchange-token', { method: 'POST', body: JSON.stringify({ publicToken }) }),
    plaidIncome: () => request<any>('/plaid/income-analysis'),
    plaidDisconnect: () => request<{ message: string }>('/plaid/disconnect', { method: 'DELETE' }),
    createCheckout: (data: { plan: string; successUrl: string; cancelUrl: string }) => request<any>('/stripe/create-checkout', { method: 'POST', body: JSON.stringify(data) }),
    subscription: () => request<{ subscription: any }>('/subscription'),
  },
};
