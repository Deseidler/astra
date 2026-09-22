begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000011'),('00000000-0000-4000-8000-000000000012');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
insert into public.workspace_items(id,kind,title,data) values('00000000-0000-4000-8000-000000000021','letter','Testbrief','{"body":"Test","status":"approved"}');
do $$ begin
 if (select data->>'status' from public.workspace_items limit 1)<>'draft' then raise exception 'Must start draft'; end if;
 if (select count(*) from public.workspace_events)<>1 then raise exception 'Missing audit'; end if;
end $$;
update public.workspace_items set data=jsonb_set(data,'{status}','"approved"');
update public.workspace_items set title='Betreff korrigiert';
do $$ begin
 if (select data->>'status' from public.workspace_items limit 1)<>'draft' then raise exception 'Title change must reset approval'; end if;
 if (select version from public.workspace_items limit 1)<>3 then raise exception 'Wrong version'; end if;
 begin
 update public.workspace_items set owner_id='00000000-0000-4000-8000-000000000012';
 raise exception 'Owner mutation allowed';
 exception when others then if SQLERRM='Owner mutation allowed' then raise; end if; end;
end $$;
select public.record_workspace_access('00000000-0000-4000-8000-000000000021','pdf_export');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000012","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.workspace_items) then raise exception 'Cross-owner read'; end if;
 if exists(select 1 from public.workspace_events) then raise exception 'Cross-owner audit'; end if;
 begin
 perform public.record_workspace_access('00000000-0000-4000-8000-000000000021','download');
 raise exception 'Cross-owner access event allowed';
 exception when others then if SQLERRM='Cross-owner access event allowed' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated","is_anonymous":true}',true);
do $$ begin if exists(select 1 from public.workspace_items) then raise exception 'Anonymous read'; end if; end $$;
reset role;
rollback;
