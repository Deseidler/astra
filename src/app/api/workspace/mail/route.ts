import { enqueueMail, intakeEnabled } from "@/lib/intake/agent";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  apiError,
  checkOrigin,
  HttpError,
  workspaceAuth,
} from "@/lib/workspace/server";
import { withWorkflow } from "@/lib/mail/workflow";
import { listInbox, readMessage } from "@/lib/mail/aol";
import { analyzeMail } from "@/lib/mail/analyze";
import { canAccessMailbox, mailRefSchema, mailStateSchema } from "@/lib/mail/model";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const { db, user } = await workspaceAuth();
    const query = new URL(request.url).searchParams;
    if (query.get("status") === "1") {
      const allowed = canAccessMailbox(user.id, process.env.AOL_OWNER_ID);
      return NextResponse.json(
        {
          configured:
            allowed &&
            Boolean(process.env.AOL_EMAIL && process.env.AOL_APP_PASSWORD),
          ai: allowed && Boolean(process.env.OPENAI_API_KEY),
        },
        { headers },
      );
    }
    if (query.has("uid")) {
      const ref = mailRefSchema.parse({
        folder: query.get("folder") || "inbox",
        uid: Number(query.get("uid")),
        validity: query.get("validity"),
      });
      return NextResponse.json(
        { message: (await withWorkflow(db, user.id, [await readMessage(user.id, ref)]))[0] },
        { headers },
      );
    }
    const before = query.has("before")
      ? z
          .number()
          .int()
          .min(1)
          .max(4294967295)
          .parse(Number(query.get("before")))
      : undefined;
    const folder = z.enum(["inbox", "sent"]).parse(query.get("folder") || "inbox");
    const page = await listInbox(user.id, before, folder);
    if (folder === "inbox" && await intakeEnabled(db,user.id)) await enqueueMail(db,user.id,page.messages);
    return NextResponse.json({ ...page, messages: await withWorkflow(db, user.id, page.messages) }, { headers });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await workspaceAuth();
    const text = await request.text();
    if (text.length > 1000)
      throw new HttpError(413, "Die Anfrage ist zu groß.");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new HttpError(400, "Ungültige Anfrage.");
    }
    const input = mailRefSchema
      .extend({ consent: z.literal(true) })
      .parse(json);
    if (input.folder === "sent") throw new HttpError(400, "Für gesendete Nachrichten wird keine Antwort vorbereitet.");
    // Re-read from the authenticated mailbox; never trust client-supplied message text.
    const message = await readMessage(user.id, input);
    return NextResponse.json(
      { analysis: await analyzeMail(message) },
      { headers },
    );
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const { db, user } = await workspaceAuth();
    if (!canAccessMailbox(user.id, process.env.AOL_OWNER_ID)) throw new HttpError(403, "Dieses Postfach ist nicht verfügbar.");
    const text = await request.text();
    if (text.length > 1000) throw new HttpError(413, "Die Anfrage ist zu groß.");
    let json: unknown;
    try { json = JSON.parse(text); } catch { throw new HttpError(400, "Ungültige Anfrage."); }
    const input = mailStateSchema.parse(json);
    const row: Record<string, unknown> = {
      owner_id: user.id, folder: input.folder, validity: input.validity, uid: input.uid,
      updated_at: new Date().toISOString(),
    };
    if (input.status) row.status = input.status;
    if (input.relevance) row.relevance = input.relevance;
    if (input.opened) row.opened_at = new Date().toISOString();
    const identity = { owner_id: user.id, folder: input.folder, validity: input.validity, uid: input.uid };
    const inserted = await db.from("mail_workflow").upsert(identity, { onConflict: "owner_id,folder,validity,uid", ignoreDuplicates: true });
    if (inserted.error) throw inserted.error;
    const { data, error } = await db.from("mail_workflow").update(row).match(identity).select().single();
    if (error) throw error;
    return NextResponse.json({ state: data }, { headers });
  } catch (e) { return apiError(e); }
}
