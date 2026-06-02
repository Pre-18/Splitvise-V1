import { describe, it, expect } from "vitest";
import {
  calculateEqualSplit,
  calculateUnequalSplit,
  calculatePercentageSplit,
  calculateShareSplit,
  SplitCalculationError,
} from "../splitCalculator";

describe("splitCalculator", () => {
  describe("calculateEqualSplit", () => {
    it("splits evenly with no remainders", () => {
      const res = calculateEqualSplit(3000, [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }]);
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 1000 },
        { userId: "u2", amountInPaise: 1000 },
        { userId: "u3", amountInPaise: 1000 },
      ]);
    });

    it("distributes remainder strictly to the first participants", () => {
      const res = calculateEqualSplit(10000, [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }]);
      // 10000 / 3 = 3333.33
      // Remainder = 1. First user gets +1.
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 3334 },
        { userId: "u2", amountInPaise: 3333 },
        { userId: "u3", amountInPaise: 3333 },
      ]);
    });

    it("throws if amount is <= 0", () => {
      expect(() => calculateEqualSplit(0, [{ userId: "u1" }])).toThrowError(SplitCalculationError);
    });

    it("throws if no participants", () => {
      expect(() => calculateEqualSplit(1000, [])).toThrowError(SplitCalculationError);
    });
  });

  describe("calculateUnequalSplit", () => {
    it("maps precise unequal amounts correctly", () => {
      const res = calculateUnequalSplit(5000, [
        { userId: "u1", splitValue: 2500 },
        { userId: "u2", splitValue: 1500 },
        { userId: "u3", splitValue: 1000 },
      ]);
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 2500 },
        { userId: "u2", amountInPaise: 1500 },
        { userId: "u3", amountInPaise: 1000 },
      ]);
    });

    it("throws if sums do not match the total", () => {
      expect(() =>
        calculateUnequalSplit(5000, [
          { userId: "u1", splitValue: 2000 },
          { userId: "u2", splitValue: 2000 },
        ])
      ).toThrowError(/does not match/);
    });
  });

  describe("calculatePercentageSplit", () => {
    it("handles exact floating point percentages (e.g. 33.33) and assigns remainder to first user", () => {
      const res = calculatePercentageSplit(10000, [
        { userId: "u1", splitValue: 33.34 },
        { userId: "u2", splitValue: 33.33 },
        { userId: "u3", splitValue: 33.33 },
      ]);
      // Math: u1 raw = 3334. u2 raw = 3333. u3 raw = 3333. sum = 10000. remainder = 0.
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 3334 },
        { userId: "u2", amountInPaise: 3333 },
        { userId: "u3", amountInPaise: 3333 },
      ]);
    });

    it("handles precision drift when remainders exist", () => {
      const res = calculatePercentageSplit(10000, [
        { userId: "u1", splitValue: 33.33 },
        { userId: "u2", splitValue: 33.33 },
        { userId: "u3", splitValue: 33.34 },
      ]);
      // User 1 gets remainder of +1 to equal exactly 10000 overall, but wait:
      // u1 = 3333, u2 = 3333, u3 = 3334. Sum = 10000. Remainder = 0.
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 3333 },
        { userId: "u2", amountInPaise: 3333 },
        { userId: "u3", amountInPaise: 3334 },
      ]);
    });

    it("allocates missing remainder strictly to the first user", () => {
      // 100 split 50% and 50%
      const res = calculatePercentageSplit(101, [
        { userId: "u1", splitValue: 50 },
        { userId: "u2", splitValue: 50 },
      ]);
      // raw = 50.5 => 50, sum = 100. Remainder = 1.
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 51 },
        { userId: "u2", amountInPaise: 50 },
      ]);
    });

    it("throws if percentages do not sum to 100", () => {
      expect(() =>
        calculatePercentageSplit(1000, [{ userId: "u1", splitValue: 50 }])
      ).toThrowError(/does not equal 100%/);
    });
  });

  describe("calculateShareSplit", () => {
    it("handles simple share divisions", () => {
      const res = calculateShareSplit(3000, [
        { userId: "u1", splitValue: 2 }, // 2 shares
        { userId: "u2", splitValue: 1 }, // 1 share
      ]);
      // total = 3. u1 gets 2000, u2 gets 1000
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 2000 },
        { userId: "u2", amountInPaise: 1000 },
      ]);
    });

    it("handles remainders by allocating to first user", () => {
      const res = calculateShareSplit(10000, [
        { userId: "u1", splitValue: 1 },
        { userId: "u2", splitValue: 1 },
        { userId: "u3", splitValue: 1 },
      ]);
      // Exact same scenario as Equal split
      expect(res).toEqual([
        { userId: "u1", amountInPaise: 3334 },
        { userId: "u2", amountInPaise: 3333 },
        { userId: "u3", amountInPaise: 3333 },
      ]);
    });

    it("throws if shares are floats", () => {
      expect(() =>
        calculateShareSplit(1000, [{ userId: "u1", splitValue: 1.5 }])
      ).toThrowError(/Invalid share value/);
    });
  });
});
