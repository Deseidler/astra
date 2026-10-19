import "server-only";
import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser } from "mailparser";
import { z } from "zod";
import { HttpError } from "@/lib/workspace/server";
import {
  canAccessMailbox,
  exclusionReason,
  type MailRef,
  type MailSummary,
  type MailDetail,
} from "./model";

export function mailboxConfig(userId: string) {
  if (!canAccessMailbox(userId, process.env.AOL_OWNER_ID))
    throw new HttpError(
      403,
      "Für Ihren Zugang ist kein AOL-Postfach eingerichtet.",
    );
  const email = z.email().safeParse(process.env.AOL_EMAIL);
  const password = process.env.AOL_APP_PASSWORD;
  if (!email.success || !password)
    throw new HttpError(503, "Die AOL-Anmeldung ist noch nicht eingerichtet.");
  return { email: email.data, password };
}

async function withAol<T>(
  userId: string,
  work: (client: ImapFlow) => Promise<T>,
) {
  const config = mailboxConfig(userId);
  const client = new ImapFlow({
    host: "imap.aol.com",
    port: 993,
    secure: true,
    auth: { user: config.email, pass: config.password },
    logger: false,
    emitLogs: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
  // Never allow protocol errors (which can contain mail data) to reach logging.
  client.on("error", () => {});
  try {
    await client.connect();
    return await work(client);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      502,
      "AOL konnte nicht erreicht werden. Bitte prüfen Sie die Verbindung und das App-Passwort.",
    );
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

const iso = (value: Date | string | undefined) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : "";
};
function summary(mail: FetchMessageObject, validity: string, folder: MailRef["folder"]): MailSummary {
  const from = mail.envelope?.from?.[0];
  return {
    folder,
    uid: mail.uid,
    validity,
    subject: mail.envelope?.subject || "(Kein Betreff)",
    from: from?.address || "",
    fromName: from?.name || from?.address || "Unbekannt",
    to: (mail.envelope?.to || []).map((r) => r.address || r.name || "").filter(Boolean).join(", "),
    date: iso(mail.envelope?.date || mail.internalDate),
    answered: mail.flags?.has("\\Answered") || false,
    messageId: /^<[^<>\s]+>$/.test(mail.envelope?.messageId || "")
      ? mail.envelope!.messageId!
      : "",
    excluded: exclusionReason(
      `${from?.name || ""} <${from?.address || ""}>`,
      mail.envelope?.subject || "",
      mail.headers?.toString("utf8"),
    ),
  };
}

async function folderPath(client: ImapFlow, folder: MailRef["folder"]) {
  if (folder === "inbox") return "INBOX";
  const sent = (await client.list()).find((f) => f.specialUse === "\\Sent");
  if (!sent) throw new HttpError(404, "Der AOL-Ordner Gesendet wurde nicht gefunden.");
  return sent.path;
}

export async function listInbox(userId: string, before?: number, folder: MailRef["folder"] = "inbox") {
  return withAol(userId, async (client) => {
    const box = await client.mailboxOpen(await folderPath(client, folder), { readOnly: true });
    const validity = String(box.uidValidity);
    if (!box.exists || before === 1)
      return { messages: [], next: null, validity };
    const ids = await client.search(
      { deleted: false, ...(before ? { uid: `1:${before - 1}` } : {}) },
      { uid: true },
    );
    if (!Array.isArray(ids) || !ids.length)
      return { messages: [], next: null, validity };
    const page = ids.sort((a, b) => b - a).slice(0, 25);
    const mails = await client.fetchAll(
      page,
      {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
        headers: [
          "List-Unsubscribe",
          "List-Id",
          "Auto-Submitted",
          "Precedence",
          "X-Spam-Flag",
          "X-Spam-Status",
        ],
      },
      { uid: true },
    );
    return {
      messages: mails
        .map((m) => summary(m, validity, folder))
        .sort((a, b) => b.uid - a.uid),
      next: ids.length > page.length ? Math.min(...page) : null,
      validity,
    };
  });
}

export async function readMessage(
  userId: string,
  ref: MailRef,
): Promise<MailDetail> {
  return withAol(userId, async (client) => {
    const box = await client.mailboxOpen(await folderPath(client, ref.folder), { readOnly: true });
    if (String(box.uidValidity) !== ref.validity)
      throw new HttpError(
        409,
        "Das Postfach wurde geändert. Bitte laden Sie den Posteingang neu.",
      );
    const meta = await client.fetchOne(
      String(ref.uid),
      { size: true, envelope: true, flags: true },
      { uid: true },
    );
    if (!meta)
      throw new HttpError(404, "Diese Nachricht ist nicht mehr verfügbar.");
    // Strict upper bound; do not download a large attachment just to read text.
    const maxBytes = 2 * 1024 * 1024;
    if (!meta.size || meta.size > maxBytes)
      throw new HttpError(
        413,
        "Diese Nachricht ist zu groß. Bitte öffnen Sie sie direkt in AOL Mail.",
      );
    const full = await client.fetchOne(
      String(ref.uid),
      { source: { maxLength: maxBytes + 1 }, headers: true },
      { uid: true },
    );
    if (!full || !full.source || full.source.length > maxBytes)
      throw new HttpError(
        413,
        "Die Nachricht konnte nicht vollständig geladen werden.",
      );
    const parsed = await simpleParser(full.source, {
      skipHtmlToText: false,
      skipTextToHtml: true,
      skipImageLinks: true,
    });
    const result: MailDetail = {
      ...summary({ ...meta, headers: full.headers }, ref.validity, ref.folder),
      text: (parsed.text || "").slice(0, 30000),
      replyTo:
        parsed.replyTo?.value[0]?.address ||
        parsed.from?.value[0]?.address ||
        "",
      attachments: parsed.attachments.map(
        (a) => a.filename || "Unbenannter Anhang",
      ),
      sentReplies: [],
      historyStatus: "Nicht geprüft",
    };
    if (ref.folder === "sent") {
      result.historyStatus = "Diese Nachricht befindet sich im AOL-Ordner Gesendet";
      return result;
    }
    // Sent-folder evidence supplements, but never overrules, an Answered flag.
    const sent = (await client.list()).find(
      (folder) => folder.specialUse === "\\Sent",
    );
    if (sent && result.messageId && !/[\r\n]/.test(result.messageId)) {
      try {
        await client.mailboxOpen(sent.path, { readOnly: true });
        const ids = await client.search(
          {
            or: [
              { header: { "In-Reply-To": result.messageId } },
              { header: { References: result.messageId } },
            ],
          },
          { uid: true },
        );
        const selected = Array.isArray(ids) ? ids.slice(-10) : [];
        if (selected.length) {
          const replies = await client.fetchAll(
            selected,
            { envelope: true },
            { uid: true },
          );
          result.sentReplies = replies.map((m) => ({
            subject: m.envelope?.subject || "",
            date: iso(m.envelope?.date),
          }));
        }
        result.historyStatus = result.sentReplies.length
          ? "Antworten im Gesendet-Ordner gefunden"
          : "Keine Antwort mit passendem Nachrichtenbezug gefunden; andere Antworten sind möglich";
      } catch {
        result.historyStatus = "Gesendet-Ordner konnte nicht geprüft werden";
      }
    } else
      result.historyStatus =
        "Kein Gesendet-Ordner oder Nachrichtenbezug verfügbar";
    return result;
  });
}
