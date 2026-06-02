import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { expenseService, ExpenseServiceError } from "@/services/expenseService";
import { SplitType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const expenses = await expenseService.getGroupExpenses(id, session.user.id);
    return NextResponse.json(expenses);
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`GET /api/groups/${(await params).id}/expenses error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paidById, description, amountInPaise, splitType, participants } = body;

    const { id } = await params;
    const expense = await expenseService.createExpense(
      id,
      session.user.id,
      paidById,
      description,
      amountInPaise,
      splitType as SplitType,
      participants
    );

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`POST /api/groups/${(await params).id}/expenses error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
