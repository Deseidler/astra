"use client";
import Image from "next/image";
import { Finance, PersonalDetails, SearchChat, CompactHistory } from "./extras";
import { documentLabel } from "@/lib/workspace/presentation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth-actions";
import {
  sections,
  sortDocuments,
  type Item,
  type Kind,
  type View,
  type WorkspaceEvent,
} from "@/lib/workspace/model";
import { Editor, labels } from "./editor";
const s = (value: unknown) => (typeof value === "string" ? value : "");
const date = (value: string) =>
  value
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeZone: "Europe/Berlin",
      }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value))
    : "Ohne Datum";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .join("");
const agents = [
  [
    "01",
    "Eingang & Originale",
    "INTAKE_AGENT",
    "Dateityp prüfen, Duplikate erkennen und Originale unverändert aufbewahren.",
    "Aktiv",
  ],
  [
    "02",
    "Scan & Texterkennung",
    "OCR_AGENT",
    "Text, Seiten und Datumsangaben aus Fotos und Scans erkennen.",
    "Schlüssel fehlt",
  ],
  [
    "03",
    "Personen & Zuordnung",
    "IDENTITY_AGENT",
    "Personen und Akten eindeutig zuordnen; Konflikte zur Prüfung vorlegen.",
    "Manuell verfügbar",
  ],
  [
    "04",
    "Behörden & Leistungen",
    "AUTHORITY_AGENT",
    "Bescheide, Anträge und behördliche Fristen vorbereiten.",
    "Schlüssel fehlt",
  ],
  [
    "05",
    "Gesundheit & Pflege",
    "MEDICAL_CARE_AGENT",
    "Medizinische Unterlagen und Pflegevorgänge mit Quellenbezug ordnen.",
    "Schlüssel fehlt",
  ],
  [
    "06",
    "Wohnen & Verträge",
    "HOUSING_AGENT",
    "Miete, Nebenkosten und Korrespondenz zu einem Vorgang zusammenführen.",
    "Schlüssel fehlt",
  ],
  [
    "07",
    "Finanzen & Insolvenz",
    "INSOLVENCY_AGENT",
    "Finanzielle Vorgänge nach Person, Datum und Aktenzeichen trennen.",
    "Schlüssel fehlt",
  ],
  [
    "08",
    "Geschäftliche Anliegen",
    "BUSINESS_AGENT",
    "Geschäftliche Unterlagen getrennt von Familienangelegenheiten einordnen.",
    "Schlüssel fehlt",
  ],
  [
    "09",
    "Briefe & PDF",
    "PDF_COMPOSER_AGENT",
    "A4-Briefe mit persönlichem Briefkopf und Anlagenverzeichnis erstellen.",
    "Aktiv",
  ],
  [
    "10",
    "Qualität & Freigabe",
    "QUALITY_AGENT / MANUAL_REVIEW",
    "Unklare Angaben prüfen. Schreiben ausdrücklich zur Ausgabe freigeben.",
    "Manuell verfügbar",
  ],
];
export function Workspace({
  view,
  selectedProfile,
  selectedTopic,
  initialItems,
  initialEvents,
  email,
  initialError,
}: {
  view: View;
  selectedProfile: string;
  selectedTopic: string;
  initialItems: Item[];
  initialEvents: WorkspaceEvent[];
  email: string;
  initialError: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState(initialError);
  const [available, setAvailable] = useState(!initialError);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<{
    kind: Kind;
    item?: Item;
    defaults?: Record<string, unknown>;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [approval, setApproval] = useState<Item | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const current = sections.find((x) => x.id === view)!;
  const profiles = items.filter((x) => x.kind === "profile");
  const member = profiles.find((x) => x.id === selectedProfile);
  const topics = items.filter(
    (x) => x.kind === "topic" && (!member || x.data.profileId === member.id),
  );
  const documents = sortDocuments(items.filter((x) => x.kind === "document"));
  const tasks = items.filter((x) => x.kind === "task");
  const letters = items.filter(
    (x) => x.kind === "letter" || x.kind === "email",
  );
  const pending = documents.filter((x) => x.data.status === "review");
  const ready = letters.filter((x) => x.data.status === "approved");
  const today = new Date().toLocaleDateString("sv-SE");
  function create(kind: Kind, defaults: Record<string, unknown> = {}) {
    setEditing({
      kind,
      defaults: {
        profileId: selectedProfile,
        topicId: selectedTopic,
        ...defaults,
      },
    });
  }
  async function refresh() {
    const r = await fetch("/api/workspace", { cache: "no-store" });
    const payload = await r.json();
    if (!r.ok) throw new Error(payload.error);
    setItems(payload.items);
    setEvents(payload.events);
    setAvailable(true);
    setError("");
  }
  async function saved() {
    await refresh();
    setNotice("Ihre Änderungen sind gespeichert.");
  }
  async function update(item: Item, data: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/workspace/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, data }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error);
      await saved();
      setApproval(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    let count = 0;
    const failures: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const data = new FormData();
        data.set("file", file);
        data.set("profileId", selectedProfile);
        data.set("topicId", selectedTopic);
        const r = await fetch("/api/workspace/upload", {
          method: "POST",
          body: data,
        });
        const p = await r.json();
        if (r.ok) count++;
        else failures.push(`${file.name}: ${p.error}`);
      }
      await refresh();
      setNotice(`${count} Datei${count === 1 ? "" : "en"} gespeichert.`);
      if (failures.length) setError(failures.join(" · "));
    } catch {
      setError(
        "Der Upload wurde unterbrochen. Bereits gespeicherte Dateien bleiben erhalten.",
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function download(item: Item, format = "pdf") {
    setBusy(true);
    try {
      const r = await fetch(
        `/api/workspace/${item.id}/export?format=${format}`,
      );
      if (!r.ok) {
        const p = await r.json();
        throw new Error(p.error);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        r.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] || `${item.title}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      await refresh();
      setNotice(
        format === "eml"
          ? "E-Mail-Datei erstellt. Öffnen Sie sie in Ihrem Mailprogramm zum Versand."
          : "Die Datei wurde heruntergeladen.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const matches = (item: Item) =>
    `${item.title} ${s(item.data.notes)} ${s(item.data.reference)}`
      .toLowerCase()
      .includes(search.toLowerCase());
  function empty(title: string, body: string, kind?: Kind) {
    return (
      <div className="empty-state">
        <span className="empty-symbol">◇</span>
        <h3>{title}</h3>
        <p>{body}</p>
        {kind && (
          <button className="quiet-button" onClick={() => create(kind)}>
            + {labels[kind]} anlegen
          </button>
        )}
      </div>
    );
  }
  function row(item: Item) {
    const person = profiles.find((p) => p.id === item.data.profileId);
    return (
      <div className="record-row" key={item.id}>
        <div className="record-icon" aria-hidden="true">
          {item.kind === "document" ? "▤" : item.kind === "email" ? "✉" : "✎"}
        </div>
        <button
          className="record-main"
          onClick={() => setEditing({ kind: item.kind, item })}
        >
          <strong>
            {item.kind === "document" ? documentLabel(item) : item.title}
          </strong>
          <span>
            {person?.title || "Nicht zugeordnet"} ·{" "}
            {item.kind === "document"
              ? date(s(item.data.date) || item.created_at)
              : date(item.updated_at)}
            {s(item.data.category) && ` · ${s(item.data.category)}`}
          </span>
        </button>
        <span
          className={`badge ${item.data.status === "approved" ? "badge-success" : ""}`}
        >
          {labels[s(item.data.status)] || "Offen"}
        </span>
        <div className="row-actions">
          {item.kind === "document" ? (
            <>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => download(item)}
              >
                Original
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setEditing({
                    kind: "email",
                    defaults: {
                      profileId: item.data.profileId || "",
                      caseId: item.data.caseId || "",
                      subject: `Antwort: ${item.title}`,
                      body: `Sehr geehrte Damen und Herren,\n\nin Bezug auf Ihr Schreiben „${item.title}“${item.data.date ? ` vom ${String(item.data.date).split("-").reverse().join(".")}` : ""}:\n\n[Bitte Antwort ergänzen und prüfen.]\n\nMit freundlichen Grüßen`,
                      to: "",
                    },
                  })
                }
              >
                Antwort vorbereiten
              </button>
            </>
          ) : (
            <>
              <button
                className="text-button"
                onClick={() => setEditing({ kind: item.kind, item })}
              >
                Bearbeiten
              </button>
              {item.kind === "letter" && (
                <a
                  className="text-button"
                  href={`/api/workspace/${item.id}/export?inline=1`}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF / Drucken
                </a>
              )}
              {item.data.status !== "approved" ? (
                <button
                  className="text-button"
                  onClick={() => {
                    setApproval(item);
                    setConfirmed(false);
                  }}
                >
                  Prüfen
                </button>
              ) : (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => download(item, "eml")}
                >
                  E-Mail-Datei
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="app-shell workspace-app">
      <a href="#main-content" className="skip-link">
        Zum Inhalt
      </a>
      <aside className="sidebar">
        <Link
          href="/bereich"
          className="sidebar-brand"
          aria-label="VELMORA Übersicht"
        >
          <Image src="/brand/velmora-mark.svg" alt="" width={42} height={42} />
          <span className="wordmark">VELMORA</span>
        </Link>
        <span className="nav-caption">MEIN FAMILIENBEREICH</span>
        <nav aria-label="Persönlicher Bereich">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/bereich?view=${section.id}`}
              prefetch={false}
              className="nav-link"
              aria-current={view === section.id ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {section.icon}
              </span>
              {section.label}
              {section.id === "documents" && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-avatar">V</div>
          <strong>Ihr persönlicher Zugang</strong>
          <span className="account-email">{email}</span>
          <form action={signOut}>
            <button className="text-button">Abmelden ↗</button>
          </form>
        </div>
      </aside>
      <main id="main-content" className="workspace">
        <header className="workspace-header">
          <span>
            Ihr Zuhause für alles Wichtige{" "}
            <span className="crumb">/ {current.label}</span>
          </span>
          <span className="workspace-status">
            <span className="status-dot" /> Persönlicher Bereich
          </span>
        </header>
        <div className="workspace-heading heading-with-action">
          <div>
            <span className="eyebrow">VELMORA · Persönlich verbunden</span>
            <h1>
              {member && view === "profiles"
                ? member.title
                : view === "overview"
                  ? "Ein guter Überblick. Ein gutes Gefühl."
                  : current.label}
            </h1>
            <p>{current.description}</p>
          </div>
          {view === "overview" || view === "documents" ? (
            <button
              className="gold-button"
              disabled={uploading || !available}
              onClick={() => fileInput.current?.click()}
            >
              ↑ {uploading ? "Wird hochgeladen …" : "Dokument hochladen"}
            </button>
          ) : view === "profiles" ? (
            <button
              className="gold-button"
              onClick={() =>
                member
                  ? setEditing({ kind: "profile", item: member })
                  : create("profile")
              }
            >
              {member ? "Stammdaten bearbeiten" : "+ Familienmitglied"}
            </button>
          ) : view === "cases" ||
            view === "tasks" ||
            view === "letters" ||
            view === "emails" ? (
            <button
              className="gold-button"
              onClick={() =>
                create(
                  (
                    {
                      cases: "case",
                      tasks: "task",
                      letters: "letter",
                      emails: "email",
                    } as const
                  )[view],
                )
              }
            >
              +{" "}
              {
                (
                  {
                    cases: "Neue Akte",
                    tasks: "Neue Aufgabe",
                    letters: "Neuer Brief",
                    emails: "E-Mail schreiben",
                  } as const
                )[view]
              }
            </button>
          ) : null}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => upload(e.target.files)}
        />
        {(view === "overview" || view === "documents") && (
          <button
            className="quiet-button camera-button"
            disabled={uploading}
            onClick={() => cameraInput.current?.click()}
          >
            ▣ Mit Handy-Kamera aufnehmen
          </button>
        )}
        {error && (
          <div role="alert" className="form-message">
            {error}
            <button
              className="text-button"
              onClick={() => refresh().catch((e) => setError(e.message))}
            >
              Erneut laden
            </button>
          </div>
        )}
        {notice && (
          <div className="success-notice" role="status">
            ✓ {notice}
            <button
              className="icon-button"
              aria-label="Hinweis schließen"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {view === "overview" && (
          <>
            <section className="welcome-banner">
              <div>
                <span className="eyebrow">Mehr Zeit für das Wesentliche</span>
                <h2>
                  Ihre Familie.
                  <br />
                  <em>Alles verbunden.</em>
                </h2>
                <p>
                  Menschen, Unterlagen und die nächsten Schritte.
                  <br />
                  Gut sortiert, mit Raum für Ihren Alltag.
                </p>
                <Link className="text-link" href="/bereich?view=profiles">
                  Zu Ihrer Familie →
                </Link>
              </div>
              <div className="welcome-emblem">
                <Image
                  src="/brand/velmora-primary.png"
                  alt="VELMORA"
                  width={260}
                  height={260}
                />
              </div>
            </section>
            <section className="summary-grid">
              <Metric
                label="Dokumente"
                value={documents.length}
                hint="Unveränderte Originale"
              />
              <Metric
                label="Zur Prüfung"
                value={pending.length}
                hint="Warten auf Ihre Zuordnung"
              />
              <Metric
                label="Offene Aufgaben"
                value={tasks.filter((t) => !t.data.done).length}
                hint="Ein Schritt nach dem anderen"
              />
            </section>
            <Finance
              items={items}
              busy={busy}
              onEdit={(item) => setEditing({ kind: item.kind, item })}
              onCreate={() =>
                create("task", { amountCents: 0, notes: "Forderung" })
              }
              onToggle={(item) =>
                update(item, {
                  ...item.data,
                  ...(item.kind === "task"
                    ? { done: !item.data.done }
                    : { settled: !item.data.settled }),
                })
              }
            />
            <div className="section-heading">
              <h2>Ihre Familie</h2>
              <Link className="text-link" href="/bereich?view=profiles">
                Alle Profile →
              </Link>
            </div>
            <div className="family-grid">
              {profiles.map((p, i) => (
                <ProfileCard
                  key={p.id}
                  item={p}
                  index={i}
                  count={
                    documents.filter((d) => d.data.profileId === p.id).length
                  }
                />
              ))}
              {!profiles.length &&
                empty(
                  "Hier beginnt Ihr Familienbereich.",
                  "Legen Sie persönliche Profile mit eigenen Themen und Stammdaten an.",
                  "profile",
                )}
            </div>
            <div className="overview-columns">
              <section className="panel">
                <div className="section-heading">
                  <h2>Zuletzt eingegangen</h2>
                  <Link className="text-link" href="/bereich?view=documents">
                    Alle Dokumente →
                  </Link>
                </div>
                {documents.length
                  ? documents.slice(0, 4).map(row)
                  : empty(
                      "Ein aufgeräumter Eingang.",
                      "Laden Sie ein Foto oder eine PDF-Datei hoch. Das Original bleibt erhalten.",
                    )}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Als Nächstes</h2>
                  <button
                    className="text-button"
                    onClick={() => create("task")}
                  >
                    + Aufgabe
                  </button>
                </div>
                {tasks
                  .filter((t) => !t.data.done)
                  .sort((a, b) =>
                    (s(a.data.due) || "9999").localeCompare(
                      s(b.data.due) || "9999",
                    ),
                  )
                  .slice(0, 4)
                  .map((task) => (
                    <div className="next-task" key={task.id}>
                      <input
                        type="checkbox"
                        aria-label={`${task.title} erledigt`}
                        checked={Boolean(task.data.done)}
                        disabled={busy}
                        onChange={(e) =>
                          update(task, { ...task.data, done: e.target.checked })
                        }
                      />
                      <button
                        className="record-main"
                        onClick={() => setEditing({ kind: "task", item: task })}
                      >
                        <strong>{task.title}</strong>
                        <small>
                          {s(task.data.due)
                            ? date(s(task.data.due))
                            : "Ohne Frist"}
                        </small>
                      </button>
                    </div>
                  ))}
                {!tasks.some((t) => !t.data.done) &&
                  empty(
                    "Alles im Blick.",
                    "Aktuell gibt es keine offenen Aufgaben.",
                  )}
              </section>
            </div>
          </>
        )}
        {view === "profiles" &&
          (!member ? (
            <div className="family-grid">
              {profiles.map((p, i) => (
                <ProfileCard
                  key={p.id}
                  item={p}
                  index={i}
                  count={
                    documents.filter((d) => d.data.profileId === p.id).length
                  }
                />
              ))}
              <button className="add-profile" onClick={() => create("profile")}>
                <span>＋</span>Familienmitglied hinzufügen
              </button>
            </div>
          ) : (
            <>
              <Link href="/bereich?view=profiles" className="text-link">
                ← Alle Familienmitglieder
              </Link>
              <section className="profile-summary panel">
                <div className="profile-avatar">{initials(member.title)}</div>
                <div>
                  <span className="eyebrow">{s(member.data.relationship)}</span>
                  <h2>{s(member.data.name) || member.title}</h2>
                  <p className="muted">
                    {s(member.data.birthDate)
                      ? `Geboren am ${date(s(member.data.birthDate))}`
                      : "Geburtsdatum noch nicht hinterlegt"}
                  </p>
                  <span className="badge">
                    {member.data.verified
                      ? "Stammdaten geprüft"
                      : "Stammdaten prüfen"}
                  </span>
                </div>
                <div className="profile-count">
                  <strong>
                    {
                      documents.filter((d) => d.data.profileId === member.id)
                        .length
                    }
                  </strong>
                  <span>Dokumente</span>
                </div>
              </section>
              <PersonalDetails member={member} />
              <div className="section-heading">
                <h2>Themen von {member.title.split(" ")[0]}</h2>
                <button
                  className="quiet-button"
                  onClick={() => create("topic")}
                >
                  + Eigene Themenkachel
                </button>
              </div>
              <div className="topic-grid">
                {topics.map((topic, i) => (
                  <article className="topic-card" key={topic.id}>
                    <Link
                      href={`/bereich?view=documents&profile=${member.id}&topic=${topic.id}`}
                    >
                      <span className={`topic-symbol tone-${i % 4}`}>
                        {["◇", "✚", "⌂", "▤"][i % 4]}
                      </span>
                      <h3>{topic.title}</h3>
                      <p>
                        {
                          documents.filter((d) => d.data.topicId === topic.id)
                            .length
                        }{" "}
                        Dokumente · {s(topic.data.category)}
                      </p>
                    </Link>
                    <button
                      className="text-button"
                      onClick={() => setEditing({ kind: "topic", item: topic })}
                    >
                      Bearbeiten
                    </button>
                  </article>
                ))}
                {!topics.length &&
                  empty(
                    "Platz für Ihre Themen.",
                    "Legen Sie zum Beispiel Steuern, Gesundheit oder Kita als eigene Kachel an.",
                    "topic",
                  )}
              </div>
            </>
          ))}
        {view === "documents" && (
          <>
            <section
              className={`upload-zone ${uploading ? "uploading" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!uploading) upload(e.dataTransfer.files);
              }}
            >
              <span className="upload-icon">↑</span>
              <div>
                <h2>Ein Bild genügt für den Anfang.</h2>
                <p>PDF, JPG oder PNG hier ablegen · bis 3 MB pro Datei</p>
                <small>
                  Originale werden gespeichert. Texterkennung und automatische
                  Personenzuordnung folgen mit der KI-Anbindung.
                </small>
              </div>
              <button
                className="quiet-button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                Dateien auswählen
              </button>
            </section>
            {selectedProfile && (
              <p className="notice">
                Bereich:{" "}
                {profiles.find((p) => p.id === selectedProfile)?.title ||
                  "Familienprofil"}
                {selectedTopic &&
                  ` / ${items.find((i) => i.id === selectedTopic)?.title || "Thema"}`}{" "}
                · Neue Uploads werden hier zugeordnet.{" "}
                <Link className="text-link" href="/bereich?view=documents">
                  Alle anzeigen
                </Link>
              </p>
            )}
            <div className="toolbar">
              <label className="search-field">
                <span>⌕</span>
                <input
                  aria-label="Dokumente durchsuchen"
                  placeholder="Dokument, Aktenzeichen oder Notiz suchen …"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                aria-label="Dokumentenstatus"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Alle Status</option>
                <option value="review">Zu prüfen</option>
                <option value="filed">Eingeordnet</option>
                <option value="archived">Archiviert</option>
              </select>
              <span className="muted">Datum ↓</span>
            </div>
            <section className="panel record-list">
              {documents
                .filter(
                  (d) =>
                    matches(d) &&
                    (filter === "all" || d.data.status === filter) &&
                    (!selectedProfile ||
                      d.data.profileId === selectedProfile) &&
                    (!selectedTopic || d.data.topicId === selectedTopic),
                )
                .map(row)}
              {!documents.some(
                (d) =>
                  matches(d) &&
                  (filter === "all" || d.data.status === filter) &&
                  (!selectedProfile || d.data.profileId === selectedProfile) &&
                  (!selectedTopic || d.data.topicId === selectedTopic),
              ) &&
                empty(
                  "Keine passenden Dokumente.",
                  "Ändern Sie den Filter oder laden Sie Ihr erstes Dokument hoch.",
                )}
            </section>
            <p className="muted list-footnote">
              Neueste zuerst. Ohne Dokumentdatum gilt das Eingangsdatum. Die
              Person, das Thema und das Dokumentdatum können Sie über den Titel
              bearbeiten.
            </p>
          </>
        )}
        {view === "cases" && (
          <>
            <Search value={search} onChange={setSearch} />
            <div className="case-grid">
              {items
                .filter((i) => i.kind === "case" && matches(i))
                .map((item) => (
                  <button
                    className="panel case-card"
                    key={item.id}
                    onClick={() => setEditing({ kind: "case", item })}
                  >
                    <span className="eyebrow">{s(item.data.category)}</span>
                    <h2>{item.title}</h2>
                    <p>{s(item.data.reference) || "Kein Aktenzeichen"}</p>
                    <span className="muted">
                      {profiles.find((p) => p.id === item.data.profileId)
                        ?.title || "Ohne Personenzuordnung"}
                    </span>
                    <div className="case-footer">
                      <span>
                        {
                          documents.filter((d) => d.data.caseId === item.id)
                            .length
                        }{" "}
                        Dokumente
                      </span>
                      <span className="badge">
                        {labels[s(item.data.status)]}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
            {!items.some((i) => i.kind === "case" && matches(i)) &&
              empty(
                "Ein Ort für jedes Anliegen.",
                "Verbinden Sie Unterlagen, Fristen und Schreiben in einer Akte.",
                "case",
              )}
          </>
        )}
        {view === "tasks" && (
          <>
            <div className="toolbar">
              <Search value={search} onChange={setSearch} />
              <select
                aria-label="Aufgabenstatus"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Alle Aufgaben</option>
                <option value="open">Offen</option>
                <option value="done">Erledigt</option>
              </select>
            </div>
            <section className="panel">
              {tasks
                .filter(
                  (t) =>
                    matches(t) &&
                    (filter === "all" ||
                      (filter === "done") === Boolean(t.data.done)),
                )
                .sort((a, b) =>
                  (s(a.data.due) || "9999").localeCompare(
                    s(b.data.due) || "9999",
                  ),
                )
                .map((task) => (
                  <div className="task-row" key={task.id}>
                    <input
                      type="checkbox"
                      aria-label={`${task.title} erledigt`}
                      checked={Boolean(task.data.done)}
                      disabled={busy}
                      onChange={(e) =>
                        update(task, { ...task.data, done: e.target.checked })
                      }
                    />
                    <button
                      className="record-main"
                      onClick={() => setEditing({ kind: "task", item: task })}
                    >
                      <strong className={task.data.done ? "done" : ""}>
                        {task.title}
                      </strong>
                      <span>
                        {s(task.data.due)
                          ? date(s(task.data.due))
                          : "Ohne Frist"}{" "}
                        ·{" "}
                        {profiles.find((p) => p.id === task.data.profileId)
                          ?.title || "Allgemein"}
                      </span>
                    </button>
                    {!task.data.done &&
                    s(task.data.due) &&
                    s(task.data.due) < today ? (
                      <span className="badge badge-rose">Überfällig</span>
                    ) : (
                      task.data.priority === "high" && (
                        <span className="badge">Wichtig</span>
                      )
                    )}
                  </div>
                ))}
              {!tasks.length &&
                empty(
                  "Der nächste Schritt zählt.",
                  "Legen Sie Aufgaben mit Fälligkeit und Personenzuordnung an.",
                  "task",
                )}
            </section>
          </>
        )}
        {view === "letters" && (
          <>
            <section className="template-banner panel">
              <span className="paper-icon">DS</span>
              <div>
                <span className="eyebrow">Ihre persönliche Briefvorlage</span>
                <h2>Ein guter Brief beginnt mit Klarheit.</h2>
                <p>
                  A4 · Goldener Briefkopf · Fensteranschrift · Faltmarken ·
                  Mehrseitige PDFs
                </p>
              </div>
              <button className="quiet-button" onClick={() => create("letter")}>
                Vorlage verwenden →
              </button>
            </section>
            <Search value={search} onChange={setSearch} />
            <section className="panel">
              {items.filter((i) => i.kind === "letter" && matches(i)).map(row)}
              {!items.some((i) => i.kind === "letter") &&
                empty(
                  "Ihr erstes Schreiben.",
                  "Erstellen Sie einen Entwurf. Vorschau, Ausdruck und Freigabe folgen in Ihrem Tempo.",
                  "letter",
                )}
            </section>
          </>
        )}
        {view === "emails" && (
          <>
            <section className="panel mail-connection">
              <div>
                <span className="eyebrow">Ihre Postfächer</span>
                <h2>Alles bereit für die Verbindung.</h2>
                <p className="muted">
                  Nachrichten lassen sich schon verfassen und als E-Mail-Datei
                  exportieren. Empfang, Synchronisation und direkter Versand
                  benötigen noch die Anmeldung beim Anbieter.
                </p>
              </div>
              <button
                className="quiet-button"
                onClick={() => create("connection")}
              >
                + Postfach vorbereiten
              </button>
              {items
                .filter((i) => i.kind === "connection")
                .map((item) => (
                  <button
                    className="connection-row"
                    key={item.id}
                    onClick={() => setEditing({ kind: "connection", item })}
                  >
                    <span>✉ {s(item.data.email)}</span>
                    <span className="badge">
                      {s(item.data.provider)} · Nicht verbunden
                    </span>
                  </button>
                ))}
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Ihre Nachrichtenentwürfe</h2>
              </div>
              {items.filter((i) => i.kind === "email").map(row)}
              {!items.some((i) => i.kind === "email") &&
                empty(
                  "Eine Nachricht, gut vorbereitet.",
                  "Erstellen Sie eine E-Mail und geben Sie sie vor dem Export frei.",
                  "email",
                )}
            </section>
          </>
        )}
        {view === "outbox" && (
          <>
            <div className="notice">
              Hier erscheinen freigegebene Schreiben. Ein Export versendet noch
              keine Nachricht. E-Mail-Dateien öffnen Sie in Ihrem Mailprogramm;
              Briefe drucken Sie über die PDF-Ansicht.
            </div>
            <section className="panel">
              {ready.map(row)}
              {!ready.length &&
                empty(
                  "Bereit, wenn Sie es sind.",
                  "Prüfen Sie einen Brief oder eine E-Mail und geben Sie den Inhalt frei.",
                )}
            </section>
          </>
        )}
        {view === "agents" && (
          <>
            <section className="panel pipeline">
              <span className="eyebrow">So bleibt alles nachvollziehbar</span>
              <h2>Hochladen → Erkennen → Zuordnen → Prüfen → Ausgeben</h2>
              <p className="muted">
                Die sichere KI-Schlüsseleinrichtung ist noch nicht
                abgeschlossen. Upload, manuelle Zuordnung, Datumssortierung,
                Brief-PDF und Freigabe sind bereits bedienbar.
              </p>
            </section>
            <div className="agent-grid">
              {agents.map(([number, title, code, description, status]) => (
                <article className="panel agent-card" key={number}>
                  <span className="agent-number">{number}</span>
                  <span
                    className={`badge ${status === "Aktiv" ? "badge-success" : ""}`}
                  >
                    {status}
                  </span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <small>{code}</small>
                </article>
              ))}
            </div>
          </>
        )}
        {view === "timeline" && <CompactHistory events={events} />}
        {view === "settings" && (
          <div className="settings-grid">
            <section className="panel">
              <h2>Ihr Zugang</h2>
              <dl className="settings-list">
                <div>
                  <dt>E-Mail-Adresse</dt>
                  <dd>{email}</dd>
                </div>
                <div>
                  <dt>Berechtigung</dt>
                  <dd>Ihr persönlicher Familienbereich</dd>
                </div>
                <div>
                  <dt>Familienprofile</dt>
                  <dd>
                    Profile sind persönliche Akten, keine eigenständigen
                    Benutzerzugänge.
                  </dd>
                </div>
                <div>
                  <dt>Automatisierung</dt>
                  <dd>KI-Einrichtung noch nicht abgeschlossen</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <h2>Verbindungen</h2>
              <dl className="settings-list">
                <div>
                  <dt>Datenbank und Originale</dt>
                  <dd>
                    {!available ? "Nicht erreichbar" : "Supabase · Verbunden"}
                  </dd>
                </div>
                <div>
                  <dt>E-Mail</dt>
                  <dd>Noch nicht verbunden</dd>
                </div>
                <div>
                  <dt>Briefausgabe</dt>
                  <dd>PDF, Druckansicht und E-Mail-Datei</dd>
                </div>
              </dl>
              <Link className="text-link" href="/bereich?view=emails">
                Postfächer verwalten →
              </Link>
            </section>
          </div>
        )}
        <footer className="workspace-footer">
          <span>VELMORA · Mit Raum für Ihre Familie.</span>
          <span>Persönlich. Geordnet. Verbunden.</span>
        </footer>
        {items.length >= 1000 && (
          <p className="notice">
            Es werden die 1.000 zuletzt aktualisierten Einträge angezeigt.
          </p>
        )}
      </main>
      <SearchChat
        items={items}
        onOpen={(item) => setEditing({ kind: item.kind, item })}
      />
      {editing && (
        <Editor
          key={editing.item?.id || editing.kind}
          {...editing}
          items={items}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {approval && (
        <ApprovalDialog onClose={() => setApproval(null)}>
          <h2 id="approval-title">Schreiben prüfen und freigeben</h2>
          <h3>{approval.title}</h3>
          <p className="muted">
            Empfänger: {s(approval.data.recipient) || s(approval.data.to)}
          </p>
          <div className="approval-body">{s(approval.data.body)}</div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Ich habe Inhalt, Empfänger und Angaben geprüft. Die Freigabe
            versendet noch nichts.
          </label>
          <div className="dialog-actions">
            <button className="quiet-button" onClick={() => setApproval(null)}>
              Abbrechen
            </button>
            <button
              className="gold-button"
              disabled={!confirmed || busy}
              onClick={() =>
                update(approval, { ...approval.data, status: "approved" })
              }
            >
              Freigeben
            </button>
          </div>
        </ApprovalDialog>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="panel">
      <span className="metric-label">{label}</span>
      <p className="metric-value">{value.toString().padStart(2, "0")}</p>
      <p className="metric-hint">{hint}</p>
    </div>
  );
}
function ProfileCard({
  item,
  index,
  count,
}: {
  item: Item;
  index: number;
  count: number;
}) {
  return (
    <Link
      href={`/bereich?view=profiles&profile=${item.id}`}
      className={`family-card tone-${index % 4}`}
    >
      <div className="family-card-top">
        <span className="profile-avatar">{initials(item.title)}</span>
        <span className="card-arrow">↗</span>
      </div>
      <h3>{item.title}</h3>
      <p>{s(item.data.relationship)}</p>
      <div className="family-card-bottom">
        <span>{count} Dokumente</span>
        <span className="tiny-dot" />
      </div>
    </Link>
  );
}
function Search({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="search-field standalone-search">
      <span>⌕</span>
      <input
        aria-label="Einträge durchsuchen"
        placeholder="Einträge durchsuchen …"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ApprovalDialog({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="workspace-dialog approval-card"
      onCancel={onClose}
      aria-labelledby="approval-title"
    >
      {children}
    </dialog>
  );
}
