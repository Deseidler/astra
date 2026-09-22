"use client";

import { useMemo, useState } from "react";
import type { AgentAssignment, DocumentRecord } from "@/lib/agent-model";

type WorkflowDocument = DocumentRecord;

type WorkflowForm = {
  title: string;
  owner: string;
  folder: string;
  source: string;
  status: WorkflowDocument["status"];
};

const defaultForm: WorkflowForm = {
  title: "",
  owner: "",
  folder: "",
  source: "Upload",
  status: "neu",
};

const assignmentRules = [
  {
    name: "Legal Review",
    queue: "Verträge",
    confidence: 96,
    keywords: ["vertrag", "nda", "miet", "vereinbarung", "vertragsschluss", "recht", "lizenz"],
  },
  {
    name: "Finance Sync",
    queue: "Finanzen",
    confidence: 94,
    keywords: ["rechnung", "budget", "angebot", "preis", "kosten", "finanz", "invoice"],
  },
  {
    name: "Ops Routing",
    queue: "Prozesse",
    confidence: 92,
    keywords: ["prozess", "sop", "betrieb", "workflow", "standard", "intern", "richtlinie"],
  },
  {
    name: "HR Intake",
    queue: "Personal",
    confidence: 91,
    keywords: ["mitarbeiter", "personal", "vertrag", "beurlaubung", "anstellung", "bewerbung", "hr"],
  },
] as const;

function classifyDocument(title: string, folder: string, source: string) {
  const haystack = `${title} ${folder} ${source}`.toLowerCase();

  for (const rule of assignmentRules) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule;
    }
  }

  return {
    name: "Ops Routing",
    queue: "Prozesse",
    confidence: 88,
  };
}

export function DocumentWorkflow({
  initialDocuments,
  initialAgents,
}: {
  initialDocuments: WorkflowDocument[];
  initialAgents: AgentAssignment[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<WorkflowForm>(defaultForm);

  const preview = useMemo(() => {
    if (!form.title.trim()) {
      return { name: "Ops Routing", queue: "Prozesse", confidence: 88 };
    }

    return classifyDocument(form.title, form.folder, form.source);
  }, [form.folder, form.source, form.title]);

  function handleChange(field: keyof WorkflowForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      return;
    }

    const suggestion = classifyDocument(form.title, form.folder, form.source);
    const nextDocument: WorkflowDocument = {
      id: `DOC-${Math.floor(Math.random() * 900 + 100)}`,
      title,
      source: form.source || "Upload",
      status: form.status,
      owner: form.owner.trim() || "Unbekannt",
      folder: form.folder.trim() || "Allgemein",
      assignedAgent: suggestion.name,
      updatedAt: "Gerade eben",
    };

    setDocuments((current) => [nextDocument, ...current]);
    setForm(defaultForm);
    setIsOpen(false);
  }

  return (
    <div>
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">VELMORA</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Dokumentenablage & Agent Workflow</h1>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800"
        >
          + Neues Dokument
        </button>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-sky-600">Neues Dokument</p>
                <h2 className="text-2xl font-semibold text-slate-900">Einreichen & automatisches Routing</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Schließen
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Dokumenttitel
                  <input
                    value={form.title}
                    onChange={(event) => handleChange("title", event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    placeholder="z. B. Mitarbeitervertrag Berlin"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Besitzer
                  <input
                    value={form.owner}
                    onChange={(event) => handleChange("owner", event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    placeholder="z. B. Nina"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Akte / Ordner
                  <input
                    value={form.folder}
                    onChange={(event) => handleChange("folder", event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    placeholder="z. B. HR/Personalakte"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Quelle
                  <select
                    value={form.source}
                    onChange={(event) => handleChange("source", event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="Upload">Upload</option>
                    <option value="Mail-Import">Mail-Import</option>
                    <option value="ERP">ERP</option>
                    <option value="Dokumenten-Portal">Dokumenten-Portal</option>
                    <option value="Scan">Scan</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Vorschau Agent</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{preview.name}</p>
                    <p className="text-sm text-slate-600">Queue: {preview.queue}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {preview.confidence}% Konfidenz
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-200 transition hover:bg-sky-500"
                >
                  Dokument speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-3xl p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Aktuelle Dokumenten-Queue</h2>
            <button className="text-sm font-medium text-sky-700">Alle anzeigen</button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Dokument</th>
                  <th className="px-4 py-3 font-medium">Besitzer</th>
                  <th className="px-4 py-3 font-medium">Akte</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{doc.title}</div>
                      <div className="text-xs text-slate-500">
                        {doc.id} · {doc.source}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{doc.owner}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.folder}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Agenten-Automatik</h2>
            <div className="mt-5 space-y-4">
              {initialAgents.map((agent) => (
                <div key={agent.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.queue}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      {agent.confidence}%
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Trigger: {agent.trigger}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Workflow-Logik</h2>
            <ol className="mt-5 space-y-3 text-sm text-slate-600">
              <li>1. Dokument anlegen oder importieren</li>
              <li>2. Inhalt erkennen und klassifizieren</li>
              <li>3. Richtiger Agent entsprechend Akte und Reihenfolge zuweisen</li>
              <li>4. Freigabe, Archive und Weiterleitung automatisch dokumentieren</li>
            </ol>
          </div>
        </aside>
      </section>
    </div>
  );
}
