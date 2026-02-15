/**
 * Unit tests for shared constants, enums, and validation rules
 * Ensures integrity of values used across all packages
 */

import { describe, it, expect } from "bun:test";
import {
  ItemCategory,
  RecurrenceType,
  ListStatus,
  MemberRole,
  IntentType,
  Unit,
  ChatRole,
  ErrorCode,
  VALIDATION,
  PAGINATION,
  CACHE_TTL,
  DEFAULTS,
} from "../constants";

// ============================================================================
// Enums — value integrity
// ============================================================================

describe("ItemCategory enum", () => {
  it("should have 12 categories", () => {
    const values = Object.values(ItemCategory);
    expect(values.length).toBe(12);
  });

  it("should contain all expected categories", () => {
    expect(ItemCategory.DAIRY).toBe("dairy");
    expect(ItemCategory.MEAT).toBe("meat");
    expect(ItemCategory.PRODUCE).toBe("produce");
    expect(ItemCategory.GRAINS).toBe("grains");
    expect(ItemCategory.PANTRY).toBe("pantry");
    expect(ItemCategory.FROZEN).toBe("frozen");
    expect(ItemCategory.BEVERAGES).toBe("beverages");
    expect(ItemCategory.SNACKS).toBe("snacks");
    expect(ItemCategory.CONDIMENTS).toBe("condiments");
    expect(ItemCategory.SPICES).toBe("spices");
    expect(ItemCategory.BAKING).toBe("baking");
    expect(ItemCategory.OTHER).toBe("other");
  });

  it("should use lowercase string values", () => {
    for (const value of Object.values(ItemCategory)) {
      expect(value).toBe(value.toLowerCase());
    }
  });
});

describe("RecurrenceType enum", () => {
  it("should have 8 recurrence types", () => {
    const values = Object.values(RecurrenceType);
    expect(values.length).toBe(8);
  });

  it("should contain all expected types", () => {
    expect(RecurrenceType.ONCE).toBe("once");
    expect(RecurrenceType.DAILY).toBe("daily");
    expect(RecurrenceType.WEEKLY).toBe("weekly");
    expect(RecurrenceType.BIWEEKLY).toBe("biweekly");
    expect(RecurrenceType.MONTHLY).toBe("monthly");
    expect(RecurrenceType.QUARTERLY).toBe("quarterly");
    expect(RecurrenceType.YEARLY).toBe("yearly");
    expect(RecurrenceType.CUSTOM).toBe("custom");
  });
});

describe("ListStatus enum", () => {
  it("should have 4 statuses", () => {
    const values = Object.values(ListStatus);
    expect(values.length).toBe(4);
  });

  it("should contain all expected statuses", () => {
    expect(ListStatus.DRAFT).toBe("draft");
    expect(ListStatus.ACTIVE).toBe("active");
    expect(ListStatus.COMPLETED).toBe("completed");
    expect(ListStatus.ARCHIVED).toBe("archived");
  });
});

describe("MemberRole enum", () => {
  it("should have 4 roles", () => {
    const values = Object.values(MemberRole);
    expect(values.length).toBe(4);
  });

  it("should contain all expected roles", () => {
    expect(MemberRole.OWNER).toBe("owner");
    expect(MemberRole.ADMIN).toBe("admin");
    expect(MemberRole.MEMBER).toBe("member");
    expect(MemberRole.VIEWER).toBe("viewer");
  });
});

describe("IntentType enum", () => {
  it("should have 11 intent types", () => {
    const values = Object.values(IntentType);
    expect(values.length).toBe(11);
  });

  it("should contain core CRUD intents", () => {
    expect(IntentType.ADD_ITEM).toBe("add_item");
    expect(IntentType.REMOVE_ITEM).toBe("remove_item");
    expect(IntentType.UPDATE_ITEM).toBe("update_item");
  });

  it("should contain list management intents", () => {
    expect(IntentType.CREATE_LIST).toBe("create_list");
    expect(IntentType.ADD_TO_LIST).toBe("add_to_list");
    expect(IntentType.REMOVE_FROM_LIST).toBe("remove_from_list");
  });

  it("should contain query intents", () => {
    expect(IntentType.SEARCH_ITEMS).toBe("search_items");
    expect(IntentType.GET_RECOMMENDATIONS).toBe("get_recommendations");
  });

  it("should have an UNKNOWN fallback", () => {
    expect(IntentType.UNKNOWN).toBe("unknown");
  });
});

