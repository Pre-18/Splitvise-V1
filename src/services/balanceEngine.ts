import { db } from "@/lib/db";
import { Expense, ExpenseParticipant, Settlement } from "@prisma/client";

export interface DebtEdge {
  from: string; // Debtor (owes money)
  to: string;   // Creditor (should receive money)
  amount: number; // Amount in paise
}

export type ExpenseWithParticipants = Expense & {
  participants: ExpenseParticipant[];
};

export const balanceEngine = {
  /**
   * Calculates the exact net position (in paise) for every user.
   * Positive balance = user should receive money (Creditor)
   * Negative balance = user owes money (Debtor)
   * 
   * Zero-Sum Invariant: The sum of all values in the returned record is exactly 0.
   */
  calculateNetBalances(
    expenses: ExpenseWithParticipants[],
    settlements: Settlement[]
  ): Record<string, number> {
    const balances: Record<string, number> = {};

    const addBalance = (userId: string, amount: number) => {
      if (!balances[userId]) balances[userId] = 0;
      balances[userId] += amount;
    };

    // 1. Process Expenses
    for (const expense of expenses) {
      if (expense.deletedAt) continue;

      // Payer += expense amount
      addBalance(expense.paidById, expense.amountInPaise);

      // Participants -= participant share
      for (const participant of expense.participants) {
        addBalance(participant.userId, -participant.amountInPaise);
      }
    }

    // 2. Process Settlements
    for (const settlement of settlements) {
      // Payer += settlement amount
      addBalance(settlement.payerId, settlement.amountInPaise);

      // Payee -= settlement amount
      addBalance(settlement.payeeId, -settlement.amountInPaise);
    }

    // Optional: Clean up zero balances to keep map tidy
    for (const userId in balances) {
      if (balances[userId] === 0) {
        delete balances[userId];
      }
    }

    return balances;
  },

  /**
   * Implements a greedy debt simplification strategy.
   * Matches the largest debtor with the largest creditor iteratively.
   */
  simplifyDebts(netBalances: Record<string, number>): DebtEdge[] {
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    let totalSum = 0;

    for (const [userId, balance] of Object.entries(netBalances)) {
      totalSum += balance;
      if (balance < 0) {
        debtors.push({ id: userId, amount: Math.abs(balance) });
      } else if (balance > 0) {
        creditors.push({ id: userId, amount: balance });
      }
    }

    // Enforce Zero-Sum Invariant strictly to catch floating point or data errors
    if (Math.abs(totalSum) !== 0) {
      throw new Error(`Fatal Math Error: Net balances do not sum to zero. Deviation: ${totalSum}`);
    }

    // Sort descending by absolute amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const edges: DebtEdge[] = [];
    let i = 0; // debtors index
    let j = 0; // creditors index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // Settle the minimum of the two
      const settledAmount = Math.min(debtor.amount, creditor.amount);

      edges.push({
        from: debtor.id,
        to: creditor.id,
        amount: settledAmount,
      });

      debtor.amount -= settledAmount;
      creditor.amount -= settledAmount;

      // If debt is cleared, move to next
      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    return edges;
  },

  /**
   * Fetches all group data and returns simplified debts and raw balances.
   */
  async calculateGroupBalances(groupId: string) {
    const [expenses, settlements] = await Promise.all([
      db.expense.findMany({
        where: { groupId, deletedAt: null },
        include: { participants: true },
      }),
      db.settlement.findMany({
        where: { groupId },
      }),
    ]);

    const netBalances = this.calculateNetBalances(expenses, settlements);
    const simplifiedDebts = this.simplifyDebts(netBalances);

    return { netBalances, simplifiedDebts };
  },

  /**
   * Calculates a user's net position across ALL groups for the dashboard summary.
   */
  async getDashboardSummary(userId: string) {
    // We only fetch groups the user is part of
    const memberships = await db.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    const [expenses, settlements] = await Promise.all([
      db.expense.findMany({
        where: { groupId: { in: groupIds }, deletedAt: null },
        include: { participants: true },
      }),
      db.settlement.findMany({
        where: { groupId: { in: groupIds } },
      }),
    ]);

    // Calculate globally (treating all groups as one massive pool)
    const netBalances = this.calculateNetBalances(expenses, settlements);
    const userOverallBalance = netBalances[userId] || 0;

    return {
      overallBalance: userOverallBalance,
      isCreditor: userOverallBalance > 0,
      isDebtor: userOverallBalance < 0,
    };
  },
};
