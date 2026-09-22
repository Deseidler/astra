import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { documentSchema, defaultData } from "@/lib/workspace/model";
import { checksum, identifyFile, safeFilename } from "@/lib/workspace/files";
import {
  apiError,
  checkOrigin,
  HttpError,
  workspaceAuth,
  verifyReferences,
} from "@/lib/workspace/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db, user } = await workspaceAuth();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 3145728)
      throw new HttpError(
        400,
        "Bitte wählen Sie eine PDF-, JPG- oder PNG-Datei mit maximal 3 MB.",
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = identifyFile(bytes);
    if (!mime)
      throw new HttpError(400, "Dieses Dateiformat wird nicht unterstützt.");
    const name = safeFilename(file.name);
    const hash = checksum(bytes);
    const { data: duplicate, error: duplicateError } = await db
      .from("workspace_items")
      .select("id")
      .eq("owner_id", user.id)
      .eq("kind", "document")
      .eq("data->original->>checksum", hash)
      .limit(1);
    if (duplicateError) throw duplicateError;
    if (duplicate?.length)
      throw new HttpError(409, "Diese Datei wurde bereits hochgeladen.");
    const path = `${user.id}/${randomUUID()}/${name}`;
    const data = documentSchema.parse({
      ...defaultData("document"),
      profileId: String(form.get("profileId") || ""),
      topicId: String(form.get("topicId") || ""),
      original: { path, name, mime, size: file.size, checksum: hash },
    });
    await verifyReferences(db, user.id, data);
    const { error: uploadError } = await db.storage
      .from("velmora-originals")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;
    const { data: item, error } = await db
      .from("workspace_items")
      .insert({ owner_id: user.id, kind: "document", title: name, data })
      .select()
      .single();
    if (error) {
      await db.storage.from("velmora-originals").remove([path]);
      throw error;
    }
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
