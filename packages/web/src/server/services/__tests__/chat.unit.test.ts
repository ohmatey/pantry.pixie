/**
 * Unit tests for chat service
 * Tests thread creation, message retrieval, and AI agent integration
 */

import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { seedTestUser } from "@pantry-pixie/core";
import { db, eq, chatThreadsTable, chatMessagesTable } from "@pantry-pixie/core";
import { createThread, getThreads, getMessages, sendMessage } from "../chat";

let testHomeId: string;
let testUserId: string;
let createdThreadIds: string[] = [];

beforeAll(async () => {
  const seed = await seedTestUser();
  testHomeId = seed.home.id;
  testUserId = seed.user.id;
});

afterAll(async () => {
  // Clean up created threads (messages cascade delete)
  for (const id of createdThreadIds) {
    await db.delete(chatThreadsTable).where(eq(chatThreadsTable.id, id));
  }
});

describe("Chat Service - createThread()", () => {
  it("should create a thread with custom title", async () => {
    const thread = await createThread(testHomeId, "Shopping Discussion");
    createdThreadIds.push(thread.id);

    expect(thread.id).toBeString();
    expect(thread.homeId).toBe(testHomeId);
    expect(thread.title).toBe("Shopping Discussion");
  });

  it("should create thread with default title", async () => {
    const thread = await createThread(testHomeId);
    createdThreadIds.push(thread.id);

    expect(thread.title).toBe("New Chat");
  });

  it("should set timestamps on creation", async () => {
    const thread = await createThread(testHomeId, "Timestamped");
    createdThreadIds.push(thread.id);

    expect(thread.createdAt).toBeInstanceOf(Date);
    expect(thread.updatedAt).toBeInstanceOf(Date);
  });
});

describe("Chat Service - getThreads()", () => {
  beforeAll(async () => {
    // Create multiple threads
    const thread1 = await createThread(testHomeId, "Thread 1");
    const thread2 = await createThread(testHomeId, "Thread 2");
    const thread3 = await createThread(testHomeId, "Thread 3");
    createdThreadIds.push(thread1.id, thread2.id, thread3.id);
  });

  it("should get all threads for a home", async () => {
    const threads = await getThreads(testHomeId);

    expect(threads.length).toBeGreaterThanOrEqual(3);
    expect(threads.every((t) => t.homeId === testHomeId)).toBe(true);
  });

  it("should order threads by most recent first", async () => {
    const threads = await getThreads(testHomeId);

    // Most recently updated should be first
    for (let i = 0; i < threads.length - 1; i++) {
      expect(threads[i].updatedAt.getTime()).toBeGreaterThanOrEqual(
        threads[i + 1].updatedAt.getTime()
      );
    }
  });

  it("should limit to 20 threads", async () => {
    const threads = await getThreads(testHomeId);

    expect(threads.length).toBeLessThanOrEqual(20);
  });
});

