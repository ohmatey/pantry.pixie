/**
 * Unit tests for EventBus
 * Tests subscribe, emit, unsubscribe, and error handling — pure in-memory, no DB
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";

// We need a fresh EventBus per test — import the class pattern
// The module exports a singleton, so we re-import to test behavior
import { eventBus } from "../events";

describe("EventBus - on() subscription", () => {
  it("should register handler for an event", () => {
    const handler = mock(() => {});
    eventBus.on("test:register", handler);
    eventBus.emit("test:register", { msg: "hello" });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should return an unsubscribe function", () => {
    const handler = mock(() => {});
    const unsub = eventBus.on("test:unsub-type", handler);

    expect(typeof unsub).toBe("function");
  });

  it("should allow multiple handlers for the same event", () => {
    const handler1 = mock(() => {});
    const handler2 = mock(() => {});

    eventBus.on("test:multi", handler1);
    eventBus.on("test:multi", handler2);
    eventBus.emit("test:multi", {});

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});

describe("EventBus - emit()", () => {
  it("should call handler with the emitted data", () => {
    let received: any = null;
    eventBus.on("test:data", (data) => {
      received = data;
    });

    const payload = { itemId: "123", name: "Milk" };
    eventBus.emit("test:data", payload);

    expect(received).toEqual(payload);
  });

  it("should not throw when emitting event with no handlers", () => {
    expect(() => {
      eventBus.emit("test:no-handlers", { data: "test" });
    }).not.toThrow();
  });

  it("should call handlers in order of registration", () => {
    const order: number[] = [];

    eventBus.on("test:order", () => order.push(1));
    eventBus.on("test:order", () => order.push(2));
    eventBus.on("test:order", () => order.push(3));

    eventBus.emit("test:order", {});

    expect(order).toEqual([1, 2, 3]);
  });

  it("should support multiple emissions", () => {
    const handler = mock(() => {});
    eventBus.on("test:repeat", handler);

    eventBus.emit("test:repeat", { n: 1 });
    eventBus.emit("test:repeat", { n: 2 });
    eventBus.emit("test:repeat", { n: 3 });

    expect(handler).toHaveBeenCalledTimes(3);
  });

  it("should not call handlers for different events", () => {
    const handler = mock(() => {});
    eventBus.on("test:specific-event", handler);

    eventBus.emit("test:different-event", {});

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("EventBus - unsubscribe", () => {
  it("should stop receiving events after unsubscribe", () => {
    const handler = mock(() => {});
    const unsub = eventBus.on("test:unsub", handler);

    eventBus.emit("test:unsub", {});
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();

    eventBus.emit("test:unsub", {});
    expect(handler).toHaveBeenCalledTimes(1); // still 1
  });

  it("should only unsubscribe the specific handler", () => {
    const handler1 = mock(() => {});
    const handler2 = mock(() => {});

    const unsub1 = eventBus.on("test:selective-unsub", handler1);
    eventBus.on("test:selective-unsub", handler2);

    unsub1();

    eventBus.emit("test:selective-unsub", {});

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should handle double unsubscribe gracefully", () => {
    const handler = mock(() => {});
    const unsub = eventBus.on("test:double-unsub", handler);

    unsub();
    expect(() => unsub()).not.toThrow(); // second call should not throw
  });
});

describe("EventBus - error handling", () => {
  it("should not stop other handlers when one throws", () => {
    const handler1 = mock(() => {
      throw new Error("handler 1 failed");
    });
    const handler2 = mock(() => {});

    eventBus.on("test:error-isolation", handler1);
    eventBus.on("test:error-isolation", handler2);

    // Should not throw despite handler1 throwing
    expect(() => {
      eventBus.emit("test:error-isolation", {});
    }).not.toThrow();

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});

describe("EventBus - real-world event patterns", () => {
  it("should work with item:added event pattern", () => {
    let addedItem: any = null;
    eventBus.on("item:added:test", (data) => {
      addedItem = data;
    });

    eventBus.emit("item:added:test", {
      homeId: "home-1",
      item: { id: "item-1", name: "Milk", category: "dairy" },
    });

    expect(addedItem).toBeDefined();
    expect(addedItem.item.name).toBe("Milk");
    expect(addedItem.homeId).toBe("home-1");
  });

  it("should work with message:sent event pattern", () => {
    let sentMessage: any = null;
    eventBus.on("message:sent:test", (data) => {
      sentMessage = data;
    });

    eventBus.emit("message:sent:test", {
      threadId: "thread-1",
      homeId: "home-1",
      message: { content: "Hello Pixie!", role: "user" },
    });

    expect(sentMessage).toBeDefined();
    expect(sentMessage.message.content).toBe("Hello Pixie!");
  });
});
