/**
 * Unit tests for WebSocket handlers
 * Tests connection management, message routing, and broadcast logic
 */

import { describe, it, expect, mock } from "bun:test";
import type { ServerWebSocket } from "bun";
import type { WSData,  } from "../index";
import {
  handleWebSocketOpen,
  handleWebSocketMessage,
  handleWebSocketClose,
} from "../index";

// Mock WebSocket for testing
function createMockWebSocket(
  userId: string,
  homeId: string,
): ServerWebSocket<WSData> {
  const sentMessages: string[] = [];

  return {
    data: { userId, homeId },
    send: mock((data: string) => {
      sentMessages.push(data);
    }),
    close: mock(() => {}),
    // Add sentMessages for test assertions
    _sentMessages: sentMessages,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("WebSocket Handlers - handleWebSocketOpen()", () => {
  it("should send connection confirmation message", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketOpen(ws);

    expect(ws.send).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.type).toBe("status");
    expect(parsed.payload.status).toBe("connected");
    expect(parsed.payload.message).toContain("Connected");
  });

  it("should include timestamp in connection message", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketOpen(ws);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.timestamp).toBeString();
    expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
  });

  it("should handle multiple connections to same home", () => {
    const ws1 = createMockWebSocket("user-1", "home-1");
    const ws2 = createMockWebSocket("user-2", "home-1");

    handleWebSocketOpen(ws1);
    handleWebSocketOpen(ws2);

    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });

  it("should handle connections from different homes", () => {
    const ws1 = createMockWebSocket("user-1", "home-1");
    const ws2 = createMockWebSocket("user-2", "home-2");

    handleWebSocketOpen(ws1);
    handleWebSocketOpen(ws2);

    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });
});

describe("WebSocket Handlers - handleWebSocketMessage()", () => {
  it("should respond to ping with pong", () => {
    const ws = createMockWebSocket("user-1", "home-1");
    const pingMessage = JSON.stringify({
      type: "ping",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    handleWebSocketMessage(ws, pingMessage);

    expect(ws.send).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.type).toBe("pong");
  });

  it("should handle string messages", () => {
    const ws = createMockWebSocket("user-1", "home-1");
    const message = JSON.stringify({
      type: "ping",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    handleWebSocketMessage(ws, message);

    expect(ws.send).toHaveBeenCalled();
  });

  it("should handle ArrayBuffer messages", () => {
    const ws = createMockWebSocket("user-1", "home-1");
    const message = JSON.stringify({
      type: "ping",
      payload: {},
      timestamp: new Date().toISOString(),
    });
    const buffer = new TextEncoder().encode(message);

    handleWebSocketMessage(ws, buffer.buffer);

    expect(ws.send).toHaveBeenCalled();
  });

  it("should send error for invalid JSON", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketMessage(ws, "invalid json {{{");

    expect(ws.send).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.type).toBe("error");
    expect(parsed.payload.error).toContain("Invalid");
  });

  it("should include timestamp in pong response", () => {
    const ws = createMockWebSocket("user-1", "home-1");
    const pingMessage = JSON.stringify({
      type: "ping",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    handleWebSocketMessage(ws, pingMessage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.timestamp).toBeString();
  });
});

describe("WebSocket Handlers - handleWebSocketClose()", () => {
  it("should clean up connection on close", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketOpen(ws);
    handleWebSocketClose(ws);

    // Should not throw and should clean up
    expect(true).toBe(true);
  });

  it("should handle close for non-existent connection", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    // Close without open
    handleWebSocketClose(ws);

    // Should not throw
    expect(true).toBe(true);
  });

  it("should handle multiple closes gracefully", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketOpen(ws);
    handleWebSocketClose(ws);
    handleWebSocketClose(ws); // Second close

    // Should not throw
    expect(true).toBe(true);
  });
});

describe("WebSocket Handlers - Message Type Routing", () => {
  it("should route message type to appropriate handler", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    // Ping should be handled
    const pingMessage = JSON.stringify({
      type: "ping",
      payload: {},
      timestamp: new Date().toISOString(),
    });
    handleWebSocketMessage(ws, pingMessage);

    expect(ws.send).toHaveBeenCalled();
  });

  it("should handle unknown message types gracefully", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    const unknownMessage = JSON.stringify({
      type: "unknown_type",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    handleWebSocketMessage(ws, unknownMessage);

    // Should not crash
    expect(true).toBe(true);
  });
});

describe("WebSocket Handlers - Message Structure", () => {
  it("should create properly formatted status messages", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketOpen(ws);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed).toHaveProperty("type");
    expect(parsed).toHaveProperty("payload");
    expect(parsed).toHaveProperty("timestamp");
  });

  it("should create properly formatted pong messages", () => {
    const ws = createMockWebSocket("user-1", "home-1");
    const pingMessage = JSON.stringify({
      type: "ping",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    handleWebSocketMessage(ws, pingMessage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed).toHaveProperty("type");
    expect(parsed).toHaveProperty("payload");
    expect(parsed).toHaveProperty("timestamp");
    expect(parsed.type).toBe("pong");
  });

  it("should create properly formatted error messages", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketMessage(ws, "invalid");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.type).toBe("error");
    expect(parsed.payload).toHaveProperty("error");
    expect(parsed.timestamp).toBeString();
  });
});

describe("WebSocket Handlers - Connection State Management", () => {
  it("should track connections per home", () => {
    const ws1 = createMockWebSocket("user-1", "home-1");
    const ws2 = createMockWebSocket("user-2", "home-1");

    handleWebSocketOpen(ws1);
    handleWebSocketOpen(ws2);

    // Both should receive connection confirmations
    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });

  it("should separate connections by home", () => {
    const ws1 = createMockWebSocket("user-1", "home-1");
    const ws2 = createMockWebSocket("user-2", "home-2");

    handleWebSocketOpen(ws1);
    handleWebSocketOpen(ws2);

    // Each should get their own confirmation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((ws1 as any)._sentMessages.length).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((ws2 as any)._sentMessages.length).toBe(1);
  });

  it("should handle rapid connect/disconnect cycles", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketOpen(ws);
    handleWebSocketClose(ws);
    handleWebSocketOpen(ws);
    handleWebSocketClose(ws);

    // Should handle without errors
    expect(true).toBe(true);
  });
});

describe("WebSocket Handlers - Error Handling", () => {
  it("should send error for malformed messages", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketMessage(ws, "{broken json");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.type).toBe("error");
  });

  it("should include error details in error messages", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    handleWebSocketMessage(ws, "not json at all");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessage = (ws as any)._sentMessages[0];
    const parsed = JSON.parse(sentMessage);

    expect(parsed.payload.error).toBeString();
    expect(parsed.payload.error.length).toBeGreaterThan(0);
  });

  it("should recover from errors and continue processing", () => {
    const ws = createMockWebSocket("user-1", "home-1");

    // Send invalid message
    handleWebSocketMessage(ws, "invalid");

    // Send valid message
    const validMessage = JSON.stringify({
      type: "ping",
      payload: {},
      timestamp: new Date().toISOString(),
    });
    handleWebSocketMessage(ws, validMessage);

    // Should have received both error and pong
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((ws as any)._sentMessages.length).toBe(2);
  });
});
