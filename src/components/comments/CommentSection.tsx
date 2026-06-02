"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useRealtime } from "@/hooks/useRealtime";
import { useRouter } from "next/navigation";

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export function CommentSection({ expenseId, currentUserId }: { expenseId: string, currentUserId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch initial comments
  useEffect(() => {
    fetch(`/api/expenses/${expenseId}/comments`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setComments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load comments", err);
        setLoading(false);
      });
  }, [expenseId]);

  // Scroll to bottom when comments change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Mock realtime subscription
  useRealtime(`expense-${expenseId}`, "new-comment", (newComment) => {
    // In a real implementation with Pusher, this callback would append the comment to state
    // setComments(prev => [...prev, newComment]);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const newComment = await res.json();
      
      // Optimistically append since realtime is mocked
      setComments(prev => [...prev, newComment]);
      setInput("");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="text-center text-sm text-gray-500 py-4">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-8">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map(c => {
            const isMe = c.user.id === currentUserId;
            return (
              <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-700">{isMe ? "You" : c.user.name}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                }`}>
                  {c.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a comment..."
            className="w-full pl-4 pr-12 py-3 bg-gray-100 border-transparent rounded-full text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || submitting}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
