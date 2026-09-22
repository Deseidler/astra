# VELMORA

Ein persönlicher Bereich in Obsidian, Champagnergold und Roségold. Umsetzung der freigegebenen Markenrichtung aus der Übergabe vom 22.09.2026.

## Entwicklung

```bash
npm ci
cp .env.example .env.local
# Supabase-URL und Publishable Key (alternativ Anon Key) eintragen.
npm run dev
```

Vorhandene `.env.local` nicht überschreiben. Die App braucht keinen Service-Role-Schlüssel. Anmeldung mit einem bestehenden Supabase-Konto; keine öffentliche Registrierung. In Supabase muss die Selbstregistrierung für einen Betrieb ausschließlich mit Einladungen deaktiviert sein.

## Aktueller Umfang

- Neutrale, responsive VELMORA-Anmeldung mit dem unveränderten ausgewählten Logo.
- Passwortanmeldung und Abmeldung über Supabase, Cookies und serverseitige Benutzerprüfung.
- `/bereich`: Übersicht, eigene Einträge und Kontoinformationen. Familienprofile, Zeitverlauf, Aufgaben und gemeinsame Anliegen sind ausdrücklich als vorbereitet gekennzeichnet.
- Echte Zähler und leere Zustände; kein Rückfall auf Beispieldaten bei Fehlern.
- RLS-Migration: Zugriff ausschließlich auf `owner_id = auth.uid()`, keine anonymen Lese- oder Schreibrechte. Bestehende Einträge ohne `owner_id` bleiben erhalten und unsichtbar. Keine automatische Zuordnung anhand eines Namens.
- Das bisherige Workflow-Komponentenexperiment bleibt im Quellcode erhalten, ist aber nicht in die Anwendung eingebunden. Seine Regeln und Prozentwerte sind keine freigegebene Klassifizierung.

## Datenbank

Die Sicherheitsmigration muss vor der Verwendung mit echten Daten auf der Zielumgebung angewendet werden. Eine Login-Seite ersetzt keine Datenbankberechtigungen.

```bash
supabase migration up --local
# Lokale RLS-Regressionstests; alle Testdatensätze werden zurückgerollt:
docker exec -i supabase_db_astera psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/private_access.sql
```

Die Migration erweitert die beiden vorhandenen Tabellen um `owner_id` und entfernt die offenen Policies. `authenticated` erhält nur SELECT. Administrativ zugewiesene Datensätze sind sichtbar; Import und Änderungen benötigen zuerst ein freigegebenes Rechte- und Auditmodell. Originalmigration und bestehende Seed-Daten bleiben erhalten.

## Prüfungen

```bash
npm run lint
npm run typecheck
npm run build
```

Details zum Umsetzungsstand und zu den noch offenen Abläufen: [Übergabe-Status](docs/handoff-status.md).
