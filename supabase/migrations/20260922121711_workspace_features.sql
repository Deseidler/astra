begin;
create table public.workspace_items (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 kind text not null check (kind in ('document','profile','topic','case','task','letter','email','connection')),
 title text not null check (length(title) between 1 and 200),
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index workspace_items_owner_kind on public.workspace_items(owner_id,kind,updated_at desc);
create unique index workspace_document_checksum on public.workspace_items(owner_id,(data->'original'->>'checksum')) where kind='document';
alter table public.workspace_items enable row level security;
revoke all on public.workspace_items from anon, authenticated;
grant select,insert,update on public.workspace_items to authenticated;
create policy "Own workspace only" on public.workspace_items for all to authenticated
using (owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false)
with check (owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false);

create table public.workspace_events (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id),
 item_id uuid not null references public.workspace_items(id),
 action text not null,
 title text not null,
 created_at timestamptz not null default now()
);
create index workspace_events_owner_date on public.workspace_events(owner_id,created_at desc);
alter table public.workspace_events enable row level security;
revoke all on public.workspace_events from anon,authenticated;
grant select on public.workspace_events to authenticated;
create policy "Read own history" on public.workspace_events for select to authenticated
using (owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false);

create schema if not exists private;
create function private.workspace_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id <> auth.uid() then raise exception 'Unauthorized'; end if;
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.owner_id<>old.owner_id or new.kind<>old.kind or new.created_at<>old.created_at then raise exception 'Identity is immutable'; end if;
  if new.kind='document' and new.data->'original' is distinct from old.data->'original' then raise exception 'Original is immutable'; end if;
  if new.kind in ('letter','email') and ((new.data - 'status') is distinct from (old.data - 'status') or new.title is distinct from old.title) then
   new.data=jsonb_set(new.data,'{status}','"draft"');
  end if;
  new.version=old.version+1;
 else
  new.version=1;
  if new.kind in ('letter','email') then new.data=jsonb_set(new.data,'{status}','"draft"'); end if;
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.workspace_audit() from public;
create trigger workspace_before_write before insert or update on public.workspace_items for each row execute function private.workspace_audit();
create function private.workspace_log() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.workspace_events(owner_id,item_id,action,title) values(new.owner_id,new.id,case when TG_OP='INSERT' then 'created' else 'updated' end,new.title);
 return new;
end $$;
revoke all on function private.workspace_log() from public;
create trigger workspace_after_write after insert or update on public.workspace_items for each row execute function private.workspace_log();

create function public.record_workspace_access(target_id uuid, event_action text) returns void language plpgsql security definer set search_path='' as $$
declare item public.workspace_items;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Unauthorized'; end if;
 if event_action not in ('download','pdf_export','email_export') then raise exception 'Invalid event'; end if;
 select * into item from public.workspace_items where id=target_id and owner_id=auth.uid();
 if not found then raise exception 'Not found'; end if;
 insert into public.workspace_events(owner_id,item_id,action,title) values(auth.uid(),item.id,event_action,item.title);
end $$;
revoke all on function public.record_workspace_access(uuid,text) from public,anon;
grant execute on function public.record_workspace_access(uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('velmora-originals','velmora-originals',false,3145728,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do nothing;
create policy "Upload own originals" on storage.objects for insert to authenticated with check (
 bucket_id='velmora-originals' and (storage.foldername(name))[1]=(select auth.uid())::text and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false
);
create policy "Read own originals" on storage.objects for select to authenticated using (
 bucket_id='velmora-originals' and (storage.foldername(name))[1]=(select auth.uid())::text and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false
);
-- Only failed, unreferenced uploads can be cleaned up. Referenced originals cannot be overwritten or deleted.
create policy "Clean own orphaned uploads" on storage.objects for delete to authenticated using (
 bucket_id='velmora-originals' and (storage.foldername(name))[1]=(select auth.uid())::text
 and not exists(select 1 from public.workspace_items w where w.owner_id=(select auth.uid()) and w.kind='document' and w.data->'original'->>'path'=storage.objects.name)
);
commit;
