# AI Context: Splitwise Clone Project

## 1. Project Overview
**Goal:** Build and deploy a Splitwise-inspired expense sharing application as part of an internship assignment.
**Status:** Implementation Phase

## 2. Core Principles & Rules
- **Single Source of Truth:** This document (AI_CONTEXT.md) is the final reference.
- **No Assumptions:** Ambiguous requirements clarified.
- **Explain Everything:** Document rationale and trade-offs.

## 3. Product Discovery: Context & Decisions

### 3.1 Product Goals & Success Metrics
- **Goal:** Prove core mechanics through a rock-solid MVP focusing on effortless shared-expense tracking.
- **Zero-Balance Metric:** 100% mathematical accuracy. All monetary values stored as **integer paise/cents**. No floats.
- **Simplification Efficiency:** Reduce transactions by 30-40%.

### 3.2 User Personas & Permissions
- **Personas:** "Co-Living Roommate" and "Weekend Traveler".
- **Permissions (Flat Model with strict AuthZ):** 
  - *Expense Creation/Editing/Deletion:* Any member of the group can perform these actions.
  - *Settlements:* Any member can log a settlement.
  - *Member Removal:* A user can only be removed (or leave) if their derived net balance in the group is exactly ₹0.00.

### 3.3 Core Workflows & Architecture
- **Immutability Strategy:** Mutable with Invalidation. We edit in-place but maintain an `ActivityLog` table.
- **Deletion:** Soft Delete via `deletedAt` timestamp for `Expense` and `Comment`.
- **Balances:** Balances are **never persisted**. They are always calculated on the fly by the `balanceEngine.ts` service using the true ledger data.
  - **Convention:** Positive balance = User should receive money (Creditor). Negative balance = User owes money (Debtor).
  - **Expense Processing:** Payer `+=` amount, Participant `-=` participant share.
  - **Settlement Processing:** Payer `+=` amount, Payee `-=` amount.
- **Authentication:** NextAuth.js. We use the Credentials Provider with a strict JWT session strategy. The PrismaAdapter is deliberately avoided to prevent injecting unused OAuth tables into our clean MVP schema. Passwords are hashed with bcrypt.

### 3.4 Data Entities (ERD Summary)
- `User`: App users.
- `Group`: Expense sharing groups.
- `GroupMember`: Many-to-many join with zero-balance leave constraint.
- `Expense`: The core transaction.
- `ExpenseParticipant`: Stores `SplitType` (EQUAL, UNEQUAL, PERCENTAGE, SHARE), raw values, and exact paisa amounts.
- `Settlement`: Dedicated entity for direct user-to-user payments.
- `Comment`: Soft-deletable text comments on expenses.
- `ActivityLog`: Uses an `ActivityType` enum to track all changes.

### 3.5 Real-Time & Activity Feed
- **Unified Timeline:** The group feed combines Expenses, Settlements, Comments, and Activity Logs into a single chronological stream.
- **Real-Time Delivery:** We use **Pusher** instead of Socket.IO for real-time comment updates, as it deploys seamlessly on Vercel's serverless infrastructure.

## 4. Technical Architecture & Tech Stack
- **Framework:** Full-Stack Next.js (App Router, Server Actions).
- **Service Layer:** Business logic is isolated in `src/services/*` to keep API routes thin and enable pure unit testing.
- **State Management:** Zustand + Native Next.js caching.
- **Database:** PostgreSQL (Neon) via Prisma ORM.
- **Testing:** Vitest for pure unit tests using `vitest-mock-extended`.

## 5. Product Discovery Tracker
- [x] Product Goals & Scope
- [x] User Personas
- [x] Splitwise Research Findings
- [x] 5. balanceEngine.ts with TDD
- [x] 6. Settlements
- [x] 7. Dashboard summaries Initialization & Schema
- [x] 2. Authentication (NextAuth + Credentials)
- [x] 3. Group CRUD
- [x] 4. Expense CRUD
- [x] Chat & Notifications
- [x] Technical Architecture (Frontend, Backend, DB, Deployment)
