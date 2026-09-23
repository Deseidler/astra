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
  const item = (id: string, date: string, created_at: string): Item => ({
    id,
    owner_id: "test-owner",
    kind: "document",
    title: "Test",
    version: 1,
    data: { date },
    created_at,
    updated_at: created_at,
  });
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

test("finance totals only count explicit monetary entries and settlement follows done", async () => {
  const { financialTotals, searchItems, documentLabel } =
    await import("../src/lib/workspace/presentation");
  const item = (
    id: string,
    kind: Item["kind"],
    data: Record<string, unknown>,
    title = "Test",
  ): Item => ({
    id,
    kind,
    data,
    title,
    owner_id: "owner",
    version: 1,
    created_at: "2026-09-23",
    updated_at: "2026-09-23",
    document_number: 17,
  });
  const docs = [
    item("p", "profile", {}, "Pia Seidler"),
    item(
      "a",
      "document",
      {
        amountCents: 12345,
        settled: false,
        profileId: "p",
        date: "2026-08-01",
      },
      "Krankenkasse Rechnung.pdf",
    ),
    item("b", "task", { amountCents: 2000, done: true }),
    item("c", "profile", { amountCents: 5000 }),
  ];
  assert.deepEqual(financialTotals(docs), { open: 12345, paid: 2000 });
  assert.equal(searchItems(docs, "Zeig mir Pia Rechnung")[0]?.id, "a");
  assert.equal(documentLabel(docs[1]), "2026-08-01_0017_Krankenkasse Rechnung");
});
test("real PDF attachment pages are appended", async () => {
  const { appendAttachments } =
    await import("../src/lib/workspace/attachments");
  const base = await PDFDocument.create();
  base.addPage();
  const attachment = await PDFDocument.create();
  attachment.addPage();
  attachment.addPage();
  const result = await appendAttachments(await base.save(), [
    { bytes: await attachment.save(), mime: "application/pdf" },
  ]);
  assert.equal((await PDFDocument.load(result)).getPageCount(), 3);
  await assert.rejects(
    () =>
      appendAttachments(new Uint8Array(), [
        { bytes: new Uint8Array(3145729), mime: "application/pdf" },
      ]),
    /3 MB/,
  );
});
