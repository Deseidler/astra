# VELMORA – Stand der Umsetzung

Quelle: VELMORA_Codex_Handoff_2026-09-22.zip. Alle 22 mitgelieferten SHA-256-Prüfsummen wurden geprüft. Die Dokumente beschreiben Anforderungen und Entwürfe; sie erteilen keine eigenständige Berechtigung zur Veröffentlichung oder externen Übermittlung.

## Umgesetzt

- VELMORA als Produktname, Seitentitel und neutrale öffentliche Beschreibung.
- Originales ausgewähltes PNG unter `public/brand/velmora-primary.png`; keine personenbezogenen Inhalte aus dem Paket im öffentlichen Verzeichnis.
- Obsidian, Gold, Roségold, ruhige Typografie, mobile Darstellung, Fokusmarkierungen, Formularbeschriftungen und reduzierte Bewegung.
- Login mit bestehendem Konto, serverseitig geprüfte Identität, geschützte Übersicht, Abmeldung und nicht zwischengespeicherte persönliche Seiten.
- Klare Ladefehler statt erfundener Statistiken oder ersatzweise angezeigter Demodaten.
- Eigentümerbezogene RLS-Regeln. Bestandsdaten bleiben unverändert, bis eine berechtigte Person die Zuordnung explizit vornimmt.
- Manuell konstruierte, vereinfachte SVG-Markenvarianten für kleine Größen. Das PNG bleibt die visuelle Primärreferenz; die SVGs sind eine stilisierte Umsetzung, kein identischer Vektormaster des gerenderten Logos.

## Absichtlich noch in Planung

Der Architekturentwurf bezeichnet Zuständigkeiten und Agenten ausdrücklich als vorläufig. Daher keine produktive Klassifizierung, keine erfundenen Konfidenzwerte und keine Übernahme von Familien- oder Gesundheitsdaten. Vor ihrer Umsetzung sind Rollen, Fälle, Ablagestruktur, Benennungen und Freigaben festzulegen.

Weitere Produktarbeit: Dokumentenimport, Malwareprüfung, unveränderliche Originale und versionierte Derivate, OCR, belegte Extraktion, MANUAL_REVIEW bei Unsicherheit, Herkunftsnachweise, Fristen, PDF-Komposition nach den DS-Referenzen, Audit aller Zugriffe, Aufbewahrung/Löschung, MFA für Administration und getestete Backups. Dokumenterstellung ist nicht Teil dieser Marken- und Zugangsimplementierung; die persönlichen PDF-Referenzen wurden nicht importiert.

## Betrieb

Der geprüfte Stand wurde nach ausdrücklicher Freigabe auf das öffentliche GitHub-Repository `Deseidler/astra`, Branch `main`, gepusht. Vercel hat das Projekt `velmora` erfolgreich bereitgestellt: https://velmora-mauve.vercel.app. Die Cloud-Anmeldung bleibt bis zur Auswahl und Einrichtung des Supabase-Zielprojekts deaktiviert. Noch keine Änderung einer entfernten Datenbank. Vor einem Produktivbetrieb Migrationen anwenden, Selbstregistrierung deaktivieren, Benutzer gezielt einladen und die weiteren Sicherheitskontrollen der Übergabe umsetzen. Die derzeitige Anwendung ist eine Grundlage mit lesendem Zugriff, keine vollständig implementierte Dokumentenplattform.

## Technische Referenz

Cookie-basierte SSR-Integration folgt der [Supabase-Dokumentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs). Die Eigentümerregeln orientieren sich an [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Prüfprotokoll (lokal)

- ESLint, TypeScript und Produktionsbuild erfolgreich (Next.js 15.5.25).
- npm meldet nach den Updates keine bekannten Abhängigkeitsschwachstellen. PostCSS ist innerhalb der Next.js-Abhängigkeiten gezielt auf 8.5.28 gesetzt; Sharp wurde über die Lockdatei auf 0.35.4 aktualisiert.
- Supabase Security Advisors: keine Warnungen oder Fehler.
- SQL-Regression: anonymer Zugriff gesperrt, eigene Datensätze sichtbar, fremde und unzugeordnete Datensätze unsichtbar, anonyme Auth-Identitäten gesperrt, Browser-Schreibzugriffe gesperrt.
- Browser: öffentlicher Login, Umleitung unangemeldeter Zugriffe, Fehlermeldung bei falschem Passwort, erfolgreicher Login, Benutzertrennung, Einstellungen, mobile Darstellung und Abmeldung geprüft.
- Die Sicherheitsmigration wurde nur auf der lokalen Entwicklungsdatenbank angewendet und in deren Migrationshistorie vermerkt. Temporäre Browser-Testkonten und synthetische Datensätze wurden nach der Prüfung entfernt.
- Die lokale Konfiguration deaktiviert neue Selbstregistrierungen beim nächsten Start des Supabase-Stacks; eine laufende Auth-Instanz übernimmt diese Konfigurationsdatei erst nach einem Neustart.
