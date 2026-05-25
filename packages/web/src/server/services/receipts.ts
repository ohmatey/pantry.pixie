/**
 * Receipt parsing — turns a receipt photo into structured line items using the
 * existing vision-capable model (gpt-4o-mini). Parsing only; the caller reviews
 * the result and confirms before anything is saved. Mocked in test mode.
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  ItemCategory,
  db,
  eq,
  and,
  desc,
  receiptsTable,
  itemsTable,
  type Receipt,
  type Item,
} from "@pantry-pixie/core";

const USE_MOCK =
  process.env.NODE_ENV === "test" && !process.env.OPENAI_API_KEY;

const CATEGORIES = Object.values(ItemCategory) as string[];

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  price?: number;
}

export interface ParsedReceipt {
  merchant: string | null;
  purchasedAt: string | null; // ISO 8601 if detected
  currency: string | null;
  total: number | null;
  items: ParsedReceiptItem[];
}

const receiptSchema = z.object({
  merchant: z.string().nullable(),
  purchasedAt: z
    .string()
    .nullable()
    .describe("Purchase date in ISO 8601 if visible, else null"),
  currency: z.string().nullable().describe("ISO currency code, e.g. THB"),
  total: z.number().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      category: z.string().nullable(),
      price: z.number().nullable().describe("line total in the receipt currency"),
    }),
  ),
});

/**
 * @param imageDataUrl a data URL (`data:image/jpeg;base64,...`) of the receipt
 */
export async function parseReceipt(
  imageDataUrl: string,
): Promise<ParsedReceipt> {
  if (USE_MOCK) {
    return {
      merchant: "Test Mart",
      purchasedAt: new Date().toISOString(),
      currency: "THB",
      total: 200,
      items: [
        { name: "Milk", quantity: 1, unit: "carton", category: "dairy", price: 120 },
        { name: "Bananas", quantity: 1, unit: "bunch", category: "produce", price: 80 },
      ],
    };
  }

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: receiptSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract the purchased line items from this grocery receipt.
For each product return: a cleaned, human-readable name; quantity (default 1); unit if shown; a category chosen from this list [${CATEGORIES.join(", ")}] (best guess, otherwise "other"); and its line price.
Also extract the merchant/store name, the purchase date (ISO 8601 if present), the currency code, and the receipt total.
Ignore non-product lines: subtotals, tax/VAT, totals, change, rounding, loyalty points, and payment method. If the image is not a readable receipt, return an empty items array.`,
          },
          { type: "image", image: imageDataUrl },
        ],
      },
    ],
  });

  const items: ParsedReceiptItem[] = object.items.map((it) => ({
    name: it.name.trim(),
    quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
    unit: it.unit ?? undefined,
    category:
      it.category && CATEGORIES.includes(it.category) ? it.category : "other",
    price: it.price != null && it.price >= 0 ? it.price : undefined,
  }));

  return {
    merchant: object.merchant,
    purchasedAt: object.purchasedAt,
    currency: object.currency,
    total: object.total,
    items,
  };
}

export interface CreateReceiptInput {
  homeId: string;
  merchant?: string | null;
  purchasedAt?: Date | null;
  currency?: string | null;
  total?: number | null;
  itemCount: number;
  scannedBy?: string;
}

/** Persist a receipt header so the purchase is auditable (merchant/date/total). */
export async function createReceipt(
  input: CreateReceiptInput,
): Promise<Receipt> {
  const [receipt] = await db
    .insert(receiptsTable)
    .values({
      homeId: input.homeId,
      merchant: input.merchant ?? null,
      purchasedAt: input.purchasedAt ?? null,
      currency: input.currency ?? null,
      total: input.total ?? null,
      itemCount: input.itemCount,
      scannedBy: input.scannedBy,
    })
    .returning();
  return receipt;
}

/** Recent receipts for a home, newest first. */
export async function listReceipts(
  homeId: string,
  limit = 50,
): Promise<Receipt[]> {
  return db.query.receiptsTable.findMany({
    where: eq(receiptsTable.homeId, homeId),
    orderBy: [desc(receiptsTable.createdAt)],
    limit,
  });
}

/** A single receipt plus the items that were added from it. */
export async function getReceipt(
  homeId: string,
  id: string,
): Promise<{ receipt: Receipt; items: Item[] } | undefined> {
  const receipt = await db.query.receiptsTable.findFirst({
    where: and(eq(receiptsTable.id, id), eq(receiptsTable.homeId, homeId)),
  });
  if (!receipt) return undefined;
  const items = await db.query.itemsTable.findMany({
    where: eq(itemsTable.receiptId, id),
  });
  return { receipt, items };
}
