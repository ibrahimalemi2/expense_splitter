/**
 * Central API client for Hostel Mess & Expense Splitter
 * Dual-Mode: Communicates with Express SQLite backend when online,
 * or transparently fails over to client-side localStorage fallback
 * for static hosting (GitHub Pages, Vercel, Netlify) or offline use.
 */
import { fallbackStorage } from './fallbackStorage';

const BASE_URL = '/api';
let isFallbackMode = false;

function getHeaders(currentUser) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (currentUser) {
    headers['x-user-id'] = currentUser.id;
    headers['x-user-role'] = currentUser.role;
  }
  return headers;
}

async function requestOrFallback(url, options, fallbackAction) {
  if (isFallbackMode) {
    return fallbackAction();
  }

  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    // If endpoint returns 404 or an HTML page (static hosting fallback like GitHub Pages)
    if (res.status === 404 || contentType.includes('text/html')) {
      console.warn(`[MessApp] Backend API not available at ${url}. Switching to client fallback storage.`);
      isFallbackMode = true;
      return fallbackAction();
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (err) {
    // If it's a business logic / validation error from backend, rethrow it
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('NetworkError') &&
      !err.message.includes('JSON') &&
      !err.message.includes('Unexpected token')
    ) {
      throw err;
    }
    console.warn(`[MessApp] API connection failed. Using client fallback storage.`, err);
    isFallbackMode = true;
    return fallbackAction();
  }
}

export const api = {
  // Users & Auth
  async getUsers() {
    return requestOrFallback(
      `${BASE_URL}/users`,
      undefined,
      () => fallbackStorage.getUsers()
    );
  },

  async login(userId, pin) {
    return requestOrFallback(
      `${BASE_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin }),
      },
      () => fallbackStorage.login(userId, pin)
    );
  },

  async createUser(userData, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/users`,
      {
        method: 'POST',
        headers: getHeaders(currentUser),
        body: JSON.stringify(userData),
      },
      () => fallbackStorage.createUser(userData)
    );
  },

  async updateUserStatus(userId, status, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/users/${userId}/status`,
      {
        method: 'PATCH',
        headers: getHeaders(currentUser),
        body: JSON.stringify({ status }),
      },
      () => fallbackStorage.updateUserStatus(userId, status)
    );
  },

  async updateUser(userId, userData, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/users/${userId}`,
      {
        method: 'PUT',
        headers: getHeaders(currentUser),
        body: JSON.stringify(userData),
      },
      () => fallbackStorage.updateUser(userId, userData)
    );
  },

  async deleteUser(userId, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/users/${userId}`,
      {
        method: 'DELETE',
        headers: getHeaders(currentUser),
      },
      () => fallbackStorage.deleteUser(userId)
    );
  },

  async changePin(userId, currentPin, newPin, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/users/${userId}/pin`,
      {
        method: 'PATCH',
        headers: getHeaders(currentUser),
        body: JSON.stringify({ currentPin, newPin }),
      },
      () => fallbackStorage.changePin(userId, currentPin, newPin, currentUser?.role === 'admin')
    );
  },

  // Cycles
  async getCurrentCycle() {
    return requestOrFallback(
      `${BASE_URL}/cycles/current`,
      undefined,
      () => fallbackStorage.getCurrentCycle()
    );
  },

  async getCycles() {
    return requestOrFallback(
      `${BASE_URL}/cycles`,
      undefined,
      () => fallbackStorage.getCycles()
    );
  },

  async closeCycle(carryForward, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/cycles/close`,
      {
        method: 'POST',
        headers: getHeaders(currentUser),
        body: JSON.stringify({ carryForward }),
      },
      () => fallbackStorage.closeCycle(carryForward)
    );
  },

  // Meals
  async getMeals(cycleId) {
    const url = cycleId ? `${BASE_URL}/meals?cycle_id=${cycleId}` : `${BASE_URL}/meals`;
    return requestOrFallback(
      url,
      undefined,
      () => fallbackStorage.getMeals()
    );
  },

  async recordMeal(mealData, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/meals`,
      {
        method: 'POST',
        headers: getHeaders(currentUser),
        body: JSON.stringify(mealData),
      },
      () => fallbackStorage.recordMeal(mealData)
    );
  },

  async updateMeal(mealId, mealData, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/meals/${mealId}`,
      {
        method: 'PUT',
        headers: getHeaders(currentUser),
        body: JSON.stringify(mealData),
      },
      () => fallbackStorage.updateMeal(mealId, mealData)
    );
  },

  async deleteMeal(mealId, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/meals/${mealId}`,
      {
        method: 'DELETE',
        headers: getHeaders(currentUser),
      },
      () => fallbackStorage.deleteMeal(mealId)
    );
  },

  // Dashboard & Settlement
  async getDashboard(userId) {
    const url = userId ? `${BASE_URL}/dashboard?user_id=${userId}` : `${BASE_URL}/dashboard`;
    return requestOrFallback(
      url,
      undefined,
      () => fallbackStorage.getDashboard(userId)
    );
  },

  async getSettlement(cycleId) {
    const url = cycleId ? `${BASE_URL}/settlement?cycle_id=${cycleId}` : `${BASE_URL}/settlement`;
    return requestOrFallback(
      url,
      undefined,
      () => fallbackStorage.getSettlement()
    );
  },

  // Cooking Duty Queue
  async getCookingDuty(userId) {
    const url = userId ? `${BASE_URL}/cooking-duty?user_id=${userId}` : `${BASE_URL}/cooking-duty`;
    return requestOrFallback(
      url,
      undefined,
      () => fallbackStorage.getCookingDuty(userId)
    );
  },

  async completeCookingDuty(currentUser) {
    return requestOrFallback(
      `${BASE_URL}/cooking-duty/complete`,
      {
        method: 'POST',
        headers: getHeaders(currentUser),
      },
      () => fallbackStorage.completeCookingDuty()
    );
  },

  async setCurrentCook(userId, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/cooking-duty/set-current`,
      {
        method: 'PATCH',
        headers: getHeaders(currentUser),
        body: JSON.stringify({ userId }),
      },
      () => fallbackStorage.setCurrentCook(userId)
    );
  },

  async reorderCookingQueue(orderedUserIds, currentUser) {
    return requestOrFallback(
      `${BASE_URL}/cooking-duty/reorder`,
      {
        method: 'PUT',
        headers: getHeaders(currentUser),
        body: JSON.stringify({ orderedUserIds }),
      },
      () => fallbackStorage.reorderCookingQueue(orderedUserIds)
    );
  },

  async skipCookingDuty(currentUser) {
    return requestOrFallback(
      `${BASE_URL}/cooking-duty/skip`,
      {
        method: 'POST',
        headers: getHeaders(currentUser),
      },
      () => fallbackStorage.skipCookingDuty()
    );
  },

  // Activity Logs
  async getLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${BASE_URL}/logs?${query}` : `${BASE_URL}/logs`;
    return requestOrFallback(
      url,
      undefined,
      () => fallbackStorage.getLogs()
    );
  },
};
