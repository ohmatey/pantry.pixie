/**
 * Simple server-side event emitter for bridging service mutations to WebSocket broadcasts
 */

import { logger } from "../lib/logger";

type EventHandler = (data: any) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit(event: string, data: any): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        logger.error({ err, event }, "Error in EventBus handler");
      }
    }
  }
}

export const eventBus = new EventBus();
