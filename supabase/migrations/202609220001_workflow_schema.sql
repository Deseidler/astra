create table if not exists public.documents (
  id text primary key,
  title text not null,
  source text not null default 'upload',
  status text not null default 'neu' check (status in ('neu', 'prüfen', 'genehmigt', 'archiviert')),
  owner text not null default 'Unassigned',
  folder text not null default 'General',
  assigned_agent text not null default 'Ops Routing',
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_assignments (
  id text primary key,
  name text not null,
  queue text not null,
  confidence integer not null default 0 check (confidence between 0 and 100),
  trigger text not null
);

alter table public.documents enable row level security;
alter table public.agent_assignments enable row level security;

create policy "Documents are readable by anyone" on public.documents
for select using (true);

create policy "Agent assignments are readable by anyone" on public.agent_assignments
for select using (true);

create policy "Documents can be managed by service role" on public.documents
for all using (true) with check (true);

create policy "Agent assignments can be managed by service role" on public.agent_assignments
for all using (true) with check (true);
