begin;
create table public.intake_settings (
 owner_id uuid primary key references auth.users(id), enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.intake_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 source_key text not null check(length(source_key) between 1 and 200),
 source_kind text not null check(source_kind in ('document','mail')), source_id text not null,
 title text not null, source jsonb not null default '{}'::jsonb,
 status text not null default 'queued' check(status in ('queued','running','done','failed','paused')),
 result jsonb, error text not null default '', profile_id uuid references public.workspace_items(id),
 case_id uuid references public.workspace_items(id), updated_at timestamptz not null default now(),
 unique(owner_id,source_key)
);
create index intake_jobs_owner_state on public.intake_jobs(owner_id,status,updated_at);
create table public.financial_claims (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 job_id uuid not null references public.intake_jobs(id), fingerprint text not null,
 title text not null, creditor text not null, reference text not null,
 amount_cents bigint check(amount_cents between 0 and 100000000000), currency text not null check(currency ~ '^[A-Z]{3}$'),
 direction text not null check(direction in ('payable','receivable','unknown')),
 due date, evidence text not null, page integer,
 status text not null default 'review' check(status in ('review','open','disputed','paid','duplicate')),
 profile_id uuid references public.workspace_items(id), case_id uuid references public.workspace_items(id),
 unique(owner_id,fingerprint)
);
create index financial_claims_owner_status on public.financial_claims(owner_id,status);
create table public.ai_reservations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 request_key text not null check(length(request_key) between 1 and 200),
 created_at timestamptz not null default now(), status text not null default 'running',
 result jsonb, input_tokens integer not null default 0, output_tokens integer not null default 0,
 unique(owner_id,request_key)
);
alter table public.intake_settings enable row level security;
alter table public.intake_jobs enable row level security;
alter table public.financial_claims enable row level security;
alter table public.ai_reservations enable row level security;
revoke all on public.intake_settings,public.intake_jobs,public.financial_claims,public.ai_reservations from anon,authenticated;
grant select,insert,update on public.intake_settings,public.intake_jobs,public.financial_claims to authenticated;
grant select on public.ai_reservations to authenticated;
create policy "Own intake settings" on public.intake_settings for all to authenticated using(owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false) with check(owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy "Own intake jobs" on public.intake_jobs for all to authenticated using(owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false) with check(owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy "Own financial claims" on public.financial_claims for all to authenticated using(owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false) with check(owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy "Own AI usage" on public.ai_reservations for select to authenticated using(owner_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false);
-- Immutable reservations enforce a shared 100-request monthly cap, including failed calls.
create function public.reserve_velmora_ai(p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid(); existing public.ai_reservations; reservation uuid;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Unauthorized'; end if;
 if length(p_key) not between 1 and 200 then raise exception 'Invalid key'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 select * into existing from public.ai_reservations where owner_id=u and request_key=p_key;
 if found then return jsonb_build_object('state',existing.status,'result',existing.result); end if;
 if (select count(*) from public.ai_reservations where owner_id=u and created_at >= date_trunc('month',now())) >= 100 then return jsonb_build_object('state','budget'); end if;
 insert into public.ai_reservations(owner_id,request_key) values(u,p_key) returning id into reservation;
 return jsonb_build_object('state','reserved','id',reservation);
end $$;
create function public.finish_velmora_ai(p_id uuid,p_status text,p_result jsonb,p_input integer,p_output integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or p_status not in ('done','failed') or p_input<0 or p_output<0 then raise exception 'Unauthorized'; end if;
 update public.ai_reservations set status=p_status,result=p_result,input_tokens=p_input,output_tokens=p_output where id=p_id and owner_id=auth.uid() and status='running';
end $$;
revoke all on function public.reserve_velmora_ai(text),public.finish_velmora_ai(uuid,text,jsonb,integer,integer) from public,anon;
grant execute on function public.reserve_velmora_ai(text),public.finish_velmora_ai(uuid,text,jsonb,integer,integer) to authenticated;
commit;
