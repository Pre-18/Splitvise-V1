import { describe, it, expect } from "vitest";
import { balanceEngine, ExpenseWithParticipants } from "../balanceEngine";
import { Settlement, SplitType } from "@prisma/client";

// Factory functions to generate pure data objects for testing
const mockExpense = (
  id: string,
  paidById: string,
  amountInPaise: number,
  participants: { userId: string; amountInPaise: number }[]
): ExpenseWithParticipants => ({
  id,
  groupId: "g1",
  paidById,
  amountInPaise,
  description: "Test Expense",
  splitType: SplitType.EQUAL,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  participants: participants.map((p, i) => ({
    id: `ep_${id}_${i}`,
    expenseId: id,
    userId: p.userId,
    amountInPaise: p.amountInPaise,
    splitValue: null,
  })),
});

const mockSettlement = (id: string, payerId: string, payeeId: string, amount: number): Settlement => ({
  id,
  groupId: "g1",
  payerId,
  payeeId,
  amountInPaise: amount,
  createdAt: new Date(),
});

describe("balanceEngine", () => {
  describe("calculateNetBalances", () => {
    it("calculates simple single expense (A pays 100 for A and B)", () => {
      // A pays 100. A's share is 50. B's share is 50.
      const expenses = [
        mockExpense("e1", "A", 100, [
          { userId: "A", amountInPaise: 50 },
          { userId: "B", amountInPaise: 50 },
        ]),
      ];

      const balances = balanceEngine.calculateNetBalances(expenses, []);
      
      // A: +100 (paid) - 50 (share) = +50
      // B: -50 (share) = -50
      expect(balances).toEqual({ A: 50, B: -50 });
      expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0); // Zero-sum
    });

    it("calculates multiple expenses creating an offset", () => {
      // A pays 100 for A, B
      // B pays 200 for A, B
      const expenses = [
        mockExpense("e1", "A", 100, [
          { userId: "A", amountInPaise: 50 },
          { userId: "B", amountInPaise: 50 },
        ]),
        mockExpense("e2", "B", 200, [
          { userId: "A", amountInPaise: 100 },
          { userId: "B", amountInPaise: 100 },
        ]),
      ];

      const balances = balanceEngine.calculateNetBalances(expenses, []);
      
      // A: +100 - 50 - 100 = -50
      // B: +200 - 50 - 100 = +50
      expect(balances).toEqual({ A: -50, B: 50 });
    });

    it("processes settlements correctly", () => {
      // B owes A 50. B settles 50 to A.
      const expenses = [
        mockExpense("e1", "A", 100, [
          { userId: "A", amountInPaise: 50 },
          { userId: "B", amountInPaise: 50 },
        ]),
      ];
      const settlements = [mockSettlement("s1", "B", "A", 50)];

      const balances = balanceEngine.calculateNetBalances(expenses, settlements);
      
      // Both should be precisely 0, so they get deleted from the map
      expect(balances).toEqual({});
    });

    it("handles rounding remainders properly (Zero-sum validation)", () => {
      // 100 split 3 ways: 34, 33, 33
      const expenses = [
        mockExpense("e1", "A", 100, [
          { userId: "A", amountInPaise: 34 },
          { userId: "B", amountInPaise: 33 },
          { userId: "C", amountInPaise: 33 },
        ]),
      ];

      const balances = balanceEngine.calculateNetBalances(expenses, []);
      
      // A: +100 - 34 = 66
      // B: -33
      // C: -33
      expect(balances).toEqual({ A: 66, B: -33, C: -33 });
      expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0);
    });
  });

  describe("simplifyDebts", () => {
    it("simplifies a direct debt", () => {
      // A owes B 50
      const edges = balanceEngine.simplifyDebts({ A: -50, B: 50 });
      expect(edges).toEqual([{ from: "A", to: "B", amount: 50 }]);
    });

    it("simplifies a cyclic chain (A owes B 100, B owes C 100 => A owes C 100)", () => {
      // A is -100, B is 0, C is +100
      const edges = balanceEngine.simplifyDebts({ A: -100, C: 100 });
      expect(edges).toEqual([{ from: "A", to: "C", amount: 100 }]);
    });

    it("greedily matches largest debtors and creditors first", () => {
      const netBalances = {
        A: -100, // Owes 100
        B: -50,  // Owes 50
        C: 120,  // Owed 120
        D: 30,   // Owed 30
      };

      const edges = balanceEngine.simplifyDebts(netBalances);
      
      // Debtors sorted desc absolute: A (100), B (50)
      // Creditors sorted desc: C (120), D (30)
      // 1. A (100) -> C (120). Match 100. A reaches 0. C has 20 left.
      // 2. B (50) -> C (20). Match 20. C reaches 0. B has 30 left.
      // 3. B (30) -> D (30). Match 30. Both reach 0.
      expect(edges).toEqual([
        { from: "A", to: "C", amount: 100 },
        { from: "B", to: "C", amount: 20 },
        { from: "B", to: "D", amount: 30 },
      ]);
    });

    it("throws a fatal error if the zero-sum invariant is violated", () => {
      // Corrupt database state (total is +10)
      const corruptedBalances = { A: -100, B: 110 };
      expect(() => balanceEngine.simplifyDebts(corruptedBalances)).toThrowError(/Net balances do not sum to zero/i);
    });

    it("handles large group complex settlements gracefully", () => {
      const balances = {
        U1: -4500,
        U2: 1200,
        U3: 3300,
        U4: -200,
        U5: -100,
        U6: 300,
      };

      // Sum is 0 (-4800 + 4800 = 0)
      expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0);

      const edges = balanceEngine.simplifyDebts(balances);
      
      // Ensure all edges equal the total positive sum (4800)
      const totalSettled = edges.reduce((acc, edge) => acc + edge.amount, 0);
      expect(totalSettled).toBe(4800);
    });
  });
});
