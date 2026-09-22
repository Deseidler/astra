-- Existing unowned records remain inaccessible until explicitly assigned by an administrator.
-- Display names are not reliable ownership identifiers; never infer ownership from them.
begin;

alter table public.documents add column if not exists owner_id uuid references auth.users(id);
alter table public.agent_assignments add column if not exists owner_id uuid references auth.users(id);
create index if not exists documents_owner_id_idx on public.documents(owner_id);
create index if not exists agent_assignments_owner_id_idx on public.agent_assignments(owner_id);

alter table public.documents enable row level security;
alter table public.agent_assignments enable row level security;

drop policy if exists "Documents are readable by anyone" on public.documents;
drop policy if exists "Documents can be managed by service role" on public.documents;
drop policy if exists "Agent assignments are readable by anyone" on public.agent_assignments;
drop policy if exists "Agent assignments can be managed by service role" on public.agent_assignments;

revoke all on public.documents, public.agent_assignments from anon, authenticated;
grant select on public.documents, public.agent_assignments to authenticated;

create policy "Members read their own documents" on public.documents
for select to authenticated using (
  (select auth.uid()) = owner_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
create policy "Members read their own assignments" on public.agent_assignments
for select to authenticated using (
  (select auth.uid()) = owner_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
-- No browser write policies: intake, audit, approvals and retention are a later phase.
commit;
