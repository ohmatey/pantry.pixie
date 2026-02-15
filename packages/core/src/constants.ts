/**
 * Shared constants, enums, and validation rules for Pantry Pixie
 */

// Item categories for categorizing pantry items
export enum ItemCategory {
  DAIRY = "dairy",
  MEAT = "meat",
  PRODUCE = "produce",
  GRAINS = "grains",
  PANTRY = "pantry",
  FROZEN = "frozen",
  BEVERAGES = "beverages",
  SNACKS = "snacks",
  CONDIMENTS = "condiments",
  SPICES = "spices",
  BAKING = "baking",
  OTHER = "other",
}

// Recurrence patterns for items that need restocking
export enum RecurrenceType {
  ONCE = "once",
  DAILY = "daily",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
  CUSTOM = "custom",
}

// Status of grocery lists
export enum ListStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

// Recurring schedule for grocery lists
export enum ListSchedule {
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
}

// Role-based access control for home members
export enum MemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
}

// Intent types for AI classification
export enum IntentType {
  ADD_ITEM = "add_item",
  REMOVE_ITEM = "remove_item",
  UPDATE_ITEM = "update_item",
  CREATE_LIST = "create_list",
  ADD_TO_LIST = "add_to_list",
  REMOVE_FROM_LIST = "remove_from_list",
  MARK_ITEM_USED = "mark_item_used",
  SEARCH_ITEMS = "search_items",
  GET_RECOMMENDATIONS = "get_recommendations",
  MANAGE_HOUSEHOLD = "manage_household",
  UNKNOWN = "unknown",
}

// Units of measurement for items
export enum Unit {
  PIECE = "piece",
  GRAM = "gram",
  KILOGRAM = "kg",
  MILLILITER = "ml",
  LITER = "liter",
  OUNCE = "oz",
  POUND = "lb",
  CUP = "cup",
  TABLESPOON = "tbsp",
  TEASPOON = "tsp",
  BUNCH = "bunch",
  DOZEN = "dozen",
  LOAF = "loaf",
  BOTTLE = "bottle",
  BOX = "box",
  BAG = "bag",
  PACKAGE = "package",
  JAR = "jar",
}

// Validation constraints
export const VALIDATION = {
  USER: {
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 255,
    MIN_EMAIL_LENGTH: 5,
    MAX_EMAIL_LENGTH: 255,
  },
  HOME: {
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 255,
    MAX_MEMBERS: 50,
  },
  ITEM: {
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 255,
    MIN_QUANTITY: 0,
    MAX_QUANTITY: 999999,
  },
  LIST: {
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 255,
    MAX_ITEMS: 500,
  },
  CHAT: {
    MIN_MESSAGE_LENGTH: 1,
    MAX_MESSAGE_LENGTH: 2000,
    MAX_HISTORY: 100,
  },
};

// Chat message roles
export enum ChatRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
};

// Cache keys and TTLs
export const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  ITEM_LIST: 60, // 1 minute
  HOME_DATA: 120, // 2 minutes
  CHAT_HISTORY: 30, // 30 seconds
};

// Date/time defaults
export const DEFAULTS = {
  ITEM_EXPIRY_DAYS: 30,
  LIST_REMINDER_HOURS: 24,
  INACTIVE_SESSION_HOURS: 24,
};

// Error codes
export enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}
