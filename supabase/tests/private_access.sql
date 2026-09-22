-- Execute against a local database after both migrations. All fixtures roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into public.documents(id,title,owner_id) values
('velmora-rls-a','Test A','00000000-0000-4000-8000-000000000001'),
('velmora-rls-b','Test B','00000000-0000-4000-8000-000000000002'),
('velmora-rls-unowned','Unassigned test',null);
insert into public.agent_assignments(id,name,queue,trigger,owner_id) values
('velmora-rls-a','Test A','Review','manual','00000000-0000-4000-8000-000000000001'),
('velmora-rls-b','Test B','Review','manual','00000000-0000-4000-8000-000000000002');

set local role anon;
do $$ begin
  begin
    perform 1 from public.documents;
    raise exception 'FAIL: anon may read documents';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.agent_assignments;
    raise exception 'FAIL: anon may read assignments';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  if (select count(*) from public.documents) <> 1 then raise exception 'FAIL: user A isolation'; end if;
  if not exists (select 1 from public.documents where id='velmora-rls-a') then raise exception 'FAIL: own document invisible'; end if;
  if (select count(*) from public.agent_assignments) <> 1 then raise exception 'FAIL: assignments isolation'; end if;
  begin
    insert into public.documents(id,title,owner_id) values ('forbidden','Forbidden','00000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: unreviewed browser insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.documents set owner_id='00000000-0000-4000-8000-000000000001' where id='velmora-rls-b';
    raise exception 'FAIL: ownership reassignment allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.documents where id='velmora-rls-a';
    raise exception 'FAIL: browser deletion allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  if (select count(*) from public.documents) <> 1 or not exists(select 1 from public.documents where id='velmora-rls-b') then raise exception 'FAIL: user B isolation'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',true);
do $$ begin
  if exists(select 1 from public.documents) or exists(select 1 from public.agent_assignments) then raise exception 'FAIL: anonymous identity reads records'; end if;
end $$;
reset role;
rollback;
select 'PASS: anonymous access, owner isolation, unowned rows, anonymous identities and write protection' as result;
