import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { groupService, GroupServiceError } from "@/services/groupService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupDetails = await groupService.getGroupDetails((await params).id, session.user.id);
    return NextResponse.json(groupDetails);
  } catch (error) {
    if (error instanceof GroupServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`GET /api/groups/${(await params).id} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
