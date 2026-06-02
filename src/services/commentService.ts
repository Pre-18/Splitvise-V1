import { db } from "@/lib/db";
import { ActivityType } from "@prisma/client";
import { realtime } from "@/lib/realtime";

export class CommentServiceError extends Error {
  constructor(public message: string, public code: number = 400) {
    super(message);
    this.name = "CommentServiceError";
  }
}

export const commentService = {
  async getComments(expenseId: string, requestingUserId: string) {
    // Verify access
    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: {
          include: {
            members: { where: { userId: requestingUserId } },
          },
        },
      },
    });

    if (!expense || expense.group.members.length === 0) {
      throw new CommentServiceError("Expense not found or unauthorized", 404);
    }

    return db.comment.findMany({
      where: { expenseId, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async addComment(expenseId: string, userId: string, text: string) {
    if (!text || text.trim() === "") {
      throw new CommentServiceError("Comment cannot be empty");
    }

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: { group: true },
    });

    if (!expense) throw new CommentServiceError("Expense not found", 404);
    if (expense.deletedAt) throw new CommentServiceError("Cannot comment on a deleted expense", 400);

    return db.$transaction(async (tx) => {
      // 1. Insert Comment
      const comment = await tx.comment.create({
        data: {
          expenseId,
          userId,
          text: text.trim(),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // 2. Insert ActivityLog
      const activity = await tx.activityLog.create({
        data: {
          groupId: expense.groupId,
          userId,
          type: ActivityType.COMMENT_ADDED,
          payload: {
            expenseId,
            commentId: comment.id,
            text: comment.text,
          } as any,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      // 3. Trigger Mock Realtime Events
      // For the specific Expense Details view
      await realtime.trigger(`expense-${expenseId}`, "new-comment", comment);
      
      // For the Group Activity Feed
      await realtime.trigger(`group-${expense.groupId}`, "new-activity", activity);

      return comment;
    });
  },
};
