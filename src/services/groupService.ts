import { db } from "@/lib/db";

export class GroupServiceError extends Error {
  constructor(public message: string, public code: number = 400) {
    super(message);
    this.name = "GroupServiceError";
  }
}

export const groupService = {
  async createGroup(name: string, creatorId: string) {
    if (!name || name.trim() === "") {
      throw new GroupServiceError("Group name is required");
    }

    // Use Prisma transaction to ensure both group and initial member are created
    return db.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name,
          createdById: creatorId,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: creatorId,
        },
      });

      return group;
    });
  },

  async getUserGroups(userId: string) {
    const memberships = await db.groupMember.findMany({
      where: { userId },
      include: {
        group: true,
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    return memberships.map((m) => m.group);
  },

  async getGroupDetails(groupId: string, requestingUserId: string) {
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    if (!group) {
      throw new GroupServiceError("Group not found", 404);
    }

    const isMember = group.members.some((m) => m.userId === requestingUserId);
    if (!isMember) {
      throw new GroupServiceError("Unauthorized access to group", 403);
    }

    const isOwner = group.createdById === requestingUserId;

    return {
      group: {
        id: group.id,
        name: group.name,
        createdById: group.createdById,
        createdAt: group.createdAt,
      },
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        joinedAt: m.joinedAt,
      })),
      memberCount: group.members.length,
      isOwner,
    };
  },

  async addMemberByEmail(groupId: string, requestingUserId: string, email: string) {
    // 1. Verify requester is part of the group
    const membership = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: requestingUserId,
          groupId,
        },
      },
    });

    if (!membership) {
      throw new GroupServiceError("You must be a member to add others", 403);
    }

    // 2. Find the target user by email
    const userToAdd = await db.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      throw new GroupServiceError("User is not registered on the platform", 404);
    }

    // 3. Check if they are already in the group
    const existingMember = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: userToAdd.id,
          groupId,
        },
      },
    });

    if (existingMember) {
      throw new GroupServiceError("User is already a member of this group", 409);
    }

    // 4. Add them
    await db.groupMember.create({
      data: {
        userId: userToAdd.id,
        groupId,
      },
    });

    return { id: userToAdd.id, name: userToAdd.name, email: userToAdd.email };
  },

  async removeMember(groupId: string, requestingUserId: string, targetUserId: string) {
    const group = await db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new GroupServiceError("Group not found", 404);
    }

    // Only the creator can remove members
    if (group.createdById !== requestingUserId) {
      throw new GroupServiceError("Only the group creator can remove members", 403);
    }

    // Creator cannot remove themselves
    if (targetUserId === group.createdById) {
      throw new GroupServiceError("Group creator cannot be removed", 400);
    }

    // Verify target is actually in the group
    const targetMember = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId,
        },
      },
    });

    if (!targetMember) {
      throw new GroupServiceError("User is not a member of this group", 404);
    }

    // TODO: (Future Milestone) - Enforce zero-balance constraint here before deletion

    await db.groupMember.delete({
      where: { id: targetMember.id },
    });

    return { success: true };
  },
};
