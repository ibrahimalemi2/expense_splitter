/**
 * Central API client for Hostel Mess & Expense Splitter
 */
const BASE_URL = '/api';

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

export const api = {
  // Users & Auth
  async getUsers() {
    const res = await fetch(`${BASE_URL}/users`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async login(userId, pin) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async createUser(userData, currentUser) {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(currentUser),
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');
    return data;
  },

  async updateUserStatus(userId, status, currentUser) {
    const res = await fetch(`${BASE_URL}/users/${userId}/status`, {
      method: 'PATCH',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update member status');
    return data;
  },

  async updateUser(userId, userData, currentUser) {
    const res = await fetch(`${BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(currentUser),
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update member');
    return data;
  },

  async deleteUser(userId, currentUser) {
    const res = await fetch(`${BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(currentUser),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete member');
    return data;
  },

  async changePin(userId, currentPin, newPin, currentUser) {
    const res = await fetch(`${BASE_URL}/users/${userId}/pin`, {
      method: 'PATCH',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change PIN');
    return data;
  },

  // Cycles
  async getCurrentCycle() {
    const res = await fetch(`${BASE_URL}/cycles/current`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getCycles() {
    const res = await fetch(`${BASE_URL}/cycles`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async closeCycle(carryForward, currentUser) {
    const res = await fetch(`${BASE_URL}/cycles/close`, {
      method: 'POST',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ carryForward }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to close cycle');
    return data;
  },

  // Meals
  async getMeals(cycleId) {
    const url = cycleId ? `${BASE_URL}/meals?cycle_id=${cycleId}` : `${BASE_URL}/meals`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async recordMeal(mealData, currentUser) {
    const res = await fetch(`${BASE_URL}/meals`, {
      method: 'POST',
      headers: getHeaders(currentUser),
      body: JSON.stringify(mealData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record meal');
    return data;
  },

  async updateMeal(mealId, mealData, currentUser) {
    const res = await fetch(`${BASE_URL}/meals/${mealId}`, {
      method: 'PUT',
      headers: getHeaders(currentUser),
      body: JSON.stringify(mealData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update meal');
    return data;
  },

  async deleteMeal(mealId, currentUser) {
    const res = await fetch(`${BASE_URL}/meals/${mealId}`, {
      method: 'DELETE',
      headers: getHeaders(currentUser),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete meal');
    return data;
  },

  // Dashboard & Settlement
  async getDashboard(userId) {
    const url = userId ? `${BASE_URL}/dashboard?user_id=${userId}` : `${BASE_URL}/dashboard`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSettlement(cycleId) {
    const url = cycleId ? `${BASE_URL}/settlement?cycle_id=${cycleId}` : `${BASE_URL}/settlement`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Cooking Duty Queue
  async getCookingDuty(userId) {
    const url = userId ? `${BASE_URL}/cooking-duty?user_id=${userId}` : `${BASE_URL}/cooking-duty`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async completeCookingDuty(currentUser) {
    const res = await fetch(`${BASE_URL}/cooking-duty/complete`, {
      method: 'POST',
      headers: getHeaders(currentUser),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete cooking duty');
    return data;
  },

  async setCurrentCook(userId, currentUser) {
    const res = await fetch(`${BASE_URL}/cooking-duty/set-current`, {
      method: 'PATCH',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to set current cook');
    return data;
  },

  async reorderCookingQueue(orderedUserIds, currentUser) {
    const res = await fetch(`${BASE_URL}/cooking-duty/reorder`, {
      method: 'PUT',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ orderedUserIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reorder queue');
    return data;
  },

  async skipCookingDuty(currentUser) {
    const res = await fetch(`${BASE_URL}/cooking-duty/skip`, {
      method: 'POST',
      headers: getHeaders(currentUser),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to skip cook');
    return data;
  },

  // Activity Logs
  async getLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${BASE_URL}/logs?${query}` : `${BASE_URL}/logs`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
