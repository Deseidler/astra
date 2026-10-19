import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAccessMailbox,
  exclusionReason,
  mailRefSchema,
  replySubject,
  analysisSchema,
} from "../src/lib/mail/model";
import { emailDraft } from "../src/lib/workspace/pdf";
import { defaultData, emailSchema } from "../src/lib/workspace/model";
import { simpleParser } from "mailparser";

test("personal correspondence remains visible, including legal and therapy requests", () => {
  for (const subject of [
    "AW: Mandatsanfrage – Verkehrsunfall",
    "Diebstahl i.S. 123/2026",
    "Logo",
    "Rückfrage zur Rechnung",
    "AW: Termin absagen",
  ]) {
    assert.equal(exclusionReason("mensch@example.com", subject), "");
  }
});
test("exclude bulk mail and receipts without trusting sender display names", () => {
  assert.equal(
    exclusionReason("dm-newsletter@example.com", "Angebote"),
    "Newsletter",
  );
  assert.equal(
    exclusionReason(
      "info@example.com",
      "Hallo",
      "List-Unsubscribe: <https://example.com/unsub>",
    ),
    "Newsletter",
  );
  assert.equal(
    exclusionReason("info@example.com", "Hallo", "X-Spam-Flag: YES"),
    "Spam",
  );
  assert.equal(
    exclusionReason("no-reply@example.com", "Login"),
    "Automatische Nachricht",
  );
  assert.equal(
    exclusionReason(
      "info@example.com",
      "Hallo",
      "Auto-Submitted: auto-generated",
    ),
    "Automatische Nachricht",
  );
  assert.equal(
    exclusionReason("person@example.com", "Hallo", "Auto-Submitted: no"),
    "",
  );
  for (const subject of [
    "Ihre Rechnung Oktober",
    "Ihre Telekom Festnetz-Rechnung Oktober",
    "Dein REWE eBon vom 01.01.2026",
    "Dein Beleg für deinen Einkauf",
    "Versandbestätigung für Bestellung",
    "Zahlungsaufforderung 123",
  ])
    assert.ok(exclusionReason("service@example.com", subject), subject);
});
test("mailbox access fails closed, including missing configuration", () => {
  assert.equal(canAccessMailbox("alice"), false);
  assert.equal(canAccessMailbox("alice", "bob"), false);
  assert.equal(canAccessMailbox("alice", "alice"), true);
  for (const uid of [0, -1, Infinity, 1.1, 4294967296])
    assert.equal(
      mailRefSchema.safeParse({ uid, validity: "1" }).success,
      false,
    );
  assert.equal(
    mailRefSchema.safeParse({ uid: 1, validity: "../INBOX" }).success,
    false,
  );
});
test("draft keeps safe reply headers and remains unsent after MIME roundtrip", async () => {
  const data = emailSchema.parse({
    ...defaultData("email"),
    to: "person@example.com",
    body: "Vielen Dank für Ihre Rückmeldung.\n\nFreundliche Grüße",
    sourceMessageId: "<original@example.com>",
    sourceMailbox: "AOL",
  });
  const eml = emailDraft(
    data.to,
    replySubject("Anfrage"),
    data.body,
    undefined,
    data.sourceMessageId,
  );
  const parsed = await simpleParser(eml);
  assert.equal(parsed.inReplyTo, "<original@example.com>");
  assert.equal(parsed.headers.get("x-unsent"), "1");
  assert.equal(parsed.subject, "Re: Anfrage");
  assert.equal(
    parsed.to && !Array.isArray(parsed.to) ? parsed.to.value[0].address : "",
    data.to,
  );
  assert.match(parsed.text || "", /Vielen Dank/);
  assert.throws(() =>
    emailDraft(
      data.to,
      "Test",
      "Test",
      undefined,
      "<original@example.com>\r\nBcc: other@example.com",
    ),
  );
  assert.equal(
    emailSchema.safeParse({ ...data, sourceMessageId: "bad-id" }).success,
    false,
  );
  assert.equal(replySubject("AW: Anfrage"), "AW: Anfrage");
});
test("AI output is bounded and rejected if shape or category is invalid", () => {
  assert.equal(
    analysisSchema.safeParse({
      category: "send",
      summary: "",
      reply: "",
      needsReply: true,
      missingInformation: [],
    }).success,
    false,
  );
  assert.equal(
    analysisSchema.safeParse({
      category: "personal",
      summary: "",
      reply: "x".repeat(16001),
      needsReply: true,
      missingInformation: [],
    }).success,
    false,
  );
});

test("mail identity separates folders and UID generations", async () => {
  const { mailKey } = await import("../src/lib/mail/model");
  const inbox = mailRefSchema.parse({ uid: 42, validity: "7" });
  assert.equal(inbox.folder, "inbox");
  assert.notEqual(mailKey(inbox), mailKey({ ...inbox, folder: "sent" }));
  assert.notEqual(mailKey(inbox), mailKey({ ...inbox, validity: "8" }));
  assert.equal(mailRefSchema.safeParse({ ...inbox, folder: "../../private" }).success, false);
});

test("viewing and relevance never imply completion; persisted drafts and manual decisions determine status", async () => {
  const { isRelevant, workflowStatus, mailStateSchema } = await import("../src/lib/mail/model");
  const mail = {
    folder: "inbox" as const, uid: 1, validity: "1", subject: "Anfrage", from: "a@example.com",
    fromName: "A", to: "b@example.com", date: "", messageId: "", answered: false, excluded: "",
  };
  assert.equal(workflowStatus({ ...mail, openedAt: new Date().toISOString() }), "new");
  assert.equal(workflowStatus({ ...mail, hasDraft: true }), "draft_ready");
  assert.equal(workflowStatus({ ...mail, hasDraft: true, answered: true }), "answered");
  assert.equal(workflowStatus({ ...mail, hasDraft: true, manualStatus: "done" }), "done");
  assert.equal(workflowStatus({ ...mail, answered: true, manualStatus: "new" }), "new");
  assert.equal(isRelevant({ ...mail, excluded: "Newsletter" }), false);
  assert.equal(isRelevant({ ...mail, excluded: "Newsletter", relevance: "relevant" }), true);
  assert.equal(isRelevant({ ...mail, relevance: "excluded" }), false);
  assert.equal(mailStateSchema.safeParse({ ...mail, status: "sent_automatically" }).success, false);
});

test("clear retail campaigns and order confirmations are excluded from relevant correspondence", () => {
  for (const [sender, subject] of [
    ["Amazon.de <mail@example.com>", "Zeit zum Nachbestellen?"],
    ["Müller - BabyClub <mail@example.com>", "20% auf Lebensmittel inkl. Bio- und Kindernahrung"],
    ["PAYBACK Service <mail@example.com>", "2 Joker-Coupons als Dankeschön"],
    ["mister*lady <mail@example.com>", "Nur noch HEUTE: Mid Season SALE"],
    ["IKEA Family <mail@example.com>", "Wenn Kinder wachsen."],
    ["REWE <mail@example.com>", "Vielen Dank für deine Bestellung"],
  ]) assert.ok(exclusionReason(sender, subject), subject);
  assert.equal(exclusionReason("RAe kolb und Kollegen <kanzlei@example.com>", "AW: Mandatsanfrage"), "");
});
