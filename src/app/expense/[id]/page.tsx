import { getServerAuthSession } from "@/lib/auth";
import { expenseService } from "@/services/expenseService";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { CommentSection } from "@/components/comments/CommentSection";

export default async function ExpenseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  try {
    const { id } = await params;
    const expense = await expenseService.getExpense(id, session.user.id);
    const amountInRupees = (expense.amountInPaise / 100).toFixed(2);

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href={`/group/${expense.groupId}`} className="text-gray-500 hover:text-gray-900 bg-white p-2 rounded-full shadow-sm">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-600 p-4 rounded-xl">
                  <ReceiptText className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{expense.description}</h2>
                  <p className="text-gray-500 mt-1">
                    Added by <span className="font-semibold text-gray-900">{expense.paidBy.name}</span> on {new Date(expense.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-bold text-gray-900">₹{amountInRupees}</p>
                <p className="text-sm font-medium text-indigo-600 mt-1 uppercase tracking-wider">{expense.splitType} SPLIT</p>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
              <ul className="space-y-3">
                {expense.participants.map((p) => (
                  <li key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700 font-medium">{p.user.name}</span>
                    <span className="text-gray-900 font-semibold">₹{(p.amountInPaise / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <CommentSection expenseId={expense.id} currentUserId={session.user.id} />
          </div>

        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center space-y-4 bg-white p-8 rounded-xl shadow border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Oops!</h1>
          <p className="text-gray-500">{error.message || "Expense not found or unauthorized."}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline font-medium inline-block mt-4">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
}
