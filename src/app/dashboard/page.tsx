import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogOutButton } from "@/components/LogOutButton";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { groupService } from "@/services/groupService";
import { balanceEngine } from "@/services/balanceEngine";
import Link from "next/link";
import { Users, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch groups directly via service for Server Component efficiency
  const [groups, summary] = await Promise.all([
    groupService.getUserGroups(session.user.id),
    balanceEngine.getDashboardSummary(session.user.id)
  ]);

  const absoluteBalance = Math.abs(summary.overallBalance);
  const balanceInRupees = (absoluteBalance / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl shadow p-6 border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {session.user.name}!</p>
          </div>
          <div className="flex items-center gap-3">
            <CreateGroupModal />
            <LogOutButton />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-full ${summary.overallBalance === 0 ? 'bg-gray-100 text-gray-600' : summary.overallBalance > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Balance</p>
              <p className={`text-2xl font-bold ${summary.overallBalance === 0 ? 'text-gray-900' : summary.overallBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.overallBalance < 0 ? '-' : ''}₹{balanceInRupees}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-50 text-red-500">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">You Owe</p>
              <p className="text-xl font-bold text-gray-900">
                {summary.isDebtor ? `₹${balanceInRupees}` : '₹0.00'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-50 text-green-500">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">You are Owed</p>
              <p className="text-xl font-bold text-gray-900">
                {summary.isCreditor ? `₹${balanceInRupees}` : '₹0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Groups</h2>
          
          {groups.length === 0 ? (
            <div className="text-center rounded-xl border-2 border-dashed border-gray-300 p-12 bg-white">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No groups yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new expense sharing group.
              </p>
              <div className="mt-6 flex justify-center">
                <CreateGroupModal />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/group/${group.id}`}
                  className="block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {group.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Created {new Date(group.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
