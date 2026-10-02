import express from 'express';
import db, { recalculateCycleBalances, syncCookingQueue, logActivity } from '../db.js';
import { calculateSettlement } from '../settlement.js';

const router = express.Router();

/**
 * Middleware to check admin role from header or query
 */
function requireAdmin(req, res, next) {
  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  if (role === 'admin') {
    return next();
  }

  if (userId) {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (user && user.role === 'admin') {
      return next();
    }
  }

  return res.status(403).json({
    error: 'Access denied: Admin privileges required to perform this action.'
  });
}

// -------------------------------------------------------------
// 1. AUTH & USERS
// -------------------------------------------------------------

// Get all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, room, role, status, avatar_color, created_at
      FROM users
      ORDER BY name ASC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login with PIN
router.post('/auth/login', (req, res) => {
  const { userId, pin } = req.body;
  if (!userId || !pin) {
    return res.status(400).json({ error: 'User ID and 4-digit PIN are required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.pin.trim() !== String(pin).trim()) {
      return res.status(401).json({ error: 'Incorrect 4-digit PIN. Please try again.' });
    }

    // Return safe user object (excluding raw PIN)
    const { pin: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Add new member
router.post('/users', requireAdmin, (req, res) => {
  const { name, room, pin, role = 'member', status = 'active', avatar_color = '#10b981' } = req.body;
  
  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and 4-digit PIN are required.' });
  }

  if (String(pin).length !== 4) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO users (name, room, pin, role, status, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), room?.trim() || '', String(pin).trim(), role, status, avatar_color);

    const newId = Number(info.lastInsertRowid);

    // Also add to active cycle_balances if an active cycle exists
    const currentCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1 LIMIT 1').get();
    if (currentCycle) {
      db.prepare(`
        INSERT OR IGNORE INTO cycle_balances (cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
        VALUES (?, ?, 0.0, 0.0, 0.0, 0.0)
      `).run(currentCycle.id, newId);
    }

    const newUser = db.prepare('SELECT id, name, room, role, status, avatar_color FROM users WHERE id = ?').get(newId);

    logActivity({
      userId: req.headers['x-user-id'],
      actionType: 'MEMBER_ADDED',
      category: 'member',
      title: 'New Member Added',
      description: `Admin added ${name.trim()} (${role}) to hostel mess`,
      metadata: { newUserId: newId, name: name.trim(), role }
    });

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Toggle "At Home / Active" status
router.patch('/users/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'at_home'].includes(status)) {
    return res.status(400).json({ error: "Status must be either 'active' or 'at_home'." });
  }

  try {
    const result = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updated = db.prepare('SELECT id, name, room, role, status, avatar_color FROM users WHERE id = ?').get(id);

    logActivity({
      userId: req.headers['x-user-id'],
      actionType: 'STATUS_CHANGED',
      category: 'member',
      title: 'Status Updated',
      description: `Admin marked ${updated.name} as ${status === 'active' ? 'Active' : 'Away (At Home)'}`,
      metadata: { targetUserId: id, status }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Edit member name and/or role
router.put('/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, role } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Member name cannot be empty.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newRole = role && ['admin', 'member'].includes(role) ? role : existing.role;

    db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(name.trim(), newRole, id);
    const updated = db.prepare('SELECT id, name, room, role, status, avatar_color FROM users WHERE id = ?').get(id);

    logActivity({
      userId: req.headers['x-user-id'],
      actionType: 'MEMBER_UPDATED',
      category: 'member',
      title: 'Member Details Updated',
      description: `Admin updated member ${updated.name} (Role: ${updated.role})`,
      metadata: { targetUserId: id, name: updated.name, role: updated.role }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete a member
router.delete('/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const requesterId = req.headers['x-user-id'];

  if (requesterId && String(requesterId) === String(id)) {
    return res.status(400).json({ error: 'You cannot delete your own admin account while logged in.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (totalUsers <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last remaining user in the system.' });
    }

    const deleteUserTx = db.transaction(() => {
      // 1. Delete meals paid by this user (and their attendees cascade)
      const userPaidMeals = db.prepare('SELECT id FROM meals WHERE payer_id = ?').all(id);
      for (const m of userPaidMeals) {
        db.prepare('DELETE FROM meal_attendees WHERE meal_id = ?').run(m.id);
        db.prepare('DELETE FROM meals WHERE id = ?').run(m.id);
      }

      // 2. Remove user from attendee lists of other meals, and re-split remaining shares
      const attendeeMeals = db.prepare('SELECT DISTINCT meal_id FROM meal_attendees WHERE user_id = ?').all(id);
      db.prepare('DELETE FROM meal_attendees WHERE user_id = ?').run(id);

      for (const am of attendeeMeals) {
        const remainingAttendees = db.prepare('SELECT user_id FROM meal_attendees WHERE meal_id = ?').all(am.meal_id);
        const meal = db.prepare('SELECT amount FROM meals WHERE id = ?').get(am.meal_id);
        if (meal) {
          if (remainingAttendees.length > 0) {
            const newShare = Math.round((meal.amount / remainingAttendees.length) * 100) / 100;
            db.prepare('UPDATE meal_attendees SET share_amount = ? WHERE meal_id = ?').run(newShare, am.meal_id);
          } else {
            db.prepare('DELETE FROM meals WHERE id = ?').run(am.meal_id);
          }
        }
      }

      // 3. Delete cycle balances
      db.prepare('DELETE FROM cycle_balances WHERE user_id = ?').run(id);

      // 4. Delete user
      db.prepare('DELETE FROM users WHERE id = ?').run(id);

      // 5. Recalculate balances for active cycle
      const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1 LIMIT 1').get();
      if (activeCycle) {
        recalculateCycleBalances(activeCycle.id);
      }
    });

    deleteUserTx();

    logActivity({
      userId: requesterId,
      actionType: 'MEMBER_DELETED',
      category: 'member',
      title: 'Member Removed',
      description: `Admin removed member ${user.name} from hostel mess`,
      metadata: { deletedUserId: id, deletedUserName: user.name }
    });

    res.json({ success: true, message: `Member ${user.name} removed successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Member / Admin: Change 4-digit PIN
router.patch('/users/:id/pin', (req, res) => {
  const { id } = req.params;
  const { currentPin, newPin } = req.body;
  const requesterId = req.headers['x-user-id'];
  const requesterRole = req.headers['x-user-role'];

  const isSelf = requesterId && String(requesterId) === String(id);
  const isAdmin = requesterRole === 'admin';

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'You can only change your own PIN.' });
  }

  const cleanPin = String(newPin || '').trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'New PIN must be exactly 4 numeric digits.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // If changing own PIN, verify current PIN
    if (isSelf && !isAdmin) {
      if (!currentPin || String(currentPin).trim() !== user.pin.trim()) {
        return res.status(400).json({ error: 'Current PIN is incorrect.' });
      }
    }

    db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(cleanPin, id);

    logActivity({
      userId: id,
      userName: user.name,
      userAvatarColor: user.avatar_color,
      actionType: 'PIN_CHANGED',
      category: 'security',
      title: 'PIN Changed',
      description: `${user.name} updated their security PIN`,
      metadata: { userId: id }
    });

    res.json({ success: true, message: 'PIN updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. CYCLES & CYCLES MANAGEMENT
// -------------------------------------------------------------

// Get current active cycle
router.get('/cycles/current', (req, res) => {
  try {
    let cycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1').get();
    
    // If no active cycle, create Cycle 1
    if (!cycle) {
      const todayStr = new Date().toISOString().split('T')[0];
      const info = db.prepare('INSERT INTO cycles (cycle_number, start_date, is_active) VALUES (1, ?, 1)').run(todayStr);
      cycle = db.prepare('SELECT * FROM cycles WHERE id = ?').get(info.lastInsertRowid);
      
      // Initialize cycle balances
      const users = db.prepare('SELECT id FROM users').all();
      const insertCb = db.prepare(`
        INSERT OR IGNORE INTO cycle_balances (cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
        VALUES (?, ?, 0, 0, 0, 0)
      `);
      for (const u of users) {
        insertCb.run(cycle.id, u.id);
      }
    }

    res.json(cycle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all cycles
router.get('/cycles', (req, res) => {
  try {
    const cycles = db.prepare('SELECT * FROM cycles ORDER BY cycle_number DESC').all();
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Close cycle & either carry forward or mark cash settled
router.post('/cycles/close', requireAdmin, (req, res) => {
  const { carryForward = false } = req.body;

  try {
    const currentCycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1').get();
    if (!currentCycle) {
      return res.status(400).json({ error: 'No active cycle found to close.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Wrap in database transaction
    const closeTransaction = db.transaction(() => {
      // 1. Recalculate final balances for the current cycle
      recalculateCycleBalances(currentCycle.id);

      // 2. Mark current cycle as closed with end_date
      db.prepare('UPDATE cycles SET is_active = 0, end_date = ? WHERE id = ?').run(todayStr, currentCycle.id);

      // 3. Fetch final balances of current cycle
      const prevBalances = db.prepare('SELECT user_id, net_balance FROM cycle_balances WHERE cycle_id = ?').all(currentCycle.id);

      // 4. Create new cycle
      const nextCycleNumber = currentCycle.cycle_number + 1;
      const nextCycleInfo = db.prepare(`
        INSERT INTO cycles (cycle_number, start_date, is_active)
        VALUES (?, ?, 1)
      `).run(nextCycleNumber, todayStr);
      const nextCycleId = Number(nextCycleInfo.lastInsertRowid);

      // 5. Initialize cycle_balances for next cycle
      const insertNewBalance = db.prepare(`
        INSERT INTO cycle_balances (cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
        VALUES (?, ?, ?, 0.0, 0.0, ?)
      `);

      for (const pb of prevBalances) {
        // If carryForward is true, net_balance becomes starting carry_over_in
        // If false ("Mark Settle as Cash Paid"), starting balance is 0.00
        const carryIn = carryForward ? Math.round(pb.net_balance * 100) / 100 : 0.0;
        insertNewBalance.run(nextCycleId, pb.user_id, carryIn, carryIn);
      }

      return {
        previousCycleId: currentCycle.id,
        newCycleId: nextCycleId,
        newCycleNumber: nextCycleNumber,
        carryForward
      };
    });

    const result = closeTransaction();

    logActivity({
      userId: req.headers['x-user-id'],
      actionType: 'CYCLE_CLOSED',
      category: 'cycle',
      title: `Cycle #${currentCycle.cycle_number} Closed`,
      description: `Admin closed Cycle #${currentCycle.cycle_number} and started Cycle #${result.newCycleNumber} (Carry-over: ${carryForward ? 'Enabled' : 'Cash Cleared'})`,
      metadata: { closedCycle: currentCycle.cycle_number, newCycle: result.newCycleNumber, carryForward }
    });

    res.json({
      success: true,
      message: `Cycle #${currentCycle.cycle_number} closed. Cycle #${result.newCycleNumber} started!`,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. MEALS (Record, Edit, Delete, Breakdown)
// -------------------------------------------------------------

// Get meals with payer and attendees
router.get('/meals', (req, res) => {
  const { cycle_id } = req.query;

  try {
    let targetCycleId = cycle_id;
    if (!targetCycleId) {
      const active = db.prepare('SELECT id FROM cycles WHERE is_active = 1 LIMIT 1').get();
      if (!active) {
        return res.json([]);
      }
      targetCycleId = active.id;
    }

    const meals = db.prepare(`
      SELECT 
        m.id,
        m.cycle_id,
        m.payer_id,
        m.amount,
        m.meal_type,
        m.date,
        m.description,
        m.created_at,
        u.name as payer_name,
        u.room as payer_room,
        u.avatar_color as payer_color
      FROM meals m
      JOIN users u ON m.payer_id = u.id
      WHERE m.cycle_id = ?
      ORDER BY m.date DESC, m.id DESC
    `).all(targetCycleId);

    // Fetch attendees for each meal
    const attendeeStmt = db.prepare(`
      SELECT 
        ma.meal_id,
        ma.user_id,
        ma.share_amount,
        u.name,
        u.room,
        u.avatar_color,
        u.status
      FROM meal_attendees ma
      JOIN users u ON ma.user_id = u.id
      WHERE ma.meal_id = ?
      ORDER BY u.name ASC
    `);

    const enrichedMeals = meals.map(meal => {
      const attendees = attendeeStmt.all(meal.id);
      const perHeadCost = attendees.length > 0 
        ? Math.round((meal.amount / attendees.length) * 100) / 100 
        : meal.amount;

      return {
        ...meal,
        attendees,
        attendeeCount: attendees.length,
        perPersonCost: perHeadCost
      };
    });

    res.json(enrichedMeals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record a new meal (Any authenticated member)
router.post('/meals', (req, res) => {
  const { payer_id, amount, meal_type, date, description, attendee_ids } = req.body;
  const requesterId = req.headers['x-user-id'];
  const requesterRole = req.headers['x-user-role'];

  // Non-admins can ONLY record meals paid by themselves!
  if (requesterRole !== 'admin' && requesterId && String(payer_id) !== String(requesterId)) {
    return res.status(403).json({ error: 'You can only record meals paid by yourself.' });
  }

  // Validation
  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid amount greater than 0.' });
  }

  if (!payer_id) {
    return res.status(400).json({ error: 'Payer must be selected.' });
  }

  if (!meal_type || !['Breakfast', 'Lunch', 'Dinner', 'General'].includes(meal_type)) {
    return res.status(400).json({ error: 'Invalid meal type selected.' });
  }

  if (!Array.isArray(attendee_ids) || attendee_ids.length === 0) {
    return res.status(400).json({ error: 'At least one attendee must be selected (cannot divide by zero).' });
  }

  const mealDate = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];

  try {
    const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1 LIMIT 1').get();
    if (!activeCycle) {
      return res.status(400).json({ error: 'No active cycle found to record meal in.' });
    }

    const perPersonCost = Math.round((numAmount / attendee_ids.length) * 100) / 100;

    // Check if the payer is the current cook on duty in cooking_queue
    syncCookingQueue();
    const queue = db.prepare(`
      SELECT cq.*, u.name, u.status 
      FROM cooking_queue cq 
      JOIN users u ON cq.user_id = u.id 
      ORDER BY cq.queue_order ASC
    `).all();

    let isCurrentCook = false;
    let currentCook = null;
    let nextCook = null;

    if (queue.length > 0) {
      let currentIndex = queue.findIndex(q => q.is_current === 1);
      if (currentIndex === -1) currentIndex = 0;
      currentCook = queue[currentIndex];

      if (String(currentCook.user_id) === String(payer_id)) {
        isCurrentCook = true;

        // Find next active cook (circular, skipping 'at_home' if possible)
        let nextIndex = (currentIndex + 1) % queue.length;
        for (let offset = 1; offset < queue.length; offset++) {
          const candidateIndex = (currentIndex + offset) % queue.length;
          if (queue[candidateIndex].status === 'active') {
            nextIndex = candidateIndex;
            break;
          }
        }
        nextCook = queue[nextIndex];
      }
    }

    // Transaction to insert meal, attendees, recalculate balances, and advance cooking duty if current cook
    const addMealTx = db.transaction(() => {
      const mealInfo = db.prepare(`
        INSERT INTO meals (cycle_id, payer_id, amount, meal_type, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(activeCycle.id, payer_id, numAmount, meal_type, mealDate, description?.trim() || null);

      const mealId = Number(mealInfo.lastInsertRowid);

      const insertAttendee = db.prepare(`
        INSERT INTO meal_attendees (meal_id, user_id, share_amount)
        VALUES (?, ?, ?)
      `);

      for (const uid of attendee_ids) {
        insertAttendee.run(mealId, uid, perPersonCost);
      }

      // Update balances immediately
      recalculateCycleBalances(activeCycle.id);

      // If this meal was recorded by today's cook, automatically advance their turn!
      if (isCurrentCook && currentCook && nextCook) {
        // 1. Mark current cook done
        db.prepare(`
          UPDATE cooking_queue 
          SET is_current = 0, last_cooked_at = ? 
          WHERE user_id = ?
        `).run(mealDate, currentCook.user_id);

        // 2. Mark next cook as current
        db.prepare(`
          UPDATE cooking_queue 
          SET is_current = 1 
          WHERE user_id = ?
        `).run(nextCook.user_id);

        // 3. Record in cooking_history
        db.prepare(`
          INSERT INTO cooking_history (user_id, date, completed_by)
          VALUES (?, ?, ?)
        `).run(currentCook.user_id, mealDate, requesterId || payer_id);
      }

      // 1. Log activity for the recorded meal
      const payerUser = db.prepare('SELECT name, avatar_color FROM users WHERE id = ?').get(payer_id);
      logActivity({
        userId: payer_id,
        userName: payerUser?.name || 'Unknown',
        userAvatarColor: payerUser?.avatar_color,
        actionType: 'MEAL_RECORDED',
        category: 'meal',
        title: `${meal_type} Recorded`,
        description: `${payerUser?.name || 'Someone'} recorded ${meal_type} for Rs. ${numAmount} (Split among ${attendee_ids.length} members)`,
        metadata: { mealId, amount: numAmount, meal_type, attendeeCount: attendee_ids.length, date: mealDate }
      });

      // If this meal was recorded by today's cook, automatically advance their turn and log handover!
      if (isCurrentCook && currentCook && nextCook) {
        logActivity({
          userId: currentCook.user_id,
          userName: currentCook.name,
          userAvatarColor: currentCook.avatar_color,
          actionType: 'DUTY_HANDOVER',
          category: 'duty',
          title: 'Cooking Duty Handover',
          description: `Cooking turn completed by ${currentCook.name} (spent Rs. ${numAmount}) and passed to ${nextCook.name}!`,
          metadata: { previousCook: currentCook.name, nextCook: nextCook.name, mealId }
        });
      }

      return mealId;
    });

    const createdMealId = addMealTx();
    res.status(201).json({
      success: true,
      mealId: createdMealId,
      dutyCompleted: isCurrentCook,
      previousCook: isCurrentCook ? currentCook.name : null,
      nextCook: isCurrentCook ? nextCook.name : null,
      message: isCurrentCook
        ? `Expense of Rs. ${numAmount} recorded! Cooking duty completed by ${currentCook.name} and handed over to ${nextCook.name}.`
        : `Meal expense of Rs. ${numAmount} recorded successfully!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin ONLY: Edit a meal
router.put('/meals/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { payer_id, amount, meal_type, date, description, attendee_ids } = req.body;
  const requesterId = req.headers['x-user-id'];

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid amount greater than 0.' });
  }

  if (!Array.isArray(attendee_ids) || attendee_ids.length === 0) {
    return res.status(400).json({ error: 'At least one attendee must be selected.' });
  }

  try {
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(id);
    if (!meal) {
      return res.status(404).json({ error: 'Meal entry not found.' });
    }

    const perPersonCost = Math.round((numAmount / attendee_ids.length) * 100) / 100;
    const mealDate = date ? String(date).split('T')[0] : meal.date;

    const editMealTx = db.transaction(() => {
      // 1. Update meal record
      db.prepare(`
        UPDATE meals
        SET payer_id = ?, amount = ?, meal_type = ?, date = ?, description = ?
        WHERE id = ?
      `).run(payer_id || meal.payer_id, numAmount, meal_type || meal.meal_type, mealDate, description?.trim() || null, id);

      // 2. Remove previous attendees
      db.prepare('DELETE FROM meal_attendees WHERE meal_id = ?').run(id);

      // 3. Insert new attendees
      const insertAttendee = db.prepare(`
        INSERT INTO meal_attendees (meal_id, user_id, share_amount)
        VALUES (?, ?, ?)
      `);
      for (const uid of attendee_ids) {
        insertAttendee.run(id, uid, perPersonCost);
      }

      // 4. Recalculate balances
      recalculateCycleBalances(meal.cycle_id);

      // 5. Log activity
      logActivity({
        userId: requesterId,
        actionType: 'MEAL_EDITED',
        category: 'meal',
        title: 'Meal Entry Edited',
        description: `Admin edited meal #${id} to Rs. ${numAmount} (${meal_type || meal.meal_type})`,
        metadata: { mealId: id, amount: numAmount, meal_type: meal_type || meal.meal_type }
      });
    });

    editMealTx();
    res.json({ success: true, message: 'Meal updated successfully by admin.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin ONLY: Delete a meal
router.delete('/meals/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const requesterId = req.headers['x-user-id'];

  try {
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(id);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found.' });
    }

    const deleteMealTx = db.transaction(() => {
      db.prepare('DELETE FROM meals WHERE id = ?').run(id);
      recalculateCycleBalances(meal.cycle_id);

      // Log activity
      logActivity({
        userId: requesterId,
        actionType: 'MEAL_DELETED',
        category: 'meal',
        title: 'Meal Entry Deleted',
        description: `Admin deleted meal #${id} (${meal.meal_type}, Rs. ${meal.amount})`,
        metadata: { mealId: id, amount: meal.amount, meal_type: meal.meal_type }
      });
    });

    deleteMealTx();
    res.json({ success: true, message: 'Meal entry deleted successfully by admin.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. DASHBOARD & SETTLEMENT METRICS
// -------------------------------------------------------------

// Dashboard metrics for current user
router.get('/dashboard', (req, res) => {
  const { user_id } = req.query;

  try {
    const activeCycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1').get();
    if (!activeCycle) {
      return res.json({
        hasCycle: false,
        personalCard: null,
        stats: { totalPool: 0, activeEatersToday: 0, mealCount: 0 }
      });
    }

    // Total mess pool and meal count
    const poolData = db.prepare(`
      SELECT COALESCE(SUM(amount), 0.0) as totalPool, COUNT(*) as mealCount
      FROM meals
      WHERE cycle_id = ?
    `).get(activeCycle.id);

    // Active eaters today
    const todayStr = new Date().toISOString().split('T')[0];
    const eatersTodayRow = db.prepare(`
      SELECT COUNT(DISTINCT ma.user_id) as activeToday
      FROM meal_attendees ma
      JOIN meals m ON ma.meal_id = m.id
      WHERE m.cycle_id = ? AND m.date = ?
    `).get(activeCycle.id, todayStr);

    const activeUsersCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get().count;

    // Personal user status card
    let personalCard = null;
    if (user_id) {
      const user = db.prepare('SELECT id, name, room, role, status FROM users WHERE id = ?').get(user_id);
      const balance = db.prepare(`
        SELECT carry_over_in, total_spent, total_consumed, net_balance
        FROM cycle_balances
        WHERE cycle_id = ? AND user_id = ?
      `).get(activeCycle.id, user_id);

      if (user && balance) {
        const net = Math.round(balance.net_balance * 100) / 100;
        personalCard = {
          userName: user.name,
          userRoom: user.room,
          role: user.role,
          status: user.status,
          netBalance: net,
          totalSpent: balance.total_spent,
          totalConsumed: balance.total_consumed,
          carryOverIn: balance.carry_over_in,
          isOwed: net > 0.01,
          owes: net < -0.01,
          isEven: Math.abs(net) <= 0.01
        };
      }
    }

    // All roommates quick summary
    const roommates = db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.room, 
        u.status, 
        u.role, 
        u.avatar_color,
        COALESCE(cb.net_balance, 0.0) as net_balance
      FROM users u
      LEFT JOIN cycle_balances cb ON u.id = cb.user_id AND cb.cycle_id = ?
      ORDER BY u.name ASC
    `).all(activeCycle.id);

    // Recent 5 meals in this cycle
    const recentMeals = db.prepare(`
      SELECT 
        m.id, 
        m.amount, 
        m.meal_type, 
        m.date, 
        m.description,
        u.name as payer_name
      FROM meals m
      JOIN users u ON m.payer_id = u.id
      WHERE m.cycle_id = ?
      ORDER BY m.date DESC, m.id DESC
      LIMIT 5
    `).all(activeCycle.id);

    res.json({
      hasCycle: true,
      cycle: activeCycle,
      personalCard,
      stats: {
        totalPool: poolData.totalPool,
        mealCount: poolData.mealCount,
        activeEatersToday: eatersTodayRow.activeToday || activeUsersCount,
        totalActiveMembers: activeUsersCount
      },
      roommates,
      recentMeals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settlement matrix & transfers
router.get('/settlement', (req, res) => {
  const { cycle_id } = req.query;

  try {
    let targetCycleId = cycle_id;
    if (!targetCycleId) {
      const active = db.prepare('SELECT id FROM cycles WHERE is_active = 1 LIMIT 1').get();
      if (!active) {
        return res.status(404).json({ error: 'No active cycle found.' });
      }
      targetCycleId = active.id;
    }

    // Always ensure balances are fresh
    recalculateCycleBalances(targetCycleId);

    const settlementData = calculateSettlement(targetCycleId);
    res.json(settlementData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. COOKING DUTY ROTATION / QUEUE
// -------------------------------------------------------------

// Get cooking roster, current cook, next cook, and user position
router.get('/cooking-duty', (req, res) => {
  const userId = req.query.user_id || req.headers['x-user-id'];

  try {
    syncCookingQueue();

    const queue = db.prepare(`
      SELECT 
        cq.id as queue_id,
        cq.user_id,
        cq.queue_order,
        cq.is_current,
        cq.last_cooked_at,
        u.name,
        u.role,
        u.status,
        u.avatar_color
      FROM cooking_queue cq
      JOIN users u ON cq.user_id = u.id
      ORDER BY cq.queue_order ASC
    `).all();

    if (queue.length === 0) {
      return res.json({ currentCook: null, nextCook: null, queue: [], myDuty: null });
    }

    // Locate current cook index
    let currentIndex = queue.findIndex(q => q.is_current === 1);
    if (currentIndex === -1) {
      currentIndex = 0;
      db.prepare('UPDATE cooking_queue SET is_current = 1 WHERE user_id = ?').run(queue[0].user_id);
      queue[0].is_current = 1;
    }

    const currentCook = queue[currentIndex];

    // Find next cook (circular, preferring active members)
    let nextIndex = (currentIndex + 1) % queue.length;
    for (let offset = 1; offset < queue.length; offset++) {
      const candidateIndex = (currentIndex + offset) % queue.length;
      if (queue[candidateIndex].status === 'active') {
        nextIndex = candidateIndex;
        break;
      }
    }
    const nextCook = queue[nextIndex];

    // Calculate turns away for each member in queue
    const enrichedQueue = queue.map((member, idx) => {
      let turnsAway = 0;
      if (idx === currentIndex) {
        turnsAway = 0;
      } else if (idx > currentIndex) {
        turnsAway = idx - currentIndex;
      } else {
        turnsAway = queue.length - currentIndex + idx;
      }

      let turnLabel = '';
      if (turnsAway === 0) {
        turnLabel = 'Cooking Today 🍳';
      } else if (turnsAway === 1) {
        turnLabel = 'Tomorrow';
      } else {
        turnLabel = `In ${turnsAway} days`;
      }

      return {
        ...member,
        turnsAway,
        turnLabel
      };
    });

    // Specific user duty summary
    let myDuty = null;
    if (userId) {
      const myItem = enrichedQueue.find(q => String(q.user_id) === String(userId));
      if (myItem) {
        myDuty = {
          isMyTurn: myItem.turnsAway === 0,
          turnsAway: myItem.turnsAway,
          turnLabel: myItem.turnLabel,
          name: myItem.name
        };
      }
    }

    // Recent 5 cooking completions
    const history = db.prepare(`
      SELECT 
        ch.id,
        ch.date,
        ch.created_at,
        u.name as cook_name,
        u.avatar_color,
        u2.name as marked_by_name
      FROM cooking_history ch
      JOIN users u ON ch.user_id = u.id
      LEFT JOIN users u2 ON ch.completed_by = u2.id
      ORDER BY ch.id DESC
      LIMIT 5
    `).all();

    res.json({
      currentCook,
      nextCook,
      queue: enrichedQueue,
      myDuty,
      totalCooks: queue.length,
      history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete today's cooking and advance turn to next person
router.post('/cooking-duty/complete', (req, res) => {
  const requesterId = req.headers['x-user-id'];
  const requesterRole = req.headers['x-user-role'];

  try {
    syncCookingQueue();

    const queue = db.prepare(`
      SELECT cq.*, u.name, u.status 
      FROM cooking_queue cq 
      JOIN users u ON cq.user_id = u.id 
      ORDER BY cq.queue_order ASC
    `).all();

    if (queue.length === 0) {
      return res.status(400).json({ error: 'Cooking queue is empty.' });
    }

    let currentIndex = queue.findIndex(q => q.is_current === 1);
    if (currentIndex === -1) currentIndex = 0;
    const currentCook = queue[currentIndex];

    // Check authorization: manual skip/advance without recording expense requires Admin
    const isAdmin = requesterRole === 'admin';
    if (!isAdmin) {
      return res.status(403).json({
        error: `To complete your cooking duty, please record your meal expense via '+ Record Meal'.`
      });
    }

    // Find next cook (circular, skipping 'at_home' if active members exist)
    let nextIndex = (currentIndex + 1) % queue.length;
    for (let offset = 1; offset < queue.length; offset++) {
      const candidateIndex = (currentIndex + offset) % queue.length;
      if (queue[candidateIndex].status === 'active') {
        nextIndex = candidateIndex;
        break;
      }
    }
    const nextCook = queue[nextIndex];
    const todayStr = new Date().toISOString().split('T')[0];

    // Transaction to update turns and record history
    const completeTx = db.transaction(() => {
      // 1. Mark current cook done
      db.prepare(`
        UPDATE cooking_queue 
        SET is_current = 0, last_cooked_at = ? 
        WHERE user_id = ?
      `).run(todayStr, currentCook.user_id);

      // 2. Mark next cook as current
      db.prepare(`
        UPDATE cooking_queue 
        SET is_current = 1 
        WHERE user_id = ?
      `).run(nextCook.user_id);

      // 3. Record in history
      db.prepare(`
        INSERT INTO cooking_history (user_id, date, completed_by)
        VALUES (?, ?, ?)
      `).run(currentCook.user_id, todayStr, requesterId || null);

      // 4. Log activity
      logActivity({
        userId: requesterId || currentCook.user_id,
        userName: currentCook.name,
        userAvatarColor: currentCook.avatar_color,
        actionType: 'DUTY_HANDOVER',
        category: 'duty',
        title: 'Cooking Duty Handover',
        description: `Cooking duty completed by ${currentCook.name}! Handed over to ${nextCook.name}.`,
        metadata: { previousCook: currentCook.name, nextCook: nextCook.name }
      });
    });

    completeTx();

    res.json({
      success: true,
      message: `Cooking duty completed by ${currentCook.name}! Handed over to ${nextCook.name}.`,
      previousCook: currentCook.name,
      newCook: nextCook.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Set a specific user as today's cook directly
router.patch('/cooking-duty/set-current', requireAdmin, (req, res) => {
  const { userId } = req.body;
  const requesterId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    db.transaction(() => {
      db.prepare('UPDATE cooking_queue SET is_current = 0').run();
      db.prepare('UPDATE cooking_queue SET is_current = 1 WHERE user_id = ?').run(userId);

      logActivity({
        userId: requesterId,
        actionType: 'DUTY_ASSIGNED',
        category: 'duty',
        title: "Today's Cook Assigned",
        description: `Admin assigned ${user.name} as today's cook`,
        metadata: { cookId: userId, cookName: user.name }
      });
    })();

    res.json({ success: true, message: `Set ${user.name} as today's cook!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reorder the queue order
router.put('/cooking-duty/reorder', requireAdmin, (req, res) => {
  const { orderedUserIds } = req.body;
  const requesterId = req.headers['x-user-id'];

  if (!Array.isArray(orderedUserIds) || orderedUserIds.length === 0) {
    return res.status(400).json({ error: 'orderedUserIds array is required.' });
  }

  try {
    const reorderTx = db.transaction(() => {
      const updateStmt = db.prepare('UPDATE cooking_queue SET queue_order = ? WHERE user_id = ?');
      orderedUserIds.forEach((uid, index) => {
        updateStmt.run(index, uid);
      });

      logActivity({
        userId: requesterId,
        actionType: 'DUTY_REORDERED',
        category: 'duty',
        title: 'Cooking Queue Reordered',
        description: `Admin updated cooking duty roster order (${orderedUserIds.length} members)`,
        metadata: { totalMembers: orderedUserIds.length }
      });
    });

    reorderTx();
    res.json({ success: true, message: 'Cooking queue order updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Skip current cook without recording completion
router.post('/cooking-duty/skip', requireAdmin, (req, res) => {
  const requesterId = req.headers['x-user-id'];

  try {
    const queue = db.prepare(`
      SELECT cq.*, u.name, u.status, u.avatar_color
      FROM cooking_queue cq 
      JOIN users u ON cq.user_id = u.id 
      ORDER BY cq.queue_order ASC
    `).all();

    if (queue.length === 0) {
      return res.status(400).json({ error: 'Cooking queue is empty.' });
    }

    let currentIndex = queue.findIndex(q => q.is_current === 1);
    if (currentIndex === -1) currentIndex = 0;
    const currentCook = queue[currentIndex];

    let nextIndex = (currentIndex + 1) % queue.length;
    for (let offset = 1; offset < queue.length; offset++) {
      const candidateIndex = (currentIndex + offset) % queue.length;
      if (queue[candidateIndex].status === 'active') {
        nextIndex = candidateIndex;
        break;
      }
    }
    const nextCook = queue[nextIndex];

    db.transaction(() => {
      db.prepare('UPDATE cooking_queue SET is_current = 0 WHERE user_id = ?').run(currentCook.user_id);
      db.prepare('UPDATE cooking_queue SET is_current = 1 WHERE user_id = ?').run(nextCook.user_id);

      logActivity({
        userId: requesterId,
        actionType: 'DUTY_SKIPPED',
        category: 'duty',
        title: 'Cooking Turn Skipped',
        description: `Admin skipped ${currentCook.name}'s turn and passed to ${nextCook.name}`,
        metadata: { skippedCook: currentCook.name, nextCook: nextCook.name }
      });
    })();

    res.json({
      success: true,
      message: `Skipped ${currentCook.name}. Today's cook is now ${nextCook.name}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. ACTIVITY LOGS (AUDIT TRAIL)
// -------------------------------------------------------------

// Get audit logs with optional category filter and search
router.get('/logs', (req, res) => {
  const { category, limit = 100, search } = req.query;

  try {
    let query = `
      SELECT 
        l.id,
        l.user_id,
        l.user_name,
        l.user_avatar_color,
        l.action_type,
        l.category,
        l.title,
        l.description,
        l.metadata,
        l.created_at,
        u.avatar_color as latest_avatar_color
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ' AND l.category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      query += ' AND (l.description LIKE ? OR l.title LIKE ? OR l.user_name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY l.id DESC LIMIT ?';
    params.push(Math.min(Number(limit) || 100, 200));

    const rows = db.prepare(query).all(...params);
    const enriched = rows.map(r => ({
      ...r,
      user_avatar_color: r.latest_avatar_color || r.user_avatar_color || '#10b981',
      metadata: r.metadata ? JSON.parse(r.metadata) : null
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
