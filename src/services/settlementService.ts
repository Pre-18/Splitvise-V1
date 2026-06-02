import { db } from "@/lib/db";
import { ActivityType } from "@prisma/client";
import { balanceEngine } from "./balanceEngine";

export class SettlementServiceError extends Error {
  constructor(public message: string, public code: number = 400) {
    super(message);
    this.name = "SettlementServiceError";
  }
}

export const settlementService = {
  async createSettlement(
    groupId: string,
    requestingUserId: string,
    payerId: string,
    payeeId: string,
    amountInPaise: number
  ) {
    // 1. Basic validation
    if (amountInPaise <= 0) {
      throw new SettlementServiceError("Amount must be greater than zero");
    }
    if (payerId === payeeId) {
      throw new SettlementServiceError("Payer and payee cannot be the same person");
    }
    if (requestingUserId !== payerId && requestingUserId !== payeeId) {
      throw new SettlementServiceError("You can only record settlements involving yourself", 403);
    }

    return db.$transaction(async (tx) => {
      // 2. Verify both users are in the group
      const memberships = await tx.groupMember.findMany({
        where: {
          groupId,
          userId: { in: [payerId, payeeId] },
        },
      });

      if (memberships.length !== 2) {
        throw new SettlementServiceError("Both users must be members of the group", 403);
      }

      // 3. Debt Relationship Validation
      // We must fetch the current simplified debts to ensure the settlement direction is mathematically valid.
      // We can reuse the balanceEngine. To avoid transaction conflicts, we fetch the raw data within the transaction.
      const expenses = await tx.expense.findMany({
        where: { groupId, deletedAt: null },
        include: { participants: true },
      });
      const settlements = await tx.settlement.findMany({
        where: { groupId },
      });

      const netBalances = balanceEngine.calculateNetBalances(expenses, settlements);
      const simplifiedDebts = balanceEngine.simplifyDebts(netBalances);

      // Check if there is a debt edge from payer to payee
      const validDebt = simplifiedDebts.find((edge) => edge.from === payerId && edge.to === payeeId);

      if (!validDebt) {
        throw new SettlementServiceError("Settlement direction does not match any existing debt relationship");
      }

      // Note: We allow the amount to be anything > 0 (including partial settlements)
      // We do not strictly cap the amount at validDebt.amount, though UX will default to it.

      // 4. Create the Settlement
      const settlement = await tx.settlement.create({
        data: {
          groupId,
          payerId,
          payeeId,
          amountInPaise,
        },
      });

      // 5. Create Activity Log
      const activity = await tx.activityLog.create({
        data: {
          groupId,
          userId: requestingUserId,
          type: ActivityType.SETTLE,
          payload: {
            settlementId: settlement.id,
            payerId,
            payeeId,
            amountInPaise,
          } as any,
        },
        include: { user: { select: { id: true, name: true } } }
      });

      const { realtime } = await import("@/lib/realtime");
      await realtime.trigger(`group-${groupId}`, "new-activity", activity);

      return settlement;
    });
  },
};
