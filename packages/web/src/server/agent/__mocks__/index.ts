/**
 * Mock implementation of AI agent for testing
 * Provides deterministic responses without calling OpenAI API
 */

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamedResponse {
  textStream: ReadableStream<string>;
  intent: string;
  fullText: Promise<string>;
  toolResults: Promise<Array<{ toolName: string; result: unknown }>>;
}

/**
 * Mock responses based on user message content
 */
function getMockResponse(messages: AgentMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return "Hello! I'm Pixie, your pantry assistant. How can I help you today?";
  }

  const content = lastMessage.content.toLowerCase();

  // Greeting
  if (content.includes("hello") || content.includes("hi")) {
    return "Hello! I'm Pixie, your friendly pantry assistant. How can I help you today?";
  }

  // Add item
  if (content.includes("add") || content.includes("bought") || content.includes("got") || content.includes("need")) {
    return "I've added that to your pantry!";
  }

  // List/check items
  if (content.includes("what") || content.includes("list") || content.includes("have") || content.includes("pantry")) {
    return "Here's what you have in your pantry.";
  }

  // Remove item
  if (content.includes("remove") || content.includes("delete") || content.includes("used up")) {
    return "I've removed that from your pantry.";
  }

  // Thank you
  if (content.includes("thank")) {
    return "You're welcome! Let me know if you need anything else.";
  }

  // How are you
  if (content.includes("how are you")) {
    return "I'm doing great! Ready to help you manage your pantry.";
  }

  // Default response
  return "I'm here to help you manage your pantry. You can ask me to add items, check what you have, or remove things you've used up!";
}

/**
 * Mock streaming text implementation
 */
function createMockTextStream(text: string): ReadableStream<string> {
  const chunks = text.split(" ");
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        const chunk = index === 0 ? chunks[index] : " " + chunks[index];
        controller.enqueue(chunk);
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Mock createPixieResponse for testing
 */
export async function createPixieResponse(
  homeId: string,
  messages: AgentMessage[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _userPreferences?: any,
  _listId?: string | null,
): Promise<StreamedResponse> {
  const responseText = getMockResponse(messages);
  const lastMessage = messages[messages.length - 1];
  const intent = lastMessage?.content.toLowerCase().includes("add")
    ? "add_item"
    : lastMessage?.content.toLowerCase().includes("hello")
      ? "greeting"
      : "other";

  return {
    textStream: createMockTextStream(responseText),
    intent,
    fullText: Promise.resolve(responseText),
    toolResults: Promise.resolve([]),
  };
}

/**
 * Mock initializeAgent for testing
 */
export async function initializeAgent(): Promise<boolean> {
  return true;
}

export type { StreamedResponse as AgentResult };
