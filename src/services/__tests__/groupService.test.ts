import { describe, it, expect, vi, beforeEach } from "vitest";
import { groupService, GroupServiceError } from "../groupService";
import { db } from "@/lib/db";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";

// Mock the db instance
vi.mock("@/lib/db", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    db: mockDeep<PrismaClient>(),
  };
});

const prismaMock = db as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe("groupService", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe("createGroup", () => {
    it("should throw error if name is empty", async () => {
      await expect(groupService.createGroup("", "user1")).rejects.toThrowError(GroupServiceError);
    });

    it("should create a group and membership via transaction", async () => {
      // Mock the transaction to just execute the callback
      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock as any);
      });

      prismaMock.group.create.mockResolvedValue({
        id: "g1",
        name: "Test Group",
        createdById: "u1",
        createdAt: new Date(),
      });

      prismaMock.groupMember.create.mockResolvedValue({
        id: "gm1",
        userId: "u1",
        groupId: "g1",
        joinedAt: new Date(),
      });

      const result = await groupService.createGroup("Test Group", "u1");
      expect(result.id).toBe("g1");
      expect(prismaMock.group.create).toHaveBeenCalled();
      expect(prismaMock.groupMember.create).toHaveBeenCalled();
    });
  });

  describe("addMemberByEmail", () => {
    it("should throw if requesting user is not in the group", async () => {
      prismaMock.groupMember.findUnique.mockResolvedValue(null);
      await expect(groupService.addMemberByEmail("g1", "u1", "test@example.com")).rejects.toThrowError(
        /must be a member/
      );
    });

    it("should throw if target user doesn't exist", async () => {
      prismaMock.groupMember.findUnique.mockResolvedValue({} as any); // Requester exists
      prismaMock.user.findUnique.mockResolvedValue(null); // Target doesn't
      await expect(groupService.addMemberByEmail("g1", "u1", "ghost@example.com")).rejects.toThrowError(
        /not registered/
      );
    });

    it("should throw if target user is already in the group", async () => {
      prismaMock.groupMember.findUnique
        .mockResolvedValueOnce({} as any) // Requester
        .mockResolvedValueOnce({} as any); // Target existing

      prismaMock.user.findUnique.mockResolvedValue({ id: "u2" } as any);

      await expect(groupService.addMemberByEmail("g1", "u1", "exists@example.com")).rejects.toThrowError(
        /already a member/
      );
    });
  });

  describe("removeMember", () => {
    it("should throw if only regular member tries to remove someone", async () => {
      prismaMock.group.findUnique.mockResolvedValue({ createdById: "u1" } as any);
      // Requesting user is 'u2', owner is 'u1'
      await expect(groupService.removeMember("g1", "u2", "u3")).rejects.toThrowError(
        /Only the group creator/
      );
    });

    it("should throw if creator tries to remove themselves", async () => {
      prismaMock.group.findUnique.mockResolvedValue({ createdById: "u1" } as any);
      await expect(groupService.removeMember("g1", "u1", "u1")).rejects.toThrowError(
        /cannot be removed/
      );
    });

    it("should remove member if valid", async () => {
      prismaMock.group.findUnique.mockResolvedValue({ createdById: "u1" } as any);
      prismaMock.groupMember.findUnique.mockResolvedValue({ id: "gm1" } as any);
      
      const res = await groupService.removeMember("g1", "u1", "u2");
      expect(res.success).toBe(true);
      expect(prismaMock.groupMember.delete).toHaveBeenCalledWith({ where: { id: "gm1" } });
    });
  });
});
