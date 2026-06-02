import { describe, it, expect, vi, beforeEach } from "vitest";
import { settlementService, SettlementServiceError } from "../settlementService";

// We hoist vi.mock to mock the database before any imports
vi.mock("@/lib/db", async () => {
  const actual = await vi.importActual("@/lib/db");
  return {
    ...actual,
    db: {
      $transaction: vi.fn(async (callback) => callback(global.__mockTx)),
    },
  };
});

describe("settlementService", () => {
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      groupMember: { findMany: vi.fn() },
      expense: { findMany: vi.fn() },
      settlement: { findMany: vi.fn(), create: vi.fn() },
      activityLog: { create: vi.fn() },
    };
    // Expose mockTx to the hoisted module
    (global as any).__mockTx = mockTx;
  });

  describe("createSettlement validation", () => {
    it("rejects negative or zero amount", async () => {
      await expect(
        settlementService.createSettlement("g1", "A", "A", "B", 0)
      ).rejects.toThrowError(SettlementServiceError);
    });

    it("rejects when payer and payee are the same", async () => {
      await expect(
        settlementService.createSettlement("g1", "A", "A", "A", 100)
      ).rejects.toThrowError(SettlementServiceError);
    });

    it("rejects when the requesting user is not involved", async () => {
      await expect(
        settlementService.createSettlement("g1", "C", "A", "B", 100)
      ).rejects.toThrowError(SettlementServiceError);
    });

    it("rejects when users are not in the group", async () => {
      mockTx.groupMember.findMany.mockResolvedValue([{ userId: "A" }]); // Missing B
      await expect(
        settlementService.createSettlement("g1", "A", "A", "B", 100)
      ).rejects.toThrowError(/Both users must be members/);
    });

    it("rejects when there is no matching debt edge", async () => {
      mockTx.groupMember.findMany.mockResolvedValue([{ userId: "A" }, { userId: "B" }]);
      // Empty expenses/settlements means no debt exists
      mockTx.expense.findMany.mockResolvedValue([]);
      mockTx.settlement.findMany.mockResolvedValue([]);

      await expect(
        settlementService.createSettlement("g1", "A", "A", "B", 100)
      ).rejects.toThrowError(/Settlement direction does not match/);
    });

    it("creates settlement successfully when valid", async () => {
      mockTx.groupMember.findMany.mockResolvedValue([{ userId: "A" }, { userId: "B" }]);
      
      // Simulate A owing B 100
      mockTx.expense.findMany.mockResolvedValue([
        {
          id: "e1",
          paidById: "B",
          amountInPaise: 100,
          participants: [{ userId: "A", amountInPaise: 100 }],
        },
      ]);
      mockTx.settlement.findMany.mockResolvedValue([]);
      
      mockTx.settlement.create.mockResolvedValue({ id: "s1", amountInPaise: 50 }); // Partial settlement

      const res = await settlementService.createSettlement("g1", "A", "A", "B", 50);

      expect(mockTx.settlement.create).toHaveBeenCalledWith({
        data: { groupId: "g1", payerId: "A", payeeId: "B", amountInPaise: 50 },
      });
      expect(res).toBeDefined();
    });
  });
});
