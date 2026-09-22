import { NextResponse } from "next/server";
import { z } from "zod";
import {
  letterSchema,
  emailSchema,
  documentSchema,
} from "@/lib/workspace/model";
import { renderLetter, emailDraft } from "@/lib/workspace/pdf";
import { apiError, HttpError, workspaceAuth } from "@/lib/workspace/server";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, user } = await workspaceAuth();
    const id = z.uuid().parse((await params).id);
    const { data: item, error } = await db
      .from("workspace_items")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (error) throw new HttpError(404, "Eintrag nicht gefunden.");
    const query = new URL(request.url).searchParams;
    const format = query.get("format");
    let bytes: Uint8Array;
    let mime: string;
    let extension: string;
    let event: string;
    if (item.kind === "document") {
      const data = documentSchema.parse(item.data);
      if (!data.original.path.startsWith(user.id + "/"))
        throw new HttpError(403, "Kein Zugriff auf dieses Original.");
      const result = await db.storage
        .from("velmora-originals")
        .download(data.original.path);
      if (result.error) throw result.error;
      bytes = new Uint8Array(await result.data.arrayBuffer());
      mime = data.original.mime;
      extension =
        mime === "application/pdf"
          ? "pdf"
          : mime === "image/png"
            ? "png"
            : "jpg";
      event = "download";
    } else if (item.kind === "letter") {
      const data = letterSchema.parse(item.data);
      try {
        bytes = await renderLetter(item.title, data);
      } catch (e) {
        throw new HttpError(
          400,
          e instanceof Error && e.message.includes("WinAnsi")
            ? "Ein Zeichen kann in dieser PDF-Schrift nicht dargestellt werden. Bitte entfernen Sie Emojis oder nicht unterstützte Sonderzeichen."
            : e instanceof Error
              ? e.message
              : "PDF konnte nicht erstellt werden.",
        );
      }
      mime = "application/pdf";
      extension = "pdf";
      event = "pdf_export";
      if (format === "eml") {
        if (data.status !== "approved" || !data.recipientEmail)
          throw new HttpError(
            400,
            "Bitte prüfen Sie den Brief, geben Sie ihn frei und ergänzen Sie die E-Mail-Adresse des Empfängers.",
          );
        bytes = Buffer.from(
          emailDraft(
            data.recipientEmail,
            item.title,
            data.salutation +
              "\n\nAnbei erhalten Sie mein Schreiben.\n\n" +
              data.closing +
              "\n" +
              data.sender,
            bytes,
          ),
        );
        mime = "message/rfc822";
        extension = "eml";
        event = "email_export";
      }
    } else if (item.kind === "email") {
      const data = emailSchema.parse(item.data);
      if (data.status !== "approved")
        throw new HttpError(400, "Bitte geben Sie die Nachricht zuerst frei.");
      bytes = Buffer.from(emailDraft(data.to, item.title, data.body));
      mime = "message/rfc822";
      extension = "eml";
      event = "email_export";
    } else
      throw new HttpError(400, "Für diesen Eintrag gibt es keinen Export.");
    const { error: auditError } = await db.rpc("record_workspace_access", {
      target_id: id,
      event_action: event,
    });
    if (auditError) throw auditError;
    const filename = `${String(item.data.date || item.created_at.slice(0, 10))}_${item.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90)}.${extension}`;
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${query.get("inline") === "1" && extension === "pdf" ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
