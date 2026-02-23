import type { Balance, Household } from "../types";

interface Props {
  balance: Balance;
  household: Household;
  currentUserId: string;
}

export default function BalanceCard({ balance, household, currentUserId }: Props) {
  const isUserA = currentUserId === household.user_a_id;
  const net = balance.net_balance;
  const partnerExists = household.user_b_id != null;

  // net > 0 means A owes B
  const currentOwes = isUserA ? net > 0 : net < 0;
  const absNet = Math.abs(net);

  return (
    <div className="apple-card rounded-2xl shadow-md p-6 card-enter">
      <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 block">Balance</h3>

      {!partnerExists ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Invite a partner to start tracking shared expenses.</p>
      ) : absNet < 0.01 ? (
        <div className="text-center py-2">
          <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">All settled up!</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No outstanding balance</p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-3xl font-bold tabular-nums">
            <span className={currentOwes ? "text-red-500" : "text-sky-600 dark:text-sky-400"}>
              ${absNet.toFixed(2)}
            </span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {currentOwes ? "You owe your partner" : "Your partner owes you"}
          </p>
        </div>
      )}

      {partnerExists && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">You paid</p>
            <p className="text-lg font-semibold tabular-nums text-gray-800 dark:text-gray-100">
              ${(isUserA ? balance.user_a_paid : balance.user_b_paid).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Partner paid</p>
            <p className="text-lg font-semibold tabular-nums text-gray-800 dark:text-gray-100">
              ${(isUserA ? balance.user_b_paid : balance.user_a_paid).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Your fair share</p>
            <p className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
              ${(isUserA ? balance.user_a_fair_share : balance.user_b_fair_share).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Partner's fair share</p>
            <p className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
              ${(isUserA ? balance.user_b_fair_share : balance.user_a_fair_share).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
