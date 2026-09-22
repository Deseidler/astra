insert into public.agent_assignments (id, name, queue, confidence, trigger)
values
  ('legal', 'Legal Review', 'Verträge', 96, 'Vertrag / NDA / Vertragsschluss'),
  ('ops', 'Ops Routing', 'Prozesse', 92, 'Prozessdokumente / SOP / Internes'),
  ('finance', 'Finance Sync', 'Finanzen', 94, 'Rechnung / Budget / Angebot'),
  ('hr', 'HR Intake', 'Personal', 91, 'Anstellung / Vertragsvorlagen / Personalakte')
on conflict (id) do update set
  name = excluded.name,
  queue = excluded.queue,
  confidence = excluded.confidence,
  trigger = excluded.trigger;

insert into public.documents (id, title, source, status, owner, folder, assigned_agent, updated_at)
values
  ('DOC-201', 'Beratungsvorlage Q4', 'Mail-Import', 'neu', 'Mara', 'Sales/Angebote', 'Ops Routing', now() - interval '18 minutes'),
  ('DOC-208', 'NDA Kunde Nordwind', 'Upload', 'prüfen', 'Luca', 'Legal/Verträge', 'Legal Review', now() - interval '42 minutes'),
  ('DOC-312', 'Rechnung Sept. 2026', 'ERP', 'genehmigt', 'Nina', 'Finance/Rechnungen', 'Finance Sync', now() - interval '2 hours'),
  ('DOC-427', 'Mitarbeitervertrag Max', 'Dokumenten-Portal', 'archiviert', 'Sofia', 'HR/Personalakte', 'HR Intake', now() - interval '1 day')
on conflict (id) do update set
  title = excluded.title,
  source = excluded.source,
  status = excluded.status,
  owner = excluded.owner,
  folder = excluded.folder,
  assigned_agent = excluded.assigned_agent,
  updated_at = excluded.updated_at;
