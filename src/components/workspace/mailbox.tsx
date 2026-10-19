"use client";
import { useEffect, useState } from "react";
import {
  replySubject,
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
}: {
  onDraft: (defaults: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<{
    configured: boolean;
    ai: boolean;
  } | null>(null);
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<MailDetail | null>(null);
  const [analysis, setAnalysis] = useState<MailAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
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
  async function request(url: string, options?: RequestInit) {
    const r = await fetch(url, { ...options, cache: "no-store" });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error || "Anfrage fehlgeschlagen.");
    return p;
  }
  async function load(older = false) {
    setBusy(true);
    setError("");
    try {
      const p = await request(
        `/api/workspace/mail${older && next ? `?before=${next}` : ""}`,
      );
      if (older && messages.length && messages[0].validity !== p.validity)
        throw new Error(
          "Das Postfach wurde geändert. Bitte aktualisieren Sie den Posteingang.",
        );
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
        `/api/workspace/mail?uid=${mail.uid}&validity=${mail.validity}`,
      );
      setSelected(p.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lesen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
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
      status: "draft",
    });
  }
  const visible = messages.filter(
    (m) =>
      (showExcluded || !m.excluded) &&
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
          <h2 id="aol-title">Ihr AOL-Posteingang</h2>
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
      <p className="muted">
        Newsletter, Spam, Rechnungen, Belege und automatische Bestätigungen sind
        ausgeblendet. Unklare Nachrichten bleiben zur Prüfung sichtbar.
        Nachrichten werden beim Lesen nicht als gelesen markiert.
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
            <label>
              <input
                type="checkbox"
                checked={showExcluded}
                onChange={(e) => setShowExcluded(e.target.checked)}
              />{" "}
              Ausgeblendete Nachrichten zeigen (
              {messages.filter((m) => m.excluded).length})
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
                  key={`${m.validity}:${m.uid}`}
                  className="aol-message"
                  disabled={busy}
                  aria-pressed={
                    selected?.uid === m.uid && selected.validity === m.validity
                  }
                  onClick={() => open(m)}
                >
                  <strong>{m.fromName}</strong>
                  <span>{m.subject}</span>
                  <small>
                    {date(m.date)}
                    {m.answered ? " · Als beantwortet markiert" : ""}
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
                {selected.excluded ? (
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
