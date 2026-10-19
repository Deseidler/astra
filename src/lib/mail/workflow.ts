import "server-only";
import { HttpError, type workspaceAuth } from "@/lib/workspace/server";
import { mailKey, mailRefSchema, type MailSummary, type WorkflowStatus } from "./model";

type Db = Awaited<ReturnType<typeof workspaceAuth>>["db"];
export async function withWorkflow<T extends MailSummary>(db: Db, owner: string, messages: T[]): Promise<T[]> {
  if (!messages.length) return messages;
  const first = messages[0];
  const [states, drafts] = await Promise.all([
    db.from("mail_workflow").select("*").eq("owner_id", owner).eq("folder", first.folder).eq("validity", first.validity).in("uid", messages.map(m => m.uid)),
    db.from("workspace_items").select("data").eq("owner_id", owner).eq("kind", "email").eq("data->>sourceMailbox", "AOL").limit(1000),
  ]);
  if (states.error || drafts.error) throw new HttpError(503, "Die Bearbeitungsstände konnten nicht geladen werden. Bitte versuchen Sie es erneut.");
  const ready = new Set<string>();
  for (const item of drafts.data || []) {
    const ref = mailRefSchema.safeParse(item.data.sourceRef);
    if (ref.success) ready.add(mailKey(ref.data));
  }
  const byUid = new Map((states.data || []).map(s => [Number(s.uid), s]));
  return messages.map(m => {
    const state = byUid.get(m.uid);
    let status: WorkflowStatus = m.answered ? "answered" : ready.has(mailKey(m)) ? "draft_ready" : "new";
    if (state?.status) status = state.status;
    return { ...m, workflowStatus: status, manualStatus: state?.status || null, hasDraft: ready.has(mailKey(m)), relevance: state?.relevance || "auto", openedAt: state?.opened_at || null };
  });
}
