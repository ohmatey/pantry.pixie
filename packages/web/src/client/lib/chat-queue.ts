/**
 * Offline Chat Message Queue
 * Stores unsent chat messages when offline and sends when connection restored
 */

import { db } from "./db";

export interface QueuedChatMessage {
  id: string;
  threadId: string;
  content: string;
  timestamp: number;
  retryCount: number;
  error?: string;
}

class ChatQueue {
  private processing = false;

  /**
   * Add a message to the offline queue
   */
  async add(threadId: string, content: string): Promise<string> {
    const id = crypto.randomUUID();
    const message: QueuedChatMessage = {
      id,
      threadId,
      content,
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Store in IndexedDB
    await db.chatQueue.add(message);

    console.log("[ChatQueue] Message queued:", id);
    return id;
  }

  /**
   * Process all pending messages
   */
  async process(
    sendMessage: (threadId: string, content: string) => void,
  ): Promise<void> {
    if (this.processing) {
      console.log("[ChatQueue] Already processing, skipping...");
      return;
    }

    this.processing = true;

    try {
      const pending = await db.chatQueue.orderBy("timestamp").toArray();

      if (pending.length === 0) {
        return;
      }

      console.log(
        `[ChatQueue] Processing ${pending.length} queued message(s)...`,
      );

      for (const message of pending) {
        try {
          // Send the message via WebSocket
          sendMessage(message.threadId, message.content);

          // Remove from queue on success
          await db.chatQueue.delete(message.id);
          console.log("[ChatQueue] Message sent:", message.id);
        } catch (error) {
          console.error("[ChatQueue] Failed to send message:", error);

          // Retry logic with exponential backoff
          if (message.retryCount >= 5) {
            console.error(
              "[ChatQueue] Max retries reached, removing:",
              message.id,
            );
            await db.chatQueue.delete(message.id);
          } else {
            await db.chatQueue.update(message.id, {
              retryCount: message.retryCount + 1,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get all pending messages for a thread
   */
  async getPending(threadId: string): Promise<QueuedChatMessage[]> {
    return db.chatQueue.where("threadId").equals(threadId).sortBy("timestamp");
  }

  /**
   * Get pending message count
   */
  async getPendingCount(): Promise<number> {
    return db.chatQueue.count();
  }

  /**
   * Clear all queued messages (use with caution)
   */
  async clear(): Promise<void> {
    await db.chatQueue.clear();
  }
}

export const chatQueue = new ChatQueue();