describe("Unit enum", () => {
  it("should have 18 unit types", () => {
    const values = Object.values(Unit);
    expect(values.length).toBe(18);
  });

  it("should contain common weight units", () => {
    expect(Unit.GRAM).toBe("gram");
    expect(Unit.KILOGRAM).toBe("kg");
    expect(Unit.OUNCE).toBe("oz");
    expect(Unit.POUND).toBe("lb");
  });

  it("should contain common volume units", () => {
    expect(Unit.MILLILITER).toBe("ml");
    expect(Unit.LITER).toBe("liter");
    expect(Unit.CUP).toBe("cup");
    expect(Unit.TABLESPOON).toBe("tbsp");
    expect(Unit.TEASPOON).toBe("tsp");
  });

  it("should contain common count units", () => {
    expect(Unit.PIECE).toBe("piece");
    expect(Unit.DOZEN).toBe("dozen");
    expect(Unit.BUNCH).toBe("bunch");
  });

  it("should contain container units", () => {
    expect(Unit.BOTTLE).toBe("bottle");
    expect(Unit.BOX).toBe("box");
    expect(Unit.BAG).toBe("bag");
    expect(Unit.PACKAGE).toBe("package");
    expect(Unit.JAR).toBe("jar");
    expect(Unit.LOAF).toBe("loaf");
  });
});

describe("ChatRole enum", () => {
  it("should have 3 roles", () => {
    const values = Object.values(ChatRole);
    expect(values.length).toBe(3);
  });

  it("should contain user, assistant, and system", () => {
    expect(ChatRole.USER).toBe("user");
    expect(ChatRole.ASSISTANT).toBe("assistant");
    expect(ChatRole.SYSTEM).toBe("system");
  });
});

