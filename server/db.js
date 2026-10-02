import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mess_splitter.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema according to the exact specifications:
 * 1. users (id, name, room, pin, role, status, created_at)
 * 2. cycles (id, cycle_number, start_date, end_date, is_active)
 * 3. meals (id, cycle_id, payer_id, amount, meal_type, date, description, created_at)
 * 4. meal_attendees (meal_id, user_id, share_amount)
 * 5. cycle_balances (id, cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      room TEXT,
      pin TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'at_home')),
      avatar_color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_number INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
      payer_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL CHECK(amount > 0),
      meal_type TEXT NOT NULL CHECK(meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'General')),
      date TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meal_attendees (
      meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      share_amount REAL NOT NULL,
      PRIMARY KEY (meal_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS cycle_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      carry_over_in REAL DEFAULT 0.0,
      total_spent REAL DEFAULT 0.0,
      total_consumed REAL DEFAULT 0.0,
      net_balance REAL DEFAULT 0.0,
      UNIQUE(cycle_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_meals_cycle ON meals(cycle_id);
    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    CREATE INDEX IF NOT EXISTS idx_attendees_meal ON meal_attendees(meal_id);

    CREATE TABLE IF NOT EXISTS cooking_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      queue_order INTEGER NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0,
      last_cooked_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cooking_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_cooking_order ON cooking_queue(queue_order);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      user_avatar_color TEXT,
      action_type TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_category ON activity_logs(category);
  `);

  // Seed sample data if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedDatabase();
  }

  // Ensure cooking queue is synchronized with existing users
  syncCookingQueue();

  // Ensure activity logs have historical records if empty
  seedActivityLogsIfEmpty();
}

/**
 * Log an audit activity event
 */
export function logActivity({ userId, userName, userAvatarColor, actionType, category, title, description, metadata = null, createdAt = null }) {
  try {
    let resolvedUserName = userName;
    let resolvedAvatarColor = userAvatarColor;

    if (userId && (!resolvedUserName || !resolvedAvatarColor)) {
      const u = db.prepare('SELECT name, avatar_color FROM users WHERE id = ?').get(userId);
      if (u) {
        if (!resolvedUserName) resolvedUserName = u.name;
        if (!resolvedAvatarColor) resolvedAvatarColor = u.avatar_color;
      }
    }

    const metaStr = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

    if (createdAt) {
      db.prepare(`
        INSERT INTO activity_logs (user_id, user_name, user_avatar_color, action_type, category, title, description, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId || null,
        resolvedUserName || 'System',
        resolvedAvatarColor || '#10b981',
        actionType,
        category,
        title,
        description,
        metaStr,
        createdAt
      );
    } else {
      db.prepare(`
        INSERT INTO activity_logs (user_id, user_name, user_avatar_color, action_type, category, title, description, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId || null,
        resolvedUserName || 'System',
        resolvedAvatarColor || '#10b981',
        actionType,
        category,
        title,
        description,
        metaStr
      );
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Seed historical logs from existing meals, cycle, and duty history if logs are empty
 */
function seedActivityLogsIfEmpty() {
  const logCount = db.prepare('SELECT COUNT(*) as count FROM activity_logs').get().count;
  if (logCount > 0) return;

  const currentCycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1').get();
  if (currentCycle) {
    logActivity({
      userName: 'System',
      actionType: 'CYCLE_STARTED',
      category: 'cycle',
      title: 'Mess Cycle Started',
      description: `Active Cycle #${currentCycle.cycle_number} initialized on ${currentCycle.start_date}`,
      createdAt: currentCycle.created_at
    });
  }

  // Backfill from meals
  const allMeals = db.prepare(`
    SELECT m.*, u.name as payer_name, u.avatar_color
    FROM meals m
    JOIN users u ON m.payer_id = u.id
    ORDER BY m.id ASC
  `).all();

  for (const m of allMeals) {
    const attendeeCount = db.prepare('SELECT COUNT(*) as count FROM meal_attendees WHERE meal_id = ?').get(m.id).count;
    logActivity({
      userId: m.payer_id,
      userName: m.payer_name,
      userAvatarColor: m.avatar_color,
      actionType: 'MEAL_RECORDED',
      category: 'meal',
      title: `${m.meal_type} Recorded`,
      description: `${m.payer_name} recorded ${m.meal_type} for Rs. ${m.amount} (Split among ${attendeeCount} members)`,
      metadata: { mealId: m.id, amount: m.amount, meal_type: m.meal_type, attendeeCount },
      createdAt: m.created_at || m.date
    });
  }

  // Backfill from cooking history
  const history = db.prepare(`
    SELECT ch.*, u.name as cook_name, u.avatar_color
    FROM cooking_history ch
    JOIN users u ON ch.user_id = u.id
    ORDER BY ch.id ASC
  `).all();

  for (const h of history) {
    logActivity({
      userId: h.user_id,
      userName: h.cook_name,
      userAvatarColor: h.avatar_color,
      actionType: 'DUTY_HANDOVER',
      category: 'duty',
      title: 'Cooking Duty Completed',
      description: `Cooking turn completed by ${h.cook_name} on ${h.date}`,
      createdAt: h.created_at
    });
  }

  // Today's cook
  const currentCook = db.prepare(`
    SELECT cq.*, u.name, u.avatar_color
    FROM cooking_queue cq
    JOIN users u ON cq.user_id = u.id
    WHERE cq.is_current = 1
    LIMIT 1
  `).get();

  if (currentCook) {
    logActivity({
      userId: currentCook.user_id,
      userName: currentCook.name,
      userAvatarColor: currentCook.avatar_color,
      actionType: 'DUTY_ASSIGNED',
      category: 'duty',
      title: "Today's Cook Assigned",
      description: `${currentCook.name} is on duty as today's hostel cook`
    });
  }
}

