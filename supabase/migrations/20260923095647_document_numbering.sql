begin;
alter table public.workspace_items add column document_number bigint generated always as identity;
create unique index workspace_document_number on public.workspace_items(document_number);
create function private.keep_document_number() returns trigger language plpgsql set search_path='' as $$
begin
 if new.document_number is distinct from old.document_number then raise exception 'Document number is immutable'; end if;
 return new;
end $$;
revoke all on function private.keep_document_number() from public;
create trigger keep_document_number before update on public.workspace_items for each row execute function private.keep_document_number();
commit;
