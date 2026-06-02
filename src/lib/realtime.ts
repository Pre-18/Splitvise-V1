/**
 * Realtime Provider Abstraction
 * 
 * To switch to Pusher in the future:
 * 1. Install `pusher` via npm.
 * 2. Implement `PusherRealtimeProvider` that wraps `new Pusher(...)`.
 * 3. Export it as `realtime`.
 */

export interface RealtimeProvider {
  trigger(channel: string, event: string, data: any): Promise<void>;
}

class MockRealtimeProvider implements RealtimeProvider {
  async trigger(channel: string, event: string, data: any): Promise<void> {
    console.log(`[MOCK REALTIME] Triggered event '${event}' on channel '${channel}'`);
    // No-op for MVP. 
  }
}

export const realtime: RealtimeProvider = new MockRealtimeProvider();
