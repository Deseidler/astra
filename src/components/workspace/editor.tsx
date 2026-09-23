"use client";
import { useEffect, useRef, useState } from "react";
import {
  categories,
  defaultData,
  type Item,
  type Kind,
} from "@/lib/workspace/model";
type Field = {
  key: string;
  label: string;
  type?:
    "textarea" | "date" | "email" | "checkbox" | "select" | "secret" | "money";
  options?: string[];
  source?: Kind;
  required?: boolean;
  hint?: string;
};
const profile: Field = {
  key: "profileId",
  label: "Familienmitglied",
  type: "select",
  source: "profile",
};
const matter: Field = {
  key: "caseId",
  label: "Akte / Anliegen",
  type: "select",
  source: "case",
};
const fields: Record<Kind, Field[]> = {
  profile: [
    { key: "name", label: "Vollständiger Name", required: true },
    {
      key: "relationship",
      label: "Rolle in der Familie",
      type: "select",
      options: ["Vater", "Mutter", "Sohn", "Tochter", "Weitere Person"],
    },
    { key: "birthDate", label: "Geburtsdatum", type: "date" },
    { key: "birthName", label: "Geburtsname" },
    { key: "address", label: "Anschrift", type: "textarea" },
    { key: "phone", label: "Telefon" },
    { key: "email", label: "E-Mail-Adresse", type: "email" },
    {
      key: "taxId",
      label: "Steuer-ID",
      type: "secret",
      hint: "Persönliche steuerliche Identifikationsnummer",
    },
    {
      key: "taxNumber",
      label: "Steuernummer",
      type: "secret",
      hint: "Vom zuständigen Finanzamt; nicht mit der Steuer-ID verwechseln",
    },
    { key: "healthInsurance", label: "Krankenversicherung" },
    { key: "insuranceNumber", label: "Versichertennummer", type: "secret" },
    {
      key: "pensionNumber",
      label: "Rentenversicherungsnummer",
      type: "secret",
    },
    { key: "childBenefitNumber", label: "Kindergeldnummer", type: "secret" },
    {
      key: "notes",
      label: "Quellen, Hinweise & offene Prüfungen",
      type: "textarea",
    },
    {
      key: "verified",
      label: "Ich habe die Stammdaten anhand aktueller Unterlagen geprüft.",
      type: "checkbox",
    },
  ],
  topic: [
    profile,
    {
      key: "category",
      label: "Themenbereich",
      hint: "Vorhandenen Bereich wählen oder einen eigenen Namen eingeben.",
    },
    { key: "notes", label: "Beschreibung", type: "textarea" },
  ],
  case: [
    profile,
    { key: "topicId", label: "Themenkachel", type: "select", source: "topic" },
    {
      key: "category",
      label: "Bereich",
      hint: "Vorhandenen Bereich wählen oder einen eigenen Namen eingeben.",
    },
    { key: "reference", label: "Aktenzeichen / Kundennummer" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["open", "closed"],
    },
    { key: "notes", label: "Notizen", type: "textarea" },
  ],
  task: [
    {
      key: "amountCents",
      label: "Forderung in Euro (optional)",
      type: "money",
    },
    profile,
    matter,
    { key: "due", label: "Fällig am", type: "date" },
    {
      key: "priority",
      label: "Priorität",
      type: "select",
      options: ["normal", "high"],
    },
    { key: "notes", label: "Was ist zu erledigen?", type: "textarea" },
    { key: "done", label: "Aufgabe erledigt", type: "checkbox" },
  ],
  letter: [
    profile,
    matter,
    { key: "sender", label: "Absendername", required: true },
    {
      key: "senderAddress",
      label: "Absenderanschrift",
      type: "textarea",
      required: true,
    },
    {
      key: "recipient",
      label: "Empfänger und Anschrift",
      type: "textarea",
      required: true,
    },
    {
      key: "recipientEmail",
      label: "Empfänger-E-Mail (optional)",
      type: "email",
    },
    { key: "place", label: "Ort" },
    { key: "date", label: "Briefdatum", type: "date", required: true },
    { key: "reference", label: "Aktenzeichen / Bezug" },
    { key: "salutation", label: "Anrede", required: true },
    { key: "body", label: "Ihr Schreiben", type: "textarea", required: true },
    { key: "closing", label: "Grußformel", required: true },
    {
      key: "attachments",
      label: "Anlagenverzeichnis",
      type: "textarea",
      hint: "Zusätzliche Hinweise zu Anlagen. Dateien unten auswählen.",
    },
  ],
  email: [
    profile,
    matter,
    { key: "to", label: "An", type: "email", required: true },
    { key: "body", label: "Nachricht", type: "textarea", required: true },
  ],
  connection: [
    {
      key: "provider",
      label: "Anbieter",
      type: "select",
      options: ["AOL", "Google", "Microsoft", "IMAP / SMTP"],
    },
    { key: "email", label: "Postfach-Adresse", type: "email", required: true },
    { key: "displayName", label: "Absendername" },
    {
      key: "notes",
      label: "Hinweise zur geplanten Verbindung",
      type: "textarea",
    },
  ],
  document: [
    {
      key: "amountCents",
      label: "Offene Forderung in Euro (optional)",
      type: "money",
    },
    { key: "settled", label: "Forderung erledigt / bezahlt", type: "checkbox" },
    { key: "due", label: "Zahlungsfrist", type: "date" },
    profile,
    { key: "topicId", label: "Themenkachel", type: "select", source: "topic" },
    matter,
    {
      key: "category",
      label: "Bereich",
      hint: "Vorhandenen Bereich wählen oder einen eigenen Namen eingeben.",
    },
    {
      key: "date",
      label: "Dokumentdatum",
      type: "date",
      hint: "Ohne Dokumentdatum wird nach dem Upload-Datum sortiert.",
    },
    {
      key: "status",
      label: "Ablagestatus",
      type: "select",
      options: ["review", "filed", "archived"],
    },
    { key: "notes", label: "Notizen", type: "textarea" },
  ],
};
export const labels: Record<string, string> = {
  open: "Offen",
  closed: "Abgeschlossen",
  normal: "Normal",
  high: "Wichtig",
  review: "Zu prüfen",
  filed: "Eingeordnet",
  archived: "Archiviert",
  draft: "Entwurf · prüfen",
  approved: "Freigegeben",
  profile: "Familienprofil",
  topic: "Themenkachel",
  case: "Akte",
  task: "Aufgabe",
  letter: "Brief",
  email: "E-Mail",
  connection: "Postfach",
  document: "Dokument",
};
export function Editor({
  kind,
  item,
  items,
  defaults,
  onClose,
  onSaved,
}: {
  kind: Kind;
  item?: Item;
  items: Item[];
  defaults?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(
    item?.title || String(defaults?.subject || ""),
  );
  const [data, setData] = useState<Record<string, unknown>>(() => ({
    ...defaultData(kind),
    ...defaults,
    ...item?.data,
  }));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [attachmentDocs, setAttachmentDocs] = useState(
    items.filter((i) => i.kind === "document"),
  );
  const [showSecrets, setShowSecrets] = useState(true);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function change(key: string, value: unknown) {
    setData((current) => {
      const next = { ...current, [key]: value };
      if (key === "profileId") {
        next.topicId = "";
        if (kind === "letter") {
          const member = items.find((i) => i.id === value);
          if (member) {
            next.sender = member.data.name || member.title;
            next.senderAddress =
              member.data.address ||
              items.find(
                (i) => i.kind === "profile" && i.data.relationship === "Vater",
              )?.data.address ||
              "";
          }
        }
      }
      return next;
    });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const payload = {
        kind,
        title: kind === "profile" ? String(data.name || "") : title,
        data,
        version: item?.version,
      };
      const response = await fetch(
        item ? `/api/workspace/${item.id}` : "/api/workspace",
        {
          method: item ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }
  const custom = (data.customFields || []) as {
    label: string;
    value: string;
  }[];
  return (
    <dialog ref={dialog} className="workspace-dialog" onCancel={onClose}>
      <form className="editor-form" onSubmit={save}>
        <div className="dialog-top">
          <div>
            <span className="eyebrow">Ihr persönlicher Bereich</span>
            <h2>
              {labels[kind]} {item ? "bearbeiten" : "anlegen"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Dialog schließen"
          >
            ×
          </button>
        </div>
        <div className="editor-scroll">
          {kind === "connection" && (
            <p className="notice">
              Das Postfach wird als Verbindung vorbereitet. Anmeldung beim
              Anbieter, Synchronisation und direkter Versand werden separat
              eingerichtet. Bitte keine Passwörter in den Notizen speichern.
            </p>
          )}
          {(kind === "letter" || kind === "email") && (
            <p className="muted">
              Änderungen setzen eine bestehende Freigabe zurück. Speichern Sie
              zuerst den Entwurf und prüfen Sie anschließend das Ergebnis.
            </p>
          )}
          {kind === "letter" &&
          data.profileId &&
          !items.find((i) => i.id === data.profileId)?.data.verified ? (
            <p className="notice">
              Die Stammdaten dieser Person sind noch ungeprüft. Bitte
              kontrollieren Sie besonders Name und Absenderanschrift vor der
              Freigabe.
            </p>
          ) : null}
          {kind === "letter" &&
          data.profileId &&
          !items.find((i) => i.id === data.profileId)?.data.address ? (
            <p className="notice">
              Für diese Person fehlt eine eigene Anschrift. Die vorhandene
              Familienanschrift wurde als Vorschlag übernommen. Bitte vor dem
              Speichern prüfen.
            </p>
          ) : null}
          {kind !== "profile" && (
            <label className="field full">
              {kind === "letter" || kind === "email"
                ? "Betreff"
                : "Bezeichnung"}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </label>
          )}
          <div className="field-grid">
            {fields[kind].map((field) => (
              <label
                className={`field ${field.type === "textarea" || field.type === "checkbox" ? "full" : ""}`}
                key={field.key}
              >
                {field.type !== "checkbox" && field.label}
                {field.type === "money" ? (
                  <input
                    type="number"
                    min="0"
                    max="1000000000"
                    step="0.01"
                    value={Number(data[field.key] || 0) / 100}
                    onChange={(e) =>
                      change(
                        field.key,
                        Math.round(Number(e.target.value) * 100),
                      )
                    }
                  />
                ) : field.key === "category" ? (
                  <>
                    <input
                      list="workspace-categories"
                      value={String(data.category || "")}
                      onChange={(e) => change("category", e.target.value)}
                      required
                      maxLength={80}
                    />
                    <datalist id="workspace-categories">
                      {Array.from(
                        new Set([
                          ...categories,
                          ...items
                            .map((i) => String(i.data.category || ""))
                            .filter(Boolean),
                        ]),
                      ).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                ) : field.type === "select" ? (
                  <select
                    value={String(data[field.key] || "")}
                    onChange={(e) => change(field.key, e.target.value)}
                    required={field.required}
                  >
                    {field.source && <option value="">Nicht zugeordnet</option>}
                    {field.source
                      ? items
                          .filter(
                            (i) =>
                              i.kind === field.source &&
                              (field.source !== "topic" ||
                                !i.data.profileId ||
                                i.data.profileId === data.profileId),
                          )
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.title}
                            </option>
                          ))
                      : field.options?.map((o) => (
                          <option key={o} value={o}>
                            {labels[o] || o}
                          </option>
                        ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    rows={field.key === "body" ? 10 : 3}
                    value={String(data[field.key] || "")}
                    onChange={(e) => change(field.key, e.target.value)}
                    required={field.required}
                    maxLength={field.key === "body" ? 20000 : 5000}
                  />
                ) : field.type === "checkbox" ? (
                  <span className="check-field">
                    <input
                      type="checkbox"
                      checked={Boolean(data[field.key])}
                      onChange={(e) => change(field.key, e.target.checked)}
                    />
                    {field.label}
                  </span>
                ) : (
                  <input
                    type={
                      field.type === "secret"
                        ? showSecrets
                          ? "text"
                          : "password"
                        : field.type || "text"
                    }
                    autoComplete={field.type === "secret" ? "off" : undefined}
                    value={String(data[field.key] || "")}
                    onChange={(e) => change(field.key, e.target.value)}
                    required={field.required}
                    maxLength={field.type === "date" ? undefined : 400}
                  />
                )}
                {field.hint && <small>{field.hint}</small>}
              </label>
            ))}
          </div>
          {kind === "letter" && (
            <section className="attachment-picker">
              <h3>Anhänge aus Ihren Dokumenten</h3>
              <label className="field">
                Neuen Anhang hochladen
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={pending}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPending(true);
                    setError("");
                    try {
                      const form = new FormData();
                      form.set("file", file);
                      form.set("profileId", String(data.profileId || ""));
                      const response = await fetch("/api/workspace/upload", {
                        method: "POST",
                        body: form,
                      });
                      const result = await response.json();
                      if (!response.ok) throw new Error(result.error);
                      setAttachmentDocs((d) => [...d, result.item]);
                      change("attachmentIds", [
                        ...((data.attachmentIds || []) as string[]),
                        result.item.id,
                      ]);
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : "Upload fehlgeschlagen.",
                      );
                    } finally {
                      setPending(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              <p className="muted">
                Bis zu fünf PDFs oder Bilder (zusammen höchstens 3 MB) werden
                als weitere Seiten beigefügt.
              </p>
              {attachmentDocs.map((doc) => (
                <label className="check-field" key={doc.id}>
                  <input
                    type="checkbox"
                    checked={((data.attachmentIds || []) as string[]).includes(
                      doc.id,
                    )}
                    onChange={(e) => {
                      const ids = (data.attachmentIds || []) as string[];
                      change(
                        "attachmentIds",
                        e.target.checked
                          ? [...ids, doc.id]
                          : ids.filter((id) => id !== doc.id),
                      );
                    }}
                  />
                  {doc.title}
                </label>
              ))}
              {!attachmentDocs.length && (
                <p>Noch keine Dokumente hochgeladen.</p>
              )}
            </section>
          )}
          {(kind === "letter" || kind === "email") && (
            <button
              type="button"
              className="quiet-button"
              onClick={() =>
                navigator.clipboard
                  .writeText(
                    [
                      title,
                      data.salutation,
                      data.body,
                      data.closing,
                      data.sender,
                    ]
                      .filter(Boolean)
                      .join("\n\n"),
                  )
                  .catch(() =>
                    setError(
                      "Kopieren nicht möglich. Bitte markieren Sie den Text im Eingabefeld.",
                    ),
                  )
              }
            >
              Text kopieren
            </button>
          )}
          {kind === "profile" && (
            <>
              <button
                type="button"
                className="text-button"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? "Kennzeichen verbergen" : "Kennzeichen anzeigen"}
              </button>
              <section className="custom-fields">
                <h3>Weitere persönliche Angaben</h3>
                {custom.map((entry, index) => (
                  <div className="custom-row" key={index}>
                    <label className="field">
                      Bezeichnung
                      <input
                        value={entry.label}
                        required
                        maxLength={80}
                        onChange={(e) =>
                          change(
                            "customFields",
                            custom.map((v, i) =>
                              i === index ? { ...v, label: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      Wert
                      <input
                        value={entry.value}
                        maxLength={500}
                        onChange={(e) =>
                          change(
                            "customFields",
                            custom.map((v, i) =>
                              i === index ? { ...v, value: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Angabe ${index + 1} entfernen`}
                      onClick={() =>
                        change(
                          "customFields",
                          custom.filter((_, i) => i !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="quiet-button"
                  disabled={custom.length >= 30}
                  onClick={() =>
                    change("customFields", [
                      ...custom,
                      { label: "", value: "" },
                    ])
                  }
                >
                  + Eigenes Feld
                </button>
              </section>
            </>
          )}
          {error && (
            <p role="alert" className="form-message">
              {error}
            </p>
          )}
        </div>
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="gold-button" disabled={pending}>
            {pending ? "Wird gespeichert …" : "Speichern"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