describe("ErrorCode enum", () => {
  it("should have 8 error codes", () => {
    const values = Object.values(ErrorCode);
    expect(values.length).toBe(8);
  });

  it("should contain expected error codes", () => {
    expect(ErrorCode.INVALID_INPUT).toBe("INVALID_INPUT");
    expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
    expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
    expect(ErrorCode.CONFLICT).toBe("CONFLICT");
    expect(ErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    expect(ErrorCode.RATE_LIMIT).toBe("RATE_LIMIT");
    expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
  });

  it("should use UPPER_SNAKE_CASE values", () => {
    for (const value of Object.values(ErrorCode)) {
      expect(value).toMatch(/^[A-Z_]+$/);
    }
  });
});

// ============================================================================
// VALIDATION constants
// ============================================================================

describe("VALIDATION constants", () => {
  it("should have user validation rules", () => {
    expect(VALIDATION.USER.MIN_NAME_LENGTH).toBe(1);
    expect(VALIDATION.USER.MAX_NAME_LENGTH).toBe(255);
    expect(VALIDATION.USER.MIN_EMAIL_LENGTH).toBe(5);
    expect(VALIDATION.USER.MAX_EMAIL_LENGTH).toBe(255);
  });

  it("should have home validation rules", () => {
    expect(VALIDATION.HOME.MIN_NAME_LENGTH).toBe(1);
    expect(VALIDATION.HOME.MAX_NAME_LENGTH).toBe(255);
    expect(VALIDATION.HOME.MAX_MEMBERS).toBe(50);
  });

  it("should have item validation rules", () => {
    expect(VALIDATION.ITEM.MIN_NAME_LENGTH).toBe(1);
    expect(VALIDATION.ITEM.MAX_NAME_LENGTH).toBe(255);
    expect(VALIDATION.ITEM.MIN_QUANTITY).toBe(0);
    expect(VALIDATION.ITEM.MAX_QUANTITY).toBe(999999);
  });

  it("should have list validation rules", () => {
    expect(VALIDATION.LIST.MIN_NAME_LENGTH).toBe(1);
    expect(VALIDATION.LIST.MAX_NAME_LENGTH).toBe(255);
    expect(VALIDATION.LIST.MAX_ITEMS).toBe(500);
  });

  it("should have chat validation rules", () => {
    expect(VALIDATION.CHAT.MIN_MESSAGE_LENGTH).toBe(1);
    expect(VALIDATION.CHAT.MAX_MESSAGE_LENGTH).toBe(2000);
    expect(VALIDATION.CHAT.MAX_HISTORY).toBe(100);
  });

  it("should have min < max for all length constraints", () => {
    expect(VALIDATION.USER.MIN_NAME_LENGTH).toBeLessThan(VALIDATION.USER.MAX_NAME_LENGTH);
    expect(VALIDATION.USER.MIN_EMAIL_LENGTH).toBeLessThan(VALIDATION.USER.MAX_EMAIL_LENGTH);
    expect(VALIDATION.ITEM.MIN_NAME_LENGTH).toBeLessThan(VALIDATION.ITEM.MAX_NAME_LENGTH);
    expect(VALIDATION.LIST.MIN_NAME_LENGTH).toBeLessThan(VALIDATION.LIST.MAX_NAME_LENGTH);
    expect(VALIDATION.CHAT.MIN_MESSAGE_LENGTH).toBeLessThan(VALIDATION.CHAT.MAX_MESSAGE_LENGTH);
  });

  it("should have min quantity <= max quantity", () => {
    expect(VALIDATION.ITEM.MIN_QUANTITY).toBeLessThanOrEqual(VALIDATION.ITEM.MAX_QUANTITY);
  });
});

// ============================================================================
// PAGINATION constants
// ============================================================================

describe("PAGINATION constants", () => {
  it("should have reasonable defaults", () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBe(20);
    expect(PAGINATION.MAX_LIMIT).toBe(100);
    expect(PAGINATION.DEFAULT_OFFSET).toBe(0);
  });

  it("should have default < max", () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBeLessThan(PAGINATION.MAX_LIMIT);
  });

  it("should have non-negative offset", () => {
    expect(PAGINATION.DEFAULT_OFFSET).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// CACHE_TTL constants
// ============================================================================

describe("CACHE_TTL constants", () => {
  it("should have positive TTL values in seconds", () => {
    expect(CACHE_TTL.USER_PROFILE).toBeGreaterThan(0);
    expect(CACHE_TTL.ITEM_LIST).toBeGreaterThan(0);
    expect(CACHE_TTL.HOME_DATA).toBeGreaterThan(0);
    expect(CACHE_TTL.CHAT_HISTORY).toBeGreaterThan(0);
  });

  it("should have user profile cached longest", () => {
    expect(CACHE_TTL.USER_PROFILE).toBeGreaterThan(CACHE_TTL.CHAT_HISTORY);
  });

  it("should have chat history with shortest TTL", () => {
    expect(CACHE_TTL.CHAT_HISTORY).toBeLessThanOrEqual(CACHE_TTL.ITEM_LIST);
    expect(CACHE_TTL.CHAT_HISTORY).toBeLessThanOrEqual(CACHE_TTL.HOME_DATA);
    expect(CACHE_TTL.CHAT_HISTORY).toBeLessThanOrEqual(CACHE_TTL.USER_PROFILE);
  });
});

// ============================================================================
// DEFAULTS constants
// ============================================================================

describe("DEFAULTS constants", () => {
  it("should have positive default values", () => {
    expect(DEFAULTS.ITEM_EXPIRY_DAYS).toBeGreaterThan(0);
    expect(DEFAULTS.LIST_REMINDER_HOURS).toBeGreaterThan(0);
    expect(DEFAULTS.INACTIVE_SESSION_HOURS).toBeGreaterThan(0);
  });

  it("should have reasonable expiry default", () => {
    expect(DEFAULTS.ITEM_EXPIRY_DAYS).toBe(30);
  });

  it("should have reasonable reminder hours", () => {
    expect(DEFAULTS.LIST_REMINDER_HOURS).toBe(24);
  });
});
