/**
 * Zod validation schemas for API route inputs
 */

import { z } from "zod";
import { ItemCategory, Unit, ListSchedule } from "@pantry-pixie/core";
import { VALIDATION } from "@pantry-pixie/core";

// ============================================================================
// Auth schemas
// ============================================================================

export const registerSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(VALIDATION.USER.MIN_EMAIL_LENGTH)
    .max(VALIDATION.USER.MAX_EMAIL_LENGTH),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z
    .string()
    .min(VALIDATION.USER.MIN_NAME_LENGTH)
    .max(VALIDATION.USER.MAX_NAME_LENGTH),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================================
// Home schemas
// ============================================================================

export const createHomeSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.HOME.MIN_NAME_LENGTH)
    .max(VALIDATION.HOME.MAX_NAME_LENGTH),
});

export const updateHomeSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.HOME.MIN_NAME_LENGTH)
    .max(VALIDATION.HOME.MAX_NAME_LENGTH)
    .optional(),
});

// ============================================================================
// Item schemas
// ============================================================================

const itemCategoryValues = Object.values(ItemCategory) as [string, ...string[]];
const unitValues = Object.values(Unit) as [string, ...string[]];

export const createItemSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.ITEM.MIN_NAME_LENGTH)
    .max(VALIDATION.ITEM.MAX_NAME_LENGTH),
  quantity: z
    .number()
    .min(VALIDATION.ITEM.MIN_QUANTITY)
    .max(VALIDATION.ITEM.MAX_QUANTITY)
    .optional(),
  unit: z.enum(unitValues).optional(),
  category: z.enum(itemCategoryValues).optional(),
  location: z.string().max(255).optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  price: z.string().max(50).optional(),
});

export const updateItemSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.ITEM.MIN_NAME_LENGTH)
    .max(VALIDATION.ITEM.MAX_NAME_LENGTH)
    .optional(),
  quantity: z
    .number()
    .min(VALIDATION.ITEM.MIN_QUANTITY)
    .max(VALIDATION.ITEM.MAX_QUANTITY)
    .optional(),
  unit: z.enum(unitValues).optional(),
  category: z.enum(itemCategoryValues).optional(),
  location: z.string().max(255).optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  price: z.string().max(50).optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.string().max(50).optional(),
  isChecked: z.boolean().optional(),
});

// ============================================================================
// Grocery list schemas
// ============================================================================

const listScheduleValues = Object.values(ListSchedule) as [string, ...string[]];

const listItemInputSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
  estimatedPrice: z.string().max(50).optional(),
});

export const createGroceryListSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.LIST.MIN_NAME_LENGTH)
    .max(VALIDATION.LIST.MAX_NAME_LENGTH),
  description: z.string().max(1000).optional(),
  totalBudget: z.string().max(50).optional(),
  recurringSchedule: z.enum(listScheduleValues).nullable().optional(),
  scheduleDayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  scheduleDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  items: z.array(listItemInputSchema).max(VALIDATION.LIST.MAX_ITEMS).optional(),
});

export const updateGroceryListSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.LIST.MIN_NAME_LENGTH)
    .max(VALIDATION.LIST.MAX_NAME_LENGTH)
    .optional(),
  description: z.string().max(1000).optional(),
  totalBudget: z.string().max(50).optional(),
  recurringSchedule: z.enum(listScheduleValues).nullable().optional(),
  scheduleDayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  scheduleDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
});

export const addListItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
  estimatedPrice: z.string().max(50).optional(),
});

export const addListItemByNameSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(VALIDATION.ITEM.MAX_NAME_LENGTH),
  quantity: z.number().positive().optional(),
});

// ============================================================================
// Chat schemas
// ============================================================================

export const createThreadSchema = z.object({
  title: z.string().max(255).optional(),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(VALIDATION.CHAT.MIN_MESSAGE_LENGTH)
    .max(VALIDATION.CHAT.MAX_MESSAGE_LENGTH),
});

// ============================================================================
// Helper to parse and return validation error response
// ============================================================================

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  return {
    success: false,
    response: new Response(
      JSON.stringify({ success: false, error: "Validation failed", details: errors }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    ),
  };
}
