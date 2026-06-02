# Build Plan: Splitwise Clone MVP

This document outlines the architecture, database schema, API specification, and deployment plan.

## 1. Database ERD (PostgreSQL via Prisma)

```mermaid
erDiagram
    User {
        String id PK
        String email UK
        String passwordHash
        String name
        DateTime createdAt
    }

    Group {
        String id PK
        String name
        DateTime createdAt
    }

    GroupMember {
        String id PK
        String userId FK
        String groupId FK
        DateTime joinedAt
    }

    Expense {
        String id PK
        String groupId FK
        String description
        Int amountInPaise "Stored in Paisa"
        String paidById FK "references User.id"
        DateTime deletedAt "Nullable for Soft Delete"
        DateTime createdAt
        DateTime updatedAt
    }

    ExpenseParticipant {
        String id PK
        String expenseId FK
        String userId FK "User who owes money"
        SplitType splitType "ENUM: EQUAL, UNEQUAL, PERCENTAGE, SHARE"
        Int splitValue "Raw value (e.g., 2000 for 20.00%)"
        Int amountInPaise "Calculated exact Paisa"
    }
    
    Settlement {
        String id PK
        String groupId FK
        String payerId FK
        String payeeId FK
        Int amountInPaise "Stored in Paisa"
        DateTime createdAt
    }

    ActivityLog {
        String id PK
        String groupId FK
        String userId FK "Action performed by"
        ActivityType type "ENUM: CREATE_EXPENSE, EDIT_EXPENSE, DELETE_EXPENSE, SETTLE"
        Json payload "Historical state/details"
        DateTime createdAt
    }

    Comment {
        String id PK
        String expenseId FK
        String userId FK
        String text
        DateTime deletedAt "Nullable for Soft Delete"
        DateTime createdAt
    }

    User ||--o{ GroupMember : "belongs to"
    Group ||--o{ GroupMember : "has"
    Group ||--o{ Expense : "contains"
    User ||--o{ Expense : "paid"
    Expense ||--o{ ExpenseParticipant : "is divided into"
    User ||--o{ ExpenseParticipant : "owes"
    Group ||--o{ Settlement : "contains"
    Group ||--o{ ActivityLog : "has"
    Expense ||--o{ Comment : "has"
```

## 2. API Specification (Next.js App Router)

### Authentication (NextAuth.js)
- `POST /api/auth/...`: Handled by NextAuth.

### Dashboard
- `GET /api/dashboard`: Aggregated balance summaries across all groups (derived via `balanceEngine.ts`).

### Groups
- `POST /api/groups`: Create group
- `GET /api/groups`: List user's groups
- `GET /api/groups/:id`: Get group details, members, and net balances (derived via `balanceEngine.ts`)
- `POST /api/groups/:id/members`: Add user to group
- `DELETE /api/groups/:id/members/:userId`: Remove user (validates zero balance)

### Expenses
- `POST /api/groups/:id/expenses`: Add an expense (supports Equal, Unequal, Percent, Share)
- `PUT /api/groups/:id/expenses/:expenseId`: Edit expense (creates activity log)
- `DELETE /api/groups/:id/expenses/:expenseId`: Soft delete expense (`deletedAt`)

### Settlements
- `POST /api/groups/:id/settlements`: Log a direct payment between two users.

### Feed & Comments
- `GET /api/groups/:id/feed`: Unified chronological feed of Expenses, Settlements, Comments, and Activity Logs.
- `POST /api/expenses/:expenseId/comments`: Add a comment (pushes real-time update via Pusher).

## 3. Folder Structure (Next.js Monorepo)

```text
/
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── dashboard/       # Main user dashboard
│   │   ├── group/[id]/      # Group details, ledger, and feed
│   │   └── api/             # Route handlers
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── shared/          # Custom reusable components
│   ├── lib/
│   │   ├── db.ts            # Prisma client instantiation
│   │   ├── balanceEngine.ts # Centralized balance and debt logic
│   │   └── pusher.ts        # Pusher real-time configuration
│   └── store/               # Zustand state slices
├── ARCHITECTURE_NOTES.md
├── BUILD_PLAN.md
├── AI_CONTEXT.md
└── README.md
```

## 4. Deployment Plan
- **Frontend & API:** Vercel
- **Database:** Neon (Serverless Postgres)
- **Real-Time:** Pusher

## 5. Testing Plan
- **Unit Tests:** `lib/balanceEngine.ts` must have 100% coverage.
- **E2E Tests:** Playwright for Happy Path.

## 6. Implementation Progress
- [x] 1. Database Initialization & Schema
- [x] 2. Authentication (NextAuth + Credentials)
- [x] 3. Group CRUD
- [x] 4. Expense CRUD
- [x] 5. balanceEngine.ts with TDD
- [x] 6. Settlements
- [x] 7. Dashboard summaries
- [x] 8. Real-time comments (Mocked MVP)
- [x] 9. Activity feed
- [ ] 10. Testing
- [ ] 11. Deployment
