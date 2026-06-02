import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { balanceEngine } from "@/services/balanceEngine";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await balanceEngine.getDashboardSummary(session.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
