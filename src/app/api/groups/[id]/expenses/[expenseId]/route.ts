import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { expenseService, ExpenseServiceError } from "@/services/expenseService";
import { SplitType } from "@prisma/client";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paidById, description, amountInPaise, splitType, participants } = body;

    const { id, expenseId } = await params;
    const expense = await expenseService.updateExpense(
      id,
      expenseId,
      session.user.id,
      paidById,
      description,
      amountInPaise,
      splitType as SplitType,
      participants
    );

    return NextResponse.json(expense);
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`PUT /api/groups/${(await params).id}/expenses/${(await params).expenseId} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, expenseId } = await params;
    await expenseService.deleteExpense(id, expenseId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`DELETE /api/groups/${(await params).id}/expenses/${(await params).expenseId} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
