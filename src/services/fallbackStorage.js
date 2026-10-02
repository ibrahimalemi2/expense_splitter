/**
 * Client-Side Fallback Storage for Hostel Mess & Expense Splitter
 * Ensures the application runs with all 8 real hostel members even when
 * hosted on static platforms (GitHub Pages, Vercel, Netlify) or when backend API is offline.
 */

export const INITIAL_USERS = [
  { id: 1, name: 'Mohammad Ibrahim', room: '', pin: '1234', role: 'admin', status: 'active', avatar_color: '#10b981' },
  { id: 2, name: 'Mir Hamza', room: '', pin: '2345', role: 'member', status: 'active', avatar_color: '#3b82f6' },
  { id: 3, name: 'Kashef', room: '', pin: '3456', role: 'member', status: 'active', avatar_color: '#8b5cf6' },
  { id: 4, name: 'Dr. Rahmanullah', room: '', pin: '4567', role: 'member', status: 'active', avatar_color: '#f59e0b' },
  { id: 5, name: 'Ahmad Sherzad', room: '', pin: '5678', role: 'member', status: 'active', avatar_color: '#ec4899' },
  { id: 6, name: 'Atiqullah', room: '', pin: '6789', role: 'member', status: 'active', avatar_color: '#06b6d4' },
  { id: 7, name: 'Layeq', room: '', pin: '7890', role: 'member', status: 'active', avatar_color: '#14b8a6' },
  { id: 8, name: 'Nazifullah', room: '', pin: '8901', role: 'member', status: 'active', avatar_color: '#f97316' },
];

export const DEFAULT_PINS = {
  'Mohammad Ibrahim': '1234',
  'Mir Hamza': '2345',
  'Kashef': '3456',
  'Dr. Rahmanullah': '4567',
  'Ahmad Sherzad': '5678',
  'Atiqullah': '6789',
  'Layeq': '7890',
  'Nazifullah': '8901',
};

const STORAGE_KEYS = {
  USERS: 'mess_app_users_v2',
  CYCLE: 'mess_app_cycle_v2',
  MEALS: 'mess_app_meals_v2',
  DUTY_QUEUE: 'mess_app_duty_queue_v2',
  DUTY_HISTORY: 'mess_app_duty_history_v2',
  LOGS: 'mess_app_logs_v2',
};

function getStored(key, defaultValue) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

// Initialize client storage with realistic hostel data if empty
export function initFallbackStorage() {
  const existingUsers = getStored(STORAGE_KEYS.USERS, null);
  if (!existingUsers || !Array.isArray(existingUsers) || existingUsers.length === 0) {
    setStored(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  if (!localStorage.getItem(STORAGE_KEYS.CYCLE)) {
    const today = new Date().toISOString().split('T')[0];
    setStored(STORAGE_KEYS.CYCLE, {
      id: 1,
      cycle_number: 1,
      start_date: today,
      end_date: null,
      is_active: 1
    });
  }

  if (!localStorage.getItem(STORAGE_KEYS.DUTY_QUEUE)) {
    // Atiqullah is today's cook, followed by Mir Hamza
    const queue = [
      { user_id: 6, queue_order: 0, is_current: 1 }, // Atiqullah
      { user_id: 2, queue_order: 1, is_current: 0 }, // Mir Hamza
      { user_id: 1, queue_order: 2, is_current: 0 }, // Mohammad Ibrahim
      { user_id: 3, queue_order: 3, is_current: 0 }, // Kashef
      { user_id: 4, queue_order: 4, is_current: 0 }, // Dr. Rahmanullah
      { user_id: 5, queue_order: 5, is_current: 0 }, // Ahmad Sherzad
      { user_id: 7, queue_order: 6, is_current: 0 }, // Layeq
      { user_id: 8, queue_order: 7, is_current: 0 }, // Nazifullah
    ];
    setStored(STORAGE_KEYS.DUTY_QUEUE, queue);
  }

  if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
    const today = new Date().toISOString().split('T')[0];
    setStored(STORAGE_KEYS.MEALS, [
      {
        id: 1,
        cycle_id: 1,
        payer_id: 1,
        payer_name: 'Mohammad Ibrahim',
        amount: 1600,
        meal_type: 'Dinner',
        date: today,
        description: 'Special Chicken Biryani & Drinks',
        attendee_ids: [1, 2, 3, 4, 5, 6, 7, 8],
        attendees: INITIAL_USERS.map(u => ({ user_id: u.id, name: u.name, share_amount: 200 }))
      },
      {
        id: 2,
        cycle_id: 1,
        payer_id: 2,
        payer_name: 'Mir Hamza',
        amount: 800,
        meal_type: 'Breakfast',
        date: today,
        description: 'Desi Paratha & Karak Chai',
        attendee_ids: [1, 2, 3, 4, 5, 6, 7, 8],
        attendees: INITIAL_USERS.map(u => ({ user_id: u.id, name: u.name, share_amount: 100 }))
      }
    ]);
  }

  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    setStored(STORAGE_KEYS.LOGS, [
      {
        id: 1,
        user_name: 'Atiqullah',
        user_avatar_color: '#06b6d4',
        action_type: 'DUTY_ASSIGNED',
        category: 'duty',
        title: "Today's Cook Assigned",
        description: "Atiqullah is on duty as today's hostel cook",
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        user_name: 'System',
        user_avatar_color: '#10b981',
        action_type: 'CYCLE_STARTED',
        category: 'cycle',
        title: 'Mess Cycle Started',
        description: 'Active Cycle #1 initialized with 8 members',
        created_at: new Date().toISOString()
      }
    ]);
  }
}

