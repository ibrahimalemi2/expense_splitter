import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { showToast } from './Toast';
import { EditMemberModal } from './EditMemberModal';
import { ChangePinModal } from './ChangePinModal';
import { 
  Scale, 
  ArrowRight, 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  ShieldCheck, 
  UserPlus, 
  Home, 
  AlertTriangle, 
  Lock, 
  Coins, 
  Sparkles,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  ChefHat
} from 'lucide-react';

export function SettlementScreen({ settlementData, cookingData, onRefresh, activeCycle }) {
  const { currentUser, isAdmin, users, refreshUsers } = useAuth();

  const [copied, setCopied] = useState(false);
  const [isClosingCycle, setIsClosingCycle] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [carryForwardToggle, setCarryForwardToggle] = useState(true); // Default: Carry Forward
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCookingModal, setShowCookingModal] = useState(false);
  
  // Member Edit & PIN modals state
  const [editingMember, setEditingMember] = useState(null);
  const [pinModalUser, setPinModalUser] = useState(null);

  // New member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPin, setNewMemberPin] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  const { cycle, totalPool = 0, mealCount = 0, balances = [], transfers = [], shareText = '' } = settlementData || {};

  // Admin: Delete a member
  const handleDeleteMember = async (user) => {
    if (!isAdmin) return;
    if (user.id === currentUser?.id) {
      showToast('You cannot delete your own account while logged in.', 'error');
      return;
    }

    if (!window.confirm(`Admin Confirm: Are you sure you want to delete "${user.name}"? All their meals and attendee shares will be cleaned up, and current cycle balances will be recalculated.`)) {
      return;
    }

    try {
      await api.deleteUser(user.id, currentUser);
      showToast(`Member "${user.name}" removed successfully.`);
      await refreshUsers();
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to delete member', 'error');
    }
  };

  // Copy WhatsApp summary text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      showToast('Settlement text copied! Ready to paste into WhatsApp.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  // Admin: Toggle member status (active <-> at_home)
  const handleToggleMemberStatus = async (user) => {
    if (!isAdmin) {
      showToast('Only Admin can toggle At Home status.', 'error');
      return;
    }

    const nextStatus = user.status === 'at_home' ? 'active' : 'at_home';
    setTogglingStatusId(user.id);
    try {
      await api.updateUserStatus(user.id, nextStatus, currentUser);
      showToast(`${user.name} is now marked as ${nextStatus === 'at_home' ? 'At Home 🏠' : 'Active 🟢'}`);
      await refreshUsers();
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Admin: Add new member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || newMemberPin.length !== 4) {
      showToast('Please provide a valid name and 4-digit PIN', 'error');
      return;
    }

    setIsAddingMember(true);
    try {
      await api.createUser({
        name: newMemberName.trim(),
        pin: newMemberPin,
        role: newMemberRole,
        status: 'active',
        avatar_color: '#' + Math.floor(Math.random()*16777215).toString(16)
      }, currentUser);

      showToast(`Added ${newMemberName} to the hostel mess!`);
      setNewMemberName('');
      setNewMemberPin('');
      setShowAddMemberModal(false);
      await refreshUsers();
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to add member', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  // Admin: Finalize and close cycle
  const handleConfirmCloseCycle = async () => {
    setIsClosingCycle(true);
    try {
      const res = await api.closeCycle(carryForwardToggle, currentUser);
      showToast(`Cycle #${res.previousCycleId} closed! Started Cycle #${res.newCycleNumber}`);
      setShowCloseModal(false);
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Failed to close cycle', 'error');
    } finally {
      setIsClosingCycle(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* 1. Header Banner */}
      <div className="glass-card rounded-3xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Cycle #{cycle?.cycle_number || 1} Settlement
              </span>
              <span className="text-xs text-slate-400">
                Period: {cycle?.start_date} {cycle?.end_date ? `to ${cycle.end_date}` : '(Ongoing)'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              Who Owes Whom Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Optimal minimal peer-to-peer cash settlements calculated automatically
            </p>
          </div>

          {/* WhatsApp Copy Button */}
          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-green transition-all tap-active shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Text!' : 'Copy for WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* 2. OPTIMAL CASH TRANSFERS (WHO PAYS WHOM) */}
      <div className="glass-card rounded-3xl p-5 border border-slate-800/90 shadow-glass">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Settlement Transfers</h3>
          </div>
          <span className="text-xs text-slate-400">
            {transfers.length === 0 ? 'All even' : `${transfers.length} transactions required`}
          </span>
        </div>

        {transfers.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-2xl mb-1 block">🎉</span>
            <p className="text-sm font-bold text-emerald-400">All Balances Are Balanced!</p>
            <p className="text-xs text-slate-400 mt-1">Nobody owes anyone anything right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((t, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
              >
                {/* Debtor (Who pays) */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: t.fromColor || '#ef4444' }}
                  >
                    {t.fromName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {t.fromName}
                    </span>
                    <span className="text-[10px] text-rose-400 font-semibold uppercase">
                      (Pays)
                    </span>
                  </div>
                </div>

                {/* Transfer Arrow & Amount */}
                <div className="flex flex-col items-center px-2 shrink-0">
                  <span className="text-sm font-black text-emerald-400">
                    Rs. {t.amount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase">
                    <span>Cash / UPI</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>

                {/* Creditor (Who receives) */}
                <div className="flex items-center gap-2.5 min-w-0 text-right justify-end">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {t.toName}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                      (Gets)
                    </span>
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: t.toColor || '#10b981' }}
                  >
                    {t.toName.charAt(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. INDIVIDUAL MEMBER BALANCES BREAKDOWN */}
      <div className="glass-card rounded-3xl p-5 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-400" />
          Member Balance Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2">Member</th>
                <th className="pb-2 text-right">Carry In</th>
                <th className="pb-2 text-right">Spent</th>
                <th className="pb-2 text-right">Consumed</th>
                <th className="pb-2 text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {balances.map((b) => {
                const net = Math.round(b.net_balance * 100) / 100;
                const isPositive = net > 0.01;
                const isNegative = net < -0.01;

                return (
                  <tr key={b.user_id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: b.avatar_color || '#10b981' }}
                      >
                        {b.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block leading-tight">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {b.status === 'at_home' ? '🏠 At Home' : '🟢 Active'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-400">
                      Rs. {b.carry_over_in}
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-300">
                      Rs. {b.total_spent}
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-400">
                      Rs. {b.total_consumed}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        isPositive
                          ? 'text-emerald-300 bg-emerald-500/10'
                          : isNegative
                            ? 'text-rose-300 bg-rose-500/10'
                            : 'text-slate-400'
                      }`}>
                        {isPositive ? `+Rs. ${net}` : isNegative ? `-Rs. ${Math.abs(net)}` : 'Rs. 0'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ADMIN PANEL & MEMBER STATUS MANAGEMENT */}
      <div className="glass-card rounded-3xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Admin Controls & Member Status</h3>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCookingModal(true)}
                className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 flex items-center gap-1 tap-active"
              >
                <ChefHat className="w-3.5 h-3.5" /> Cooking Queue
              </button>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 tap-active"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Member
              </button>
            </div>
          )}
        </div>

        {/* Member Status List ("At Home / Away" toggle) */}
        <div className="space-y-2 mb-5">
          <p className="text-xs text-slate-400 mb-2">
            Toggle "At Home" status. Members marked "At Home" are excluded by default when adding meals.
          </p>

          {users.map((u) => {
            const isAtHome = u.status === 'at_home';
            const isMe = u.id === currentUser?.id;

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/70 border border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: u.avatar_color || '#10b981' }}
                  >
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {u.name} {isMe && '(You)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {u.role === 'admin' ? '👑 Admin' : 'Regular Member'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {/* Status Toggle (Admin) */}
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleMemberStatus(u)}
                      disabled={togglingStatusId === u.id}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all tap-active ${
                        isAtHome
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                      title={isAtHome ? 'Mark Active' : 'Mark At Home'}
                    >
                      <Home className="w-3 h-3" />
                      <span className="hidden sm:inline">{isAtHome ? 'At Home 🏠' : 'Active'}</span>
                    </button>
                  )}

                  {/* Edit Name & Role (Admin only) */}
                  {isAdmin && (
                    <button
                      onClick={() => setEditingMember(u)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700 transition-colors"
                      title="Edit Member Name & Role"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Change PIN (Admin for anyone, or user for themselves) */}
                  {(isAdmin || isMe) && (
                    <button
                      onClick={() => setPinModalUser(u)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-slate-700 transition-colors"
                      title={isMe ? 'Change Your 4-Digit PIN' : `Change PIN for ${u.name}`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Member (Admin only, cannot delete self) */}
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => handleDeleteMember(u)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                      title={`Delete Member ${u.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Read-only status for non-admin */}
                  {!isAdmin && (
                    <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${
                      isAtHome ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isAtHome ? '🏠 At Home' : '🟢 Active'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. CLOSE CYCLE ACTION */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Close Current Cycle #{cycle?.cycle_number || 1}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Finalize this cycle. Choose to either carry forward remaining debts into Cycle #{Number(cycle?.cycle_number || 1) + 1} or start fresh after cash settlement.
              </p>
            </div>

            {isAdmin ? (
              <button
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-glow-red transition-all tap-active shrink-0"
              >
                Close Cycle
              </button>
            ) : (
              <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" /> Admin Only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CLOSE CYCLE CONFIRMATION MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-5 border border-slate-800 shadow-glass">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Finalize & Close Cycle #{cycle?.cycle_number}?</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Closing this cycle will archive all {mealCount} meals and prepare Cycle #{Number(cycle?.cycle_number || 1) + 1}.
            </p>

            {/* Carry Forward Option Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 mb-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={carryForwardToggle}
                  onChange={(e) => setCarryForwardToggle(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-500 rounded bg-slate-800 border-slate-700 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Carry Over Debts to Next Cycle
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {carryForwardToggle
                      ? '✅ Unpaid positive/negative balances will automatically become the starting balance of the new cycle.'
                      : '❌ "Mark Settle as Cash Paid" — all members start the new cycle with Rs. 0.00 clean balance (members pay each other in cash now).'}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseCycle}
                disabled={isClosingCycle}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {isClosingCycle ? 'Closing Cycle...' : 'Confirm & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-5 border border-slate-800 shadow-glass">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Add Roommate
            </h3>
            <p className="text-xs text-slate-400 mb-4">Add a new person to the hostel mess pool</p>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Farhan Siddiqui"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">4-Digit PIN *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={newMemberPin}
                  onChange={(e) => setNewMemberPin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                >
                  <option value="member">Regular Member</option>
                  <option value="admin">Mess Admin</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isAddingMember ? 'Adding...' : 'Add Roommate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER NAME & ROLE MODAL (ADMIN) */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          isOpen={Boolean(editingMember)}
          onClose={() => setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null);
            refreshUsers();
            onRefresh?.();
          }}
        />
      )}

      {/* CHANGE PIN MODAL (MEMBER OR ADMIN) */}
      {pinModalUser && (
        <ChangePinModal
          targetUser={pinModalUser}
          isOpen={Boolean(pinModalUser)}
          onClose={() => setPinModalUser(null)}
          onSuccess={() => {
            setPinModalUser(null);
            refreshUsers();
          }}
        />
      )}

      {/* COOKING DUTY MODAL */}
      {showCookingModal && cookingData && (
        <CookingDutyModal
          isOpen={showCookingModal}
          onClose={() => setShowCookingModal(false)}
          cookingData={cookingData}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
