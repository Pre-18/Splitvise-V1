import { getServerAuthSession } from "@/lib/auth";
import { groupService } from "@/services/groupService";
import { expenseService } from "@/services/expenseService";
import { balanceEngine } from "@/services/balanceEngine";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCircle2, ReceiptText, Banknote } from "lucide-react";
import { AddMemberModal } from "@/components/groups/AddMemberModal";
import { RemoveMemberButton } from "@/components/groups/RemoveMemberButton";
import { CreateExpenseModal } from "@/components/expenses/CreateExpenseModal";
import { SettleUpModal } from "@/components/settlements/SettleUpModal";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export default async function GroupDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  try {
    const { group, members, memberCount, isOwner } = await groupService.getGroupDetails(
      params.id,
      session.user.id
    );

    const [expenses, groupBalances] = await Promise.all([
      expenseService.getGroupExpenses(params.id, session.user.id),
      balanceEngine.calculateGroupBalances(params.id),
    ]);

    // Map member names for the UI edges
    const memberMap = new Map(members.map(m => [m.id, m.name]));
    
    // We only show edges involving the logged-in user OR we show all edges but disable the "Settle" button?
    // Rule: "authenticated user must be payer or payee" for settlements.
    const simplifiedEdgesUI = groupBalances.simplifiedDebts.map(edge => ({
      fromId: edge.from,
      fromName: memberMap.get(edge.from) || "Unknown",
      toId: edge.to,
      toName: memberMap.get(edge.to) || "Unknown",
      amountInPaise: edge.amount,
      amountInRupees: (edge.amount / 100).toFixed(2),
      canSettle: session.user.id === edge.from || session.user.id === edge.to
    }));

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 bg-white p-2 rounded-full shadow-sm">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            </div>
            <CreateExpenseModal groupId={group.id} currentUserId={session.user.id} members={members} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feed / Ledger (Left side, takes 2 columns) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
                </div>
                
                {expenses.length === 0 ? (
                  <div className="py-16 text-center">
                    <ReceiptText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No expenses yet.</p>
                    <p className="text-sm text-gray-400">Add an expense to start sharing costs.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {expenses.map((expense) => {
                      const amountInRupees = (expense.amountInPaise / 100).toFixed(2);
                      const myShare = expense.participants.find(p => p.userId === session.user?.id);
                      const myShareRupees = myShare ? (myShare.amountInPaise / 100).toFixed(2) : "0.00";
                      
                      return (
                        <li key={expense.id} className="hover:bg-gray-50 transition-colors">
                          <Link href={`/expense/${expense.id}`} className="flex items-center justify-between p-4 block">
                            <div className="flex items-center gap-4">
                              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg">
                                <ReceiptText className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 group-hover:text-indigo-600">{expense.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  <span className="font-medium">{expense.paidBy.name}</span> paid ₹{amountInRupees}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(expense.createdAt).toLocaleDateString()} • {expense.splitType.toLowerCase()} split
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Your Share</p>
                              <p className={`font-semibold ${myShare && myShare.amountInPaise > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                ₹{myShareRupees}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <ActivityFeed groupId={group.id} currentUserId={session.user.id} />
              </div>
            </div>

            {/* Right Panel (Balances + Members) */}
            <div className="space-y-4">
              
              {/* Balances Panel */}
              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-900">Balances</h2>
                </div>
                
                {simplifiedEdgesUI.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    All settled up!
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {simplifiedEdgesUI.map((edge, i) => (
                      <li key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <p className="text-sm text-gray-900 font-medium">
                            <span className="font-bold">{edge.fromName}</span> owes
                          </p>
                          <p className="text-sm text-gray-900 font-medium">
                            <span className="font-bold">{edge.toName}</span> <span className="text-orange-600 font-bold">₹{edge.amountInRupees}</span>
                          </p>
                        </div>
                        {edge.canSettle && (
                          <SettleUpModal groupId={group.id} edge={edge} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Members Panel */}
              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Members ({memberCount})
                  </h2>
                  <AddMemberModal groupId={group.id} />
                </div>
                
                <ul className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <li key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <UserCircle2 className="h-8 w-8 text-gray-400 shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name} {member.id === session.user.id && "(You)"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </div>
                      
                      {isOwner && member.id !== group.createdById && (
                        <RemoveMemberButton 
                          groupId={group.id} 
                          userId={member.id} 
                          userName={member.name} 
                        />
                      )}
                      
                      {member.id === group.createdById && (
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Owner</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  } catch (error: any) {
    // If not a member or group doesn't exist
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center space-y-4 bg-white p-8 rounded-xl shadow border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Oops!</h1>
          <p className="text-gray-500">{error.message || "Group not found or unauthorized."}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline font-medium inline-block mt-4">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
}
