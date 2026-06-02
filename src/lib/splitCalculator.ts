export interface SplitParticipantInput {
  userId: string;
  splitValue?: number; // Used for UNEQUAL (paise), PERCENTAGE (percentage points * 100 or float), SHARE (shares)
}

export interface SplitResult {
  userId: string;
  amountInPaise: number;
}

export class SplitCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitCalculationError";
  }
}

/**
 * Ensures determinism: Always processes the array in the order it was provided.
 * The first `remainder` participants receive +1 paisa to account for fractions.
 */
export function calculateEqualSplit(
  totalAmountInPaise: number,
  participants: SplitParticipantInput[]
): SplitResult[] {
  if (totalAmountInPaise <= 0) throw new SplitCalculationError("Amount must be greater than zero");
  if (participants.length === 0) throw new SplitCalculationError("Must have at least one participant");

  const count = participants.length;
  const baseShare = Math.floor(totalAmountInPaise / count);
  const remainder = totalAmountInPaise % count;

  return participants.map((p, index) => ({
    userId: p.userId,
    amountInPaise: baseShare + (index < remainder ? 1 : 0),
  }));
}

export function calculateUnequalSplit(
  totalAmountInPaise: number,
  participants: SplitParticipantInput[]
): SplitResult[] {
  if (totalAmountInPaise <= 0) throw new SplitCalculationError("Amount must be greater than zero");
  if (participants.length === 0) throw new SplitCalculationError("Must have at least one participant");

  let sum = 0;
  const results: SplitResult[] = [];

  for (const p of participants) {
    if (p.splitValue === undefined || p.splitValue < 0) {
      throw new SplitCalculationError(`Invalid split value for user ${p.userId}`);
    }
    // For unequal, splitValue IS the exact amount in paise
    const amount = Math.floor(p.splitValue); 
    sum += amount;
    results.push({ userId: p.userId, amountInPaise: amount });
  }

  if (sum !== totalAmountInPaise) {
    throw new SplitCalculationError(`Unequal split total (${sum}) does not match expense amount (${totalAmountInPaise})`);
  }

  return results;
}

export function calculatePercentageSplit(
  totalAmountInPaise: number,
  participants: SplitParticipantInput[]
): SplitResult[] {
  if (totalAmountInPaise <= 0) throw new SplitCalculationError("Amount must be greater than zero");
  if (participants.length === 0) throw new SplitCalculationError("Must have at least one participant");

  // We expect splitValue to be the raw percentage (e.g., 33.33)
  // For safety against floating point issues, sum should closely equal 100
  let percentageSum = 0;
  for (const p of participants) {
    if (p.splitValue === undefined || p.splitValue < 0) {
      throw new SplitCalculationError(`Invalid percentage value for user ${p.userId}`);
    }
    percentageSum += p.splitValue;
  }

  // Allow a tiny margin of error for floating point summation (e.g. 99.999999999)
  if (Math.abs(percentageSum - 100) > 0.01) {
    throw new SplitCalculationError(`Percentage split total (${percentageSum}%) does not equal 100%`);
  }

  const results: SplitResult[] = [];
  let allocatedSum = 0;

  for (const p of participants) {
    // Calculate raw amount and floor it to ensure we don't exceed total initially
    const rawAmount = (totalAmountInPaise * p.splitValue!) / 100;
    const amount = Math.floor(rawAmount);
    allocatedSum += amount;
    results.push({ userId: p.userId, amountInPaise: amount });
  }

  // Allocate remainder to the first user
  const remainder = totalAmountInPaise - allocatedSum;
  if (remainder > 0 && results.length > 0) {
    results[0].amountInPaise += remainder;
  }

  return results;
}

export function calculateShareSplit(
  totalAmountInPaise: number,
  participants: SplitParticipantInput[]
): SplitResult[] {
  if (totalAmountInPaise <= 0) throw new SplitCalculationError("Amount must be greater than zero");
  if (participants.length === 0) throw new SplitCalculationError("Must have at least one participant");

  let totalShares = 0;
  for (const p of participants) {
    if (p.splitValue === undefined || p.splitValue < 0 || !Number.isInteger(p.splitValue)) {
      throw new SplitCalculationError(`Invalid share value for user ${p.userId}`);
    }
    totalShares += p.splitValue;
  }

  if (totalShares <= 0) {
    throw new SplitCalculationError("Total shares must be greater than zero");
  }

  const results: SplitResult[] = [];
  let allocatedSum = 0;

  for (const p of participants) {
    const rawAmount = (totalAmountInPaise * p.splitValue!) / totalShares;
    const amount = Math.floor(rawAmount);
    allocatedSum += amount;
    results.push({ userId: p.userId, amountInPaise: amount });
  }

  // Allocate remainder to the first user
  const remainder = totalAmountInPaise - allocatedSum;
  if (remainder > 0 && results.length > 0) {
    results[0].amountInPaise += remainder;
  }

  return results;
}
