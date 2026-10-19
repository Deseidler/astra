begin;
alter table public.financial_claims add column evidence_state text not null default 'uncertain' check(evidence_state in ('demanded','paid_evidence','uncertain'));
alter table public.financial_claims add column payment_evidence text;
alter table public.financial_claims add column payment_job_id uuid references public.intake_jobs(id);
commit;
