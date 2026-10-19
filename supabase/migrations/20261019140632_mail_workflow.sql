begin;
create table public.mail_workflow (
 owner_id uuid not null references auth.users(id),
 folder text not null check(folder in ('inbox','sent')),
 validity text not null check(validity ~ '^[0-9]{1,20}$'),
 uid bigint not null check(uid between 1 and 4294967295),
 status text check(status in ('new','in_progress','draft_ready','answered','done')),
 relevance text not null default 'auto' check(relevance in ('auto','relevant','excluded')),
 opened_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(owner_id,folder,validity,uid)
);
alter table public.mail_workflow enable row level security;
revoke all on public.mail_workflow from anon, authenticated;
grant select, insert, update on public.mail_workflow to authenticated;
create policy "Own mail workflow only" on public.mail_workflow for all to authenticated
using (owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false)
with check (owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false);
commit;
