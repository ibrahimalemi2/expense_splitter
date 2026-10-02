import db from './db.js';

/**
 * Calculate the minimal settlement matrix (who pays whom) for a given cycle.
 * Uses a greedy minimum cash flow simplification algorithm.
 * 
 * Rules:
 * - Positive balance (+Rs. X): The mess owes this user Rs. X (Creditor)
 * - Negative balance (-Rs. X): This user owes the mess Rs. X (Debtor)
 * - Zero balance: Even
 */
export function calculateSettlement(cycleId) {
  // Fetch cycle details
  const cycle = db.prepare('SELECT * FROM cycles WHERE id = ?').get(cycleId);
  if (!cycle) {
    throw new Error(`Cycle with ID ${cycleId} not found`);
  }

  // Fetch balances for this cycle with user information
  const balances = db.prepare(`
    SELECT 
      cb.id,
      cb.cycle_id,
      cb.user_id,
      u.name,
      u.room,
      u.role,
      u.status,
      u.avatar_color,
      cb.carry_over_in,
      cb.total_spent,
      cb.total_consumed,
      cb.net_balance
    FROM cycle_balances cb
    JOIN users u ON cb.user_id = u.id
    WHERE cb.cycle_id = ?
    ORDER BY u.name ASC
  `).all(cycleId);

  // Total spent in this cycle
  const poolRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0.0) as total, COUNT(*) as meal_count
    FROM meals
    WHERE cycle_id = ?
  `).get(cycleId);

  const totalPool = poolRow.total;
  const mealCount = poolRow.meal_count;

  // Split into creditors (positive net) and debtors (negative net)
  // We use round to 2 decimals to prevent floating point inaccuracies
  const creditors = [];
  const debtors = [];

  for (const b of balances) {
    const net = Math.round(b.net_balance * 100) / 100;
    if (net > 0.01) {
      creditors.push({
        userId: b.user_id,
        name: b.name,
        room: b.room,
        color: b.avatar_color,
        amount: net
      });
    } else if (net < -0.01) {
      debtors.push({
        userId: b.user_id,
        name: b.name,
        room: b.room,
        color: b.avatar_color,
        amount: Math.abs(net)
      });
    }
  }

  // Greedy debt simplification
  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0; // index for debtors
  let j = 0; // index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.amount, creditor.amount);
    const roundedSettle = Math.round(settleAmount * 100) / 100;

    if (roundedSettle > 0.01) {
      transfers.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        fromRoom: debtor.room,
        fromColor: debtor.color,
        toUserId: creditor.userId,
        toName: creditor.name,
        toRoom: creditor.room,
        toColor: creditor.color,
        amount: roundedSettle
      });
    }

    debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;

    if (debtor.amount <= 0.01) {
      i++;
    }
    if (creditor.amount <= 0.01) {
      j++;
    }
  }

  // Generate WhatsApp-friendly summary string
  let shareText = `🍲 *Hostel Mess Settlement - Cycle #${cycle.cycle_number}*\n`;
  shareText += `📅 Period: ${cycle.start_date} ${cycle.end_date ? 'to ' + cycle.end_date : '(Active)'}\n`;
  shareText += `💰 Total Mess Pool: Rs. ${totalPool.toLocaleString()}\n`;
  shareText += `🍽️ Total Meals Logged: ${mealCount}\n\n`;

  shareText += `💸 *Who Pays Whom (Settlement Transfers):*\n`;
  if (transfers.length === 0) {
    shareText += `✅ All balances are completely even! Zero transfers needed.\n\n`;
  } else {
    for (const t of transfers) {
      shareText += `👉 *${t.fromName}* pays *${t.toName}*: *Rs. ${t.amount.toLocaleString()}*\n`;
    }
    shareText += `\n`;
  }

  shareText += `📊 *Individual Member Balances:*\n`;
  for (const b of balances) {
    const net = Math.round(b.net_balance * 100) / 100;
    const sign = net > 0 ? '+Rs. ' : (net < 0 ? '-Rs. ' : 'Rs. ');
    const note = net > 0 ? '(Owed / In Profit)' : (net < 0 ? '(Owes Mess)' : '(Settled)');
    shareText += `• ${b.name}${b.status === 'at_home' ? ' 🏠' : ''}: ${sign}${Math.abs(net).toLocaleString()} ${note}\n`;
  }

  return {
    cycle,
    totalPool,
    mealCount,
    balances,
    transfers,
    shareText
  };
}
