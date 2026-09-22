import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Persönlicher Bereich" };
export const dynamic = "force-dynamic";

const sections = [
  { id: "overview", label: "Übersicht", icon: "◈" },
  { id: "profiles", label: "Familienprofile", icon: "♧" },
  { id: "timeline", label: "Zeitverlauf", icon: "◷" },
  { id: "tasks", label: "Aufgaben & Fristen", icon: "✓" },
  { id: "shared", label: "Gemeinsame Anliegen", icon: "◇" },
  { id: "secure", label: "Geschützter Bereich", icon: "⌑" },
  { id: "settings", label: "Einstellungen", icon: "⚙" },
];
const planned: Record<string, { title: string; text: string }> = {
  profiles: {
    title: "Platz für Ihre Familie",
    text: "Familienprofile und gemeinsame Zugriffe werden im nächsten Schritt eingerichtet. Bisher wurden keine Profile übernommen.",
  },
  timeline: {
    title: "Ihre Geschichte, im Überblick",
    text: "Hier wird künftig der Verlauf Ihrer Anliegen sichtbar. Der Zeitverlauf ist noch nicht eingerichtet.",
  },
  tasks: {
    title: "Raum für die nächsten Schritte",
    text: "Aufgaben, Fristen und Erinnerungen werden eingerichtet, sobald die gemeinsamen Abläufe feststehen.",
  },
  shared: {
    title: "Gemeinsam gut organisiert",
    text: "Gemeinsame Anliegen und Freigaben werden im nächsten Schritt eingerichtet. Aktuell ist kein gemeinsamer Zugriff aktiviert.",
  },
};
type Entry = {
  id: string;
  title: string;
  folder: string;
  status: string;
  updated_at: string;
};

function DocumentList({ documents }: { documents: Entry[] }) {
  if (!documents.length)
    return (
      <div className="empty-state">
        <span className="empty-symbol" aria-hidden="true">
          ◇
        </span>
        <h3>Ein klarer Anfang.</h3>
        <p>
          Es sind noch keine Einträge Ihrem Zugang zugeordnet. Ihre persönlichen
          Inhalte erscheinen hier, sobald sie eingerichtet sind.
        </p>
      </div>
    );
  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li key={document.id}>
          <div>
            <strong>{document.title}</strong>
            <span className="document-meta">
              {document.folder} ·{" "}
              {new Intl.DateTimeFormat("de-DE", {
                dateStyle: "medium",
                timeZone: "Europe/Berlin",
              }).format(new Date(document.updated_at))}
            </span>
          </div>
          <span className="badge">{document.status}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PersonalArea({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) redirect("/");
  const { view: requested } = await searchParams;
  const view = sections.some((section) => section.id === requested)
    ? requested!
    : "overview";
  const section = sections.find((item) => item.id === view)!;
  let documents: Entry[] = [];
  let total = 0;
  let pending = 0;
  let failed = false;
  if (view === "overview" || view === "secure") {
    const [entries, reviews] = await Promise.all([
      supabase
        .from("documents")
        .select("id,title,folder,status,updated_at", { count: "exact" })
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("documents")
        .select("id", { head: true, count: "exact" })
        .eq("owner_id", user.id)
        .in("status", ["neu", "prüfen"]),
    ]);
    failed = Boolean(entries.error || reviews.error);
    if (!failed) {
      documents = entries.data ?? [];
      total = entries.count ?? 0;
      pending = reviews.count ?? 0;
    }
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Zum Inhalt
      </a>
      <aside className="sidebar">
        <Link
          href="/bereich"
          className="wordmark"
          aria-label="VELMORA Übersicht"
        >
          VELMORA
        </Link>
        <nav aria-label="Persönlicher Bereich">
          {sections.map((item) => (
            <Link
              prefetch={false}
              key={item.id}
              href={`/bereich?view=${item.id}`}
              className="nav-link"
              aria-current={view === item.id ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="eyebrow">Ihr persönlicher Bereich</span>
          <p>Mit Raum für das Wesentliche.</p>
        </div>
      </aside>
      <main id="main-content" className="workspace">
        <header className="workspace-header">
          <span>VELMORA / {section.label}</span>
          <form action={signOut}>
            <button className="quiet-button">Abmelden</button>
          </form>
        </header>
        <div className="workspace-heading">
          <span className="eyebrow">Ihr persönlicher Bereich</span>
          <h1>
            {view === "overview" ? "Schön, dass Sie da sind." : section.label}
          </h1>
          <p>
            {view === "overview"
              ? "Ein ruhiger Blick auf alles, was für Sie zählt."
              : "Alles Wichtige an einem Ort."}
          </p>
        </div>
        {view === "overview" && (
          <section className="summary-grid" aria-label="Ihr Überblick">
            <div className="panel">
              <span className="metric-label">Ihre Einträge</span>
              <p className="metric-value">{failed ? "—" : total}</p>
              <p className="metric-hint">Persönlich zugeordnet</p>
            </div>
            <div className="panel">
              <span className="metric-label">Zur Prüfung</span>
              <p className="metric-value">{failed ? "—" : pending}</p>
              <p className="metric-hint">Neue und offene Einträge</p>
            </div>
            <div className="panel">
              <span className="metric-label">Gemeinsame Bereiche</span>
              <p className="metric-value">—</p>
              <p className="metric-hint">Noch nicht eingerichtet</p>
            </div>
          </section>
        )}
        {(view === "overview" || view === "secure") && (
          <section className="panel">
            <div className="section-heading">
              <h2>
                {view === "overview" ? "Zuletzt aktualisiert" : "Ihre Einträge"}
              </h2>
              {view === "overview" && (
                <Link className="text-link" href="/bereich?view=secure">
                  Zum Bereich →
                </Link>
              )}
            </div>
            {failed ? (
              <div role="alert" className="form-message">
                Ihre Einträge konnten nicht geladen werden. Bitte versuchen Sie
                es später erneut.
              </div>
            ) : (
              <DocumentList
                documents={
                  view === "overview" ? documents.slice(0, 5) : documents
                }
              />
            )}
            {view === "secure" && total > 50 && (
              <p className="muted">
                Die 50 zuletzt aktualisierten Einträge von {total} werden
                angezeigt.
              </p>
            )}
          </section>
        )}
        {planned[view] && (
          <section className="panel empty-state">
            <span className="badge">In Vorbereitung</span>
            <span className="empty-symbol" aria-hidden="true">
              {section.icon}
            </span>
            <h2>{planned[view].title}</h2>
            <p>{planned[view].text}</p>
          </section>
        )}
        {view === "settings" && (
          <section className="panel">
            <h2>Ihr Zugang</h2>
            <dl className="settings-list">
              <div>
                <dt>E-Mail-Adresse</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Zugriffsbereich</dt>
                <dd>Persönlich zugeordnete Einträge</dd>
              </div>
              <div>
                <dt>Gemeinsame Berechtigungen</dt>
                <dd>Noch nicht eingerichtet</dd>
              </div>
            </dl>
          </section>
        )}
        {(view === "overview" || view === "secure") && (
          <p className="notice">
            Ihr Bereich befindet sich im Aufbau. Import, automatische Zuordnung
            und Freigaben werden im nächsten Schritt eingerichtet.
          </p>
        )}
      </main>
    </div>
  );
}