/**
 * Synchronize cooking queue with users table
 */
export function syncCookingQueue() {
  const allUsers = db.prepare('SELECT id, name FROM users ORDER BY id ASC').all();
  if (allUsers.length === 0) return;

  // Remove users who no longer exist
  db.prepare('DELETE FROM cooking_queue WHERE user_id NOT IN (SELECT id FROM users)').run();

  const existingEntries = db.prepare('SELECT user_id, queue_order, is_current FROM cooking_queue ORDER BY queue_order ASC').all();
  const existingUserIds = new Set(existingEntries.map(e => e.user_id));

  let maxOrder = existingEntries.length > 0 
    ? Math.max(...existingEntries.map(e => e.queue_order)) 
    : 0;

  // Insert any users not in queue yet
  const insertStmt = db.prepare('INSERT INTO cooking_queue (user_id, queue_order, is_current) VALUES (?, ?, 0)');
  for (const u of allUsers) {
    if (!existingUserIds.has(u.id)) {
      maxOrder++;
      insertStmt.run(u.id, maxOrder);
    }
  }

  // Ensure exactly one person is on duty as current cook
  const currentCount = db.prepare('SELECT COUNT(*) as count FROM cooking_queue WHERE is_current = 1').get().count;
  if (currentCount === 0) {
    // If Atiqullah exists, prioritize Atiqullah as today's cook as requested by user
    const atiqullah = db.prepare(`
      SELECT cq.id, cq.user_id 
      FROM cooking_queue cq 
      JOIN users u ON cq.user_id = u.id 
      WHERE u.name LIKE '%Atiqullah%' 
      LIMIT 1
    `).get();

    if (atiqullah) {
      db.prepare('UPDATE cooking_queue SET is_current = 1 WHERE id = ?').run(atiqullah.id);
    } else {
      const first = db.prepare('SELECT id FROM cooking_queue ORDER BY queue_order ASC LIMIT 1').get();
      if (first) {
        db.prepare('UPDATE cooking_queue SET is_current = 1 WHERE id = ?').run(first.id);
      }
    }
  } else if (currentCount > 1) {
    // Keep only the first one
    const firstCurrent = db.prepare('SELECT id FROM cooking_queue WHERE is_current = 1 ORDER BY queue_order ASC LIMIT 1').get();
    db.prepare('UPDATE cooking_queue SET is_current = 0 WHERE id != ?').run(firstCurrent.id);
  }
}

