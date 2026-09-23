# VELMORA

Privater Familienbereich für Stammdaten, Unterlagen, Aufgaben und Schreiben in Schwarz, Gold und Rosé.

## Entwicklung

```bash
npm ci
cp .env.example .env.local
# Supabase-URL und Publishable Key eintragen
npm run dev
```

Vorhandene Umgebungsdateien nicht überschreiben. Die Anwendung benötigt keinen Service-Role-Schlüssel. Anmeldung mit bestehendem Supabase-Konto; für Betrieb nur mit Einladungen die Selbstregistrierung in Supabase deaktivieren.

## Funktionen

- Persönliche Profile mit eigenen Themenkacheln, Dropdown-Zuordnung und zusätzlichen Stammdatenfeldern.
- Private PDF-/Bildoriginale, Kamera-Eingabe, Duplikaterkennung, dauerhafte Nummerierung und Datumssortierung.
- Forderungsdiagramm, Erledigt-Status und Suchhilfe für gespeicherte Einträge.
- Akten, Aufgaben und Fristen.
- Briefe mit persönlichem Briefkopf als A4-PDF; echte PDF-/Bildanhänge, E-Mail-Entwürfe und `.eml`-Export nach Freigabe.
- Eigentümerbezogene Zugriffsregeln, Änderungsverlauf und Schutz gegen veraltete Speicherstände.

KI-Erkennung, Postfachsynchronisierung und direkter Mailversand sind noch nicht angeschlossen. Familienprofile sind persönliche Akten und keine separaten Benutzerzugänge. Siehe [Umsetzungsstand und Betriebsgrenzen](docs/handoff-status.md).

## Datenbank und Tests

Alle Migrationen unter `supabase/migrations` anwenden. Die neue Originalablage ist privat. Browser-Schreibrechte gelten nur für eigene Workspace-Einträge; die älteren Tabellen bleiben für Browser schreibgeschützt.

```bash
supabase migration up --local
npm run lint
npm run typecheck
node --import tsx --test tests/workspace.test.ts
npm run build
# SQL-Regressionsprüfungen in zurückgerollten Transaktionen:
docker exec -i supabase_db_astera psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/workspace_access.sql
```

Private Familienimporte und Originaldokumente gehören nicht in das Repository. Für Tests ausschließlich synthetische Daten verwenden. Das ältere Workflow-Experiment bleibt ungenutzt im Quellcode und ist keine produktive Klassifizierung.
