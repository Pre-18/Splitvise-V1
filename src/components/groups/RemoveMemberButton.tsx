"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface Props {
  groupId: string;
  userId: string;
  userName: string;
}

export function RemoveMemberButton({ groupId, userId, userName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove ${userName} from this group?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-red-500 hover:text-red-700 disabled:opacity-50 p-2"
      title="Remove Member"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
