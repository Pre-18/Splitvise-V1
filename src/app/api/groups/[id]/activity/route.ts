import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { activityService, ActivityServiceError } from "@/services/activityService";

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
    const activity = await activityService.getGroupActivity(id, session.user.id);
    return NextResponse.json(activity);
  } catch (error) {
    if (error instanceof ActivityServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
