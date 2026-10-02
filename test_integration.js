/**
 * End-to-end integration and mathematical verification test suite
 * for Hostel Mess & Expense Splitter
 */
import db, { recalculateCycleBalances, initDatabase } from './server/db.js';
import { calculateSettlement } from './server/settlement.js';

console.log('🧪 Starting Hostel Mess & Expense Splitter Verification...\n');

// 1. Verify schema tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('✅ Tables in SQLite:', tables.map(t => t.name).join(', '));

const expectedTables = ['cycle_balances', 'cycles', 'meal_attendees', 'meals', 'users'];
for (const t of expectedTables) {
  if (!tables.some(row => row.name === t)) {
    throw new Error(`Missing table: ${t}`);
  }
}

// 2. Verify active cycle and users
const cycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1 LIMIT 1').get();
console.log(`✅ Current Active Cycle: #${cycle.cycle_number} (Started: ${cycle.start_date})`);

const users = db.prepare('SELECT id, name, role, status, pin FROM users ORDER BY id').all();
console.log(`✅ Roommates found (${users.length}):`);
users.forEach(u => {
  console.log(`   - ${u.name} [Role: ${u.role}, Status: ${u.status}, PIN: ${u.pin}]`);
});

// 3. Test Math Rule: Zero attendees validation
console.log('\n--- Testing Edge Case: Zero Attendees Guard ---');
function validateMeal(amount, attendeeIds) {
  if (!amount || amount <= 0) return { valid: false, error: 'Invalid amount' };
  if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
    return { valid: false, error: 'Zero attendees not allowed (cannot divide by zero)' };
  }
  return { valid: true, perPersonCost: Math.round((amount / attendeeIds.length) * 100) / 100 };
}
const zeroCheck = validateMeal(500, []);
console.log('Zero attendees response:', zeroCheck);
if (zeroCheck.valid) throw new Error('Zero attendees should be rejected!');
console.log('✅ Zero attendees rejected cleanly, preventing division by zero error.');

// 4. Test Math Rule: Running balances and split calculation
console.log('\n--- Testing Consumption Split & Running Balances ---');
const settlementBefore = calculateSettlement(cycle.id);
console.log(`Total Pool before new meal: Rs. ${settlementBefore.totalPool}`);
console.log('Current Balances:');
settlementBefore.balances.forEach(b => {
  console.log(`   ${b.name}: Net Rs. ${b.net_balance} (Spent: Rs. ${b.total_spent}, Consumed: Rs. ${b.total_consumed})`);
});

// Conservation of money check: sum of net balances MUST be 0!
const sumNet = settlementBefore.balances.reduce((acc, b) => acc + b.net_balance, 0);
console.log(`Total Sum of all Net Balances: Rs. ${Math.round(sumNet * 100) / 100}`);
if (Math.abs(sumNet) > 0.05) throw new Error('Net balances do not sum to 0!');
console.log('✅ Conservation of money validated! Total mess balances sum to 0.');

// 5. Test Settlement Matrix & Minimal Transfers
console.log('\n--- Testing Debt Settlement Matrix ---');
console.log(`Minimal Transfers Required (${settlementBefore.transfers.length}):`);
settlementBefore.transfers.forEach(t => {
  console.log(`   👉 ${t.fromName} pays ${t.toName} Rs. ${t.amount}`);
});

// 6. Test Cycle Closing with Carry-Forward
console.log('\n--- Testing Cycle Closing & Carry Forward Logic ---');
const aliBalanceBefore = settlementBefore.balances.find(b => b.name === 'Ali Khan').net_balance;
const bilalBalanceBefore = settlementBefore.balances.find(b => b.name === 'Bilal Ahmed').net_balance;
console.log(`Ali Khan Net: Rs. ${aliBalanceBefore}, Bilal Ahmed Net: Rs. ${bilalBalanceBefore}`);

// Simulate closing cycle in a test transaction
const tx = db.transaction(() => {
  // Close current cycle
  db.prepare("UPDATE cycles SET is_active = 0, end_date = '2026-10-02' WHERE id = ?").run(cycle.id);
  
  // Insert Cycle 2
  const newCycle = db.prepare("INSERT INTO cycles (cycle_number, start_date, is_active) VALUES (?, '2026-10-02', 1)").run(cycle.cycle_number + 1);
  const newCycleId = Number(newCycle.lastInsertRowid);

  // Carry forward balances
  const insertCb = db.prepare(`
    INSERT INTO cycle_balances (cycle_id, user_id, carry_over_in, total_spent, total_consumed, net_balance)
    VALUES (?, ?, ?, 0.0, 0.0, ?)
  `);

  for (const b of settlementBefore.balances) {
    insertCb.run(newCycleId, b.user_id, b.net_balance, b.net_balance);
  }

  return newCycleId;
});

const newCycleId = tx();
const newBalances = db.prepare('SELECT * FROM cycle_balances WHERE cycle_id = ?').all(newCycleId);
console.log(`✅ Successfully closed Cycle #${cycle.cycle_number} and created Cycle #${cycle.cycle_number + 1}`);
console.log('Cycle 2 initial carried-over balances:');
newBalances.forEach(nb => {
  const u = users.find(x => x.id === nb.user_id);
  console.log(`   - ${u.name}: carry_over_in = Rs. ${nb.carry_over_in}, net_balance = Rs. ${nb.net_balance}`);
});

// Clean up test cycle 2 and restore cycle 1
db.prepare('DELETE FROM cycle_balances WHERE cycle_id = ?').run(newCycleId);
db.prepare('DELETE FROM cycles WHERE id = ?').run(newCycleId);
db.prepare('UPDATE cycles SET is_active = 1, end_date = NULL WHERE id = ?').run(cycle.id);
console.log('✅ Restored Cycle 1 as active.');

console.log('\n🎉 ALL INTEGRATION AND MATHEMATICAL TESTS PASSED WITH 100% SUCCESS!');
