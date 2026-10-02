# 🍲 Hostel Mess & Expense Splitter

A mobile-first, responsive Web Application designed for hostel roommates to effortlessly manage daily meals, per-person splits, running balances, at-home leaves, and cycle debt settlements with zero hassle.

Built with **React 19**, **Tailwind CSS**, **Lucide-react icons**, **Node.js/Express**, and **SQLite (via `better-sqlite3`)**.

---

## 🚀 Quick Start

The full-stack application runs both the Express backend and the Vite client simultaneously.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application is served at **`http://localhost:5000`** (Express API + Vite SPA).

---

## 🔑 Pre-Seeded Roommates & 4-Digit PINs

| Roommate | Role | Initial Status | Default 4-Digit PIN | Notes |
|---|---|---|---|---|
| **Ali Khan** | 👑 `admin` | 🟢 Active | `1234` | Full admin privileges (edit/delete meals, close cycles, toggle status) |
| **Bilal Ahmed** | 👤 `member` | 🟢 Active | `2345` | Regular member (add meals, view dashboards, immutable records) |
| **Usman Tariq** | 👤 `member` | 🟢 Active | `3456` | Regular member |
| **Hamza Sheikh** | 👤 `member` | 🏠 At Home | `4567` | Pre-marked **At Home** (automatically unchecked from meals) |
| **Zaid Farooq** | 👤 `member` | 🟢 Active | `5678` | Regular member |

> **Pro Tip**: The login screen includes **1-Tap Demo Login shortcuts** for both Ali (Admin) and Bilal (Member) for instantaneous testing!

---

## 🧮 Core Logic & Math Rules

### 1. Per-Meal Consumption Split
- When an expense is recorded:
  $$\text{Per-Person Cost} = \frac{\text{Amount}}{\text{Number of Selected Attendees}}$$
  - **Zero Division Protection**: Guard prevents submitting with 0 attendees.
  - **Payer Credit**:
    - If the payer ate: balance credited by $+(\text{Amount} - \text{Per-Person Cost})$.
    - If the payer did not eat (e.g. general grocery shopping): balance credited by $+\text{Amount}$.
  - **Attendee Debit**: Each attendee's balance is debited by $-\text{Per-Person Cost}$.
  - **Non-attendees**: Debited 0.

### 2. Running Balances & Mathematical Conservation
- **Positive balance (+Rs. X)**: The mess owes money to this person (in credit / profit).
- **Negative balance (-Rs. X)**: This person owes money to the mess (debt).
- **Conservation of Money**: Across all members, the sum of all net balances always equals **0.00**.

### 3. Cycle Reset & Carry-Forward
- When an admin closes a cycle:
  - Generates an optimal **Settlement Matrix** using a greedy debt simplification algorithm to minimize cash transfers between roommates.
  - Provides a toggle:
    - **Carry Over Debts to Next Cycle**: Unpaid positive/negative balances automatically become the starting balance (`carry_over_in`) of Cycle N+1.
    - **Mark Settle as Cash Paid**: All members start Cycle N+1 with a fresh **Rs. 0.00** balance.

### 5. 👨‍🍳 Cooking Duty Rotation / Queue
- **Today's Cook**: Prominently displayed on every roommate's dashboard (e.g. `Atiqullah`).
- **Next Cook**: Displays who is on duty tomorrow (e.g. `Mir Hamza`).
- **Personal Turn Countdown**: Every roommate sees exactly when their turn is coming up (`Your turn is Tomorrow!`, `Your turn is in 3 days`, or `It's YOUR Turn to Cook Today!`).
- **Handover**: The current cook or admin can click **"Mark Done & Handover"**, instantly advancing the duty to the next person in queue.
- **Admin Queue Management**:
  - Reorder rotation with ▲ / ▼ arrows.
  - Set any member as today's cook directly.
  - Skip current cook if away.
  - View completion history log.

---

## 🗄️ Database Schema (SQLite)

1. `users` (`id`, `name`, `pin`, `role`, `status`, `avatar_color`, `created_at`)
2. `cycles` (`id`, `cycle_number`, `start_date`, `end_date`, `is_active`, `created_at`)
3. `meals` (`id`, `cycle_id`, `payer_id`, `amount`, `meal_type`, `date`, `description`, `created_at`)
4. `meal_attendees` (`meal_id`, `user_id`, `share_amount`)
5. `cycle_balances` (`id`, `cycle_id`, `user_id`, `carry_over_in`, `total_spent`, `total_consumed`, `net_balance`)
6. `cooking_queue` (`id`, `user_id`, `queue_order`, `is_current`, `last_cooked_at`, `created_at`)
7. `cooking_history` (`id`, `user_id`, `date`, `completed_by`, `created_at`)

Database file is stored in `data/mess_splitter.db` with WAL mode and foreign key constraints enabled.

---

## 📱 App Screens Overview

- **Screen 1: PIN Login**: Profile picker with role badges, 4-digit PIN pad with error shake, and 1-tap demo shortcuts.
- **Screen 2: Dashboard**: Personal Status Card (high-impact green/red badge: "You are owed Rs. X" or "You owe Rs. X"), **Cooking Duty Card** (Today's cook, Next cook, personal turn countdown, handover button), quick "+ Record New Meal" button, summary stats (Total Cycle Pool, Active Eaters Today), and roommates running balance list.
- **Screen 3: Add Meal Modal**: Amount input, Meal Type selector (**Dinner selected by default**), attendee checklist with active roommates pre-checked and **At Home roommates unchecked**, live per-head split calculator preview.
- **Screen 4: Transaction Feed**: Filterable list of past entries with expandable attendees, per-head split, and admin edit/delete controls.
- **Screen 5: Settlement & Admin Panel**: Who owes whom matrix with directional payment cards, 1-click **Copy for WhatsApp** summary, member "At Home / Active" status toggling, **Cooking Duty Manager** (reorder queue & set current cook), add new member modal, and cycle closing modal with carry-forward toggle.
