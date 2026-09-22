import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Workspace } from "@/components/workspace/workspace";
import {
  sections,
  type View,
  type Item,
  type WorkspaceEvent,
} from "@/lib/workspace/model";
export const metadata: Metadata = { title: "Mein Familienbereich" };
export const dynamic = "force-dynamic";
export default async function PersonalArea({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; profile?: string; topic?: string }>;
}) {
  const db = await createServerSupabase();
  if (!db) redirect("/");
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user || user.is_anonymous) redirect("/");
  const query = await searchParams;
  const view = sections.some((s) => s.id === query.view)
    ? (query.view as View)
    : query.view === "secure"
      ? "documents"
      : "overview";
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
  return (
    <Workspace
      key={`${view}:${query.profile || ""}:${query.topic || ""}`}
      view={view}
      selectedProfile={query.profile || ""}
      selectedTopic={query.topic || ""}
      initialItems={(items.data || []) as Item[]}
      initialEvents={(events.data || []) as WorkspaceEvent[]}
      email={user.email || ""}
      initialError={
        items.error || events.error
          ? "Ihr Arbeitsbereich ist noch nicht eingerichtet oder gerade nicht erreichbar. Bitte versuchen Sie es erneut."
          : ""
      }
    />
  );
}
