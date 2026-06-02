import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { commentService, CommentServiceError } from "@/services/commentService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expenseId } = await params;
    const comments = await commentService.getComments(expenseId, session.user.id);
    return NextResponse.json(comments);
  } catch (error) {
    if (error instanceof CommentServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text } = body;

    const { expenseId } = await params;
    const comment = await commentService.addComment(expenseId, session.user.id, text);
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof CommentServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
