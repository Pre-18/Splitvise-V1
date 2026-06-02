import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { groupService, GroupServiceError } from "@/services/groupService";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    await groupService.removeMember(id, session.user.id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof GroupServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`DELETE /api/groups/${(await params).id}/members/${(await params).userId} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
