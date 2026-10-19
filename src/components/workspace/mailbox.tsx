"use client";
import { useEffect, useState } from "react";
import {
  replySubject,
  mailKey,
  isRelevant,
  workflowStatus,
  workflowStatuses,
  type WorkflowStatus,
  type MailRef,
  type MailSummary,
  type MailDetail,
  type MailAnalysis,
} from "@/lib/mail/model";

const date = (value: string) =>
  value
    ? new Date(value).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })
    : "Ohne Datum";
export function Mailbox({
  onDraft,
  savedDrafts,
}: {
  onDraft: (defaults: Record<string, unknown>) => void;
  savedDrafts: MailRef[];
}) {
  const [status, setStatus] = useState<{
    configured: boolean;
    ai: boolean;
  } | null>(null);
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedMail, setSelected] = useState<MailDetail | null>(null);
  const [analysis, setAnalysis] = useState<MailAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [relevanceFilter, setRelevanceFilter] = useState("relevant");
  const [statusFilter, setStatusFilter] = useState("all");
  const [consent, setConsent] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/mail?status=1", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw new Error(p.error);
        setStatus(p);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Verbindung fehlgeschlagen.",
          );
      });
    return () => controller.abort();
  }, []);
  const savedKeys = new Set(savedDrafts.map(mailKey));
  const annotate = <T extends MailSummary,>(m: T): T => ({ ...m, hasDraft: m.hasDraft || savedKeys.has(mailKey(m)) });
  const selected = selectedMail ? annotate(selectedMail) : null;
  async function request(url: string, options?: RequestInit) {
    const r = await fetch(url, { ...options, cache: "no-store" });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error || "Anfrage fehlgeschlagen.");
    return p;
  }
  async function load(older = false, targetFolder = folder) {
    setBusy(true);
    setError("");
    try {
      const p = await request(
        `/api/workspace/mail?folder=${targetFolder}${older && next ? `&before=${next}` : ""}`,
      );
      if (older && messages.length && messages[0].validity !== p.validity)
        throw new Error(
          "Das Postfach wurde geändert. Bitte aktualisieren Sie den Posteingang.",
        );
      setFolder(targetFolder);
      setMessages(older ? [...messages, ...p.messages] : p.messages);
      setNext(p.next);
      setLoaded(true);
      if (!older) {
        setSelected(null);
        setAnalysis(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function open(mail: MailSummary) {
    setBusy(true);
    setError("");
    setSelected(null);
    setAnalysis(null);
    setConsent(false);
    try {
      const p = await request(
        `/api/workspace/mail?folder=${mail.folder}&uid=${mail.uid}&validity=${mail.validity}`,
      );
      setSelected(p.message);
      // Opening is recorded separately; it never changes the work status or AOL flags.
      await saveState(p.message, { opened: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lesen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function saveState(mail: MailSummary, patch: { opened?: true; status?: WorkflowStatus; relevance?: "auto" | "relevant" | "excluded" }) {
    const p = await request("/api/workspace/mail", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: mail.folder, uid: mail.uid, validity: mail.validity, ...patch }),
    });
    const apply = <T extends MailSummary,>(m: T): T => ({ ...m, openedAt: p.state.opened_at, relevance: p.state.relevance, manualStatus: p.state.status, workflowStatus: p.state.status || m.workflowStatus });
    setMessages(ms => ms.map(m => mailKey(m) === mailKey(mail) ? apply(m) : m));
    setSelected(m => m && mailKey(m) === mailKey(mail) ? apply(m) : m);
  }
  async function changeState(patch: { status?: WorkflowStatus; relevance?: "auto" | "relevant" | "excluded" }) {
    if (!selected) return;
    setBusy(true); setError("");
    try { await saveState(selected, patch); }
    catch (e) { setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen."); }
    finally { setBusy(false); }
  }
  async function analyze() {
    if (!selected || !consent) return;
    setBusy(true);
    setError("");
    try {
      const p = await request("/api/workspace/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: selected.folder,
          uid: selected.uid,
          validity: selected.validity,
          consent,
        }),
      });
      setAnalysis(p.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorschlag fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  function draft(body: string) {
    if (!selected) return;
    onDraft({
      to: selected.replyTo,
      subject: replySubject(selected.subject),
      body,
      sourceMessageId: selected.messageId,
      sourceMailbox: "AOL",
      sourceRef: { folder: selected.folder, uid: selected.uid, validity: selected.validity },
      status: "draft",
    });
  }
  const visible = messages.map(annotate).filter(
    (m) =>
      (relevanceFilter === "all" || (relevanceFilter === "relevant" ? isRelevant(m) : !isRelevant(m))) &&
      (statusFilter === "all" || (statusFilter === "unopened" ? !m.openedAt : workflowStatus(m) === statusFilter)) &&
      `${m.subject} ${m.from} ${m.fromName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section
      className="panel aol-panel"
      aria-labelledby="aol-title"
      aria-busy={busy}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Persönliche Korrespondenz</span>
          <h2 id="aol-title">Ihr AOL-Postfach</h2>
        </div>
        <button
          className="quiet-button"
          disabled={busy || !status?.configured}
          onClick={() => load()}
        >
          {" "}
          {busy
            ? "Bitte warten …"
            : loaded
              ? "Aktualisieren"
              : "Nachrichten laden"}
        </button>
      </div>
      {!status && !error && <p role="status">Verbindung wird geprüft …</p>}
      {status && !status.configured && (
        <p className="notice">
          Die AOL-Anmeldung muss noch eingerichtet werden. Sobald Ihr Postfach
          verbunden ist, können Sie hier persönliche Nachrichten lesen und
          Antworten vorbereiten.
        </p>
      )}
      <div className="toolbar" role="group" aria-label="AOL-Ordner">
        <button className="quiet-button" aria-pressed={folder === "inbox"} disabled={busy || !status?.configured} onClick={() => { setRelevanceFilter("relevant"); setStatusFilter("all"); void load(false, "inbox"); }}>Posteingang</button>
        <button className="quiet-button" aria-pressed={folder === "sent"} disabled={busy || !status?.configured} onClick={() => { setRelevanceFilter("all"); setStatusFilter("all"); void load(false, "sent"); }}>Gesendet</button>
      </div>
      <p className="muted">
        Newsletter, Spam, Rechnungen, Belege und automatische Bestätigungen sind
        ausgeblendet. Unklare Nachrichten bleiben zur Prüfung sichtbar.
        „Angezeigt“ und Bearbeitungsstand werden in Velmora gespeichert. AOL-Lesemarkierungen bleiben unverändert. „Beantwortet“ als Bearbeitungsstand versendet keine Nachricht.
      </p>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {loaded && (
        <>
          <div className="toolbar">
            <input
              aria-label="Geladene E-Mails durchsuchen"
              placeholder="Absender oder Betreff suchen"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label>Relevanz
              <select value={relevanceFilter} disabled={busy} onChange={e => setRelevanceFilter(e.target.value)}>
                <option value="relevant">Relevant</option><option value="all">Alle</option><option value="excluded">Ausgeblendet</option>
              </select>
            </label>
            <label>Bearbeitungsstand
              <select value={statusFilter} disabled={busy} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">Alle Bearbeitungsstände</option><option value="unopened">Noch nicht angezeigt</option>
                {Object.entries(workflowStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <p className="muted">
            {messages.length} Nachrichten geladen · {visible.length} angezeigt.
            Die Vorauswahl kann Fehler enthalten.
          </p>
          <div className="aol-layout">
            <div className="aol-list" aria-label="Nachrichten">
              {visible.map((m) => (
                <button
                  key={mailKey(m)}
                  className="aol-message"
                  disabled={busy}
                  aria-pressed={
                    selected?.uid === m.uid && selected.validity === m.validity
                  }
                  onClick={() => open(m)}
                >
                  <strong>{folder === "sent" ? `An: ${m.to || "Unbekannt"}` : m.fromName}</strong>
                  <span>{m.subject}</span>
                  <small>
                    {date(m.date)}
                    {` · ${folder === "sent" ? "Gesendet" : workflowStatuses[workflowStatus(m)]}`}
                    {m.openedAt ? " · Angezeigt" : " · Noch nicht angezeigt"}
                    {` · ${isRelevant(m) ? "Relevant" : "Ausgeblendet"}`}
                    {m.answered ? " · AOL: beantwortet" : ""}
                    {m.excluded ? ` · ${m.excluded}` : ""}
                  </small>
                </button>
              ))}
              {!visible.length && (
                <p>
                  Keine passenden Nachrichten in den bisher geladenen E-Mails.
                </p>
              )}
              {next && (
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={() => load(true)}
                >
                  Ältere Nachrichten laden
                </button>
              )}
            </div>
            {selected && (
              <article className="aol-detail">
                <h3>{selected.subject}</h3>
                <p>
                  {selected.fromName} &lt;{selected.from}&gt; ·{" "}
                  {date(selected.date)}
                </p>
                <div className="toolbar">
                  <label>Bearbeitungsstand
                    <select aria-label="Bearbeitungsstand dieser E-Mail" disabled={busy} value={workflowStatus(selected)} onChange={e => changeState({ status: e.target.value as WorkflowStatus })}>
                      {Object.entries(workflowStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label>Relevanz
                    <select aria-label="Relevanz dieser E-Mail" disabled={busy} value={selected.relevance || "auto"} onChange={e => changeState({ relevance: e.target.value as "auto" | "relevant" | "excluded" })}>
                      <option value="auto">Automatische Vorauswahl</option><option value="relevant">Relevant</option><option value="excluded">Ausblenden</option>
                    </select>
                  </label>
                </div>
                <p className="muted">{selected.openedAt ? `In Velmora angezeigt: ${date(selected.openedAt)}` : "Noch nicht als angezeigt gespeichert"}{selected.folder === "sent" ? ` · Gesendet an: ${selected.to}` : ""}</p>
                <p className="muted">
                  Antwortadresse: {selected.replyTo || "Nicht verfügbar"}
                </p>
                <p className="notice">
                  {selected.answered ? "In AOL als beantwortet markiert. " : ""}
                  {selected.historyStatus}. Bitte prüfen Sie bei Bedarf den
                  vollständigen Verlauf in AOL.
                </p>
                {selected.sentReplies.map((r, i) => (
                  <p key={i}>
                    Gesendet: {r.subject} · {date(r.date)}
                  </p>
                ))}
                <pre className="aol-text">
                  {selected.text ||
                    "Kein lesbarer Nachrichtentext. Bitte in AOL öffnen."}
                </pre>
                {selected.attachments.length > 0 && (
                  <p>
                    Anhänge (Inhalt nicht ausgewertet):{" "}
                    {selected.attachments.join(", ")}
                  </p>
                )}
                {selected.folder === "sent" ? <p>Gesendete Nachricht aus AOL.</p> : selected.excluded ? (
                  <p>Keine Antwortvorbereitung: {selected.excluded}.</p>
                ) : (
                  <>
                    <button
                      className="quiet-button"
                      disabled={busy || !selected.replyTo}
                      onClick={() => draft("")}
                    >
                      Antwort manuell vorbereiten
                    </button>
                    {status?.ai && (
                      <>
                        <label className="aol-consent">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                          />{" "}
                          Den angezeigten Nachrichtentext, Absender, Betreff,
                          Anhangnamen und Antwortstatus zur Analyse an OpenAI
                          übermitteln.
                        </label>
                        <button
                          className="quiet-button"
                          disabled={
                            busy ||
                            !consent ||
                            !selected.text ||
                            selected.answered ||
                            Boolean(selected.sentReplies.length)
                          }
                          onClick={analyze}
                        >
                          Handlungsbedarf & Antwortvorschlag
                        </button>
                      </>
                    )}
                    {analysis && (
                      <div className="aol-analysis" aria-live="polite">
                        <h4>Vorschlag zur Prüfung</h4>
                        <p>{analysis.summary}</p>
                        <p>
                          {analysis.needsReply
                            ? "Antwortbedarf prüfen"
                            : "Keine Antwort vorgeschlagen"}{" "}
                          ·{" "}
                          {
                            {
                              personal: "Persönliche Nachricht",
                              newsletter: "Newsletter",
                              spam: "Spam",
                              invoice: "Rechnung / Beleg",
                              automatic: "Automatische Nachricht",
                              uncertain: "Unklar",
                            }[analysis.category]
                          }
                        </p>
                        {analysis.missingInformation.length > 0 && (
                          <>
                            <strong>Noch zu klären</strong>
                            <ul>
                              {analysis.missingInformation.map((m, i) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {analysis.reply && (
                          <>
                            <pre className="aol-text">{analysis.reply}</pre>
                            <button
                              className="quiet-button"
                              disabled={busy || !selected.replyTo}
                              onClick={() => draft(analysis.reply)}
                            >
                              Als Entwurf bearbeiten
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </article>
            )}
          </div>
        </>
      )}
    </section>
  );
}
