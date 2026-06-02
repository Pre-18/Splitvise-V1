"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, X } from "lucide-react";

interface Props {
  groupId: string;
  edge: {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amountInPaise: number;
  };
}

export function SettleUpModal({ groupId, edge }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Default to full amount
  const [amountInput, setAmountInput] = useState((edge.amountInPaise / 100).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed <= 0) {
      return setError("Amount must be greater than zero");
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId: edge.fromId,
          payeeId: edge.toId,
          amountInPaise: Math.round(parsed * 100),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record settlement");
      }

      setIsOpen(false);
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
        className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1"
      >
        <Handshake className="h-3 w-3" />
        Settle
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Record Settlement</h2>
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

              <div className="bg-gray-50 p-4 rounded-lg text-center space-y-1">
                <p className="text-sm text-gray-500">From</p>
                <p className="font-semibold text-gray-900">{edge.fromName}</p>
                <div className="py-2">
                  <div className="w-px h-6 bg-gray-300 mx-auto"></div>
                </div>
                <p className="text-sm text-gray-500">To</p>
                <p className="font-semibold text-gray-900">{edge.toName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
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
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-70 flex items-center gap-2"
                >
                  {loading ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
