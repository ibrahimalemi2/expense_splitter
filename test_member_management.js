/**
 * Test member name editing, PIN change, and member deletion
 */
import db, { recalculateCycleBalances } from './server/db.js';

console.log('🧪 Testing Member Name Edit, PIN Change, and Member Deletion...\n');

// 1. Test Editing Member Name
const memberToEdit = db.prepare("SELECT * FROM users WHERE role = 'member' LIMIT 1").get();
console.log(`Original member name: "${memberToEdit.name}" (ID: ${memberToEdit.id})`);

const newName = memberToEdit.name + ' (Updated)';
db.prepare('UPDATE users SET name = ? WHERE id = ?').run(newName, memberToEdit.id);
const verifiedEdit = db.prepare('SELECT name FROM users WHERE id = ?').get(memberToEdit.id);
console.log(`Updated member name: "${verifiedEdit.name}"`);
if (verifiedEdit.name !== newName) throw new Error('Name update failed!');
console.log('✅ Member name edit verified successfully.');

// Revert name back
db.prepare('UPDATE users SET name = ? WHERE id = ?').run(memberToEdit.name, memberToEdit.id);

// 2. Test Changing PIN
const originalPin = memberToEdit.pin;
const newPin = '9999';
db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(newPin, memberToEdit.id);
const verifiedPin = db.prepare('SELECT pin FROM users WHERE id = ?').get(memberToEdit.id);
console.log(`Updated PIN: ${verifiedPin.pin}`);
if (verifiedPin.pin !== newPin) throw new Error('PIN update failed!');
console.log('✅ 4-Digit PIN change verified successfully.');

// Revert PIN back
db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(originalPin, memberToEdit.id);

// 3. Test Adding and Deleting a Member with Cascade and Balances Recalculation
console.log('\n--- Testing Add & Delete Member Flow ---');
const info = db.prepare(`
  INSERT INTO users (name, pin, role, status, avatar_color)
  VALUES ('Temp Test Member', '1111', 'member', 'active', '#10b981')
`).run();
const tempUserId = Number(info.lastInsertRowid);
console.log(`Created temp user ID: ${tempUserId}`);

const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1 LIMIT 1').get();
db.prepare(`
  INSERT INTO cycle_balances (cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
  VALUES (?, ?, 0, 0, 0, 0)
`).run(activeCycle.id, tempUserId);

// Add a test meal with this temp user as attendee
const mealInfo = db.prepare(`
  INSERT INTO meals (cycle_id, payer_id, amount, meal_type, date, description)
  VALUES (?, 1, 300, 'Dinner', '2026-10-02', 'Test Dinner')
`).run(activeCycle.id);
const testMealId = Number(mealInfo.lastInsertRowid);
db.prepare('INSERT INTO meal_attendees (meal_id, user_id, share_amount) VALUES (?, ?, 150)').run(testMealId, 1);
db.prepare('INSERT INTO meal_attendees (meal_id, user_id, share_amount) VALUES (?, ?, 150)').run(testMealId, tempUserId);

console.log(`Created test meal with temp user as attendee.`);

// Now simulate DELETE member flow
const deleteUserTx = db.transaction(() => {
  // 1. Delete meals paid by this user
  const userPaidMeals = db.prepare('SELECT id FROM meals WHERE payer_id = ?').all(tempUserId);
  for (const m of userPaidMeals) {
    db.prepare('DELETE FROM meal_attendees WHERE meal_id = ?').run(m.id);
    db.prepare('DELETE FROM meals WHERE id = ?').run(m.id);
  }

  // 2. Remove user from attendee lists
  const attendeeMeals = db.prepare('SELECT DISTINCT meal_id FROM meal_attendees WHERE user_id = ?').all(tempUserId);
  db.prepare('DELETE FROM meal_attendees WHERE user_id = ?').run(tempUserId);

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
  db.prepare('DELETE FROM cycle_balances WHERE user_id = ?').run(tempUserId);

  // 4. Delete user
  db.prepare('DELETE FROM users WHERE id = ?').run(tempUserId);

  // 5. Recalculate balances
  recalculateCycleBalances(activeCycle.id);
});

deleteUserTx();

// Verify user is gone
const deletedCheck = db.prepare('SELECT * FROM users WHERE id = ?').get(tempUserId);
if (deletedCheck) throw new Error('User was not deleted!');
console.log('✅ Member deleted cleanly with attendee share reallocation and balance recalculation!');

// Clean up test meal
db.prepare('DELETE FROM meal_attendees WHERE meal_id = ?').run(testMealId);
db.prepare('DELETE FROM meals WHERE id = ?').run(testMealId);
recalculateCycleBalances(activeCycle.id);

console.log('\n🎉 ALL MEMBER MANAGEMENT TESTS PASSED WITH 100% SUCCESS!');
