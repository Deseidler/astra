"use client";
import { useState } from "react";
import type { Item, WorkspaceEvent } from "@/lib/workspace/model";
import {
  money,
  financialTotals,
  searchItems,
} from "@/lib/workspace/presentation";
export function Finance({
  items,
  onEdit,
  onToggle,
  onCreate,
  busy,
}: {
  items: Item[];
  onEdit: (i: Item) => void;
  onToggle: (i: Item) => void;
  onCreate: () => void;
  busy: boolean;
}) {
  const totals = financialTotals(items);
  const sum = totals.open + totals.paid;
  const paid = sum ? (totals.paid / sum) * 100 : 0;
  const claims = items.filter(
    (i) =>
      ["document", "task"].includes(i.kind) && Number(i.data.amountCents) > 0,
  );
  return (
    <section className="panel finance-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Finanzen im Blick</span>
          <h2>Forderungen & Zahlungen</h2>
        </div>
        <button className="quiet-button" onClick={onCreate}>
          + Forderung
        </button>
      </div>
      <div className="finance-summary">
        <div
          className="finance-ring"
          role="img"
          aria-label={`Offen: ${money(totals.open)}. Erledigt: ${money(totals.paid)}.`}
          style={{
            background: sum
              ? `conic-gradient(#dcaeaa ${paid}%, #685044 ${paid}% 100%)`
              : "#393029",
          }}
        >
          <span>
            {Math.round(paid)}%<small>erledigt</small>
          </span>
        </div>
        <div>
          <p>
            <span className="legend-dot" />
            Offene Forderungen<strong>{money(totals.open)}</strong>
          </p>
          <p>
            <span className="legend-dot rose" />
            Erledigt / bezahlt<strong>{money(totals.paid)}</strong>
          </p>
        </div>
      </div>
      {claims.length ? (
        <div>
          {claims.map((i) => (
            <div className="task-row" key={i.id}>
              <input
                type="checkbox"
                aria-label={`${i.title} bezahlt`}
                disabled={busy}
                checked={Boolean(
                  i.kind === "task" ? i.data.done : i.data.settled,
                )}
                onChange={() => onToggle(i)}
              />
              <button className="record-main" onClick={() => onEdit(i)}>
                <strong>{i.title}</strong>
                <span>
                  {i.data.due
                    ? `Fällig: ${String(i.data.due).split("-").reverse().join(".")}`
                    : "Ohne Zahlungsfrist"}
                </span>
              </button>
              <strong>{money(Number(i.data.amountCents))}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">
          Eine Forderung anlegen oder im Dokument einen Betrag erfassen. Zahlen
          allein werden nicht als Schulden gewertet.
        </p>
      )}
    </section>
  );
}
export function PersonalDetails({ member }: { member: Item }) {
  return (
    <section className="panel personal-fields prominent-details">
      {[
        ["Anschrift", "address"],
        ["Krankenkasse", "healthInsurance"],
        ["Steuer-ID", "taxId"],
        ["Steuernummer", "taxNumber"],
        ["Krankenversicherungsnummer", "insuranceNumber"],
        ["Kindergeldnummer", "childBenefitNumber"],
        ["Telefon", "phone"],
        ["E-Mail", "email"],
        ["Rentenversicherungsnummer", "pensionNumber"],
      ].map(([label, key]) => (
        <div key={key}>
          <span>{label}</span>
          <strong>{String(member.data[key] || "Noch nicht hinterlegt")}</strong>
        </div>
      ))}
      {(
        (member.data.customFields || []) as { label: string; value: string }[]
      ).map((f, i) => (
        <div key={i}>
          <span>{f.label}</span>
          <strong>{f.value || "Noch nicht hinterlegt"}</strong>
        </div>
      ))}
    </section>
  );
}
export function SearchChat({
  items,
  onOpen,
}: {
  items: Item[];
  onOpen: (i: Item) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const results = searchItems(items, asked);
  return (
    <aside className="search-assistant">
      {open && (
        <section className="search-chat panel" aria-label="Dokumentensuche">
          <div className="section-heading">
            <h2>VELMORA Suchhilfe</h2>
            <button
              className="icon-button"
              aria-label="Suchhilfe schließen"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <p className="muted">
            Was suchst du? Ich suche in deinen gespeicherten Titeln, Personen,
            Themen und Notizen. Bildinhalte sind noch nicht durchsuchbar.
          </p>
          {asked && (
            <div aria-live="polite">
              <p className="chat-question">{asked}</p>
              <p>
                {results.length
                  ? `${results.length} passende Einträge:`
                  : "Keine passenden Einträge. Versuche einen Namen oder ein Stichwort."}
              </p>
              {results.map((i) => (
                <button
                  key={i.id}
                  className="search-result"
                  onClick={() => onOpen(i)}
                >
                  {i.title}
                  <span>Öffnen →</span>
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAsked(query);
            }}
          >
            <label className="field">
              Deine Suche
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zeig mir Pias Rechnung"
                required
                maxLength={300}
              />
            </label>
            <button className="gold-button">Suchen →</button>
          </form>
        </section>
      )}
      <button
        className="chat-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ✧ {open ? "Schließen" : "Etwas suchen?"}
      </button>
    </aside>
  );
}
export function CompactHistory({ events }: { events: WorkspaceEvent[] }) {
  const groups = new Map<string, WorkspaceEvent[]>();
  for (const e of events) {
    const day = new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
    }).format(new Date(e.created_at));
    groups.set(day, [...(groups.get(day) || []), e]);
  }
  return (
    <section className="panel">
      {Array.from(groups).map(([day, list]) => (
        <details className="history-day" key={day}>
          <summary>
            {day}
            <span>
              {list.length} Aktivitäten ·{" "}
              {new Set(list.map((e) => e.item_id)).size} Einträge
            </span>
          </summary>
          {Array.from(new Map(list.map((e) => [e.item_id, e])).values()).map(
            (e) => (
              <p key={e.item_id}>{e.title}</p>
            ),
          )}
        </details>
      ))}
      {!events.length && <p>Noch keine Aktivitäten.</p>}
    </section>
  );
}