// Fallback Implementation Object
export const fallbackStorage = {
  getUsers() {
    initFallbackStorage();
    return getStored(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  login(userId, pin) {
    const users = this.getUsers();
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) throw new Error('User not found');
    const validPin = user.pin || DEFAULT_PINS[user.name] || '1234';
    if (String(validPin).trim() !== String(pin).trim()) throw new Error('Incorrect 4-digit PIN');
    return { success: true, user };
  },

  createUser(userData) {
    initFallbackStorage();
    const users = this.getUsers();
    const newId = Date.now();
    const newUser = {
      id: newId,
      name: userData.name.trim(),
      room: userData.room?.trim() || '',
      pin: String(userData.pin || '1234').trim(),
      role: userData.role || 'member',
      status: userData.status || 'active',
      avatar_color: userData.avatar_color || '#10b981'
    };
    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);

    const queue = getStored(STORAGE_KEYS.DUTY_QUEUE, []);
    queue.push({
      user_id: newId,
      queue_order: queue.length,
      is_current: 0
    });
    setStored(STORAGE_KEYS.DUTY_QUEUE, queue);

    const logs = getStored(STORAGE_KEYS.LOGS, []);
    logs.unshift({
      id: Date.now(),
      user_name: 'Admin',
      user_avatar_color: '#10b981',
      action_type: 'MEMBER_ADDED',
      category: 'member',
      title: 'New Member Added',
      description: `Admin added ${newUser.name} to hostel mess`,
      created_at: new Date().toISOString()
    });
    setStored(STORAGE_KEYS.LOGS, logs);

    return newUser;
  },

  updateUserStatus(userId, status) {
    initFallbackStorage();
    const users = this.getUsers();
    const u = users.find(x => String(x.id) === String(userId));
    if (!u) throw new Error('User not found');
    u.status = status;
    setStored(STORAGE_KEYS.USERS, users);
    return u;
  },

  updateUser(userId, data) {
    initFallbackStorage();
    const users = this.getUsers();
    const u = users.find(x => String(x.id) === String(userId));
    if (!u) throw new Error('User not found');
    if (data.name) u.name = data.name.trim();
    if (data.role) u.role = data.role;
    setStored(STORAGE_KEYS.USERS, users);
    return u;
  },

  deleteUser(userId) {
    initFallbackStorage();
    let users = this.getUsers();
    users = users.filter(x => String(x.id) !== String(userId));
    setStored(STORAGE_KEYS.USERS, users);
    return { success: true };
  },

  changePin(userId, currentPin, newPin, isAdmin) {
    initFallbackStorage();
    const users = this.getUsers();
    const u = users.find(x => String(x.id) === String(userId));
    if (!u) throw new Error('User not found');
    const existingPin = u.pin || DEFAULT_PINS[u.name] || '1234';
    if (!isAdmin && String(existingPin).trim() !== String(currentPin).trim()) {
      throw new Error('Current PIN is incorrect');
    }
    u.pin = String(newPin).trim();
    setStored(STORAGE_KEYS.USERS, users);
    return { success: true, message: 'PIN updated successfully!' };
  },

  getCurrentCycle() {
    initFallbackStorage();
    return getStored(STORAGE_KEYS.CYCLE, { id: 1, cycle_number: 1, is_active: 1, start_date: '2026-10-01' });
  },

  getCycles() {
    initFallbackStorage();
    const cycle = this.getCurrentCycle();
    return [cycle];
  },

  closeCycle(carryForward) {
    initFallbackStorage();
    const currentCycle = this.getCurrentCycle();
    const nextCycleNum = (currentCycle.cycle_number || 1) + 1;
    const today = new Date().toISOString().split('T')[0];
    
    // Reset meals for new cycle
    setStored(STORAGE_KEYS.MEALS, []);
    const newCycle = {
      id: Date.now(),
      cycle_number: nextCycleNum,
      start_date: today,
      end_date: null,
      is_active: 1
    };
    setStored(STORAGE_KEYS.CYCLE, newCycle);

    const logs = getStored(STORAGE_KEYS.LOGS, []);
    logs.unshift({
      id: Date.now(),
      user_name: 'Admin',
      user_avatar_color: '#10b981',
      action_type: 'CYCLE_FINALIZED',
      category: 'cycle',
      title: `Cycle #${currentCycle.cycle_number} Closed`,
      description: `Admin finalized cycle. Cycle #${nextCycleNum} started ${carryForward ? 'with carried-forward balances' : 'fresh'}.`,
      created_at: new Date().toISOString()
    });
    setStored(STORAGE_KEYS.LOGS, logs);

    return { success: true, newCycle };
  },

  getMeals() {
    initFallbackStorage();
    return getStored(STORAGE_KEYS.MEALS, []);
  },

  recordMeal(mealData) {
    initFallbackStorage();
    const meals = getStored(STORAGE_KEYS.MEALS, []);
    const users = this.getUsers();
    const queue = getStored(STORAGE_KEYS.DUTY_QUEUE, []);
    const payer = users.find(u => u.id === Number(mealData.payer_id));

    const attendeeCount = mealData.attendee_ids.length;
    const perPerson = Math.round((Number(mealData.amount) / attendeeCount) * 100) / 100;

    const newMeal = {
      id: Date.now(),
      cycle_id: 1,
      payer_id: Number(mealData.payer_id),
      payer_name: payer?.name || 'Roommate',
      amount: Number(mealData.amount),
      meal_type: mealData.meal_type,
      date: mealData.date || new Date().toISOString().split('T')[0],
      description: mealData.description,
      attendee_ids: mealData.attendee_ids,
      attendees: mealData.attendee_ids.map(id => {
        const u = users.find(x => x.id === id);
        return { user_id: id, name: u?.name || 'Member', share_amount: perPerson };
      })
    };

    meals.unshift(newMeal);
    setStored(STORAGE_KEYS.MEALS, meals);

    // Check duty completion
    let dutyCompleted = false;
    let prevCookName = null;
    let nextCookName = null;

    const currentCookIdx = queue.findIndex(q => q.is_current === 1);
    if (currentCookIdx !== -1 && queue[currentCookIdx].user_id === Number(mealData.payer_id)) {
      dutyCompleted = true;
      const current = queue[currentCookIdx];
      const prevCookUser = users.find(u => u.id === current.user_id);
      prevCookName = prevCookUser?.name;

      current.is_current = 0;
      current.last_cooked_at = newMeal.date;

      const nextIdx = (currentCookIdx + 1) % queue.length;
      queue[nextIdx].is_current = 1;
      const nextCookUser = users.find(u => u.id === queue[nextIdx].user_id);
      nextCookName = nextCookUser?.name;

      setStored(STORAGE_KEYS.DUTY_QUEUE, queue);
    }

    // Add log
    const logs = getStored(STORAGE_KEYS.LOGS, []);
    logs.unshift({
      id: Date.now(),
      user_name: payer?.name || 'Member',
      user_avatar_color: payer?.avatar_color || '#10b981',
      action_type: 'MEAL_RECORDED',
      category: 'meal',
      title: `${newMeal.meal_type} Recorded`,
      description: `${payer?.name} recorded ${newMeal.meal_type} for Rs. ${newMeal.amount} (Split ${attendeeCount} ways)`,
      created_at: new Date().toISOString()
    });

    if (dutyCompleted) {
      logs.unshift({
        id: Date.now() + 1,
        user_name: prevCookName,
        user_avatar_color: payer?.avatar_color || '#10b981',
        action_type: 'DUTY_HANDOVER',
        category: 'duty',
        title: 'Cooking Duty Handover',
        description: `Cooking turn completed by ${prevCookName} and passed to ${nextCookName}!`,
        created_at: new Date().toISOString()
      });
    }

    setStored(STORAGE_KEYS.LOGS, logs);

    return {
      success: true,
      mealId: newMeal.id,
      dutyCompleted,
      previousCook: prevCookName,
      nextCook: nextCookName,
      message: dutyCompleted 
        ? `Expense of Rs. ${newMeal.amount} recorded! Duty completed by ${prevCookName} and handed over to ${nextCookName}.`
        : `Recorded ${newMeal.meal_type} for Rs. ${newMeal.amount}!`
    };
  },

  updateMeal(mealId, mealData) {
    initFallbackStorage();
    const meals = getStored(STORAGE_KEYS.MEALS, []);
    const users = this.getUsers();
    const idx = meals.findIndex(m => String(m.id) === String(mealId));
    if (idx === -1) throw new Error('Meal not found');

    const attendeeCount = mealData.attendee_ids.length;
    const perPerson = Math.round((Number(mealData.amount) / attendeeCount) * 100) / 100;
    const payer = users.find(u => u.id === Number(mealData.payer_id));

    meals[idx] = {
      ...meals[idx],
      payer_id: Number(mealData.payer_id),
      payer_name: payer?.name || meals[idx].payer_name,
      amount: Number(mealData.amount),
      meal_type: mealData.meal_type,
      date: mealData.date,
      description: mealData.description,
      attendee_ids: mealData.attendee_ids,
      attendees: mealData.attendee_ids.map(id => {
        const u = users.find(x => x.id === id);
        return { user_id: id, name: u?.name || 'Member', share_amount: perPerson };
      })
    };

    setStored(STORAGE_KEYS.MEALS, meals);
    return meals[idx];
  },

  deleteMeal(mealId) {
    initFallbackStorage();
    let meals = getStored(STORAGE_KEYS.MEALS, []);
    meals = meals.filter(m => String(m.id) !== String(mealId));
    setStored(STORAGE_KEYS.MEALS, meals);
    return { success: true };
  },

  getDashboard(userId) {
    initFallbackStorage();
    const users = this.getUsers();
    const meals = getStored(STORAGE_KEYS.MEALS, []);

    const spentMap = {};
    const consumedMap = {};

    users.forEach(u => {
      spentMap[u.id] = 0;
      consumedMap[u.id] = 0;
    });

    meals.forEach(m => {
      spentMap[m.payer_id] = (spentMap[m.payer_id] || 0) + m.amount;
      (m.attendees || []).forEach(a => {
        consumedMap[a.user_id] = (consumedMap[a.user_id] || 0) + a.share_amount;
      });
    });

    const currentUid = Number(userId);
    const mySpent = spentMap[currentUid] || 0;
    const myConsumed = consumedMap[currentUid] || 0;
    const net = Math.round((mySpent - myConsumed) * 100) / 100;

    const roommates = users.map(u => {
      const spent = spentMap[u.id] || 0;
      const consumed = consumedMap[u.id] || 0;
      const netBal = Math.round((spent - consumed) * 100) / 100;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        status: u.status,
        avatar_color: u.avatar_color,
        spent,
        consumed,
        netBalance: netBal
      };
    });

    const totalPool = meals.reduce((sum, m) => sum + m.amount, 0);

    return {
      hasCycle: true,
      personalCard: {
        totalSpent: mySpent,
        totalConsumed: myConsumed,
        carryOverIn: 0,
        netBalance: net,
        isOwed: net > 0,
        owes: net < 0,
        isEven: net === 0
      },
      stats: {
        totalPool,
        mealCount: meals.length,
        activeEatersToday: users.filter(u => u.status === 'active').length
      },
      roommates,
      recentMeals: meals.slice(0, 5)
    };
  },

  getSettlement() {
    initFallbackStorage();
    const dash = this.getDashboard(1);
    return {
      cycleNumber: 1,
      totalSpent: dash.stats.totalPool,
      mealCount: dash.stats.mealCount,
      members: dash.roommates,
      transactions: []
    };
  },

  getCookingDuty(userId) {
    initFallbackStorage();
    const users = this.getUsers();
    const queue = getStored(STORAGE_KEYS.DUTY_QUEUE, []);
    
    const enrichedQueue = queue.map((q) => {
      const u = users.find(user => user.id === q.user_id) || { name: 'Member', role: 'member', avatar_color: '#10b981' };
      return {
        ...q,
        name: u.name,
        role: u.role,
        status: u.status,
        avatar_color: u.avatar_color,
      };
    });

    const currentIndex = enrichedQueue.findIndex(q => q.is_current === 1);
    const currentCook = currentIndex !== -1 ? enrichedQueue[currentIndex] : enrichedQueue[0];
    const nextIndex = (currentIndex + 1) % (enrichedQueue.length || 1);
    const nextCook = enrichedQueue[nextIndex] || currentCook;

    const turnsAwayQueue = enrichedQueue.map((m, i) => {
      const turnsAway = (i - currentIndex + enrichedQueue.length) % (enrichedQueue.length || 1);
      return {
        ...m,
        turnsAway,
        turnLabel: turnsAway === 0 ? 'Cooking Today 🍳' : turnsAway === 1 ? 'Next (Tomorrow) ⏳' : `In ${turnsAway} days`
      };
    });

    let myDuty = null;
    if (userId) {
      const myItem = turnsAwayQueue.find(q => String(q.user_id) === String(userId));
      if (myItem) {
        myDuty = {
          isMyTurn: myItem.turnsAway === 0,
          turnsAway: myItem.turnsAway,
          turnLabel: myItem.turnLabel,
          name: myItem.name
        };
      }
    }

    return {
      currentCook,
      nextCook,
      queue: turnsAwayQueue,
      myDuty,
      totalCooks: enrichedQueue.length,
      history: getStored(STORAGE_KEYS.DUTY_HISTORY, [])
    };
  },

  completeCookingDuty() {
    initFallbackStorage();
    const queue = getStored(STORAGE_KEYS.DUTY_QUEUE, []);
    const users = this.getUsers();
    const currentIdx = queue.findIndex(q => q.is_current === 1);
    if (currentIdx === -1) return { success: false };

    const currentCookUser = users.find(u => u.id === queue[currentIdx].user_id);
    queue[currentIdx].is_current = 0;
    queue[currentIdx].last_cooked_at = new Date().toISOString().split('T')[0];

    const nextIdx = (currentIdx + 1) % queue.length;
    queue[nextIdx].is_current = 1;
    const nextCookUser = users.find(u => u.id === queue[nextIdx].user_id);

    setStored(STORAGE_KEYS.DUTY_QUEUE, queue);

    const logs = getStored(STORAGE_KEYS.LOGS, []);
    logs.unshift({
      id: Date.now(),
      user_name: currentCookUser?.name || 'Cook',
      user_avatar_color: currentCookUser?.avatar_color || '#10b981',
      action_type: 'DUTY_HANDOVER',
      category: 'duty',
      title: 'Cooking Duty Completed',
      description: `Cooking turn handed over to ${nextCookUser?.name}`,
      created_at: new Date().toISOString()
    });
    setStored(STORAGE_KEYS.LOGS, logs);

    return {
      success: true,
      previousCook: currentCookUser?.name,
      nextCook: nextCookUser?.name,
      message: `Duty completed by ${currentCookUser?.name} and passed to ${nextCookUser?.name}!`
    };
  },

  setCurrentCook(userId) {
    initFallbackStorage();
    const queue = getStored(STORAGE_KEYS.DUTY_QUEUE, []);
    const users = this.getUsers();
    queue.forEach(q => {
      q.is_current = String(q.user_id) === String(userId) ? 1 : 0;
    });
    setStored(STORAGE_KEYS.DUTY_QUEUE, queue);

    const user = users.find(u => String(u.id) === String(userId));
    const logs = getStored(STORAGE_KEYS.LOGS, []);
    logs.unshift({
      id: Date.now(),
      user_name: 'Admin',
      user_avatar_color: '#10b981',
      action_type: 'DUTY_ASSIGNED',
      category: 'duty',
      title: 'Current Cook Assigned',
      description: `Admin assigned ${user?.name || 'Member'} as today's cook`,
      created_at: new Date().toISOString()
    });
    setStored(STORAGE_KEYS.LOGS, logs);

    return { success: true, currentCook: user };
  },

  reorderCookingQueue(orderedUserIds) {
    initFallbackStorage();
    const queue = getStored(STORAGE_KEYS.DUTY_QUEUE, []);
    const newQueue = orderedUserIds.map((uid, idx) => {
      const existing = queue.find(q => String(q.user_id) === String(uid));
      return {
        user_id: Number(uid),
        queue_order: idx,
        is_current: existing ? existing.is_current : (idx === 0 ? 1 : 0),
        last_cooked_at: existing ? existing.last_cooked_at : null
      };
    });
    setStored(STORAGE_KEYS.DUTY_QUEUE, newQueue);
    return { success: true };
  },

  skipCookingDuty() {
    initFallbackStorage();
    const queue = getStored(STORAGE_KEYS.DUTY_QUEUE, []);
    const users = this.getUsers();
    const currentIdx = queue.findIndex(q => q.is_current === 1);
    if (currentIdx === -1) return { success: false };

    const skippedUser = users.find(u => u.id === queue[currentIdx].user_id);
    queue[currentIdx].is_current = 0;

    const nextIdx = (currentIdx + 1) % queue.length;
    queue[nextIdx].is_current = 1;
    const nextUser = users.find(u => u.id === queue[nextIdx].user_id);

    setStored(STORAGE_KEYS.DUTY_QUEUE, queue);

    const logs = getStored(STORAGE_KEYS.LOGS, []);
    logs.unshift({
      id: Date.now(),
      user_name: 'Admin',
      user_avatar_color: '#10b981',
      action_type: 'DUTY_SKIPPED',
      category: 'duty',
      title: 'Cooking Duty Skipped',
      description: `${skippedUser?.name || 'Cook'} was skipped. Next cook is now ${nextUser?.name}.`,
      created_at: new Date().toISOString()
    });
    setStored(STORAGE_KEYS.LOGS, logs);

    return {
      success: true,
      skippedUser: skippedUser?.name,
      nextCook: nextUser?.name,
      message: `${skippedUser?.name} skipped. Next cook is ${nextUser?.name}.`
    };
  },

  getLogs() {
    initFallbackStorage();
    return getStored(STORAGE_KEYS.LOGS, []);
  }
};
