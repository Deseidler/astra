export type DocumentStatus = "neu" | "prüfen" | "genehmigt" | "archiviert";

export type AgentAssignment = {
  id: string;
  name: string;
  queue: string;
  confidence: number;
  trigger: string;
};

export type DocumentRecord = {
  id: string;
  title: string;
  source: string;
  status: DocumentStatus;
  owner: string;
  folder: string;
  assignedAgent: string;
  updatedAt: string;
};

export const agentAssignments: AgentAssignment[] = [
  { id: "legal", name: "Legal Review", queue: "Verträge", confidence: 96, trigger: "Vertrag / NDA / Vertragsschluss" },
  { id: "ops", name: "Ops Routing", queue: "Prozesse", confidence: 92, trigger: "Prozessdokumente / SOP / Internes" },
  { id: "finance", name: "Finance Sync", queue: "Finanzen", confidence: 94, trigger: "Rechnung / Budget / Angebot" },
  { id: "hr", name: "HR Intake", queue: "Personal", confidence: 91, trigger: "Anstellung / Vertragsvorlagen / Personalakte" },
];

export const documents: DocumentRecord[] = [
  { id: "DOC-201", title: "Beratungsvorlage Q4", source: "Mail-Import", status: "neu", owner: "Mara", folder: "Sales/Angebote", assignedAgent: "Ops Routing", updatedAt: "Vor 18 Min." },
  { id: "DOC-208", title: "NDA Kunde Nordwind", source: "Upload", status: "prüfen", owner: "Luca", folder: "Legal/Verträge", assignedAgent: "Legal Review", updatedAt: "Vor 42 Min." },
  { id: "DOC-312", title: "Rechnung Sept. 2026", source: "ERP", status: "genehmigt", owner: "Nina", folder: "Finance/Rechnungen", assignedAgent: "Finance Sync", updatedAt: "Vor 2 Std." },
  { id: "DOC-427", title: "Mitarbeitervertrag Max", source: "Dokumenten-Portal", status: "archiviert", owner: "Sofia", folder: "HR/Personalakte", assignedAgent: "HR Intake", updatedAt: "Vor 1 Tag." },
];
