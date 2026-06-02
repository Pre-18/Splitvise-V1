"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Receipt, X } from "lucide-react";

type SplitType = "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARE";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Props {
  groupId: string;
  currentUserId: string;
  members: Member[];
}

export function CreateExpenseModal({ groupId, currentUserId, members }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");

  // Track each member's involvement and manual split values
  const [participantState, setParticipantState] = useState<
    Record<string, { included: boolean; splitValue: string }>
  >(() => {
    const init: any = {};
    members.forEach((m) => {
      init[m.id] = { included: true, splitValue: "" };
    });
    return init;
  });

  const totalAmountInPaise = useMemo(() => {
    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed < 0) return 0;
    return Math.round(parsed * 100);
  }, [amountInput]);

  const handleToggleParticipant = (userId: string) => {
    setParticipantState((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], included: !prev[userId].included },
    }));
  };

  const handleSplitValueChange = (userId: string, val: string) => {
    setParticipantState((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], splitValue: val },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setError("Description is required");
    if (totalAmountInPaise <= 0) return setError("Amount must be greater than zero");

    const activeParticipants = Object.entries(participantState)
      .filter(([_, state]) => state.included)
      .map(([userId, state]) => ({
        userId,
        splitValue: state.splitValue ? parseFloat(state.splitValue) : undefined,
      }));

    if (activeParticipants.length === 0) {
      return setError("Select at least one participant");
    }

    // Adjust unequal to paise if necessary
    const mappedParticipants = activeParticipants.map((p) => {
      let sv = p.splitValue;
      if (splitType === "UNEQUAL" && sv !== undefined) {
        sv = Math.round(sv * 100); // convert user input rupees to paise
      }
      return { userId: p.userId, splitValue: sv };
    });

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amountInPaise: totalAmountInPaise,
          paidById,
          splitType,
          participants: mappedParticipants,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create expense");
      }

      setIsOpen(false);
      setDescription("");
      setAmountInput("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        <Receipt className="h-4 w-4" />
        Add Expense
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add an Expense</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded bg-red-50 p-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Dinner at Joe's"
                    required
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Paid By</label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === currentUserId ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  {(["EQUAL", "UNEQUAL", "PERCENTAGE", "SHARE"] as SplitType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSplitType(type)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                        splitType === type
                          ? "bg-white text-indigo-600 shadow"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {type.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Participants</h3>
                </div>
                <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const isIncluded = participantState[m.id].included;
                    return (
                      <li key={m.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => handleToggleParticipant(m.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          />
                          <span className="text-sm font-medium text-gray-900">{m.name}</span>
                        </label>

                        {isIncluded && splitType !== "EQUAL" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={participantState[m.id].splitValue}
                              onChange={(e) => handleSplitValueChange(m.id, e.target.value)}
                              placeholder={
                                splitType === "UNEQUAL" ? "0.00" : splitType === "PERCENTAGE" ? "%" : "shares"
                              }
                              className="w-20 text-right rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
                              required
                            />
                            <span className="text-xs text-gray-500 w-4">
                              {splitType === "PERCENTAGE" ? "%" : splitType === "UNEQUAL" ? "₹" : ""}
                            </span>
                          </div>
                        )}
                        {isIncluded && splitType === "EQUAL" && (
                          <span className="text-xs text-gray-500 italic">Auto</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-70"
                >
                  {loading ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
