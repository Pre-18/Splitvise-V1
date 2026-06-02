import { db } from "@/lib/db";

export class ActivityServiceError extends Error {
  constructor(public message: string, public code: number = 400) {
    super(message);
    this.name = "ActivityServiceError";
  }
}

export const activityService = {
  async getGroupActivity(groupId: string, requestingUserId: string) {
    // Verify user is in group
    const member = await db.groupMember.findUnique({
      where: { userId_groupId: { userId: requestingUserId, groupId } },
    });

    if (!member) {
      throw new ActivityServiceError("Unauthorized access to group activity", 403);
    }

    // Fetch feed
    return db.activityLog.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to recent 100 for performance
    });
  },
};
