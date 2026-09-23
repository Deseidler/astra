import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
const date = z.union([z.literal(""), z.iso.date()]);
const ref = z.union([z.literal(""), z.uuid()]);
export const categories = [
  "Allgemein",
  "Behörden",
  "Gesundheit & Pflege",
  "Wohnen",
  "Finanzen & Steuern",
  "Kita & Schule",
  "Versicherungen",
  "Geschäftlich",
] as const;
export const profileSchema = z.object({
  name: text(150).min(1),
  relationship: z.enum([
    "Vater",
    "Mutter",
    "Sohn",
    "Tochter",
    "Weitere Person",
  ]),
  birthDate: date,
  birthName: text(100),
  address: text(400),
  phone: text(80),
  email: z.union([z.literal(""), z.email()]),
  taxId: text(80),
  taxNumber: text(80),
  healthInsurance: text(150),
  insuranceNumber: text(100),
  pensionNumber: text(100),
  childBenefitNumber: text(100),
  notes: text(5000),
  verified: z.boolean(),
  customFields: z
    .array(z.object({ label: text(80).min(1), value: text(500) }))
    .max(30),
});
export const topicSchema = z.object({
  profileId: ref,
  category: text(80).min(1),
  notes: text(2000),
});
export const caseSchema = z.object({
  category: text(80).min(1),
  reference: text(150),
  profileId: ref,
  topicId: ref,
  notes: text(4000),
  status: z.enum(["open", "closed"]),
});
const moneyFields = {
  amountCents: z.number().int().min(0).max(100000000000).default(0),
  settled: z.boolean().default(false),
};
export const taskSchema = z.object({
  ...moneyFields,
  due: date,
  caseId: ref,
  profileId: ref,
  priority: z.enum(["normal", "high"]),
  done: z.boolean(),
  notes: text(2000),
});
export const letterSchema = z.object({
  profileId: ref,
  caseId: ref,
  sender: text(150).min(1),
  senderAddress: text(300).min(1),
  recipient: text(400).min(1),
  recipientEmail: z.union([z.literal(""), z.email()]),
  place: text(100),
  date: z.iso.date(),
  reference: text(150),
  salutation: text(200).min(1),
  body: text(20000).min(1),
  closing: text(200).min(1),
  attachments: text(2000),
  attachmentIds: z.array(z.uuid()).max(5).default([]),
  status: z.enum(["draft", "approved"]),
});
export const emailSchema = z.object({
  profileId: ref,
  caseId: ref,
  to: z.email(),
  body: text(20000).min(1),
  status: z.enum(["draft", "approved"]),
});
export const connectionSchema = z.object({
  provider: z.enum(["AOL", "Google", "Microsoft", "IMAP / SMTP"]),
  email: z.email(),
  displayName: text(150),
  notes: text(1000),
});
export const documentSchema = z.object({
  ...moneyFields,
  due: date.default(""),
  category: text(80).min(1),
  caseId: ref,
  profileId: ref,
  topicId: ref,
  date,
  status: z.enum(["review", "filed", "archived"]),
  notes: text(2000),
  original: z.object({
    path: text(300).min(1),
    name: text(200).min(1),
    mime: z.enum(["application/pdf", "image/png", "image/jpeg"]),
    size: z.number().int().min(1).max(3145728),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});
export const schemas = {
  profile: profileSchema,
  topic: topicSchema,
  case: caseSchema,
  task: taskSchema,
  letter: letterSchema,
  email: emailSchema,
  connection: connectionSchema,
  document: documentSchema,
};
export type Kind = keyof typeof schemas;
export type Letter = z.infer<typeof letterSchema>;
export type DocumentData = z.infer<typeof documentSchema>;
export type Item = {
  id: string;
  owner_id: string;
  kind: Kind;
  title: string;
  data: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
  document_number?: number | null;
};
export type WorkspaceEvent = {
  id: number;
  item_id: string;
  action: string;
  title: string;
  created_at: string;
};
export const itemInput = z.object({
  kind: z.enum([
    "profile",
    "topic",
    "case",
    "task",
    "letter",
    "email",
    "connection",
    "document",
  ]),
  title: text(200).min(1),
  data: z.unknown(),
  version: z.number().int().positive().optional(),
});
export function validateItem(input: unknown) {
  const base = itemInput.parse(input);
  return { ...base, data: schemas[base.kind].parse(base.data) };
}
export const sections = [
  {
    id: "overview",
    label: "Übersicht",
    icon: "◈",
    description: "Alles, was Ihre Familie bewegt. An einem Ort.",
  },
  {
    id: "profiles",
    label: "Meine Familie",
    icon: "♧",
    description: "Eigene Bereiche für jeden Menschen, der Ihnen wichtig ist.",
  },
  {
    id: "documents",
    label: "Dokumente",
    icon: "↓",
    description:
      "Bilder und PDFs hochladen, zuordnen und chronologisch ablegen.",
  },
  {
    id: "cases",
    label: "Akten & Anliegen",
    icon: "◇",
    description: "Jeder Vorgang hat seinen Platz.",
  },
  {
    id: "tasks",
    label: "Aufgaben & Fristen",
    icon: "✓",
    description: "Den Kopf frei haben. Den nächsten Schritt im Blick behalten.",
  },
  {
    id: "letters",
    label: "Briefe & PDF",
    icon: "✎",
    description: "Persönlicher Briefkopf, klare Worte und ein gutes Ergebnis.",
  },
  {
    id: "emails",
    label: "E-Mail",
    icon: "✉",
    description: "Nachrichten vorbereiten und Ihre Postfächer verwalten.",
  },
  {
    id: "outbox",
    label: "Postausgang",
    icon: "↗",
    description: "Geprüft, freigegeben und bereit für Ihren Versand.",
  },
  {
    id: "agents",
    label: "Agenten & Abläufe",
    icon: "⌘",
    description:
      "Ein klarer Ablauf – mit Ihrer Entscheidung an den wichtigen Stellen.",
  },
  {
    id: "timeline",
    label: "Aktivitäten",
    icon: "◷",
    description: "Änderungen und Exporte nachvollziehen.",
  },
  {
    id: "settings",
    label: "Einstellungen",
    icon: "⚙",
    description: "Ihr Zugang und die verbundenen Dienste.",
  },
] as const;
export type View = (typeof sections)[number]["id"];
export function sortDocuments(items: Item[]) {
  return [...items].sort(
    (a, b) =>
      String(b.data.date || b.created_at.slice(0, 10)).localeCompare(
        String(a.data.date || a.created_at.slice(0, 10)),
      ) || b.created_at.localeCompare(a.created_at),
  );
}
export function defaultData(kind: Kind): Record<string, unknown> {
  const shared = { profileId: "", caseId: "" };
  switch (kind) {
    case "profile":
      return {
        name: "",
        relationship: "Weitere Person",
        birthDate: "",
        birthName: "",
        address: "",
        phone: "",
        email: "",
        taxId: "",
        taxNumber: "",
        healthInsurance: "",
        insuranceNumber: "",
        pensionNumber: "",
        childBenefitNumber: "",
        notes: "",
        verified: false,
        customFields: [],
      };
    case "topic":
      return { profileId: "", category: "Allgemein", notes: "" };
    case "case":
      return {
        profileId: "",
        topicId: "",
        category: "Allgemein",
        reference: "",
        notes: "",
        status: "open",
      };
    case "task":
      return { ...shared, due: "", priority: "normal", done: false, notes: "" };
    case "letter":
      return {
        ...shared,
        sender: "",
        senderAddress: "",
        recipient: "",
        recipientEmail: "",
        place: "",
        date: new Date().toLocaleDateString("sv-SE"),
        reference: "",
        salutation: "Sehr geehrte Damen und Herren,",
        body: "",
        closing: "Mit freundlichen Grüßen",
        attachments: "",
        status: "draft",
      };
    case "email":
      return { ...shared, to: "", body: "", status: "draft" };
    case "connection":
      return { provider: "AOL", email: "", displayName: "", notes: "" };
    case "document":
      return {
        ...shared,
        topicId: "",
        category: "Allgemein",
        date: "",
        status: "review",
        notes: "",
      };
  }
}
