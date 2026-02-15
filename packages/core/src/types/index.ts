/**
 * Comprehensive TypeScript types for Pantry Pixie
 * These types extend the database schemas with additional application logic
 */
import { ItemCategory, ListStatus, RecurrenceType } from "../constants";

import type {
  User,
  NewUser,
  Home,
  NewHome,
  HomeMember,
  NewHomeMember,
  Item,
  NewItem,
  GroceryList,
  NewGroceryList,
  ListItem,
  NewListItem,
  ChatThread,
  NewChatThread,
  ChatMessage,
  NewChatMessage,
} from "../schema";

// ============================================================================
// User Types
// ============================================================================

export interface UserProfile extends User {
  homeCount: number;
  sharedHomeCount: number;
}

export interface UserSettings {
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyRecap: boolean;
    recurringItemReminders: boolean;
    budgetAlerts: boolean;
  };
  preferences: {
    defaultUnit: string;
    defaultCategory: string;
    defaultListDays: number;
  };
}

// ============================================================================
// Home Types
// ============================================================================

export interface HomeWithMembers extends Home {
  members: HomeMember[];
  itemCount: number;
  activeListsCount: number;
}

export interface HomeStats {
  totalItems: number;
  totalValue: number;
  itemsExpiringSoon: number;
  recurringItemsCount: number;
  monthlySpent: number;
  monthlyBudget: number | null;
  budgetPercentage: number | null;
}

// ============================================================================
// Item / Inventory Types
// ============================================================================

export interface ItemWithStatus extends Item {
  daysUntilExpiration: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  onActiveList: boolean;
}


export type RecurringInterval = "daily" | "weekly" | "biweekly" | "monthly";

export interface RecurringItem extends Item {
  recurringInterval: RecurringInterval;
  daysUntilNextNotification: number;
}

// ============================================================================
// Grocery List Types
// ============================================================================

export interface GroceryListWithItems extends GroceryList {
  items: (ListItem & { item: Item })[];
  completionPercentage: number;
  completedItems: number;
  totalItems: number;
}


export interface ListStats {
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
  estimatedTotal: number;
  estimatedPerItem: number;
}

// ============================================================================
// Chat Types
// ============================================================================

export type MessageRole = "user" | "assistant";

export type PixieIntent =
  | "add_to_list"
  | "add_item"
  | "remove_item"
  | "set_recurring"
  | "ask_status"
  | "budget_question"
  | "meal_planning"
  | "clarification_needed"
  | "greeting"
  | "other";

export interface ConversationMessage extends ChatMessage {
  displayName?: string;
  timestamp: Date;
}

export interface ChatContext {
  threadId: string;
  homeId: string;
  recentMessages: ChatMessage[];
  userProfile: UserProfile;
  homeStats: HomeStats;
  currentBudgetStatus: {
    spent: number;
    budget: number | null;
    percentageUsed: number | null;
  };
}

// ============================================================================
// API / Business Logic Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CreateItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  category?: ItemCategory;
  expiresAt?: Date;
  location?: string;
  price?: number;
  isRecurring?: boolean;
  recurringInterval?: RecurringInterval;
  notes?: string;
}

export interface UpdateItemInput {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: ItemCategory;
  expiresAt?: Date;
  location?: string;
  price?: number;
  isRecurring?: boolean;
  recurringInterval?: RecurringInterval;
  notes?: string;
}

export interface CreateGroceryListInput {
  name: string;
  description?: string;
  totalBudget?: number;
  items?: Array<{
    itemId: string;
    quantity: number;
  }>;
}

export interface CreateChatThreadInput {
  title?: string;
}

export interface SendChatMessageInput {
  content: string;
  intent?: PixieIntent;
}

// ============================================================================
// Integration Types
// ============================================================================

export interface InventorySnapshot {
  timestamp: Date;
  items: Item[];
  totalValue: number;
  categories: Record<ItemCategory, number>;
}

export interface BudgetReport {
  period: "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
  totalSpent: number;
  budget: number | null;
  percentageUsed: number | null;
  categories: Array<{
    category: ItemCategory;
    spent: number;
    itemCount: number;
  }>;
}

// ============================================================================
// Re-exports of schema types
// ============================================================================

export type {
  User,
  NewUser,
  Home,
  NewHome,
  HomeMember,
  NewHomeMember,
  Item,
  NewItem,
  GroceryList,
  NewGroceryList,
  ListItem,
  NewListItem,
  ChatThread,
  NewChatThread,
  ChatMessage,
  NewChatMessage,
};
