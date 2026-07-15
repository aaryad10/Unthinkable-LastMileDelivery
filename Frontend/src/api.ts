const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken(): string | null {
  return localStorage.getItem('lmd_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (name: string, email: string, password: string, phone: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, phone }) }),

  me: () => request('/auth/me'),

  quote: (payload: any) => request('/orders/quote', { method: 'POST', body: JSON.stringify(payload) }),

  createOrder: (payload: any) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),

  listOrders: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/orders${qs ? `?${qs}` : ''}`);
  },

  getOrder: (id: number | string) => request(`/orders/${id}`),

  assignOrder: (id: number | string, payload: any) =>
    request(`/orders/${id}/assign`, { method: 'PATCH', body: JSON.stringify(payload) }),

  updateOrderStatus: (id: number | string, status: string, notes?: string) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),

  rescheduleOrder: (id: number | string, date: string) =>
    request(`/orders/${id}/reschedule`, { method: 'POST', body: JSON.stringify({ date }) }),

  listZones: () => request('/admin/zones'),
  createZone: (name: string, pincodes: string[]) =>
    request('/admin/zones', { method: 'POST', body: JSON.stringify({ name, pincodes }) }),

  getRateCards: () => request('/admin/rate-cards'),
  updateRateCard: (routeType: string, orderType: string, ratePerKg: number) =>
    request('/admin/rate-cards', { method: 'PUT', body: JSON.stringify({ routeType, orderType, ratePerKg }) }),
  updateCodSurcharge: (orderType: string, surcharge: number) =>
    request('/admin/cod-surcharge', { method: 'PUT', body: JSON.stringify({ orderType, surcharge }) }),

  listAgents: () => request('/admin/agents'),
  createAgent: (payload: any) => request('/admin/agents', { method: 'POST', body: JSON.stringify(payload) }),
  updateAgent: (id: number | string, payload: any) =>
    request(`/admin/agents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  

  listCustomers: () => request('/admin/customers'),

  setToken: (token: string) => localStorage.setItem('lmd_token', token),
  clearToken: () => localStorage.removeItem('lmd_token'),
  getToken,
};