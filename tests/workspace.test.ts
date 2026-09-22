import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  defaultData,
  letterSchema,
  sortDocuments,
  type Item,
} from "../src/lib/workspace/model";
import { emailDraft, renderLetter } from "../src/lib/workspace/pdf";
import { identifyFile } from "../src/lib/workspace/files";
test("document date wins over upload date, with upload fallback", () => {
  const item = (id: string, date: string, created_at: string): Item =>
    ({ id, owner_id: "test-owner", kind: "document", title: "Test", version: 1, data: { date }, created_at, updated_at: created_at });
  const result = sortDocuments([
    item("a", "2026-01-01", "2026-09-01"),
    item("b", "2026-08-01", "2026-08-02"),
    item("c", "", "2026-07-01"),
  ]);
  assert.deepEqual(
    result.map((i) => i.id),
    ["b", "c", "a"],
  );
});
test("long letters generate readable multipage A4 PDFs", async () => {
  const letter = letterSchema.parse({
    ...defaultData("letter"),
    sender: "Alex Muster",
    senderAddress: "Musterweg 1\n12345 Musterstadt",
    recipient: "Beispielstelle\nPostfach 1\n12345 Musterstadt",
    body: "Ein langer Absatz mit Umlauten: ä ö ü ß.\n".repeat(130),
  });
  const bytes = await renderLetter("Testbetreff", letter);
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() > 2);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 595.28) < 0.1);
  const eml = emailDraft(
    "test@example.com",
    "Rückfrage",
    "Testnachricht",
    bytes,
  );
  assert.match(eml, /X-Unsent: 1/);
  assert.match(eml, /application\/pdf/);
  assert.throws(() =>
    emailDraft("a@example.com\r\nBcc: b@example.com", "x", "y"),
  );
});
test("reject unknown upload formats", () => {
  assert.equal(identifyFile(Buffer.from("<script>alert(1)</script>")), null);
  assert.equal(identifyFile(Buffer.from("%PDF-1.4\n")), "application/pdf");
});
