begin;
alter table public.intake_jobs drop constraint intake_jobs_status_check;
alter table public.intake_jobs add constraint intake_jobs_status_check check(status in ('queued','running','done','failed','paused','skipped'));
alter table public.intake_jobs add column priority integer not null default 30;
update public.intake_jobs set priority=case when source_kind='document' then 100 when title ~* 'mahnbescheid|vollstreck|klage|gericht|frist|forderung|mahnung|zahlungsaufforderung|widerspruch|kostenbescheid|diebstahl|mandatsanfrage' then 90 when title ~* 'rechnung|ratenzahlung|bezahlung nach|kostenübernahme|erstat|zahlung' then 60 else 30 end;
create index intake_jobs_owner_priority on public.intake_jobs(owner_id,status,priority desc,updated_at);
commit;
