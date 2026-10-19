import { z } from "zod";
import { categories, type Item } from "@/lib/workspace/model";
const optionalDate = z.union([z.literal(""), z.iso.date()]);
export const intakeResultSchema = z.object({
  title: z.string().min(1).max(140),
  documentDate: optionalDate,
  dateEvidence: z.string().max(350),
  category: z.enum(categories),
  recipientName: z.string().max(150),
  recipientEvidence: z.string().max(350),
  reference: z.string().max(150),
  summary: z.string().max(1800),
  readable: z.boolean(),
  warnings: z.array(z.string().max(400)).max(8),
  urgency: z.enum(["normal", "soon", "urgent"]),
  legalReview: z.boolean(),
  recommendation: z.string().max(2000),
  responseNeeded: z.boolean(),
  claims: z.array(z.object({
    creditor: z.string().max(200),
    reference: z.string().max(150),
    amountCents: z.number().int().min(0).max(100000000000).nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    direction: z.enum(["payable", "receivable", "unknown"]),
    due: optionalDate,
    evidence: z.string().min(1).max(500),
    page: z.number().int().min(1).max(10000).nullable(),
    state: z.enum(["demanded", "paid_evidence", "uncertain"]),
  })).max(10),
});
export type IntakeResult = z.infer<typeof intakeResultSchema>;
export type IntakeJob = {
  id: string; source_key: string; source_kind: "document" | "mail";
  source_id: string; title: string; status: "queued" | "running" | "done" | "failed" | "paused" | "skipped";
  source: Record<string, unknown>; result: IntakeResult | null; error: string;
  profile_id: string | null; case_id: string | null; updated_at: string;
};
export type Claim = {
  id: string; job_id: string; title: string; creditor: string; reference: string;
  amount_cents: number | null; currency: string; direction: "payable" | "receivable" | "unknown";
  due: string | null; evidence: string; page: number | null;
  status: "review" | "open" | "disputed" | "paid" | "duplicate";
  profile_id: string | null; case_id: string | null;
};
const normalize = (s: string) => s.normalize("NFKC").toLocaleLowerCase("de").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function resolveAssignment(result: IntakeResult, items: Item[]) {
  const recipient = normalize(result.recipientName);
  const evidence = ` ${normalize(result.recipientEvidence)} `;
  const profiles = items.filter(i => i.kind === "profile" && (normalize(String(i.data.name || i.title)) === recipient || normalize(String(i.data.name || i.title)).split(" ").filter((_,index,parts)=>index===0||index===parts.length-1).join(" ") === recipient) && recipient.split(" ").length >= 2 && evidence.includes(` ${recipient} `));
  const profileId = profiles.length === 1 ? profiles[0].id : "";
  const cases = items.filter(i => i.kind === "case" && result.reference && normalize(String(i.data.reference || "")) === normalize(result.reference) && (!i.data.profileId || i.data.profileId === profileId));
  const caseId = profileId && cases.length === 1 ? cases[0].id : "";
  const topics = items.filter(i => i.kind === "topic" && i.data.profileId === profileId && i.data.category === result.category);
  return { profileId, caseId, topicId: profileId && topics.length === 1 ? topics[0].id : "" };
}
export function intakeTitle(result: Pick<IntakeResult, "title" | "documentDate" | "dateEvidence">) {
  const title = result.title.replace(/^(?:\d{4}-\d{2}-\d{2}|Datum-offen)[_\s-]+/, "").replace(/[^\p{L}\p{N} ._-]/gu, "_").replace(/\s+/g, "-").slice(0, 140) || "Dokument";
  const date = result.documentDate && result.dateEvidence.trim() ? result.documentDate : "Datum-offen";
  return `${date}_${title}`;
}
export function claimFingerprint(sourceKey: string, index: number, claim: IntakeResult["claims"][number]) {
  return claim.reference.trim() && claim.creditor.trim() && claim.amountCents !== null
    ? JSON.stringify([normalize(claim.creditor), normalize(claim.reference), claim.amountCents, claim.currency, claim.direction])
    : `${sourceKey}:${index}`;
}
export function safeIntakeReply(result: IntakeResult) {
  if (!result.responseNeeded || result.legalReview || !result.readable) return "";
  return `Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Nachricht${result.reference ? ` zum Aktenzeichen ${result.reference.replace(/[\r\n]/g, " ")}` : ""}.\n\nBitte lassen Sie mir die für die weitere Prüfung erforderlichen Unterlagen sowie eine nachvollziehbare Erläuterung Ihres Anliegens zukommen.\n\nMit freundlichen Grüßen`;
}
