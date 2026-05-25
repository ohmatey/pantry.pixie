/**
 * Unit tests for the receipt parse service. Runs against the deterministic mock
 * (NODE_ENV=test + no OPENAI_API_KEY); skipped if a real key is present since it
 * would call the live vision API.
 */

import { describe, it, expect, test } from "bun:test";
import { parseReceipt } from "../receipts";

if (process.env.OPENAI_API_KEY) {
  test.skip("Receipt parsing hits the live vision API when OPENAI_API_KEY is set", () => {});
} else {
  describe("Receipt parsing (mock mode)", () => {
    it("returns structured line items with prices", async () => {
      const parsed = await parseReceipt("data:image/jpeg;base64,TEST");
      expect(parsed.items.length).toBe(2);
      expect(parsed.merchant).toBeString();
      expect(parsed.total).toBe(200);

      const first = parsed.items[0];
      expect(first.name).toBeString();
      expect(first.quantity).toBeGreaterThan(0);
      expect(typeof first.price).toBe("number");
      expect(first.category).toBeString();
    });
  });
}
