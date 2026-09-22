import { NextResponse } from "next/server";
import { z } from "zod";
import { validateItem, documentSchema } from "@/lib/workspace/model";
import {
  apiError,
  checkOrigin,
  HttpError,
  workspaceAuth,
  verifyReferences,
} from "@/lib/workspace/server";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const { db, user } = await workspaceAuth();
    const id = z.uuid().parse((await params).id);
    const { data: old, error: oldError } = await db
      .from("workspace_items")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (oldError) throw new HttpError(404, "Eintrag nicht gefunden.");
    const raw = await request.json();
    const input = validateItem({ ...raw, kind: old.kind });
    if (!input.version) throw new HttpError(400, "Die Versionsnummer fehlt.");
    await verifyReferences(db, user.id, input.data);
    if (
      old.kind === "document" &&
      JSON.stringify(documentSchema.parse(old.data).original) !==
        JSON.stringify(documentSchema.parse(input.data).original)
    )
      throw new HttpError(400, "Originaldateien können nicht geändert werden.");
    const { data, error } = await db
      .from("workspace_items")
      .update({ title: input.title, data: input.data })
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("version", input.version)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw new HttpError(
        409,
        "Dieser Eintrag wurde inzwischen geändert. Bitte schließen und erneut öffnen.",
      );
    return NextResponse.json({ item: data });
  } catch (e) {
    return apiError(e);
  }
}
