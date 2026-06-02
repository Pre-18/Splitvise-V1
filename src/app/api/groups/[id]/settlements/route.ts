import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { settlementService, SettlementServiceError } from "@/services/settlementService";

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
    const { payerId, payeeId, amountInPaise } = body;

    const settlement = await settlementService.createSettlement(
      (await params).id,
      session.user.id,
      payerId,
      payeeId,
      amountInPaise
    );

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    if (error instanceof SettlementServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error(`POST /api/groups/${(await params).id}/settlements error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
