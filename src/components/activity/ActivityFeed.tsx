"use client";

import { useState, useEffect } from "react";
import { Activity, ReceiptText, Handshake, MessageSquare, Trash2, Edit3 } from "lucide-react";
import { useRealtime } from "@/hooks/useRealtime";

interface ActivityLog {
  id: string;
  type: "CREATE_EXPENSE" | "EDIT_EXPENSE" | "DELETE_EXPENSE" | "SETTLE" | "COMMENT_ADDED";
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  payload: any;
}

export function ActivityFeed({ groupId, currentUserId }: { groupId: string, currentUserId: string }) {
  const [feed, setFeed] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/activity`);
      const data = await res.json();
      if (Array.isArray(data)) setFeed(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [groupId]);

  // Mock realtime subscription
  useRealtime(`group-${groupId}`, "new-activity", (newActivity) => {
    // In a real implementation with Pusher:
    // setFeed(prev => [newActivity, ...prev]);
  });

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading activity...</div>;
  }

  if (feed.length === 0) {
    return (
      <div className="p-8 text-center">
        <Activity className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No activity yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
      {feed.map(log => {
        const isMe = log.user.id === currentUserId;
        const name = isMe ? "You" : log.user.name;

        let icon;
        let content;
        
        switch (log.type) {
          case "CREATE_EXPENSE":
            icon = <div className="bg-indigo-50 text-indigo-600 p-2 rounded-full"><ReceiptText className="h-4 w-4" /></div>;
            content = <><span className="font-semibold text-gray-900">{name}</span> added <b>"{log.payload.description}"</b></>;
            break;
          case "EDIT_EXPENSE":
            icon = <div className="bg-blue-50 text-blue-600 p-2 rounded-full"><Edit3 className="h-4 w-4" /></div>;
            content = <><span className="font-semibold text-gray-900">{name}</span> updated <b>"{log.payload.description}"</b></>;
            break;
          case "DELETE_EXPENSE":
            icon = <div className="bg-red-50 text-red-600 p-2 rounded-full"><Trash2 className="h-4 w-4" /></div>;
            content = <><span className="font-semibold text-gray-900">{name}</span> deleted <b>"{log.payload.description}"</b></>;
            break;
          case "SETTLE":
            icon = <div className="bg-green-50 text-green-600 p-2 rounded-full"><Handshake className="h-4 w-4" /></div>;
            content = <><span className="font-semibold text-gray-900">{name}</span> recorded a payment of ₹{(log.payload.amountInPaise / 100).toFixed(2)}</>;
            break;
          case "COMMENT_ADDED":
            icon = <div className="bg-gray-100 text-gray-600 p-2 rounded-full"><MessageSquare className="h-4 w-4" /></div>;
            content = <><span className="font-semibold text-gray-900">{name}</span> commented: <span className="text-gray-600 italic">"{log.payload.text}"</span></>;
            break;
          default:
            icon = <div className="bg-gray-50 p-2 rounded-full"><Activity className="h-4 w-4" /></div>;
            content = <span className="text-gray-500">Unknown activity</span>;
        }

        return (
          <li key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3">
            {icon}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-sm text-gray-700 truncate">{content}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