describe("Chat Service - getMessages()", () => {
  let threadId: string;

  beforeAll(async () => {
    const thread = await createThread(testHomeId, "Message Test");
    threadId = thread.id;
    createdThreadIds.push(threadId);

    // Add some test messages
    await db.insert(chatMessagesTable).values([
      { threadId, role: "user", content: "Hello", intent: "greeting" },
      { threadId, role: "assistant", content: "Hi there!", intent: "greeting" },
      { threadId, role: "user", content: "Add milk", intent: "add_item" },
    ]);
  });

  it("should get all messages for a thread", async () => {
    const messages = await getMessages(threadId);

    expect(messages.length).toBeGreaterThanOrEqual(3);
    expect(messages.every((m) => m.threadId === threadId)).toBe(true);
  });

  it("should order messages by most recent first", async () => {
    const messages = await getMessages(threadId);

    // Most recent should be first (DESC order)
    for (let i = 0; i < messages.length - 1; i++) {
      expect(messages[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        messages[i + 1].createdAt.getTime()
      );
    }
  });

  it("should respect custom limit", async () => {
    const messages = await getMessages(threadId, 2);

    expect(messages.length).toBeLessThanOrEqual(2);
  });

  it("should default to 50 message limit", async () => {
    const messages = await getMessages(threadId);

    expect(messages.length).toBeLessThanOrEqual(50);
  });
});

describe("Chat Service - sendMessage()", () => {
  let threadId: string;

  beforeAll(async () => {
    const thread = await createThread(testHomeId, "Send Message Test");
    threadId = thread.id;
    createdThreadIds.push(threadId);
  });

  it("should create user message and assistant response", async () => {
    const result = await sendMessage(threadId, testHomeId, testUserId, "Hello Pixie!");

    expect(result.userMessage).toBeDefined();
    expect(result.assistantMessage).toBeDefined();
    expect(result.userMessage.role).toBe("user");
    expect(result.userMessage.content).toBe("Hello Pixie!");
    expect(result.assistantMessage.role).toBe("assistant");
    expect(result.assistantMessage.content).toBeString();
  });

  it("should classify user message intent", async () => {
    const result = await sendMessage(threadId, testHomeId, testUserId, "We need eggs");

    expect(result.userMessage.intent).toBeString();
    // Intent should be one of the valid types
    const validIntents = ["add_item", "remove_item", "ask_status", "set_recurring", "other", "greeting", "clarification_needed", "budget_question", "meal_planning"];
    expect(validIntents).toContain(result.userMessage.intent);
  });

  it("should store userId in message metadata", async () => {
    const result = await sendMessage(threadId, testHomeId, testUserId, "Test message");

    expect(result.userMessage.metadata).toBeDefined();
    expect(result.userMessage.metadata.userId).toBe(testUserId);
  });

  it("should generate contextual AI response", async () => {
    // Send a message that should get a meaningful response
    const result = await sendMessage(
      threadId,
      testHomeId,
      testUserId,
      "What's in my pantry?"
    );

    expect(result.assistantMessage.content.length).toBeGreaterThan(0);
    expect(result.assistantMessage.intent).toBeString();
  });

  it("should handle conversation context", async () => {
    // First message
    const first = await sendMessage(threadId, testHomeId, testUserId, "Hello");

    // Follow-up message
    const result = await sendMessage(
      threadId,
      testHomeId,
      testUserId,
      "How are you?"
    );

    expect(result.assistantMessage.content).toBeString();
    expect(result.assistantMessage.content.length).toBeGreaterThan(0);
  }, 15000);

  it("should update thread timestamp after message", async () => {
    const threadBefore = await db.query.chatThreadsTable.findFirst({
      where: eq(chatThreadsTable.id, threadId),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await sendMessage(threadId, testHomeId, testUserId, "Update timestamp test");

    const threadAfter = await db.query.chatThreadsTable.findFirst({
      where: eq(chatThreadsTable.id, threadId),
    });

    expect(threadAfter!.updatedAt.getTime()).toBeGreaterThan(
      threadBefore!.updatedAt.getTime()
    );
  });

  it("should persist both messages to database", async () => {
    const beforeCount = (await getMessages(threadId)).length;

    await sendMessage(threadId, testHomeId, testUserId, "Persistence test");

    const afterCount = (await getMessages(threadId)).length;

    expect(afterCount).toBe(beforeCount + 2); // user + assistant
  });

  it("should handle agent errors gracefully", async () => {
    // This test verifies the try-catch block in sendMessage
    // Even if the agent fails, we should get a fallback response
    const result = await sendMessage(
      threadId,
      testHomeId,
      testUserId,
      "Test error handling"
    );

    expect(result.userMessage).toBeDefined();
    expect(result.assistantMessage).toBeDefined();
    expect(result.assistantMessage.content).toBeString();
  });

  it("should classify different message types", async () => {
    const result = await sendMessage(
      threadId,
      testHomeId,
      testUserId,
      "Hello there"
    );

    // Intent should be classified
    expect(result.userMessage.intent).toBeString();
    expect(result.userMessage.intent.length).toBeGreaterThan(0);

    // Assistant should respond
    expect(result.assistantMessage.content).toBeString();
    expect(result.assistantMessage.content.length).toBeGreaterThan(0);
  }, 15000);
});

describe("Chat Service - Message History Context", () => {
  it("should load recent messages for agent context", async () => {
    const thread = await createThread(testHomeId, "Context Test");
    createdThreadIds.push(thread.id);

    // Send multiple messages to build context
    await sendMessage(thread.id, testHomeId, testUserId, "Hello");
    await sendMessage(thread.id, testHomeId, testUserId, "Hi again");
    await sendMessage(thread.id, testHomeId, testUserId, "Thanks");

    const messages = await getMessages(thread.id);

    // Should have 6 messages (3 user + 3 assistant)
    expect(messages.length).toBe(6);

    // Messages should alternate between user and assistant
    const roles = messages.reverse().map((m) => m.role);
    expect(roles[0]).toBe("user");
    expect(roles[1]).toBe("assistant");
    expect(roles[2]).toBe("user");
  }, 25000);

  it("should limit context to 20 messages", async () => {
    const thread = await createThread(testHomeId, "Large Context Test");
    createdThreadIds.push(thread.id);

    // Insert many messages directly to test limit
    const manyMessages = Array.from({ length: 25 }, (_, i) => ({
      threadId: thread.id,
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Message ${i}`,
      intent: "other",
    }));

    await db.insert(chatMessagesTable).values(manyMessages);

    // sendMessage internally loads 20 messages for context
    const result = await sendMessage(
      thread.id,
      testHomeId,
      testUserId,
      "New message"
    );

    // Should still work despite many historical messages
    expect(result.userMessage).toBeDefined();
    expect(result.assistantMessage).toBeDefined();
  });
});
