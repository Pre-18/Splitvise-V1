import { db } from "@/lib/db";
import { SplitType, ActivityType, Prisma } from "@prisma/client";
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateShareSplit,
  calculateUnequalSplit,
  SplitParticipantInput,
} from "@/lib/splitCalculator";

export class ExpenseServiceError extends Error {
  constructor(public message: string, public code: number = 400) {
    super(message);
    this.name = "ExpenseServiceError";
  }
}

export const expenseService = {
  async getGroupExpenses(groupId: string, requestingUserId: string) {
    // 1. Verify user is in group
    const member = await db.groupMember.findUnique({
      where: { userId_groupId: { userId: requestingUserId, groupId } },
    });

    if (!member) {
      throw new ExpenseServiceError("Unauthorized access to group", 403);
    }

    // 2. Fetch non-deleted expenses
    return db.expense.findMany({
      where: { groupId, deletedAt: null },
      include: {
        paidBy: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getExpense(expenseId: string, requestingUserId: string) {
    const expense = await db.expense.findUnique({
      where: { id: expenseId, deletedAt: null },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        group: {
          include: {
            members: { where: { userId: requestingUserId } }
          }
        }
      },
    });

    if (!expense || expense.group.members.length === 0) {
      throw new ExpenseServiceError("Expense not found or unauthorized", 404);
    }

    return expense;
  },

  async createExpense(
    groupId: string,
    requestingUserId: string,
    paidById: string,
    description: string,
    amountInPaise: number,
    splitType: SplitType,
    participantsInput: SplitParticipantInput[]
  ) {
    if (!description || description.trim() === "") {
      throw new ExpenseServiceError("Description is required");
    }
    if (amountInPaise <= 0) {
      throw new ExpenseServiceError("Expense amount must be greater than zero");
    }
    if (participantsInput.length === 0) {
      throw new ExpenseServiceError("Must have at least one participant");
    }

    // 1. Calculate splits using our pure math library
    let splitResults;
    try {
      switch (splitType) {
        case "EQUAL":
          splitResults = calculateEqualSplit(amountInPaise, participantsInput);
          break;
        case "UNEQUAL":
          splitResults = calculateUnequalSplit(amountInPaise, participantsInput);
          break;
        case "PERCENTAGE":
          splitResults = calculatePercentageSplit(amountInPaise, participantsInput);
          break;
        case "SHARE":
          splitResults = calculateShareSplit(amountInPaise, participantsInput);
          break;
        default:
          throw new Error("Invalid split type");
      }
    } catch (error: any) {
      throw new ExpenseServiceError(`Split calculation failed: ${error.message}`);
    }

    // 2. Wrap all DB operations in a transaction
    return db.$transaction(async (tx) => {
      // 2a. Verify all users (requester, payer, participants) are in the group
      const userIdsToCheck = new Set([
        requestingUserId,
        paidById,
        ...participantsInput.map((p) => p.userId),
      ]);

      const groupMembers = await tx.groupMember.findMany({
        where: {
          groupId,
          userId: { in: Array.from(userIdsToCheck) },
        },
      });

      if (groupMembers.length !== userIdsToCheck.size) {
        throw new ExpenseServiceError("One or more users are not members of this group", 403);
      }

      // 3. Create the Expense record
      const expense = await tx.expense.create({
        data: {
          groupId,
          description,
          amountInPaise,
          paidById,
          splitType,
        },
      });

      // 4. Create the ExpenseParticipant records
      const participantData = splitResults.map((res) => {
        const input = participantsInput.find((p) => p.userId === res.userId);
        return {
          expenseId: expense.id,
          userId: res.userId,
          amountInPaise: res.amountInPaise,
          splitValue: input?.splitValue ?? null,
        };
      });

      await tx.expenseParticipant.createMany({
        data: participantData,
      });

      // 5. Log the Activity
      const activity = await tx.activityLog.create({
        data: {
          groupId,
          userId: requestingUserId,
          type: ActivityType.CREATE_EXPENSE,
          payload: {
            expenseId: expense.id,
            description,
            amountInPaise,
          } as any,
        },
        include: { user: { select: { id: true, name: true } } }
      });

      const { realtime } = await import("@/lib/realtime");
      await realtime.trigger(`group-${groupId}`, "new-activity", activity);

      // Fetch the full expense to return
      return tx.expense.findUnique({
        where: { id: expense.id },
        include: {
          participants: true,
        },
      });
    });
  },

  async updateExpense(
    groupId: string,
    expenseId: string,
    requestingUserId: string,
    paidById: string,
    description: string,
    amountInPaise: number,
    splitType: SplitType,
    participantsInput: SplitParticipantInput[]
  ) {
    if (!description || description.trim() === "") throw new ExpenseServiceError("Description is required");
    if (amountInPaise <= 0) throw new ExpenseServiceError("Amount must be greater than zero");
    if (participantsInput.length === 0) throw new ExpenseServiceError("Must have at least one participant");

    let splitResults;
    try {
      switch (splitType) {
        case "EQUAL": splitResults = calculateEqualSplit(amountInPaise, participantsInput); break;
        case "UNEQUAL": splitResults = calculateUnequalSplit(amountInPaise, participantsInput); break;
        case "PERCENTAGE": splitResults = calculatePercentageSplit(amountInPaise, participantsInput); break;
        case "SHARE": splitResults = calculateShareSplit(amountInPaise, participantsInput); break;
        default: throw new Error("Invalid split type");
      }
    } catch (error: any) {
      throw new ExpenseServiceError(`Split calculation failed: ${error.message}`);
    }

    return db.$transaction(async (tx) => {
      // 1. Verify Expense exists and user has access
      const expense = await tx.expense.findUnique({ where: { id: expenseId } });
      if (!expense || expense.groupId !== groupId || expense.deletedAt) {
        throw new ExpenseServiceError("Expense not found or deleted", 404);
      }

      // Authorization check
      if (expense.paidById !== requestingUserId) {
        throw new ExpenseServiceError("Only the expense creator can edit this expense", 403);
      }

      const userIdsToCheck = new Set([requestingUserId, paidById, ...participantsInput.map((p) => p.userId)]);
      const groupMembers = await tx.groupMember.findMany({
        where: { groupId, userId: { in: Array.from(userIdsToCheck) } },
      });
      if (groupMembers.length !== userIdsToCheck.size) {
        throw new ExpenseServiceError("One or more users are not members of this group", 403);
      }

      // 2. Delete old participants
      await tx.expenseParticipant.deleteMany({ where: { expenseId } });

      // 3. Update the Expense
      await tx.expense.update({
        where: { id: expenseId },
        data: { description, amountInPaise, paidById, splitType },
      });

      // 4. Create new participants
      const participantData = splitResults.map((res) => {
        const input = participantsInput.find((p) => p.userId === res.userId);
        return {
          expenseId,
          userId: res.userId,
          amountInPaise: res.amountInPaise,
          splitValue: input?.splitValue ?? null,
        };
      });
      await tx.expenseParticipant.createMany({ data: participantData });

      // 5. Log Activity
      const activity = await tx.activityLog.create({
        data: {
          groupId,
          userId: requestingUserId,
          type: ActivityType.EDIT_EXPENSE,
          payload: { expenseId, description, amountInPaise } as any,
        },
        include: { user: { select: { id: true, name: true } } }
      });

      const { realtime } = await import("@/lib/realtime");
      await realtime.trigger(`group-${groupId}`, "new-activity", activity);

      return tx.expense.findUnique({ where: { id: expenseId }, include: { participants: true } });
    });
  },

  async deleteExpense(
    groupId: string,
    expenseId: string,
    requestingUserId: string
  ) {
    // Wrap in transaction
    return db.$transaction(async (tx) => {
      // 1. Verify membership
      const member = await tx.groupMember.findUnique({
        where: { userId_groupId: { userId: requestingUserId, groupId } },
      });

      if (!member) {
        throw new ExpenseServiceError("Unauthorized", 403);
      }

      // 2. Fetch Expense
      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
      });

      if (!expense || expense.groupId !== groupId) {
        throw new ExpenseServiceError("Expense not found", 404);
      }

      if (expense.deletedAt) {
        throw new ExpenseServiceError("Expense is already deleted");
      }

      // Authorization check
      if (expense.paidById !== requestingUserId) {
        throw new ExpenseServiceError("Only the expense creator can delete this expense", 403);
      }

      // 3. Soft Delete
      const deletedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: { deletedAt: new Date() },
      });

      // 4. Activity Log
      const activity = await tx.activityLog.create({
        data: {
          groupId,
          userId: requestingUserId,
          type: ActivityType.DELETE_EXPENSE,
          payload: {
            expenseId,
            description: expense.description,
          } as any,
        },
        include: { user: { select: { id: true, name: true } } }
      });

      const { realtime } = await import("@/lib/realtime");
      await realtime.trigger(`group-${groupId}`, "new-activity", activity);

      return deletedExpense;
    });
  },
};
