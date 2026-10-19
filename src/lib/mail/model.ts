import { z } from "zod";

export const mailRefSchema = z.object({
  folder: z.enum(["inbox", "sent"]).default("inbox"),
  uid: z.number().int().min(1).max(4294967295),
  validity: z.string().regex(/^\d{1,20}$/),
});
export type MailRef = z.infer<typeof mailRefSchema>;
export type MailSummary = MailRef & {
  subject: string;
  from: string;
  fromName: string;
  to: string;
  openedAt?: string | null;
  workflowStatus?: WorkflowStatus;
  manualStatus?: WorkflowStatus | null;
  hasDraft?: boolean;
  relevance?: "auto" | "relevant" | "excluded";
  date: string;
  answered: boolean;
  excluded: string;
  messageId: string;
};
export type MailDetail = MailSummary & {
  text: string;
  replyTo: string;
  attachments: string[];
  sentReplies: { subject: string; date: string }[];
  historyStatus: string;
};
export const analysisSchema = z.object({
  category: z.enum([
    "personal",
    "newsletter",
    "spam",
    "invoice",
    "automatic",
    "uncertain",
  ]),
  summary: z.string().max(2000),
  needsReply: z.boolean(),
  missingInformation: z.array(z.string().max(500)).max(10),
  reply: z.string().max(16000),
});
export type MailAnalysis = z.infer<typeof analysisSchema>;

// Conservative first pass: ambiguous correspondence remains visible for review.
export function exclusionReason(from: string, subject: string, headers = "") {
  if (/^x-spam-(?:flag|status):\s*yes/im.test(headers)) return "Spam";
  if (/^list-(?:unsubscribe|id):/im.test(headers) || /newsletter/i.test(from))
    return "Newsletter";
  if (
    /^(?:auto-submitted:\s*(?!no(?:\s|$))\S+|precedence:\s*(?:bulk|list|junk))/im.test(
      headers,
    ) ||
    /(?:^|[<\s])(?:no[-_.]?reply|noreply|do[-_.]?not[-_.]?reply)@/i.test(from)
  )
    return "Automatische Nachricht";
  if (
    /^(?:(?:ihre?|deine?)\s+)?(?:(?:telekom|mobilfunk|festnetz)[ -])*(?:rechnung|beleg|zahlungsaufforderung|mahnung|bestellbestätigung|versandbestätigung|zahlungsbestätigung|kontoauszug|quittung|e-?bon)\b/i.test(
      subject.trim(),
    ) ||
    /^(?:dein|ihr)\s+(?:rewe\s+)?(?:e-?bon|beleg|kontoauszug)\b/i.test(
      subject.trim(),
    )
  )
    return "Rechnung / Beleg / Bestätigung";
  return "";
}

export function canAccessMailbox(userId: string, ownerId?: string) {
  return Boolean(ownerId && userId === ownerId);
}

export function replySubject(subject: string) {
  return /^(?:re|aw):/i.test(subject) ? subject : `Re: ${subject}`;
}

export const workflowStatuses = {
  new: "Neu / unbearbeitet",
  in_progress: "In Bearbeitung",
  draft_ready: "Entwurf bereit",
  answered: "Beantwortet",
  done: "Erledigt",
} as const;
export type WorkflowStatus = keyof typeof workflowStatuses;
export const mailStateSchema = mailRefSchema.extend({
  status: z.enum(["new", "in_progress", "draft_ready", "answered", "done"]).optional(),
  relevance: z.enum(["auto", "relevant", "excluded"]).optional(),
  opened: z.literal(true).optional(),
});
export function mailKey(mail: MailRef) {
  return `${mail.folder}:${mail.validity}:${mail.uid}`;
}
export function isRelevant(mail: MailSummary) {
  return mail.relevance === "relevant" || (mail.relevance !== "excluded" && !mail.excluded);
}
export function workflowStatus(mail: MailSummary): WorkflowStatus {
  return mail.manualStatus || (mail.answered ? "answered" : mail.hasDraft ? "draft_ready" : mail.workflowStatus || "new");
}
