import { NextResponse } from "next/server";
import { validateItem } from "@/lib/workspace/model";
import {
  apiError,
  checkOrigin,
  HttpError,
  workspaceAuth,
  verifyReferences,
} from "@/lib/workspace/server";
export async function GET() {
  try {
    const { db, user } = await workspaceAuth();
    const [items, events] = await Promise.all([
      db
        .from("workspace_items")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1000),
      db
        .from("workspace_events")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (items.error || events.error)
      throw new HttpError(
        503,
        "Der Arbeitsbereich ist noch nicht eingerichtet oder vorübergehend nicht erreichbar.",
      );
    return NextResponse.json(
      { items: items.data, events: events.data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db, user } = await workspaceAuth();
    const input = validateItem(await request.json());
    if (input.kind === "document")
      throw new HttpError(400, "Bitte verwenden Sie den Datei-Upload.");
    await verifyReferences(db, user.id, input.data);
    const { data, error } = await db
      .from("workspace_items")
      .insert({
        owner_id: user.id,
        kind: input.kind,
        title: input.title,
        data: input.data,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
