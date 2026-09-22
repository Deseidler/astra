import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function workspaceAuth() {
  const db = await createServerSupabase();
  if (!db)
    throw new HttpError(
      503,
      "Die Datenbankverbindung ist noch nicht eingerichtet.",
    );
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user || user.is_anonymous)
    throw new HttpError(401, "Bitte melden Sie sich erneut an.");
  return { db, user };
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(403, "Diese Anfrage ist nicht erlaubt.");
}
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error:
          "Bitte prüfen Sie die Eingaben: " +
          error.issues
            .slice(0, 3)
            .map((e) => e.path.join(".") + " – " + e.message)
            .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "Workspace request failed",
    error instanceof Error ? error.name : "DatabaseError",
  );
  return NextResponse.json(
    {
      error:
        "Die Änderung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    },
    { status: 500 },
  );
}
export async function verifyReferences(
  db: Awaited<ReturnType<typeof workspaceAuth>>["db"],
  owner: string,
  data: Record<string, unknown>,
) {
  for (const [field, kind] of [
    ["profileId", "profile"],
    ["caseId", "case"],
    ["topicId", "topic"],
  ]) {
    const id = data[field];
    if (!id) continue;
    const { data: record, error } = await db
      .from("workspace_items")
      .select("id,kind,data")
      .eq("id", id)
      .eq("owner_id", owner)
      .single();
    if (error || record.kind !== kind)
      throw new HttpError(400, "Die gewählte Zuordnung ist nicht verfügbar.");
    if (
      field === "topicId" &&
      record.data.profileId &&
      record.data.profileId !== data.profileId
    )
      throw new HttpError(
        400,
        "Dieses Thema gehört zu einem anderen Familienprofil.",
      );
  }
}
