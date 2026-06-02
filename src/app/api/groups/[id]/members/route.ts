import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { groupService, GroupServiceError } from "@/services/groupService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const member = await groupService.addMemberByEmail((await params).id, session.user.id, email);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof GroupServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`POST /api/groups/${(await params).id}/members error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
