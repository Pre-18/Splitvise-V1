"use client";

import { useEffect } from "react";

/**
 * Mock hook for Realtime Subscriptions.
 * In a real implementation with Pusher, this would:
 * 1. Initialize a Pusher instance.
 * 2. pusher.subscribe(channel)
 * 3. channel.bind(event, callback)
 * 4. Cleanup on unmount
 */
export function useRealtime(channel: string, event: string, callback: (data: any) => void) {
  useEffect(() => {
    console.log(`[MOCK CLIENT] Subscribed to ${channel} for event ${event}`);
    
    // As a mock, we could optionally poll or listen to window events if we wanted cross-tab sync,
    // but the MVP requirement says "Use a mocked realtime implementation".
    // For now, it just logs. Realtime changes require a page refresh in this mock.

    return () => {
      console.log(`[MOCK CLIENT] Unsubscribed from ${channel} for event ${event}`);
    };
  }, [channel, event, callback]);
}
