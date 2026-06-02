# Architecture Notes & Tradeoffs

*This document serves as an evaluator-facing explanation of the core technical decisions made during the Splitwise Clone project.*

## 1. The Balance Calculation Philosophy
**Decision:** Balances are strictly derived at runtime and **never persisted** in the database.
**Why?** In a system where expenses can be edited or deleted (soft-deleted), persisting balances in a `balances` table introduces the risk of state drift. If a transaction fails or a race condition occurs during an edit, the persisted balance becomes mathematically decoupled from the true ledger (the `expenses` and `settlements` tables). By deriving balances on the fly using `balanceEngine.ts`, our ledger is the absolute single source of truth.

## 2. Integer Math for Monetary Values
**Decision:** All currency values are stored as integers (e.g., paise for INR, cents for USD) using the `Int` type.
**Why?** Floating-point arithmetic introduces microscopic precision errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial applications, this is catastrophic and violates our "Zero-Balance" metric. By storing values as integers, we ensure 100% mathematical accuracy.

## 3. Split Logic & The Floating Point Trap
**Decision:** When calculating `EQUAL`, `PERCENTAGE`, or `SHARE` splits, the `balanceEngine.ts` resolves the math into exact integer `amountOwed` values *before* saving to the database.
**Why?** If a ₹10.00 bill is split 3 ways, the raw math is `3.333...`. Our engine assigns `333` paise to two users and `334` paise to the payer to ensure the sum perfectly matches `1000` paise. The database only ever stores the finalized integer amounts.

## 4. Decoupling Settlements from Expenses
**Decision:** Settlements are given their own dedicated table rather than being an `Expense` with a specific type flag.
**Why?** Expenses involve complex multi-user splits via `ExpenseParticipant`. A Settlement is strictly a 1-to-1 transfer of funds. Decoupling them normalizes the schema, preventing the `Expense` table from being polluted with null values or dummy participants just to record a payment.

## 5. Unified Timeline Feed
**Decision:** The frontend group view combines `Expense`, `Settlement`, `Comment`, and `ActivityLog` tables into a single chronological feed.
**Why?** Financial apps require immense trust. Exposing the raw audit log (e.g., "Alice edited the amount from ₹500 to ₹400") directly in the primary feed ensures total transparency.

## 6. Real-Time Delivery (Abstraction Pattern)
**Decision:** We implemented a `RealtimeProvider` abstraction (`src/lib/realtime.ts`) with a `MockRealtimeProvider` for the MVP, rather than integrating Pusher directly.
**Why?** This prevents vendor lock-in and isolates external dependencies. The core business logic (`commentService`, `expenseService`, `settlementService`) simply calls `realtime.trigger()`. To upgrade to real-time sync across devices in production, we only need to swap the `MockRealtimeProvider` with a `PusherRealtimeProvider` without modifying a single line of backend business logic. We intend to use Pusher (rather than Socket.IO) because Vercel serverless functions do not support long-lived WebSockets natively, and Pusher manages that state connection for us.
