/**
 * @pantry-pixie/sdk
 * TypeScript client for Pantry Pixie API
 */

import type {
  Home,
  Item,
  GroceryList,
  ChatMessage,
  ChatThread,
  CreateItemInput,
  UpdateItemInput,
  CreateGroceryListInput,
  CreateChatThreadInput,
  SendChatMessageInput,
  ApiResponse,
  PaginatedResponse,
  AuthToken,
} from "@pantry-pixie/core";

export interface PantryPixieClientConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  timeout?: number;
}

/**
 * PantryPixieClient
 * Main SDK client for interacting with Pantry Pixie API
 *
 * Usage:
 * ```
 * const client = new PantryPixieClient({
 *   baseUrl: 'https://api.pantryx.pixie',
 *   accessToken: 'your-token'
 * });
 *
 * const homes = await client.homes.list();
 * const items = await client.items.list(homeId);
 * ```
 */
export class PantryPixieClient {
  private baseUrl: string;
  private apiKey?: string;
  private accessToken?: string;
  private timeout: number;

  public homes: HomeClient;
  public items: ItemClient;
  public lists: GroceryListClient;
  public chat: ChatClient;

  constructor(config: PantryPixieClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.timeout = config.timeout || 30000;

    // Initialize sub-clients
    this.homes = new HomeClient(this);
    this.items = new ItemClient(this);
    this.lists = new GroceryListClient(this);
    this.chat = new ChatClient(this);
  }

  /**
   * Set authentication token
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Make authenticated HTTP request
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    data?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

/**
 * Home Client
 * Manage homes and their configuration
 */
export class HomeClient {
  constructor(private client: PantryPixieClient) {}

  async list(): Promise<ApiResponse<Home[]>> {
    return this.client.request("GET", "/api/homes");
  }

  async get(homeId: string): Promise<ApiResponse<Home>> {
    return this.client.request("GET", `/api/homes/${homeId}`);
  }

  async create(data: {
    name: string;
    description?: string;
    monthlyBudget?: number;
  }): Promise<ApiResponse<Home>> {
    return this.client.request("POST", "/api/homes", data);
  }

  async update(
    homeId: string,
    data: Partial<{
      name: string;
      description: string;
      monthlyBudget: number;
    }>,
  ): Promise<ApiResponse<Home>> {
    return this.client.request("PUT", `/api/homes/${homeId}`, data);
  }

  async delete(homeId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.client.request("DELETE", `/api/homes/${homeId}`);
  }
}

/**
 * Item Client
 * Manage pantry inventory
 */
export class ItemClient {
  constructor(private client: PantryPixieClient) {}

  async list(
    homeId: string,
    options?: { page?: number; limit?: number },
  ): Promise<ApiResponse<PaginatedResponse<Item>>> {
    const params = new URLSearchParams();
    if (options?.page) params.append("page", options.page.toString());
    if (options?.limit) params.append("limit", options.limit.toString());

    const queryString = params.toString();
    const path = `/api/homes/${homeId}/items${queryString ? `?${queryString}` : ""}`;
    return this.client.request("GET", path);
  }

  async get(homeId: string, itemId: string): Promise<ApiResponse<Item>> {
    return this.client.request("GET", `/api/homes/${homeId}/items/${itemId}`);
  }

  async create(
    homeId: string,
    data: CreateItemInput,
  ): Promise<ApiResponse<Item>> {
    return this.client.request("POST", `/api/homes/${homeId}/items`, data);
  }

  async update(
    homeId: string,
    itemId: string,
    data: UpdateItemInput,
  ): Promise<ApiResponse<Item>> {
    return this.client.request(
      "PUT",
      `/api/homes/${homeId}/items/${itemId}`,
      data,
    );
  }

  async delete(
    homeId: string,
    itemId: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.client.request(
      "DELETE",
      `/api/homes/${homeId}/items/${itemId}`,
    );
  }
}

/**
 * Grocery List Client
 * Manage shopping lists
 */
export class GroceryListClient {
  constructor(private client: PantryPixieClient) {}

  async list(
    homeId: string,
    options?: { page?: number; limit?: number },
  ): Promise<ApiResponse<PaginatedResponse<GroceryList>>> {
    const params = new URLSearchParams();
    if (options?.page) params.append("page", options.page.toString());
    if (options?.limit) params.append("limit", options.limit.toString());

    const queryString = params.toString();
    const path = `/api/homes/${homeId}/lists${queryString ? `?${queryString}` : ""}`;
    return this.client.request("GET", path);
  }

  async get(homeId: string, listId: string): Promise<ApiResponse<GroceryList>> {
    return this.client.request("GET", `/api/homes/${homeId}/lists/${listId}`);
  }

  async create(
    homeId: string,
    data: CreateGroceryListInput,
  ): Promise<ApiResponse<GroceryList>> {
    return this.client.request("POST", `/api/homes/${homeId}/lists`, data);
  }

  async update(
    homeId: string,
    listId: string,
    data: Partial<CreateGroceryListInput>,
  ): Promise<ApiResponse<GroceryList>> {
    return this.client.request(
      "PUT",
      `/api/homes/${homeId}/lists/${listId}`,
      data,
    );
  }

  async delete(
    homeId: string,
    listId: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.client.request(
      "DELETE",
      `/api/homes/${homeId}/lists/${listId}`,
    );
  }
}

/**
 * Chat Client
 * Interact with Pixie conversational AI
 */
export class ChatClient {
  constructor(private client: PantryPixieClient) {}

  async listThreads(homeId: string): Promise<ApiResponse<ChatThread[]>> {
    return this.client.request("GET", `/api/homes/${homeId}/chat/threads`);
  }

  async getThread(
    homeId: string,
    threadId: string,
  ): Promise<ApiResponse<ChatThread>> {
    return this.client.request(
      "GET",
      `/api/homes/${homeId}/chat/threads/${threadId}`,
    );
  }

  async createThread(
    homeId: string,
    data?: CreateChatThreadInput,
  ): Promise<ApiResponse<ChatThread>> {
    return this.client.request(
      "POST",
      `/api/homes/${homeId}/chat/threads`,
      data || {},
    );
  }

  async sendMessage(
    homeId: string,
    threadId: string,
    data: SendChatMessageInput,
  ): Promise<ApiResponse<ChatMessage>> {
    return this.client.request(
      "POST",
      `/api/homes/${homeId}/chat/threads/${threadId}/messages`,
      data,
    );
  }

  async getMessages(
    homeId: string,
    threadId: string,
    options?: { limit?: number },
  ): Promise<ApiResponse<ChatMessage[]>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());

    const queryString = params.toString();
    const path = `/api/homes/${homeId}/chat/threads/${threadId}/messages${queryString ? `?${queryString}` : ""}`;
    return this.client.request("GET", path);
  }
}
