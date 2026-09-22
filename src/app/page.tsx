import { agentAssignments, documents } from "@/lib/agent-model";

const overview = [
  { label: "Dokumente gesamt", value: "2.486", delta: "+12.4%" },
  { label: "Verarbeitet heute", value: "184", delta: "+8.1%" },
  { label: "Automatisch zugewiesen", value: "91%", delta: "+4.7%" },
  { label: "Freigaben offen", value: "17", delta: "-3" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Astra</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Dokumentenablage & Agent Workflow</h1>
        </div>
        <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800">
          + Neues Dokument
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {overview.map((item) => (
          <div key={item.label} className="glass rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{item.value}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{item.delta}</span>
            </div>
          </div>
        ))}
      </section>

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
                      <div className="text-xs text-slate-500">{doc.id} · {doc.source}</div>
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
              {agentAssignments.map((agent) => (
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
    </main>
  );
}