/**
 * Seed realistic initial hostel data
 */
function seedDatabase() {
  console.log('Seeding initial hostel mess data...');

  const insertUser = db.prepare(`
    INSERT INTO users (name, room, pin, role, status, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const users = [
    { name: 'Ali Khan', room: '101', pin: '1234', role: 'admin', status: 'active', color: '#10b981' },
    { name: 'Bilal Ahmed', room: '101', pin: '2345', role: 'member', status: 'active', color: '#3b82f6' },
    { name: 'Usman Tariq', room: '102', pin: '3456', role: 'member', status: 'active', color: '#8b5cf6' },
    { name: 'Hamza Sheikh', room: '102', pin: '4567', role: 'member', status: 'at_home', color: '#f59e0b' },
    { name: 'Zaid Farooq', room: '103', pin: '5678', role: 'member', status: 'active', color: '#ec4899' },
  ];

  const userIds = {};
  for (const u of users) {
    const info = insertUser.run(u.name, u.room, u.pin, u.role, u.status, u.color);
    userIds[u.name] = Number(info.lastInsertRowid);
  }

  // Create Cycle 1
  const today = new Date();
  const cycleStart = new Date(today);
  cycleStart.setDate(today.getDate() - 3);
  const cycleStartDateStr = cycleStart.toISOString().split('T')[0];

  const insertCycle = db.prepare(`
    INSERT INTO cycles (cycle_number, start_date, is_active)
    VALUES (?, ?, 1)
  `);
  const cycleInfo = insertCycle.run(1, cycleStartDateStr);
  const cycleId = Number(cycleInfo.lastInsertRowid);

  // Initialize cycle_balances for all users
  const insertBalance = db.prepare(`
    INSERT INTO cycle_balances (cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
    VALUES (?, ?, 0.0, 0.0, 0.0, 0.0)
  `);
  for (const name of Object.keys(userIds)) {
    insertBalance.run(cycleId, userIds[name]);
  }

  // Helper to add a meal and its attendees
  const insertMeal = db.prepare(`
    INSERT INTO meals (cycle_id, payer_id, amount, meal_type, date, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertAttendee = db.prepare(`
    INSERT INTO meal_attendees (meal_id, user_id, share_amount)
    VALUES (?, ?, ?)
  `);

  // Meal 1: Dinner 2 days ago (Biryani) - Ali paid 800 for Ali, Bilal, Usman, Zaid (Hamza is at home)
  const d2 = new Date(today);
  d2.setDate(today.getDate() - 2);
  const d2Str = d2.toISOString().split('T')[0];
  
  const m1 = insertMeal.run(cycleId, userIds['Ali Khan'], 800, 'Dinner', d2Str, 'Special Biryani & Cold Drinks');
  const m1Id = Number(m1.lastInsertRowid);
  const m1Attendees = [userIds['Ali Khan'], userIds['Bilal Ahmed'], userIds['Usman Tariq'], userIds['Zaid Farooq']];
  const m1Share = Math.round((800 / m1Attendees.length) * 100) / 100;
  for (const uid of m1Attendees) {
    insertAttendee.run(m1Id, uid, m1Share);
  }

  // Meal 2: Breakfast yesterday (Omelette, Parathas & Chai) - Bilal paid 360 for Ali, Bilal, Usman
  const d1 = new Date(today);
  d1.setDate(today.getDate() - 1);
  const d1Str = d1.toISOString().split('T')[0];

  const m2 = insertMeal.run(cycleId, userIds['Bilal Ahmed'], 360, 'Breakfast', d1Str, 'Desi Paratha & Karak Chai');
  const m2Id = Number(m2.lastInsertRowid);
  const m2Attendees = [userIds['Ali Khan'], userIds['Bilal Ahmed'], userIds['Usman Tariq']];
  const m2Share = Math.round((360 / m2Attendees.length) * 100) / 100;
  for (const uid of m2Attendees) {
    insertAttendee.run(m2Id, uid, m2Share);
  }

  // Meal 3: General Mess Grocery (Spices, Cooking Oil, Dishwash) - Usman paid 1200 for all 4 active members
  const m3 = insertMeal.run(cycleId, userIds['Usman Tariq'], 1200, 'General', d1Str, 'Cooking Oil, Spices, Flour & Tea');
  const m3Id = Number(m3.lastInsertRowid);
  const m3Attendees = [userIds['Ali Khan'], userIds['Bilal Ahmed'], userIds['Usman Tariq'], userIds['Zaid Farooq']];
  const m3Share = Math.round((1200 / m3Attendees.length) * 100) / 100;
  for (const uid of m3Attendees) {
    insertAttendee.run(m3Id, uid, m3Share);
  }

  // Meal 4: Lunch today (Daal Chawal & Salad) - Zaid paid 400 for Ali, Bilal, Usman, Zaid
  const todayStr = today.toISOString().split('T')[0];
  const m4 = insertMeal.run(cycleId, userIds['Zaid Farooq'], 400, 'Lunch', todayStr, 'Moong Daal, Rice & Salad');
  const m4Id = Number(m4.lastInsertRowid);
  const m4Attendees = [userIds['Ali Khan'], userIds['Bilal Ahmed'], userIds['Usman Tariq'], userIds['Zaid Farooq']];
  const m4Share = Math.round((400 / m4Attendees.length) * 100) / 100;
  for (const uid of m4Attendees) {
    insertAttendee.run(m4Id, uid, m4Share);
  }

  // Recalculate cycle balances
  recalculateCycleBalances(cycleId);
  console.log('Seed completed successfully!');
}

/**
 * Recalculate and update the cycle_balances table for a given cycle
 * Net balance formula:
 * carry_over_in + total_spent - total_consumed
 */
export function recalculateCycleBalances(cycleId) {
  const users = db.prepare('SELECT id FROM users').all();
  
  const updateBalance = db.prepare(`
    INSERT INTO cycle_balances (cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
    VALUES (?, ?, 0.0, ?, ?, ?)
    ON CONFLICT(cycle_id, user_id) DO UPDATE SET
      total_spent = excluded.total_spent,
      total_consumed = excluded.total_consumed,
      net_balance = cycle_balances.carry_over_in + excluded.total_spent - excluded.total_consumed
  `);

  for (const u of users) {
    // Total spent by this user in this cycle
    const spentRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0.0) as total
      FROM meals
      WHERE cycle_id = ? AND payer_id = ?
    `).get(cycleId, u.id);
    const totalSpent = Number(spentRow.total || 0);

    // Total consumed by this user in this cycle
    const consumedRow = db.prepare(`
      SELECT COALESCE(SUM(ma.share_amount), 0.0) as total
      FROM meal_attendees ma
      JOIN meals m ON ma.meal_id = m.id
      WHERE m.cycle_id = ? AND ma.user_id = ?
    `).get(cycleId, u.id);
    const totalConsumed = Number(consumedRow.total || 0);

    // Get current carry_over_in
    const existing = db.prepare(`
      SELECT carry_over_in FROM cycle_balances WHERE cycle_id = ? AND user_id = ?
    `).get(cycleId, u.id);
    const carryOver = existing ? Number(existing.carry_over_in || 0) : 0.0;

    const netBalance = Math.round((carryOver + totalSpent - totalConsumed) * 100) / 100;

    updateBalance.run(cycleId, u.id, totalSpent, totalConsumed, netBalance);
  }
}

export default db;
